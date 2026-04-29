@'
param(
  [string]$CsvPath = "",
  [switch]$DryRun,
  [switch]$Force
)

$embeddedCsv = @"
اسم الملف,المسار
apiService.test.ts,apps/web/src/lib/drama-analyst/services/
loggerService.test.ts,apps/web/src/lib/drama-analyst/services/
errorHandler.test.ts,apps/web/src/lib/drama-analyst/services/
result-normalizer.test.ts,apps/web/src/app/(main)/development/utils/
clean-source-build-artifacts.test.ts,apps/web/src/scripts/
WritingEditor.test.tsx,apps/web/src/app/(main)/arabic-creative-writing-studio/components/
animations.test.ts,apps/web/src/lib/
upgradedAgents.test.ts,apps/web/src/lib/drama-analyst/agents/
integration.test.tsx,apps/web/src/app/(main)/brain-storm-ai/src/components/features/__tests__/
ProjectTabs.test.tsx,apps/web/src/app/(main)/directors-studio/components/
progressive-surface-guards.test.ts,apps/web/src/app/(main)/editor/src/components/editor/
06-brainstorm-export.test.ts,apps/web/src/app/__regression__/
02-writing-studio.test.ts,apps/web/src/app/__regression__/
agent-reports-exporter.test.tsx,apps/web/src/components/
PlotPredictorAgent.test.ts,apps/web/src/lib/drama-analyst/agents/plotPredictor/
RhythmMappingAgent.test.ts,apps/web/src/lib/drama-analyst/agents/rhythmMapping/
TensionOptimizerAgent.test.ts,apps/web/src/lib/drama-analyst/agents/tensionOptimizer/
WorldBuilderAgent.test.ts,apps/web/src/lib/drama-analyst/agents/worldBuilder/
AdaptiveRewritingAgent.test.ts,apps/web/src/lib/drama-analyst/agents/adaptiveRewriting/
CharacterNetworkAgent.test.ts,apps/web/src/lib/drama-analyst/agents/characterNetwork/
sprint4-demo-vocal.test.tsx,apps/web/src/app/(main)/actorai-arabic/__tests__/
sprint3-complex-features.test.tsx,apps/web/src/app/(main)/actorai-arabic/__tests__/
integration.test-catalog-select.ts,apps/web/src/app/(main)/development/__tests__/
integration.test-task-results.ts,apps/web/src/app/(main)/development/__tests__/
page.test.tsx,apps/web/src/app/(main)/directors-studio/scenes/
page.test.tsx,apps/web/src/app/(main)/directors-studio/shots/
editor-clipboard.test.ts,apps/web/src/app/(main)/editor/src/utils/
test-suites.ts,apps/web/scripts/cinematography/
CreativeWritingStudio.test.tsx,apps/web/src/app/(main)/arabic-creative-writing-studio/__tests__/
integration.test.tsx,apps/web/src/app/(main)/art-director/__tests__/
export.test.ts,apps/web/src/app/(main)/brain-storm-ai/src/lib/
cinematography-config.integration.test.ts,apps/web/src/app/(main)/cinematography-studio/lib/__tests__/
ProjectContent.test.tsx,apps/web/src/app/(main)/directors-studio/components/
fileExtractor.test.ts,apps/web/src/app/(main)/directors-studio/helpers/__tests__/
"@

function Read-FileList {
  param([string]$Path)
  if ($Path -and (Test-Path $Path)) {
    return Import-Csv -Path $Path -Delimiter ',' -ErrorAction Stop
  } else {
    $tmp = [System.IO.Path]::GetTempFileName()
    Set-Content -Path $tmp -Value $embeddedCsv -Encoding UTF8
    return Import-Csv -Path $tmp -Delimiter ',' 
  }
}

$items = Read-FileList -Path $CsvPath

if (-not $items -or $items.Count -eq 0) {
  Write-Host "No entries found to process." -ForegroundColor Yellow
  exit 0
}

$toDelete = @()
foreach ($row in $items) {
  $name = $null
  $path = $null
  if ($row.PSObject.Properties.Name -contains 'اسم الملف') { $name = $row.'اسم الملف' }
  elseif ($row.PSObject.Properties.Name -contains 'filename') { $name = $row.filename }
  else { $name = $row | Select-Object -ExpandProperty * | Select-Object -First 1 }

  if ($row.PSObject.Properties.Name -contains 'المسار') { $path = $row.'المسار' }
  elseif ($row.PSObject.Properties.Name -contains 'path') { $path = $row.path }
  else { $path = $row | Select-Object -ExpandProperty * | Select-Object -Last 1 }

  if (-not $name) { continue }
  $path = $path -replace '/$',''
  $full = Join-Path -Path $path -ChildPath $name
  $toDelete += $full
}

Write-Host "Files listed:" $toDelete.Count

if ($DryRun) {
  Write-Host "DRY RUN mode. Showing status of each file:" -ForegroundColor Cyan
  foreach ($f in $toDelete) {
    if (Test-Path $f) { Write-Host "[FOUND] $f" } else { Write-Host "[MISSING] $f" -ForegroundColor DarkYellow }
  }
  exit 0
}

if (-not $Force) {
  $confirm = Read-Host "Proceed to delete the listed files? Type Y to confirm"
  if ($confirm -ne 'Y' -and $confirm -ne 'y') {
    Write-Host "Aborted by user." -ForegroundColor Yellow
    exit 0
  }
}

foreach ($f in $toDelete) {
  if (Test-Path $f) {
    try {
      Remove-Item -LiteralPath $f -Force -ErrorAction Stop
      Write-Host "Deleted:" $f -ForegroundColor Green
    } catch {
      Write-Host "Failed to delete:" $f -ForegroundColor Red
      Write-Host $_.Exception.Message -ForegroundColor Red
    }
  } else {
    Write-Host "Not found:" $f -ForegroundColor DarkYellow
  }
}

Write-Host "Done." -ForegroundColor Green
'@ | Set-Content -Path .\delete-files.ps1 -Encoding UTF8
