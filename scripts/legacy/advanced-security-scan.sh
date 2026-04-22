#!/bin/bash

# ===================================================================
# Advanced Security Scanner - الفاحص الأمني المتقدم
# ===================================================================
# فحص شامل للمشروع بالكامل (ليس فقط الملفات المُرحلة)
# Comprehensive scan of the entire project (not just staged files)
# ===================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_message "$BLUE" "
╔═══════════════════════════════════════════════════════════════╗
║              🛡️  Advanced Security Scanner                   ║
║                الفاحص الأمني المتقدم                        ║
╚═══════════════════════════════════════════════════════════════╝
"

ISSUES_FOUND=0
WARNINGS_FOUND=0

# ===================================================================
# 1. Scan entire git history for secrets
# ===================================================================
print_message "$YELLOW" "🔍 Scanning git history for leaked secrets..."

# Check last 50 commits for potential secrets
git log --oneline -50 | while read commit; do
    commit_hash=$(echo "$commit" | cut -d' ' -f1)
    commit_msg=$(echo "$commit" | cut -d' ' -f2-)
    
    # Check commit message
    if echo "$commit_msg" | grep -iE "(password|secret|key|token|credential|api)" >/dev/null; then
        print_message "$YELLOW" "⚠️  Suspicious commit message: $commit_hash - $commit_msg"
        WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
    fi
done

# ===================================================================
# 2. Check for secrets in all tracked files
# ===================================================================
print_message "$YELLOW" "🔍 Scanning all tracked files for secrets..."

# High-risk secret patterns
HIGH_RISK_PATTERNS=(
    "password\s*[:=]\s*['\"][^'\"]{8,}['\"]"
    "secret\s*[:=]\s*['\"][^'\"]{8,}['\"]"
    "api_key\s*[:=]\s*['\"][^'\"]{20,}['\"]"
    "private_key\s*[:=]\s*['\"]-----BEGIN"
    "database_url\s*[:=]\s*['\"]postgresql://[^@]+:[^@]+@"
    "mongodb://[^:]+:[^@]+@"
    "redis://[^:]+:[^@]+@"
    "mysql://[^:]+:[^@]+@"
    "AKIA[0-9A-Z]{16}"
    "AIza[0-9A-Za-z_-]{35}"
    "sk-[a-zA-Z0-9]{48}"
    "xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}"
    "ghp_[a-zA-Z0-9]{36}"
)

# Get all tracked files (excluding binary files)
git ls-files | while read file; do
    if [ -f "$file" ] && file "$file" | grep -q "text"; then
        for pattern in "${HIGH_RISK_PATTERNS[@]}"; do
            if grep -iE "$pattern" "$file" >/dev/null 2>&1; then
                print_message "$RED" "❌ HIGH RISK SECRET in $file:"
                grep -iE --color=always "$pattern" "$file" | head -2
                ISSUES_FOUND=$((ISSUES_FOUND + 1))
            fi
        done
    fi
done

# ===================================================================
# 3. Check for weak configurations
# ===================================================================
print_message "$YELLOW" "🔍 Checking for weak security configurations..."

# Check for weak configurations in common config files
CONFIG_FILES=(
    "package.json"
    "tsconfig.json"
    "next.config.js"
    "next.config.mjs"
    ".eslintrc*"
    "webpack.config.js"
    "vite.config.js"
    "docker-compose.yml"
    "Dockerfile"
)

for config_file in "${CONFIG_FILES[@]}"; do
    if [ -f "$config_file" ]; then
        # Check for development mode in production configs
        if grep -iE "(debug.*true|development.*true|NODE_ENV.*development)" "$config_file" >/dev/null 2>&1; then
            print_message "$YELLOW" "⚠️  Development settings found in $config_file"
            WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
        fi
        
        # Check for disabled security features
        if grep -iE "(ssl.*false|https.*false|secure.*false|verify.*false)" "$config_file" >/dev/null 2>&1; then
            print_message "$YELLOW" "⚠️  Disabled security features in $config_file"
            WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
        fi
    fi
done

# ===================================================================
# 4. Check for exposed ports and services
# ===================================================================
print_message "$YELLOW" "🔍 Checking for exposed ports and services..."

