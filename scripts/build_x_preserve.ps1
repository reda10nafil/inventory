Set-Location -Path "X:\android"
$env:ANDROID_HOME = "C:\Users\Primo\AppData\Local\Android\Sdk"
$env:NODE_OPTIONS = "--preserve-symlinks"
Write-Host "NODE_OPTIONS=$env:NODE_OPTIONS"
Write-Host "cwd: $(Get-Location)"
# Clean previous .cxx
Remove-Item -Recurse -Force "X:\android\app\build" -ErrorAction SilentlyContinue
Get-ChildItem -Path "X:\node_modules\.pnpm" -Directory -Filter "expo-modules-core*" | ForEach-Object {
  $cxx = Join-Path $_.FullName "android\.cxx"
  if (Test-Path $cxx) { Remove-Item -Recurse -Force $cxx -ErrorAction SilentlyContinue; Write-Host "cleaned $($_.Name) .cxx" }
}
Write-Host "cleaned"
# Start build via Start-Job with NODE_OPTIONS
$job = Start-Job -ScriptBlock {
  Set-Location "X:\android"
  $env:ANDROID_HOME = "C:\Users\Primo\AppData\Local\Android\Sdk"
  $env:NODE_OPTIONS = "--preserve-symlinks"
  & "X:\android\gradlew.bat" app:assembleDebug -x lint 2>&1 | Out-File -FilePath "X:\gradle_preserve.log" -Encoding utf8
}
Write-Host "job $($job.Id) started"
Start-Sleep -Seconds 15
Get-Job | Format-Table -AutoSize | Out-String | Write-Host
if (Test-Path "X:\gradle_preserve.log") {
  Get-Content "X:\gradle_preserve.log" | Select-Object -Last 50 | ForEach-Object { Write-Host $_ }
} else {
  Write-Host "no log yet"
  Receive-Job -Job $job -Keep | Select-Object -Last 30 | ForEach-Object { Write-Host $_ }
}
Get-Process java -ErrorAction SilentlyContinue | Select-Object Id, CPU | Format-Table -AutoSize | Out-String | Write-Host
Write-Host "done start, polling..."
