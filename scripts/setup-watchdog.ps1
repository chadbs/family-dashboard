# ===========================================================================
#  Run ONCE on the SURFACE (the wall touchscreen). Creates/repairs the watchdog
#  task that keeps the dashboard server + weather bridge alive across sleep,
#  wake and reboots — so you never have to re-run start.bat to fix a stale
#  sensor. Uses the same battery-friendly settings as the auto-update task so
#  it actually FIRES on the laptop (runs on battery, starts when available,
#  doesn't wait for idle).
#
#  Usage:  powershell -ExecutionPolicy Bypass -File scripts\setup-watchdog.ps1
# ===========================================================================
$ErrorActionPreference = "Stop"
$taskName = "FamilyDashboard-Watchdog"
$vbs = Join-Path $PSScriptRoot "watchdog-hidden.vbs"

$action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$vbs`""

# Fire every 2 minutes, indefinitely. With -StartWhenAvailable, a check missed
# while asleep runs as soon as the Surface wakes, so the bridge is restarted
# within ~2 min of waking (and at most ~2 min after logon on a cold boot).
$start   = (Get-Date).Date.AddMinutes(2)
$trigger = New-ScheduledTaskTrigger -Once -At $start
$trigger.Repetition = (New-ScheduledTaskTrigger -Once -At $start -RepetitionInterval (New-TimeSpan -Minutes 2)).Repetition

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal `
  -Description "Keeps the dashboard server + weather bridge alive across sleep/wake/reboot (battery-friendly)." -Force | Out-Null

Write-Host ""
Write-Host "Done. '$taskName' created with battery-friendly settings." -ForegroundColor Green
Write-Host "Every 2 minutes it checks the server and weather bridge are running"
Write-Host "and restarts whichever one died -- no console window, no manual steps."
Write-Host ""
Write-Host "Test it:  end the 'node' bridge in Task Manager, wait ~2 min, and the"
Write-Host "sensor should flip back to Live on its own."
Write-Host ""
