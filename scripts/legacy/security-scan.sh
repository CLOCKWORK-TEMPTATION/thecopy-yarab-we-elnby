#!/bin/bash

# ===================================================================
# Security Scanner - فاحص الأمان التلقائي
# ===================================================================
# يتم تشغيله تلقائياً مع كل commit للتأكد من عدم وجود تسريبات أمنية
# Automatically runs with every commit to ensure no security leaks
# ===================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_message "$BLUE" "
╔═══════════════════════════════════════════════════════════════╗
║                    🔒 Security Scanner                        ║
║                   فاحص الأمان التلقائي                      ║
╚═══════════════════════════════════════════════════════════════╝
"

# Initialize counters
ISSUES_FOUND=0
WARNINGS_FOUND=0

# ===================================================================
# 1. Check for hardcoded secrets in staged files
# ===================================================================
print_message "$YELLOW" "🔍 Scanning staged files for hardcoded secrets..."

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || echo "")

if [ -z "$STAGED_FILES" ]; then
    print_message "$YELLOW" "⚠️  No staged files found. Skipping secret scan."
else
    # Patterns to search for (case insensitive)
    SECRET_PATTERNS=(
        "password\s*[:=]\s*['\"][^'\"]{8,}['\"]"
        "secret\s*[:=]\s*['\"][^'\"]{8,}['\"]"
        "api_key\s*[:=]\s*['\"][^'\"]{8,}['\"]"
        "token\s*[:=]\s*['\"][^'\"]{8,}['\"]"
        "private_key\s*[:=]\s*['\"][^'\"]{8,}['\"]"
        "access_key\s*[:=]\s*['\"][^'\"]{8,}['\"]"
        "database_url\s*[:=]\s*['\"]postgresql://[^'\"]+['\"]"
        "mongodb://[^'\"\s]+"
        "mysql://[^'\"\s]+"
        "redis://[^'\"\s]+"
        "smtp_password\s*[:=]\s*['\"][^'\"]{4,}['\"]"
        "jwt_secret\s*[:=]\s*['\"][^'\"]{8,}['\"]"
        "encryption_key\s*[:=]\s*['\"][^'\"]{8,}['\"]"
        "bearer\s+[a-zA-Z0-9_-]{20,}"
        "sk-[a-zA-Z0-9]{20,}"
        "pk_[a-zA-Z0-9]{20,}"
        "AIza[0-9A-Za-z_-]{35}"
        "ya29\.[0-9A-Za-z_-]+"
        "AKIA[0-9A-Z]{16}"
        "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
    )

    # Check each staged file
    for file in $STAGED_FILES; do
        if [ -f "$file" ]; then
            print_message "$BLUE" "  📄 Scanning: $file"
            
            for pattern in "${SECRET_PATTERNS[@]}"; do
                if grep -iE "$pattern" "$file" >/dev/null 2>&1; then
                    print_message "$RED" "    ❌ POTENTIAL SECRET FOUND in $file:"
                    grep -iE --color=always "$pattern" "$file" | head -3
                    ISSUES_FOUND=$((ISSUES_FOUND + 1))
                fi
            done
        fi
    done
fi

# ===================================================================
# 2. Check for .env files accidentally staged
# ===================================================================
print_message "$YELLOW" "🔍 Checking for accidentally staged .env files..."

ENV_FILES=$(echo "$STAGED_FILES" | grep -E "\.env(\.|$)" | grep -v "\.env\.example\|\.env\.template" || echo "")

if [ -n "$ENV_FILES" ]; then
    print_message "$RED" "❌ CRITICAL: .env files found in staged files:"
    echo "$ENV_FILES"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    print_message "$YELLOW" "💡 Run: git reset HEAD .env* to unstage them"
fi

# ===================================================================
# 3. Check for large files that might contain secrets
# ===================================================================
print_message "$YELLOW" "🔍 Checking for large files (>1MB)..."

for file in $STAGED_FILES; do
    if [ -f "$file" ]; then
        file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
        if [ "$file_size" -gt 1048576 ]; then  # 1MB
            print_message "$YELLOW" "⚠️  Large file detected: $file ($(($file_size / 1024))KB)"
            WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
        fi
    fi
done

# ===================================================================
# 4. Check for common sensitive file extensions
# ===================================================================
print_message "$YELLOW" "🔍 Checking for sensitive file types..."

SENSITIVE_EXTENSIONS=(
    "\.pem$"
    "\.key$"
    "\.p12$"
    "\.pfx$"
    "\.jks$"
    "\.keystore$"
    "\.crt$"
    "\.cer$"
    "\.der$"
    "\.p7b$"
    "\.p7c$"
    "\.p7s$"
    "\.pkcs12$"
    "\.pkcs7$"
    "\.ssh$"
    "id_rsa$"
    "id_dsa$"
    "id_ecdsa$"
    "id_ed25519$"
)

