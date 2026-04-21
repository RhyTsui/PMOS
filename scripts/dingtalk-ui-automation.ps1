param(
  [string]$ExePath = "",
  [string]$ProcessName = "DingTalk",
  [string]$FlowPath = "scripts/dingtalk-export-flow.example.json",
  [string]$ExportRoot = "",
  [int]$LaunchTimeoutSeconds = 30,
  [switch]$ResetBeforeRun,
  [switch]$Listen,
  [int]$PollSeconds = 300,
  [string]$StatePath = "docs/memory/dingtalk-listener-state.json",
  [switch]$KeepOpenOnFailure
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms

Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class Win32Native {
  [DllImport("user32.dll")]
  public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);

  [DllImport("user32.dll")]
  public static extern bool SetCursorPos(int x, int y);

  [DllImport("user32.dll")]
  public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);

  public const int SW_RESTORE = 9;
  public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
  public const uint MOUSEEVENTF_LEFTUP = 0x0004;
}

public struct RECT {
  public int Left;
  public int Top;
  public int Right;
  public int Bottom;
}
"@

function Resolve-DingTalkExePath {
  param([string]$PreferredPath)

  if ($PreferredPath -and (Test-Path $PreferredPath)) {
    return (Resolve-Path $PreferredPath).Path
  }

  $envPath = $env:DINGTALK_EXE_PATH
  if ($envPath -and (Test-Path $envPath)) {
    return (Resolve-Path $envPath).Path
  }

  $candidates = @(
    (Join-Path $env:LOCALAPPDATA "Programs\DingTalk\DingTalk.exe"),
    (Join-Path $env:ProgramFiles "DingTalk\DingTalk.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "DingTalk\DingTalk.exe")
  ) | Where-Object { $_ -and (Test-Path $_) }

  if ($candidates.Count -gt 0) {
    return (Resolve-Path $candidates[0]).Path
  }

  throw "Unable to locate DingTalk.exe. Pass -ExePath or set DINGTALK_EXE_PATH."
}

function Start-OrAttachDingTalk {
  param(
    [string]$ResolvedExePath,
    [string]$Name,
    [int]$TimeoutSeconds
  )

  $baseName = [System.IO.Path]::GetFileNameWithoutExtension($ResolvedExePath)
  $candidateNames = New-Object System.Collections.Generic.List[string]

  if ($Name -and $Name -ne "DingTalk") {
    $candidateNames.Add($Name)
  }

  if ($baseName) {
    $candidateNames.Add($baseName)
  }

  if ($baseName -match "launcher") {
    $candidateNames.Add("DingTalk")
  }

  if (-not $candidateNames.Contains("DingTalk")) {
    $candidateNames.Add("DingTalk")
  }

  $running = $null
  foreach ($candidateName in $candidateNames) {
    $running = Get-Process -Name $candidateName -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($running) {
      break
    }
  }

  if (-not $running) {
    Start-Process -FilePath $ResolvedExePath | Out-Null
  }

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    foreach ($candidateName in $candidateNames) {
      $process = Get-Process -Name $candidateName -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle } |
        Sort-Object StartTime |
        Select-Object -Last 1
      if ($process) {
        return $process
      }
    }
    Start-Sleep -Milliseconds 500
  }

  throw "Timed out waiting for DingTalk main window."
}

function Stop-DingTalkProcesses {
  param([string]$ResolvedExePath)

  $baseName = [System.IO.Path]::GetFileNameWithoutExtension($ResolvedExePath)
  $candidateNames = @($baseName, 'DingTalk', 'DingtalkLauncher') |
    Where-Object { $_ } |
    Select-Object -Unique

  foreach ($candidateName in $candidateNames) {
    $processes = Get-Process -Name $candidateName -ErrorAction SilentlyContinue
    foreach ($process in $processes) {
      try {
        if ($process.MainWindowHandle -ne 0) {
          [void]$process.CloseMainWindow()
        }
      } catch {
      }
    }
  }

  Start-Sleep -Seconds 2

  foreach ($candidateName in $candidateNames) {
    Get-Process -Name $candidateName -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  }

  Start-Sleep -Seconds 2
}

