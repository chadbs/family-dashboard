# ===========================================================================
#  Run on the SURFACE (the wall touchscreen). Creates/repairs the task that
#  pulls the latest dashboard from GitHub every minute. Uses settings that
#  actually FIRE on a laptop: runs on battery, starts when available, and
#  doesn't wait for the machine to be idle (which a kiosk never is).
# ===========================================================================
$ErrorActionPreference = "Stop"
$taskName = "FamilyDashboard-AutoUpdate"
$vbs = Join-Path $PSScriptRoot "auto-update-hidden.vbs"

$action  = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$vbs`""

# Fire every minute, indefinitely.
$start   = (Get-Date).Date.AddMinutes(1)
$trigger = New-ScheduledTaskTrigger -Once -At $start
$trigger.Repetition = (New-ScheduledTaskTrigger -Once -At $start -RepetitionInterval (New-TimeSpan -Minutes 1)).Repetition

# The settings that matter: run on battery, start when available, allow overlap-skip.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal `
  -Description "Pulls the latest dashboard from GitHub every minute (battery-friendly)." -Force | Out-Null

Write-Host ""
Write-Host "Done. '$taskName' re-created with battery-friendly settings." -ForegroundColor Green
Write-Host "It will now run every minute on AC or battery."
Write-Host ""
Write-Host "Give it ~2 minutes, then run:  git rev-parse --short HEAD"
Write-Host "It should advance to the latest commit on its own."
Write-Host ""