for file in $STAGED_FILES; do
    for ext in "${SENSITIVE_EXTENSIONS[@]}"; do
        if echo "$file" | grep -iE "$ext" >/dev/null; then
            print_message "$RED" "❌ SENSITIVE FILE TYPE: $file"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        fi
    done
done

# ===================================================================
# 5. Check for AWS/Cloud credentials patterns
# ===================================================================
print_message "$YELLOW" "🔍 Checking for cloud credentials..."

CLOUD_PATTERNS=(
    "AKIA[0-9A-Z]{16}"                    # AWS Access Key
    "ASIA[0-9A-Z]{16}"                    # AWS Session Token
    "[0-9a-zA-Z/+]{40}"                   # AWS Secret (base64-like)
    "AIza[0-9A-Za-z_-]{35}"               # Google API Key
    "ya29\.[0-9A-Za-z_-]+"                # Google OAuth Token
    "sk-[a-zA-Z0-9]{48}"                  # OpenAI API Key
    "xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}"  # Slack Bot Token
    "xoxp-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}"  # Slack User Token
    "ghp_[a-zA-Z0-9]{36}"                 # GitHub Personal Access Token
    "gho_[a-zA-Z0-9]{36}"                 # GitHub OAuth Token
    "ghu_[a-zA-Z0-9]{36}"                 # GitHub User Token
    "ghs_[a-zA-Z0-9]{36}"                 # GitHub Server Token
    "ghr_[a-zA-Z0-9]{36}"                 # GitHub Refresh Token
)

for file in $STAGED_FILES; do
    if [ -f "$file" ]; then
        for pattern in "${CLOUD_PATTERNS[@]}"; do
            if grep -E "$pattern" "$file" >/dev/null 2>&1; then
                print_message "$RED" "❌ CLOUD CREDENTIAL PATTERN FOUND in $file:"
                grep -E --color=always "$pattern" "$file" | head -2
                ISSUES_FOUND=$((ISSUES_FOUND + 1))
            fi
        done
    fi
done

# ===================================================================
# 6. Check commit message for sensitive information
# ===================================================================
print_message "$YELLOW" "🔍 Checking commit message for sensitive info..."

# Get the commit message (if available)
COMMIT_MSG_FILE=".git/COMMIT_EDITMSG"
if [ -f "$COMMIT_MSG_FILE" ]; then
    COMMIT_MSG=$(cat "$COMMIT_MSG_FILE" 2>/dev/null || echo "")
    
    if echo "$COMMIT_MSG" | grep -iE "(password|secret|key|token|credential)" >/dev/null; then
        print_message "$YELLOW" "⚠️  Commit message contains sensitive keywords"
        WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
    fi
fi

# ===================================================================
# 7. Check for TODO/FIXME with security implications
# ===================================================================
print_message "$YELLOW" "🔍 Checking for security-related TODOs..."

for file in $STAGED_FILES; do
    if [ -f "$file" ]; then
        if grep -iE "(TODO|FIXME|HACK).*\b(security|password|secret|key|token|auth|credential|encrypt|decrypt|hash|salt)\b" "$file" >/dev/null 2>&1; then
            print_message "$YELLOW" "⚠️  Security-related TODO found in $file:"
            grep -iE --color=always "(TODO|FIXME|HACK).*\b(security|password|secret|key|token|auth|credential|encrypt|decrypt|hash|salt)\b" "$file"
            WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
        fi
    fi
done

# ===================================================================
# Results Summary
# ===================================================================
print_message "$BLUE" "
╔═══════════════════════════════════════════════════════════════╗
║                    📊 Scan Results                            ║
╚═══════════════════════════════════════════════════════════════╝
"

if [ $ISSUES_FOUND -eq 0 ] && [ $WARNINGS_FOUND -eq 0 ]; then
    print_message "$GREEN" "✅ No security issues found! Safe to commit."
    exit 0
elif [ $ISSUES_FOUND -eq 0 ]; then
    print_message "$YELLOW" "⚠️  $WARNINGS_FOUND warning(s) found, but no critical issues."
    print_message "$GREEN" "✅ Safe to commit."
    exit 0
else
    print_message "$RED" "❌ $ISSUES_FOUND critical security issue(s) found!"
    if [ $WARNINGS_FOUND -gt 0 ]; then
        print_message "$YELLOW" "⚠️  $WARNINGS_FOUND warning(s) also found."
    fi
    
    print_message "$YELLOW" "
💡 To fix these issues:
   1. Remove or encrypt sensitive data
   2. Use environment variables instead
   3. Add sensitive files to .gitignore
   4. Use git-secrets or similar tools
   
🔧 To bypass this check (NOT RECOMMENDED):
   git commit --no-verify
"
    
    exit 1
fi