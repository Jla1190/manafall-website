@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0apply-manafall-patch.ps1" %*
if errorlevel 1 pause
