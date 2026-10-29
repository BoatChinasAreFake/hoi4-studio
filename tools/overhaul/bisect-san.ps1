# Rebuilds with OVERHAUL_NOSAN set to each value (vanilla copies are not sanitized) and reports whether the game starts.
param([string[]]$Groups)
$repo = "$env:USERPROFILE\hoi4-studio-src\repo"
foreach ($g in $Groups) {
  Push-Location $repo; $env:OVERHAUL_NOSAN = $g; npm run overhaul:build 2>&1 | Out-Null; Remove-Item Env:OVERHAUL_NOSAN; Pop-Location
  $out = & "$repo\tools\overhaul\test-load.ps1" -Top 1 -MaxSeconds 150
  "NOSAN=[$g] => " + ($out | Select-String 'exited|stable' | Select-Object -First 1).Line
}
