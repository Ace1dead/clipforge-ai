@echo off
title ClipForge AI
start "" cmd /c "cd /d %~dp0 && node --import tsx server/index.ts"
start "" cmd /c "cd /d %~dp0 && npx vite --host"
timeout /t 3 >nul
start http://localhost:5173
