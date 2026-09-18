@echo off
title CloudMix Pro — Next-Gen DJ Application
echo =========================================================
echo   Starting CloudMix Pro Native Desktop DJ Console...
echo =========================================================
echo.
set "APP_EXE=%LOCALAPPDATA%\cloudmix_build\dist-electron\win-unpacked\CloudMix Pro.exe"
if exist "%APP_EXE%" (
    start "" "%APP_EXE%"
    exit
) else (
    echo CloudMix Pro executable not found at %APP_EXE%
    pause
)
