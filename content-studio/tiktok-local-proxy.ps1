# Local helper so the Manafall Content Studio web page can talk to TikTok.
# Browser pages cannot call TikTok APIs directly (security). This tiny server
# forwards requests and allows your GitHub Pages site to use it.
#
# Run in PowerShell:
#   cd C:\Manafall\_manafall-website\content-studio
#   powershell -ExecutionPolicy Bypass -File .\tiktok-local-proxy.ps1
#
# Leave this window open. Then use Content Studio in Chrome/Edge.

$ErrorActionPreference = "Stop"
$port = 8787
$prefix = "http://127.0.0.1:$port/"

Write-Host "Manafall TikTok local helper"
Write-Host "Listening on $prefix"
Write-Host "Keep this window open. Press Ctrl+C to stop."
Write-Host ""

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try {
  $listener.Start()
} catch {
  Write-Host "Could not start on port $port. Close anything using that port and try again."
  Write-Host $_
  exit 1
}

function Send-Response($response, [int]$status, [string]$body, [string]$contentType = "application/json; charset=utf-8") {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
  $response.StatusCode = $status
  $response.Headers.Add("Access-Control-Allow-Origin", "*")
  $response.Headers.Add("Access-Control-Allow-Headers", "Authorization, Content-Type")
  $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
  $response.ContentType = $contentType
  $response.ContentLength64 = $bytes.Length
  $response.OutputStream.Write($bytes, 0, $bytes.Length)
  $response.OutputStream.Close()
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response

  try {
    if ($req.HttpMethod -eq "OPTIONS") {
      Send-Response $res 204 ""
      continue
    }

    if ($req.Url.AbsolutePath -eq "/health") {
      Send-Response $res 200 '{"ok":true}'
      continue
    }

    if ($req.Url.AbsolutePath -ne "/tiktok") {
      Send-Response $res 404 '{"error":"not_found"}'
      continue
    }

    $target = $req.QueryString["url"]
    if (-not $target -or ($target -notlike "https://open.tiktokapis.com/*" -and $target -notlike "https://open-upload.tiktokapis.com/*")) {
      Send-Response $res 400 '{"error":"bad_url"}'
      continue
    }

    $method = $req.HttpMethod
    $auth = $req.Headers["Authorization"]
    $contentType = $req.ContentType

    $ms = New-Object System.IO.MemoryStream
    $req.InputStream.CopyTo($ms)
    $bodyBytes = $ms.ToArray()

    $web = [System.Net.HttpWebRequest]::Create($target)
    $web.Method = $method
    $web.UserAgent = "ManafallTikTokLocalHelper/1.0"
    if ($auth) { $web.Headers["Authorization"] = $auth }
    if ($contentType) { $web.ContentType = $contentType }
    if ($req.Headers["Content-Range"]) { $web.Headers["Content-Range"] = $req.Headers["Content-Range"] }

    if ($method -ne "GET" -and $method -ne "HEAD") {
      $web.ContentLength = $bodyBytes.Length
      $stream = $web.GetRequestStream()
      $stream.Write($bodyBytes, 0, $bodyBytes.Length)
      $stream.Close()
    }

    try {
      $upstream = $web.GetResponse()
    } catch [System.Net.WebException] {
      $upstream = $_.Exception.Response
      if (-not $upstream) { throw }
    }

    $status = [int]$upstream.StatusCode
    $reader = New-Object System.IO.StreamReader($upstream.GetResponseStream())
    $text = $reader.ReadToEnd()
    $reader.Close()
    $upstream.Close()

    $outType = $upstream.ContentType
    if (-not $outType) { $outType = "application/json; charset=utf-8" }
    Send-Response $res $status $text $outType
    Write-Host ("{0} {1} -> {2}" -f $method, $target, $status)
  } catch {
    Write-Host $_
    try { Send-Response $res 500 ("{`"error`":`"" + $_.ToString().Replace('"','') + "`"}") } catch {}
  }
}
