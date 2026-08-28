# Project Context

## Overview

A lightweight npm CLI tool that scans any codebase, constructs a dependency and architectural graph model, and outputs a concise agent.md context file ready to paste into any LLM (ChatGPT, Claude, Gemini, etc.).


## Tech Stack

- JSON
- Markdown
- Python
- JavaScript
- Shell Script
- Express.js
- Node.js


## Directory Structure

```text
└── context graph/
    ├── .vscode/
    │   └── mcp.json
    ├── python/
    │   ├── .pytest_cache/
    │   │   ├── v/
    │   │   │   └── ...
    │   │   ├── .gitignore
    │   │   ├── CACHEDIR.TAG
    │   │   └── README.md
    │   ├── context_gen/
    │   │   ├── __init__.py
    │   │   ├── cli.py
    │   │   ├── extractor.py
    │   │   ├── generator.py
    │   │   ├── graph.py
    │   │   └── scanner.py
    │   ├── context_gen_cli.egg-info/
    │   │   ├── dependency_links.txt
    │   │   ├── entry_points.txt
    │   │   ├── PKG-INFO
    │   │   ├── requires.txt
    │   │   ├── SOURCES.txt
    │   │   └── top_level.txt
    │   ├── tests/
    │   │   ├── test_fixture/
    │   │   │   └── ...
    │   │   └── verify_scanner_graph.py
    │   ├── pyproject.toml
    │   └── README.md
    ├── src/
    │   ├── mcp/
    │   │   ├── auth.js
    │   │   ├── dashboard.js
    │   │   ├── server.js
    │   │   ├── tools.js
    │   │   └── tunnel.js
    │   ├── config.js
    │   ├── extractor.js
    │   ├── generator.js
    │   ├── graph.js
    │   ├── index.js
    │   ├── init.js
    │   ├── scanner.js
    │   └── security.js
    ├── test/
    │   └── fixture/
    │       ├── .vscode/
    │       │   └── ...
    │       ├── src/
    │       │   └── ...
    │       ├── .gitignore
    │       ├── main.py
    │       ├── math_helper.py
    │       ├── package.json
    │       ├── README-ALT.md
    │       ├── README.md
    │       └── requirements.txt
    ├── .gitignore
    ├── .npmignore
    ├── LICENSE
    ├── package-lock.json
    ├── package.json
    ├── publish.sh
    └── README.md
```

## Key Files

- **`python/.pytest_cache/README.md`**: Project documentation and overview.
- **`python/tests/test_fixture/main.py`**: Main application entry point.
- **`python/README.md`**: Project documentation and overview.
- **`src/mcp/auth.js`**: Ensures security files (.env, .env.*, .context-gen-key, mcp.md) are in .gitignore.
- **`src/mcp/dashboard.js`**: Provides a UI for inspecting connection details, copying IDE configs,.
- **`src/mcp/server.js`**: Generates an mcp.md documentation file in the context directory.
- **`src/mcp/tools.js`**: List of sensitive filenames or patterns that must NEVER be served to any LLM.
- **`src/mcp/tunnel.js`**: Source module.
- **`src/config.js`**: Returns the default configuration object for context-gen.
- **`src/extractor.js`**: Extracts recent git commits from the project root if it is a git repository.
- **`src/generator.js`**: Generates the full agent.md markdown document from scan results, extracted metadata, and dependency graph.
- **`src/graph.js`**: Supported source file extensions for dependency graph analysis.
- **`src/index.js`**: Scans a project, builds an architecture & dependency graph model,.
- **`src/init.js`**: Displays the ASCII art welcome banner.
- **`src/scanner.js`**: Source module.


## Dependencies

### Production Dependencies
- `@inquirer/prompts@^8.7.0`
- `@modelcontextprotocol/sdk@^1.30.0`
- `chalk@^6.0.0`
- `chokidar@^5.0.0`
- `commander@^15.0.0`
- `dotenv@^17.4.2`
- `express@^5.2.1`
- `figlet@^1.11.4`
- `globby@^16.2.4`
- `ignore@^7.0.6`
- `js-yaml@^5.4.1`
- `ngrok@^5.0.0-beta.2`
- `ora@^9.4.1`


## Entry Points

- **main**: `src/index.js`
- **bin (context-gen-cli)**: `src/index.js`
- **bin (context-gen)**: `src/index.js`
- **scripts.start**: `node src/index.js`


## Dependency Graph

### Entry Points
- `src/index.js` (main entry)
- `test/fixture/src/index.js` (main entry)
- `python/tests/test_fixture/main.py` (main entry)
- `test/fixture/main.py` (main entry)

### Core Modules
- `src/mcp/server.js` (imported by 1 file)
- `src/mcp/tools.js` (imported by 1 file)
- `src/config.js` (imported by 3 files)
- `src/extractor.js` (imported by 3 files)
- `src/generator.js` (imported by 3 files)
- `src/graph.js` (imported by 3 files)
- `src/init.js` (imported by 1 file)
- `src/scanner.js` (imported by 3 files)
- `test/fixture/src/components/App.js` (imported by 1 file)
- `test/fixture/src/utils/math.js` (imported by 2 files)

### Utilities
- `src/config.js` (shared helper)
- `src/extractor.js` (shared helper)
- `src/generator.js` (shared helper)
- `src/graph.js` (shared helper)
- `src/scanner.js` (shared helper)
- `test/fixture/src/utils/math.js` (shared helper)
- `python/tests/test_fixture/utils.py` (shared helper)
- `test/fixture/math_helper.py` (shared helper)

### Key Relationships
- `python/tests/test_fixture/main.py` → `python/tests/test_fixture/utils.py`
- `src/mcp/server.js` → `src/mcp/auth.js`
- `src/mcp/server.js` → `src/mcp/tools.js`
- `src/mcp/server.js` → `src/mcp/tunnel.js`
- `src/mcp/server.js` → `src/mcp/dashboard.js`
- `src/mcp/server.js` → `src/scanner.js`
- `src/mcp/server.js` → `src/extractor.js`
- `src/mcp/server.js` → `src/graph.js`
- `src/mcp/server.js` → `src/generator.js`
- `src/mcp/tools.js` → `src/scanner.js`


## Quick Notes for the LLM

- **Execution Context**: Refer to the entry points above to understand application bootstrap.
- **Modularity**: Check the Dependency Graph before refactoring to maintain module coupling.
- **Dependencies**: Rely on the installed packages and runtimes listed under Tech Stack.
