#!/usr/bin/env bash
# ==============================================================================
# 🚀 context-gen-cli — Self-Healing Unified Publisher (npm + PyPI + Homebrew)
# ==============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; PURPLE='\033[0;35m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn()    { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error()   { echo -e "${RED}❌ $1${NC}"; }
log_step()    { echo -e "\n${PURPLE}${BOLD}━━━ $1 ━━━${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_DIR="$SCRIPT_DIR"
PYTHON_DIR="$SCRIPT_DIR/python"
FORMULA_FILE="$SCRIPT_DIR/Formula/context-gen-cli.rb"

PUBLISH_NODE=true
PUBLISH_PYTHON=true
DRY_RUN=false
SKIP_TESTS=false
VERSION_BUMP="patch"

while [[ $# -gt 0 ]]; do
  case $1 in
    --node-only)   PUBLISH_PYTHON=false; shift ;;
    --python-only) PUBLISH_NODE=false; shift ;;
    --dry-run)     DRY_RUN=true; shift ;;
    --skip-tests)  SKIP_TESTS=true; shift ;;
    --major)       VERSION_BUMP="major"; shift ;;
    --minor)       VERSION_BUMP="minor"; shift ;;
    --patch)       VERSION_BUMP="patch"; shift ;;
    -h|--help)
      echo "Usage: ./publish.sh [--node-only] [--python-only] [--dry-run] [--skip-tests] [--major|--minor|--patch]"
      exit 0 ;;
    *) log_error "Unknown option: $1"; exit 1 ;;
  esac
done

echo -e "\n${CYAN}${BOLD}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║  🚀 context-gen-cli — Smart Unified Publisher         ║${NC}"
echo -e "${CYAN}${BOLD}╚═══════════════════════════════════════════════════════╝${NC}\n"

# --- Smart Environment Diagnostics & Auto-Fix ---
log_step "🔍 Smart Environment Diagnostics"

for cmd in node npm; do
  if ! command -v "$cmd" &> /dev/null; then
    log_error "'$cmd' is missing. Install Node.js via: brew install node"
    exit 1
  fi
  log_success "$cmd ready ($(command -v "$cmd"))"
done

PYTHON_BIN="python3"
if $PUBLISH_PYTHON; then
  if ! command -v python3 &> /dev/null; then
    log_error "python3 not found. Fix with: brew install python"
    exit 1
  fi

  # Auto-create/use local .venv if global pip is missing or PEP 668 externally managed
  if [[ -f "$SCRIPT_DIR/.venv/bin/python" ]]; then
    PYTHON_BIN="$SCRIPT_DIR/.venv/bin/python"
    log_success "Using project virtualenv: $PYTHON_BIN"
  elif ! python3 -m pip --version &> /dev/null; then
    log_warn "pip is missing on system Python! Auto-creating isolated .venv..."
    python3 -m venv "$SCRIPT_DIR/.venv"
    PYTHON_BIN="$SCRIPT_DIR/.venv/bin/python"
    "$PYTHON_BIN" -m ensurepip --upgrade || true
    log_success "Created and repaired Python environment at .venv/"
  fi

  # Ensure build & twine are installed inside the active Python environment
  for pkg in build twine; do
    if ! "$PYTHON_BIN" -m "$pkg" --version &> /dev/null; then
      log_warn "Module '$pkg' missing — installing automatically..."
      "$PYTHON_BIN" -m pip install --quiet --upgrade "$pkg"
    fi
  done
  log_success "Python packaging tools (pip, build, twine) verified & ready"
fi

# --- 1. Node.js (npm) Publishing ---
NEW_VERSION=$(node -p "require('./package.json').version")
if $PUBLISH_NODE; then
  log_step "📦 Publishing to npm"
  cd "$NODE_DIR"

  if ! npm whoami &> /dev/null; then
    log_error "Not logged in to npm. Run 'npm login' first."
    exit 1
  fi

  if ! $SKIP_TESTS; then
    log_info "Running Node.js verification..."
    npm test && log_success "Node.js tests passed"
  fi

  if ! $DRY_RUN; then
    npm version "$VERSION_BUMP" --no-git-tag-version
    NEW_VERSION=$(node -p "require('./package.json').version")
    sed -i '' "s/\.version(\"[^\"]*\")/\.version(\"$NEW_VERSION\")/" src/index.js
    npm publish
    log_success "Published context-gen-cli@$NEW_VERSION to npm!"
  else
    log_info "[DRY RUN] Would bump & publish npm v$NEW_VERSION"
  fi
fi

# --- 2. Sync In-Repo Homebrew Formula ---
if $PUBLISH_NODE && [[ -f "$FORMULA_FILE" ]]; then
  log_step "🍺 Updating In-Repo Homebrew Formula (Formula/context-gen-cli.rb)"
  TARBALL_URL="https://registry.npmjs.org/context-gen-cli/-/context-gen-cli-${NEW_VERSION}.tgz"
  if ! $DRY_RUN; then
    sleep 4
    SHA256=$(curl -sL "$TARBALL_URL" | shasum -a 256 | awk '{print $1}')
    sed -i '' "s|url \".*\"|url \"$TARBALL_URL\"|" "$FORMULA_FILE"
    sed -i '' "s|sha256 \".*\"|sha256 \"$SHA256\"|" "$FORMULA_FILE"
    sed -i '' "s|assert_match \".*\"|assert_match \"$NEW_VERSION\"|" "$FORMULA_FILE"
    log_success "Updated Formula/context-gen-cli.rb (SHA256: ${SHA256:0:12}...)"
  else
    log_info "[DRY RUN] Would update Formula/context-gen-cli.rb for v$NEW_VERSION"
  fi
fi

# --- 3. Python (PyPI) Publishing ---
if $PUBLISH_PYTHON; then
  log_step "🐍 Publishing to PyPI"
  cd "$PYTHON_DIR"
  rm -rf dist/ build/ *.egg-info

  if ! $DRY_RUN; then
    sed -i '' "s/^version = \".*\"/version = \"$NEW_VERSION\"/" pyproject.toml
    "$PYTHON_BIN" -m build
    "$PYTHON_BIN" -m twine upload dist/*
    log_success "Published context-gen-cli==$NEW_VERSION to PyPI!"
  else
    log_info "[DRY RUN] Would build & upload PyPI v$NEW_VERSION"
  fi
fi

echo -e "\n${GREEN}${BOLD}🎉 Release v$NEW_VERSION complete across npm, Homebrew Formula, and PyPI!${NC}\n"
