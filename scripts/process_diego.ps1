Add-Type -AssemblyName System.Drawing

$desktopDir = "c:\Users\manuel reca\Desktop\sprite sheets from AIGODMODE"
$jsonPath = Join-Path $desktopDir "Run holding a gun_bounding_boxes.json"
$imagePath = Join-Path $desktopDir "diego_run.png"

$projectDir = "c:\Users\manuel reca\Desktop\Infinity-Vibe-Slug"
$outputPath = Join-Path $projectDir "public\assets\sprites\player\diego_run_high_res.png"

# Target frame size - Increased to 50x50 to avoid clipping and overlap
$targetW = 50
$targetH = 50

try {
    # Load JSON and Image
    $bboxData = Get-Content $jsonPath | ConvertFrom-Json
    $bboxData = $bboxData | Sort-Object frameIndex
    
    $img = [System.Drawing.Image]::FromFile($imagePath)
    
    $numFrames = $bboxData.Count
    $totalWidth = $targetW * $numFrames
    
    # Create the output bitmap
    $outBmp = New-Object System.Drawing.Bitmap($totalWidth, $targetH)
    $g = [System.Drawing.Graphics]::FromImage($outBmp)
    
    # Ensure transparency
    $g.Clear([System.Drawing.Color]::Transparent)
    
    # High-Res scaling settings
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    $i = 0
    foreach ($box in $bboxData) {
        $sw = $box.width
        $sh = $box.height
        $sx = $box.x
        $sy = $box.y
        
        # Calculate scale to fit height (leaving a tiny bit of padding)
        # Target character height within the 50px box will be around 32-40px
        $charH = 40 
        $scale = $charH / $sh
        $scaledW = $sw * $scale
        $scaledH = $charH
        
        # Destination coordinates:
        # Centered horizontally in the 50px slot
        $dx = ($i * $targetW) + ($targetW / 2) - ($scaledW / 2)
        # Aligned slightly above the bottom to account for ground offset in 50px box
        $dy = $targetH - $scaledH
        
        $srcRect = New-Object System.Drawing.Rectangle($sx, $sy, $sw, $sh)
        $destRect = New-Object System.Drawing.RectangleF($dx, $dy, $scaledW, $scaledH)
        
        $g.DrawImage($img, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
        $i++
    }
    
    # Save the result
    $outBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Clean up
    $g.Dispose()
    $img.Dispose()
    $outBmp.Dispose()
    
    Write-Host "Successfully processed $numFrames frames into 50x50 slots."
    Write-Host "Output saved to: $outputPath"
} catch {
    Write-Error "Error processing sprites: $_"
}
