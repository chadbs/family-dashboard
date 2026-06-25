@echo off
REM ===========================================================================
REM  ONE-TIME setup -- run this ON THE SURFACE (just double-click it).
REM  Creates a Task Scheduler job that pulls the latest dashboard from GitHub
REM  every minute (hidden, no console flashing), so the wall updates itself.
REM  The dashboard then detects the new version and reloads on its own.
REM ===========================================================================
setlocal
set "VBS=%~dp0auto-update-hidden.vbs"

echo.
echo Creating the auto-update task (runs every minute, hidden)...
schtasks /create /tn "FamilyDashboard-AutoUpdate" /tr "wscript.exe \"%VBS%\"" /sc minute /mo 1 /f
if errorlevel 1 goto failed

echo.
echo Testing it once now (pulling the latest)...
schtasks /run /tn "FamilyDashboard-AutoUpdate"

echo.
echo ==========================================================================
echo  SUCCESS - the wall will now pull updates every minute and refresh itself.
echo  You can see it in Task Scheduler as "FamilyDashboard-AutoUpdate".
echo ==========================================================================
echo.
pause
exit /b 0

:failed
echo.
echo  Could not create the task. Right-click this file and choose
echo  "Run as administrator", then try again.
echo.
pause
exit /b 1
