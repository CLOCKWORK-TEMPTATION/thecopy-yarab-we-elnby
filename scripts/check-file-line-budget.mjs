import fs from 'fs';
import path from 'path';

const MAX_LINES = 500;
const IGNORE_DIRS = ['node_modules', '.next', 'dist', 'build', 'coverage'];
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];

// Read the TARGET_FILES from measure.sh script output
const TARGET_FILES = [
  "apps/web/src/app/(main)/arabic-prompt-engineering-studio/page.tsx",
  "apps/web/src/app/(main)/actorai-arabic/components/VoiceCoach.tsx",
  "apps/web/src/app/(main)/BREAKAPP/(authenticated)/director/orders-live/page.tsx",
  "apps/web/scripts/cinematography/run-integration-tests.ts",
  "apps/web/src/lib/ai/core/models/station-types.ts",
  "apps/backend/src/test/security.comprehensive.test.ts",
  "apps/web/src/app/(main)/cinematography-studio/hooks/usePostProduction.ts",
  "apps/web/src/app/(main)/cinematography-studio/hooks/useProduction.ts",
  "apps/backend/src/middleware/waf.middleware.test.ts",
  "apps/web/src/app/(main)/editor/src/suspicion-engine/detectors/contract/contract-detectors.test.ts",
  "apps/web/src/app/(main)/art-director/plugins/mr-previz-studio/index.ts",
  "apps/web/src/lib/drama-analyst/services/webVitalsService.ts",
  "apps/web/src/lib/ai/constitutional/multi-agent-debate.ts",
  "apps/backend/editor-runtime/services/suspicion-review-probe.mjs",
  "apps/web/src/app/(main)/art-director/components/Tools.tsx",
  "apps/web/src/lib/drama-analyst/agents/sceneGenerator/SceneGeneratorAgent.ts",
  "apps/web/src/workers/particle-generator.worker.ts",
  "apps/web/src/app/(main)/cinematography-studio/components/tools/PostProductionTools.tsx",
  "apps/backend/src/modules/art-director/plugins/mr-previz-studio/index.ts",
  "apps/web/src/app/(main)/cinematography-studio/components/tools/LensSimulatorTool.tsx",
  "apps/web/src/mcp/ocr-arabic-pdf-to-txt-pipeline-server/mistral-ocr-client.ts",
  "apps/backend/src/services/agents/sceneGenerator/SceneGeneratorAgent.ts",
  "apps/backend/editor-runtime/suspicion-review.mjs",
  "apps/web/src/app/(main)/editor/src/extensions/retroactive-corrector.ts",
  "apps/backend/src/services/cache.service.ts",
  "apps/backend/src/services/budget.service.ts",
  "apps/backend/src/ocr-arabic-pdf-to-txt-pipeline/mcp-server/mistral-ocr-client.ts",
  "apps/web/src/app/(main)/actorai-arabic/types/index.ts",
  "apps/web/src/lib/ai/stations/network-diagnostics.ts",
  "apps/web/src/app/(main)/art-director/plugins/virtual-set-editor/index.ts",
  "apps/web/src/app/(main)/development/hooks/useCreativeDevelopment.test.ts",
  "apps/web/src/app/(main)/editor/server/ai-context-gemini.mjs",
  "apps/backend/editor-runtime/ai-context-gemini.mjs",
  "apps/web/src/app/(main)/editor/src/utils/file-import/document-model.ts",
  "apps/web/src/app/(main)/editor/src/components/app-shell/AppHeader.tsx"
];

let failed = false;
const tableData = [];

function checkFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').length;
  if (lines > MAX_LINES) {
    tableData.push({ File: filePath, Lines: lines });
    failed = true;
  }
}

// We just check the specific target files instead of walking the whole dir tree
// Because the user provided the list of specific target files.
for (const file of TARGET_FILES) {
  checkFile(file);
}

if (failed) {
  console.log('The following files exceed the maximum line limit (' + MAX_LINES + '):\n');
  console.table(tableData);
  process.exit(1);
} else {
  console.log('All files are within the budget!');
}
