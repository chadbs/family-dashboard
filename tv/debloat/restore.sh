#!/usr/bin/env bash
# Undo everything debloat.sh changed. Usage: ADB=/path/to/adb.exe ./restore.sh [ip:port]
# Does NOT re-enable com.nvidia.benchmarkblocker: it was disabled before we touched the device.
# Caches that were trimmed rebuild themselves; force-stopped apps simply start again when opened.
set -u
export MSYS_NO_PATHCONV=1
ADB="${ADB:-adb}"
DEVICE="${1:-192.168.1.172:5555}"
"$ADB" connect "$DEVICE" >/dev/null
sh() { "$ADB" -s "$DEVICE" shell "$@"; }

ENABLE=(
  com.nvidia.stats
  com.nvidia.feedback
  com.nvidia.shieldbeta
  com.nvidia.shield.beta
  com.nvidia.nvgamecast
  com.google.android.feedback
  com.android.printspooler
  com.netflix.ninja
  com.nvidia.tegrazone3
  com.google.android.tv
)
for p in "${ENABLE[@]}"; do
  echo -n "$p: "; sh pm enable "$p"
done

# Animation scales were 0.5 / 0.5 / 0.5 before debloat.sh; debloat.sh left them there, so nothing to undo.
# To go back to stock-default 1.0 anyway, uncomment:
# sh settings put global window_animation_scale 1.0
# sh settings put global transition_animation_scale 1.0
# sh settings put global animator_duration_scale 1.0

# The custom launcher switch (2026-10-17): the stock Android TV home was disabled so
# house.solanyk.tv could be the default home, and the screensaver was changed from Aerial Dream.
# To go back, uncomment:
# sh pm enable com.google.android.tvlauncher
# sh pm enable com.spocky.projengmenu   # Projectivy; its accessibility service grabbed the Home button
# sh settings put secure screensaver_components com.codingbuffalo.aerialdream/com.codingbuffalo.aerialdream.AerialDream

echo "--- still disabled (should be just com.nvidia.benchmarkblocker):"; sh pm list packages -d
echo "Reboot (adb reboot) so the re-enabled services start cleanly."
