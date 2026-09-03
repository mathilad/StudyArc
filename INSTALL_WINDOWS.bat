@echo off
setlocal
cd /d "%~dp0"
echo.
echo ==========================================
echo   Study Arc - Windows setup and launch
echo ==========================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 22 LTS, reopen Command Prompt, then run this file again.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js with npm enabled.
  pause
  exit /b 1
)
echo Node:
node -v
echo npm:
npm -v
echo.
echo Installing dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo Installation failed. If you use a proxy, verify npm proxy and https-proxy settings, then rerun this file.
  pause
  exit /b 1
)
echo.
echo Checking Expo package compatibility...
call npx expo install --check
if errorlevel 1 echo Expo reported a package recommendation. You can run: npx expo install --fix
echo.
echo Starting Study Arc...
call npx expo start -c
pause
