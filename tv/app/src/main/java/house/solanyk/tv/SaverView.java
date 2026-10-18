package house.solanyk.tv;

import android.content.Context;
import android.media.MediaPlayer;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.VideoView;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/* The screensaver itself, shared by the system screensaver (FamilyDream)
   and the "Screensaver" tile (ScreensaverActivity).

   A 4K flyover plays underneath; assets/saver.html sits on top, clear
   while a clip plays (just a caption and a small clock) and solid black
   for the family scene. Between every scene the page fades to true black,
   so the OLED goes dark rather than cutting. */
final class SaverView extends FrameLayout {
    private static final long MIN_CLIP_MS = 30_000;
    private static final long MAX_CLIP_MS = 240_000;
    private static final long FAMILY_MS = 40_000;
    private static final long FADE_MS = 1_600;
    private static final int CLIPS_PER_FAMILY = 2;
    /* A streamed film that has not shown a frame by now is skipped. */
    private static final long START_TIMEOUT_MS = 20_000;

    private final VideoView video;
    private final WebView web;
    private final Handler h = new Handler(Looper.getMainLooper());
    private final VideoCache cache;
    private final List<VideoCache.Clip> order = new ArrayList<>();
    private final Set<String> bad = new HashSet<>();
    private VideoCache.Clip current;
    private int idx;
    private int sinceFamily;
    private boolean running;
    private boolean ending;
    private boolean pageReady;
    private final boolean videosOnly;

    /* videosOnly: just the flyovers, no family scenes (the home screen's Flyovers button). */
    SaverView(Context ctx, boolean videosOnly) {
        super(ctx);
        this.videosOnly = videosOnly;
        setBackgroundColor(0xFF000000);
        cache = VideoCache.get(ctx);

        video = new VideoView(ctx);
        addView(video, new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT, Gravity.CENTER));
        web = Web.make(ctx, true);
        addView(web, new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
        /* Scenes start only once the page can hear them. */
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                if (pageReady) return;
                pageReady = true;
                if (running) begin();
            }
        });
        web.loadUrl("file:///android_asset/saver.html");

        video.setOnPreparedListener(mp -> {
            if (!running) return;
            mp.setVolume(0f, 0f);
            mp.setVideoScalingMode(MediaPlayer.VIDEO_SCALING_MODE_SCALE_TO_FIT_WITH_CROPPING);
            mp.setOnInfoListener((m, what, extra) -> {
                if (what == MediaPlayer.MEDIA_INFO_VIDEO_RENDERING_START) {
                    h.removeCallbacks(stalled);
                    js("reveal()");
                }
                return false;
            });
            long dur = mp.getDuration();
            boolean shortClip = dur > 0 && dur < MIN_CLIP_MS;
            mp.setLooping(shortClip);
            long show = dur <= 0 ? MAX_CLIP_MS : shortClip ? MIN_CLIP_MS : Math.min(dur, MAX_CLIP_MS);
            video.start();
            h.postDelayed(this::endScene, Math.max(4000, show - FADE_MS));
        });
        video.setOnCompletionListener(mp -> endScene());
        video.setOnErrorListener((mp, what, extra) -> {
            if (current != null) bad.add(current.id);
            h.removeCallbacksAndMessages(null);
            ending = false;
            h.post(this::next);
            return true;
        });
    }

    private final Runnable stalled = this::onStalled;

    private void onStalled() {
        if (current != null) bad.add(current.id);
        video.stopPlayback();
        h.removeCallbacksAndMessages(null);
        ending = false;
        next();
    }

    void start() {
        if (running) return;
        running = true;
        order.clear();
        order.addAll(cache.clips);
        Collections.shuffle(order);
        idx = 0;
        if (pageReady) begin();
    }

    private void begin() {
        if (videosOnly) next();
        else family();
    }

    void stop() {
        running = false;
        h.removeCallbacksAndMessages(null);
        video.stopPlayback();
    }

    void destroy() {
        stop();
        web.destroy();
    }

    /* Call a function on the page if it has loaded far enough to have it. */
    private void js(String call) {
        String fn = call.substring(0, call.indexOf('('));
        web.evaluateJavascript("window." + fn + " && " + call, null);
    }

    private void next() {
        if (!running) return;
        ending = false;
        current = !videosOnly && sinceFamily >= CLIPS_PER_FAMILY ? null : pick();
        if (current == null) {
            family();
            return;
        }
        sinceFamily++;
        js("showVideo(" + Web.quote(current.title) + ")");
        video.setVideoURI(cache.uri(current));
        h.postDelayed(stalled, START_TIMEOUT_MS);
    }

    private VideoCache.Clip pick() {
        if (order.isEmpty()) return null;
        boolean online = cache.online();
        for (int tries = 0; tries < order.size(); tries++) {
            VideoCache.Clip c = order.get(idx % order.size());
            idx++;
            if (bad.contains(c.id)) continue;
            if (cache.cached(c) || online) return c;
        }
        return null;
    }

    private void family() {
        sinceFamily = 0;
        ending = false;
        video.stopPlayback();
        js("showFamily()");
        h.postDelayed(this::endScene, FAMILY_MS);
    }

    private void endScene() {
        if (!running || ending) return;
        ending = true;
        h.removeCallbacksAndMessages(null);
        js("curtain()");
        h.postDelayed(this::next, FADE_MS);
    }
}
