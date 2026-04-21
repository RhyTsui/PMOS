param(
  [string]$ProcessName = "DingTalk",
  [int]$MaxElements = 300
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle } |
  Sort-Object StartTime |
  Select-Object -Last 1

if (-not $process) {
  throw "No DingTalk main window."
}

$root = [System.Windows.Automation.AutomationElement]::FromHandle($process.MainWindowHandle)
$elements = $root.FindAll(
  [System.Windows.Automation.TreeScope]::Descendants,
  [System.Windows.Automation.Condition]::TrueCondition
)

function Convert-RectValue {
  param([double]$Value)

  if ([double]::IsNaN($Value) -or [double]::IsInfinity($Value)) {
    return 0
  }

  if ($Value -gt [int]::MaxValue) {
    return [int]::MaxValue
  }

  if ($Value -lt [int]::MinValue) {
    return [int]::MinValue
  }

  return [int][Math]::Round($Value)
}

$rows = @()
for ($i = 0; $i -lt [Math]::Min($elements.Count, $MaxElements); $i += 1) {
  $element = $elements.Item($i)
  $rect = $element.Current.BoundingRectangle
  $rows += [pscustomobject]@{
    Index = $i
    Name = [string]$element.Current.Name
    Type = [string]$element.Current.ControlType.ProgrammaticName
    Class = [string]$element.Current.ClassName
    X = Convert-RectValue -Value $rect.Left
    Y = Convert-RectValue -Value $rect.Top
    Width = Convert-RectValue -Value $rect.Width
    Height = Convert-RectValue -Value $rect.Height
  }
}

$rows | Format-Table -AutoSize
