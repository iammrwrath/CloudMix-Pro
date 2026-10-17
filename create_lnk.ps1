$wscript = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath('Desktop')
$shortcut = $wscript.CreateShortcut((Join-Path $desktop 'CloudMix Pro.lnk'))
$shortcut.TargetPath = Join-Path $env:LOCALAPPDATA 'Programs\CloudMix Pro\CloudMix Pro.exe'
$shortcut.WorkingDirectory = Join-Path $env:LOCALAPPDATA 'Programs\CloudMix Pro'
$shortcut.Save()  
