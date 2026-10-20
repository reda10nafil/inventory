Set-Location -Path "X:\android"
$env:ANDROID_HOME = "C:\Users\Primo\AppData\Local\Android\Sdk"
Write-Host "Starting via Start-Process without redirect..."
$p = Start-Process -FilePath "X:\android\gradlew.bat" -ArgumentList "app:assembleDebug","-x","lint" -WorkingDirectory "X:\android" -WindowStyle Hidden -PassThru
Write-Host "pid: $($p.Id) started"
Start-Sleep -Seconds 10
Get-Process java -ErrorAction SilentlyContinue | Select-Object Id, CPU | Format-Table -AutoSize | Out-String | Write-Host
# Check if gradle created any output
if (Test-Path "X:\android\app\build\outputs\apk\debug\app-debug.apk") {
  Write-Host "APK exists!"
  Get-Item "X:\android\app\build\outputs\apk\debug\app-debug.apk" | Select-Object Length, LastWriteTime | Format-Table -AutoSize | Out-String | Write-Host
} else {
  Write-Host "no APK yet"
  Get-ChildItem -Path "X:\android\app\build" -ErrorAction SilentlyContinue | Select-Object Name | Out-String | Write-Host
}
Write-Host "done start"
# Don't wait, let it run
