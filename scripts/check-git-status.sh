#!/bin/bash

# ===================================================================
# Git Status Checker - فاحص حالة Git
# ===================================================================
# يفحص حالة Git ويعرض إحصائيات مفصلة عن الملفات
# Checks Git status and shows detailed file statistics
# ===================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_message "$BLUE" "
╔═══════════════════════════════════════════════════════════════╗
║                   📊 Git Status Report                       ║
║                   تقرير حالة Git                            ║
╚═══════════════════════════════════════════════════════════════╝
"

# ===================================================================
# 1. Basic Git Status
# ===================================================================
print_message "$CYAN" "📋 Git Status Overview:"
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_message "$RED" "❌ Not a git repository!"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "detached HEAD")
print_message "$GREEN" "🌿 Current Branch: $CURRENT_BRANCH"

# Get last commit info
LAST_COMMIT=$(git log -1 --pretty=format:"%h - %s (%cr)" 2>/dev/null || echo "No commits")
print_message "$BLUE" "📝 Last Commit: $LAST_COMMIT"

echo ""

# ===================================================================
# 2. File Statistics
# ===================================================================
print_message "$CYAN" "📊 File Statistics:"
echo ""

# Tracked files
TRACKED_FILES=$(git ls-files | wc -l)
print_message "$GREEN" "✅ Tracked files: $TRACKED_FILES"

# Staged files
STAGED_FILES=$(git diff --cached --name-only | wc -l)
if [ $STAGED_FILES -gt 0 ]; then
    print_message "$YELLOW" "📦 Staged files: $STAGED_FILES"
else
    print_message "$GREEN" "📦 Staged files: $STAGED_FILES"
fi

# Modified files
MODIFIED_FILES=$(git diff --name-only | wc -l)
if [ $MODIFIED_FILES -gt 0 ]; then
    print_message "$YELLOW" "✏️  Modified files: $MODIFIED_FILES"
else
    print_message "$GREEN" "✏️  Modified files: $MODIFIED_FILES"
fi

# Untracked files
UNTRACKED_FILES=$(git ls-files --others --exclude-standard | wc -l)
if [ $UNTRACKED_FILES -gt 100 ]; then
    print_message "$RED" "🚨 Untracked files: $UNTRACKED_FILES (TOO MANY!)"
elif [ $UNTRACKED_FILES -gt 10 ]; then
    print_message "$YELLOW" "⚠️  Untracked files: $UNTRACKED_FILES"
else
    print_message "$GREEN" "📄 Untracked files: $UNTRACKED_FILES"
fi

echo ""

# ===================================================================
# 3. Detailed Untracked Files Analysis
# ===================================================================
if [ $UNTRACKED_FILES -gt 0 ]; then
    print_message "$CYAN" "🔍 Untracked Files Analysis:"
    echo ""
    
    # Group untracked files by type
    print_message "$BLUE" "📁 By Directory:"
    git ls-files --others --exclude-standard | cut -d'/' -f1 | sort | uniq -c | sort -nr | head -10
    
    echo ""
    print_message "$BLUE" "📄 By File Extension:"
    git ls-files --others --exclude-standard | grep '\.' | sed 's/.*\.//' | sort | uniq -c | sort -nr | head -10
    
    echo ""
    
    # Show largest untracked files
    print_message "$BLUE" "📏 Largest Untracked Files:"
    git ls-files --others --exclude-standard | head -20 | while read file; do
        if [ -f "$file" ]; then
            size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
            size_mb=$((size / 1024 / 1024))
            if [ $size_mb -gt 0 ]; then
                printf "  %3d MB - %s\n" $size_mb "$file"
            else
                size_kb=$((size / 1024))
                printf "  %3d KB - %s\n" $size_kb "$file"
            fi
        fi
    done | sort -nr | head -10
fi

echo ""

# ===================================================================
# 4. .gitignore Effectiveness Check
# ===================================================================
print_message "$CYAN" "🛡️  .gitignore Effectiveness:"
echo ""

