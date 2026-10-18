package house.solanyk.tv;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.provider.Settings;
import android.util.Base64;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/* What the home page can ask of the Shield: which apps are installed, open
   one, open Settings, start the screensaver now. Exposed to JS as `Shield`. */
final class Bridge {
    private final Activity act;
    private final Map<String, String> art = new HashMap<>();

    Bridge(Activity act) {
        this.act = act;
    }

    @JavascriptInterface
    public String apps() {
        PackageManager pm = act.getPackageManager();
        JSONArray out = new JSONArray();
        Set<String> seen = new HashSet<>();
        seen.add(act.getPackageName());
        try {
            collect(pm, Intent.CATEGORY_LEANBACK_LAUNCHER, seen, out);
        } catch (Exception ignored) {
        }
        return out.toString();
    }

    private void collect(PackageManager pm, String category, Set<String> seen, JSONArray out)
            throws Exception {
        Intent q = new Intent(Intent.ACTION_MAIN).addCategory(category);
        List<ResolveInfo> list = pm.queryIntentActivities(q, 0);
        for (ResolveInfo ri : list) {
            ActivityInfo ai = ri.activityInfo;
            if (ai == null || seen.contains(ai.packageName)) continue;
            seen.add(ai.packageName);
            JSONObject o = new JSONObject();
            o.put("pkg", ai.packageName);
            o.put("label", String.valueOf(ri.loadLabel(pm)));
            String key = ai.packageName;
            String img = art.get(key);
            boolean banner = true;
            if (img == null) {
                Drawable d = ai.loadBanner(pm);
                if (d == null) d = ai.applicationInfo.loadBanner(pm);
                if (d == null) {
                    banner = false;
                    d = ri.loadIcon(pm);
                }
                img = (banner ? "B" : "I") + png(d, banner ? 320 : 160, banner ? 180 : 160);
                art.put(key, img);
            }
            o.put("banner", img.charAt(0) == 'B');
            o.put("game", isGame(ai.applicationInfo));
            o.put("img", img.substring(1));
            out.put(o);
        }
    }

    @SuppressWarnings("deprecation")
    private static boolean isGame(android.content.pm.ApplicationInfo a) {
        return a.category == android.content.pm.ApplicationInfo.CATEGORY_GAME
                || (a.flags & android.content.pm.ApplicationInfo.FLAG_IS_GAME) != 0;
    }

    private static String png(Drawable d, int w, int h) {
        Bitmap b = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(b);
        d.setBounds(0, 0, w, h);
        d.draw(c);
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        b.compress(Bitmap.CompressFormat.PNG, 100, bos);
        b.recycle();
        return "data:image/png;base64," + Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP);
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
