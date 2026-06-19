param(
  [int]$Port = 8002
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$appDir = Join-Path $repoRoot "frontend\src"
$serverEntry = Join-Path $appDir "dist\server.js"
$outLog = Join-Path $repoRoot "serve-node-8002.out.log"
$errLog = Join-Path $repoRoot "serve-node-8002.err.log"

Write-Host "Starting XiaoQiao frontend on 0.0.0.0:$Port"

$listeners = netstat -ano | Select-String ":$Port\s" | Select-String "LISTENING"
foreach ($listener in $listeners) {
  $parts = ($listener.Line -split "\s+") | Where-Object { $_ }
  $pidText = $parts[-1]
  if ($pidText -match "^\d+$") {
    $pidValue = [int]$pidText
    Write-Host "Stopping existing listener PID $pidValue on port $Port"
    Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
  }
}

Set-Content -Path $outLog -Value "" -Encoding UTF8
Set-Content -Path $errLog -Value "" -Encoding UTF8

if (-not (Test-Path $serverEntry)) {
  Write-Host "dist/server.js not found. Building frontend first..."
  Push-Location $appDir
  try {
    npm.cmd run build
  } finally {
    Pop-Location
  }
}

$env:PORT = "$Port"
$env:HOST = "0.0.0.0"
$env:HOSTNAME = "0.0.0.0"
$env:NODE_ENV = "production"

$process = Start-Process -FilePath "node.exe" `
  -ArgumentList @("dist\server.js") `
  -WorkingDirectory $appDir `
  -RedirectStandardOutput $outLog `
  -RedirectStandardError $errLog `
  -WindowStyle Hidden `
  -PassThru

Write-Host "Started launcher PID $($process.Id). Waiting for HTTP health..."

$deadline = (Get-Date).AddSeconds(90)
$healthy = $false
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 2
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
      $healthy = $true
      break
    }
  } catch {
    $lastError = $_.Exception.Message
  }
}

if (-not $healthy) {
  Write-Host "Frontend did not become healthy within 90s."
  Write-Host "Last error: $lastError"
  Write-Host "--- stdout ---"
  Get-Content -Tail 80 $outLog
  Write-Host "--- stderr ---"
  Get-Content -Tail 80 $errLog
  exit 1
}

$runningProcess = Get-Process -Id $process.Id -ErrorAction SilentlyContinue
if (-not $runningProcess) {
  Write-Host "Frontend process exited after the health check."
  Write-Host "--- stdout ---"
  Get-Content -Tail 80 $outLog
  Write-Host "--- stderr ---"
  Get-Content -Tail 80 $errLog
  exit 1
}

$networkIp = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -like "10.*" -and $_.PrefixOrigin -ne "WellKnown" } |
  Select-Object -First 1 -ExpandProperty IPAddress)
if (-not $networkIp) {
  $networkIp = "10.236.14.27"
}

Write-Host "Frontend is ready:"
Write-Host "  Local:   http://127.0.0.1:$Port/"
Write-Host "  Network: http://$networkIp`:$Port/"
