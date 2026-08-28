/**
 * @fileoverview HTML Web Dashboard for context-gen-cli MCP Server.
 * Provides a UI for inspecting connection details, copying IDE configs,
 * testing MCP tools interactively, and viewing generated agent context.
 */

/**
 * Generates the complete HTML dashboard string.
 * @param {object} params
 * @param {string} params.localSseUrl
 * @param {string} params.localMcpUrl
 * @param {string|null} params.publicUrl
 * @param {string} params.apiKey
 * @param {string} params.projectDir
 * @param {string} params.agentMd
 * @param {string} params.agentJson
 * @param {string} params.mcpMd
 * @returns {string} HTML page content
 */
export function renderDashboardHtml({
  localSseUrl,
  localMcpUrl,
  publicUrl,
  apiKey,
  projectDir,
  agentMd = "",
  agentJson = "",
  mcpMd = ""
}) {
  const activeSseUrl = publicUrl ? `${publicUrl}/sse` : localSseUrl;
  const activeMcpUrl = publicUrl ? `${publicUrl}/mcp` : localMcpUrl;

  const vscodeMcpConfig = JSON.stringify(
    {
      mcpServers: {
        "context-gen": {
          url: activeMcpUrl,
          headers: {
            "X-API-Key": apiKey
          }
        }
      }
    },
    null,
    2
  );

  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        "context-gen": {
          url: activeMcpUrl,
          headers: {
            "X-API-Key": apiKey
          }
        }
      }
    },
    null,
    2
  );

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        "context-gen": {
          url: activeMcpUrl,
          headers: {
            "X-API-Key": apiKey
          }
        }
      }
    },
    null,
    2
  );

  const antigravityConfig = JSON.stringify(
    {
      mcpServers: {
        "context-gen": {
          url: activeMcpUrl,
          headers: {
            "X-API-Key": apiKey
          }
        }
      }
    },
    null,
    2
  );

  const clineConfig = JSON.stringify(
    {
      mcpServers: {
        "context-gen": {
          url: activeMcpUrl,
          headers: {
            "X-API-Key": apiKey
          },
          disabled: false,
          autoApprove: ["get_context", "scan_project", "list_tools_info"]
        }
      }
    },
    null,
    2
  );

  const windsurfConfig = JSON.stringify(
    {
      mcpServers: {
        "context-gen": {
          url: activeMcpUrl,
          headers: {
            "X-API-Key": apiKey
          }
        }
      }
    },
    null,
    2
  );

  const curlExample = `curl -X POST ${activeMcpUrl} \\
  -H "X-API-Key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'`;

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>context-gen-cli • MCP Server Hub</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: rgba(18, 24, 39, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #6366f1;
      --accent-gradient: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --code-bg: #080c14;
      --green: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(168, 85, 247, 0.15) 0px, transparent 50%);
      background-attachment: fixed;
      color: var(--text);
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
      padding: 24px;
      line-height: 1.5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      margin-bottom: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 22px;
      background: var(--accent-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      font-size: 13px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 9999px;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.2); opacity: 1; box-shadow: 0 0 16px #10b981; }
      100% { transform: scale(0.95); opacity: 0.8; }
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }
    @media (max-width: 900px) {
      .grid { grid-template-columns: 1fr; }
    }
    .card {
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
    }
    .card-title {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 18px;
    }
    .detail-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
    }
    .detail-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      font-weight: 600;
    }
    .detail-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      background: var(--code-bg);
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      word-break: break-all;
    }
    .btn {
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #818cf8;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: 'Inter', sans-serif;
    }
    .btn:hover {
      background: rgba(99, 102, 241, 0.3);
      color: #fff;
      transform: translateY(-1px);
    }
    .btn-primary {
      background: var(--accent-gradient);
      border: none;
      color: #fff;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
    }
    .btn-primary:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
    .tabs {
      display: flex;
      gap: 6px;
      background: rgba(0, 0, 0, 0.3);
      padding: 4px;
      border-radius: 10px;
      margin-bottom: 16px;
      overflow-x: auto;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .tab-btn.active {
      background: var(--accent);
      color: #fff;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
    }
    pre {
      font-family: 'JetBrains Mono', monospace;
      background: var(--code-bg);
      padding: 16px;
      border-radius: 10px;
      border: 1px solid var(--card-border);
      color: #e2e8f0;
      font-size: 12px;
      overflow-x: auto;
      max-height: 380px;
      line-height: 1.6;
    }
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--green);
      color: #fff;
      font-weight: 600;
      padding: 10px 18px;
      border-radius: 8px;
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
      pointer-events: none;
      z-index: 1000;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
    .tool-item {
      background: rgba(0,0,0,0.25);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .tool-info h4 {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      color: #818cf8;
      margin-bottom: 4px;
    }
    .tool-info p {
      font-size: 12px;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">
        <span>⚡ context-gen-cli</span>
        <span style="font-size: 12px; color: var(--text-muted); font-weight: 500;">MCP Hub</span>
      </div>
      <div class="status-badge">
        <div class="pulse-dot"></div>
        <span>MCP Server Active • Port 3456</span>
      </div>
    </header>

    <div class="grid">
      <!-- Card 1: Connection Details -->
      <div class="card">
        <div class="card-title">
          <span>📡 Connection & Protocols</span>
          <span style="font-size: 12px; font-weight: 400; color: var(--text-muted);">SSE + Streamable HTTP</span>
        </div>

        <div class="detail-row">
          <div class="detail-label">Project Scope</div>
          <div class="detail-value">
            <span>${projectDir}</span>
          </div>
        </div>

        <div class="detail-row">
          <div class="detail-label">Local MCP Endpoint URL (IDEs & Tools)</div>
          <div class="detail-value">
            <span>${localMcpUrl}</span>
            <button class="btn" onclick="copyText('${localMcpUrl}')">Copy</button>
          </div>
        </div>

        ${
          publicUrl
            ? `<div class="detail-row">
                <div class="detail-label">Public Tunnel MCP URL</div>
                <div class="detail-value" style="color: #a855f7;">
                  <span>${activeMcpUrl}</span>
                  <button class="btn" onclick="copyText('${activeMcpUrl}')">Copy</button>
                </div>
              </div>`
            : `<div class="detail-row">
                <div class="detail-label">Public Tunnel</div>
                <div class="detail-value" style="color: var(--text-muted);">
                  <span>Local Mode (Run with --public for free localhost.run tunnel)</span>
                </div>
              </div>`
        }

        <div class="detail-row">
          <div class="detail-label">Authentication API Key (Stored in .env)</div>
          <div class="detail-value">
            <span id="keyDisplay">••••••••••••••••••••••••••••••••</span>
            <div style="display: flex; gap: 6px;">
              <button class="btn" id="toggleKeyBtn" onclick="toggleKey('${apiKey}')">Show</button>
              <button class="btn" onclick="copyText('${apiKey}')">Copy</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Card 2: IDE & Client Integration -->
      <div class="card">
        <div class="card-title">
          <span>⚙️ IDE & Client Configurations</span>
          <button class="btn btn-primary" onclick="copyActiveConfig()">Copy Config</button>
        </div>

        <div class="tabs">
          <button class="tab-btn active" onclick="switchTab('claude')">Claude Desktop</button>
          <button class="tab-btn" onclick="switchTab('cursor')">Cursor</button>
          <button class="tab-btn" onclick="switchTab('vscode')">VS Code (.vscode/mcp.json)</button>
          <button class="tab-btn" onclick="switchTab('antigravity')">Google Antigravity</button>
          <button class="tab-btn" onclick="switchTab('cline')">Cline / Roo-Code</button>
          <button class="tab-btn" onclick="switchTab('windsurf')">Windsurf</button>
          <button class="tab-btn" onclick="switchTab('curl')">cURL</button>
        </div>

        <pre id="configBox">${escapeHtml(claudeConfig)}</pre>
      </div>
    </div>

    <!-- Full Width Card: MCP Tools & Live Context -->
    <div class="grid">
      <!-- MCP Tools -->
      <div class="card">
        <div class="card-title">
          <span>🛠️ Available MCP Tools (5 Registered)</span>
          <span style="font-size: 12px; color: #34d399; font-weight: 500;">Ready for AI Agents</span>
        </div>

        <div class="tool-item">
          <div class="tool-info">
            <h4>get_context</h4>
            <p>Returns complete structured project JSON (tech stack, entry points, dependency graph, key files).</p>
          </div>
          <button class="btn" onclick="testTool('get_context')">Test</button>
        </div>

        <div class="tool-item">
          <div class="tool-info">
            <h4>generate_context</h4>
            <p>Generates full project architecture context in Markdown or JSON format.</p>
          </div>
          <button class="btn" onclick="testTool('generate_context')">Test</button>
        </div>

        <div class="tool-item">
          <div class="tool-info">
            <h4>scan_project</h4>
            <p>Fast AST-free directory walker returning files, tree structure, and tech stack.</p>
          </div>
          <button class="btn" onclick="testTool('scan_project')">Test</button>
        </div>

        <div class="tool-item">
          <div class="tool-info">
            <h4>get_file</h4>
            <p>Safely reads project source files with security guards against secrets.</p>
          </div>
          <button class="btn" onclick="testTool('get_file')">Test</button>
        </div>

        <div class="tool-item">
          <div class="tool-info">
            <h4>list_tools_info</h4>
            <p>Outputs complete parameter guide and schema descriptions for all tools.</p>
          </div>
          <button class="btn" onclick="testTool('list_tools_info')">Test</button>
        </div>
      </div>

      <!-- Live Context / Document Viewer -->
      <div class="card">
        <div class="card-title">
          <span>📄 Live Output Documents</span>
          <div class="tabs" style="margin-bottom: 0;">
            <button class="tab-btn active" onclick="switchDoc('mcp')">context/mcp.md</button>
            <button class="tab-btn" onclick="switchDoc('md')">context/agent.md</button>
            <button class="tab-btn" onclick="switchDoc('json')">context/agent.json</button>
          </div>
        </div>

        <pre id="docViewer" style="max-height: 380px;">${escapeHtml(mcpMd || "Loading...")}</pre>
      </div>
    </div>
  </div>

  <div id="toast" class="toast">Copied to clipboard!</div>

  <script>
    const configs = {
      claude: ${JSON.stringify(claudeConfig)},
      cursor: ${JSON.stringify(cursorConfig)},
      vscode: ${JSON.stringify(vscodeMcpConfig)},
      antigravity: ${JSON.stringify(antigravityConfig)},
      cline: ${JSON.stringify(clineConfig)},
      windsurf: ${JSON.stringify(windsurfConfig)},
      curl: ${JSON.stringify(curlExample)}
    };

    const docs = {
      mcp: ${JSON.stringify(mcpMd)},
      md: ${JSON.stringify(agentMd)},
      json: ${JSON.stringify(agentJson)}
    };

    let activeConfigKey = 'claude';
    let keyShown = false;

    function switchTab(key) {
      activeConfigKey = key;
      document.querySelectorAll('.tabs .tab-btn').forEach(btn => {
        if (btn.innerText.toLowerCase().includes(key)) {
          btn.classList.add('active');
        } else if (btn.closest('.card').contains(document.getElementById('configBox'))) {
          btn.classList.remove('active');
        }
      });
      document.getElementById('configBox').textContent = configs[key];
    }

    function switchDoc(key) {
      document.querySelectorAll('.card .tabs .tab-btn').forEach(btn => {
        if (btn.closest('.card').contains(document.getElementById('docViewer'))) {
          btn.classList.remove('active');
        }
      });
      event.target.classList.add('active');
      document.getElementById('docViewer').textContent = docs[key] || "Document not generated yet.";
    }

    function toggleKey(key) {
      const el = document.getElementById('keyDisplay');
      const btn = document.getElementById('toggleKeyBtn');
      keyShown = !keyShown;
      el.textContent = keyShown ? key : '••••••••••••••••••••••••••••••••';
      btn.textContent = keyShown ? 'Hide' : 'Show';
    }

    function copyText(text) {
      navigator.clipboard.writeText(text);
      showToast("Copied to clipboard!");
    }

    function copyActiveConfig() {
      copyText(configs[activeConfigKey]);
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }

    async function testTool(toolName) {
      const docViewer = document.getElementById('docViewer');
      docViewer.textContent = "⏳ Executing " + toolName + " via MCP HTTP API...";
      
      try {
        const res = await fetch('/api/test-tool', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': '${apiKey}'
          },
          body: JSON.stringify({ tool: toolName })
        });
        const data = await res.json();
        docViewer.textContent = JSON.stringify(data, null, 2);
        showToast("Tool executed successfully!");
      } catch (err) {
        docViewer.textContent = "❌ Error calling tool: " + err.message;
      }
    }
  </script>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
