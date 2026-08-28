# ⚡ context-gen-cli (Python Edition)

[![PyPI version](https://img.shields.io/pypi/v/context-gen-cli.svg?color=3775a9)](https://pypi.org/project/context-gen-cli/)
[![Python Versions](https://img.shields.io/pypi/pyversions/context-gen-cli.svg)](https://pypi.org/project/context-gen-cli/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> ⚡ **Fast, AST-powered Python CLI tool that scans any project, extracts architecture models, and generates structured LLM context (`agent.md`, `agent.json`, `agent.yaml`).**

---

## 🌟 Highlights

- **100% Accurate Python Dependency Graphs**: Built using Python's native `ast` (Abstract Syntax Tree) module to resolve imports, relative packages, entry points, and utilities without regex guesswork.
- **⚡ All-In-One Default Mode (`-d`)**: Auto-generates triple context formats in `context/` and runs a live auto-sync watcher in the background.
- **`.gitignore` & Multi-Ignore Respect**: Automatically parses rules from `.gitignore`, `.npmignore`, `.dockerignore`, `.contextignore`, `.ignore`, and filters `.env*` secrets.
- **Triple Format Output**: Generates Markdown (`agent.md`), MCP-compatible structured JSON (`agent.json`), and clean YAML (`agent.yaml`).
- **🔄 Auto-Sync Watch Mode (`-w`)**: Monitors workspace changes and updates context files automatically on save.
- **Configuration Parity**: Seamlessly reads `.context-gen.json` if present to maintain unified project settings with the Node.js edition.
- **Modern CLI**: Styled with `typer` and `rich` for rich terminal output and progress reporting.

---

## 📦 Installation

Install from PyPI using `pip` (or `pipx` / `uv`):

```bash
pip install context-gen-cli
```

---

## 🚀 Quick Start

### 1. ⚡ All-In-One Default Mode (Recommended)
Generates all formats in `context/` and starts the live auto-sync watcher in background:

```bash
context-gen -d
```

### 2. Generate All Formats (Markdown, JSON, YAML)
Scans the current directory and outputs `agent.md`, `agent.json`, and `agent.yaml` in `context/`:

```bash
context-gen .
```

### 3. Generate Specific Format (JSON / MD / YAML)
Generate only the format you need:

```bash
# Generate MCP-ready JSON
context-gen . --format json

# Generate Markdown
context-gen . --format md

# Generate YAML
context-gen . --format yaml
```

### 4. Watch Mode
Keep context files fresh automatically on every file edit:

```bash
context-gen . --watch
```

### 5. Custom Output Destination & Directory Depth
```bash
context-gen ./my-project -o custom/docs/context.md --max-depth 4
```

---

## 📖 CLI Reference

```text
Usage: context-gen [OPTIONS] [PATH]

Arguments:
  [PATH]    Target project directory to analyze  [default: .]

Options:
  -d, --default             ⚡ Zero-config default mode: generate all formats in context/ and run live auto-sync watcher
  -f, --format [all|md|json|yaml]  Output format [default: all]
  -o, --output PATH         Custom output file path (e.g. context/agent.md or custom.json)
  -w, --watch               Watch directory and auto-regenerate context on file changes
  --max-depth INTEGER       Maximum directory depth to scan (1-10) [default: 3]
  --help                    Show this message and exit
```

---

## 🌐 Node.js & Live MCP Server

Looking for the live MCP server with interactive SSE streaming and public tunnels? Check out the [Node.js edition](https://www.npmjs.com/package/context-gen-cli):

```bash
npx context-gen-cli -d
# or
npx context-gen-cli --mcp
```

---

## 📄 License

MIT © [yakkshit](https://github.com/yakkshit)