# Check docker-compose files for exposed ports
if [ -f "docker-compose.yml" ]; then
    if grep -E "ports:" docker-compose.yml >/dev/null; then
        print_message "$BLUE" "📋 Exposed ports found in docker-compose.yml:"
        grep -A 2 "ports:" docker-compose.yml
    fi
fi

# Check for common development ports in code
COMMON_DEV_PORTS=(
    "3000"
    "3001"
    "5000"
    "8000"
    "8080"
    "9000"
)

for port in "${COMMON_DEV_PORTS[@]}"; do
    if git ls-files | xargs grep -l "localhost:$port\|127.0.0.1:$port" 2>/dev/null; then
        print_message "$BLUE" "📋 Development port $port found in code"
    fi
done

# ===================================================================
# 5. Check for outdated dependencies with known vulnerabilities
# ===================================================================
print_message "$YELLOW" "🔍 Checking for potentially vulnerable dependencies..."

if [ -f "package.json" ]; then
    # Check for very old versions of common packages
    OLD_PACKAGES=(
        "express.*[\"']4\.[0-9]\."
        "react.*[\"']16\."
        "lodash.*[\"']4\.[0-9]\."
        "moment.*[\"']2\.[0-9]\."
        "jquery.*[\"'][12]\."
    )
    
    for pattern in "${OLD_PACKAGES[@]}"; do
        if grep -E "$pattern" package.json >/dev/null 2>&1; then
            print_message "$YELLOW" "⚠️  Potentially outdated package found:"
            grep -E --color=always "$pattern" package.json
            WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
        fi
    done
fi

# ===================================================================
# 6. Check for insecure HTTP URLs
# ===================================================================
print_message "$YELLOW" "🔍 Checking for insecure HTTP URLs..."

git ls-files | xargs grep -l "http://[^localhost]" 2>/dev/null | while read file; do
    print_message "$YELLOW" "⚠️  Insecure HTTP URL found in $file:"
    grep --color=always "http://[^localhost]" "$file" | head -2
    WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
done

# ===================================================================
# 7. Generate security report
# ===================================================================
print_message "$YELLOW" "📝 Generating security report..."

REPORT_FILE="security-report-$(date +%Y%m%d-%H%M%S).md"

cat > "$REPORT_FILE" << EOF
# Security Scan Report
**Generated:** $(date)
**Project:** $(basename "$(pwd)")

## Summary
- **Critical Issues:** $ISSUES_FOUND
- **Warnings:** $WARNINGS_FOUND

## Recommendations

### High Priority
- [ ] Review and remove any hardcoded secrets
- [ ] Ensure all sensitive data uses environment variables
- [ ] Update outdated dependencies with known vulnerabilities

### Medium Priority
- [ ] Enable HTTPS for all external URLs
- [ ] Review exposed ports and services
- [ ] Update development configurations for production

### Low Priority
- [ ] Clean up development-related TODOs
- [ ] Review commit messages for sensitive information

## Files Scanned
$(git ls-files | wc -l) files scanned

## Next Steps
1. Address critical issues immediately
2. Plan updates for warnings
3. Set up automated security scanning in CI/CD
4. Regular security audits (monthly)

---
*Generated by Advanced Security Scanner*
EOF

print_message "$GREEN" "📄 Security report saved to: $REPORT_FILE"

# ===================================================================
# Final Results
# ===================================================================
print_message "$BLUE" "
╔═══════════════════════════════════════════════════════════════╗
║                    📊 Final Results                           ║
╚═══════════════════════════════════════════════════════════════╝
"

if [ $ISSUES_FOUND -eq 0 ] && [ $WARNINGS_FOUND -eq 0 ]; then
    print_message "$GREEN" "✅ Excellent! No security issues found."
elif [ $ISSUES_FOUND -eq 0 ]; then
    print_message "$YELLOW" "⚠️  $WARNINGS_FOUND warning(s) found - consider addressing them."
    print_message "$GREEN" "✅ No critical security issues."
else
    print_message "$RED" "❌ $ISSUES_FOUND critical issue(s) found!"
    print_message "$YELLOW" "⚠️  $WARNINGS_FOUND warning(s) also found."
    print_message "$RED" "🚨 Please address critical issues immediately!"
fi

print_message "$BLUE" "
📋 Commands to run:
   ./scripts/security-scan.sh          # Quick scan (pre-commit)
   ./scripts/advanced-security-scan.sh # Full project scan
   
📖 Report: $REPORT_FILE
"