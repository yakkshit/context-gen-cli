# ⚡ context-gen-cli (`ctx`)

[![npm version](https://img.shields.io/npm/v/context-gen-cli.svg?color=cb3837)](https://www.npmjs.com/package/context-gen-cli)
[![PyPI version](https://img.shields.io/pypi/v/context-gen-cli.svg?color=3775a9)](https://pypi.org/project/context-gen-cli/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![MCP Ready](https://img.shields.io/badge/MCP-Protocol%20Ready-6366f1.svg)](https://modelcontextprotocol.io)

> 🚀 **The ultimate AI project context generator and live Model Context Protocol (MCP) server.**  
> Scans any codebase, builds a dependency graph, enforces security filters, and creates token-efficient context files (`agent.md`, `agent.json`, `agent.yaml`) for Claude, Cursor, Antigravity, VS Code, and other AI agents.

---

## 🌟 Key Features

- **⚡ Short Command Alias (`ctx`)**: Type `ctx` instead of the full package name.
- **📁 Clean Workspace Storage**: Everything (`agent.md`, `agent.json`, `agent.yaml`, `mcp.md`, `.context-gen.json`) is neatly stored inside `context/`.
- **🔌 One-Command MCP Server (`-m`, `--mcp`)**: Instantly boots a local or public MCP server with API key authentication for any AI IDE.
- **🌐 Built-in Multi-Tunneling**: Share live project context with remote LLMs using free native SSH tunnels (`localhost.run`, `serveo.net`) or token-based providers (`ngrok`, `cloudflare`).
- **🛡️ Intelligent Security & Ignore Filters**: Automatically loads and respects `.gitignore`, `.npmignore`, `.dockerignore`, `.env*` files, SSH keys, certificates, and custom secret patterns.
- **🕸️ Dependency & Architecture Graph**: Maps entry points, core utilities, and file relationships.
- **🔄 Auto-Sync Watch Mode (`-w`, `--watch`)**: Keeps context models updated automatically on every file save.
- **⚡ All-in-One Mode (`-d`, `--default`)**: Generates context, boots MCP server, and runs background auto-sync watcher in one command.

---

## 📦 Installation & Quick Start

### 1. Global Installation (Recommended)

```bash
# Node.js (npm)
npm install -g context-gen-cli

# Python (pip)
pip install context-gen-cli
```

### 2. Run Anywhere

```bash
# ⚡ All-In-One Default Mode (Generate + Live MCP Server + Auto-sync Watcher)
ctx -d

# 🌐 Shareable Public MCP Server (For remote AI assistants)
ctx -m --public
# or
ctx serve --public

# 🚀 Quick scan & context generation
ctx

# 🔄 Regenerate / Refresh context
ctx update

# 📋 Change format on the fly
ctx update -f json      # options: md, json, yaml, all

# 📁 Custom output folder or project target
ctx -o custom_docs/
ctx -p /path/to/project
```

### 3. Run without installing (via `npx`)

```bash
npx context-gen-cli -d
# or using alias via npx:
npx -p context-gen-cli ctx update
```

---

## 📖 Command & Flag Guide

| Flag / Command | Alias | Description |
| :--- | :--- | :--- |
| `ctx -d` | `ctx --default` | **⚡ All-in-One**: Generates context, boots local MCP server, and runs live watcher |
| `ctx -m` | `ctx --mcp` | **🔌 Interactive MCP Server**: Boots MCP server with 1-click config |
| `ctx -w` | `ctx --watch` | **👀 Live Watch Mode**: Auto-regenerates context on file changes |
| `ctx -f <type>` | `ctx --format <type>` | **Format Switcher**: `md`, `json`, `yaml`, or `all` (default: `all`) |
| `ctx -o <path>` | `ctx --output <path>` | **Custom Destination**: Save output files to a custom folder |
| `ctx -p <path>` | `ctx --project <path>` | **Target Directory**: Project directory to analyze |
| `ctx -i` | `ctx --interactive` | **Interactive Setup**: Run configuration setup wizard |
| `ctx update` | `ctx generate` | **Refresh**: Regenerate context files in `context/` |
| `ctx init` | — | **Wizard**: Configure ignore rules, security filters, and output paths |
| `ctx serve --public` | — | **🌐 Public URL**: Expose MCP server via secure tunnel for remote agents |

---

## 🔌 Using with AI Agents & IDEs (MCP)

When running `ctx -m` or `ctx serve`, `context-gen-cli` provides standard MCP tools:
- `get_context`: Returns structured project context JSON for LLM reasoning.
- `scan_project`: Triggers a live rescan of the codebase.
- `list_tools_info`: Returns descriptions of all available MCP tools.

### 📋 IDE Configuration Examples

#### Cursor / Claude Desktop / Antigravity
Add to your MCP settings file (`mcp_config.json` or `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "context-gen": {
      "url": "http://localhost:3456/mcp",
      "headers": {
        "X-API-Key": "YOUR_API_KEY"
      }
    }
  }
}
```

#### VS Code (`.vscode/mcp.json`)
```json
{
  "servers": {
    "context-gen": {
      "type": "sse",
      "url": "http://localhost:3456/sse",
      "headers": {
        "X-API-Key": "YOUR_API_KEY"
      }
    }
  }
}
```

---

## 🛡️ Security & Privacy

1. **Zero Secret Leakage**: Sensitive files (`.env`, `.pem`, `.key`, `id_rsa*`, credentials folders) are automatically excluded.
2. **Auto-Ignore Engine**: All patterns in `.gitignore`, `.npmignore`, `.dockerignore`, and `.contextignore` are automatically enforced.
3. **API Key Protected**: All MCP server endpoints require API key authentication (auto-saved to project `.env`).

---

## 🐍 Python & Node.js Feature Parity

`context-gen-cli` is available for both **Node.js** and **Python** with identical flag support and output formats:

```bash
# Node.js
npm install -g context-gen-cli
ctx -d

# Python
pip install context-gen-cli
ctx -d
```

---

## 📄 License

MIT © [yakkshit](https://github.com/yakkshit)

