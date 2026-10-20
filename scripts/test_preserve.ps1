Set-Location -Path "X:\android"
Write-Host "cwd: $(Get-Location)"
Write-Host "---without preserve---"
node --print "require.resolve('react-native/package.json')" 2>&1 | Write-Host
Write-Host "---with preserve---"
node --preserve-symlinks --print "require.resolve('react-native/package.json')" 2>&1 | Write-Host
Write-Host "---with NODE_OPTIONS---"
$env:NODE_OPTIONS="--preserve-symlinks"
node --print "require.resolve('react-native/package.json')" 2>&1 | Write-Host
Write-Host "done"
