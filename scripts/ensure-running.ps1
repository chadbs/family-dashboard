# ===========================================================================
#  ensure-running.ps1 — the dashboard watchdog (runs on the SURFACE).
#
#  Makes sure BOTH the local server and the weather bridge are alive, and
#  restarts whichever one died. The FamilyDashboard-Watchdog scheduled task
#  runs this every couple of minutes, so a sleep/wake (which drops the SDR
#  dongle and so kills the bridge) — or a crash, or a reboot — can't leave the
#  wall showing a stale sensor. You never have to re-run start.bat by hand.
#
#  It only (re)starts what's actually missing, so in steady state it does
#  nothing and the screen never flashes. The browser is left alone (Chrome
#  survives sleep on its own).
# ===========================================================================
$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path -Parent $PSScriptRoot

# --- Is the server answering on :8080? -------------------------------------
$serverUp = $false
try {
  $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8080/api/version" -UseBasicParsing -TimeoutSec 4
  if ($resp.StatusCode -eq 200) { $serverUp = $true }
} catch { }

if (-not $serverUp) {
  Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $root -WindowStyle Hidden
}

# --- Is the weather bridge running? ----------------------------------------
# The bridge process exits the instant rtl_433 does (e.g. the dongle drops on
# sleep), so the presence of its node process is a reliable "alive" signal.
$node = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'")
$bridgeUp = [bool]($node | Where-Object { $_.CommandLine -like '*weather-bridge*' })

if (-not $bridgeUp) {
  # Locate rtl_433.exe the same way start.bat does.
  if (-not $env:RTL433) {
    if (Test-Path "C:\rtl_433\rtl_433.exe") {
      $env:RTL433 = "C:\rtl_433\rtl_433.exe"
    } elseif (Test-Path "$env:USERPROFILE\Downloads\rtl_433-win-x64-25.12\rtl_433.exe") {
      $env:RTL433 = "$env:USERPROFILE\Downloads\rtl_433-win-x64-25.12\rtl_433.exe"
    }
  }
  Start-Process -FilePath "node" -ArgumentList "scripts\weather-bridge.js" -WorkingDirectory $root -WindowStyle Hidden
}
