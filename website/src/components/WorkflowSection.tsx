"use client";

import React, { useState } from "react";
import {
  Layers,
  ArrowRight,
  Terminal,
  Cpu,
  Plug,
  Copy,
  Check,
  CheckCircle2,
  Share2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const MCP_CONFIGS = {
  cursor: {
    label: "Cursor Composer",
    file: ".cursor/mcp.json",
    snippet: `{
  "mcpServers": {
    "context-code": {
      "command": "ctx",
      "args": ["serve"]
    }
  }
}`,
  },
  antigravity: {
    label: "Antigravity",
    file: "~/.gemini/antigravity/mcp.json",
    snippet: `{
  "mcpServers": {
    "project-context": {
      "command": "npx",
      "args": ["context-gen-cli", "serve"]
    }
  }
}`,
  },
  claude: {
    label: "Claude Code / Desktop",
    file: "claude_desktop_config.json",
    snippet: `{
  "mcpServers": {
    "ctx": {
      "command": "ctx",
      "args": ["-m"],
      "env": {
        "CTX_AUTH_KEY": "optional-secret-key"
      }
    }
  }
}`,
  },
  vscode: {
    label: "VS Code (Continue / Cline)",
    file: ".continue/config.json",
    snippet: `{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "name": "context-gen",
        "transport": {
          "type": "stdio",
          "command": "ctx",
          "args": ["serve"]
        }
      }
    ]
  }
}`,
  },
};

export function WorkflowSection() {
  const [activeMcpTab, setActiveMcpTab] = useState<keyof typeof MCP_CONFIGS>("cursor");
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const handleCopySnippet = (snippet: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(snippet);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 1800);
    }
  };

  return (
    <section id="workflow" className="py-20 md:py-28 relative border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge variant="cyan" className="mb-2.5">
            PIPELINE & SETUP
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight font-mono">
            3-Step Workflow: From Repo to Live MCP
          </h2>
          <p className="mt-2 text-muted-foreground text-xs sm:text-sm leading-relaxed">
            Run the CLI in your repository root, distill your prompts, and connect any AI agent.
          </p>
        </div>

        {/* 3 Steps Visual Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
          {/* Step 1 */}
          <div className="flex flex-col h-full rounded-2xl border border-border bg-card p-5 sm:p-6 transition-all hover:border-border/90">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold font-mono text-sm mb-3.5">
              01
            </div>
            <h3 className="text-base font-bold text-foreground tracking-tight font-mono">
              Scan & Graph AST
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 flex-1 leading-relaxed">
              Run <code className="text-primary font-mono">ctx -d</code> in any repo.
              The AST scanner parses file dependencies and generates artifacts in <code className="text-foreground">context/</code>.
            </p>
            <div className="mt-4 p-2.5 rounded-lg bg-muted/40 border border-border font-mono text-xs text-foreground flex items-center justify-between">
              <code>$ ctx -d</code>
              <Badge variant="outline" className="text-[10px]">Auto-Sync</Badge>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col h-full rounded-2xl border border-border bg-card p-5 sm:p-6 transition-all hover:border-border/90">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold font-mono text-sm mb-3.5">
              02
            </div>
            <h3 className="text-base font-bold text-foreground tracking-tight font-mono">
              Distill With EGRD
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 flex-1 leading-relaxed">
              Run <code className="text-primary font-mono">ctx distill "prompt"</code>.
              The entropy governor runs on 1 CPU core, evaluating $H(P)$ to guard against hallucinated multi-file overwrites.
            </p>
            <div className="mt-4 p-2.5 rounded-lg bg-muted/40 border border-border font-mono text-xs text-foreground flex items-center justify-between">
              <code>$ ctx distill &lt;prompt&gt;</code>
              <Badge variant="cyan" className="text-[10px]">1-2 Cores</Badge>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col h-full rounded-2xl border border-border bg-card p-5 sm:p-6 transition-all hover:border-border/90">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold font-mono text-sm mb-3.5">
              03
            </div>
            <h3 className="text-base font-bold text-foreground tracking-tight font-mono">
              Connect Any MCP Agent
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 flex-1 leading-relaxed">
              Add our MCP config to Cursor, Antigravity, Claude Code, or VS Code.
              Your models get live codebase awareness with built-in public tunneling.
            </p>
            <div className="mt-4 p-2.5 rounded-lg bg-muted/40 border border-border font-mono text-xs text-foreground flex items-center justify-between">
              <code>$ ctx serve</code>
              <Badge variant="outline" className="text-[10px]">MCP Ready</Badge>
            </div>
          </div>
        </div>

        {/* MCP Client Integration Hub */}
        <div className="mt-12 max-w-4xl mx-auto rounded-2xl border border-border bg-card p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <Plug className="w-4 h-4 text-primary" />
                <h3 className="text-base font-bold text-foreground font-mono">
                  Model Context Protocol (MCP) Configuration
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select your client to copy the exact configuration:
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopySnippet(MCP_CONFIGS[activeMcpTab].snippet)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-muted hover:bg-muted/80 text-xs font-mono text-foreground transition-colors cursor-pointer"
            >
              {copiedSnippet ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Config</span>
                </>
              )}
            </button>
          </div>

          {/* MCP Tabs */}
          <div className="mt-5">
            <Tabs
              defaultValue="cursor"
              value={activeMcpTab}
              onValueChange={(val) => setActiveMcpTab(val as keyof typeof MCP_CONFIGS)}
            >
              <TabsList className="w-full flex-wrap justify-start bg-muted/40 border border-border">
                {Object.entries(MCP_CONFIGS).map(([key, item]) => (
                  <TabsTrigger key={key} value={key} className="flex-1 sm:flex-initial">
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.entries(MCP_CONFIGS).map(([key, item]) => (
                <TabsContent key={key} value={key}>
                  <div className="mt-3 rounded-xl border border-border bg-muted/30 overflow-hidden font-mono">
                    <div className="px-3.5 py-2 border-b border-border bg-card flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Target File: <strong className="text-foreground">{item.file}</strong></span>
                      <span>JSON</span>
                    </div>
                    <pre className="p-3.5 text-xs text-foreground overflow-x-auto select-all leading-relaxed">
                      {item.snippet}
                    </pre>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </div>
    </section>
  );
}
