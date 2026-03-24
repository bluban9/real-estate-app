@echo off
cd /d C:\RealEstateApp
timeout /t 2 /nobreak >nul
start chrome --app=http://localhost:3001
npm run dev -- --port 3001
