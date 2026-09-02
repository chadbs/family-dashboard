# setup-tunnel.ps1 - put The Solanyk House hub on the internet.
#
# Run this ON THE SURFACE (the wall machine), as the wall user, once.
#
# What it does: installs Tailscale, signs this machine in, and turns on
# Tailscale Funnel for port 8080. Funnel gives the dashboard server a real,
# permanent https address that anyone can open in any browser with no sign-in
# and no app - which is exactly what Kenzie needs. The address does not change
# when the router reboots or the ISP hands out a new IP, so it can be
# bookmarked and pinned to a phone home screen.
#
# It is idempotent. Running it twice is harmless.
#
# NOTE: pure ASCII on purpose. PowerShell 5.1 misreads UTF-8-without-BOM and a
# stray em dash becomes a smart quote that closes a string early.

$ErrorActionPreference = "Stop"

function Say($msg) { Write-Host "  $msg" }

Write-Host ""
Write-Host "=== The Solanyk House - public address setup ==="
Write-Host ""

# --- 1. Tailscale present? ------------------------------------------------
$ts = "C:\Program Files\Tailscale\tailscale.exe"
if (-not (Test-Path $ts)) {
  Say "Tailscale is not installed. Installing it with winget..."
  try {
    winget install --id Tailscale.Tailscale --accept-source-agreements --accept-package-agreements --silent
  } catch {
    Write-Host ""
    Write-Host "  Could not install automatically."
    Write-Host "  Download it here, install, then run this script again:"
    Write-Host "    https://tailscale.com/download/windows"
    Write-Host ""
    exit 1
  }
  Start-Sleep -Seconds 5
}
if (-not (Test-Path $ts)) {
  Write-Host "  Tailscale still not found at $ts - install it and re-run."
  exit 1
}
Say "Tailscale is installed."

# --- 2. Signed in? --------------------------------------------------------
$status = & $ts status 2>&1 | Out-String
if ($status -match "Logged out" -or $status -match "NeedsLogin") {
  Write-Host ""
  Say "This machine needs to be signed in to Tailscale once."
  Say "A browser window will open. Sign in with Chad's account."
  Write-Host ""
  & $ts up
} else {
  Say "Already signed in to Tailscale."
}

# --- 3. Is the dashboard actually serving? --------------------------------
try {
  $probe = Invoke-WebRequest -Uri "http://localhost:8080/api/hub/version" -UseBasicParsing -TimeoutSec 5
  Say "Dashboard server is answering on port 8080."
} catch {
  Write-Host ""
  Say "WARNING: nothing is answering on http://localhost:8080."
  Say "Start it first (scripts\setup-surface.ps1 does this), then re-run."
  Write-Host ""
}

# --- 4. Turn on Funnel ----------------------------------------------------
Write-Host ""
Say "Turning on Tailscale Funnel for port 8080..."
Say "If this is the first time, Tailscale prints a link to enable Funnel"
Say "for the tailnet. Open it, approve, then run this script again."
Write-Host ""

& $ts funnel --bg 8080

# --- 5. Report the address ------------------------------------------------
Write-Host ""
$state = & $ts status --json 2>$null | ConvertFrom-Json
$dns = $null
if ($state -and $state.Self -and $state.Self.DNSName) { $dns = $state.Self.DNSName.TrimEnd(".") }

Write-Host "=== Done ==="
Write-Host ""
if ($dns) {
  Write-Host "  The house hub is now at:"
  Write-Host ""
  Write-Host "      https://$dns/hub"
  Write-Host ""
  Write-Host "  The wall dashboard itself is at:"
  Write-Host ""
  Write-Host "      https://$dns/"
  Write-Host ""
} else {
  Write-Host "  Run '& `"$ts`" status' to see this machine's address."
  Write-Host "  The hub is that address with /hub on the end."
  Write-Host ""
}
Write-Host "  On an iPhone: open the /hub link in Safari, tap Share, then"
Write-Host "  'Add to Home Screen'. It gets an icon and opens full screen."
Write-Host ""
Write-Host "  To check it later:   & `"$ts`" funnel status"
Write-Host "  To turn it off:      & `"$ts`" funnel --https=443 off"
Write-Host ""
Write-Host "  Note: this address is public. Anyone who has the link can open"
Write-Host "  the hub and the wall dashboard. There is no password on it."
Write-Host ""
