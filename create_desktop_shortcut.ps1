$wscript = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath('Desktop')
$targetExe = "C:\Users\icell\AppData\Local\cloudmix_build\dist-electron\win-unpacked\CloudMix Pro.exe"

if (Test-Path $targetExe) {
    $shortcutPath = Join-Path $desktop "CloudMix Pro.lnk"
    $shortcut = $wscript.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $targetExe
    $shortcut.WorkingDirectory = Split-Path $targetExe
    $shortcut.Description = "CloudMix Pro Next-Gen DJ Application"
    $shortcut.Save()
    Write-Output "Successfully created Desktop shortcut: $shortcutPath"
} else {
    Write-Warning "Target executable not found"
}
