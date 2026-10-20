Write-Host "--- from original ---"
Set-Location -Path "C:\Users\Primo\Desktop\inventory\android"
node --print "require.resolve('@react-native/gradle-plugin/package.json', { paths: [require.resolve('react-native/package.json')] })" 2>&1 | Write-Host
Write-Host "--- from a ---"
Set-Location -Path "C:\Users\Primo\a\android"
node --print "require.resolve('@react-native/gradle-plugin/package.json', { paths: [require.resolve('react-native/package.json')] })" 2>&1 | Write-Host
Write-Host "--- check pnpm store ---"
Get-ChildItem -Path "C:\Users\Primo\Desktop\inventory\node_modules\.pnpm\react-native@0.81.5_*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 2 Name | ForEach-Object { Write-Host $_.Name; Get-ChildItem -Path "C:\Users\Primo\Desktop\inventory\node_modules\.pnpm\$($_.Name)\node_modules\@react-native" -ErrorAction SilentlyContinue | Select-Object Name | ForEach-Object { Write-Host "  $($_.Name)" } }
Write-Host "--- check a pnpm store ---"
Get-ChildItem -Path "C:\Users\Primo\a\node_modules\.pnpm\react-native@0.81.5_*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 2 Name | ForEach-Object { Write-Host $_.Name; Get-ChildItem -Path "C:\Users\Primo\a\node_modules\.pnpm\$($_.Name)\node_modules\@react-native" -ErrorAction SilentlyContinue | Select-Object Name | ForEach-Object { Write-Host "  $($_.Name)" } }
