@echo off
REM ===========================================================================
REM  Starts the dashboard on the Surface and opens it full-screen (kiosk).
REM  Put a shortcut to this file in the Startup folder so it runs on boot:
REM     Win+R  ->  shell:startup   ->  paste a shortcut to start.bat
REM ===========================================================================

cd /d "%~dp0\.."

REM 1) Start the local server in the background
start "dashboard-server" /min node server.js

REM 2) Start the weather bridge (reads your AcuRite sensor). Comment out until
REM    your RTL-SDR dongle + rtl_433 are installed (see README).
REM start "weather-bridge" /min node scripts\weather-bridge.js

REM Give the server a moment to come up
timeout /t 3 /nobreak >nul

REM 3) Open Microsoft Edge in full-screen kiosk mode pointed at the dashboard
start msedge --kiosk "http://localhost:8080" --edge-kiosk-type=fullscreen --no-first-run --disable-pinch --overscroll-history-navigation=0

exit
