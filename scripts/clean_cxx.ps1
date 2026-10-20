Write-Host "Cleaning..."
Remove-Item -Recurse -Force "X:\android\app\build" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "X:\android\app\.cxx" -ErrorAction SilentlyContinue
Get-ChildItem -Path "X:\node_modules\.pnpm" -Directory -Filter "expo-modules-core*" | ForEach-Object {
  $cxx = Join-Path $_.FullName "android\.cxx"
  if (Test-Path $cxx) {
    Remove-Item -Recurse -Force $cxx -ErrorAction SilentlyContinue
    Write-Host "cleaned $($_.Name)"
  }
}
Write-Host "clean done"
Get-ChildItem -Path "X:\android\app\build" -ErrorAction SilentlyContinue | Select-Object Name | Out-String | Write-Host
