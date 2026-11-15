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
DART_DIR="$SCRIPT_DIR/dart"
JAVA_DIR="$SCRIPT_DIR/java"
FORMULA_FILE="$SCRIPT_DIR/Formula/context-gen-cli.rb"

PUBLISH_NODE=true
PUBLISH_PYTHON=true
PUBLISH_DART=false
PUBLISH_JAVA=false
PUSH_GIT=true
CUSTOM_COMMIT_MSG=""
DRY_RUN=false
SKIP_TESTS=false
VERSION_BUMP="patch"

while [[ $# -gt 0 ]]; do
  case $1 in
    --node-only)   PUBLISH_PYTHON=false; PUBLISH_DART=false; PUBLISH_JAVA=false; shift ;;
    --python-only) PUBLISH_NODE=false; PUBLISH_DART=false; PUBLISH_JAVA=false; shift ;;
    --dart-only)   PUBLISH_NODE=false; PUBLISH_PYTHON=false; PUBLISH_DART=true; PUBLISH_JAVA=false; shift ;;
    --java-only)   PUBLISH_NODE=false; PUBLISH_PYTHON=false; PUBLISH_DART=false; PUBLISH_JAVA=true; shift ;;
    --dart)        PUBLISH_DART=true; shift ;;
    --java)        PUBLISH_JAVA=true; shift ;;
    --all)         PUBLISH_NODE=true; PUBLISH_PYTHON=true; PUBLISH_DART=true; PUBLISH_JAVA=true; shift ;;
    --no-push|--skip-git) PUSH_GIT=false; shift ;;
    -m|--message)  CUSTOM_COMMIT_MSG="$2"; shift 2 ;;
    --dry-run)     DRY_RUN=true; shift ;;
    --skip-tests)  SKIP_TESTS=true; shift ;;
    --major)       VERSION_BUMP="major"; shift ;;
    --minor)       VERSION_BUMP="minor"; shift ;;
    --patch)       VERSION_BUMP="patch"; shift ;;
    -h|--help)
      echo "Usage: ./publish.sh [options]"
      echo "Options:"
      echo "  --patch | --minor | --major   Version bump type (default: patch)"
      echo "  --all                         Publish Node, Python, Dart, and Java"
      echo "  --node-only | --python-only   Publish only specific language"
      echo "  --dart | --java               Include Dart (pub.dev) or Java in release"
      echo "  --no-push                     Do not commit and push to GitHub"
      echo "  -m, --message <msg>           Custom git commit message"
      echo "  --dry-run                     Simulate tests & publish without changing remote"
      echo "  --skip-tests                  Bypass local pre-flight tests"
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

  # Ensure packaging & testing dependencies are installed inside the active Python environment
  for pkg in build twine pathspec rich typer; do
    if ! "$PYTHON_BIN" -c "import $pkg" &> /dev/null; then
      log_warn "Python module '$pkg' missing in virtualenv — installing automatically..."
      "$PYTHON_BIN" -m pip install --quiet --upgrade "$pkg"
    fi
  done
  log_success "Python packaging and test tools verified & ready"
fi

# --- Automated Pre-Flight Test Suite ---
if ! $SKIP_TESTS; then
  log_step "🧪 Running Automated Pre-flight Test Suite"

  # 1. Node.js tests
  log_info "Running Node.js tests..."
  cd "$NODE_DIR"
  npm test || { log_error "Node.js tests failed! Halting release."; exit 1; }
  log_success "Node.js test suite passed"

  # 2. Python tests
  if [[ -f "$PYTHON_DIR/tests/verify_scanner_graph.py" ]]; then
    log_info "Running Python AST & scanner tests..."
    PYTHONPATH="$PYTHON_DIR" "$PYTHON_BIN" "$PYTHON_DIR/tests/verify_scanner_graph.py" || { log_error "Python tests failed! Halting release."; exit 1; }
    log_success "Python scanner & AST graph tests passed"
  fi

  # 3. Documentation website build check
  if [[ -d "$SCRIPT_DIR/website" ]] && command -v bun &> /dev/null; then
    log_info "Verifying Next.js documentation website build..."
    (cd "$SCRIPT_DIR/website" && bun run build) || { log_error "Website build failed! Halting release."; exit 1; }
    log_success "Website build verified"
  fi
fi

# --- 1. Node.js (npm) Publishing ---
NEW_VERSION=$(node -p "require('./package.json').version")
if $PUBLISH_NODE; then
  log_step "📦 Publishing to npm"
  cd "$NODE_DIR"

  if ! $DRY_RUN && ! npm whoami &> /dev/null; then
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

