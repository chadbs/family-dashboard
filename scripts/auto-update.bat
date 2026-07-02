@echo off
REM ===========================================================================
REM  Pulls the latest dashboard code from GitHub every minute (via Task Scheduler).
REM  GIT_TERMINAL_PROMPT=0 makes git fail fast if credentials expire instead of
REM  hanging waiting for a prompt that can never appear in a non-interactive task.
REM ===========================================================================

cd /d "%~dp0\.."
set GIT_TERMINAL_PROMPT=0
set GCM_INTERACTIVE=never
git pull --rebase --autostash >> scripts\update.log 2>&1
