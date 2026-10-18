package house.solanyk.tv;

import android.app.Activity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.WindowManager;

/* The screensaver on demand, from the home screen's tile. Any button ends it. */
public class ScreensaverActivity extends Activity {
    static final String EXTRA_VIDEOS = "videos";

    private SaverView view;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        view = new SaverView(this, getIntent().getBooleanExtra(EXTRA_VIDEOS, false));
        setContentView(view);
    }

    @Override
    protected void onResume() {
        super.onResume();
        view.start();
        VideoCache.get(this).fill();
    }

    @Override
    protected void onPause() {
        view.stop();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        view.destroy();
        super.onDestroy();
    }

    /* The OK press that opened this screen lets go after we appear; only a
       button pressed while we're showing ends it. */
    private boolean pressed;

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        if (e.getAction() == KeyEvent.ACTION_DOWN) pressed = true;
        else if (e.getAction() == KeyEvent.ACTION_UP && pressed) finish();
        return true;
    }
}
