Set WshShell = CreateObject("WScript.Shell")
Do
    WshShell.Run "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File ""C:\Users\trama\.antigravity_ram_auto_cleaner.ps1""", 0, True
    WScript.Sleep 900000
Loop
