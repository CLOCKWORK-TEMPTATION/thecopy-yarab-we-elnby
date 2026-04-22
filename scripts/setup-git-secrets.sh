#!/bin/bash

# ===================================================================
# Git Secrets Setup - إعداد git-secrets
# ===================================================================
# يقوم بإعداد git-secrets لمنع تسريب الأسرار في الـ commits
# Sets up git-secrets to prevent secret leaks in commits
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
║                🔐 Git Secrets Setup                           ║
║                إعداد git-secrets                             ║
╚═══════════════════════════════════════════════════════════════╝
"

# Check if git-secrets is installed
if ! command -v git-secrets &> /dev/null; then
    print_message "$YELLOW" "⚠️  git-secrets not found. Installing..."
    
    # Try to install git-secrets
    if command -v brew &> /dev/null; then
        print_message "$BLUE" "📦 Installing via Homebrew..."
        brew install git-secrets
    elif command -v apt-get &> /dev/null; then
        print_message "$BLUE" "📦 Installing via apt..."
        sudo apt-get update
        sudo apt-get install -y git-secrets
    elif command -v yum &> /dev/null; then
        print_message "$BLUE" "📦 Installing via yum..."
        sudo yum install -y git-secrets
    else
        print_message "$YELLOW" "⚠️  Please install git-secrets manually:"
        print_message "$BLUE" "   https://github.com/awslabs/git-secrets"
        exit 1
    fi
fi

print_message "$GREEN" "✅ git-secrets is available"

# Initialize git-secrets for this repository
print_message "$BLUE" "🔧 Initializing git-secrets for this repository..."
git secrets --install --force

# Register AWS patterns
print_message "$BLUE" "📝 Registering AWS patterns..."
git secrets --register-aws

# Add custom patterns from .gitsecrets file
if [ -f ".gitsecrets" ]; then
    print_message "$BLUE" "📝 Adding custom patterns from .gitsecrets..."
    
    while IFS= read -r pattern; do
        # Skip empty lines and comments
        if [[ -n "$pattern" && ! "$pattern" =~ ^[[:space:]]*# ]]; then
            git secrets --add "$pattern"
            print_message "$GREEN" "  ✅ Added pattern: $pattern"
        fi
    done < .gitsecrets
else
    print_message "$YELLOW" "⚠️  .gitsecrets file not found, adding default patterns..."
    
    # Add common patterns manually
    git secrets --add 'password\s*[:=]\s*['\''"][^'\''\"]{8,}['\''"]'
    git secrets --add 'secret\s*[:=]\s*['\''"][^'\''\"]{8,}['\''"]'
    git secrets --add 'api_key\s*[:=]\s*['\''"][^'\''\"]{20,}['\''"]'
    git secrets --add 'private_key\s*[:=]\s*['\''"]-----BEGIN'
    git secrets --add 'token\s*[:=]\s*['\''"][^'\''\"]{20,}['\''"]'
    git secrets --add 'AIza[0-9A-Za-z_-]{35}'
    git secrets --add 'sk-[a-zA-Z0-9]{48}'
    git secrets --add 'ghp_[a-zA-Z0-9]{36}'
    git secrets --add 'xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}'
    git secrets --add 'postgresql://[^:]+:[^@]+@'
    git secrets --add 'mongodb://[^:]+:[^@]+@'
fi

# Add allowed patterns (exceptions)
print_message "$BLUE" "📝 Adding allowed patterns (exceptions)..."
git secrets --add --allowed 'test@example.com'
git secrets --add --allowed 'TestPassword123!'
git secrets --add --allowed 'localhost'
git secrets --add --allowed '127.0.0.1'
git secrets --add --allowed 'example.com'
git secrets --add --allowed 'your-secret-key-change-in-production'
git secrets --add --allowed 'BUNNYCDN_API_KEY'
git secrets --add --allowed 'FIREBASE_SERVICE_ACCOUNT'

# Install hooks
print_message "$BLUE" "🪝 Installing git hooks..."
git secrets --install --force

# Test the setup
print_message "$BLUE" "🧪 Testing git-secrets setup..."
if git secrets --scan; then
    print_message "$GREEN" "✅ git-secrets test passed!"
else
    print_message "$YELLOW" "⚠️  git-secrets found potential issues. Review above."
fi

# Create a test file to verify it works
print_message "$BLUE" "🧪 Creating test file to verify detection..."
echo 'password="actualSecretPassword123"' > /tmp/test-secret.txt

if git secrets --scan /tmp/test-secret.txt 2>/dev/null; then
    print_message "$YELLOW" "⚠️  Test failed - secrets not detected"
else
    print_message "$GREEN" "✅ Test passed - secrets properly detected!"
fi

rm -f /tmp/test-secret.txt

print_message "$GREEN" "
╔═══════════════════════════════════════════════════════════════╗
║                    ✅ Setup Complete!                        ║
╚═══════════════════════════════════════════════════════════════╝

🔐 git-secrets is now configured for this repository!

📋 What happens now:
   • Pre-commit hook will scan for secrets
   • Pre-push hook will scan for secrets
   • Manual scanning available with: git secrets --scan

🧪 Test commands:
   git secrets --scan                    # Scan all files
   git secrets --scan-history            # Scan git history
   git secrets --list                    # List all patterns

🔧 Management commands:
   git secrets --add 'pattern'           # Add new pattern
   git secrets --add --allowed 'pattern' # Add exception
   git secrets --remove 'pattern'        # Remove pattern

📖 More info: https://github.com/awslabs/git-secrets
"