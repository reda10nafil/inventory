Set-Location -Path "X:\android"
$env:ANDROID_HOME = "C:\Users\Primo\AppData\Local\Android\Sdk"
Write-Host "Starting bg build via cmd..."
cmd /c start /B cmd /c "gradlew.bat app:assembleDebug -x lint > X:\gradle_build.log 2>&1"
Write-Host "started"
Start-Sleep -Seconds 8
if (Test-Path "X:\gradle_build.log") {
  Get-Content "X:\gradle_build.log" | Select-Object -Last 40 | ForEach-Object { Write-Host $_ }
} else {
  Write-Host "no log yet"
}
Get-Process java -ErrorAction SilentlyContinue | Select-Object Id, CPU | Format-Table -AutoSize | Out-String | Write-Host
Write-Host "done"
