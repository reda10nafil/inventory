try {
  if (Test-Path "C:\inv") { Remove-Item "C:\inv" -Force -ErrorAction SilentlyContinue; Write-Host "removed old C:\inv" }
  # Try junction
  New-Item -ItemType Junction -Path "C:\inv" -Target "C:\Users\Primo\Desktop\inventory" -ErrorAction Stop
  Write-Host "junction ok"
  Get-ChildItem -Path "C:\inv" | Select-Object -First 5 Name | ForEach-Object { Write-Host $_.Name }
} catch {
  Write-Host "junction failed: $($_.Exception.Message)"
  Write-Host "try subst"
  try {
    subst X: "C:\Users\Primo\Desktop\inventory" 2>&1 | Out-String | Write-Host
    Write-Host "subst X: done"
    Get-PSDrive X | Out-String | Write-Host
  } catch {
    Write-Host "subst failed: $($_.Exception.Message)"
  }
}
try {
  New-Item -Path "C:\Users\Primo\inv" -ItemType Directory -Force | Out-Null
  Write-Host "created C:\Users\Primo\inv"
} catch {
  Write-Host "create Primo inv failed: $($_.Exception.Message)"
}
