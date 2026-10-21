@echo off
setlocal EnableExtensions
title Manafall install
echo.
echo Installing Manafall to C:\Manafall\Game ...
echo This creates Manafall.exe there and a Desktop starter.
echo Leave this window open until it says done.
echo.

set "LOCAL_PS1=%~dp0Install-Manafall.ps1"
set "TEMP_PS1=%TEMP%\Install-Manafall.ps1"
set "PS1="

if exist "%LOCAL_PS1%" (
  set "PS1=%LOCAL_PS1%"
  goto :RUN
)

echo Downloading Install-Manafall.ps1 ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri 'https://jla1190.github.io/manafall-website/files/Install-Manafall.ps1' -OutFile (Join-Path $env:TEMP 'Install-Manafall.ps1')"
if errorlevel 1 (
  echo Download failed.
  pause
  exit /b 1
)
if not exist "%TEMP_PS1%" (
  echo Download finished but %TEMP_PS1% is missing.
  pause
  exit /b 1
)
set "PS1=%TEMP_PS1%"

:RUN
echo Running "%PS1%" ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" %*
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
