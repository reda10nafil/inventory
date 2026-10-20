Write-Host "--- original ---"
Get-Item -Path "C:\Users\Primo\Desktop\inventory\node_modules\@react-native" -Force -ErrorAction SilentlyContinue | Format-List | Out-String | Write-Host
Write-Host "--- a ---"
Get-Item -Path "C:\Users\Primo\a\node_modules\@react-native" -Force -ErrorAction SilentlyContinue | Format-List | Out-String | Write-Host
Write-Host "--- dir original via cmd ---"
cmd /c dir "C:\Users\Primo\Desktop\inventory\node_modules\@react-native" 2>&1 | Out-String | Write-Host
Write-Host "--- dir a via cmd ---"
cmd /c dir "C:\Users\Primo\a\node_modules\@react-native" 2>&1 | Out-String | Write-Host
Write-Host "--- pnpm list ---"
Set-Location -Path "C:\Users\Primo\Desktop\inventory"
npx pnpm list "@react-native/gradle-plugin" 2>&1 | Select-Object -Last 20 | Out-String | Write-Host
