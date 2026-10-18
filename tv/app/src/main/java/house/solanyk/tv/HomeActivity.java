package house.solanyk.tv;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;

/* The home screen. Everything you see is assets/home.html; this activity
   only hosts it, tells it when we come back to the front, and keeps the
   Back button from leaving home. */
public class HomeActivity extends Activity {
    private WebView web;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);
        web = Web.make(this, false);
        web.addJavascriptInterface(new Bridge(this), "Shield");
        web.loadUrl("file:///android_asset/home.html");
        setContentView(web);
        web.requestFocus(View.FOCUS_DOWN);
        VideoCache.get(this).fill();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.evaluateJavascript("window.onShown && onShown()", null);
        web.requestFocus();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        /* The Home button while already home: back to the first tile. */
        web.evaluateJavascript("window.onHome && onHome()", null);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.onBack && onBack()", null);
    }
}
