# ⚡ context-gen-cli

[![npm version](https://img.shields.io/npm/v/context-gen-cli.svg?color=cb3837)](https://www.npmjs.com/package/context-gen-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/node/v/context-gen-cli.svg)](https://nodejs.org)
[![MCP Ready](https://img.shields.io/badge/MCP-Protocol%20Ready-6366f1.svg)](https://modelcontextprotocol.io)

> 🚀 **The ultimate AI project context generator and live Model Context Protocol (MCP) server.**  
> Scans any codebase, builds a dependency graph, enforces security filters, and creates token-efficient context files (`agent.md`, `agent.json`, `agent.yaml`) for Claude, Cursor, Antigravity, VS Code, and other AI agents.

---

## 🌟 Key Features

- **⚡ Zero-Config Context Generation**: Generates clean, structured architectural models in Markdown, JSON, or YAML.
- **🔌 One-Command MCP Server (`--mcp`)**: Instantly boots a local or public MCP server with API key authentication for any IDE.
- **🌐 Built-in Multi-Tunneling**: Share live project context with remote LLMs using free native SSH tunnels (`localhost.run`, `serveo.net`) or token-based providers (`ngrok`, `cloudflare`).
- **🛡️ Intelligent Security & Ignore Filters**: Automatically loads and respects `.gitignore`, `.npmignore`, `.dockerignore`, `.env*` files, SSH keys, certificates, and custom secret patterns.
- **🕸️ Dependency & Architecture Graph**: Maps entry points, core utilities, and file relationships.
- **🖥️ Glassmorphic Live Dashboard UI**: View context files, test MCP tools interactively, and copy 1-click configs at `http://localhost:3456/`.
- **🔄 Auto-Sync Watch Mode (`--watch`)**: Keeps context models updated automatically on every file save.

---

## 📦 Quick Start

### 1. Run without installing (Recommended)

```bash
# ⚡ All-In-One Local (Default context + Live MCP Server + Auto-sync Watcher)
npx context-gen-cli -d

# 🌐 All-In-One Public (Shareable tunnel URL for remote AI agents + Auto-sync)
npx context-gen-cli -d --public

# Interactive 1-step setup + boot live MCP server
npx context-gen-cli --mcp

# Generate agent.md in context/ directory
npx context-gen-cli
```

### 2. Install globally

```bash
npm install -g context-gen-cli

# Run all-in-one anywhere
context-gen-cli -d
```

---

## 📖 Command Guide

| Command | Description |
| :--- | :--- |
| `context-gen-cli -d` | **⚡ All-in-One Local**: Generates context, boots local MCP server, runs live watcher |
| `context-gen-cli -d --public` | **🌐 All-in-One Public**: Generates context, boots public MCP URL, runs live watcher |
| `context-gen-cli [path]` | Scan project and generate context files in `context/` |
| `context-gen-cli --mcp` | **Interactive MCP wizard**: auto-generates `agent.json` & starts server |
| `context-gen-cli --format json` | Output machine-readable JSON (`context/agent.json`) |
| `context-gen-cli --format md` | Output structured Markdown (`context/agent.md`) |
| `context-gen-cli --watch` | Watch mode: auto-regenerates context on file save |
| `context-gen-cli init` | Interactive setup wizard for folders, security & output location |
| `context-gen-cli serve` | Start local MCP server directly on port 3456 |
| `context-gen-cli serve --public` | Start MCP server with public tunnel selection |
| `context-gen-cli --help` | View full help and next steps guide |

---

## 🔌 Using as an MCP Server

When running `context-gen-cli --mcp` (or `context-gen-cli serve`), the tool provides standard MCP tools to AI assistants:

- `get_context`: Returns the full structured project context model.
- `scan_project`: Triggers a live rescan of the codebase.
- `list_tools_info`: Returns available MCP tool descriptions and capabilities.

### 📋 IDE Setup Examples

#### Cursor / Claude Desktop / Antigravity
Add to your MCP configuration (`claude_desktop_config.json` or Cursor MCP settings):

```json
{
  "mcpServers": {
    "context-gen": {
      "url": "http://localhost:3456/mcp",
      "headers": {
        "X-API-Key": "YOUR_API_KEY_FROM_DOTENV"
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
        "X-API-Key": "YOUR_API_KEY_FROM_DOTENV"
      }
    }
  }
}
```

---

## 🛡️ Security & Privacy

Your code's security is guaranteed:
1. **Zero Secret Leakage**: Sensitive files (`.env`, `.pem`, `.key`, `id_rsa*`, credentials folders) are automatically detected and omitted from context files.
2. **Auto-Ignore Engine**: All patterns in `.gitignore`, `.npmignore`, `.dockerignore`, and `.contextignore` are automatically enforced.
3. **API Key Protected**: All MCP server endpoints (`/mcp`, `/sse`, `/tools/call`) require API key authentication (auto-saved to project `.env`).

---

## 🐍 Python Edition

Prefer Python? `context-gen-cli` is also available as a standalone Python package powered by native Python AST:

```bash
pip install context-gen-cli

# Run Python CLI
context-gen . --format json
```
See the [Python README](./python/README.md) for details.

---

## 📄 License

MIT © [yakkshit](https://github.com/yakkshit)
