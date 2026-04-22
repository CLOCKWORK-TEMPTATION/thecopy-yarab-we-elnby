#!/usr/bin/env bash
# doctor.sh - Preflight check for The Copy platform
# Verifies all required services and configuration before startup

set -euo pipefail

PASS=0
FAIL=0
WARN=0

check() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd" > /dev/null 2>&1; then
    echo "  ✓ $name"
    ((PASS++))
  else
    echo "  ✗ $name"
    ((FAIL++))
  fi
}

warn_check() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd" > /dev/null 2>&1; then
    echo "  ✓ $name"
    ((PASS++))
  else
    echo "  ⚠ $name (optional)"
    ((WARN++))
  fi
}

echo "═══════════════════════════════════════"
echo "  The Copy - Doctor / Preflight Check"
echo "═══════════════════════════════════════"
echo ""

# Load .env if exists
if [ -f .env ]; then
  set -a; source .env; set +a
fi

echo "▸ Environment"
check "NODE_ENV is set" "[ -n '${NODE_ENV:-}' ]"
check "DATABASE_URL is set" "[ -n '${DATABASE_URL:-}' ]"
check "JWT_SECRET is set" "[ -n '${JWT_SECRET:-}' ]"
check "GEMINI_API_KEY or GOOGLE_GENAI_API_KEY" "[ -n '${GEMINI_API_KEY:-}' ] || [ -n '${GOOGLE_GENAI_API_KEY:-}' ]"
echo ""

echo "▸ Services"
# PostgreSQL
DB_HOST=$(echo "${DATABASE_URL:-}" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "${DATABASE_URL:-}" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
check "PostgreSQL (${DB_HOST:-localhost}:${DB_PORT:-5433})" "pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5433} -t 5"

# Redis
REDIS_FLAG="${REDIS_ENABLED:-true}"
if [ "$REDIS_FLAG" != "false" ]; then
  REDIS_HOST="${REDIS_HOST:-localhost}"
  REDIS_PORT="${REDIS_PORT:-6379}"
  check "Redis (${REDIS_HOST}:${REDIS_PORT})" "redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} ping"
else
  echo "  ⊘ Redis (disabled via REDIS_ENABLED=false)"
fi

# Weaviate
WEAVIATE_URL="${WEAVIATE_URL:-http://localhost:8080}"
WEAVIATE_REQ="${WEAVIATE_REQUIRED:-false}"
if [ "$WEAVIATE_REQ" = "true" ]; then
  check "Weaviate (${WEAVIATE_URL})" "curl -sf ${WEAVIATE_URL}/v1/.well-known/ready"
else
  warn_check "Weaviate (${WEAVIATE_URL})" "curl -sf ${WEAVIATE_URL}/v1/.well-known/ready"
fi
echo ""

echo "▸ Ports"
check "Port 3001 (backend) is free" "! (lsof -i :3001 > /dev/null 2>&1 || netstat -an | grep -q ':3001.*LISTEN')"
check "Port 5000 (frontend) is free" "! (lsof -i :5000 > /dev/null 2>&1 || netstat -an | grep -q ':5000.*LISTEN')"
echo ""

echo "▸ Static Assets"
check "v-shape-card-1.png" "[ -f apps/web/public/assets/v-shape/v-shape-card-1.png ]"
check "v-shape-card-2.png" "[ -f apps/web/public/assets/v-shape/v-shape-card-2.png ]"
check "v-shape-card-3.png" "[ -f apps/web/public/assets/v-shape/v-shape-card-3.png ]"
check "v-shape-card-4.png" "[ -f apps/web/public/assets/v-shape/v-shape-card-4.png ]"
check "v-shape-card-5.png" "[ -f apps/web/public/assets/v-shape/v-shape-card-5.png ]"
check "v-shape-card-6.png" "[ -f apps/web/public/assets/v-shape/v-shape-card-6.png ]"
check "v-shape-card-7.jpg" "[ -f apps/web/public/assets/v-shape/v-shape-card-7.jpg ]"
echo ""

echo "▸ Sentry"
if [ "${NODE_ENV:-development}" = "production" ]; then
  check "SENTRY_DSN (required in production)" "[ -n '${SENTRY_DSN:-}' ]"
  check "NEXT_PUBLIC_SENTRY_DSN (required in production)" "[ -n '${NEXT_PUBLIC_SENTRY_DSN:-}' ]"
else
  echo "  ⊘ Sentry DSN (not required in development)"
fi
echo ""

echo "═══════════════════════════════════════"
echo "  Results: ${PASS} passed, ${FAIL} failed, ${WARN} warnings"
echo "═══════════════════════════════════════"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "  ✗ Preflight FAILED — fix the issues above before starting."
  exit 1
else
  echo ""
  echo "  ✓ All checks passed — ready to start."
  exit 0
fi
