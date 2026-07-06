@echo off
REM ===========================================================================
REM  Pulls the latest dashboard code from GitHub every minute - kiosk style.
REM
REM  The wall must MIRROR origin/main, never merge with it. "git pull --rebase"
REM  can wedge forever if anything ever makes a local commit here (the voice
REM  agent can), so instead we: abort any stuck rebase/merge, fetch, and
REM  hard-reset tracked files to origin/main. This can never conflict and can
REM  never touch STATE: data/state.json, data/photos/, data/backups/, secrets
REM  are untracked/gitignored, and reset --hard only touches TRACKED files.
REM  (Never add "git clean" here - THAT would delete untracked files.)
REM
REM  GIT_TERMINAL_PROMPT=0 / GCM_INTERACTIVE=never make git fail fast if
REM  credentials expire instead of hanging a non-interactive task forever.
REM
REM  The page reloads itself via /api/version, and the watchdog restarts the
REM  server automatically when server-side code changes. Zero manual steps.
REM ===========================================================================

cd /d "%~dp0\.."
set GIT_TERMINAL_PROMPT=0
set GCM_INTERACTIVE=never

REM Recover from any stuck rebase/merge a previous run left behind.
git rebase --abort >nul 2>&1
git merge --abort  >nul 2>&1

git fetch origin >> scripts\update.log 2>&1

REM Only move when the remote actually changed (keeps file mtimes stable).
for /f %%i in ('git rev-parse HEAD') do set LOCAL=%%i
for /f %%i in ('git rev-parse origin/main') do set REMOTE=%%i
if not "%LOCAL%"=="%REMOTE%" (
  echo [%date% %time%] updating %LOCAL:~0,7% -^> %REMOTE:~0,7% >> scripts\update.log
  git reset --hard origin/main >> scripts\update.log 2>&1
)
