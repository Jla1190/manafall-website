@echo off
setlocal
title Manafall install
echo.
echo Installing Manafall to C:\Manafall\Game ...
echo This creates Manafall.exe there and a Desktop starter.
echo Leave this window open until it says done.
echo.

set "SCRIPT=%~dp0Install-Manafall.ps1"
if not exist "%SCRIPT%" (
  echo Downloading Install-Manafall.ps1 ...
  set "SCRIPT=%TEMP%\Install-Manafall.ps1"
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Invoke-WebRequest -UseBasicParsing -Uri 'https://jla1190.github.io/manafall-website/files/Install-Manafall.ps1' -OutFile '%SCRIPT%'"
  if errorlevel 1 (
    echo Could not download Install-Manafall.ps1
    pause
    exit /b 1
  )
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %*
set "ERR=%ERRORLEVEL%"
if not "%ERR%"=="0" (
  echo.
  echo Install failed. See Desktop\Manafall-install-log.txt
  pause
  exit /b %ERR%
)
echo.
pause
exit /b 0
