# TikTok: turn Login Kit "code" into an access token (run on your PC only)
#
# 1. Copy your Sandbox Client key and Client secret from TikTok Developer Portal.
# 2. On Content Studio, click Connect with TikTok again if your old code is stale.
# 3. Copy ONLY the code value (starts after code= ... no spaces).
# 4. In PowerShell, from this folder:

#    $env:TT_CLIENT_KEY = "paste-client-key"
#    $env:TT_CLIENT_SECRET = "paste-client-secret"
#    $env:TT_CODE = "paste-the-code"
#    .\exchange-tiktok-code.ps1

$ErrorActionPreference = "Stop"

$clientKey = $env:TT_CLIENT_KEY
$clientSecret = $env:TT_CLIENT_SECRET
$code = $env:TT_CODE
$redirectUri = "https://jla1190.github.io/manafall-website/content-studio/callback.html"

if (-not $clientKey -or -not $clientSecret -or -not $code) {
  Write-Host "Set TT_CLIENT_KEY, TT_CLIENT_SECRET, and TT_CODE first. See comments at top of this script."
  exit 1
}

$body = @{
  client_key      = $clientKey
  client_secret   = $clientSecret
  code            = $code
  grant_type      = "authorization_code"
  redirect_uri    = $redirectUri
}

Write-Host "Exchanging code for access token..."
$res = Invoke-RestMethod -Method Post -Uri "https://open.tiktokapis.com/v2/oauth/token/" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $body

$res | ConvertTo-Json -Depth 6

if ($res.access_token) {
  Write-Host ""
  Write-Host "SUCCESS — copy this access_token into Content Studio section 3:"
  Write-Host $res.access_token
} else {
  Write-Host ""
  Write-Host "No access_token in response. Click Connect with TikTok again for a fresh code, then retry."
}