# Check for common problematic patterns
PROBLEMATIC_PATTERNS=(
    "node_modules"
    ".env"
    "*.log"
    "dist/"
    "build/"
    ".cache"
    "coverage/"
    "*.tmp"
    "*.bak"
    ".DS_Store"
    "Thumbs.db"
)

for pattern in "${PROBLEMATIC_PATTERNS[@]}"; do
    count=$(git ls-files --others --exclude-standard | grep -E "$pattern" | wc -l)
    if [ $count -gt 0 ]; then
        print_message "$RED" "  ❌ $count files matching '$pattern' not ignored"
    else
        print_message "$GREEN" "  ✅ '$pattern' properly ignored"
    fi
done

echo ""

# ===================================================================
# 5. Repository Size Analysis
# ===================================================================
print_message "$CYAN" "💾 Repository Size Analysis:"
echo ""

# Git repository size
GIT_SIZE=$(du -sh .git 2>/dev/null | cut -f1 || echo "Unknown")
print_message "$BLUE" "📦 .git directory size: $GIT_SIZE"

# Working directory size (excluding .git)
WORK_SIZE=$(du -sh --exclude=.git . 2>/dev/null | cut -f1 || echo "Unknown")
print_message "$BLUE" "📁 Working directory size: $WORK_SIZE"

# Count of objects in git
OBJECTS_COUNT=$(git count-objects -v 2>/dev/null | grep "count" | cut -d' ' -f2 || echo "Unknown")
print_message "$BLUE" "🗃️  Git objects count: $OBJECTS_COUNT"

echo ""

# ===================================================================
# 6. Recommendations
# ===================================================================
print_message "$CYAN" "💡 Recommendations:"
echo ""

if [ $UNTRACKED_FILES -gt 100 ]; then
    print_message "$RED" "🚨 CRITICAL: Too many untracked files ($UNTRACKED_FILES)"
    print_message "$YELLOW" "   Recommended actions:"
    print_message "$YELLOW" "   1. Review and update .gitignore files"
    print_message "$YELLOW" "   2. Remove unnecessary files"
    print_message "$YELLOW" "   3. Consider using git clean -fd (CAREFUL!)"
elif [ $UNTRACKED_FILES -gt 50 ]; then
    print_message "$YELLOW" "⚠️  Many untracked files ($UNTRACKED_FILES)"
    print_message "$YELLOW" "   Consider reviewing .gitignore patterns"
elif [ $UNTRACKED_FILES -gt 10 ]; then
    print_message "$YELLOW" "📝 Some untracked files ($UNTRACKED_FILES)"
    print_message "$YELLOW" "   Normal, but review if needed"
else
    print_message "$GREEN" "✅ Good! Few untracked files ($UNTRACKED_FILES)"
fi

if [ $STAGED_FILES -gt 0 ]; then
    print_message "$BLUE" "📦 You have staged files ready to commit"
fi

if [ $MODIFIED_FILES -gt 0 ]; then
    print_message "$BLUE" "✏️  You have modified files to review"
fi

echo ""

# ===================================================================
# 7. Quick Actions
# ===================================================================
print_message "$CYAN" "🔧 Quick Actions:"
echo ""
print_message "$BLUE" "View untracked files:"
print_message "$YELLOW" "  git ls-files --others --exclude-standard"
echo ""
print_message "$BLUE" "Add all tracked changes:"
print_message "$YELLOW" "  git add -u"
echo ""
print_message "$BLUE" "Clean untracked files (CAREFUL!):"
print_message "$YELLOW" "  git clean -fd --dry-run  # Preview"
print_message "$YELLOW" "  git clean -fd            # Execute"
echo ""
print_message "$BLUE" "Update .gitignore and refresh:"
print_message "$YELLOW" "  # Edit .gitignore files"
print_message "$YELLOW" "  git rm -r --cached ."
print_message "$YELLOW" "  git add ."
echo ""

print_message "$GREEN" "📊 Git status check complete!"