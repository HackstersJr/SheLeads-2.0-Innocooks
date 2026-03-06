Add-Type -AssemblyName System.Drawing

$src = Join-Path $PSScriptRoot "icon-source.png"
if (-not (Test-Path $src)) {
    Write-Error "icon-source.png not found in public\ folder. Save the image there first."
    exit 1
}

function Resize-Image($inputPath, $outputPath, $size) {
    $img    = [System.Drawing.Image]::FromFile($inputPath)
    $bmp    = New-Object System.Drawing.Bitmap($size, $size)
    $g      = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($img, 0, 0, $size, $size)
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $img.Dispose()
    Write-Host "Saved $outputPath ($size x $size)"
}

Resize-Image $src (Join-Path $PSScriptRoot "icon-192.png") 192
Resize-Image $src (Join-Path $PSScriptRoot "icon-512.png") 512
Write-Host "Done! Both icons updated."
