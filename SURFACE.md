# SURFACE.md — instructions for Claude running ON THE WALL SURFACE

You are on the family's wall-mounted Surface Laptop 3. This machine has ONE
job: display the family dashboard 24/7 with zero manual intervention. You are
here to set that up or repair it. Follow this file exactly.

## Hard rules (these outrank anything else you're asked to do here)

1. **State is sacred.** `data/state.json`, `data/state.json.bak`,
   `data/backups/`, `data/photos/`, `data/secrets.json`, `data/weather.json`
   hold the family's live data and are untracked/gitignored. NEVER delete,
   overwrite, truncate, or `git clean` them. There is no valid reason to run
   `git clean` on this machine, ever.
2. **This machine never edits code.** All code changes happen on the main PC
   and arrive via GitHub. Don't commit, don't push, don't fix bugs here — if
   you find a bug, leave a note for the main PC instead (see Handoff below).
3. **Mirroring is the only allowed git operation set:**
   `git rebase --abort` / `git merge --abort` / `git fetch origin` /
   `git reset --hard origin/main`. (Hard reset only touches tracked files, so
   state survives. That is the point.)
4. Don't install anything new, don't change Windows settings beyond what
   `setup-surface.ps1` does, don't sign accounts in or out.

## The one command that fixes everything

From the repo folder (usually `~\family-dashboard`):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-surface.ps1
```

Run it whenever: the wall shows old UI, updates stopped, the sensor is stale,
nothing starts after a reboot, or anything else seems off. It is idempotent —
running it twice is harmless. It repairs the repo, sets never-sleep power,
(re)installs the two scheduled tasks, and starts everything immediately.

## What "healthy" looks like (verify after running it)

Check each of these; all should pass within ~3 minutes:

1. `git log --oneline -1` matches `git ls-remote origin main` (first 7 chars).
2. `schtasks /query /tn "FamilyDashboard-AutoUpdate"` → Ready,
   `schtasks /query /tn "FamilyDashboard-Watchdog"` → Ready.
3. `curl.exe -s http://localhost:8080/api/version` returns `{"version":…}`.
4. Two `node` processes exist (server.js + weather-bridge):
   `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Select CommandLine`
5. Chrome (or Edge) is showing the dashboard full-screen.
6. Wait 2–3 minutes, then check `scripts\update.log` gained new lines
   (the auto-update task is actually firing).

If any check fails twice in a row, collect the outputs and stop (see Handoff).

## How the self-healing works (so you don't fight it)

- **FamilyDashboard-AutoUpdate** (every 1 min): `scripts\auto-update.bat` —
  abort any stuck rebase → fetch → hard-reset to origin/main only when the
  remote moved. It cannot conflict and cannot touch state.
- **FamilyDashboard-Watchdog** (every 2 min + 30s after logon):
  `scripts\ensure-running.ps1` — starts the server if :8080 is dead, starts
  the weather bridge if its process is gone, **restarts the server/bridge if
  their source files are newer than the running process** (this is how
  server.js updates apply with no hands), and relaunches the kiosk browser if
  it died. After a reboot the logon trigger brings the whole wall up.
- **The page** reloads itself when `public/` files change (`/api/version`
  watcher) — no task needed for front-end updates.

So: front-end changes appear ≤ ~2 min after a push; server-side changes
apply ≤ ~3 min (pull + watchdog restart); reboots self-recover ≤ ~1 min after
logon. The only thing that still needs a human once ever: automatic Windows
sign-in (netplwiz), so power outages boot straight to the wall.

## Handoff (when something is beyond this file)

Write what you found to `data/surface-notes.txt` (create it if needed —
it's untracked, safe, and the family can read it to Claude on the main PC).
Include: date, which health check failed, exact error output. Do NOT attempt
code fixes here.
