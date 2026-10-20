$env:ANDROID_HOME = "C:\Users\Primo\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Users\Primo\AppData\Local\Android\Sdk"
$log = "C:\Users\Primo\Desktop\inventory\gradle_build.log"
$err = "C:\Users\Primo\Desktop\inventory\gradle_build_err.log"
Remove-Item $log,$err -ErrorAction SilentlyContinue
Set-Location -Path "C:\Users\Primo\Desktop\inventory\android"
Write-Host "Starting gradlew assembleDebug (ndk 28.2)..."
$p = Start-Process -FilePath ".\gradlew.bat" -ArgumentList "app:assembleDebug","-x","lint","-PreactNativeDevServerPort=8081","-PreactNativeArchitectures=x86_64,arm64-v8a" -PassThru -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $err
Write-Host "pid: $($p.Id) started"
Start-Sleep -Seconds 5
if (Test-Path $log) { Get-Content $log | Select-Object -Last 20 | ForEach-Object { Write-Host $_ } }
Write-Host "started, will continue in background"
