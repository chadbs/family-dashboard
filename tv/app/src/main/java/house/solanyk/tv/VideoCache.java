package house.solanyk.tv;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

/* The flyover clips (assets/clips.json) and a small offline copy of them.
   The Shield has little room, so it keeps the smaller clips on disk up to
   CAP and streams the rest; a clip downloads once and plays from disk after. */
final class VideoCache {
    static final class Clip {
        final String id, url, title, cat;
        final long bytes;

        Clip(String id, String url, String title, String cat, long bytes) {
            this.id = id;
            this.url = url;
            this.title = title;
            this.cat = cat;
            this.bytes = bytes;
        }
    }

    private static final long MB = 1_000_000L;
    private static final long CAP = 900 * MB;
    private static final long KEEP_FREE = 600 * MB;

    private static VideoCache inst;

    static synchronized VideoCache get(Context ctx) {
        if (inst == null) inst = new VideoCache(ctx.getApplicationContext());
        return inst;
    }

    private final Context ctx;
    private final File dir;
    final List<Clip> clips = new ArrayList<>();
    private final AtomicBoolean busy = new AtomicBoolean(false);

    private VideoCache(Context ctx) {
        this.ctx = ctx;
        dir = new File(ctx.getFilesDir(), "clips");
        //noinspection ResultOfMethodCallIgnored
        dir.mkdirs();
        try (InputStream in = ctx.getAssets().open("clips.json")) {
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            for (int n; (n = in.read(buf)) > 0; ) bos.write(buf, 0, n);
            JSONArray a = new JSONArray(bos.toString("UTF-8"));
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                clips.add(new Clip(o.getString("id"), o.getString("url"), o.optString("title"),
                        o.optString("cat", "landscapes"), o.optLong("mb", 100) * MB));
            }
        } catch (Exception ignored) {
        }
    }

    File file(Clip c) {
        return new File(dir, c.id + ".mp4");
    }

    boolean cached(Clip c) {
        return file(c).isFile();
    }

    Uri uri(Clip c) {
        File f = file(c);
        return f.isFile() ? Uri.fromFile(f) : Uri.parse(c.url);
    }

    boolean online() {
        ConnectivityManager cm = (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        NetworkCapabilities nc = cm.getNetworkCapabilities(cm.getActiveNetwork());
        return nc != null && nc.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    /* Download whatever fits, smallest first, one at a time, in the background. */
    void fill() {
        if (!busy.compareAndSet(false, true)) return;
        new Thread(() -> {
            try {
                prune();
                List<Clip> bySize = new ArrayList<>(clips);
                Collections.sort(bySize, (a, b) -> Long.compare(a.bytes, b.bytes));
                long used = used();
                for (Clip c : bySize) {
                    if (cached(c)) continue;
                    if (!online()) break;
                    if (used + c.bytes > CAP) break;
                    if (dir.getUsableSpace() - c.bytes < KEEP_FREE) break;
                    if (download(c)) used += file(c).length();
                }
            } finally {
                busy.set(false);
            }
        }, "clip-cache").start();
    }

    private long used() {
        long n = 0;
        File[] fs = dir.listFiles();
        if (fs != null) for (File f : fs) n += f.length();
        return n;
    }

    /* Drop files for clips no longer in the list, and half-finished downloads. */
    private void prune() {
        Set<String> keep = new HashSet<>();
        for (Clip c : clips) keep.add(c.id + ".mp4");
        File[] fs = dir.listFiles();
        if (fs == null) return;
        for (File f : fs) {
            if (!keep.contains(f.getName())) //noinspection ResultOfMethodCallIgnored
                f.delete();
        }
    }

    private boolean download(Clip c) {
        File part = new File(dir, c.id + ".part");
        HttpURLConnection con = null;
        try {
            con = (HttpURLConnection) new URL(c.url).openConnection();
            con.setConnectTimeout(15000);
            con.setReadTimeout(30000);
            con.setInstanceFollowRedirects(true);
            if (con.getResponseCode() != 200) return false;
            try (InputStream in = con.getInputStream(); OutputStream out = new FileOutputStream(part)) {
                byte[] buf = new byte[64 * 1024];
                for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
            }
            return part.renameTo(file(c));
        } catch (Exception e) {
            return false;
        } finally {
            if (con != null) con.disconnect();
            //noinspection ResultOfMethodCallIgnored
            part.delete();
        }
    }
}
