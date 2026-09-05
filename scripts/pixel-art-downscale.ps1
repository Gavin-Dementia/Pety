<#
.SYNOPSIS
  Downscales an image for pixel-art use by picking the most common
  ("mode") color in each source block, instead of blurring colors
  together the way ordinary bilinear/bicubic resizing does.

.DESCRIPTION
  Plain resizing averages every source pixel in a block, which muddies
  sharp pixel-art edges and washes out saturated colors into in-between
  tones. This picks whichever color actually appears most often in each
  block instead — closer to what a human eye picks out as "the" color of
  that region, and it keeps edges crisp since no blending happens.

  Alpha-aware: pixels below -AlphaThreshold are treated as transparent and
  excluded from the color vote; if a block is mostly transparent, the
  output pixel is transparent too rather than picking a stray edge color.

  Written from scratch (System.Drawing only, same toolchain as the other
  scripts/*.ps1 files) rather than pulling in a third-party downscaler —
  see docs/roadmap.md's asset-tooling milestone for why (license and
  install-footprint concerns with the alternatives that were evaluated).

.PARAMETER InputPath
  Source image (any format System.Drawing can decode — PNG, etc.).

.PARAMETER OutputPath
  Where to write the downscaled PNG.

.PARAMETER TargetWidth
.PARAMETER TargetHeight
  Output dimensions in pixels.

.PARAMETER AlphaThreshold
  Pixels with alpha below this (0-255) are excluded from a block's color
  vote. Default 128.

.PARAMETER MinOpaqueCoverage
  A block outputs transparent unless at least this fraction (0-1) of its
  pixels passed -AlphaThreshold — without this, a single stray opaque
  pixel in an otherwise-transparent block would win the vote by default
  and appear as full-strength noise in the output. Default 0.5.

.EXAMPLE
  .\pixel-art-downscale.ps1 -InputPath source.png -OutputPath idle.png -TargetWidth 32 -TargetHeight 32
#>
param(
    [Parameter(Mandatory = $true)][string]$InputPath,
    [Parameter(Mandatory = $true)][string]$OutputPath,
    [Parameter(Mandatory = $true)][int]$TargetWidth,
    [Parameter(Mandatory = $true)][int]$TargetHeight,
    [int]$AlphaThreshold = 128,
    [double]$MinOpaqueCoverage = 0.5
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $InputPath)) {
    Write-Error "Input not found: $InputPath"
    exit 1
}

$source = New-Object System.Drawing.Bitmap((Resolve-Path $InputPath).Path)
try {
    $srcWidth = $source.Width
    $srcHeight = $source.Height
    $scaleX = $srcWidth / $TargetWidth
    $scaleY = $srcHeight / $TargetHeight

    $output = New-Object System.Drawing.Bitmap $TargetWidth, $TargetHeight

    for ($oy = 0; $oy -lt $TargetHeight; $oy++) {
        $startY = [int][Math]::Floor($oy * $scaleY)
        $endY = [Math]::Min($srcHeight, [int][Math]::Ceiling(($oy + 1) * $scaleY))
        if ($endY -le $startY) { $endY = $startY + 1 }

        for ($ox = 0; $ox -lt $TargetWidth; $ox++) {
            $startX = [int][Math]::Floor($ox * $scaleX)
            $endX = [Math]::Min($srcWidth, [int][Math]::Ceiling(($ox + 1) * $scaleX))
            if ($endX -le $startX) { $endX = $startX + 1 }

            # Tally opaque-ish pixel colors in this block; pick the mode.
            $counts = @{}
            $totalPixels = 0
            $opaquePixels = 0
            for ($sy = $startY; $sy -lt $endY; $sy++) {
                for ($sx = $startX; $sx -lt $endX; $sx++) {
                    $totalPixels++
                    $p = $source.GetPixel($sx, $sy)
                    if ($p.A -lt $AlphaThreshold) { continue }
                    $opaquePixels++
                    $key = "$($p.A),$($p.R),$($p.G),$($p.B)"
                    if ($counts.ContainsKey($key)) { $counts[$key]++ } else { $counts[$key] = 1 }
                }
            }

            $coverage = if ($totalPixels -gt 0) { $opaquePixels / $totalPixels } else { 0 }
            if ($counts.Count -eq 0 -or $coverage -lt $MinOpaqueCoverage) {
                $output.SetPixel($ox, $oy, [System.Drawing.Color]::Transparent)
                continue
            }

            $bestKey = $null
            $bestCount = -1
            foreach ($entry in $counts.GetEnumerator()) {
                if ($entry.Value -gt $bestCount) {
                    $bestCount = $entry.Value
                    $bestKey = $entry.Key
                }
            }
            $parts = $bestKey -split ','
            $color = [System.Drawing.Color]::FromArgb([int]$parts[0], [int]$parts[1], [int]$parts[2], [int]$parts[3])
            $output.SetPixel($ox, $oy, $color)
        }
    }

    $outDir = Split-Path -Parent $OutputPath
    if ($outDir -and -not (Test-Path $outDir)) {
        New-Item -ItemType Directory -Force -Path $outDir | Out-Null
    }
    $output.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $output.Dispose()
} finally {
    $source.Dispose()
}

Write-Host "Wrote $OutputPath (${TargetWidth}x${TargetHeight}, from ${srcWidth}x${srcHeight})"
