$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$env:PORT = '5000'
$env:HOST = '127.0.0.1'
$env:COZE_PROJECT_ENV = 'PROD'

node dist/server.js
