# Generates a placeholder tray icon + app icon.png (solid blob, no external
# art). ICO/ICNS conversion for Windows/macOS packaging is a follow-up task
# (see README) once real branding exists - electron-builder needs those
# formats for `npm run package:win`/`package:mac`.
Add-Type -AssemblyName System.Drawing

function New-IconPng {
    param([string]$Path, [int]$Size)
    $bmp = New-Object System.Drawing.Bitmap $Size, $Size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $color = [System.Drawing.Color]::FromArgb(255, 90, 160, 230)
    $brush = New-Object System.Drawing.SolidBrush $color
    $pad = [Math]::Max(1, [int]($Size * 0.1))
    $g.FillEllipse($brush, $pad, $pad, $Size - 2 * $pad, $Size - 2 * $pad)
    $brush.Dispose()
    $g.Dispose()
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Wrote $Path"
}

$buildResources = Join-Path $PSScriptRoot "..\build-resources"
New-Item -ItemType Directory -Force -Path $buildResources | Out-Null

New-IconPng -Path (Join-Path $buildResources "tray-icon.png") -Size 32
New-IconPng -Path (Join-Path $buildResources "icon.png") -Size 256

Write-Host "Done. icon.ico / icon.icns still need generating from icon.png before packaging."
