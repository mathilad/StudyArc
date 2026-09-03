@echo off
setlocal
cd /d "%~dp0"

echo Installing project dependencies...
call npm install || goto :fail

echo Installing EAS CLI...
call npm install -g eas-cli || goto :fail

echo.
echo Sign in to Expo when prompted.
call eas login || goto :fail

echo.
echo Building installable Android APK in the Expo cloud...
call eas build --platform android --profile preview
exit /b 0

:fail
echo.
echo Build setup failed. Review the error above.
pause
exit /b 1
