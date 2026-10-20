$log = "C:\Users\Primo\Desktop\inventory\expo_start.log"
$err = "C:\Users\Primo\Desktop\inventory\expo_start_err.log"
Remove-Item $log,$err -ErrorAction SilentlyContinue
$p = Start-Process -FilePath "npx.cmd" -ArgumentList "expo","start","--android","--go","--port","8081" -PassThru -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $err
Write-Host "pid: $($p.Id)"
Start-Sleep -Seconds 25
Write-Host "---LOG---"
Get-Content $log -ErrorAction SilentlyContinue | Select-Object -Last 80 | ForEach-Object { Write-Host $_ }
Write-Host "---ERR---"
Get-Content $err -ErrorAction SilentlyContinue | Select-Object -Last 80 | ForEach-Object { Write-Host $_ }
& "C:\Users\Primo\AppData\Local\Android\Sdk\platform-tools\adb.exe" devices
Write-Host "---lines---"
if (Test-Path $log) { (Get-Content $log | Measure-Object -Line).Lines } else { Write-Host "no log" }
try { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue; Write-Host "stopped" } catch {}
