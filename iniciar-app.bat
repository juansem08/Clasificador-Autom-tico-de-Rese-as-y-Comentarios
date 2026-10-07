@echo off
title ReviewClassifier AI - Desktop Studio
echo ========================================================
echo   Iniciando ReviewClassifier AI Desktop Studio (Electron)
echo ========================================================
cd /d "%~dp0"
call npm run dev:electron
pause
