<#
.SYNOPSIS
  Converts an animated GIF into one of a species' animation entries: a
  horizontal sprite-sheet PNG plus the matching frameWidth/frameHeight/
  frameCount/fps written into that species' species.json.

.DESCRIPTION
  The engine itself only ever plays sprite-sheet PNGs (see docs/setup.md
  §6/bugs.md - GIF playback gives JS no frame-level control, which
  AnimationController.isFinished() depends on for the poke/pet reaction's
  auto-return-to-idle). This script is purely an import-time convenience:
  point it at a GIF you already have, and it produces exactly the PNG +
  species.json fields the engine expects, so you never have to hand-slice
  frames or compute fps yourself.

  Uses System.Drawing (same toolchain as the other scripts/*.ps1 files) -
  no new dependency. Frame delay is read from the GIF's own per-frame
  timing (property tag 0x5100) and averaged into one fps value, since
  species.json only supports one fps per animation, not per-frame timing.

.PARAMETER GifPath
  Path to the source .gif file.

.PARAMETER SpeciesDir
  Path to the target species' folder (must already contain a
  species.json - this script only adds/updates one animation entry in an
  existing species, it doesn't scaffold a whole new species).

.PARAMETER State
  Which PetState this animation is for (idle, walk, dragged, sit, sleep,
  react, or any future state) - also the output filename,
  sprites/<State>.png.

.PARAMETER Fps
  Override the computed fps instead of averaging the GIF's own frame
  delays.

.PARAMETER NoLoop
  Mark the animation non-looping (species.json's "loop": false) - use
  this for one-shot reactions like "react", not for idle/walk.

.EXAMPLE
  .\gif-to-species-animation.ps1 -GifPath C:\art\blob-idle.gif `
    -SpeciesDir "$env:APPDATA\window-pet\species\my-species" -State idle

.EXAMPLE
  .\gif-to-species-animation.ps1 -GifPath C:\art\blob-poke.gif `
    -SpeciesDir "$env:APPDATA\window-pet\species\my-species" -State react -NoLoop
#>
param(
    [Parameter(Mandatory = $true)][string]$GifPath,
    [Parameter(Mandatory = $true)][string]$SpeciesDir,
    [Parameter(Mandatory = $true)][string]$State,
    [double]$Fps,
    [switch]$NoLoop
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $GifPath)) {
    Write-Error "GIF not found: $GifPath"
    exit 1
}

$speciesJsonPath = Join-Path $SpeciesDir "species.json"
if (-not (Test-Path $speciesJsonPath)) {
    Write-Error "species.json not found at $speciesJsonPath - create the species folder with a minimal species.json first (see docs/setup.md or an existing species for the shape), then re-run this script to add an animation to it."
    exit 1
}

$gif = [System.Drawing.Image]::FromFile((Resolve-Path $GifPath))
try {
    $dimension = New-Object System.Drawing.Imaging.FrameDimension($gif.FrameDimensionsList[0])
    $frameCount = $gif.GetFrameCount($dimension)
    $frameWidth = $gif.Width
    $frameHeight = $gif.Height

    if ($PSBoundParameters.ContainsKey('Fps')) {
        $resolvedFps = $Fps
    } else {
        # Property tag 0x5100 = frame delay, 4 bytes per frame, in
        # centiseconds. Some GIFs report 0 for a frame (a known encoder
        # quirk); clamp each to a sane minimum before averaging so a
        # single zero-delay frame can't produce an absurd fps.
        try {
            $delayBytes = $gif.GetPropertyItem(0x5100).Value
            $delaysMs = for ($i = 0; $i -lt $frameCount; $i++) {
                [Math]::Max(20, [BitConverter]::ToUInt32($delayBytes, $i * 4) * 10)
            }
            $avgDelayMs = ($delaysMs | Measure-Object -Average).Average
            $resolvedFps = [Math]::Round(1000 / $avgDelayMs, 2)
        } catch {
            Write-Warning "Could not read per-frame delay from the GIF; defaulting to 6 fps. Pass -Fps to override."
            $resolvedFps = 6
        }
    }

    $spritesDir = Join-Path $SpeciesDir "sprites"
    New-Item -ItemType Directory -Force -Path $spritesDir | Out-Null
    $outPngPath = Join-Path $spritesDir "$State.png"

    $sheet = New-Object System.Drawing.Bitmap ($frameWidth * $frameCount), $frameHeight
    $g = [System.Drawing.Graphics]::FromImage($sheet)
    try {
        for ($i = 0; $i -lt $frameCount; $i++) {
            $gif.SelectActiveFrame($dimension, $i) | Out-Null
            $destRect = New-Object System.Drawing.Rectangle ($i * $frameWidth), 0, $frameWidth, $frameHeight
            $g.DrawImage($gif, $destRect)
        }
    } finally {
        $g.Dispose()
    }
    $sheet.Save($outPngPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $sheet.Dispose()
} finally {
    $gif.Dispose()
}

# --- Update species.json's animations.<State> entry ---
$json = Get-Content $speciesJsonPath -Raw | ConvertFrom-Json

$animDef = [ordered]@{
    sheet       = "sprites/$State.png"
    frameWidth  = $frameWidth
    frameHeight = $frameHeight
    frameCount  = $frameCount
    fps         = $resolvedFps
    loop        = -not $NoLoop.IsPresent
}

if ($json.animations.PSObject.Properties.Name -contains $State) {
    $json.animations.$State = $animDef
} else {
    $json.animations | Add-Member -NotePropertyName $State -NotePropertyValue $animDef
}

# Windows PowerShell 5.1's Set-Content -Encoding utf8 writes a BOM, which
# Node's JSON.parse (used by speciesLoader.ts) rejects outright. Write
# BOM-less UTF-8 explicitly instead.
$jsonText = $json | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($speciesJsonPath, $jsonText, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "Wrote $outPngPath ($frameCount frames, ${frameWidth}x${frameHeight}, ~$resolvedFps fps)"
Write-Host "Updated $speciesJsonPath's animations.$State"
Write-Host "If this species is currently active, the running app will pick this up automatically within ~1s (see docs/setup.md section 8)."
