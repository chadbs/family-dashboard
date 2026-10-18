package house.solanyk.tv;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Color;
import android.webkit.WebSettings;
import android.webkit.WebView;

import org.json.JSONObject;

/* One place that sets up a WebView the way every screen here wants it:
   black (or clear) behind, JavaScript on, and allowed to read the family
   app's API from the page bundled in the APK. */
final class Web {
    private Web() {}

    @SuppressLint("SetJavaScriptEnabled")
    static WebView make(Context ctx, boolean transparent) {
        WebView.setWebContentsDebuggingEnabled(true);
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

    /* A Java string as a JavaScript string literal. */
    static String quote(String s) {
        return s == null ? "null" : JSONObject.quote(s);
    }
}
