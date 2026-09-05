<#
.SYNOPSIS
  Turns one static (background-removed) sprite into two looping animated
  GIFs — "common" (a subtle idle loop) and "rare" (a bigger, more
  eye-catching loop) — using simple procedural transforms (bob, squash/
  stretch, brightness pulse), since there's only one source frame to work
  from, not hand-drawn animation frames.

.PARAMETER InputPath
  A single sprite image, ideally already background-removed (transparent).

.PARAMETER CommonOutputPath
.PARAMETER RareOutputPath

.PARAMETER Scale
  Nearest-neighbor upscale factor applied before animating, since the
  source is tiny pixel art (e.g. 32x28) and sub-pixel bob offsets would
  otherwise do nothing / look wrong at 1x. Default 8.
#>
param(
    [Parameter(Mandatory = $true)][string]$InputPath,
    [Parameter(Mandatory = $true)][string]$CommonOutputPath,
    [Parameter(Mandatory = $true)][string]$RareOutputPath,
    [int]$Scale = 8
)

Add-Type -AssemblyName System.Drawing
. (Join-Path $PSScriptRoot "frames-to-gif.ps1")

if (-not (Test-Path $InputPath)) {
    Write-Error "Input not found: $InputPath"
    exit 1
}

$source = New-Object System.Drawing.Bitmap((Resolve-Path $InputPath).Path)

# Upscale the source (nearest-neighbor, keeps pixel-art crispness) so
# procedural pixel-level offsets are actually visible.
$srcW = $source.Width * $Scale
$srcH = $source.Height * $Scale
$upscaled = New-Object System.Drawing.Bitmap $srcW, $srcH
$gUp = [System.Drawing.Graphics]::FromImage($upscaled)
$gUp.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$gUp.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$gUp.DrawImage($source, 0, 0, $srcW, $srcH)
$gUp.Dispose()
$source.Dispose()

# GIF has no partial transparency — GDI+'s GIF encoder composites
# semi-transparent pixels against black rather than preserving their
# color, which turns feathered edges (from remove-dark-background.ps1)
# muddy/dark. Binarize alpha now, before any transform, so the encoder
# only ever sees fully-opaque or fully-transparent pixels.
for ($y = 0; $y -lt $upscaled.Height; $y++) {
    for ($x = 0; $x -lt $upscaled.Width; $x++) {
        $p = $upscaled.GetPixel($x, $y)
        if ($p.A -lt 128) {
            $upscaled.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $p.R, $p.G, $p.B))
        } elseif ($p.A -lt 255) {
            $upscaled.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $p.R, $p.G, $p.B))
        }
    }
}

function New-TransformedFrame {
    param(
        [System.Drawing.Bitmap]$Src,
        [int]$CanvasWidth,
        [int]$CanvasHeight,
        [double]$OffsetX,
        [double]$OffsetY,
        [double]$ScaleX,
        [double]$ScaleY,
        [double]$Brighten  # 0 = none, 1 = fully white
    )

    $frame = New-Object System.Drawing.Bitmap $CanvasWidth, $CanvasHeight
    $g = [System.Drawing.Graphics]::FromImage($frame)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

    $drawW = $Src.Width * $ScaleX
    $drawH = $Src.Height * $ScaleY
    # Anchor to horizontal center, vertical bottom, so squash/stretch and
    # bob read as the creature pressing into / lifting off the ground,
    # not floating/resizing from a corner.
    $cx = ($CanvasWidth - $Src.Width) / 2.0
    $baseY = $CanvasHeight - $Src.Height
    $x = $cx + $OffsetX - (($drawW - $Src.Width) / 2.0)
    $y = $baseY + $OffsetY - ($drawH - $Src.Height)

    if ($Brighten -gt 0) {
        $matrix = [float[][]]@(
            [float[]]@(1,0,0,0,0),
            [float[]]@(0,1,0,0,0),
            [float[]]@(0,0,1,0,0),
            [float[]]@(0,0,0,1,0),
            [float[]]@($Brighten,$Brighten,$Brighten,0,1)
        )
        $colorMatrix = New-Object System.Drawing.Imaging.ColorMatrix (,$matrix)
        $attr = New-Object System.Drawing.Imaging.ImageAttributes
        $attr.SetColorMatrix($colorMatrix)
        $destRect = New-Object System.Drawing.Rectangle ([int][Math]::Round($x)), ([int][Math]::Round($y)), ([int][Math]::Round($drawW)), ([int][Math]::Round($drawH))
        $g.DrawImage($Src, $destRect, 0, 0, $Src.Width, $Src.Height, [System.Drawing.GraphicsUnit]::Pixel, $attr)
        $attr.Dispose()
    } else {
        $g.DrawImage($Src, [single]$x, [single]$y, [single]$drawW, [single]$drawH)
    }

    $g.Dispose()
    return $frame
}

$canvasW = $upscaled.Width
$canvasH = $upscaled.Height + (4 * $Scale)  # headroom for bob/stretch

# --- Common: subtle idle bob, no color change, gentle 6-frame loop ---
$commonFrames = @()
$commonFrameCount = 6
for ($i = 0; $i -lt $commonFrameCount; $i++) {
    $t = ($i / $commonFrameCount) * 2 * [Math]::PI
    $bob = [Math]::Sin($t) * (1.2 * $Scale)
    $squash = 1.0 - (0.02 * [Math]::Cos($t))
    $commonFrames += New-TransformedFrame -Src $upscaled -CanvasWidth $canvasW -CanvasHeight $canvasH `
        -OffsetX 0 -OffsetY (-$bob) -ScaleX (2.0 - $squash) -ScaleY $squash -Brighten 0
}
New-AnimatedGif -Frames $commonFrames -OutputPath $CommonOutputPath -DelayCentiseconds 15 -Loop $true
foreach ($f in $commonFrames) { $f.Dispose() }

# --- Rare: bigger bounce + squash/stretch + a bright flash pulse ---
$rareFrames = @()
$rareFrameCount = 10
for ($i = 0; $i -lt $rareFrameCount; $i++) {
    $t = ($i / $rareFrameCount) * 2 * [Math]::PI
    $bounce = [Math]::Abs([Math]::Sin($t)) * (3.5 * $Scale)
    $stretch = 1.0 + (0.12 * [Math]::Sin($t + [Math]::PI / 2))
    $squashY = 1.0 / [Math]::Sqrt($stretch)
    $flash = [Math]::Max(0, [Math]::Sin($t) - 0.6) * 1.2
    $rareFrames += New-TransformedFrame -Src $upscaled -CanvasWidth $canvasW -CanvasHeight $canvasH `
        -OffsetX 0 -OffsetY (-$bounce) -ScaleX $stretch -ScaleY $squashY -Brighten $flash
}
New-AnimatedGif -Frames $rareFrames -OutputPath $RareOutputPath -DelayCentiseconds 8 -Loop $true
foreach ($f in $rareFrames) { $f.Dispose() }

$upscaled.Dispose()
