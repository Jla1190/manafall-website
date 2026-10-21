#Requires -Version 5.1
<#
.SYNOPSIS
  Fresh install of Manafall into C:\Manafall\Game (creates Manafall.exe there).

.DESCRIPTION
  Downloads the live Windows build from the public patch-manifest (multipart zip),
  extracts into C:\Manafall\Game, writes install-root.txt, and puts a Desktop starter.
  Use this when C:\Manafall exists but has no exe, or for a clean first install.
#>
param(
    [string]$InstallDir = 'C:\Manafall\Game',
    [string]$ManifestUrl = 'https://jla1190.github.io/manafall-website/patch-manifest.json',
    [string]$SourceDir = ''
)

$ErrorActionPreference = 'Stop'
$script:LogPath = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Manafall-install-log.txt'
'' | Set-Content -LiteralPath $script:LogPath

function Log([string]$m) {
    $line = '[{0}] {1}' -f (Get-Date -Format 'HH:mm:ss'), $m
    Write-Host $line
    Add-Content -LiteralPath $script:LogPath -Value $line
}

function Show-Msg([string]$m) {
    try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue
        [System.Windows.Forms.MessageBox]::Show($m, 'Manafall') | Out-Null
    } catch {
        Write-Host $m
    }
}

function Test-GameDir([string]$dir) {
    if ([string]::IsNullOrWhiteSpace($dir) -or -not (Test-Path -LiteralPath $dir)) { return $false }
    $data = Join-Path $dir 'Manafall_Data'
    $exe = Join-Path $dir 'Manafall.exe'
    $cmd = Join-Path $dir 'Manafall.cmd'
    return (Test-Path -LiteralPath $data) -and ((Test-Path -LiteralPath $exe) -or (Test-Path -LiteralPath $cmd))
}

function Find-UnpackedSource {
    if ($SourceDir -and (Test-GameDir $SourceDir)) {
        return (Resolve-Path -LiteralPath $SourceDir).Path
    }

    $guesses = @(
        $PSScriptRoot,
        (Join-Path $PSScriptRoot 'Game'),
        (Join-Path $env:USERPROFILE 'Downloads\Manafall'),
        (Join-Path $env:USERPROFILE 'Downloads\Manafall\Game'),
        (Join-Path $env:USERPROFILE 'Desktop\Manafall'),
        (Join-Path $env:USERPROFILE 'Desktop\Manafall\Game'),
        'C:\Manafall\Game',
        'C:\Manafall'
    )
    foreach ($g in $guesses) {
        if (Test-GameDir $g) { return (Resolve-Path -LiteralPath $g).Path }
    }

    foreach ($root in @(
        (Join-Path $env:USERPROFILE 'Downloads'),
        (Join-Path $env:USERPROFILE 'Desktop')
    )) {
        if (-not (Test-Path -LiteralPath $root)) { continue }
        $hit = Get-ChildItem -LiteralPath $root -Filter 'Manafall.exe' -File -Recurse -Depth 4 -ErrorAction SilentlyContinue |
            Where-Object {
                $dir = $_.DirectoryName
                (Test-Path -LiteralPath (Join-Path $dir 'Manafall_Data')) -and
                ((Get-Item -LiteralPath $_.FullName).Length -ge 256KB)
            } |
            Select-Object -First 1
        if ($hit) { return $hit.DirectoryName }
    }
    return $null
}

function Find-GameRootInTree([string]$staging) {
    if (Test-GameDir $staging) { return $staging }
    $direct = Get-ChildItem -LiteralPath $staging -Directory -ErrorAction SilentlyContinue
    foreach ($d in $direct) {
        if (Test-GameDir $d.FullName) { return $d.FullName }
        $nested = Join-Path $d.FullName 'Game'
        if (Test-GameDir $nested) { return $nested }
    }
    $exe = Get-ChildItem -LiteralPath $staging -Filter 'Manafall.exe' -File -Recurse -Depth 3 -ErrorAction SilentlyContinue |
        Where-Object { Test-Path -LiteralPath (Join-Path $_.DirectoryName 'Manafall_Data') } |
        Select-Object -First 1
    if ($exe) { return $exe.DirectoryName }
    return $null
}

