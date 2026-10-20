Set-Location -Path "C:\inv\android"
Write-Host "cwd: $(Get-Location)"
node --version 2>&1 | Write-Host
Write-Host "---node resolve---"
node --print "require.resolve('react-native/package.json')" 2>&1 | Write-Host
Write-Host "---path length test---"
$path = "C:\inv\node_modules\.pnpm\expo-modules-core@3.0.30_re_30c22199fccf994530a5ea5b7083980f\node_modules\expo-modules-core\android\.cxx\Debug\126m3p18\arm64-v8a\src\fabric\CMakeFiles\fabric.dir"
Write-Host "C:\inv path length: $($path.Length)"
$orig = "C:\Users\Primo\Desktop\inventory\node_modules\.pnpm\expo-modules-core@3.0.30_re_30c22199fccf994530a5ea5b7083980f\node_modules\expo-modules-core\android\.cxx\Debug\126m3p18\arm64-v8a\src\fabric\CMakeFiles\fabric.dir"
Write-Host "orig path length: $($orig.Length)"
Write-Host "saved: $($orig.Length - $path.Length)"
