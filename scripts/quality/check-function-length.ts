import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface FunctionInfo {
  file: string;
  name: string;
  lineStart: number;
  lineEnd: number;
  lines: number;
}

const MAX_LINES = 120;

function countLines(text: string): number {
  return text.split('\n').length;
}

function extractFunctions(content: string, filePath: string): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  const lines = content.split('\n');
  let currentFunction: { name: string; lineStart: number; lineEnd: number } | null = null;
  let braceCount = 0;
  let inFunction = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect function start
    if (!inFunction && (trimmed.match(/^function\s+\w+/) || 
        trimmed.match(/^const\s+\w+\s*=\s*(?:async\s+)?\(/) ||
        trimmed.match(/^export\s+(?:const|function)\s+\w+/) ||
        trimmed.match(/^\w+\s*\([^)]*\)\s*(?:=>\s*)?(?:\{|$)/))) {
      
      const match = trimmed.match(/(?:function|const|export)\s+(\w+)/);
      if (match) {
        currentFunction = { name: match[1], lineStart: i + 1, lineEnd: i + 1 };
        inFunction = true;
        braceCount = 0;
      }
    }

    // Count braces
    if (inFunction) {
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      braceCount += openBraces - closeBraces;

      if (braceCount === 0 && inFunction && currentFunction) {
        currentFunction.lineEnd = i + 1;
        const linesCount = currentFunction.lineEnd - currentFunction.lineStart + 1;
        
        if (linesCount > MAX_LINES) {
          functions.push({
            file: filePath,
            name: currentFunction.name,
            lineStart: currentFunction.lineStart,
            lineEnd: currentFunction.lineEnd,
            lines: linesCount,
          });
        }
        
        inFunction = false;
        currentFunction = null;
      }
    }
  }

  return functions;
}

function scanDirectory(dir: string, extensions: string[]): FunctionInfo[] {
  let allFunctions: FunctionInfo[] = [];

  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory() && 
        !entry.name.startsWith('.') && 
        entry.name !== 'node_modules' &&
        entry.name !== '.next' &&
        entry.name !== 'dist' &&
        entry.name !== 'build') {
      allFunctions = allFunctions.concat(scanDirectory(fullPath, extensions));
    } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
      try {
        const content = readFileSync(fullPath, 'utf-8');
        const functions = extractFunctions(content, fullPath);
        allFunctions = allFunctions.concat(functions);
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }

  return allFunctions;
}

const webDir = join(process.cwd(), 'apps', 'web', 'src');
const longFunctions = scanDirectory(webDir, ['.ts', '.tsx']);

if (longFunctions.length > 0) {
  console.error(`\n❌ Found ${longFunctions.length} functions exceeding ${MAX_LINES} lines:\n`);
  
  longFunctions.forEach(fn => {
    console.error(`  ${fn.file}:${fn.lineStart}`);
    console.error(`    Function: ${fn.name}`);
    console.error(`    Lines: ${fn.lines} (max: ${MAX_LINES})`);
    console.error('');
  });
  
  process.exit(1);
} else {
  console.log(`✅ All functions are within ${MAX_LINES} lines limit`);
  process.exit(0);
}
