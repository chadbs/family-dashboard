package house.solanyk.tv;

import android.service.dreams.DreamService;

/* The system screensaver. Pick it in Settings → Device Preferences → Screen saver. */
public class FamilyDream extends DreamService {
    private SaverView view;

    @Override
    public void onAttachedToWindow() {
        super.onAttachedToWindow();
        setInteractive(false);
        setFullscreen(true);
        setScreenBright(true);
        view = new SaverView(this, false);
        setContentView(view);
    }

    @Override
    public void onDreamingStarted() {
        super.onDreamingStarted();
        view.start();
        VideoCache.get(this).fill();
    }

    @Override
    public void onDreamingStopped() {
        view.stop();
        super.onDreamingStopped();
    }

    @Override
    public void onDetachedFromWindow() {
        if (view != null) view.destroy();
        super.onDetachedFromWindow();
    }
}
