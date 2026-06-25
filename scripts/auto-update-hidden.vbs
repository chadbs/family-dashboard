' ===========================================================================
'  auto-update-hidden.vbs
'  Launches auto-update.bat with NO visible window, so the wall display never
'  flashes a console while it pulls updates every minute. The scheduled task
'  (created by setup-autoupdate.bat) runs THIS file.
' ===========================================================================
Dim sh, here
Set sh = CreateObject("WScript.Shell")
here = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
sh.Run "cmd /c """ & here & "auto-update.bat""", 0, False
