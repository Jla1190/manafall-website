@echo off
setlocal EnableExtensions
title Manafall - clear space
echo.
echo Freeing safe temp space for Manafall install...
echo.

set "LOCAL_PS1=%~dp0Clear-Space-For-Manafall.ps1"
set "TEMP_PS1=%TEMP%\Clear-Space-For-Manafall.ps1"
set "PS1="

if exist "%LOCAL_PS1%" (
  set "PS1=%LOCAL_PS1%"
  goto :RUN
)

echo Downloading Clear-Space-For-Manafall.ps1 ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri 'https://jla1190.github.io/manafall-website/files/Clear-Space-For-Manafall.ps1' -OutFile (Join-Path $env:TEMP 'Clear-Space-For-Manafall.ps1')"
if errorlevel 1 (
  echo Download failed.
  pause
  exit /b 1
)
if not exist "%TEMP_PS1%" (
  echo Missing %TEMP_PS1%
  pause
  exit /b 1
)
set "PS1=%TEMP_PS1%"

:RUN
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" %*
set "ERR=%ERRORLEVEL%"
echo.
pause
exit /b %ERR%
