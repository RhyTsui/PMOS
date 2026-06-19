param(
  [int]$Port = 8002,
  [string]$HostName = "0.0.0.0"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$AppRoot = Join-Path $RepoRoot "frontend\src"

function Wait-HttpOk {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    try {
      $response = Invoke-WebRequest -Uri $Url -Method Head -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        return $true
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  } while ((Get-Date) -lt $deadline)

  return $false
}

Set-Location $AppRoot

$localUrl = "http://127.0.0.1:$Port/"
if (Wait-HttpOk -Url $localUrl -TimeoutSeconds 3) {
  Write-Host "AD web service is already ready: $localUrl"
  exit 0
}

npm.cmd run build

$launchCommand = "set NODE_ENV=production&& set HOST=$HostName&& set PORT=$Port&& cd /d `"$AppRoot`"&& node dist\server.js"

$process = Start-Process `
  -FilePath "cmd.exe" `
  -ArgumentList "/k `"$launchCommand`"" `
  -WindowStyle Hidden `
  -PassThru

if (-not (Wait-HttpOk -Url $localUrl -TimeoutSeconds 90)) {
  throw "AD web service did not become ready at $localUrl."
}

$lanAddress = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254.*" -and
    $_.PrefixOrigin -ne "WellKnown"
  } |
  Select-Object -First 1 -ExpandProperty IPAddress

if ($lanAddress) {
  $lanUrl = "http://$lanAddress`:$Port/"
  [void](Wait-HttpOk -Url $lanUrl -TimeoutSeconds 30)
  Write-Host "AD web service is ready: $lanUrl"
} else {
  Write-Host "AD web service is ready: $localUrl"
}

Write-Host "Launcher process id: $($process.Id)"
