#!/bin/bash

# ===================================================================
# Cleanup Untracked Files - تنظيف الملفات غير المتتبعة
# ===================================================================
# ينظف الملفات غير المرغوب فيها بأمان
# Safely cleans up unwanted untracked files
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
║              🧹 Cleanup Untracked Files                      ║
║              تنظيف الملفات غير المتتبعة                     ║
╚═══════════════════════════════════════════════════════════════╝
"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_message "$RED" "❌ Not a git repository!"
    exit 1
fi

# Get count of untracked files
UNTRACKED_COUNT=$(git ls-files --others --exclude-standard | wc -l)
print_message "$BLUE" "📊 Found $UNTRACKED_COUNT untracked files"

if [ $UNTRACKED_COUNT -eq 0 ]; then
    print_message "$GREEN" "✅ No untracked files to clean!"
    exit 0
fi

echo ""

# ===================================================================
# 1. Safe Cleanup - Common Build/Cache Files
# ===================================================================
print_message "$YELLOW" "🔍 Phase 1: Safe cleanup of common build/cache files..."

SAFE_PATTERNS=(
    "node_modules/"
    "dist/"
    "build/"
    ".cache/"
    ".next/"
    "out/"
    "coverage/"
    ".nyc_output/"
    "*.log"
    "*.tmp"
    "*.temp"
    "*.bak"
    "*.backup"
    "*.old"
    ".DS_Store"
    "Thumbs.db"
    "*.tsbuildinfo"
    ".eslintcache"
    ".stylelintcache"
    "dump.rdb"
    "*.sqlite"
    "*.db"
)

CLEANED_COUNT=0

for pattern in "${SAFE_PATTERNS[@]}"; do
    # Find files matching pattern
    files=$(git ls-files --others --exclude-standard | grep -E "^${pattern//\*/.*}" || echo "")
    
    if [ -n "$files" ]; then
        count=$(echo "$files" | wc -l)
        print_message "$YELLOW" "  🗑️  Removing $count files matching '$pattern'"
        
        # Remove files
        echo "$files" | while read file; do
            if [ -f "$file" ]; then
                rm -f "$file"
                CLEANED_COUNT=$((CLEANED_COUNT + 1))
            elif [ -d "$file" ]; then
                rm -rf "$file"
                CLEANED_COUNT=$((CLEANED_COUNT + 1))
            fi
        done
    fi
done

print_message "$GREEN" "✅ Phase 1 complete"
echo ""

# ===================================================================
# 2. Interactive Cleanup - Review Remaining Files
# ===================================================================
REMAINING_COUNT=$(git ls-files --others --exclude-standard | wc -l)

if [ $REMAINING_COUNT -gt 0 ]; then
    print_message "$YELLOW" "🔍 Phase 2: Review remaining $REMAINING_COUNT files..."
    echo ""
    
    # Show remaining files grouped by directory
    print_message "$BLUE" "📁 Remaining files by directory:"
    git ls-files --others --exclude-standard | head -20 | while read file; do
        dir=$(dirname "$file")
        basename=$(basename "$file")
        size=""
        if [ -f "$file" ]; then
            file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
            if [ $file_size -gt 1048576 ]; then  # > 1MB
                size=" ($(($file_size / 1024 / 1024))MB)"
            elif [ $file_size -gt 1024 ]; then  # > 1KB
                size=" ($(($file_size / 1024))KB)"
            fi
        fi
        print_message "$CYAN" "  📄 $dir/$basename$size"
    done
    
    if [ $REMAINING_COUNT -gt 20 ]; then
        print_message "$YELLOW" "  ... and $((REMAINING_COUNT - 20)) more files"
    fi
    
    echo ""
    print_message "$YELLOW" "⚠️  Manual review recommended for remaining files"
    print_message "$BLUE" "💡 Commands to help:"
    print_message "$CYAN" "   git ls-files --others --exclude-standard  # List all"
    print_message "$CYAN" "   git clean -fd --dry-run                   # Preview cleanup"
    print_message "$CYAN" "   git clean -fd                             # Clean all (CAREFUL!)"
fi

# ===================================================================
# 3. .gitignore Suggestions
# ===================================================================
if [ $REMAINING_COUNT -gt 10 ]; then
    echo ""
    print_message "$YELLOW" "💡 .gitignore Suggestions:"
    print_message "$BLUE" "Based on remaining files, consider adding these patterns:"
    
    # Analyze remaining files for patterns
    git ls-files --others --exclude-standard | while read file; do
        # Get file extension
        if [[ "$file" == *.* ]]; then
            ext="${file##*.}"
            echo "*.$ext"
        fi
        
        # Get directory patterns
        dir=$(dirname "$file")
        if [ "$dir" != "." ]; then
            echo "$dir/"
        fi
    done | sort | uniq -c | sort -nr | head -10 | while read count pattern; do
        if [ $count -gt 2 ]; then
            print_message "$CYAN" "  $pattern  # ($count files)"
        fi
    done
fi

# ===================================================================
# 4. Final Status
# ===================================================================
echo ""
FINAL_COUNT=$(git ls-files --others --exclude-standard | wc -l)
CLEANED_TOTAL=$((UNTRACKED_COUNT - FINAL_COUNT))

print_message "$GREEN" "
╔═══════════════════════════════════════════════════════════════╗
║                    📊 Cleanup Summary                         ║
╚═══════════════════════════════════════════════════════════════╝

🗑️  Files cleaned: $CLEANED_TOTAL
📄 Files remaining: $FINAL_COUNT
📊 Total processed: $UNTRACKED_COUNT
"

if [ $FINAL_COUNT -eq 0 ]; then
    print_message "$GREEN" "🎉 All untracked files cleaned!"
elif [ $FINAL_COUNT -lt 10 ]; then
    print_message "$GREEN" "✅ Good! Only $FINAL_COUNT files remaining"
elif [ $FINAL_COUNT -lt 50 ]; then
    print_message "$YELLOW" "⚠️  $FINAL_COUNT files remaining - consider manual review"
else
    print_message "$RED" "🚨 $FINAL_COUNT files remaining - .gitignore needs improvement"
fi

print_message "$BLUE" "
📋 Next steps:
   1. Review remaining files: git ls-files --others --exclude-standard
   2. Update .gitignore if needed
   3. Run: git add . && git commit -m 'cleanup: remove untracked files'
"