Set-Location -Path "X:\android"
Write-Host "cwd: $(Get-Location)"
where.exe node 2>&1 | Out-String | Write-Host
node --version 2>&1 | Out-String | Write-Host
Write-Host "---try require.resolve---"
node --print "require.resolve('react-native/package.json')" 2>&1 | Out-String | Write-Host
Write-Host "---try expo---"
node --print "require.resolve('expo/package.json')" 2>&1 | Out-String | Write-Host
Write-Host "done"
