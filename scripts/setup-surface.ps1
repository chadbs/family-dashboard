# ===========================================================================
#  setup-surface.ps1 - ONE command that makes the wall fully self-sufficient.
#
#  Run on the SURFACE (as the logged-in wall user, from the repo folder):
#      powershell -ExecutionPolicy Bypass -File scripts\setup-surface.ps1
#
#  Idempotent: safe to run again anytime something seems off. It:
#    1. Repairs the repo (aborts stuck rebases, mirrors origin/main -
#       tracked code only; data\ state is untracked and NEVER touched)
#    2. Sets power so the screen/PC never sleep on AC
#    3. (Re)installs the scheduled tasks, battery-friendly so they FIRE:
#         FamilyDashboard-AutoUpdate  every 1 min  -> mirror GitHub
#         FamilyDashboard-Watchdog    every 2 min + at logon -> keep server,
#             weather bridge and kiosk browser alive; restart server when
#             server-side code updates
#    4. Starts everything right now
#  After this, reboots / shutdowns / sleep / code updates all recover
#  themselves. Nothing on the Surface ever needs a keyboard again.
# ===========================================================================
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
Write-Host "`n=== Family Dashboard - Surface setup/repair ===" -ForegroundColor Cyan

# ---- 1) Repo health: mirror origin/main, recover any stuck state ----------
Write-Host "`n[1/4] Repairing repo..."
$env:GIT_TERMINAL_PROMPT = "0"; $env:GCM_INTERACTIVE = "never"
git rebase --abort 2>$null | Out-Null
git merge --abort 2>$null | Out-Null
git fetch origin
$local = git rev-parse HEAD; $remote = git rev-parse origin/main
if ($local -ne $remote) { git reset --hard origin/main | Out-Null }
node --check server.js
if ($LASTEXITCODE -ne 0) { throw "server.js does not parse - do NOT proceed; report this on the main PC (see SURFACE.md Handoff)" }
Write-Host ("  repo at {0} (matches origin/main) - server.js parses OK" -f $remote.Substring(0,7)) -ForegroundColor Green

# ---- 2) Power: never sleep while plugged in --------------------------------
Write-Host "`n[2/4] Power settings (never sleep on AC)..."
powercfg /change monitor-timeout-ac 0 | Out-Null
powercfg /change standby-timeout-ac 0 | Out-Null
powercfg /change hibernate-timeout-ac 0 | Out-Null
Write-Host "  display + sleep + hibernate disabled on AC" -ForegroundColor Green

# ---- 3) Scheduled tasks (battery-friendly; they actually fire on laptops) --
Write-Host "`n[3/4] Installing scheduled tasks..."
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

# every-minute GitHub mirror
$updStart = (Get-Date).Date.AddMinutes(1)
$updTrig = New-ScheduledTaskTrigger -Once -At $updStart
$updTrig.Repetition = (New-ScheduledTaskTrigger -Once -At $updStart -RepetitionInterval (New-TimeSpan -Minutes 1)).Repetition
$updAction = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$root\scripts\auto-update-hidden.vbs`""
Register-ScheduledTask -TaskName "FamilyDashboard-AutoUpdate" -Action $updAction -Trigger $updTrig `
  -Settings $settings -Principal $principal -Force `
  -Description "Mirrors the dashboard code from GitHub every minute (fetch + reset; never touches state)." | Out-Null
Write-Host "  FamilyDashboard-AutoUpdate  - every 1 min" -ForegroundColor Green

# watchdog: every 2 min AND ~30s after logon (covers reboots)
$wdStart = (Get-Date).Date.AddMinutes(2)
$wdRepeat = New-ScheduledTaskTrigger -Once -At $wdStart
$wdRepeat.Repetition = (New-ScheduledTaskTrigger -Once -At $wdStart -RepetitionInterval (New-TimeSpan -Minutes 2)).Repetition
$wdLogon = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$wdLogon.Delay = "PT30S"
$wdAction = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$root\scripts\watchdog-hidden.vbs`""
Register-ScheduledTask -TaskName "FamilyDashboard-Watchdog" -Action $wdAction -Trigger @($wdRepeat, $wdLogon) `
  -Settings $settings -Principal $principal -Force `
  -Description "Keeps server + weather bridge + kiosk browser alive; restarts the server when its code updates." | Out-Null
Write-Host "  FamilyDashboard-Watchdog    - every 2 min + at logon" -ForegroundColor Green

# the old boot shortcut is superseded by the logon trigger; remove if present
Unregister-ScheduledTask -TaskName "FamilyDashboard-AutoPull" -Confirm:$false -ErrorAction SilentlyContinue

# ---- 4) Start everything right now -----------------------------------------
Write-Host "`n[4/4] Starting everything now..."
powershell -NonInteractive -ExecutionPolicy Bypass -File "$root\scripts\ensure-running.ps1"
Start-Sleep -Seconds 4
try {
  $v = Invoke-WebRequest -Uri "http://127.0.0.1:8080/api/version" -UseBasicParsing -TimeoutSec 8
  Write-Host "  server is LIVE on http://localhost:8080" -ForegroundColor Green
} catch {
  Write-Host "  server not answering yet - the watchdog will keep trying (check again in ~2 min)" -ForegroundColor Yellow
}

Write-Host "`nDone. The wall now recovers from reboots, sleep and updates on its own." -ForegroundColor Cyan
Write-Host "One Windows setting only YOU can flip (one time): enable automatic sign-in"
Write-Host "(Win+R -> netplwiz -> untick 'Users must enter a user name and password')"
Write-Host "so a power outage boots straight back to the wall.`n"
