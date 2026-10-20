$log = "C:\Users\Primo\Desktop\inventory\run_android.log"
$err = "C:\Users\Primo\Desktop\inventory\run_android_err.log"
Remove-Item $log,$err -ErrorAction SilentlyContinue
Write-Host "Starting npx expo run:android..."
$p = Start-Process -FilePath "npx.cmd" -ArgumentList "expo","run:android","--device","emulator-5554" -PassThru -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $err
Write-Host "pid: $($p.Id)"
for ($i=0; $i -lt 12; $i++) {
  Start-Sleep -Seconds 10
  Write-Host "--- tick $i (10s x $i) ---"
  if (Test-Path $log) { Get-Content $log | Select-Object -Last 20 | ForEach-Object { Write-Host $_ } }
  if (Test-Path $err) { Get-Content $err | Select-Object -Last 10 | ForEach-Object { Write-Host "ERR: $_" } }
  $running = Get-Process -Id $p.Id -ErrorAction SilentlyContinue
  if (-not $running) { Write-Host "process exited"; break }
  # check if app installed
  $pkgs = & "C:\Users\Primo\AppData\Local\Android\Sdk\platform-tools\adb.exe" -s emulator-5554 shell pm list packages | Select-String -Pattern "syncro|redako"
  if ($pkgs) { Write-Host "FOUND PKG: $pkgs"; break }
}
Write-Host "--- final log tail ---"
if (Test-Path $log) { Get-Content $log | Select-Object -Last 80 | ForEach-Object { Write-Host $_ } }
Write-Host "--- devices ---"
& "C:\Users\Primo\AppData\Local\Android\Sdk\platform-tools\adb.exe" devices
# don't kill yet, let build continue if still running
$running = Get-Process -Id $p.Id -ErrorAction SilentlyContinue
if ($running) { Write-Host "build still running pid $($p.Id), not killing" } else { Write-Host "build finished" }
