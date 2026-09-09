@echo off
title CloudMix Pro — Live Dev Server
echo ===================================================
echo   CLOUDMIX PRO — Live Development Server
echo ===================================================
echo.
cd /d "C:\Users\icell\AppData\Local\cloudmix_build"
node "node_modules\vite\bin\vite.js" --config vite.config.ts
pause
