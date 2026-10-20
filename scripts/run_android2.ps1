$log = "C:\Users\Primo\Desktop\inventory\run_android2.log"
$err = "C:\Users\Primo\Desktop\inventory\run_android2_err.log"
Remove-Item $log,$err -ErrorAction SilentlyContinue
Write-Host "Starting npx expo run:android (auto device)..."
$p = Start-Process -FilePath "npx.cmd" -ArgumentList "expo","run:android" -PassThru -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $err
Write-Host "pid: $($p.Id)"
for ($i=0; $i -lt 18; $i++) {
  Start-Sleep -Seconds 10
  Write-Host "--- tick $i (10s) ---"
  if (Test-Path $log) { Get-Content $log | Select-Object -Last 25 | ForEach-Object { Write-Host $_ } }
  if (Test-Path $err) { Get-Content $err | Select-Object -Last 10 | ForEach-Object { Write-Host "ERR: $_" } }
  $running = Get-Process -Id $p.Id -ErrorAction SilentlyContinue
  if (-not $running) { Write-Host "process exited"; break }
  $pkgs = & "C:\Users\Primo\AppData\Local\Android\Sdk\platform-tools\adb.exe" -s emulator-5554 shell pm list packages 2>$null | Select-String -Pattern "syncro|redako"
  if ($pkgs) { Write-Host "FOUND PKG: $pkgs"; }
}
Write-Host "--- final log tail ---"
if (Test-Path $log) { Get-Content $log | Select-Object -Last 100 | ForEach-Object { Write-Host $_ } }
Write-Host "--- err tail ---"
if (Test-Path $err) { Get-Content $err | Select-Object -Last 50 | ForEach-Object { Write-Host $_ } }
& "C:\Users\Primo\AppData\Local\Android\Sdk\platform-tools\adb.exe" devices
$running = Get-Process -Id $p.Id -ErrorAction SilentlyContinue
if ($running) { Write-Host "build still running pid $($p.Id)" } else { Write-Host "build finished" }
