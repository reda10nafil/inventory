$src = "C:\Users\Primo\Desktop\inventory"
$dst = "C:\Users\Primo\a"
Write-Host "copy $src to $dst"
# Use robocopy with /E and exclude .git and .gradle
$args = @($src, $dst, "/E", "/XD", ".git", ".gradle", "build", ".cxx", "/NFL", "/NDL", "/NJH", "/R:1", "/W:1", "/MT:8")
Write-Host "robocopy $($args -join ' ')"
& robocopy @args 2>&1 | Select-Object -Last 30 | ForEach-Object { Write-Host $_ }
Write-Host "exit code: $LASTEXITCODE"
Get-ChildItem -Path $dst -Directory | Select-Object -First 10 Name | ForEach-Object { Write-Host $_.Name }
Write-Host "---expo-modules-core---"
Get-ChildItem -Path "$dst\node_modules\.pnpm\expo-modules-core*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 5 Name | ForEach-Object { Write-Host $_.Name }
Write-Host "done copy"
