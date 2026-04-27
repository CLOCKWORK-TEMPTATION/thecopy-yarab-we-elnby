import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = readdirSync(dirPath);
  files.forEach(file => {
    const fullPath = join(dirPath, file);
    if (statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.next', 'dist', 'build', 'coverage'].includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(extname(file))) {
        arrayOfFiles.push(fullPath);
      }
    }
  });
  return arrayOfFiles;
}

const rootDir = process.cwd();
let files = [];
try {
  files = files.concat(getAllFiles(join(rootDir, 'apps')));
} catch (e) {}
try {
  files = files.concat(getAllFiles(join(rootDir, 'packages')));
} catch (e) {}

let violations = [];
files.forEach(file => {
  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n').length;
  if (lines > 500) {
    violations.push({ file, lines });
  }
});

if (violations.length > 0) {
  console.log('Files exceeding 500 lines:');
  violations.forEach(v => console.log(`${v.lines}\t${v.file}`));
  process.exit(1);
} else {
  console.log('All files are within 500 lines.');
}