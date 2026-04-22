# Quick Verification Script for BreakBreak AI Integration Fixes
# PowerShell version for Windows

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "BreakBreak AI - Integration Fixes Verification" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check 1: Environment file exists
Write-Host "✓ Checking environment configuration..." -ForegroundColor Green
if (Test-Path ".env.local") {
    Write-Host "  ✓ .env.local exists" -ForegroundColor Green
} else {
    Write-Host "  ✗ .env.local not found" -ForegroundColor Red
}

if (Test-Path ".env.example") {
    Write-Host "  ✓ .env.example exists" -ForegroundColor Green
} else {
    Write-Host "  ✗ .env.example not found" -ForegroundColor Red
}

# Check 2: Key files are modified
Write-Host ""
Write-Host "✓ Checking key files..." -ForegroundColor Green

$files = @{
    'services/geminiService.ts' = 'getAIInstance'
    'config.ts' = 'validateResponse'
    'vite.config.ts' = 'loadEnv'
}

foreach ($file in $files.GetEnumerator()) {
    if ((Test-Path $file.Name) -and (Select-String -Path $file.Name -Pattern $file.Value -Quiet)) {
        Write-Host "  ✓ $($file.Name) is properly configured" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $($file.Name) may need updates" -ForegroundColor Yellow
    }
}

# Check 3: Documentation files
Write-Host ""
Write-Host "✓ Checking documentation..." -ForegroundColor Green

$docs = @('README.md', 'INTEGRATION_GUIDE.md', 'FIXES_SUMMARY.md', 'DEPLOYMENT_STATUS.md')

foreach ($doc in $docs) {
    if (Test-Path $doc) {
        Write-Host "  ✓ $doc exists" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $doc not found" -ForegroundColor Yellow
    }
}

# Check 4: Dependencies installed
Write-Host ""
Write-Host "✓ Checking dependencies..." -ForegroundColor Green

if (Test-Path "node_modules") {
    Write-Host "  ✓ Dependencies installed (node_modules exists)" -ForegroundColor Green
} else {
    Write-Host "  ✗ Dependencies not installed" -ForegroundColor Red
    Write-Host "     Run: npm install" -ForegroundColor Yellow
}

# Check 5: Build artifacts
Write-Host ""
Write-Host "✓ Checking build artifacts..." -ForegroundColor Green

if (Test-Path "dist") {
    Write-Host "  ✓ Build artifacts exist" -ForegroundColor Green
    if (Test-Path "dist\index.html") {
        Write-Host "  ✓ index.html built successfully" -ForegroundColor Green
    }
} else {
    Write-Host "  ✗ Build artifacts not found" -ForegroundColor Yellow
    Write-Host "     Run: npm run build" -ForegroundColor Yellow
}

# Check 6: Configuration files
Write-Host ""
Write-Host "✓ Checking configuration files..." -ForegroundColor Green

if (Test-Path "tsconfig.json") {
    Write-Host "  ✓ tsconfig.json exists" -ForegroundColor Green
}

if (Test-Path "vite.config.ts") {
    Write-Host "  ✓ vite.config.ts exists" -ForegroundColor Green
}

if (Test-Path "package.json") {
    Write-Host "  ✓ package.json exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Verification Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. npm install          (if not done)" -ForegroundColor Cyan
Write-Host "  2. npm run dev          (start development server)" -ForegroundColor Cyan
Write-Host "  3. npm run build        (build for production)" -ForegroundColor Cyan
Write-Host ""
Write-Host "For more information, see:" -ForegroundColor Yellow
Write-Host "  - README.md              (Getting started)" -ForegroundColor Cyan
Write-Host "  - INTEGRATION_GUIDE.md   (API endpoints & integration)" -ForegroundColor Cyan
Write-Host "  - DEPLOYMENT_STATUS.md   (Current status)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
