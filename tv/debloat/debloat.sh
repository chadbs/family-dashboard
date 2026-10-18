#!/usr/bin/env bash
# Debloat the NVIDIA Shield TV (Android 11). Every step is reversible: see restore.sh.
# Usage (Git Bash on Windows):  ADB=/path/to/adb.exe ./debloat.sh [ip:port]
# Nothing here is a true uninstall, needs root, or touches the launcher, screensaver,
# WebView, Play services/store, Chromecast, NVIDIA system services or any user-installed app.
set -u
export MSYS_NO_PATHCONV=1
ADB="${ADB:-adb}"
DEVICE="${1:-192.168.1.172:5555}"
"$ADB" connect "$DEVICE" >/dev/null
sh() { "$ADB" -s "$DEVICE" shell "$@"; }

# Packages disabled for user 0 (undo: pm enable <pkg>).
# com.nvidia.benchmarkblocker was ALREADY disabled before this script ran; it is not ours to re-enable.
DISABLE=(
  com.nvidia.stats            # NVIDIA telemetry/stats collector, ~110 MB RSS
  com.nvidia.feedback         # NVIDIA feedback/bug-report app, ~80 MB RSS
  com.nvidia.shieldbeta       # SHIELD Experience beta-program app (launcher entry), ~70 MB RSS
  com.nvidia.shield.beta      # SHIELD beta-program helper
  com.nvidia.nvgamecast       # GameStream/Gamecast broadcasting service, ~30 MB RSS (persistent)
  com.google.android.feedback # Google "send feedback" agent
  com.android.printspooler    # Android print spooler; a TV has no printing
  com.netflix.ninja           # Netflix: Chad does not use it (2026-10-17)
  com.nvidia.tegrazone3       # GeForce NOW: not used
  com.google.android.tv       # Live Channels, ~150 MB: not used
)
for p in "${DISABLE[@]}"; do
  echo -n "$p: "; sh pm disable-user --user 0 "$p"
done

# One-time clean-up (not reversible, nothing to restore: caches regenerate).
for p in com.stremio.one com.espn.score_center com.nvidia.nvgamecast; do sh am force-stop "$p"; done
sh pm trim-caches 4G

# Animation scales. The device was already at 0.5/0.5/0.5 when we started, so this is a no-op re-assert.
sh settings put global window_animation_scale 0.5
sh settings put global transition_animation_scale 0.5
sh settings put global animator_duration_scale 0.5

echo "--- disabled now:"; sh pm list packages -d
echo "--- memory:"; sh "grep -E 'MemAvailable' /proc/meminfo; ps -A | wc -l"
echo "Reboot the Shield (adb reboot) so the persistent nvgamecast process is gone for good."
