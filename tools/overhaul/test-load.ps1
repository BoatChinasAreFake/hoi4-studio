# Installs the overhaul mod, launches HOI4 in debug mode with only that mod enabled, waits for loading to settle,
# prints a grouped summary of error.log, then closes the game and restores the launcher's mod list.
# Do not pipe this script into Select-Object -First: stopping the pipeline early skips the restore step.
param([string]$Mod = 'ashen_concord', [int]$MaxSeconds = 240, [int]$Top = 40)
$g = "C:\Program Files (x86)\Steam\steamapps\common\Hearts of Iron IV"
$d = "$env:USERPROFILE\Documents\Paradox Interactive\Hearts of Iron IV"
$src = "$env:USERPROFILE\hoi4-studio-src\repo\mods"
$orig = "$env:USERPROFILE\hoi4-studio-src\logs_before\dlc_load.original.json"
if (-not (Test-Path $orig)) { Copy-Item "$d\dlc_load.json" $orig -Force }
Stop-Process -Name hoi4 -Force -ErrorAction SilentlyContinue
try {
  Remove-Item "$d\mod\$Mod" -Recurse -Force -ErrorAction SilentlyContinue
  Copy-Item "$src\$Mod" "$d\mod\$Mod" -Recurse -Force
  Copy-Item "$src\$Mod.mod" "$d\mod\$Mod.mod" -Force
  Set-Content "$d\dlc_load.json" -Value ('{"enabled_mods":["mod/' + $Mod + '.mod"],"disabled_dlcs":[]}') -NoNewline
  $p = Start-Process -FilePath "$g\hoi4.exe" -WorkingDirectory $g -ArgumentList '-debug' -PassThru
  $last = 0
  for ($i = 0; $i -lt ($MaxSeconds / 5); $i++) {
    Start-Sleep -Seconds 5
    if ($p.HasExited) { "game exited with code $($p.ExitCode) after $(($i + 1) * 5)s"; break }
    $s = (Get-Item "$d\logs\error.log").Length
    if ($s -eq $last -and $i -gt 8) { "log stable after $(($i + 1) * 5)s"; break }
    $last = $s
  }
  $lines = Get-Content "$d\logs\error.log"
  "error.log lines: $($lines.Count)"
  $grouped = $lines | ForEach-Object { ($_ -replace '^\[[^\]]*\]\[[^\]]*\]:\s*', '' -replace '\d+', 'N' -replace '"[^"]*"', '"X"') -replace '^(.{0,150}).*', '$1' } | Group-Object | Sort-Object Count -Descending | Select-Object -First $Top
  ($grouped | ForEach-Object { "{0,6}  {1}" -f $_.Count, $_.Name }) -join "`n"
  $crash = Get-ChildItem "$d\crashes" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime | Select-Object -Last 1
  "latest crash folder: $($crash.Name) $($crash.LastWriteTime)"
  "--- game.log tail"
  (Get-Content "$d\logs\game.log" -Tail 6) -join "`n"
  "--- setup.log tail"
  (Get-Content "$d\logs\setup.log" -Tail 6) -join "`n"
}
finally {
  Stop-Process -Name hoi4 -Force -ErrorAction SilentlyContinue
  Start-Sleep 2
  Copy-Item $orig "$d\dlc_load.json" -Force
  "restored launcher mod list: $(Get-Content "$d\dlc_load.json")"
}
