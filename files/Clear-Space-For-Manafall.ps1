#Requires -Version 5.1
<#
.SYNOPSIS
  Frees safe temporary space so Manafall can install to C:\Manafall\Game (~4 GB needed).
#>
param(
    [long]$NeedBytes = 4GB
)

$ErrorActionPreference = 'Continue'
$log = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Manafall-clear-space-log.txt'
'' | Set-Content -LiteralPath $log

function Log([string]$m) {
    $line = '[{0}] {1}' -f (Get-Date -Format 'HH:mm:ss'), $m
    Write-Host $line
    Add-Content -LiteralPath $log -Value $line
}

function Get-FreeBytes([string]$root) {
    try {
        return (New-Object IO.DriveInfo $root).AvailableFreeSpace
    } catch {
        return 0
    }
}

function Remove-TreeSafe([string]$path) {
    if (-not (Test-Path -LiteralPath $path)) { return 0L }
    $before = 0L
    try {
        $before = (Get-ChildItem -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue |
            Measure-Object -Property Length -Sum).Sum
        if ($null -eq $before) { $before = 0L }
    } catch { $before = 0L }
    try {
        Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue
    } catch {}
    return [long]$before
}

function Clear-Glob([string]$root, [string]$filter) {
    $freed = 0L
    if (-not (Test-Path -LiteralPath $root)) { return 0L }
    Get-ChildItem -LiteralPath $root -Filter $filter -Force -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            if ($_.PSIsContainer) {
                $freed += Remove-TreeSafe $_.FullName
            } else {
                $freed += [long]$_.Length
                Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
            }
        } catch {}
    }
    return $freed
}

try {
    Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue
} catch {}

$drive = 'C:\'
$before = Get-FreeBytes $drive
Log ('=== Clear space for Manafall ===')
Log ('Free on C: before = {0:N1} GB (need about {1:N1} GB)' -f ($before / 1GB), ($NeedBytes / 1GB))

$total = 0L

# Stop Manafall so files are not locked
Get-Process -Name 'Manafall' -ErrorAction SilentlyContinue | ForEach-Object {
    Log ('Stopping Manafall pid {0}' -f $_.Id)
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 1

# Installer / updater leftovers in TEMP
Log 'Cleaning Manafall temp folders...'
$total += Clear-Glob $env:TEMP 'ManafallInstall-*'
$total += Clear-Glob $env:TEMP 'ManafallPatch-*'
$total += Clear-Glob $env:TEMP 'ManafallUpdate_*'
$total += Clear-Glob $env:TEMP 'manafall-update-*.zip'
$total += Clear-Glob $env:TEMP 'manafall-patch-*.zip'
$total += Clear-Glob $env:TEMP 'Install-Manafall.ps1'
$total += Clear-Glob $env:TEMP 'part*'

# Windows TEMP (safe user temp only - not system WinSxS)
Log 'Cleaning user TEMP...'
$userTemp = $env:TEMP
if (Test-Path -LiteralPath $userTemp) {
    Get-ChildItem -LiteralPath $userTemp -Force -ErrorAction SilentlyContinue | ForEach-Object {
        $name = $_.Name
        # Skip very recent items (< 1 hour) to avoid killing active downloads
        if ($_.LastWriteTime -gt (Get-Date).AddHours(-1)) { return }
        try {
            if ($_.PSIsContainer) {
                $total += Remove-TreeSafe $_.FullName
            } else {
                $total += [long]$_.Length
                Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
            }
        } catch {}
    }
}

# Browser / delivery optimization caches that are safe-ish
Log 'Cleaning Windows Update Download cache (optional)...'
$wu = 'C:\Windows\SoftwareDistribution\Download'
if (Test-Path -LiteralPath $wu) {
    try {
        $total += Clear-Glob $wu '*'
    } catch {
        Log '  (skipped - needs admin)'
    }
}

# Empty Recycle Bin
Log 'Emptying Recycle Bin...'
try {
    Clear-RecycleBin -Force -ErrorAction SilentlyContinue
} catch {
    try {
        $shell = New-Object -ComObject Shell.Application
        $shell.NameSpace(0xA).Items() | ForEach-Object { Remove-Item $_.Path -Recurse -Force -ErrorAction SilentlyContinue }
    } catch {}
}

# Old Manafall patch staging under LocalLow
$ll = Join-Path $env:USERPROFILE 'AppData\LocalLow\Independent\Manafall\Patches'
if (Test-Path -LiteralPath $ll) {
    Log 'Cleaning LocalLow Manafall Patches staging...'
    $total += Remove-TreeSafe $ll
    New-Item -ItemType Directory -Force -Path $ll | Out-Null
}

$after = Get-FreeBytes $drive
$gained = $after - $before
Log ('Approx removed tracker = {0:N1} GB' -f ($total / 1GB))
Log ('Free on C: after  = {1:N1} GB (delta {0:+N1} GB)' -f ($gained / 1GB), ($after / 1GB))

$msg = if ($after -ge $NeedBytes) {
    "C: now has {0:N1} GB free. That should be enough.`nRun Install-Manafall.cmd next.`nLog: $log" -f ($after / 1GB)
} else {
    "C: still only has {0:N1} GB free (need about {1:N1} GB).`nDelete large files in Downloads/Videos, empty Recycle Bin, or install to another drive:`n  powershell -File Install-Manafall.ps1 -InstallDir D:\Manafall\Game`nLog: $log" -f ($after / 1GB), ($NeedBytes / 1GB)
}

Write-Host ''
Write-Host $msg
try {
    [System.Windows.Forms.MessageBox]::Show($msg, 'Manafall space') | Out-Null
} catch {}

if ($after -ge $NeedBytes) { exit 0 } else { exit 2 }
