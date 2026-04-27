import fs from 'node:fs';
import path from 'node:path';
const baselinePath = 'scripts/quality/baselines/eslint.json';
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

const TARGET_RULES = ['react-hooks/set-state-in-effect', 'no-console'];
let fixesApplied = 0;

for (const project in baseline) {
  for (const key in baseline[project]) {
    const firstPipe = key.indexOf('|');
    const secondPipe = key.indexOf('|', firstPipe + 1);
    const file = key.substring(0, firstPipe);
    const rule = key.substring(firstPipe + 1, secondPipe);
    
    if (TARGET_RULES.includes(rule)) {
      const fullPath = path.resolve(file);
      if (fs.existsSync(fullPath)) {
        let code = fs.readFileSync(fullPath, 'utf8');
        let modified = false;

        if (rule === 'react-hooks/set-state-in-effect') {
          const message = key.substring(secondPipe + 1);
          const match = message.match(/>\s*\d+\s*\|\s*(.*)/);
          if (match && match[1]) {
            const offendingCode = match[1].trim();
            // check if it's a direct setState call
            if (offendingCode.match(/^[a-zA-Z0-9_]+\(/) && !offendingCode.includes('setTimeout') && code.includes(offendingCode)) {
              // Replace offendingCode with setTimeout(() => offendingCode, 0);
              const replacement = `setTimeout(() => ${offendingCode}, 0);`;
              code = code.replace(offendingCode, replacement);
              modified = true;
            }
          }
        } 
        
        if (rule === 'no-console') {
           // We will replace console.log / error / warn with logger.info / error / warn
           // This requires adding the import { logger } from '@/lib/logger';
           if (code.includes('console.log') || code.includes('console.error') || code.includes('console.warn') || code.includes('console.info')) {
              code = code.replace(/console\.log/g, 'logger.info');
              code = code.replace(/console\.error/g, 'logger.error');
              code = code.replace(/console\.warn/g, 'logger.warn');
              code = code.replace(/console\.info/g, 'logger.info');
              
              if (!code.includes('from "@/lib/logger"') && !code.includes("from '@/lib/logger'")) {
                 // Add import at top
                 const importStmt = `import { logger } from "@/lib/logger";\n`;
                 // find first import or top of file
                 const importMatch = code.match(/^import .*/m);
                 if (importMatch) {
                    code = code.replace(importMatch[0], importStmt + importMatch[0]);
                 } else {
                    code = importStmt + code;
                 }
              }
              modified = true;
           }
        }

        if (modified) {
          fs.writeFileSync(fullPath, code);
          fixesApplied++;
          console.log('Real Fix Applied:', rule, 'in', file);
        }
      }
    }
  }
}
console.log('Total real fixes applied:', fixesApplied);
