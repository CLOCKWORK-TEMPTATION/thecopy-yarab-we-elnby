#!/usr/bin/env bash
# setup.sh — Claude Code Cloud setup script
# Repo is cloned by Claude Code Cloud at /home/user/yarab-we-elnby-thecopy

set -euo pipefail

REPO_DIR="/home/user/yarab-we-elnby-thecopy"
cd "$REPO_DIR"

echo ""
echo "======================================="
echo "  The Copy — Cloud Session Setup"
echo "======================================="
echo ""

# ── 1. pnpm ─────────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  echo "  Installing pnpm..."
  npm install -g pnpm@10 2>/dev/null || corepack enable 2>/dev/null
fi

if command -v pnpm &>/dev/null; then
  echo "  [OK]   pnpm $(pnpm -v)"
else
  echo "  [FAIL] Could not install pnpm"
  exit 1
fi

# ── 2. Dependencies ─────────────────────────────────────────────
if [ ! -d "node_modules" ]; then
  echo "  Installing dependencies..."
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
fi

if [ -d "node_modules" ]; then
  echo "  [OK]   node_modules ready"
else
  echo "  [FAIL] pnpm install failed"
  exit 1
fi

# ── 3. agent:bootstrap ──────────────────────────────────────────
echo ""
echo "  Running agent:bootstrap..."
echo ""

if pnpm agent:bootstrap; then
  echo ""
  echo "  [OK]   agent:bootstrap completed"
else
  echo ""
  echo "  [WARN] agent:bootstrap failed — session starts with stale context"
fi

echo ""
echo "======================================="
echo "  Session ready."
echo "======================================="
echo ""
