# ⚡ context-gen-cli (`ctx`)

<p align="center">
  <strong>Stop dumping 50,000 raw tokens into your AI coding agent.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/context-gen-cli"><img src="https://img.shields.io/npm/v/context-gen-cli.svg?color=cb3837" alt="npm version" /></a>
  <a href="https://pypi.org/project/context-gen-cli/"><img src="https://img.shields.io/pypi/v/context-gen-cli.svg?color=3775a9" alt="PyPI version" /></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-Protocol%20Ready-6366f1.svg" alt="MCP Ready" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://resume.cedzlabs.com/labs"><img src="https://img.shields.io/badge/Cedzlabs-Labs%20%E2%86%97-cyan.svg" alt="Cedzlabs Labs" /></a>
</p>

`context-gen-cli` scans any codebase, builds an AST Knowledge Graph, and uses **Entropy-Guided Reference Distillation (EGRD)** to give Cursor, Antigravity, Claude Code, and VS Code a ~40-token **Senior Engineer Context Plan**—or stops to ask clarifying questions when your prompt is vague.

- **98.5% Token Reduction:** Distills multi-thousand-token repos into ~40–150 high-signal tokens.
- **CPU-First & Lightweight:** Strictly capped at **1–2 CPU cores** with zero GPU/CUDA downloads.
- **Polyglot & Monorepo Ready:** Supports TypeScript, JavaScript, Python, Rust, Go, Dart/Flutter, and C#.
- **Built-in MCP Server:** Live file-watching Model Context Protocol server with optional public tunneling.

---

## 🚀 Quick Install

### Option 1: Node.js / `npx` (Zero Install)
```bash
npx context-gen-cli@latest -d
```

### Option 2: Python / `pip`
```bash
pip install context-gen-cli
ctx -d
```

### Option 3: Homebrew (macOS / Linux)
```bash
brew tap yakkshit/context-gen https://github.com/yakkshit/context-gen.git
brew install context-gen-cli
ctx -d
```

---

## 🛠️ Developer Examples (Copy & Paste)

### 1. Start Your Daily Workspace (`ctx -d`)
Run inside any project root to generate `context/agent.md`, `context/agent.json`, `context/agent.yaml`, start the MCP server (`http://localhost:3456/mcp`), and auto-sync on file save:
```bash
ctx -d
```

### 2. Distill a Specific Task (`ctx distill`)
Get a Senior Engineer Context Plan showing exact files to reference, exported symbols, and downstream Blast Radius callers:
```bash
ctx distill "update mcp tools and scanner graph in src"
```

Output:
```text
╔═══════════════════════════════════════════════════════════════╗
║ 🧠 SENIOR ENGINEER CONTEXT PLAN (41 tokens | CPU: 1 core)     ║
╚═══════════════════════════════════════════════════════════════╝
🎯 Task: update mcp tools and scanner graph in src
📂 Primary Files to Reference:
   ✔ src/graph.js [js/lib] — exports: [buildDependencyGraph]
   ✔ src/scanner.js [js/lib] — exports: [scanProject]
💥 Blast Radius: src/mcp/server.js, src/mcp/tools.js
🛡️ Architecture Guardrail: Mirror existing patterns; keep modular.
```

### 3. Prevent AI Hallucinations on Vague Prompts
If your prompt is ambiguous (Shannon Entropy $H \ge 1.5\text{ bits}$), `ctx` refuses to guess and outputs concrete questions grounded in your repo:
```bash
ctx distill "add auth"
```

Output:
```text
╔═══════════════════════════════════════════════════════════════╗
║ ⚠️  CLARIFICATION NEEDED — Ambiguous Prompt Detected           ║
╚═══════════════════════════════════════════════════════════════╝
▸ 1. Implementation Pattern: Should I extend an existing module?
     (e.g., "Follow src/mcp/auth.js" or "Create a standalone module")
▸ 2. Side Effects & Persistence: Persist to disk/DB or stay stateless?
```

### 4. Target a Sub-Project or Custom Token Budget
```bash
ctx distill "add billing webhook handler" -p ./services/api -b 200
```

### 5. Connect to Antigravity / Cursor / Claude / VS Code (MCP)
Add this to your IDE's MCP configuration (`~/.gemini/antigravity/mcp.json` or `.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "context-gen": {
      "url": "http://localhost:3456/mcp"
    }
  }
}
```

The AI agent will automatically call `distill_context` before writing or refactoring code.

---

## 🌐 More Products & Labs

Explore more AI developer tools, CLI utilities, and research prototypes at [Cedzlabs Labs](https://resume.cedzlabs.com/labs).

---

## 📄 License

MIT © [yakkshit](https://github.com/yakkshit)
