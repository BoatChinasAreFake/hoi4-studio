# Rebuilds the overhaul with each replace_path group left vanilla (OVERHAUL_KEEP) and reports whether the game still crashes.
param([string[]]$Groups)
$repo = "$env:USERPROFILE\hoi4-studio-src\repo"
$d = "$env:USERPROFILE\Documents\Paradox Interactive\Hearts of Iron IV"
foreach ($g in $Groups) {
  Push-Location $repo
  $env:OVERHAUL_KEEP = $g
  npm run overhaul:build 2>&1 | Out-Null
  Remove-Item Env:OVERHAUL_KEEP
  Pop-Location
  $out = & "$repo\tools\overhaul\test-load.ps1" -Top 1 -MaxSeconds 150
  $first = ($out | Select-String 'exited|stable' | Select-Object -First 1).Line
  $reached = (Get-Content "$d\logs\game.log" -Tail 2) -join ' | '
  "KEEP=[$g] => $first :: $reached"
}
