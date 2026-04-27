#!/usr/bin/env bash
# Jules environment setup for: the-copy-monorepo
# Repo type: pnpm + turborepo monorepo (apps/web Next.js, apps/backend, packages/*)
# Required toolchain (from package.json "engines"):
#   - Node.js 24.x
#   - pnpm 10.32.1
# The repo is cloned automatically into /app, so this script runs from /app.

set -euo pipefail

echo "==> [1/6] Activating Node.js 24 via nvm"
# Jules ships with nvm pre-installed; default Node is 22. We need 24.x.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm install 24 --no-progress
nvm alias default 24
nvm use 24

echo "==> [2/6] Pinning pnpm@10.32.1 via corepack"
# package.json declares "packageManager": "pnpm@10.32.1" — must match exactly.
corepack enable
corepack prepare pnpm@10.32.1 --activate

echo "==> [3/6] Checking private registry token (Tiptap Pro)"
# apps/web depends on @tiptap-pro/* which requires TIPTAP_PRO_TOKEN to be exported
# via Jules' Environment > Secrets tab. Without it, install will fail on those packages.
if [ -z "${TIPTAP_PRO_TOKEN:-}" ]; then
  echo "WARNING: TIPTAP_PRO_TOKEN is not set."
  echo "         Add it under Jules > Environment > Secrets if install fails on @tiptap-pro/*."
fi
export TIPTAP_PRO_TOKEN="${TIPTAP_PRO_TOKEN:-}"

echo "==> [4/6] Configuring pnpm store and disabling host-only postinstalls"
# Avoid the agent guard hooks (predev/prebuild/...) and Windows-only PowerShell scripts
# from running inside the Linux VM. We only need a clean install here.
export CI=1
export HUSKY=0
# Skip the pnpm "onlyBuiltDependencies" postinstalls that aren't needed for static checks.
export PUPPETEER_SKIP_DOWNLOAD=1
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export SHARP_IGNORE_GLOBAL_LIBVIPS=1

echo "==> [5/6] Installing dependencies (pnpm install --frozen-lockfile)"
# --frozen-lockfile ensures we honor pnpm-lock.yaml exactly; never relax this.
# --prefer-offline speeds up subsequent snapshot rebuilds via Jules' cache layer.
pnpm install --frozen-lockfile --prefer-offline

echo "==> [6/6] Verifying toolchain"
node -v
pnpm -v
pnpm -r --depth -1 list --json > /dev/null && echo "workspace graph: ok"

echo "==> Setup complete."
