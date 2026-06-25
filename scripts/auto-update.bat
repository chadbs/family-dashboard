@echo off
REM ===========================================================================
REM  Pulls the latest dashboard code from GitHub.
REM  Schedule this to run every 1-2 minutes with Windows Task Scheduler so the
REM  screen always reflects what you've pushed from your PC. The dashboard
REM  detects the new version and refreshes itself automatically.
REM
REM  Your chore checkmarks live in data\state.json (NOT in git), so this pull
REM  can never wipe them.
REM ===========================================================================

cd /d "%~dp0\.."
echo [%date% %time%] checking for updates>> scripts\update.log
git pull --rebase --autostash>> scripts\update.log 2>&1
