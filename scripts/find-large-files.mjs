import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const MAX_LINES = 500;

function countLines(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.split('\n').length;
    } catch (error) {
        return null;
    }
}

function findFiles(dir, extensions, maxDepth = 20) {
    const results = [];

    function walk(currentDir, currentDepth) {
        if (currentDepth > maxDepth) return;

        try {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);

                // Skip node_modules, .next, dist, build, coverage
                if (['node_modules', '.next', 'dist', 'build', 'coverage', '.git'].includes(entry.name)) {
                    continue;
                }

                if (entry.isDirectory()) {
                    walk(fullPath, currentDepth + 1);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    if (extensions.includes(ext)) {
                        const lines = countLines(fullPath);
                        if (lines !== null) {
                            results.push({
                                path: path.relative(rootDir, fullPath),
                                lines,
                                size: fs.statSync(fullPath).size
                            });
                        }
                    }
                }
            }
        } catch (error) {
            // Ignore permission errors
        }
    }

    walk(dir, 0);
    return results;
}

function main() {
    const allFiles = findFiles(rootDir, ['.ts', '.tsx', '.js', '.jsx', '.mjs']);

    // Sort by line count descending
    allFiles.sort((a, b) => b.lines - a.lines);

    // Filter files > MAX_LINES
    const largeFiles = allFiles.filter(f => f.lines > MAX_LINES);

    console.log(`\n📊 Total files scanned: ${allFiles.length}`);
    console.log(`📏 Files exceeding ${MAX_LINES} lines: ${largeFiles.length}\n`);

    if (largeFiles.length > 0) {
        console.log('='.repeat(80));
        console.log(`🚨 FILES EXCEEDING ${MAX_LINES} LINES:`);
        console.log('='.repeat(80));
        console.log();

        largeFiles.forEach((file, index) => {
            console.log(`${index + 1}. ${file.path}`);
            console.log(`   Lines: ${file.lines} (exceeds by ${file.lines - MAX_LINES})`);
            console.log(`   Size: ${(file.size / 1024).toFixed(2)} KB`);
            console.log();
        });
    }

    console.log('='.repeat(80));
    console.log(`📈 TOP 10 LARGEST FILES:`);
    console.log('='.repeat(80));
    console.log();

    const top10 = allFiles.slice(0, 10);
    top10.forEach((file, index) => {
        console.log(`${index + 1}. ${file.path}`);
        console.log(`   Lines: ${file.lines}`);
        console.log(`   Size: ${(file.size / 1024).toFixed(2)} KB`);
        console.log();
    });

    // Exit with error code if there are large files
    process.exit(largeFiles.length > 0 ? 1 : 0);
}

main();