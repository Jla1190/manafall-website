param(
    [string]$GameDir
)

$ErrorActionPreference = "Stop"
$manifestUrl = "https://jla1190.github.io/manafall-website/patch-manifest.json"

function Find-GameDir {
    if ($GameDir -and (Test-Path (Join-Path $GameDir "Manafall.exe"))) {
        return (Resolve-Path $GameDir).Path
    }
    if (Test-Path (Join-Path $PSScriptRoot "Manafall.exe")) {
        return $PSScriptRoot
    }
    $guesses = @(
        "C:\Manafall\Game",
        (Join-Path $env:USERPROFILE "Desktop\Manafall"),
        (Join-Path $env:USERPROFILE "Downloads\Manafall")
    )
    foreach ($g in $guesses) {
        if (Test-Path (Join-Path $g "Manafall.exe")) { return $g }
    }
    $pendingRoot = Join-Path $env:USERPROFILE "AppData\LocalLow\Independent\Manafall\Patches"
    $found = Get-ChildItem -Path (Join-Path $env:USERPROFILE "Downloads"), (Join-Path $env:USERPROFILE "Desktop") -Filter "Manafall.exe" -Recurse -Depth 3 -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($found) { return $found.DirectoryName }
    return $null
}

Write-Host "Manafall patch apply"
Write-Host "Close Manafall and leave this window open. Do not click the exe until it says Done."
function Wait-ManafallClosed([int]$timeoutSec) {
    $deadline = [datetime]::UtcNow.AddSeconds($timeoutSec)
    do {
        $left = @(Get-Process -Name "Manafall" -ErrorAction SilentlyContinue)
        if ($left.Count -eq 0) { return $true }
        Write-Host ("Waiting for Manafall to close (pid " + (($left | ForEach-Object { $_.Id }) -join ",") + ")")
        Start-Sleep -Seconds 2
    } while ([datetime]::UtcNow -lt $deadline)
    return $false
}
if (-not (Wait-ManafallClosed 180)) {
    throw "Manafall is still open. Close it, then run this script again. Do not start the game while PowerShell is copying."
}
Start-Sleep -Seconds 2

$game = Find-GameDir
if (-not $game) {
    Write-Host "Could not find Manafall.exe. Run this from the folder that contains Manafall.exe, or:"
    Write-Host "  powershell -File apply-manafall-patch.ps1 -GameDir 'D:\path\to\game'"
    Start-Sleep -Seconds 20
    exit 1
}

Write-Host "Game folder: $game"
$manifest = Invoke-RestMethod -UseBasicParsing -Uri $manifestUrl
if (-not $manifest.url) { throw "Patch list has no zip url." }
$zipPath = Join-Path $env:TEMP ("manafall-patch-" + $manifest.version + ".zip")
Write-Host ("Downloading " + $manifest.version + "...")
Invoke-WebRequest -UseBasicParsing -Uri $manifest.url -OutFile $zipPath
if ($manifest.sha256) {
    $sha = (Get-FileHash -Algorithm SHA256 -Path $zipPath).Hash.ToLowerInvariant()
    if ($sha -ne $manifest.sha256.ToLowerInvariant()) {
        throw "Hash mismatch. Got $sha"
    }
}

$staging = Join-Path $env:TEMP ("ManafallPatch_" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $staging | Out-Null
Expand-Archive -LiteralPath $zipPath -DestinationPath $staging -Force
$root = $staging
$inner = Get-ChildItem -LiteralPath $staging -Directory | Select-Object -First 1
if ($inner -and (Test-Path (Join-Path $inner.FullName "Manafall.exe"))) { $root = $inner.FullName }
Write-Host "Copying files..."
$copied = $false
for ($i = 1; $i -le 20; $i++) {
    try {
        Copy-Item -Path (Join-Path $root "*") -Destination $game -Recurse -Force
        $copied = $true
        break
    } catch {
        Write-Host ("Copy try $i failed: " + $_.Exception.Message)
        Start-Sleep -Seconds 2
    }
}
if (-not $copied) { throw "Could not copy files. Close Manafall and try again." }
$markerDir = Join-Path $game "Manafall_Data\StreamingAssets"
New-Item -ItemType Directory -Force -Path $markerDir | Out-Null
Set-Content -LiteralPath (Join-Path $markerDir "applied-patch-version.txt") -Value $manifest.version -Encoding UTF8
Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
$exe = Join-Path $game "Manafall.exe"
Write-Host "Starting Manafall..."
Start-Process -FilePath $exe
Start-Sleep -Seconds 6
$alive = @(Get-Process -Name "Manafall" -ErrorAction SilentlyContinue)
if ($alive.Count -eq 0) {
    Write-Host "Manafall closed right after launch. Do not keep reopening it — tell us so we can fix the patch."
    Start-Sleep -Seconds 30
    exit 1
}
Write-Host "Done. You can close this window."
Start-Sleep -Seconds 8
