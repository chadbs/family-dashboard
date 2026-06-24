@echo off
REM ===========================================================================
REM  ONE-TIME: creates the GitHub repo and pushes the dashboard.
REM  Just double-click this file (run it from inside the project folder).
REM
REM  Easiest path: install GitHub CLI first (https://cli.github.com), then this
REM  script creates the repo under your account and pushes in one go. If the CLI
REM  isn't installed, it prints the manual commands instead.
REM ===========================================================================

cd /d "%~dp0"
echo.
echo  Setting up Git in this folder...
git init
git add .
git commit -m "Initial family dashboard"
git branch -M main

where gh >nul 2>nul
if %errorlevel%==0 (
  echo.
  echo  Creating the GitHub repo and pushing...
  gh repo create chadbs/family-dashboard --private --source=. --remote=origin --push
  echo.
  echo  Done!  Repo: https://github.com/chadbs/family-dashboard
) else (
  echo.
  echo  GitHub CLI not found. Two choices:
  echo    1) Install it from https://cli.github.com  then run this script again, OR
  echo    2) Create an empty repo named "family-dashboard" at github.com/chadbs,
  echo       then run these two lines:
  echo.
  echo        git remote add origin https://github.com/chadbs/family-dashboard.git
  echo        git push -u origin main
)
echo.
pause