# --- 4. Dart (pub.dev) Publishing ---
if $PUBLISH_DART; then
  log_step "🎯 Publishing to pub.dev (Dart)"
  cd "$DART_DIR"

  if ! command -v dart &> /dev/null; then
    log_warn "dart CLI not installed (run 'brew install dart-sdk'). Skipping pub.dev upload."
  else
    # Ensure LICENSE file is in package root (required by pub.dev)
    cp -f "$SCRIPT_DIR/LICENSE" "$DART_DIR/LICENSE"

    # Ensure pubspec.yaml version is synced
    sed -i '' "s/^version: .*/version: $NEW_VERSION/" pubspec.yaml

    # Ensure CHANGELOG.md mentions current version
    if ! grep -q "## $NEW_VERSION" CHANGELOG.md 2>/dev/null; then
      sed -i '' "1s/^/# Changelog\n\n## $NEW_VERSION\n- Release v$NEW_VERSION\n\n/" CHANGELOG.md
    fi

    if ! $DRY_RUN; then
      dart pub get
      log_info "Publishing context_gen_cli v$NEW_VERSION to pub.dev..."
      dart pub publish
      log_success "Published context_gen_cli v$NEW_VERSION to pub.dev!"
    else
      log_info "[DRY RUN] Running 'dart pub publish --dry-run'..."
      dart pub publish --dry-run || true
    fi
  fi
fi

# --- 5. Java (Maven Central / JBang) Publishing ---
if $PUBLISH_JAVA; then
  log_step "☕ Publishing Java Package"
  cd "$JAVA_DIR"
  cp -f "$SCRIPT_DIR/LICENSE" "$JAVA_DIR/LICENSE"

  # Sync Maven Central credentials from .env to ~/.m2/settings.xml
  if [[ -f "$SCRIPT_DIR/.env" ]]; then
    ENV_USER=$(grep -E "^MAVIN_USER_NAME=" "$SCRIPT_DIR/.env" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || true)
    ENV_PASS=$(grep -E "^MAVIN_USER_PASSWORD=" "$SCRIPT_DIR/.env" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || true)
    if [[ -n "$ENV_USER" && -n "$ENV_PASS" ]]; then
      mkdir -p "$HOME/.m2"
      cat <<EOF > "$HOME/.m2/settings.xml"
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 https://maven.apache.org/xsd/settings-1.0.0.xsd">
    <servers>
        <server>
            <id>central</id>
            <username>$ENV_USER</username>
            <password>$ENV_PASS</password>
        </server>
    </servers>
</settings>
EOF
      log_success "Configured Maven Central credentials from .env"
    fi
  fi

  if ! command -v mvn &> /dev/null; then
    log_warn "mvn not found. Install Maven via: brew install maven"
  else
    if ! $DRY_RUN; then
      mvn versions:set -DnewVersion="$NEW_VERSION" -DgenerateBackupPoms=false || true
      mvn clean deploy -P release
      log_success "Deployed com.cedzlabs:context-gen-cli:$NEW_VERSION to Central Portal!"
    else
      log_info "[DRY RUN] Would deploy com.cedzlabs:context-gen-cli:$NEW_VERSION to Maven Central"
    fi
  fi
fi

# --- 6. Automated Git Commit, Tag & Push to GitHub ---
if $PUSH_GIT; then
  log_step "🐙 Pushing Project & Release Tag to GitHub"
  cd "$SCRIPT_DIR"

  CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
  if [[ -z "$CURRENT_BRANCH" ]]; then CURRENT_BRANCH="main"; fi
  COMMIT_MSG="${CUSTOM_COMMIT_MSG:-chore(release): bump version to v${NEW_VERSION}}"

  if ! $DRY_RUN; then
    # Stage all changes
    git add -A

    # Commit only if there are diffs
    if ! git diff --cached --quiet; then
      git commit -m "$COMMIT_MSG"
      log_success "Created git commit: '$COMMIT_MSG'"
    else
      log_info "Working tree clean, no new commit needed."
    fi

    # Create annotated tag for the version
    TAG_NAME="v${NEW_VERSION}"
    if git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
      log_warn "Tag $TAG_NAME already exists locally. Skipping tag creation."
    else
      git tag -a "$TAG_NAME" -m "Release $TAG_NAME"
      log_success "Created git release tag: $TAG_NAME"
    fi

    # Push commit and tags to GitHub
    log_info "Pushing branch '$CURRENT_BRANCH' and release tag to origin..."
    git push origin "$CURRENT_BRANCH" --follow-tags
    log_success "Successfully pushed to GitHub repository (origin/$CURRENT_BRANCH)!"
    log_info "GitHub Actions CI/CD pipeline triggered automatically: https://github.com/yakkshit/context-gen/actions"
  else
    log_info "[DRY RUN] Would commit '$COMMIT_MSG', tag 'v$NEW_VERSION', and push to origin/$CURRENT_BRANCH"
  fi
fi

echo -e "\n${GREEN}${BOLD}🎉 Release v$NEW_VERSION complete across configured ecosystems and pushed to GitHub!${NC}\n"
