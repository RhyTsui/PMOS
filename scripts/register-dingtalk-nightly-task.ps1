param(
  [string]$TaskName = "PMAIOS DingTalk Midnight Sync",
  [string]$StartTime = "00:00",
  [string]$RepoRoot = "",
  [string]$ExePath = "",
  [string]$ExportRoot = "",
  [switch]$Force
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

$jobScript = Join-Path $resolvedRepoRoot "scripts\dingtalk-nightly-job.ps1"
if (-not (Test-Path $jobScript)) {
  throw "Nightly job script not found: $jobScript"
}

$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask -and -not $Force) {
  throw "Scheduled task already exists: $TaskName. Re-run with -Force to replace it."
}

if ($existingTask) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$argumentParts = @(
  '-NoProfile',
  '-ExecutionPolicy', 'Bypass',
  '-File', ('"{0}"' -f $jobScript),
  '-RepoRoot', ('"{0}"' -f $resolvedRepoRoot)
)

if ($resolvedExePath) {
  $argumentParts += @('-ExePath', ('"{0}"' -f $resolvedExePath))
}

if ($resolvedExportRoot) {
  $argumentParts += @('-ExportRoot', ('"{0}"' -f $resolvedExportRoot))
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ($argumentParts -join ' ')
$trigger = New-ScheduledTaskTrigger -Daily -At $StartTime
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -StartWhenAvailable

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description 'Runs DingTalk export automation and PMAIOS documentation normalization every night.' `
  | Out-Null

Write-Host ("Registered scheduled task '{0}' at {1}." -f $TaskName, $StartTime) -ForegroundColor Green
