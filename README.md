# Family Weather Dashboard

A beautiful wall display for your Surface Laptop 3 — your AcuRite 01608 weather,
the family calendar, and chores. Fully custom, no subscription, and you update it
from your main PC (or let an agent maintain it). Chore checkmarks are saved
separately so updates never wipe them.

---

## How it's wired

```
 AcuRite 01608  ))) 433 MHz )))  RTL-SDR dongle ──► Surface Laptop 3
                                                     • rtl_433 + weather-bridge.js  -> data/weather.json
                                                     • server.js  (serves dashboard + saves chores)
                                                     • Edge kiosk -> http://localhost:8080
                                                     • auto-update.bat  -> git pull every minute

 Your PC (edit here) ──► git push ──► GitHub ──► Surface auto-pulls ──► screen refreshes itself
```

- **Code** (look, layout, settings) lives in git → edit on your PC, push, the screen updates.
- **State** (which chores are checked) lives in `data/state.json` on the Surface → never in git, never wiped by an update.

---

## What you buy

Just the **RTL-SDR Blog V4 dongle (~$40)**. The Surface is everything else.

---

## One-time setup on the Surface

### 1. Install the basics
- **Node.js** (LTS) from nodejs.org — runs the dashboard. (No `npm install` needed; zero dependencies.)
- **Git** from git-scm.com — for auto-updates.

### 2. Get the project onto the Surface
Put this folder in a GitHub repo (I can set that up with you), then on the Surface:
```
git clone <your-repo-url> family-dashboard
cd family-dashboard
node server.js
```
Open `http://localhost:8080` — you'll see the dashboard with demo weather.

### 3. Make it yours
Edit `public/config.js`: your family members + colors, your chore list, and your
Google Calendar link. Save, and (once git is set up) push from your PC — the
Surface picks it up automatically.

### 4. Full-screen on boot
- Put a shortcut to `scripts/start.bat` in the Startup folder
  (`Win+R` → `shell:startup`). It launches the server and opens Edge in kiosk mode.
- In Windows Settings, set the screen to **never turn off** while plugged in.

### 5. Auto-update every minute
Open **Task Scheduler** → Create Task → trigger "every 1 minute" → action: run
`scripts/auto-update.bat`. Now anything you push from your PC appears on the wall
within ~a minute, and the page reloads itself.

---

## Connecting your weather sensor (after the dongle arrives)

1. Plug the RTL-SDR dongle into the Surface's USB-A port. Run **Zadig** once to
   install the WinUSB driver for it (standard RTL-SDR step — I'll walk you through it).
2. Install **rtl_433** (Windows build).
3. Run `rtl_433 -F json` and watch — your 01608 readings will scroll past. Note the
   `model` names and field names you see.
4. If they differ from the defaults, tweak `scripts/weather-bridge.js` (it's
   commented to show exactly where).
5. Uncomment the weather-bridge line in `scripts/start.bat`. Done — live data.

Until then, the dashboard shows tasteful demo numbers so it's never blank.

---

## Your real Google Calendar (optional)

In Google Calendar → Settings → your calendar → "Secret address in iCal format."
Paste it into `calendarICalUrl` in `public/config.js`. (Because Google blocks
direct browser access, there's a tiny one-line proxy step in the server — ping me
and I'll wire it in.)

---

## Letting an agent maintain it

- `scripts/screenshot.ps1` (scheduled, e.g. every 15 min) saves what's on screen
  to `screenshots/latest.png`.
- Sync that folder (OneDrive/Dropbox) or push it, and an agent can *see* the wall,
  then push improvements that the Surface auto-pulls. That's the "self-maintaining
  dashboard" loop.

---

## Files at a glance

| File | What it is |
|------|-----------|
| `server.js` | The local server (static files + chore saving + weather API). |
| `public/index.html` · `styles.css` · `app.js` | The dashboard itself. |
| `public/config.js` | **Your settings — edit this.** |
| `data/state.json` | Your saved chore state (auto-created, never in git). |
| `data/weather.json` | Latest sensor reading (written by the bridge). |
| `scripts/weather-bridge.js` | Turns the AcuRite radio signal into weather.json. |
| `scripts/start.bat` | Launches everything full-screen. |
| `scripts/auto-update.bat` | `git pull` for hands-off updates. |
| `scripts/screenshot.ps1` | Screen capture for agent monitoring. |

---

*Built to be edited. Tell me what to change and I'll push it — your screen updates itself.*
