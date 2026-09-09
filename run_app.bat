@echo off
title CloudMix Pro — Next-Gen DJ Application
echo ===================================================
echo   CLOUDMIX PRO — Next-Gen Cloud DJ Application
echo ===================================================
echo.
echo Starting CloudMix Pro Web Server on http://localhost:3000 ...
echo Opening your default browser...
start http://localhost:3000
python -m http.server 3000 --directory "dist"
pause
