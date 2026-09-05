# Generates simple placeholder sprite sheets (solid colored blobs, no external
# art) for the default "placeholder" species, so the framework is runnable
# before real pixel art exists. Safe to delete/replace once real art lands.
Add-Type -AssemblyName System.Drawing

$frameSize = 32
$outDir = Join-Path $PSScriptRoot "..\assets\species\placeholder\sprites"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-SpriteSheet {
    param(
        [string]$FileName,
        [int]$FrameCount,
        [System.Drawing.Color[]]$Colors
    )
    $width = $frameSize * $FrameCount
    $bmp = New-Object System.Drawing.Bitmap $width, $frameSize
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    for ($i = 0; $i -lt $FrameCount; $i++) {
        $color = $Colors[$i % $Colors.Length]
        $brush = New-Object System.Drawing.SolidBrush $color
        $x = $i * $frameSize
        $pad = 4
        $g.FillEllipse($brush, $x + $pad, $pad, $frameSize - 2 * $pad, $frameSize - 2 * $pad)
        $brush.Dispose()
    }

    $g.Dispose()
    $path = Join-Path $outDir $FileName
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Wrote $path"
}

$blue1 = [System.Drawing.Color]::FromArgb(255, 90, 160, 230)
$blue2 = [System.Drawing.Color]::FromArgb(255, 110, 180, 245)
$green1 = [System.Drawing.Color]::FromArgb(255, 90, 200, 130)
$green2 = [System.Drawing.Color]::FromArgb(255, 110, 220, 150)
$orange = [System.Drawing.Color]::FromArgb(255, 240, 160, 70)
$purple = [System.Drawing.Color]::FromArgb(255, 170, 120, 220)
$gray = [System.Drawing.Color]::FromArgb(255, 130, 140, 150)
$yellow1 = [System.Drawing.Color]::FromArgb(255, 245, 210, 90)
$yellow2 = [System.Drawing.Color]::FromArgb(255, 250, 230, 130)

New-SpriteSheet -FileName "idle.png" -FrameCount 2 -Colors @($blue1, $blue2)
New-SpriteSheet -FileName "walk.png" -FrameCount 4 -Colors @($green1, $green2, $green1, $green2)
New-SpriteSheet -FileName "drag.png" -FrameCount 1 -Colors @($orange)
New-SpriteSheet -FileName "sit.png" -FrameCount 1 -Colors @($purple)
# progression milestone additions: sleep (long-idle variant, muted gray)
# and react (poke reaction, a quick non-looping color pulse)
New-SpriteSheet -FileName "sleep.png" -FrameCount 1 -Colors @($gray)
New-SpriteSheet -FileName "react.png" -FrameCount 3 -Colors @($yellow1, $yellow2, $yellow1)

Write-Host "Done."
