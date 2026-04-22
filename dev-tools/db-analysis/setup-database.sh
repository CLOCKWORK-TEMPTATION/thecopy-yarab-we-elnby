#!/bin/bash

# ===============================================
# Database Performance Analysis - Setup Script
# ===============================================
# This script sets up the database and prepares it for performance testing
#
# Usage:
#   1. Make sure PostgreSQL is running
#   2. Set DATABASE_URL environment variable
#   3. Run: bash setup-database.sh
# ===============================================

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Error handler
trap 'echo -e "${RED}❌ Script failed at line $LINENO${NC}"; exit 1' ERR

echo "=================================================="
echo "Database Performance Analysis - Setup"
echo "=================================================="

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
    echo ""
    echo "Or use docker-compose to start PostgreSQL:"
    echo "  cd /home/user/the-copy/backend"
    echo "  docker-compose up -d postgres"
    exit 1
fi

echo -e "${GREEN}✓ DATABASE_URL is set${NC}"

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ ERROR: Please run this script from the backend directory${NC}"
    exit 1
fi

echo ""
echo "Step 1/5: Installing dependencies..."
echo "=================================================="
npm install

echo ""
echo "Step 2/5: Applying database schema (drizzle-kit push)..."
echo "=================================================="
npm run db:push

echo ""
echo "Step 3/5: Verifying database connection..."
echo "=================================================="
psql "$DATABASE_URL" -c "SELECT version();" || {
    echo -e "${RED}❌ ERROR: Cannot connect to database${NC}"
    exit 1
}
echo -e "${GREEN}✓ Database connection successful${NC}"

echo ""
echo "Step 4/5: Checking current indexes..."
echo "=================================================="
psql "$DATABASE_URL" -c "
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('projects', 'scenes', 'characters', 'shots', 'users')
ORDER BY tablename, indexname;
"

echo ""
echo "Step 5/5: Seeding test data..."
echo "=================================================="
npm run ts-node db-performance-analysis/seed-test-data.ts

echo ""
echo -e "${GREEN}=================================================="
echo "✅ Database setup completed successfully!"
echo "==================================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Run baseline performance tests:"
echo "     npm run perf:baseline"
echo ""
echo "  2. Apply performance indexes:"
echo "     npm run perf:apply-indexes"
echo ""
echo "  3. Run post-optimization tests:"
echo "     npm run perf:post-optimization"
echo ""
echo "  4. Compare results:"
echo "     npm run perf:compare"
echo ""
