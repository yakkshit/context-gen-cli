"use client";

import React, { useState } from "react";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Check, Copy, Terminal, Sparkles, ShieldAlert, Layers, Cpu } from "lucide-react";

const EXAMPLES = [
  {
    id: "zero-config",
    badge: "Daily Workflow",
    icon: Terminal,
    title: "1. Zero-Config Workspace Boot (ctx -d)",
    summary:
      "Run once when you open any repo. Scans files, maps dependencies, starts the MCP server on port 3456, and auto-syncs on save.",
    command: "npx context-gen-cli@latest -d",
    output: `⚡ context-gen-cli — Default All-In-One Mode (-d)
✓ Context files generated in context/ (agent.md, agent.json, agent.yaml)
✓ MCP Server live on http://localhost:3456/mcp
👀 Watch Mode: Running in background (auto-syncing changes)`,
  },
  {
    id: "vague-guard",
    badge: "Anti-Hallucination Gate",
    icon: ShieldAlert,
    title: "2. Catching Vague Prompts Before AI Guesses",
    summary:
      "When you type a short, ambiguous prompt, Shannon Entropy stays ≥ 1.5 bits—forcing the AI to ask concrete questions using your actual files.",
    command: 'ctx distill "add auth"',
    output: `╔═══════════════════════════════════════════════════════════════╗
║ ⚠️  CLARIFICATION NEEDED — Ambiguous Prompt Detected          ║
╚═══════════════════════════════════════════════════════════════╝
▸ 1. Implementation Pattern: Should I extend an existing module?
     (e.g., "Follow src/mcp/auth.js" or "Create a standalone module")
▸ 2. Side Effects & Persistence: Persist to disk/DB or stay stateless?`,
  },
  {
    id: "senior-plan",
    badge: "98.5% Token Savings",
    icon: Sparkles,
    title: "3. Senior Engineer Blueprint for Targeted Edits",
    summary:
      "Give a clear intent and EGRD distills only the exact exports, imports, and downstream Blast Radius callers in ~40 tokens.",
    command: 'ctx distill "update mcp tools and scanner graph in src"',
    output: `╔═══════════════════════════════════════════════════════════════╗
║ 🧠 SENIOR ENGINEER CONTEXT PLAN (41 tokens | CPU: 1 core)     ║
╚═══════════════════════════════════════════════════════════════╝
🎯 Task: update mcp tools and scanner graph in src
📂 Primary Files to Reference:
   ✔ src/graph.js [js/lib] — exports: [buildDependencyGraph]
   ✔ src/scanner.js [js/lib] — exports: [scanProject]
💥 Blast Radius: src/mcp/server.js, src/mcp/tools.js
🛡️ Architecture Guardrail: Mirror existing patterns; keep modular.`,
  },
  {
    id: "monorepo",
    badge: "Polyglot & Monorepos",
    icon: Layers,
    title: "4. Multi-Language & Monorepo Filtering",
    summary:
      "Works natively across TypeScript, Python, Rust, Go, Dart/Flutter, and C#—automatically detecting apps/ and packages/ workspaces.",
    command: 'ctx distill "add billing webhook handler" -p ./services/api -b 200',
    output: `🎯 Task: add billing webhook handler (services/api)
📂 Primary Files to Reference:
   ✔ services/api/routes/webhooks.py [python/api] — exports: [stripe_webhook]
   ✔ services/api/models/subscription.py [python/model] — exports: [Subscription]
💥 Blast Radius: services/api/main.py`,
  },
];

export function DeveloperExamples() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  return (
    <section id="examples" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-border">
      <div className="text-center mb-12 space-y-3">
        <Badge variant="cyan" className="mx-auto">
          <Cpu className="w-3.5 h-3.5 mr-1.5 inline" /> Developer Cookbooks
        </Badge>
        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground font-mono">
          Common Workflows with <code className="text-primary font-mono">ctx</code>
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-xs sm:text-sm leading-relaxed">
          Commands to eliminate context rot, prevent hallucinated imports, and keep CPU usage capped at 1–2 cores.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {EXAMPLES.map((ex) => {
          const Icon = ex.icon;
          return (
            <Card
              key={ex.id}
              className="bg-card border-border p-5 sm:p-6 flex flex-col justify-between hover:border-primary/40 transition-colors"
            >
              <div className="space-y-2.5 mb-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                    <Icon className="w-3 h-3" /> {ex.badge}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-foreground font-mono">{ex.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{ex.summary}</p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between bg-muted/40 border border-border rounded-lg px-3 py-2 font-mono text-xs text-primary">
                  <span className="truncate">$ {ex.command}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(ex.id, ex.command)}
                    className="ml-2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 cursor-pointer"
                    title="Copy command"
                  >
                    {copiedId === ex.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <pre className="bg-muted/30 border border-border rounded-lg p-3 font-mono text-[11px] leading-relaxed text-foreground overflow-x-auto select-all">
                  {ex.output}
                </pre>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
