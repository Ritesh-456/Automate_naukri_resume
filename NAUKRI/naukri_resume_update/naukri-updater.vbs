Set objShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)

' Build the command to run the PowerShell script
' quotes around path are important for paths with spaces
strCmd = "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & strPath & "\start-background.ps1"""

' Run the command hidden (0) and do not wait for return (False)
objShell.Run strCmd, 0, False
