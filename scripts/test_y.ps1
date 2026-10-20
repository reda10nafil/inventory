subst Y: "C:\Users\Primo\a" 2>&1 | Out-String | Write-Host
Get-PSDrive Y -ErrorAction SilentlyContinue | Format-Table -AutoSize | Out-String | Write-Host
Get-ChildItem -Path "Y:\" -ErrorAction SilentlyContinue | Select-Object -First 5 Name | Out-String | Write-Host
Write-Host "--- test node from Y ---"
Set-Location -Path "Y:\android"
node --version 2>&1 | Write-Host
Write-Host "--- without preserve ---"
node --print "require.resolve('react-native/package.json')" 2>&1 | Write-Host
Write-Host "--- with preserve ---"
node --preserve-symlinks --print "require.resolve('react-native/package.json')" 2>&1 | Write-Host
Write-Host "done"
