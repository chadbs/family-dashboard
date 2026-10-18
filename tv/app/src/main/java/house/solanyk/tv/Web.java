package house.solanyk.tv;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Color;
import android.webkit.WebSettings;
import android.webkit.WebView;

/* One place that sets up a WebView the way every screen here wants it:
   black (or clear) behind, JavaScript on, and allowed to read the family
   app's API from the page bundled in the APK. */
final class Web {
    private Web() {}

    @SuppressLint("SetJavaScriptEnabled")
    static WebView make(Context ctx, boolean transparent) {
        WebView w = new WebView(ctx);
        w.setBackgroundColor(transparent ? Color.TRANSPARENT : Color.BLACK);
        w.setVerticalScrollBarEnabled(false);
        w.setHorizontalScrollBarEnabled(false);
        WebSettings s = w.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        /* The page lives at file:///android_asset; the API has no CORS
           headers. This lets the bundled page fetch it anyway. */
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        return w;
    }

    static String quote(String s) {
        if (s == null) return "null";
        StringBuilder b = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            if (c == '"' || c == '\') b.append('\').append(c);
            else if (c == '\n') b.append("\n");
            else if (c < 0x20 || c == 0x2028 || c == 0x2029) b.append(String.format("\u%04x", (int) c));
            else b.append(c);
        }
        return b.append('"').toString();
    }
}
