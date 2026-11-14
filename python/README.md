# ⚡ context-gen-cli (`ctx`) — Python Edition

<p align="center">
  <a href="https://pypi.org/project/context-gen-cli/"><img src="https://img.shields.io/pypi/v/context-gen-cli.svg?color=3775a9" alt="PyPI version" /></a>
  <a href="https://pypi.org/project/context-gen-cli/"><img src="https://img.shields.io/pypi/pyversions/context-gen-cli.svg" alt="Python Versions" /></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-Protocol%20Ready-6366f1.svg" alt="MCP Ready" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://resume.cedzlabs.com/labs"><img src="https://img.shields.io/badge/Cedzlabs-Labs%20%E2%86%97-cyan.svg" alt="Cedzlabs Labs" /></a>
</p>

> **Stop dumping 50,000 raw tokens into your AI coding agent.**  
> `context-gen-cli` analyzes any codebase using native AST parsers and **Entropy-Guided Reference Distillation (EGRD)** to give Cursor, Antigravity, Claude Code, and VS Code an ultra-dense **~40-token Senior Engineer Context Plan**—or stops to ask targeted questions if your prompt is ambiguous.

---

### 💡 Package Name vs. Command Alias

| What you install | What you run in your terminal |
| :--- | :--- |
| `pip install context-gen-cli` | **`ctx`** |

> **Why `ctx`?** While the package is registered as `context-gen-cli` on PyPI and npm, you shouldn't have to type 15 characters every time you run a command. The binary alias **`ctx`** is automatically registered upon installation. (The full `context-gen` alias is also preserved for scripts).

---

## 🌟 Highlights

- **⚡ Fast Short Alias (`ctx`)**: Type `ctx` anywhere in your terminal.
- **🧠 Entropy-Guided Reference Distillation (EGRD)**: Calculates Shannon Entropy ($H$) over codebase signatures to filter 98.5% of prompt noise.
- **🛡️ Anti-Hallucination Clarification Gate**: If your prompt is ambiguous ($H \ge 1.50\text{ bits}$), `ctx` halts guessing and asks targeted questions using real paths from your repo.
- **🕸️ 100% Accurate AST Knowledge Graph**: Uses native AST traversal to resolve relative imports, exports, roles, and downstream **Blast Radius** (what files break if this changes).
- **🔋 Zero GPU / CUDA Bloat**: Strictly capped at 1–2 CPU cores. No 15GB PyTorch downloads or local embedding models.
- **📁 Clean Monorepo / Workspace Storage**: Saves context models neatly into `context/agent.md`, `context/agent.json`, and `context/agent.yaml`.
- **🔒 Security Filter**: Strips virtual environments (`.venv*`, `venv*`), `.env*` files, pem/key certificates, and secrets automatically.

---

## 📦 Installation

```bash
# Standard installation
pip install context-gen-cli

# Or with pipx (recommended for isolated global CLI tools)
pipx install context-gen-cli

# Or with uv
uv tool install context-gen-cli
```

Verify installation:
```bash
ctx --help
```

---

## 🚀 Everyday Workflows & Examples

### 1. ⚡ All-In-One Workspace Mode (`ctx -d`)
Generates triple context formats (`agent.md`, `agent.json`, `agent.yaml`) in `context/` and runs a live auto-sync watcher in the background:
```bash
ctx -d
```

### 2. 🎯 Distill a Specific Prompt (`ctx distill`)
Generate a dense Senior Engineer Blueprint for any task:
```bash
ctx distill "add jwt refresh token rotation to authentication"
```

**Output:**
```text
╔═══════════════════════════════════════════════════════════════╗
║  🧠 SENIOR ENGINEER CONTEXT PLAN (EGRD Distilled)             ║
╚═══════════════════════════════════════════════════════════════╝

  🎯 Task: add jwt refresh token rotation to authentication
  ⚙️  Engineering Mode: Architecture / Refactor

  📂 Primary Files to Reference:
     ✔ src/services/auth.py
     ✔ src/routes/auth_routes.py
     ✔ src/models/user.py

  💥 Blast Radius (Downstream Callers):
     src/middleware/guard.py, src/app.py

  🛡️ Architecture Guardrail:
     Changes affect 2 downstream callers. Verify token payload backward compatibility.
```

### 3. ⚠️ The Clarification Gate (Ambiguous Prompts)
If you provide a vague prompt like:
```bash
ctx distill "update config"
```
Instead of hallucinating or dumping the entire repository, `ctx` pauses and shows:
```text
╔═══════════════════════════════════════════════════════════════╗
║  ⚠️  CLARIFICATION NEEDED — Ambiguous Prompt Detected         ║
╚═══════════════════════════════════════════════════════════════╝

  ▸ Prompt entropy H = 1.84 bits exceeds confident threshold (1.50 bits).
  ▸ Disambiguate by specifying target:
    1. src/config/database.py
    2. src/config/server.py
    3. src/config/redis.py
```

### 4. 📊 Check Token Weight & Savings (`ctx --tokens`)
Inspect how much context weight your AI agent saves compared to raw directory dumps:
```bash
ctx --tokens
```

---

## 📖 CLI Reference

| Command | Description |
| :--- | :--- |
| `ctx` | Scans workspace and generates `agent.md`, `agent.json`, `agent.yaml` in `context/` |
| `ctx -d` / `ctx --default` | **⚡ All-in-One**: Generates context and starts live file-watching sync |
| `ctx distill "<prompt>"` | **🧠 EGRD Distiller**: Generates high-signal Senior Engineer Blueprint |
| `ctx -w` / `ctx --watch` | **👀 Watch Mode**: Watches codebase and auto-updates context files on save |
| `ctx --tokens` | **📊 Token Analytics**: Displays token counts and compression ratios |
| `ctx -o <dir>` | **📁 Custom Output**: Specify output directory (defaults to `context/`) |
| `ctx -f <format>` | **📄 Format Filter**: Choose `md`, `json`, `yaml`, or `all` |
| `ctx update` | **🔄 Quick Refresh**: Re-indexes the current workspace |
| `ctx --help` | View full options and flag descriptions |

---

## 🛠️ MCP (Model Context Protocol) Integration

`ctx` can act as an MCP server for **Cursor**, **Claude Desktop**, **Antigravity**, and **VS Code**:

Add to your MCP settings (`claude_desktop_config.json` or Cursor Settings):
```json
{
  "mcpServers": {
    "context-gen": {
      "command": "ctx",
      "args": ["-d"]
    }
  }
}
```

---

## 🤝 Ecosystem & Links

- **Documentation & Showcase:** [https://resume.cedzlabs.com/labs](https://resume.cedzlabs.com/labs)
- **Node.js (npm):** `npx context-gen-cli@latest`
- **Homebrew (macOS):** `brew install context-gen-cli`
- **GitHub Repository:** [https://github.com/yakkshit/context-gen](https://github.com/yakkshit/context-gen)

---

## 📄 License

MIT © [Yakkshit](https://github.com/yakkshit) & [Cedzlabs](https://resume.cedzlabs.com/labs)
