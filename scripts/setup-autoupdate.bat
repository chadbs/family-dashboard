@echo off
REM ===========================================================================
REM  ONE-TIME setup -- run this ON THE SURFACE (just double-click it).
REM  Creates the every-minute auto-update task with battery-friendly settings
REM  (so it actually fires on a laptop). It runs hidden -- no console flashing.
REM ===========================================================================
echo.
echo Setting up the auto-update task (battery-friendly, every minute)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-autoupdate.ps1"
if errorlevel 1 (
  echo.
  echo If that failed with a permissions error, right-click this file and
  echo choose "Run as administrator", then try again.
)
echo.
pause
