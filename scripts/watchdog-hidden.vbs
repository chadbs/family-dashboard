' ===========================================================================
'  watchdog-hidden.vbs
'  Runs ensure-running.ps1 with NO visible window, so the wall never flashes a
'  console while the watchdog checks things every couple minutes. The
'  FamilyDashboard-Watchdog scheduled task (created by setup-watchdog.ps1)
'  runs THIS file.
' ===========================================================================
Dim sh, here
Set sh = CreateObject("WScript.Shell")
here = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
sh.Run "powershell -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & here & "ensure-running.ps1""", 0, False
