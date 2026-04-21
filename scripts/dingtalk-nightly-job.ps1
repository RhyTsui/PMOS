param(
  [string]$RepoRoot = "",
  [string]$ExePath = "",
  [string]$ExportRoot = "",
  [switch]$SkipNormalize
)

$ErrorActionPreference = "Stop"

$resolvedRepoRoot =
  if ($RepoRoot) {
    $RepoRoot
  } else {
    Split-Path -Parent $PSScriptRoot
  }

$resolvedExePath =
  if ($ExePath) {
    $ExePath
  } elseif ($env:DINGTALK_EXE_PATH) {
    $env:DINGTALK_EXE_PATH
  } else {
    ""
  }

$resolvedExportRoot =
  if ($ExportRoot) {
    $ExportRoot
  } elseif ($env:DINGTALK_EXPORT_ROOT) {
    $env:DINGTALK_EXPORT_ROOT
  } else {
    ""
  }

$automationScript = Join-Path $resolvedRepoRoot "scripts\dingtalk-ui-automation.ps1"
if (-not (Test-Path $automationScript)) {
  throw "DingTalk automation script not found: $automationScript"
}

$logDir = Join-Path $resolvedRepoRoot "docs\memory\dingtalk"
if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logPath = Join-Path $logDir "nightly-job-$timestamp.log"

Push-Location $resolvedRepoRoot
try {
  "[$((Get-Date).ToString('o'))] DingTalk nightly job started." | Tee-Object -FilePath $logPath -Append | Out-Null

  & $automationScript -ExePath $resolvedExePath -ExportRoot $resolvedExportRoot 2>&1 |
    Tee-Object -FilePath $logPath -Append

  if (-not $SkipNormalize) {
    npm.cmd run cli -- documentation normalize 2>&1 |
      Tee-Object -FilePath $logPath -Append
  }

  "[$((Get-Date).ToString('o'))] DingTalk nightly job completed." | Tee-Object -FilePath $logPath -Append | Out-Null
} finally {
  Pop-Location
}
