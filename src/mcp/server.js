import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { getOrCreateApiKey, createAuthMiddleware } from "./auth.js";
import { registerMcpTools } from "./tools.js";
import { startTunnel, stopTunnel } from "./tunnel.js";
import { renderDashboardHtml } from "./dashboard.js";
import { scanProject } from "../scanner.js";
import { extractMetadata } from "../extractor.js";
import { buildDependencyGraph } from "../graph.js";
import { generateAgentJson, generateAgentMd } from "../generator.js";

/**
 * Generates an mcp.md documentation file in the context directory.
 * @param {string} rootDir - Project root path.
 * @param {object} config - Server connection details.
 */
async function generateMcpDoc(rootDir, { localMcpUrl, publicUrl, apiKey }) {
  const activeMcpUrl = publicUrl ? `${publicUrl}/mcp` : localMcpUrl;

  const mcpContent = `# MCP Server Configuration

## Connection Details
- **MCP Endpoint URL**: \`${activeMcpUrl}\`
- **Local URL**: \`${localMcpUrl}\`
${publicUrl ? `- **Public Tunnel URL**: \`${publicUrl}/mcp\`\n` : ""}- **API Key**: \`${apiKey}\`
- **Web Hub & Docs Dashboard**: [http://localhost:3456/](http://localhost:3456/)

---

## How to Connect

### 1. Claude Desktop
Add to your \`claude_desktop_config.json\`:
\`\`\`json
{
  "mcpServers": {
    "context-gen": {
      "url": "${activeMcpUrl}",
      "headers": {
        "X-API-Key": "${apiKey}"
      }
    }
  }
}
\`\`\`

### 2. Cursor
Add to your \`.cursor/mcp.json\`:
\`\`\`json
{
  "mcpServers": {
    "context-gen": {
      "url": "${activeMcpUrl}",
      "headers": {
        "X-API-Key": "${apiKey}"
      }
    }
  }
}
\`\`\`

### 3. VS Code (.vscode/mcp.json)
Create or add to \`.vscode/mcp.json\` in your workspace:
\`\`\`json
{
  "mcpServers": {
    "context-gen": {
      "url": "${activeMcpUrl}",
      "headers": {
        "X-API-Key": "${apiKey}"
      }
    }
  }
}
\`\`\`

### 4. Google Antigravity IDE
Add to your \`mcp_config.json\` (or workspace \`.agents/mcp_config.json\`):
\`\`\`json
{
  "mcpServers": {
    "context-gen": {
      "url": "${activeMcpUrl}",
      "headers": {
        "X-API-Key": "${apiKey}"
      }
    }
  }
}
\`\`\`

### 5. VS Code Extensions (Cline / Roo-Code / Claude Dev)
Add to your Cline / Roo-Code MCP settings:
\`\`\`json
{
  "mcpServers": {
    "context-gen": {
      "url": "${activeMcpUrl}",
      "headers": {
        "X-API-Key": "${apiKey}"
      },
      "disabled": false,
      "autoApprove": ["get_context", "scan_project", "list_tools_info"]
    }
  }
}
\`\`\`

### 6. Windsurf
Add to \`~/.codeium/windsurf/mcp_config.json\`:
\`\`\`json
{
  "mcpServers": {
    "context-gen": {
      "url": "${activeMcpUrl}",
      "headers": {
        "X-API-Key": "${apiKey}"
      }
    }
  }
}
\`\`\`

### 7. Generic HTTP / cURL Client
\`\`\`bash
curl -X POST ${activeMcpUrl} \\
  -H "X-API-Key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
\`\`\`

---

## Available Tools
- \`get_context\` — Retrieve structured context JSON for LLM reasoning
- \`generate_context\` — Generate full project context in markdown or JSON
- \`scan_project\` — Get file tree and detected tech stack
- \`get_file\` — Read a specific project source file safely
- \`list_tools_info\` — List metadata for all registered tools
`;

  try {
    const contextDir = path.join(rootDir, "context");
    await fs.mkdir(contextDir, { recursive: true });
    const docPath = path.join(contextDir, "mcp.md");
    await fs.writeFile(docPath, mcpContent, "utf-8");

    // Also ensure .vscode/mcp.json exists in project root for instant VS Code pickup
    const vscodeDir = path.join(rootDir, ".vscode");
    await fs.mkdir(vscodeDir, { recursive: true });
    const vscodeMcpPath = path.join(vscodeDir, "mcp.json");
    const vscodeConfig = {
      mcpServers: {
        "context-gen": {
          url: activeMcpUrl,
          headers: {
            "X-API-Key": apiKey
          }
        }
      }
    };
    await fs.writeFile(vscodeMcpPath, JSON.stringify(vscodeConfig, null, 2), "utf-8");
  } catch (err) {
    console.warn("⚠️  Could not write context/mcp.md or .vscode/mcp.json:", err.message);
  }

  return mcpContent;
}

