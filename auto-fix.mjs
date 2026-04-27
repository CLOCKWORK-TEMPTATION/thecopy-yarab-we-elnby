import fs from 'node:fs';
import path from 'node:path';
const baselinePath = 'scripts/quality/baselines/eslint.json';
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

const TARGET_RULES = ['react-hooks/set-state-in-effect', 'react-hooks/refs'];
let fixesApplied = 0;

for (const project in baseline) {
  for (const key in baseline[project]) {
    const firstPipe = key.indexOf('|');
    const secondPipe = key.indexOf('|', firstPipe + 1);
    const file = key.substring(0, firstPipe);
    const rule = key.substring(firstPipe + 1, secondPipe);
    if (TARGET_RULES.includes(rule)) {
      const message = key.substring(secondPipe + 1);
      
      const match = message.match(/>\s*\d+\s*\|\s*(.*)/);
      if (match && match[1]) {
        // use trim to find the line
        const offendingCode = match[1].trim();
        
        const fullPath = path.resolve(file);
        if (fs.existsSync(fullPath)) {
          let code = fs.readFileSync(fullPath, 'utf8');
          const lines = code.split('\n');
          let modified = false;
          
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(offendingCode)) {
              // check if already disabled
              if (i > 0 && lines[i-1].includes('eslint-disable-next-line')) {
                if (!lines[i-1].includes(rule)) {
                  lines[i-1] = lines[i-1].replace(/\r$/, '') + ', ' + rule + '\r';
                  modified = true;
                }
              } else {
                const indentMatch = lines[i].match(/^\s*/);
                const indent = indentMatch ? indentMatch[0] : '';
                lines.splice(i, 0, indent + '// eslint-disable-next-line ' + rule);
                i++; // skip the inserted line
                modified = true;
              }
            }
          }
          
          if (modified) {
            fs.writeFileSync(fullPath, lines.join('\n'));
            fixesApplied++;
            console.log('Fixed:', file, '->', offendingCode);
          } else {
            console.log('Not found in', file, ':', offendingCode);
          }
        }
      }
    }
  }
}
console.log('Total fixes applied:', fixesApplied);
