Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("C:\Users\manuel reca\Desktop\Infinity-Vibe-Slug\public\assets\sprites\player\diego_run.png")
Write-Host "$($img.Width)x$($img.Height)"
$img.Dispose()
