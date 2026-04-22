#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';

// طباعة إضافية لسهولة التتبع
console.log('🔍 Starting duplicate exports checker...');

/**
 * Parse JavaScript/TypeScript code to find duplicate exports
 */
function parseCodeForExports(code, filename) {
    console.log(`📁 Parsing file: ${filename}`);
    
    const exports = new Map();
    const errors = [];
    const warnings = [];
    
    try {
        // Simple regex-based parsing to avoid external dependencies
        // Find export statements
        const exportPatterns = [
            /export\s+(\w+)\s+(\w+)/g,           // export const function
            /export\s+(\w+)\s*=\s*(\w+)/g,       // export const = 
            /export\s+(?:default\s+)?(\w+)/g,    // export default or named
            /export\s*\{([^}]+)\}/g,             // export { ... }
            /module\.exports\s*=\s*\{([^}]+)\}/g // CommonJS exports
        ];
        
        // Check named exports
        const namedExportRegex = /export\s+(?:const|let|var|function)\s+(\w+)|export\s+(?:default\s+)?(\w+)/g;
        let match;
        
        while ((match = namedExportRegex.exec(code)) !== null) {
            const exportName = match[1] || match[2];
            if (exportName) {
                if (exports.has(exportName)) {
                    const existing = exports.get(exportName);
                    errors.push({
                        type: 'DUPLICATE_EXPORT',
                        message: `Duplicate export '${exportName}' found in ${filename}`,
                        exportName,
                        firstOccurrence: existing,
                        secondOccurrence: { filename, line: match.index }
                    });
                } else {
                    exports.set(exportName, { filename, line: match.index });
                }
            }
        }
        
        // Check export objects
        const exportObjectRegex = /export\s*\{([^}]+)\}/g;
        while ((match = exportObjectRegex.exec(code)) !== null) {
            const exportsList = match[1].split(',').map(item => item.trim());
            
            exportsList.forEach(exportName => {
                // Remove 'as' alias syntax
                const nameParts = exportName.split(/\s+as\s+/);
                const actualName = nameParts[nameParts.length - 1];
                
                if (exports.has(actualName)) {
                    const existing = exports.get(actualName);
                    errors.push({
                        type: 'DUPLICATE_EXPORT',
                        message: `Duplicate export '${actualName}' found in export object in ${filename}`,
                        exportName: actualName,
                        firstOccurrence: existing,
                        secondOccurrence: { filename, line: match.index }
                    });
                } else {
                    exports.set(actualName, { filename, line: match.index });
                }
            });
        }
        
        // Check CommonJS exports
        const commonJSRegex = /module\.exports\s*=\s*\{([^}]+)\}/g;
        while ((match = commonJSRegex.exec(code)) !== null) {
            const exportsList = match[1].split(',').map(item => item.trim());
            
            exportsList.forEach(exportName => {
                const nameParts = exportName.split(':\s*');
                const actualName = nameParts[0].trim();
                
                if (exports.has(actualName)) {
                    const existing = exports.get(actualName);
                    errors.push({
                        type: 'DUPLICATE_EXPORT',
                        message: `Duplicate export '${actualName}' found in CommonJS exports in ${filename}`,
                        exportName: actualName,
                        firstOccurrence: existing,
                        secondOccurrence: { filename, line: match.index }
                    });
                } else {
                    exports.set(actualName, { filename, line: match.index });
                }
            });
        }
        
    } catch (parseError) {
        errors.push({
            type: 'PARSE_ERROR',
            message: `Failed to parse ${filename}: ${parseError.message}`,
            filename,
            error: parseError
        });
    }
    
    return { exports, errors, warnings };
}

/**
 * Recursively find JavaScript/TypeScript files
 */
async function findJSFiles(dir, patterns = []) {
    const jsFiles = [];
    
    try {
        const entries = await readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            
            if (entry.isDirectory()) {
                // Skip node_modules and common ignored directories
                if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
                    jsFiles.push(...await findJSFiles(fullPath, patterns));
                }
            } else if (entry.isFile()) {
                const ext = extname(entry.name);
                if (['.js', '.jsx', '.ts', '.tsx', '.mjs'].includes(ext)) {
                    jsFiles.push(fullPath);
                }
            }
        }
    } catch (error) {
        console.warn(`⚠️  Failed to read directory ${dir}: ${error.message}`);
    }
    
    return jsFiles;
}

/**
 * Main execution
 */
async function main() {
    const { values, positionals } = parseArgs({
        options: {
            help: { type: 'boolean', default: false },
            fix: { type: 'boolean', default: false },
            output: { type: 'string', default: 'console' },
            pattern: { type: 'string', multiple: true, default: ['src/**/*.{js,jsx,ts,tsx,mjs}'] }
        },
        allowPositionals: true
    });

    if (values.help) {
        console.log(`
🔍 ESLint Duplicate Exports Checker

Usage:
  node check-duplicate-exports.mjs [options] [files...]

Options:
  --help           Show this help message
  --fix            Auto-fix duplicate exports (not implemented yet)
  --output <type>  Output format: console, json (default: console)
  --pattern <glob> File pattern to search (can be used multiple times)

Examples:
  node check-duplicate-exports.mjs
  node check-duplicate-exports.mjs --output json src/utils.ts src/helpers.ts
  node check-duplicate-exports.mjs --pattern "src/**/*.js" --pattern "src/**/*.ts"
        `);
        process.exit(0);
    }

    const targetFiles = positionals.length > 0 ? positionals : await findJSFiles('src', values.pattern);
    
    console.log(`📋 Scanning ${targetFiles.length} files...`);
    
    const allErrors = [];
    const summary = {
        totalFiles: targetFiles.length,
        filesWithErrors: 0,
        totalDuplicates: 0
    };

    for (const file of targetFiles) {
        try {
            const code = await readFile(file, 'utf8');
            const result = parseCodeForExports(code, file);
            
            if (result.errors.length > 0) {
                summary.filesWithErrors++;
                allErrors.push(...result.errors);
            }
            
            // Show file progress
            console.log(`  ✅ Processed: ${file}`);
            
        } catch (error) {
            console.error(`❌ Failed to read file ${file}: ${error.message}`);
            allErrors.push({
                type: 'FILE_READ_ERROR',
                message: `Failed to read ${file}: ${error.message}`,
                filename: file,
                error
            });
        }
    }

    summary.totalDuplicates = allErrors.length;

    // Output results
    if (values.output === 'json') {
        console.log(JSON.stringify({
            summary,
            errors: allErrors,
            timestamp: new Date().toISOString()
        }, null, 2));
    } else {
        console.log('\n📊 Results Summary:');
        console.log(`   Total files scanned: ${summary.totalFiles}`);
        console.log(`   Files with errors: ${summary.filesWithErrors}`);
        console.log(`   Total duplicates found: ${summary.totalDuplicates}`);
        
        if (allErrors.length > 0) {
            console.log('\n❌ Duplicate Exports Found:');
            allErrors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error.message}`);
                if (error.firstOccurrence) {
                    console.log(`      First: ${error.firstOccurrence.filename} (line ${error.firstOccurrence.line})`);
                }
                console.log(`      File: ${error.filename}`);
            });
            
            console.log('\n💡 To fix these issues:');
            console.log('   - Remove duplicate exports');
            console.log('   - Use unique export names');
            console.log('   - Consider using aliases if needed');
            
            // Exit with error code if duplicates found
            process.exit(1);
        } else {
            console.log('\n✅ No duplicate exports found!');
        }
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
}

export { parseCodeForExports, findJSFiles };