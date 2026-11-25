Add-Type -AssemblyName System.Drawing

$testDir = "c:\Users\rahul\OneDrive\Desktop\websites\veda_original\test_assets"
if (!(Test-Path $testDir)) {
    New-Item -ItemType Directory -Force -Path $testDir | Out-Null
}

# Image 1: Ashwagandha Medicine Bottle Label
$bmp1 = New-Object System.Drawing.Bitmap 500, 350
$g1 = [System.Drawing.Graphics]::FromImage($bmp1)
$g1.Clear([System.Drawing.Color]::White)
$green = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::DarkGreen)
$black = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::Black)
$titleFont = New-Object System.Drawing.Font('Arial', 20, [System.Drawing.FontStyle]::Bold)
$bodyFont = New-Object System.Drawing.Font('Arial', 13)

$g1.DrawString("ORGANIC ASHWAGANDHA", $titleFont, $green, 30, 40)
$g1.DrawString("Ayurvedic Stress Relief & Vitality", $bodyFont, $black, 30, 85)
$g1.DrawString("Ingredients: Withania somnifera (Ashwagandha) Root", $bodyFont, $black, 30, 120)
$g1.DrawString("Potency: 500mg per vegetarian capsule", $bodyFont, $black, 30, 155)
$g1.DrawString("Certified Ayurvedic Medicine | GMP Compliant", $bodyFont, $black, 30, 200)

$bmp1.Save("$testDir\ashwagandha_label.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g1.Dispose()
$bmp1.Dispose()

# Image 2: Tulsi Herbal Drops Label
$bmp2 = New-Object System.Drawing.Bitmap 500, 350
$g2 = [System.Drawing.Graphics]::FromImage($bmp2)
$g2.Clear([System.Drawing.Color]::White)
$g2.DrawString("HOLY BASIL / TULSI DROPS", $titleFont, $green, 30, 40)
$g2.DrawString("Natural Immunity Booster", $bodyFont, $black, 30, 85)
$g2.DrawString("Botanical: Ocimum tenuiflorum (Tulsi)", $bodyFont, $black, 30, 120)
$g2.DrawString("Formulation: Single herbal liquid extract", $bodyFont, $black, 30, 155)
$bmp2.Save("$testDir\tulsi_label.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g2.Dispose()
$bmp2.Dispose()

# Image 3: Out-of-Domain Non-Herbal Object (Smartphone & Charger)
$bmp3 = New-Object System.Drawing.Bitmap 500, 350
$g3 = [System.Drawing.Graphics]::FromImage($bmp3)
$g3.Clear([System.Drawing.Color]::White)
$blue = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::DarkBlue)
$g3.DrawString("WIRELESS BLUETOOTH HEADPHONES", $titleFont, $blue, 20, 50)
$g3.DrawString("Model: Pro Audio 2026", $bodyFont, $black, 30, 100)
$g3.DrawString("Battery Life: 40 Hours | USB-C Charging", $bodyFont, $black, 30, 140)
$g3.DrawString("Electronics Component Device", $bodyFont, $black, 30, 180)
$bmp3.Save("$testDir\electronics_out_of_domain.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g3.Dispose()
$bmp3.Dispose()

Write-Host "Created all 3 test images in test_assets/"
