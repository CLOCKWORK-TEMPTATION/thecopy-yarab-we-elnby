#!/bin/bash

# Quick Verification Script for BreakBreak AI Integration Fixes
# This script verifies that all fixes are in place

echo "═══════════════════════════════════════════════════════════════"
echo "BreakBreak AI - Integration Fixes Verification"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check 1: Environment file exists
echo "✓ Checking environment configuration..."
if [ -f ".env.local" ]; then
    echo "  ✓ .env.local exists"
else
    echo "  ✗ .env.local not found"
fi

if [ -f ".env.example" ]; then
    echo "  ✓ .env.example exists"
else
    echo "  ✗ .env.example not found"
fi

# Check 2: Key files are modified
echo ""
echo "✓ Checking key files..."
if grep -q "getAIInstance" services/geminiService.ts; then
    echo "  ✓ geminiService.ts has safe API initialization"
else
    echo "  ✗ geminiService.ts missing safety improvements"
fi

if grep -q "validateResponse" config.ts 2>/dev/null; then
    echo "  ✓ config.ts has validation utilities"
else
    echo "  ✗ config.ts missing or incomplete"
fi

if grep -q "isValidAPIKey" config.ts 2>/dev/null; then
    echo "  ✓ config.ts has API key validation"
else
    echo "  ✗ config.ts missing API validation"
fi

# Check 3: Documentation files
echo ""
echo "✓ Checking documentation..."
for doc in README.md INTEGRATION_GUIDE.md FIXES_SUMMARY.md DEPLOYMENT_STATUS.md; do
    if [ -f "$doc" ]; then
        echo "  ✓ $doc exists"
    else
        echo "  ✗ $doc not found"
    fi
done

# Check 4: Dependencies installed
echo ""
echo "✓ Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "  ✓ Dependencies installed (node_modules exists)"
else
    echo "  ✗ Dependencies not installed"
    echo "     Run: npm install"
fi

# Check 5: Build artifacts
echo ""
echo "✓ Checking build artifacts..."
if [ -d "dist" ]; then
    echo "  ✓ Build artifacts exist"
    if [ -f "dist/index.html" ]; then
        echo "  ✓ index.html built successfully"
    fi
else
    echo "  ✗ Build artifacts not found"
    echo "     Run: npm run build"
fi

# Check 6: TypeScript compilation
echo ""
echo "✓ Checking TypeScript configuration..."
if [ -f "tsconfig.json" ]; then
    echo "  ✓ tsconfig.json exists"
else
    echo "  ✗ tsconfig.json not found"
fi

# Check 7: Vite configuration
echo ""
echo "✓ Checking Vite configuration..."
if grep -q "loadEnv" vite.config.ts; then
    echo "  ✓ vite.config.ts properly loads environment"
else
    echo "  ✗ vite.config.ts missing environment setup"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "Verification Complete!"
echo ""
echo "Next steps:"
echo "  1. npm install          (if not done)"
echo "  2. npm run dev          (start development server)"
echo "  3. npm run build        (build for production)"
echo ""
echo "For more information, see:"
echo "  - README.md              (Getting started)"
echo "  - INTEGRATION_GUIDE.md   (API endpoints & integration)"
echo "  - DEPLOYMENT_STATUS.md   (Current status)"
echo "═══════════════════════════════════════════════════════════════"
