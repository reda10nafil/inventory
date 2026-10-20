$env:ANDROID_HOME = "C:\Users\Primo\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Users\Primo\AppData\Local\Android\Sdk"
$log = "C:\Users\Primo\Desktop\inventory\gradle_build.log"
$err = "C:\Users\Primo\Desktop\inventory\gradle_build_err.log"
Remove-Item $log,$err -ErrorAction SilentlyContinue
Write-Host "Starting gradlew assembleDebug with ANDROID_HOME=$env:ANDROID_HOME"
Set-Location -Path "C:\Users\Primo\Desktop\inventory\android"
$p = Start-Process -FilePath ".\gradlew.bat" -ArgumentList "app:assembleDebug","-x","lint","-PreactNativeDevServerPort=8081","-PreactNativeArchitectures=x86_64,arm64-v8a" -PassThru -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $err
Write-Host "pid: $($p.Id)"
for ($i=0; $i -lt 20; $i++) {
  Start-Sleep -Seconds 10
  Write-Host "--- tick $i ---"
  if (Test-Path $log) { Get-Content $log | Select-Object -Last 15 | ForEach-Object { Write-Host $_ } }
  $running = Get-Process -Id $p.Id -ErrorAction SilentlyContinue
  if (-not $running) { Write-Host "gradle exited"; break }
}
Write-Host "--- final ---"
if (Test-Path $log) { Get-Content $log | Select-Object -Last 50 | ForEach-Object { Write-Host $_ } }
if (Test-Path $err) { Get-Content $err | Select-Object -Last 30 | ForEach-Object { Write-Host "ERR: $_" } }
& "C:\Users\Primo\AppData\Local\Android\Sdk\platform-tools\adb.exe" devices
Get-ChildItem -Path "C:\Users\Primo\Desktop\inventory\android\app\build\outputs\apk\debug" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "APK: $($_.FullName) $($_.Length)" }
$running = Get-Process -Id $p.Id -ErrorAction SilentlyContinue
if ($running) { Write-Host "still running, not killing" } else { Write-Host "finished" }
