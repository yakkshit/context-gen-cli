# ⚡ context-gen-cli (`ctx`) — Python Edition

[![PyPI version](https://img.shields.io/pypi/v/context-gen-cli.svg?color=3775a9)](https://pypi.org/project/context-gen-cli/)
[![Python Versions](https://img.shields.io/pypi/pyversions/context-gen-cli.svg)](https://pypi.org/project/context-gen-cli/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> ⚡ **Fast, AST-powered Python CLI tool that scans any project, extracts architecture models, and generates structured LLM context (`agent.md`, `agent.json`, `agent.yaml`).**

---

## 🌟 Highlights

- **⚡ Short Command Alias (`ctx`)**: Type `ctx` anywhere in your terminal.
- **100% Accurate Python Dependency Graphs**: Built using Python's native `ast` (Abstract Syntax Tree) module to resolve imports, relative packages, entry points, and utilities.
- **📁 Clean Workspace Storage**: Everything (`agent.md`, `agent.json`, `agent.yaml`, `.context-gen.json`) is saved neatly inside `context/`.
- **⚡ All-In-One Default Mode (`-d`)**: Auto-generates triple context formats in `context/` and runs a live auto-sync watcher in the background.
- **`.gitignore` & Multi-Ignore Respect**: Automatically parses rules from `.gitignore`, `.npmignore`, `.dockerignore`, `.contextignore`, `.ignore`, and filters `.env*` secrets.
- **Triple Format Output**: Generates Markdown (`agent.md`), MCP-compatible structured JSON (`agent.json`), and clean YAML (`agent.yaml`).
- **🔄 Auto-Sync Watch Mode (`-w`)**: Monitors workspace changes and updates context files automatically on save.
- **Configuration Parity**: Seamlessly reads `context/.context-gen.json` to maintain unified project settings with the Node.js edition.

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
ctx -d
```

### 2. Generate All Formats (Markdown, JSON, YAML)
Scans the current directory and outputs `agent.md`, `agent.json`, and `agent.yaml` in `context/`:

```bash
ctx
```

### 3. Quick Refresh / Regenerate
```bash
ctx update
```

### 4. Custom Format & Output Destination
```bash
ctx update -f json
ctx -o custom_docs/
ctx -p /path/to/project
```

### 5. Watch Mode
Keep context files fresh automatically on every file edit:

```bash
ctx -w
```

---

## 📖 CLI Reference

| Flag / Command | Alias | Description |
| :--- | :--- | :--- |
| `ctx -d` | `ctx --default` | **⚡ All-in-One**: Generates context files and starts live auto-sync watcher |
| `ctx -w` | `ctx --watch` | **👀 Watch Mode**: Auto-regenerates context on file changes |
| `ctx -f <type>` | `ctx --format <type>` | **Format**: `md`, `json`, `yaml`, or `all` |
| `ctx -o <path>` | `ctx --output <path>` | **Custom Output**: Output file/folder path |
| `ctx -p <path>` | `ctx --project <path>` | **Target Directory**: Directory to analyze |
| `ctx update` | — | **Refresh**: Regenerate context files |
| `ctx --help` | — | View full help options |

---

## 📄 License

MIT © [yakkshit](https://github.com/yakkshit)

