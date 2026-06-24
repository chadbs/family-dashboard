@echo off
REM ===========================================================================
REM  Pushes any changes in this folder up to GitHub.
REM  Schedule this on your PC (Task Scheduler, e.g. every 10 min) so the daily
REM  edits the assistant makes here get published — the Surface then auto-pulls
REM  them and the wall refreshes itself.
REM
REM  It only commits when something actually changed, so it's safe to run often.
REM ===========================================================================

cd /d "%~dp0"
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "auto: daily dashboard update %date% %time%"
  git push
) else (
  echo No changes to push.
)
