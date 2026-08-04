@echo off
title ClipForge AI
echo Starting ClipForge AI...
start "ClipForge API" cmd /c "cd /d %~dp0 && node --import tsx server/index.ts"
start "ClipForge Frontend" cmd /c "cd /d %~dp0 && npx vite --host"
timeout /t 2 >nul
echo.
echo  ================================
echo   ClipForge AI is running!
echo   Frontend: http://localhost:5173
echo   API:      http://localhost:3002
echo  ================================
echo.
pause
