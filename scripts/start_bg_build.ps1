Set-Location -Path "C:\Users\Primo\Desktop\inventory\android"
Write-Host "Starting bg build..."
cmd /c start /B cmd /c "gradlew.bat app:assembleDebug -x lint > C:\Users\Primo\Desktop\inventory\gradle_bg.log 2>&1"
Write-Host "started"
Start-Sleep -Seconds 5
if (Test-Path "C:\Users\Primo\Desktop\inventory\gradle_bg.log") {
  Get-Content -Path "C:\Users\Primo\Desktop\inventory\gradle_bg.log" -ErrorAction SilentlyContinue | Select-Object -Last 20 | ForEach-Object { Write-Host $_ }
} else {
  Write-Host "no log yet"
}
Get-Process java -ErrorAction SilentlyContinue | Select-Object Id, CPU | Format-Table -AutoSize | Out-String | Write-Host
Write-Host "done start"
