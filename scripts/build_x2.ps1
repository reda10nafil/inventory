Set-Location -Path "X:\android"
$env:ANDROID_HOME = "C:\Users\Primo\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Users\Primo\AppData\Local\Android\Sdk"
$log = "X:\gradle_build.log"
Remove-Item $log -ErrorAction SilentlyContinue
Write-Host "Starting build from X: ..."
# Use Start-Process with X: path
$p = Start-Process -FilePath "X:\android\gradlew.bat" -ArgumentList "app:assembleDebug","-x","lint" -PassThru -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError "X:\gradle_build_err.log"
Write-Host "pid: $($p.Id) started"
Start-Sleep -Seconds 8
if (Test-Path $log) {
  Get-Content $log | Select-Object -Last 30 | ForEach-Object { Write-Host $_ }
} else {
  Write-Host "no log yet"
}
Get-Process java -ErrorAction SilentlyContinue | Select-Object Id, CPU | Format-Table -AutoSize | Out-String | Write-Host
Write-Host "started, polling..."