function Get-WindowElement {
  param([System.Diagnostics.Process]$Process)

  $deadline = (Get-Date).AddSeconds(10)
  while ((Get-Date) -lt $deadline) {
    $Process.Refresh()
    if ($Process.MainWindowHandle -ne 0) {
      try {
        return [System.Windows.Automation.AutomationElement]::FromHandle($Process.MainWindowHandle)
      } catch {
      }
    }
    Start-Sleep -Milliseconds 300
  }

  throw "Unable to attach UI automation to DingTalk main window."
}

function Activate-Window {
  param([System.Diagnostics.Process]$Process)
  [Win32Native]::ShowWindowAsync($Process.MainWindowHandle, [Win32Native]::SW_RESTORE) | Out-Null
  Start-Sleep -Milliseconds 150
  [Win32Native]::SetForegroundWindow($Process.MainWindowHandle) | Out-Null
  Start-Sleep -Milliseconds 150
}

function Get-WindowRect {
  param([System.Diagnostics.Process]$Process)
  $rect = New-Object RECT
  [Win32Native]::GetWindowRect($Process.MainWindowHandle, [ref]$rect) | Out-Null
  return $rect
}

function Invoke-LeftClick {
  param([int]$ScreenX, [int]$ScreenY)
  [Win32Native]::SetCursorPos($ScreenX, $ScreenY) | Out-Null
  Start-Sleep -Milliseconds 80
  [Win32Native]::mouse_event([Win32Native]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 60
  [Win32Native]::mouse_event([Win32Native]::MOUSEEVENTF_LEFTUP, 0, 0, 0, [UIntPtr]::Zero)
}

function Get-ControlTypeObject {
  param([string]$ControlType)

  switch ($ControlType.ToLowerInvariant()) {
    "button" { return [System.Windows.Automation.ControlType]::Button }
    "text" { return [System.Windows.Automation.ControlType]::Text }
    "listitem" { return [System.Windows.Automation.ControlType]::ListItem }
    "menuitem" { return [System.Windows.Automation.ControlType]::MenuItem }
    "window" { return [System.Windows.Automation.ControlType]::Window }
    "pane" { return [System.Windows.Automation.ControlType]::Pane }
    "document" { return [System.Windows.Automation.ControlType]::Document }
    "hyperlink" { return [System.Windows.Automation.ControlType]::Hyperlink }
    default { throw "Unsupported controlType: $ControlType" }
  }
}

function Get-ConditionList {
  param($Selector)

  $conditions = New-Object System.Collections.Generic.List[System.Windows.Automation.Condition]
  if ($Selector.name) {
    $conditions.Add((New-Object System.Windows.Automation.PropertyCondition(
      [System.Windows.Automation.AutomationElement]::NameProperty,
      [string]$Selector.name
    )))
  }
  if ($Selector.automationId) {
    $conditions.Add((New-Object System.Windows.Automation.PropertyCondition(
      [System.Windows.Automation.AutomationElement]::AutomationIdProperty,
      [string]$Selector.automationId
    )))
  }
  if ($Selector.className) {
    $conditions.Add((New-Object System.Windows.Automation.PropertyCondition(
      [System.Windows.Automation.AutomationElement]::ClassNameProperty,
      [string]$Selector.className
    )))
  }
  if ($Selector.controlType) {
    $conditions.Add((New-Object System.Windows.Automation.PropertyCondition(
      [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
      (Get-ControlTypeObject -ControlType ([string]$Selector.controlType))
    )))
  }

  return $conditions
}

function Test-SelectorPostFilters {
  param(
    [System.Windows.Automation.AutomationElement]$Element,
    $Selector
  )

  $name = [string]$Element.Current.Name

  if ($Selector.containsName -and -not $name.Contains([string]$Selector.containsName)) {
    return $false
  }

  if ($Selector.namePattern -and ($name -notmatch [string]$Selector.namePattern)) {
    return $false
  }

  return $true
}

function Find-UiElements {
  param(
    [System.Windows.Automation.AutomationElement]$Root,
    $Selector
  )

  if (-not $Selector) {
    throw "Selector is required."
  }

  $conditions = Get-ConditionList -Selector $Selector
  if ($conditions.Count -eq 0) {
    if (-not $Selector.containsName -and -not $Selector.namePattern) {
      throw "Selector must include name, containsName, namePattern, automationId, className, or controlType."
    }
  }

  $condition =
    if ($conditions.Count -eq 0) {
      [System.Windows.Automation.Condition]::TrueCondition
    } elseif ($conditions.Count -eq 1) {
      $conditions[0]
    } else {
      New-Object System.Windows.Automation.AndCondition($conditions.ToArray())
    }

  $elements = $Root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)
  $results = New-Object System.Collections.Generic.List[System.Windows.Automation.AutomationElement]
  for ($index = 0; $index -lt $elements.Count; $index += 1) {
    $candidate = $elements.Item($index)
    if (Test-SelectorPostFilters -Element $candidate -Selector $Selector) {
      $results.Add($candidate)
    }
  }
  return $results
}

function Resolve-UiElement {
  param(
    [System.Windows.Automation.AutomationElement]$Root,
    $Selector
  )

  $elements = Find-UiElements -Root $Root -Selector $Selector
  if ($elements.Count -eq 0) {
    return $null
  }

  $requestedIndex = 0
  if ($null -ne $Selector.index) {
    $requestedIndex = [int]$Selector.index
  }

  if ($requestedIndex -lt 0) {
    $requestedIndex = $elements.Count + $requestedIndex
  }

  if ($requestedIndex -lt 0 -or $requestedIndex -ge $elements.Count) {
    throw "Selector index $requestedIndex is out of range for $($elements.Count) matched elements."
  }

  return $elements[$requestedIndex]
}

function Wait-UiElement {
  param(
    [System.Windows.Automation.AutomationElement]$Root,
    $Selector,
    [int]$TimeoutSeconds = 10
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $element = Resolve-UiElement -Root $Root -Selector $Selector
    if ($element) {
      return $element
    }
    Start-Sleep -Milliseconds 300
  }

  throw "Timed out waiting for UI element."
}

function Invoke-ElementAction {
  param([System.Windows.Automation.AutomationElement]$Element)

  $invokePattern = $null
  if ($Element.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$invokePattern)) {
    $invokePattern.Invoke()
    return
  }

  $selectionItemPattern = $null
  if ($Element.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern, [ref]$selectionItemPattern)) {
    $selectionItemPattern.Select()
    return
  }

  $rect = $Element.Current.BoundingRectangle
  if ($rect.Width -le 0 -or $rect.Height -le 0) {
    throw "UI element has no clickable bounding rectangle."
  }

  $screenX = [int]($rect.Left + ($rect.Width / 2))
  $screenY = [int]($rect.Top + ($rect.Height / 2))
  Invoke-LeftClick -ScreenX $screenX -ScreenY $screenY
}

