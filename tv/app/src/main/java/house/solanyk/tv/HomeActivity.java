package house.solanyk.tv;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;

/* The home screen. Everything you see is assets/home.html; this activity
   only hosts it, tells it when we come back to the front, and keeps the
   Back button from leaving home. */
public class HomeActivity extends Activity {
    private WebView web;
    private final Handler h = new Handler(Looper.getMainLooper());
    private static final long HOLD_MS = 600;
    private final Runnable held = () -> ok("hold");

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
    protected void onPause() {
        web.evaluateJavascript("window.onHidden && onHidden()", null);
        super.onPause();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        /* The Home button while already home: back to the first tile. */
        web.evaluateJavascript("window.onHome && onHome()", null);
    }

    /* OK goes to the page as down / hold / up rather than as keys: the
       WebView swallows a held OK, so the page could never tell a tap
       (open the app) from a hold (pick it up to move it). */
    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        int k = e.getKeyCode();
        boolean select = k == KeyEvent.KEYCODE_DPAD_CENTER || k == KeyEvent.KEYCODE_ENTER
                || k == KeyEvent.KEYCODE_NUMPAD_ENTER || k == KeyEvent.KEYCODE_BUTTON_A;
        if (!select) return super.dispatchKeyEvent(e);
        if (e.getAction() == KeyEvent.ACTION_DOWN && e.getRepeatCount() == 0) {
            ok("down");
            h.postDelayed(held, HOLD_MS);
        } else if (e.getAction() == KeyEvent.ACTION_UP) {
            h.removeCallbacks(held);
            ok("up");
        }
        return true;
    }

    private void ok(String phase) {
        web.evaluateJavascript("window.nativeOk && nativeOk('" + phase + "')", null);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.onBack && onBack()", null);
    }
}
