package house.solanyk.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.provider.Settings;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/* What the home page can ask of the Shield: which apps are installed, open
   one, open Settings, start the screensaver now. Exposed to JS as `Shield`.

   App art is not sent through here: apps() gives each app an image address
   (ART_ORIGIN + "/<pkg>.png?v=<last update>") that HomeActivity answers with
   art(), so the list stays a few KB and the PNGs are drawn once and kept on
   disk. */
final class Bridge {
    static final String ART_ORIGIN = "https://art.home";

    private final Activity act;
    private final File artDir;
    private final Map<String, byte[]> art = new HashMap<>();

    Bridge(Activity act) {
        this.act = act;
        artDir = new File(act.getCacheDir(), "art");
        //noinspection ResultOfMethodCallIgnored
        artDir.mkdirs();
    }

    private List<ResolveInfo> launchables(PackageManager pm) {
        Intent q = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER);
        return pm.queryIntentActivities(q, 0);
    }

    private static long updated(PackageManager pm, String pkg) {
        try {
            PackageInfo pi = pm.getPackageInfo(pkg, 0);
            return pi.lastUpdateTime;
        } catch (Exception e) {
            return 0;
        }
    }

    /* Cheap: changes only when an app is installed, removed or updated, so the
       page can skip apps() on every return home. */
    @JavascriptInterface
    public String appsSig() {
        PackageManager pm = act.getPackageManager();
        StringBuilder b = new StringBuilder();
        for (ResolveInfo ri : launchables(pm)) {
            String p = ri.activityInfo.packageName;
            b.append(p).append(':').append(updated(pm, p)).append('|');
        }
        return b.toString();
    }

    @JavascriptInterface
    public String apps() {
        PackageManager pm = act.getPackageManager();
        JSONArray out = new JSONArray();
        Map<String, Boolean> seen = new HashMap<>();
        seen.put(act.getPackageName(), true);
        try {
            for (ResolveInfo ri : launchables(pm)) {
                ActivityInfo ai = ri.activityInfo;
                if (ai == null || seen.containsKey(ai.packageName)) continue;
                seen.put(ai.packageName, true);
                JSONObject o = new JSONObject();
                o.put("pkg", ai.packageName);
                o.put("label", String.valueOf(ri.loadLabel(pm)));
                o.put("banner", ai.banner != 0 || ai.applicationInfo.banner != 0);
                o.put("game", isGame(ai.applicationInfo));
                o.put("img", ART_ORIGIN + "/" + ai.packageName + ".png?v=" + updated(pm, ai.packageName));
                out.put(o);
            }
        } catch (Exception ignored) {
        }
        return out.toString();
    }

    /* The PNG for one app: memory, then disk, then drawn from its banner/icon. */
    byte[] art(String pkg, String version) {
        String key = pkg + "-" + version;
        synchronized (art) {
            byte[] b = art.get(key);
            if (b != null) return b;
        }
        File f = new File(artDir, key + ".png");
        byte[] b = f.isFile() ? read(f) : null;
        if (b == null) {
            b = draw(act, pkg);
            if (b == null) return null;
            write(f, b);
        }
        synchronized (art) {
            art.put(key, b);
        }
        return b;
    }

    private static byte[] draw(Context ctx, String pkg) {
        PackageManager pm = ctx.getPackageManager();
        Intent q = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER).setPackage(pkg);
        List<ResolveInfo> list = pm.queryIntentActivities(q, 0);
        if (list.isEmpty()) return null;
        ResolveInfo ri = list.get(0);
        ActivityInfo ai = ri.activityInfo;
        Drawable d = ai.loadBanner(pm);
        if (d == null) d = ai.applicationInfo.loadBanner(pm);
        boolean banner = d != null;
        if (d == null) d = ri.loadIcon(pm);
        return png(d, banner ? 320 : 160, banner ? 180 : 160);
    }

    @SuppressWarnings("deprecation")
    private static boolean isGame(ApplicationInfo a) {
        return a.category == ApplicationInfo.CATEGORY_GAME || (a.flags & ApplicationInfo.FLAG_IS_GAME) != 0;
    }

    private static byte[] png(Drawable d, int w, int h) {
        Bitmap b = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(b);
        d.setBounds(0, 0, w, h);
        d.draw(c);
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        b.compress(Bitmap.CompressFormat.PNG, 100, bos);
        b.recycle();
        return bos.toByteArray();
    }

    private static byte[] read(File f) {
        try (InputStream in = new FileInputStream(f)) {
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            for (int n; (n = in.read(buf)) > 0; ) bos.write(buf, 0, n);
            return bos.toByteArray();
        } catch (Exception e) {
            return null;
        }
    }

    private static void write(File f, byte[] b) {
        try (OutputStream out = new FileOutputStream(f)) {
            out.write(b);
        } catch (Exception ignored) {
        }
    }

    @JavascriptInterface
    public boolean launch(String pkg) {
        PackageManager pm = act.getPackageManager();
        Intent i = pm.getLeanbackLaunchIntentForPackage(pkg);
        if (i == null) i = pm.getLaunchIntentForPackage(pkg);
        if (i == null) return false;
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            act.startActivity(i);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @JavascriptInterface
    public void settings() {
        try {
            act.startActivity(new Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        } catch (Exception ignored) {
        }
    }

    @JavascriptInterface
    public void screensaver() {
        act.startActivity(new Intent(act, ScreensaverActivity.class));
    }

    @JavascriptInterface
    public void flyovers() {
        act.startActivity(new Intent(act, ScreensaverActivity.class).putExtra(ScreensaverActivity.EXTRA_VIDEOS, true));
    }
}