function Invoke-FlowStep {
  param(
    [System.Diagnostics.Process]$Process,
    [System.Windows.Automation.AutomationElement]$WindowElement,
    $Step,
    [int]$StepIndex = -1
  )

  $action = [string]$Step.action
  $selectorSummary =
    if ($Step.selector) {
      ($Step.selector | ConvertTo-Json -Compress)
    } else {
      ""
    }
  Write-Host ("Step {0}: {1} {2}" -f $StepIndex, $action, $selectorSummary) -ForegroundColor DarkCyan
  $timeoutSeconds =
    if ($null -ne $Step.timeoutSeconds) {
      [int]$Step.timeoutSeconds
    } else {
      10
    }
  $sleepMilliseconds =
    if ($null -ne $Step.milliseconds) {
      [int]$Step.milliseconds
    } else {
      500
    }
  switch ($action) {
    "wait-for-element" {
      [void](Wait-UiElement -Root $WindowElement -Selector $Step.selector -TimeoutSeconds $timeoutSeconds)
      return
    }
    "click-element" {
      Activate-Window -Process $Process
      $element = Wait-UiElement -Root $WindowElement -Selector $Step.selector -TimeoutSeconds $timeoutSeconds
      Invoke-ElementAction -Element $element
      return
    }
    "click-relative" {
      Activate-Window -Process $Process
      $rect = Get-WindowRect -Process $Process
      Invoke-LeftClick -ScreenX ($rect.Left + [int]$Step.x) -ScreenY ($rect.Top + [int]$Step.y)
      return
    }
    "send-keys" {
      Activate-Window -Process $Process
      [System.Windows.Forms.SendKeys]::SendWait([string]$Step.text)
      return
    }
    "close-window" {
      Activate-Window -Process $Process
      [System.Windows.Forms.SendKeys]::SendWait("%{F4}")
      return
    }
    "sleep" {
      Start-Sleep -Milliseconds $sleepMilliseconds
      return
    }
    default {
      throw "Unsupported action: $action"
    }
  }
}

