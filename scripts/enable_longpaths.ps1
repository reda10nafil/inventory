try {
  $val = Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -ErrorAction SilentlyContinue
  Write-Host "before: $($val.LongPathsEnabled)"
  Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -ErrorAction Stop
  Write-Host "set ok"
  $val2 = Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled"
  Write-Host "after: $($val2.LongPathsEnabled)"
} catch {
  Write-Host "set failed: $($_.Exception.Message)"
}
