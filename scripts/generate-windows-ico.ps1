# Packs build-resources/icon.png (256x256, from generate-app-icons.ps1) into a
# minimal valid .ico container using the modern "embedded PNG" ICO format
# (supported since Vista) - no external tools (ImageMagick etc.) required.
# Still a placeholder-art icon; regenerate from real branding later. icon.icns
# (macOS) needs iconutil/sips, which only exist on macOS - not covered here.

$pngPath = Join-Path $PSScriptRoot "..\build-resources\icon.png"
$icoPath = Join-Path $PSScriptRoot "..\build-resources\icon.ico"

$pngBytes = [System.IO.File]::ReadAllBytes($pngPath)

$stream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter($stream)

# ICONDIR: reserved(2)=0, type(2)=1 (icon), count(2)=1
$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]1)

# ICONDIRENTRY: width/height=0 means 256, colorCount=0, reserved=0,
# planes=1, bitCount=32, bytesInRes, imageOffset
$writer.Write([Byte]0)   # width (0 = 256)
$writer.Write([Byte]0)   # height (0 = 256)
$writer.Write([Byte]0)   # color count
$writer.Write([Byte]0)   # reserved
$writer.Write([UInt16]1) # planes
$writer.Write([UInt16]32) # bit count
$writer.Write([UInt32]$pngBytes.Length) # bytes in resource
$writer.Write([UInt32]22) # offset: 6 (ICONDIR) + 16 (one ICONDIRENTRY) = 22

$writer.Write($pngBytes)
$writer.Flush()

[System.IO.File]::WriteAllBytes($icoPath, $stream.ToArray())
$writer.Dispose()
$stream.Dispose()

Write-Host "Wrote $icoPath ($((Get-Item $icoPath).Length) bytes)"
