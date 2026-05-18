$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

function New-Brush([string]$hex) {
  return New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($hex))
}

function New-Pen([string]$hex, [float]$width = 1) {
  return New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($hex)), $width
}

function New-FontObj([string]$family, [float]$size, [System.Drawing.FontStyle]$style = [System.Drawing.FontStyle]::Regular) {
  if ($size -le 0) {
    $size = 14
  }
  return New-Object System.Drawing.Font($family, $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
}

function Draw-FillRect($g, [string]$hex, [int]$x, [int]$y, [int]$w, [int]$h) {
  $brush = New-Brush $hex
  $g.FillRectangle($brush, $x, $y, $w, $h)
  $brush.Dispose()
}

function Draw-Text($g, [string]$text, [string]$hex, [int]$x, [int]$y, [float]$size, [System.Drawing.FontStyle]$style = [System.Drawing.FontStyle]::Regular) {
  $brush = New-Brush $hex
  $font = New-FontObj 'Microsoft YaHei UI' $size $style
  $g.DrawString($text, $font, $brush, [float]$x, [float]$y)
  $font.Dispose()
  $brush.Dispose()
}

function Draw-Badge($g, [string]$text, [int]$x, [int]$y, [string]$fill, [string]$textColor) {
  $font = New-FontObj 'Microsoft YaHei UI' 16 ([System.Drawing.FontStyle]::Bold)
  $size = $g.MeasureString($text, $font)
  $w = [math]::Ceiling($size.Width) + 28
  $h = 34
  $brush = New-Brush $fill
  $pen = New-Pen '#E2E8F0' 1
  $g.FillRectangle($brush, $x, $y, $w, $h)
  $g.DrawRectangle($pen, $x, $y, $w, $h)
  Draw-Text $g $text $textColor ($x + 14) ($y + 7) 16 ([System.Drawing.FontStyle]::Bold)
  $font.Dispose()
  $brush.Dispose()
  $pen.Dispose()
}

function Draw-DatakiWordmark($g, [int]$x, [int]$y, [int]$w, [int]$h) {
  Draw-FillRect $g '#FFFFFF' $x $y $w $h
  $iconRect = New-Object System.Drawing.Rectangle ($x + 8), ($y + 8), 34, 34
  $lg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $iconRect, ([System.Drawing.ColorTranslator]::FromHtml('#2563EB')), ([System.Drawing.ColorTranslator]::FromHtml('#7C3AED')), 45
  $g.FillRectangle($lg, $iconRect)
  $lg.Dispose()
  Draw-Text $g 'D' '#FFFFFF' ($x + 16) ($y + 8) 24 ([System.Drawing.FontStyle]::Bold)
  Draw-Text $g 'Dataki' '#0B132B' ($x + 52) ($y + 6) 28 ([System.Drawing.FontStyle]::Bold)
}

function Save-Image($img, [string]$path) {
  $dir = Split-Path -Parent $path
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $img.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Use-Graphics([string]$inputPath, [string]$drawerName, [string]$outputPath) {
  $img = [System.Drawing.Image]::FromFile($inputPath)
  $bmp = New-Object System.Drawing.Bitmap $img.Width, $img.Height
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($img, 0, 0, $img.Width, $img.Height)
  & $drawerName $g $img.Width $img.Height
  Save-Image $bmp $outputPath
  $g.Dispose()
  $bmp.Dispose()
  $img.Dispose()
}

$root = Split-Path -Parent $PSScriptRoot
$input = Join-Path $root 'docs\tmp\v1.1-doc-media'
$output = Join-Path $root 'docs\design-review\v1.1-final'
New-Item -ItemType Directory -Force -Path $output | Out-Null

function Draw-KbHome($g, $w, $h) {
  Draw-DatakiWordmark $g 12 8 220 58
  Draw-Badge $g 'Brand swap only' 1220 22 '#EEF2FF' '#4338CA'
}
Use-Graphics (Join-Path $input 'image3.png') 'Draw-KbHome' (Join-Path $output 'design-kb-home.png')

function Draw-KbSettings($g, $w, $h) {
  Draw-FillRect $g '#FFFFFF' 226 94 182 402
  Draw-FillRect $g '#ECFDF5' 236 180 172 38
  Draw-Text $g 'Basic Info' '#10B981' 258 188 18 ([System.Drawing.FontStyle]::Bold)
  Draw-Text $g 'Share' '#374151' 258 454 18
  Draw-Badge $g 'User: Basic + Share only' 930 118 '#EEF2FF' '#4338CA'
}
Use-Graphics (Join-Path $input 'image2.png') 'Draw-KbSettings' (Join-Path $output 'design-kb-settings.png')

function Draw-Space($g, $w, $h) {
  Draw-FillRect $g '#FFFFFF' 0 0 250 92
  Draw-DatakiWordmark $g 18 14 210 52
  Draw-Badge $g 'Joined / created spaces only' 820 28 '#EEF2FF' '#4338CA'
}
Use-Graphics (Join-Path $input 'image4.png') 'Draw-Space' (Join-Path $output 'design-space-list.png')

function Draw-ChatAgent($g, $w, $h) {
  Draw-FillRect $g '#FFFFFF' 0 0 250 92
  Draw-DatakiWordmark $g 18 14 210 52
  Draw-FillRect $g '#FFFFFF' 665 530 70 26
  Draw-Text $g 'Select' '#10B981' 674 533 16 ([System.Drawing.FontStyle]::Bold)
  Draw-Badge $g 'Select agent only' 1080 436 '#EEF2FF' '#4338CA'
}
Use-Graphics (Join-Path $input 'image5.png') 'Draw-ChatAgent' (Join-Path $output 'design-chat-agent-select.png')

function Draw-ChatModel($g, $w, $h) {
  Draw-FillRect $g '#FFFFFF' 0 0 250 92
  Draw-DatakiWordmark $g 18 14 210 52
  Draw-FillRect $g '#FFFFFF' 1290 530 84 24
  Draw-Text $g 'Select only' '#10B981' 1296 531 15 ([System.Drawing.FontStyle]::Bold)
  Draw-Badge $g 'Hide add/manage model' 1058 610 '#EEF2FF' '#4338CA'
}
Use-Graphics (Join-Path $input 'image6.png') 'Draw-ChatModel' (Join-Path $output 'design-chat-model-select.png')

function Draw-UserMenu($g, $w, $h) {
  Draw-FillRect $g '#FFFFFF' 0 0 250 92
  Draw-DatakiWordmark $g 18 14 210 52
  Draw-FillRect $g '#FFFFFF' 14 386 228 252
  $pen = New-Pen '#E5E7EB' 1
  $g.DrawRectangle($pen, 14, 386, 228, 252)
  $pen.Dispose()
  Draw-Text $g 'Profile' '#111827' 48 422 18
  Draw-Text $g 'Logout' '#EF4444' 48 584 18
  Draw-Badge $g 'Remove docs / website / GitHub / settings' 900 94 '#EEF2FF' '#4338CA'
}
Use-Graphics (Join-Path $input 'image7.png') 'Draw-UserMenu' (Join-Path $output 'design-user-menu.png')

Get-ChildItem -Path $output -File | Select-Object Name,Length