function Download-File([string]$url, [string]$dest) {
    Log "GET $url"
    $tmp = "$dest.partial"
    if (Test-Path -LiteralPath $dest) { Remove-Item -LiteralPath $dest -Force }
    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
    if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
        & curl.exe -L --retry 5 --retry-delay 2 --progress-bar -o $tmp $url
        if ($LASTEXITCODE -ne 0) { throw "curl exit $LASTEXITCODE for $url" }
    } else {
        Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing
    }
    if (-not (Test-Path -LiteralPath $tmp) -or (Get-Item -LiteralPath $tmp).Length -lt 64) {
        throw "Download empty: $url"
    }
    Move-Item -LiteralPath $tmp -Destination $dest -Force
    Log ('  bytes={0:N0}' -f (Get-Item -LiteralPath $dest).Length)
}

function Join-Parts([string[]]$parts, [string]$zipPath) {
    Log 'Joining download parts into one zip...'
    $out = [IO.File]::Create($zipPath)
    try {
        foreach ($p in $parts) {
            $bytes = [IO.File]::ReadAllBytes($p)
            $out.Write($bytes, 0, $bytes.Length)
            Log ('  appended {0} ({1:N0} bytes)' -f (Split-Path $p -Leaf), $bytes.Length)
        }
    } finally {
        $out.Dispose()
    }
}

function Install-FromFolder([string]$source, [string]$dest) {
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    Log "Copy $source -> $dest"
    & robocopy $source $dest /E /R:2 /W:2 /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -gt 7) {
        throw "Could not copy game files (robocopy $LASTEXITCODE). Close anything using $dest and retry."
    }
}

function Write-InstallRoot([string]$gameDir) {
    $appData = Join-Path $env:LOCALAPPDATA 'Independent\Manafall'
    New-Item -ItemType Directory -Force -Path $appData | Out-Null
    Set-Content -LiteralPath (Join-Path $appData 'install-root.txt') -Value $gameDir -Encoding utf8
}

function Install-DesktopStarter([string]$gameDir) {
    $desktop = [Environment]::GetFolderPath('Desktop')
    if ([string]::IsNullOrWhiteSpace($desktop)) {
        $desktop = Join-Path $env:USERPROFILE 'Desktop'
    }
    $stub = Join-Path $gameDir 'Put On Desktop\Manafall.exe'
    $desktopExe = Join-Path $desktop 'Manafall.exe'
    if (Test-Path -LiteralPath $stub) {
        Copy-Item -LiteralPath $stub -Destination $desktopExe -Force
        Set-Content -LiteralPath (Join-Path $desktop 'Manafall.dir.txt') -Value $gameDir -Encoding utf8
        Log "Desktop starter: $desktopExe"
        return
    }

    $lnk = Join-Path $desktop 'Manafall.lnk'
    $shell = New-Object -ComObject WScript.Shell
    $sc = $shell.CreateShortcut($lnk)
    $cmd = Join-Path $gameDir 'Manafall.cmd'
    $exe = Join-Path $gameDir 'Manafall.exe'
    $sc.TargetPath = if (Test-Path -LiteralPath $cmd) { $cmd } else { $exe }
    $sc.WorkingDirectory = $gameDir
    $sc.Description = 'Manafall'
    $sc.IconLocation = "$exe,0"
    $sc.Save()
    Log "Desktop shortcut: $lnk"
}

