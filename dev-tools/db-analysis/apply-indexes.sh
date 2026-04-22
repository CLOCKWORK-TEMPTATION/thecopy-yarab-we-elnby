#!/bin/bash

# ===============================================
# Apply Performance Indexes
# ===============================================
# This script applies optimized indexes to the database
#
# Usage:
#   bash db-performance-analysis/apply-indexes.sh
# ===============================================

set -e  # Exit on error

echo "=================================================="
echo "Applying Performance Indexes"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL is not set${NC}"
    echo ""
    echo "Please set DATABASE_URL environment variable:"
    echo "  export DATABASE_URL='postgresql://user:password@localhost:5432/dbname'"
    exit 1
fi

echo -e "${GREEN}✓ DATABASE_URL is set${NC}"
echo ""

# Check if indexes already exist
echo "Checking current indexes..."
echo "=================================================="
EXISTING_INDEXES=$(psql "$DATABASE_URL" -t -c "
SELECT COUNT(*)
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';
")

echo "Found $EXISTING_INDEXES indexes with 'idx_' prefix"
echo ""

# Ask for confirmation
echo -e "${YELLOW}⚠️  WARNING: This will add new indexes to your database${NC}"
echo "This operation may take several minutes depending on database size."
echo ""
read -p "Do you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Operation cancelled."
    exit 0
fi

echo ""
echo "Applying indexes from migration file..."
echo "=================================================="

# Apply the migration
psql "$DATABASE_URL" < /home/user/the-copy/backend/migrations/add-performance-indexes.sql

echo ""
echo -e "${GREEN}✅ Indexes applied successfully!${NC}"
echo ""

# Show new indexes
echo "Current indexes:"
echo "=================================================="
psql "$DATABASE_URL" -c "
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
"

echo ""
echo -e "${GREEN}=================================================="
echo "✅ Operation completed!"
echo "==================================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Run post-optimization performance tests:"
echo "     npm run perf:post-optimization"
echo ""
echo "  2. Compare results:"
echo "     npm run perf:compare"
echo ""
