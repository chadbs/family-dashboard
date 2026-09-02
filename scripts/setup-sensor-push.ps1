# setup-sensor-push.ps1 - make the Surface send the backyard reading to the
# family app every 5 minutes.
#
# Run ON THE SURFACE, once, as the wall user. Idempotent.
#
# It registers a scheduled task that runs scripts\sensor-push.js every five
# minutes. That script reads data\weather.json (kept fresh by the weather
# bridge) and POSTs it to the address in cloud\endpoint.json. When the Surface
# is asleep nothing is sent, and the app shows the forecast instead of a stale
# backyard number - that is by design.
#
# Pure ASCII on purpose (PowerShell 5.1 + UTF-8-without-BOM = broken strings).

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$task = "FamilyDashboard-SensorPush"
$script = Join-Path $root "scripts\sensor-push.js"
$endpoint = Join-Path $root "cloud\endpoint.json"

Write-Host ""
Write-Host "=== Sensor push setup ==="

# --- Is the app address filled in? ---------------------------------------
$url = ""
try {
  $cfg = Get-Content $endpoint -Raw | ConvertFrom-Json
  if ($cfg.url) { $url = [string]$cfg.url }
} catch {}
if (-not $url) {
  Write-Host ""
  Write-Host "  cloud\endpoint.json has no url yet."
  Write-Host "  Deploy the app first, then put its address in that file, then re-run."
  Write-Host ""
  exit 1
}
Write-Host "  App address: $url"

# --- One test send so a bad address fails loudly, here, now ---------------
Write-Host "  Sending one reading as a test..."
& node $script
if ($LASTEXITCODE -ne 0) {
  Write-Host "  The test send did not succeed (see above). Fix that first."
  exit 1
}

# --- Register the task ----------------------------------------------------
$node = (Get-Command node).Source
$action = "`"$node`" `"$script`""
schtasks /Create /F /SC MINUTE /MO 5 /TN $task /TR $action /RL LIMITED | Out-Null
Write-Host "  Scheduled task '$task' set: every 5 minutes."
Write-Host ""
Write-Host "  Check it later with:  schtasks /query /tn $task"
Write-Host ""
