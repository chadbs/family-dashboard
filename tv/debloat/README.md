# Shield TV debloat (2026-10-17)

Device: SHIELD Android TV, Android 11, 3 GB RAM, `192.168.1.172:5555`.
Everything is reversible and needs no root. `debloat.sh` applies it, `restore.sh` undoes it.

## Disabled (`pm disable-user --user 0`, undo `pm enable <pkg>`)

| Package | What it is | Why it is safe |
|---|---|---|
| `com.nvidia.stats` | NVIDIA usage/telemetry collector (~110 MB RSS) | Reporting only; nothing user-facing depends on it |
| `com.nvidia.feedback` | NVIDIA feedback / bug-report app (~80 MB RSS) | Only used to send reports to NVIDIA |
| `com.nvidia.shieldbeta` | SHIELD Experience beta-programme app (~70 MB RSS) | Only for opting in to beta builds; OTA (`com.nvidia.ota`) is untouched |
| `com.nvidia.shield.beta` | Helper for the beta programme | Same as above |
| `com.nvidia.nvgamecast` | Gamecast / broadcasting service (~30 MB) | Streaming-to-Twitch feature, unused. It is flagged persistent, so it still starts at boot; disabling it still hides it and blocks its activities |
| `com.google.android.feedback` | Google "send feedback" agent | Reporting only |
| `com.android.printspooler` | Android printing | A TV has no printers |

Already disabled before we started and left alone: `com.nvidia.benchmarkblocker`.

## Other changes

- `am force-stop` on Stremio, ESPN and nvgamecast. A one-off to free RAM. The apps start again normally when opened.
- `pm trim-caches 4G`. Cleared app caches and freed about 1.1 GB. Caches rebuild themselves.
- Animation scales (window / transition / animator) were already 0.5 / 0.5 / 0.5, so nothing was changed.

## Results

| | Before | After (no reboot) | After reboot, settled |
|---|---|---|---|
| MemAvailable | 890 MB | 1071 MB | 818 MB |
| Processes (`ps -A`) | 318 | 316 | 336 |
| Free on /data | 1.89 GB | 2.97 GB | 3.19 GB |

The "before" reading was taken after 43 days of uptime. The post-reboot figure is a fresh boot with the new `house.solanyk.tv` app and its screensaver running, so it is not a like-for-like comparison.

## Verified

Netflix and YouTube launch, `HOME` returns to the home screen, remote key events work, the Aerial screensaver setting is unchanged, and the Shield boots to home after a reboot.

## Candidates left enabled (not applied: unsure or in your protected list)

- `com.google.android.katniss`: Assistant / voice search (~200 MB across processes). Disabling it kills the mic button.
- `com.google.android.tv` (Live Channels, ~150 MB): disable if you never use live TV or HDMI-input channels. It feeds the launcher's "Play Next" row.
- `com.google.android.tvrecommendations`: feeds the stock launcher's rows. It becomes disposable once the custom launcher replaces the stock home.
- `com.nvidia.tegrazone3`: NVIDIA Games / GeForce NOW. Disable it if you do not use GeForce NOW.
- `com.nvidia.shield.smbserver` / `com.nvidia.shield.nas`: SMB file sharing from the Shield.
- `com.nvidia.developerwidget`, `com.nvidia.diagtools`, `com.nvidia.factory*`, `com.nvidia.inputviewer`, `com.nvidia.shield.welcome`, `com.nvidia.shield.registration`, `com.nvidia.hotwordsetup`: no RAM cost, tiny storage; not worth the risk.
- `com.google.android.marvin.talkback`, `com.android.gallery3d`, `com.android.htmlviewer`, `com.android.providers.calendar`, `com.google.android.syncadapters.calendar`: unused, no RAM cost.

## User apps that look unused (none touched)

No recorded use: Puffin TV Browser, Bunnyska, Bubble Shooter Monkey Rescue, Millionaire Trivia, Orbia, ESPN, Duo (`tachyon`), Downloader, Send Files to TV, Screen Mirroring, Crossy Road, Bomb Squad, Jackbox, Dolphin, X TV.

Biggest storage:

- Kodi: 1.4 GB
- RetroArch: 0.9 GB
- Jackbox: 0.9 GB
- Stremio: 0.46 GB
- Bomb Squad: 0.48 GB
- Crossy Road: 0.31 GB
- Syncler: 0.31 GB

Usage data on this device is partial, so check before removing any of them.