function Show-ExportRootSummary {
  param([string]$ResolvedExportRoot)

  if (-not $ResolvedExportRoot -or -not (Test-Path $ResolvedExportRoot)) {
    return
  }

  $latest = Get-ChildItem -LiteralPath $ResolvedExportRoot -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 5 FullName, LastWriteTime, Length

  if ($latest) {
    Write-Host ""
    Write-Host "Latest files in export root:" -ForegroundColor Cyan
    $latest | Format-Table -AutoSize
  }
}

function Get-LatestFileFingerprint {
  param([string]$ResolvedExportRoot)

  if (-not $ResolvedExportRoot -or -not (Test-Path $ResolvedExportRoot)) {
    return $null
  }

  $latest = Get-ChildItem -LiteralPath $ResolvedExportRoot -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $latest) {
    return $null
  }

  return [pscustomobject]@{
    name = $latest.Name
    fullName = $latest.FullName
    lastWriteTimeUtc = $latest.LastWriteTimeUtc.ToString('o')
    length = [int64]$latest.Length
  }
}

function Test-FingerprintChanged {
  param(
    $Before,
    $After
  )

  if ($null -eq $Before -and $null -ne $After) {
    return $true
  }

  if ($null -eq $Before -or $null -eq $After) {
    return $false
  }

  return (
    $Before.name -ne $After.name -or
    $Before.lastWriteTimeUtc -ne $After.lastWriteTimeUtc -or
    $Before.length -ne $After.length
  )
}

function Resolve-StatePath {
  param([string]$PreferredPath)

  if ([System.IO.Path]::IsPathRooted($PreferredPath)) {
    return $PreferredPath
  }

  return Join-Path (Get-Location) $PreferredPath
}

function Read-ListenerState {
  param([string]$ResolvedStatePath)

  if (-not (Test-Path $ResolvedStatePath)) {
    return [pscustomobject]@{
      lastAttemptAt = $null
      lastSuccessAt = $null
      lastFailureAt = $null
      lastFailureMessage = $null
      lastExportFingerprint = $null
      runCount = 0
      successCount = 0
      failureCount = 0
    }
  }

  return Get-Content -LiteralPath $ResolvedStatePath -Raw | ConvertFrom-Json
}

function Write-ListenerState {
  param(
    [string]$ResolvedStatePath,
    $State
  )

  $parent = Split-Path -Parent $ResolvedStatePath
  if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }

  $State | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $ResolvedStatePath -Encoding UTF8
}

function Invoke-DingTalkFlow {
  param(
    [string]$ResolvedExePath,
    [string]$Name,
    [int]$TimeoutSeconds,
    [string]$ResolvedFlowPath,
    [string]$ResolvedExportRoot,
    [bool]$CloseOnFailure,
    [bool]$ResetBeforeRunFlow
  )

  if ($ResetBeforeRunFlow) {
    Stop-DingTalkProcesses -ResolvedExePath $ResolvedExePath
  }

  $before = Get-LatestFileFingerprint -ResolvedExportRoot $ResolvedExportRoot
  $flow = Get-Content -LiteralPath $ResolvedFlowPath -Raw | ConvertFrom-Json
  $process = Start-OrAttachDingTalk -ResolvedExePath $ResolvedExePath -Name $Name -TimeoutSeconds $TimeoutSeconds
  Activate-Window -Process $process
  $windowElement = Get-WindowElement -Process $process

  if (-not $windowElement) {
    throw "Unable to attach UI automation to DingTalk main window."
  }

  try {
    for ($stepIndex = 0; $stepIndex -lt $flow.steps.Count; $stepIndex += 1) {
      $step = $flow.steps[$stepIndex]
      Invoke-FlowStep -Process $process -WindowElement $windowElement -Step $step -StepIndex $stepIndex
    }
  } catch {
    if ($CloseOnFailure) {
      try {
        [System.Windows.Forms.SendKeys]::SendWait("%{F4}")
      } catch {
      }
    }
    throw
  }

  $after = Get-LatestFileFingerprint -ResolvedExportRoot $ResolvedExportRoot
  return [pscustomobject]@{
    before = $before
    after = $after
    exportedNewFile = Test-FingerprintChanged -Before $before -After $after
  }
}