/**
 * Starts the MCP Server with Express and SSE transport.
 * @param {object} options - Server start options.
 * @param {number} [options.port=3456] - Server port.
 * @param {string} [options.projectPath="."] - Root directory to analyze.
 * @param {boolean} [options.isPublic=false] - Whether to start a public tunnel.
 * @param {string} [options.tunnelService="local only"] - Chosen tunnel provider.
 * @param {string|null} [options.key=null] - Provided API key.
 * @returns {Promise<{ app: express.Express, server: import("http").Server, apiKey: string, publicUrl: string|null }>}
 */
export async function startMcpServer(options = {}) {
  const port = Number(options.port) || 3456;
  const projectDir = path.resolve(options.projectPath || ".");
  const app = express();

  app.use(express.json({ limit: "10mb" }));

  // 1. Get or generate API Key
  const { key: apiKey, isNew } = await getOrCreateApiKey(projectDir, options.key);

  // 2. Initialize MCP Server
  const mcpServer = new McpServer({
    name: "context-gen-cli",
    version: "1.0.0"
  });

  registerMcpTools(mcpServer, projectDir);

  const activeTransports = new Map();
  const auth = createAuthMiddleware(apiKey);

  // 3. Helper to start server with automatic port retry if busy
  const listenWithRetry = (initialPort, maxAttempts = 10) => {
    return new Promise((resolve, reject) => {
      let currentPort = initialPort;
      let attempts = 0;

      const tryListen = () => {
        const srv = app.listen(currentPort);

        srv.once("listening", () => {
          resolve({ server: srv, boundPort: currentPort });
        });

        srv.once("error", (err) => {
          if (err.code === "EADDRINUSE" && attempts < maxAttempts) {
            attempts++;
            currentPort++;
            tryListen();
          } else {
            reject(err);
          }
        });
      };

      tryListen();
    });
  };

  // 4. Bind HTTP Server
  const { server, boundPort } = await listenWithRetry(port);

  const localSseUrl = `http://localhost:${boundPort}/sse`;
  const localMcpUrl = `http://localhost:${boundPort}/mcp`;
  let publicUrl = options.publicUrl || null;

  if (!publicUrl && options.tunnelService && options.tunnelService !== "local" && options.tunnelService !== "local only") {
    try {
      publicUrl = await startTunnel(boundPort, options.tunnelService);
    } catch (err) {
      console.warn(`⚠️  Tunnel failed: ${err.message}`);
      console.log("💡 Falling back to local-only mode.");
    }
  } else if (!publicUrl && options.isPublic) {
    try {
      publicUrl = await startTunnel(boundPort, "localhost.run");
    } catch (err) {
      console.warn(`⚠️  Tunnel failed: ${err.message}`);
      console.log("💡 Falling back to local-only mode.");
    }
  }

  // Generate context/mcp.md configuration file
  const mcpDocContent = await generateMcpDoc(projectDir, {
    localSseUrl,
    localMcpUrl,
    publicUrl,
    apiKey
  });

  // 3. Web Dashboard Route
  app.get(["/", "/dashboard", "/docs"], async (req, res) => {
    // If request accepts HTML or accessed in browser, serve the UI dashboard
    const acceptsHtml = req.accepts(["html", "json"]) === "html";

    if (acceptsHtml) {
      let agentMd = "";
      let agentJson = "";
      try {
        agentMd = await fs.readFile(path.join(projectDir, "context", "agent.md"), "utf-8");
      } catch {
        try {
          agentMd = await fs.readFile(path.join(projectDir, "agent.md"), "utf-8");
        } catch {}
      }

      try {
        agentJson = await fs.readFile(path.join(projectDir, "context", "agent.json"), "utf-8");
      } catch {
        try {
          agentJson = await fs.readFile(path.join(projectDir, "agent.json"), "utf-8");
        } catch {}
      }

      const html = renderDashboardHtml({
        localSseUrl,
        localMcpUrl,
        publicUrl,
        apiKey,
        projectDir,
        agentMd,
        agentJson,
        mcpMd: mcpDocContent
      });
      return res.send(html);
    }

    // JSON API fallback (requires auth)
    auth(req, res, () => {
      res.json({
        status: "ok",
        server: "context-gen-cli MCP Server",
        version: "1.0.0",
        endpoints: {
          dashboard: "/",
          sse: "/sse",
          messages: "/messages",
          mcp: "/mcp"
        }
      });
    });
  });

  // Test Tool Helper Endpoint for Dashboard UI
  app.post("/api/test-tool", auth, async (req, res) => {
    try {
      const { tool } = req.body;
      const { files, tree } = await scanProject(projectDir, 3);
      const metadata = await extractMetadata(projectDir, files);
      const graph = await buildDependencyGraph(files, projectDir, metadata.pkgJson);

      if (tool === "get_context") {
        const data = generateAgentJson({ tree, metadata, graph, projectPath: projectDir });
        return res.json(data);
      }
      if (tool === "scan_project") {
        return res.json({ projectPath: projectDir, files, techStack: metadata.stack, tree });
      }
      if (tool === "generate_context") {
        const md = generateAgentMd({ tree, metadata, graph });
        return res.json({ markdown: md });
      }
      if (tool === "get_file") {
        const firstFile = files[0] || "package.json";
        const content = await fs.readFile(path.join(projectDir, firstFile), "utf-8");
        return res.json({ file: firstFile, content });
      }
      return res.json({
        tool,
        status: "active",
        registered: true
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // SSE Transport Handler Helper
  const handleSseConnection = async (req, res) => {
    try {
      const transport = new SSEServerTransport("/mcp", res);
      const sessionId = transport.sessionId;
      activeTransports.set(sessionId, transport);

      transport.onclose = () => {
        activeTransports.delete(sessionId);
      };

      await mcpServer.connect(transport);
    } catch (err) {
      console.error("❌ Error initiating SSE connection:", err);
      if (!res.headersSent) {
        res.status(500).send("Failed to initiate SSE session");
      }
    }
  };

  // Primary MCP Endpoint (/mcp) - handles SSE & Streamable HTTP
  app.get("/mcp", (req, res, next) => {
    const isSse = req.headers.accept?.includes("text/event-stream");
    if (isSse) {
      return auth(req, res, () => handleSseConnection(req, res));
    }
    if (req.accepts(["html", "json"]) === "html") {
      return res.redirect("/");
    }
    res.json({
      status: "ok",
      server: "context-gen-cli MCP Server",
      endpoint: "/mcp",
      sseUrl: `http://localhost:${port}/mcp`,
      postUrl: `http://localhost:${port}/mcp`,
      example: `curl -X POST http://localhost:${port}/mcp -H "X-API-Key: ${apiKey}" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'`
    });
  });

  // Legacy /sse endpoint
  app.get("/sse", auth, handleSseConnection);

  // SSE Messages Endpoint & Direct JSON-RPC POST Handler
  app.post(["/mcp", "/messages"], auth, async (req, res) => {
    const sessionId = req.query.sessionId;
    if (sessionId && activeTransports.has(sessionId)) {
      const transport = activeTransports.get(sessionId);
      return await transport.handlePostMessage(req, res);
    }

    // Direct JSON-RPC HTTP Request handling (e.g., cURL, scripts)
    const { jsonrpc, method, params, id = 1 } = req.body || {};

    if (jsonrpc === "2.0" && method) {
      try {
        if (method === "initialize") {
          return res.json({
            jsonrpc: "2.0",
            result: {
              protocolVersion: "2024-11-05",
              capabilities: { tools: {} },
              serverInfo: { name: "context-gen-cli", version: "1.0.0" }
            },
            id
          });
        }

        if (method === "ping") {
          return res.json({ jsonrpc: "2.0", result: {}, id });
        }

        if (method === "tools/list") {
          return res.json({
            jsonrpc: "2.0",
            result: {
              tools: [
                {
                  name: "get_context",
                  description: "Retrieve structured project context JSON for LLM reasoning.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      maxDepth: { type: "number", description: "Directory tree depth (default 3)" }
                    }
                  }
                },
                {
                  name: "generate_context",
                  description: "Generate full project architecture context in Markdown or JSON format.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      format: { type: "string", enum: ["md", "json"], description: "Output format" },
                      maxDepth: { type: "number", description: "Directory tree depth" }
                    }
                  }
                },
                {
                  name: "scan_project",
                  description: "Fast directory scanner returning file paths and tech stack.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      maxDepth: { type: "number", description: "Directory depth" }
                    }
                  }
                },
                {
                  name: "get_file",
                  description: "Safely reads a project source file with secret protection.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      filePath: { type: "string", description: "Relative file path" }
                    },
                    required: ["filePath"]
                  }
                },
                {
                  name: "list_tools_info",
                  description: "Lists metadata for all registered tools.",
                  inputSchema: { type: "object" }
                }
              ]
            },
            id
          });
        }

        if (method === "tools/call") {
          const toolName = params?.name;
          const args = params?.arguments || {};

          const { files, tree } = await scanProject(projectDir, args.maxDepth || 3);
          const metadata = await extractMetadata(projectDir, files);
          const graph = await buildDependencyGraph(files, projectDir, metadata.pkgJson);

          if (toolName === "get_context") {
            const data = generateAgentJson({ tree, metadata, graph, projectPath: projectDir });
            return res.json({
              jsonrpc: "2.0",
              result: {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
              },
              id
            });
          }

          if (toolName === "generate_context") {
            const format = args.format === "json" ? "json" : "md";
            const text = format === "json"
              ? JSON.stringify(generateAgentJson({ tree, metadata, graph, projectPath: projectDir }), null, 2)
              : generateAgentMd({ tree, metadata, graph });
            return res.json({
              jsonrpc: "2.0",
              result: {
                content: [{ type: "text", text }]
              },
              id
            });
          }

          if (toolName === "scan_project") {
            return res.json({
              jsonrpc: "2.0",
              result: {
                content: [{
                  type: "text",
                  text: JSON.stringify({ projectPath: projectDir, files, techStack: metadata.stack, tree }, null, 2)
                }]
              },
              id
            });
          }

          if (toolName === "get_file") {
            if (!args.filePath) {
              return res.status(400).json({
                jsonrpc: "2.0",
                error: { code: -32602, message: "Missing required filePath argument" },
                id
              });
            }
            const fullPath = path.resolve(projectDir, args.filePath);
            const content = await fs.readFile(fullPath, "utf-8");
            return res.json({
              jsonrpc: "2.0",
              result: {
                content: [{ type: "text", text: content }]
              },
              id
            });
          }

          if (toolName === "list_tools_info") {
            return res.json({
              jsonrpc: "2.0",
              result: {
                content: [{
                  type: "text",
                  text: "Tools: get_context, generate_context, scan_project, get_file, list_tools_info"
                }]
              },
              id
            });
          }

          return res.status(404).json({
            jsonrpc: "2.0",
            error: { code: -32601, message: `Tool '${toolName}' not found` },
            id
          });
        }
      } catch (err) {
        return res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: err.message },
          id
        });
      }
    }

    try {
      const transport = new SSEServerTransport("/mcp", res);
      await mcpServer.connect(transport);
    } catch (err) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: err.message } });
    }
  });

  // 5. Display banner
  console.log("\n=======================================================");
  console.log("🚀 context-gen-cli MCP Server Active");
  console.log("=======================================================");
  console.log(`📍 Project Directory: ${projectDir}`);
  console.log(`🔌 Local SSE URL:     ${localSseUrl}`);
  console.log(`🌐 Dashboard UI:      http://localhost:${boundPort}/`);
  if (publicUrl) {
    console.log(`🌐 Public URL:        ${publicUrl}`);
    console.log(`📋 Public SSE URL:    ${publicUrl}/sse`);
  }
  console.log(`🔐 API Key:           ${apiKey}`);
  if (isNew) {
    console.log("⚠️  Saved key to .env (keep this private!)");
  }
  console.log(`📄 Config doc:        context/mcp.md generated in project`);
  console.log("=======================================================\n");

  const handleExit = async () => {
    console.log("\n👋 Stopping MCP server...");
    await stopTunnel();
    server.close();
    process.exit(0);
  };

  process.on("SIGINT", handleExit);
  process.on("SIGTERM", handleExit);

  return { app, server, apiKey, publicUrl, boundPort };
}
