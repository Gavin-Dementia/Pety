<#
.SYNOPSIS
  Assembles a sequence of frame images (as Bitmaps, in-process) into one
  animated GIF.

.DESCRIPTION
  .NET's Bitmap.Save only writes single-frame GIFs — there's no built-in
  multi-frame API. Rather than hand-rolling LZW compression and color
  quantization from scratch (real correctness risk — see
  docs/roadmap.md's asset-tooling history for how that went even for a
  tiny 3-color test fixture), this saves each frame individually through
  .NET's own well-tested GDI+ GIF encoder (which already does correct
  palette quantization + LZW), then splices the resulting per-frame
  Image Descriptor + Local Color Table + LZW data blocks out of each
  single-frame file and re-packages them into one animated container with
  a NETSCAPE loop extension and a Graphic Control Extension (frame delay)
  per frame. Each frame keeps its own local color table, so frames never
  need to share a merged/quantized palette.

  Not meant to be run directly from the command line — dot-source it and
  call New-AnimatedGif from another script (see procedural-bounce-gif.ps1).
#>

Add-Type -AssemblyName System.Drawing

function Get-GifFrameChunk {
    <# Extracts everything between a single-frame GIF's screen descriptor
       and its trailer: the color table (promoted to a local table on the
       Image Descriptor) + the Image Descriptor + the raw LZW data blocks. #>
    param([byte[]]$GifBytes)

    $pos = 6  # skip "GIF87a"/"GIF89a"
    $packed = $GifBytes[$pos + 4]
    $hasGct = ($packed -band 0x80) -ne 0
    $gctSize = if ($hasGct) { 2 * (1 -shl (($packed -band 0x07) + 1)) * 3 } else { 0 }
    $pos += 7  # Logical Screen Descriptor
    $colorTable = $null
    if ($hasGct) {
        $colorTable = $GifBytes[$pos..($pos + $gctSize / 2 - 1)]
        $pos += [int]($gctSize / 2)
    }

    # Skip any extension blocks until the Image Descriptor (0x2C).
    while ($GifBytes[$pos] -ne 0x2C) {
        if ($GifBytes[$pos] -eq 0x21) {
            $pos += 2  # extension introducer + label
            while ($GifBytes[$pos] -ne 0x00) {
                $blockLen = $GifBytes[$pos]
                $pos += 1 + $blockLen
            }
            $pos += 1  # terminator
        } else {
            throw "Unexpected byte 0x$($GifBytes[$pos].ToString('X2')) while scanning for Image Descriptor"
        }
    }

    $descStart = $pos
    $left = [BitConverter]::ToUInt16($GifBytes, $pos + 1)
    $top = [BitConverter]::ToUInt16($GifBytes, $pos + 3)
    $width = [BitConverter]::ToUInt16($GifBytes, $pos + 5)
    $height = [BitConverter]::ToUInt16($GifBytes, $pos + 7)
    $imgPacked = $GifBytes[$pos + 9]
    $pos += 10

    $hasLct = ($imgPacked -band 0x80) -ne 0
    if ($hasLct) {
        $lctSize = 2 * (1 -shl (($imgPacked -band 0x07) + 1)) * 3
        $colorTable = $GifBytes[$pos..($pos + [int]($lctSize / 2) - 1)]
        $pos += [int]($lctSize / 2)
    }

    $lzwStart = $pos
    $minCodeSize = $GifBytes[$pos]
    $pos += 1
    while ($GifBytes[$pos] -ne 0x00) {
        $blockLen = $GifBytes[$pos]
        $pos += 1 + $blockLen
    }
    $pos += 1  # terminator
    $lzwBytes = $GifBytes[$lzwStart..($pos - 1)]

    return [pscustomobject]@{
        Left        = $left
        Top         = $top
        Width       = $width
        Height      = $height
        ColorTable  = $colorTable
        LzwBytes    = $lzwBytes
    }
}

function New-AnimatedGif {
    param(
        [Parameter(Mandatory = $true)][System.Drawing.Bitmap[]]$Frames,
        [Parameter(Mandatory = $true)][string]$OutputPath,
        [int]$DelayCentiseconds = 15,
        [bool]$Loop = $true
    )

    $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ([Guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

    $chunks = @()
    try {
        for ($i = 0; $i -lt $Frames.Count; $i++) {
            $tempPath = Join-Path $tempDir "frame$i.gif"
            $Frames[$i].Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Gif)
            $bytes = [System.IO.File]::ReadAllBytes($tempPath)
            $chunks += Get-GifFrameChunk -GifBytes $bytes
        }
    } finally {
        Remove-Item -Recurse -Force $tempDir
    }

    $canvasWidth = $Frames[0].Width
    $canvasHeight = $Frames[0].Height

    $stream = New-Object System.IO.MemoryStream
    $w = New-Object System.IO.BinaryWriter($stream)

    $w.Write([byte[]][char[]]"GIF89a")
    $w.Write([UInt16]$canvasWidth)
    $w.Write([UInt16]$canvasHeight)
    $w.Write([byte]0x70)  # no global color table, color res=7 (cosmetic only)
    $w.Write([byte]0)
    $w.Write([byte]0)

    if ($Loop) {
        $w.Write([byte]0x21); $w.Write([byte]0xFF); $w.Write([byte]0x0B)
        $w.Write([byte[]][char[]]"NETSCAPE2.0")
        $w.Write([byte]0x03); $w.Write([byte]0x01); $w.Write([UInt16]0); $w.Write([byte]0x00)
    }

    foreach ($chunk in $chunks) {
        # Graphic Control Extension
        $w.Write([byte]0x21); $w.Write([byte]0xF9); $w.Write([byte]0x04)
        $w.Write([byte]0x01)  # transparency flag on (index 0 reserved isn't guaranteed transparent, but harmless if unused)
        $w.Write([UInt16]$DelayCentiseconds)
        $w.Write([byte]0)
        $w.Write([byte]0)

        # Image Descriptor with a Local Color Table
        $w.Write([byte]0x2C)
        $w.Write([UInt16]$chunk.Left); $w.Write([UInt16]$chunk.Top)
        $w.Write([UInt16]$chunk.Width); $w.Write([UInt16]$chunk.Height)
        $numColors = $chunk.ColorTable.Count / 3
        $bitsNeeded = [Math]::Max(1, [Math]::Ceiling([Math]::Log($numColors, 2)))
        $tableSizeField = [Math]::Max(0, $bitsNeeded - 1)
        $imgPacked = 0x80 -bor $tableSizeField
        $w.Write([byte]$imgPacked)
        $w.Write([byte[]]$chunk.ColorTable)
        $w.Write([byte[]]$chunk.LzwBytes)
    }

    $w.Write([byte]0x3B)
    $w.Flush()
    [System.IO.File]::WriteAllBytes($OutputPath, $stream.ToArray())
    Write-Host "Wrote $OutputPath ($($chunks.Count) frames, ${canvasWidth}x${canvasHeight})"
}
