# ===========================================================================
#  ensure-running.ps1 - the dashboard watchdog (runs on the SURFACE).
#
#  Every couple of minutes it makes sure the whole wall is healthy, with ZERO
#  manual steps - across sleep, wake, reboots, crashes AND code updates:
#    1. Server answering on :8080?          -> if not, start it
#    2. Server older than server-side code? -> restart it (auto-apply updates)
#    3. Weather bridge running?             -> if not, start it (fresh sensor)
#    4. Bridge older than its code?         -> restart it
#    5. Kiosk browser (Chrome/Edge) alive?  -> if not, relaunch full-screen
#
#  The FamilyDashboard-Watchdog scheduled task runs this (see
#  scripts\setup-surface.ps1). In steady state it does nothing and the screen
#  never flashes. It NEVER touches data\ - state is sacred.
# ===========================================================================
$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path -Parent $PSScriptRoot

function Newest-Write([string[]]$paths) {
  ($paths | ForEach-Object { Get-Item (Join-Path $root $_) } | Where-Object { $_ } |
    Measure-Object -Property LastWriteTime -Maximum).Maximum
}

$node = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'")

# --- 1+2) The server: up, and running the CURRENT code? ---------------------
$serverProc = $node | Where-Object { $_.CommandLine -like '*server.js*' -and $_.CommandLine -notlike '*weather-bridge*' } | Select-Object -First 1
$serverUp = $false
try {
  $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8080/api/version" -UseBasicParsing -TimeoutSec 4
  if ($resp.StatusCode -eq 200) { $serverUp = $true }
} catch { }

$serverCode = Newest-Write @("server.js", "scripts\keep-client.js", "scripts\keep_push.py")
if ($serverUp -and $serverProc -and $serverCode) {
  $started = $serverProc.CreationDate   # CIM gives a DateTime directly
  if ($started -and $serverCode -gt $started) {
    # a git update touched server-side code after this process started
    Stop-Process -Id $serverProc.ProcessId -Force
    Start-Sleep -Seconds 1
    $serverUp = $false
  }
}
if (-not $serverUp) {
  Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $root -WindowStyle Hidden
}

# --- 3+4) The weather bridge: running, and current? -------------------------
$bridgeProc = $node | Where-Object { $_.CommandLine -like '*weather-bridge*' } | Select-Object -First 1
$bridgeUp = [bool]$bridgeProc
$bridgeCode = Newest-Write @("scripts\weather-bridge.js")
if ($bridgeUp -and $bridgeCode) {
  $bStarted = $bridgeProc.CreationDate
  if ($bStarted -and $bridgeCode -gt $bStarted) {
    Stop-Process -Id $bridgeProc.ProcessId -Force
    Start-Sleep -Seconds 1
    $bridgeUp = $false
  }
}
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

# --- 5) The kiosk browser: if it died (or after a reboot), bring it back ----
$browserRunning = @(Get-Process -Name "chrome", "msedge" -ErrorAction SilentlyContinue).Count -gt 0
if (-not $browserRunning) {
  $chrome = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($chrome) {
    Start-Process -FilePath $chrome -ArgumentList "--kiosk", "http://localhost:8080", "--no-first-run", "--disable-pinch", "--overscroll-history-navigation=0"
  } else {
    $edge = @(
      "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
      "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($edge) {
      Start-Process -FilePath $edge -ArgumentList "--kiosk", "http://localhost:8080", "--edge-kiosk-type=fullscreen", "--no-first-run"
    }
  }
}
