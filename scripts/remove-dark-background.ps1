<#
.SYNOPSIS
  Makes near-black/dark background pixels transparent (simple luminance
  threshold keying) — for source art with a plain dark background and a
  lighter subject, not a general-purpose background remover.

.PARAMETER InputPath
.PARAMETER OutputPath
.PARAMETER LuminanceThreshold
  Pixels with perceptual luminance below this (0-255) become transparent.
  Default 40.

.PARAMETER FeatherRange
  Pixels within this many luminance units above the threshold get a
  partially-reduced alpha (linear ramp) instead of a hard cutoff, to avoid
  a jagged edge. Default 25. Set to 0 for a hard threshold.
#>
param(
    [Parameter(Mandatory = $true)][string]$InputPath,
    [Parameter(Mandatory = $true)][string]$OutputPath,
    [int]$LuminanceThreshold = 40,
    [int]$FeatherRange = 25
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $InputPath)) {
    Write-Error "Input not found: $InputPath"
    exit 1
}

$source = New-Object System.Drawing.Bitmap((Resolve-Path $InputPath).Path)
try {
    $output = New-Object System.Drawing.Bitmap $source.Width, $source.Height
    for ($y = 0; $y -lt $source.Height; $y++) {
        for ($x = 0; $x -lt $source.Width; $x++) {
            $p = $source.GetPixel($x, $y)
            # Perceptual luminance (Rec. 601-ish weights).
            $lum = (0.299 * $p.R) + (0.587 * $p.G) + (0.114 * $p.B)

            if ($lum -le $LuminanceThreshold) {
                $alpha = 0
            } elseif ($FeatherRange -gt 0 -and $lum -lt ($LuminanceThreshold + $FeatherRange)) {
                $alpha = [int](255 * ($lum - $LuminanceThreshold) / $FeatherRange)
            } else {
                $alpha = 255
            }

            $newAlpha = [Math]::Min($p.A, $alpha)
            $output.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($newAlpha, $p.R, $p.G, $p.B))
        }
    }
    $output.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $output.Dispose()
} finally {
    $source.Dispose()
}

Write-Host "Wrote $OutputPath"
