Write-Host "Starting job..."
$job = Start-Job -ScriptBlock {
  Set-Location "X:\android"
  $env:ANDROID_HOME = "C:\Users\Primo\AppData\Local\Android\Sdk"
  & "X:\android\gradlew.bat" app:assembleDebug -x lint 2>&1 | Out-File -FilePath "X:\gradle_job.log" -Encoding utf8
}
Write-Host "job $($job.Id) started"
Start-Sleep -Seconds 10
Get-Job | Format-Table -AutoSize | Out-String | Write-Host
if (Test-Path "X:\gradle_job.log") {
  Get-Content "X:\gradle_job.log" | Select-Object -Last 30 | ForEach-Object { Write-Host $_ }
} else {
  Write-Host "no log yet"
  Receive-Job -Job $job -Keep | Select-Object -Last 30 | ForEach-Object { Write-Host $_ }
}
Get-Process java -ErrorAction SilentlyContinue | Select-Object Id, CPU | Format-Table -AutoSize | Out-String | Write-Host
Write-Host "done"
