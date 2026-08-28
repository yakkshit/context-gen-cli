#!/usr/bin/env bash

# =======================================================
# 🚀 context-gen-cli — Unified Publisher
# Publishes both Node.js (npm) and Python (PyPI) packages
# =======================================================

set -euo pipefail

# --- Color & Emoji Helpers ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

log_info()    { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn()    { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error()   { echo -e "${RED}❌ $1${NC}"; }
log_step()    { echo -e "\n${PURPLE}${BOLD}━━━ $1 ━━━${NC}"; }

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_DIR="$SCRIPT_DIR"
PYTHON_DIR="$SCRIPT_DIR/python"

# --- Flags ---
PUBLISH_NODE=true
PUBLISH_PYTHON=true
DRY_RUN=false
SKIP_TESTS=false
VERSION_BUMP="patch"  # patch | minor | major

# --- Parse Arguments ---
while [[ $# -gt 0 ]]; do
  case $1 in
    --node-only)      PUBLISH_PYTHON=false; shift ;;
    --python-only)    PUBLISH_NODE=false; shift ;;
    --dry-run)        DRY_RUN=true; shift ;;
    --skip-tests)     SKIP_TESTS=true; shift ;;
    --major)          VERSION_BUMP="major"; shift ;;
    --minor)          VERSION_BUMP="minor"; shift ;;
    --patch)          VERSION_BUMP="patch"; shift ;;
    -h|--help)
      echo "Usage: ./publish.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --node-only      Only publish Node.js (npm) package"
      echo "  --python-only    Only publish Python (PyPI) package"
      echo "  --dry-run        Show what would be done without publishing"
      echo "  --skip-tests     Skip running tests before publishing"
      echo "  --major/--minor/--patch  Version bump type (default: patch)"
      echo "  -h, --help       Show this help message"
      exit 0
      ;;
    *) log_error "Unknown option: $1"; exit 1 ;;
  esac
done

# --- Banner ---
echo ""
echo -e "${CYAN}${BOLD}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║   🚀 context-gen-cli — Unified Publisher v1.0         ║${NC}"
echo -e "${CYAN}${BOLD}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

if $DRY_RUN; then
  log_warn "DRY RUN MODE — No actual publishing will occur."
  echo ""
fi

# --- Pre-flight Checks ---
log_step "🔍 Pre-flight Checks"

check_command() {
  if ! command -v "$1" &> /dev/null; then
    log_error "Required command '$1' not found. Please install it first."
    exit 1
  fi
  log_success "$1 is installed: $(command -v "$1")"
}

check_command "node"
check_command "npm"
check_command "python3"

if $PUBLISH_PYTHON; then
  check_command "twine"
  python3 -m build --version &> /dev/null || {
    log_warn "Python 'build' module not found. Installing..."
    python3 -m pip install --quiet build
  }
  log_success "Python build tools ready"
fi

# --- Node.js Publishing ---
if $PUBLISH_NODE; then
  log_step "📦 Node.js (npm) Publishing"
  cd "$NODE_DIR"

  # Check npm auth
  if ! npm whoami &> /dev/null; then
    log_error "Not logged in to npm. Run 'npm login' first."
    exit 1
  fi
  NPM_USER=$(npm whoami)
  log_success "Logged in to npm as: $NPM_USER"

  # Run tests if they exist
  if ! $SKIP_TESTS && [ -d "test" ] || [ -d "tests" ]; then
    log_info "Running Node.js tests..."
    if npm test 2>/dev/null; then
      log_success "Node.js tests passed"
    else
      log_warn "No test script found or tests failed. Use --skip-tests to bypass."
      if ! $DRY_RUN; then
        read -p "Continue anyway? [y/N] " -n 1 -r
        echo
        [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
      fi
    fi
  fi

  # Bump version
  CURRENT_VERSION=$(node -p "require('./package.json').version")
  log_info "Current version: $CURRENT_VERSION"

  if ! $DRY_RUN; then
    npm version "$VERSION_BUMP" --no-git-tag-version
    NEW_VERSION=$(node -p "require('./package.json').version")
    log_success "Bumped version: $CURRENT_VERSION → $NEW_VERSION"
  else
    log_info "[DRY RUN] Would bump version to $VERSION_BUMP"
    NEW_VERSION="$CURRENT_VERSION"
  fi

  # Publish
  if ! $DRY_RUN; then
    log_info "Publishing context-gen-cli@$NEW_VERSION to npm..."
    npm publish
    log_success "🎉 Published to npm successfully!"
  else
    log_info "[DRY RUN] Would publish context-gen-cli@$NEW_VERSION to npm"
  fi
else
  log_info "Skipping Node.js publishing (--python-only)"
fi

# --- Python Publishing ---
if $PUBLISH_PYTHON; then
  log_step "🐍 Python (PyPI) Publishing"
  cd "$PYTHON_DIR"

  # Check PyPI credentials
  if [ ! -f "$HOME/.pypirc" ]; then
    log_warn "No ~/.pypirc file found. You'll need to enter your PyPI token manually."
    log_info "Get a token at: https://pypi.org/manage/account/token/"
  else
    log_success "PyPI credentials found in ~/.pypirc"
  fi

  # Run tests if they exist
  if ! $SKIP_TESTS && [ -d "tests" ]; then
    if command -v pytest &> /dev/null; then
      log_info "Running Python tests..."
      if pytest tests/ -q; then
        log_success "Python tests passed"
      else
        log_warn "Python tests failed. Use --skip-tests to bypass."
        if ! $DRY_RUN; then
          read -p "Continue anyway? [y/N] " -n 1 -r
          echo
          [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
        fi
      fi
    else
      log_warn "pytest not installed. Skipping tests."
    fi
  fi

  # Clean old builds
  log_info "Cleaning old build artifacts..."
  rm -rf dist/ build/ *.egg-info context_gen/*.egg-info
  log_success "Cleaned"

  # Read current version
  CURRENT_PY_VERSION=$(python3 -c "import tomllib; print(tomllib.load(open('pyproject.toml', 'rb'))['project']['version'])" 2>/dev/null || grep -E '^version = ' pyproject.toml | head -1 | sed 's/version = "\(.*\)"/\1/')
  log_info "Current Python version: $CURRENT_PY_VERSION"

  # Build
  if ! $DRY_RUN; then
    log_info "Building Python package..."
    python3 -m build
    log_success "Build complete"
  else
    log_info "[DRY RUN] Would build Python package"
  fi

  # Upload
  if ! $DRY_RUN; then
    log_info "Uploading to PyPI..."
    log_warn "When prompted, use:"
    echo -e "  ${BOLD}Username:${NC} __token__"
    echo -e "  ${BOLD}Password:${NC} (paste your pypi-... token)"
    python3 -m twine upload dist/*
    log_success "🎉 Published to PyPI successfully!"
  else
    log_info "[DRY RUN] Would upload to PyPI"
  fi
else
  log_info "Skipping Python publishing (--node-only)"
fi

# --- Final Summary ---
echo ""
echo -e "${GREEN}${BOLD}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║              🎉 PUBLISHING COMPLETE! 🎉               ║${NC}"
echo -e "${GREEN}${BOLD}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""