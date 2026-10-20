$env:ANDROID_HOME = "C:\Users\Primo\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Users\Primo\AppData\Local\Android\Sdk"
$log = "C:\Users\Primo\Desktop\inventory\gradle_build_job.log"
Remove-Item $log -ErrorAction SilentlyContinue
Write-Host "Starting gradle via Start-Job..."
$job = Start-Job -ScriptBlock {
  Set-Location "C:\Users\Primo\Desktop\inventory\android"
  $env:ANDROID_HOME = "C:\Users\Primo\AppData\Local\Android\Sdk"
  & ".\gradlew.bat" app:assembleDebug -x lint "-PreactNativeDevServerPort=8081" "-PreactNativeArchitectures=x86_64,arm64-v8a" 2>&1 | Out-File -FilePath "C:\Users\Primo\Desktop\inventory\gradle_build_job.log" -Encoding utf8
}
Write-Host "job $($job.Id) started state $($job.State)"
Start-Sleep -Seconds 10
Get-Job | Format-Table -AutoSize | Out-String | Write-Host
Receive-Job -Job $job -Keep | Select-Object -Last 30 | ForEach-Object { Write-Host $_ }
Write-Host "--- log size ---"
if (Test-Path $log) { (Get-Item $log).Length } else { Write-Host "no log yet" }
Write-Host "done start"
