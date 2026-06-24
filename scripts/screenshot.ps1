# =============================================================================
#  Captures what's currently on the Surface's screen to screenshots\latest.png
#  so an agent can "see" the wall display and proactively suggest tweaks.
#
#  Schedule with Task Scheduler (e.g. every 15 min). To let the agent see it
#  remotely, either push the file to your repo or sync the screenshots\ folder
#  with OneDrive/Dropbox (see README). The screenshots\ folder is gitignored by
#  default so it won't bloat your repo unless you opt in.
# =============================================================================

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$dir  = Join-Path $root "screenshots"
if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$gfx = [System.Drawing.Graphics]::FromImage($bmp)
$gfx.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)

$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$bmp.Save((Join-Path $dir "latest.png"))
$bmp.Save((Join-Path $dir "$stamp.png"))
$gfx.Dispose(); $bmp.Dispose()
