@echo off
title Invoice & Packing List Record
echo ========================================================
echo   INVOICE & PACKING LIST RECORD - LAN WEB APP
echo ========================================================
echo.
echo Menjalankan server aplikasi...
cd /d "%~dp0"
start "" http://localhost:3001
node server/index.js
pause
