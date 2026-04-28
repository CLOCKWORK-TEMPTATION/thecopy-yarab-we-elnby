#!/usr/bin/env bash
# Jules / Linux environment setup for: the-copy-monorepo
# Repo type: pnpm + Turborepo monorepo
# Required toolchain:
#   - Node.js 24.x
#   - pnpm 10.32.1
#
# This script is intentionally self-healing:
# - It works from the repository root, scripts/setup.sh, or most agent workspaces.
# - It does not assume that nvm already exists at /root/.nvm.
# - If Node.js 24 is already available, it uses it.
# - If Node.js 24 is not available, it installs/loads nvm, then installs Node.js 24.
# - It pins pnpm through Corepack, then installs the workspace dependencies.

set -euo pipefail

TARGET_NODE_MAJOR="${TARGET_NODE_MAJOR:-24}"
TARGET_PNPM_VERSION="${TARGET_PNPM_VERSION:-10.32.1}"
NVM_VERSION="${NVM_VERSION:-v0.40.1}"

log() {
  printf '\n==> %s\n' "$*"
}

warn() {
  printf 'WARNING: %s\n' "$*" >&2
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

detect_repo_root() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

  if [ -f "$PWD/package.json" ]; then
    printf '%s\n' "$PWD"
    return 0
  fi

  if [ -f "$script_dir/../package.json" ]; then
    cd "$script_dir/.." && pwd
    return 0
  fi

  if [ -f "$script_dir/package.json" ]; then
    printf '%s\n' "$script_dir"
    return 0
  fi

  if command_exists git; then
    git rev-parse --show-toplevel 2>/dev/null && return 0
  fi

  fail "Could not detect repository root. Run this script from the repository root or keep it under scripts/setup.sh."
}

node_major() {
  node -p "process.versions.node.split('.')[0]" 2>/dev/null || true
}

load_nvm_if_available() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    return 0
  fi

  return 1
}

install_nvm() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

  if [ -s "$NVM_DIR/nvm.sh" ]; then
    return 0
  fi

  log "nvm was not found; installing nvm ${NVM_VERSION}"

  mkdir -p "$NVM_DIR"

  if command_exists curl; then
    curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
  elif command_exists wget; then
    wget -qO- "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
  else
    fail "Neither curl nor wget is available. Install Node.js ${TARGET_NODE_MAJOR}.x manually, or install curl/wget, then rerun this script."
  fi

  [ -s "$NVM_DIR/nvm.sh" ] || fail "nvm installation did not create $NVM_DIR/nvm.sh"
}

ensure_node() {
  log "[1/6] Ensuring Node.js ${TARGET_NODE_MAJOR}.x"

  if command_exists node; then
    local current_major
    current_major="$(node_major)"

    if [ "$current_major" = "$TARGET_NODE_MAJOR" ]; then
      echo "Node.js $(node -v) is already active."
      return 0
    fi

    warn "Current Node.js is $(node -v), but this repository requires ${TARGET_NODE_MAJOR}.x."
  else
    warn "Node.js is not currently available."
  fi

  if ! load_nvm_if_available; then
    install_nvm
    load_nvm_if_available || fail "nvm is installed but could not be loaded from $NVM_DIR/nvm.sh"
  fi

  command_exists nvm || fail "nvm command is not available after loading $NVM_DIR/nvm.sh"

  nvm install "$TARGET_NODE_MAJOR" --no-progress
  nvm alias default "$TARGET_NODE_MAJOR"
  nvm use "$TARGET_NODE_MAJOR"

  [ "$(node_major)" = "$TARGET_NODE_MAJOR" ] || fail "Expected Node.js ${TARGET_NODE_MAJOR}.x, got $(node -v)"
}

ensure_corepack_and_pnpm() {
  log "[2/6] Pinning pnpm@${TARGET_PNPM_VERSION} via Corepack"

  if ! command_exists corepack; then
    warn "corepack is not available; installing it through npm."
    command_exists npm || fail "npm is not available, so Corepack cannot be installed."
    npm install -g corepack@latest
  fi

  corepack enable
  corepack prepare "pnpm@${TARGET_PNPM_VERSION}" --activate

  command_exists pnpm || fail "pnpm is still not available after Corepack activation."

  local current_pnpm
  current_pnpm="$(pnpm -v)"
  [ "$current_pnpm" = "$TARGET_PNPM_VERSION" ] || fail "Expected pnpm ${TARGET_PNPM_VERSION}, got ${current_pnpm}"
}

check_private_registry_token() {
  log "[3/6] Checking private registry token: TIPTAP_PRO_TOKEN"

  if [ -z "${TIPTAP_PRO_TOKEN:-}" ]; then
    warn "TIPTAP_PRO_TOKEN is not set. If install fails on @tiptap-pro/*, add it to the environment secrets and rerun setup."
  fi

  export TIPTAP_PRO_TOKEN="${TIPTAP_PRO_TOKEN:-}"
}

configure_install_environment() {
  log "[4/6] Configuring install environment"

  export CI="${CI:-1}"
  export HUSKY=0
  export PUPPETEER_SKIP_DOWNLOAD=1
  export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
  export SHARP_IGNORE_GLOBAL_LIBVIPS=1

  pnpm config set store-dir "${PNPM_STORE_DIR:-$HOME/.pnpm-store}" >/dev/null
}

install_dependencies() {
  log "[5/6] Installing dependencies"

  if [ ! -f "pnpm-lock.yaml" ]; then
    fail "pnpm-lock.yaml was not found in $(pwd). This script must run from the repository root."
  fi

  pnpm install --frozen-lockfile --prefer-offline
}

verify_toolchain() {
  log "[6/6] Verifying toolchain and workspace graph"

  echo "Repository: $(pwd)"
  echo "Node.js:    $(node -v)"
  echo "pnpm:       $(pnpm -v)"

  pnpm -r --depth -1 list --json >/dev/null
  echo "workspace graph: ok"
}

main() {
  local repo_root
  repo_root="$(detect_repo_root)"
  cd "$repo_root"

  ensure_node
  ensure_corepack_and_pnpm
  check_private_registry_token
  configure_install_environment
  install_dependencies
  verify_toolchain

  log "Setup complete."
}

main "$@"
