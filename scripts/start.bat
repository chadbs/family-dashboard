@echo off
REM ===========================================================================
REM  Starts the dashboard on the Surface and opens it full-screen (kiosk).
REM  Put a shortcut to this file in the Startup folder so it runs on boot:
REM     Win+R  ->  shell:startup   ->  paste a shortcut to start.bat
REM ===========================================================================

cd /d "%~dp0\.."

REM 1) Start the local server in the background
start "dashboard-server" /min node server.js

REM 2) Weather bridge — find your rtl_433.exe so it can read the AcuRite sensor.
REM    Best: move the rtl_433 folder to C:\rtl_433\ (so a Downloads cleanup
REM    can't break it). Add another line here if yours lives somewhere else.
if not defined RTL433 if exist "C:\rtl_433\rtl_433.exe" set "RTL433=C:\rtl_433\rtl_433.exe"
if not defined RTL433 if exist "%USERPROFILE%\Downloads\rtl_433-win-x64-25.12\rtl_433.exe" set "RTL433=%USERPROFILE%\Downloads\rtl_433-win-x64-25.12\rtl_433.exe"
start "weather-bridge" /min node scripts\weather-bridge.js

REM Give the server a moment to come up
timeout /t 3 /nobreak >nul

REM 3) Open the dashboard full-screen (kiosk). Prefer Chrome, then Edge.
set "BROWSER="
set "KARGS="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "BROWSER=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if defined BROWSER set "KARGS=--kiosk http://localhost:8080 --no-first-run --disable-pinch --overscroll-history-navigation=0"

if not defined BROWSER (
  if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
  if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
  if defined BROWSER set "KARGS=--kiosk http://localhost:8080 --edge-kiosk-type=fullscreen --no-first-run --disable-pinch --overscroll-history-navigation=0"
)

if defined BROWSER (
  start "" "%BROWSER%" %KARGS%
) else (
  echo No Chrome or Edge found; opening your default browser instead.
  start "" "http://localhost:8080"
)

exit