try {
    Log '=== Manafall install start ==='
    Log ("InstallDir={0}" -f $InstallDir)

    Get-Process -Name 'Manafall' -ErrorAction SilentlyContinue | ForEach-Object {
        Log ("Stopping Manafall pid {0}" -f $_.Id)
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1

    $dest = $InstallDir
    if ([string]::IsNullOrWhiteSpace($dest)) { $dest = 'C:\Manafall\Game' }
    $dest = [IO.Path]::GetFullPath($dest)

    $drive = [IO.Path]::GetPathRoot($dest)
    $free = (New-Object IO.DriveInfo $drive).AvailableFreeSpace
    Log ('Free on {0} = {1:N1} GB' -f $drive, ($free / 1GB))
    if ($free -lt 4GB) {
        throw "Need about 4 GB free on $drive. Free space, then run again."
    }

    $source = Find-UnpackedSource
    $version = 'local'
    if ($source -and ($source -ine $dest)) {
        Log "Found unpacked game at $source — installing that (no download)."
        Install-FromFolder $source $dest
        $version = 'local-copy'
    } else {
        Log "Fetching live patch list: $ManifestUrl"
        $manifest = Invoke-RestMethod -Uri ($ManifestUrl + '?t=' + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds())
        $version = [string]$manifest.version
        $url1 = [string]$manifest.url
        $url2 = [string]$manifest.url2
        $url3 = [string]$manifest.url3
        $sha = ([string]$manifest.sha256).ToLowerInvariant()
        if ([string]::IsNullOrWhiteSpace($version) -or [string]::IsNullOrWhiteSpace($url1)) {
            throw 'Patch list did not include version + url.'
        }
        Log "Live version $version"

        $work = Join-Path $env:TEMP ("ManafallInstall-" + $version)
        if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force }
        New-Item -ItemType Directory -Force -Path $work | Out-Null

        $parts = New-Object System.Collections.Generic.List[string]
        $partUrls = @($url1, $url2, $url3) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
        $i = 1
        foreach ($u in $partUrls) {
            $partPath = Join-Path $work ("part{0:D3}" -f $i)
            Download-File $u $partPath
            $parts.Add($partPath) | Out-Null
            $i++
        }

        $zip = Join-Path $work 'manafall.zip'
        if ($parts.Count -eq 1 -and $url1 -match '\.zip($|\?)') {
            Move-Item -LiteralPath $parts[0] -Destination $zip -Force
        } else {
            Join-Parts $parts.ToArray() $zip
        }

        if (-not [string]::IsNullOrWhiteSpace($sha)) {
            $got = (Get-FileHash -Algorithm SHA256 -Path $zip).Hash.ToLowerInvariant()
            if ($got -ne $sha) { throw "Zip hash mismatch. expected $sha got $got" }
            Log 'hash ok'
        }

        $staging = Join-Path $work 'extract'
        New-Item -ItemType Directory -Force -Path $staging | Out-Null
        Log 'Expanding zip...'
        Expand-Archive -LiteralPath $zip -DestinationPath $staging -Force
        $root = Find-GameRootInTree $staging
        if (-not $root) {
            throw 'Downloaded zip did not contain Manafall.exe next to Manafall_Data.'
        }
        Log "Extracted game root: $root"
        Install-FromFolder $root $dest
        Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue
    }

    $exe = Join-Path $dest 'Manafall.exe'
    $data = Join-Path $dest 'Manafall_Data'
    if (-not (Test-Path -LiteralPath $exe)) {
        throw "Install finished but $exe is missing."
    }
    if (-not (Test-Path -LiteralPath $data)) {
        throw "Install finished but $data is missing."
    }

    $markerDir = Join-Path $dest 'Manafall_Data\StreamingAssets'
    New-Item -ItemType Directory -Force -Path $markerDir | Out-Null
    Set-Content -LiteralPath (Join-Path $markerDir 'applied-patch-version.txt') -Value $version -Encoding utf8

    Write-InstallRoot $dest
    Install-DesktopStarter $dest

    Log "OK: $exe"
    Show-Msg ("Manafall is installed at:`n$dest`n`nDouble-click Desktop\Manafall.exe (or $exe) to play.`nLog: $script:LogPath")
    Write-Host ''
    Write-Host "Manafall installed: $exe"
    Write-Host 'Start from Desktop\Manafall.exe or that path.'
    exit 0
} catch {
    Log ('ERROR: ' + $_.Exception.Message)
    Show-Msg ("Manafall install failed:`n" + $_.Exception.Message + "`n`nSee Desktop\Manafall-install-log.txt")
    exit 1
}