$resolvedExePath = Resolve-DingTalkExePath -PreferredPath $ExePath
$resolvedExportRoot =
  if ($ExportRoot) {
    $ExportRoot
  } elseif ($env:DINGTALK_EXPORT_ROOT) {
    $env:DINGTALK_EXPORT_ROOT
  } else {
    ""
  }

if (-not (Test-Path $FlowPath)) {
  throw "Flow file not found: $FlowPath"
}

$resolvedStatePath = Resolve-StatePath -PreferredPath $StatePath

if ($Listen) {
  Write-Host ("DingTalk listener started. Poll interval: {0}s" -f $PollSeconds) -ForegroundColor Yellow
  Write-Host ("State path: {0}" -f $resolvedStatePath) -ForegroundColor Yellow
  Write-Host ("Export root: {0}" -f $resolvedExportRoot) -ForegroundColor Yellow

  while ($true) {
    $state = Read-ListenerState -ResolvedStatePath $resolvedStatePath
    $state.runCount = [int]$state.runCount + 1
    $state.lastAttemptAt = (Get-Date).ToString('o')

    try {
      $result = Invoke-DingTalkFlow `
        -ResolvedExePath $resolvedExePath `
        -Name $ProcessName `
        -TimeoutSeconds $LaunchTimeoutSeconds `
        -ResolvedFlowPath $FlowPath `
        -ResolvedExportRoot $resolvedExportRoot `
        -CloseOnFailure (-not $KeepOpenOnFailure.IsPresent) `
        -ResetBeforeRunFlow $ResetBeforeRun.IsPresent

      if ($result.exportedNewFile) {
        $state.successCount = [int]$state.successCount + 1
        $state.lastSuccessAt = (Get-Date).ToString('o')
        $state.lastFailureMessage = $null
        $state.lastExportFingerprint = $result.after
        Write-Host "Listener cycle exported a new file." -ForegroundColor Green
        Show-ExportRootSummary -ResolvedExportRoot $resolvedExportRoot
      } else {
        Write-Host "Listener cycle completed, but no new file was detected." -ForegroundColor DarkYellow
      }
    } catch {
      $state.failureCount = [int]$state.failureCount + 1
      $state.lastFailureAt = (Get-Date).ToString('o')
      $state.lastFailureMessage = $_.Exception.Message
      Write-Host ("Listener cycle failed: {0}" -f $_.Exception.Message) -ForegroundColor Red
    }

    Write-ListenerState -ResolvedStatePath $resolvedStatePath -State $state
    Start-Sleep -Seconds $PollSeconds
  }
}

$result = Invoke-DingTalkFlow `
  -ResolvedExePath $resolvedExePath `
  -Name $ProcessName `
  -TimeoutSeconds $LaunchTimeoutSeconds `
  -ResolvedFlowPath $FlowPath `
  -ResolvedExportRoot $resolvedExportRoot `
  -CloseOnFailure $true `
  -ResetBeforeRunFlow $ResetBeforeRun.IsPresent

Write-Host "DingTalk automation flow completed." -ForegroundColor Green
if ($result.exportedNewFile) {
  Write-Host "A new export file was detected." -ForegroundColor Green
} else {
  Write-Host "No new export file was detected." -ForegroundColor DarkYellow
}
Show-ExportRootSummary -ResolvedExportRoot $resolvedExportRoot
