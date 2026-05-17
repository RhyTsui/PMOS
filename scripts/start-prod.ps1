$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$env:PORT = '8002'
$env:HOST = '0.0.0.0'
$env:COZE_PROJECT_ENV = 'PROD'

node dist/server.js
