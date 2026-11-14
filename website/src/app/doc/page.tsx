"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Terminal,
  Cpu,
  Zap,
  Shield,
  Layers,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  Menu,
  X,
  ArrowRight,
  ArrowLeft,
  Plug,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Clock,
  Lock,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NavSection {
  id: string;
  title: string;
}

const SECTIONS: NavSection[] = [
  { id: "overview", title: "Overview & Motivation" },
  { id: "installation", title: "Installation" },
  { id: "cli-reference", title: "Core CLI Commands" },
  { id: "how-egrd-works", title: "How EGRD Works" },
  { id: "mcp-integration", title: "IDE & MCP Integration" },
  { id: "benchmarks", title: "Benefits & Benchmarks" },
];

export default function DocPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY + 120;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.offsetTop <= scrollY && el.offsetTop + el.offsetHeight > scrollY) {
          setActiveSection(s.id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Navbar */}
      <Navbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-8 items-start">
          {/* Mobile Sidebar Toggle */}
          <div className="lg:hidden flex items-center justify-between pb-4 border-b border-border">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center gap-2 text-xs font-mono font-medium text-foreground px-3 py-1.5 rounded-lg border border-border bg-card"
            >
              {mobileMenuOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
              <span>{mobileMenuOpen ? "Close Navigation" : "Jump to Section"}</span>
            </button>
            <span className="text-xs font-mono text-muted-foreground">
              {SECTIONS.find((s) => s.id === activeSection)?.title}
            </span>
          </div>

          {/* Left Sticky Sidebar (3 cols on LG) */}
          <aside
            className={`lg:col-span-3 lg:block ${
              mobileMenuOpen ? "block" : "hidden"
            } lg:sticky lg:top-20 space-y-6 bg-card lg:bg-transparent p-5 lg:p-0 rounded-2xl lg:rounded-none border lg:border-none border-border z-20`}
          >
            <div className="space-y-1">
              <span className="text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-wider block mb-2 px-3">
                Documentation
              </span>
              <nav className="space-y-0.5 font-mono text-xs">
                {SECTIONS.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      activeSection === sec.id
                        ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <span>{sec.title}</span>
                    {activeSection === sec.id && <ChevronRight className="w-3 h-3 text-primary" />}
                  </a>
                ))}
              </nav>
            </div>

            {/* Quick Resources */}
            <div className="pt-4 border-t border-border space-y-2 px-3 font-mono text-xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Resources
              </span>
              <a
                href="https://resume.cedzlabs.com/labs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between text-primary hover:brightness-110 py-1 transition-colors"
              >
                <span>Cedzlabs Labs</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://github.com/yakkshit/context-gen"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between text-muted-foreground hover:text-foreground py-1 transition-colors"
              >
                <span>GitHub Source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://www.npmjs.com/package/context-gen-cli"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between text-muted-foreground hover:text-foreground py-1 transition-colors"
              >
                <span>npm Package</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </aside>

          {/* Main Content Area (9 cols on LG) */}
          <main className="lg:col-span-9 max-w-3xl space-y-16 pb-20">
            {/* Header Badge */}
            <div className="space-y-2 border-b border-border pb-6">
              <div className="flex items-center gap-2">
                <Badge variant="cyan" className="font-mono text-xs">
                  ctx v1.3.0
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">
                  Reference Documentation
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-foreground">
                context-gen-cli Documentation
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A lightweight, hardware-governed tool that maps codebase ASTs, distills context using
                Shannon Information Theory, and exposes a live Model Context Protocol (MCP) server.
              </p>
            </div>

            {/* Section 1: Overview */}
            <section id="overview" className="space-y-4 scroll-mt-24">
              <h2 className="text-xl sm:text-2xl font-bold font-mono text-foreground tracking-tight flex items-center gap-2">
                <span className="text-primary font-bold">#</span>
                <span>Overview & Motivation</span>
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Frontier LLMs (Claude 3.7 Sonnet, Gemini 2.5 Flash, GPT-4o) support massive context windows,
                yet dumping entire codebases into prompts leads to <strong>Context Rot</strong>:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl border border-secondary/30 bg-secondary/5 space-y-1">
                  <span className="text-secondary font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    The Raw Dump Problem
                  </span>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Dumping 50,000+ tokens wastes attention budget, spikes latency by 5x–10x, costs ~$0.20 per call,
                    and frequently causes models to modify wrong files.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-1">
                  <span className="text-primary font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    The EGRD Solution
                  </span>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Entropy-Guided Reference Distillation extracts only exported AST signatures and downstream
                    blast-radius dependents in ~40 tokens (98.5% reduction).
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2: Installation */}
            <section id="installation" className="space-y-4 scroll-mt-24 border-t border-border pt-10">
              <h2 className="text-xl sm:text-2xl font-bold font-mono text-foreground tracking-tight flex items-center gap-2">
                <span className="text-primary font-bold">#</span>
                <span>Installation</span>
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Install globally or run ad-hoc with your preferred package manager:
              </p>

              <div className="space-y-3 font-mono text-xs">
                {/* Node */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                    <span className="font-semibold text-foreground">Node.js (npm / npx)</span>
                    <span>Zero Install Option</span>
                  </div>
                  <div className="flex items-center justify-between bg-muted/40 px-3 py-2 rounded-lg border border-border">
                    <code className="text-primary">npx context-gen-cli@latest -d</code>
                    <button
                      type="button"
                      onClick={() => handleCopy("install-npx", "npx context-gen-cli@latest -d")}
                      className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {copiedKey === "install-npx" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Python */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                    <span className="font-semibold text-foreground">Python (pip)</span>
                    <span>PyPI Package</span>
                  </div>
                  <div className="flex items-center justify-between bg-muted/40 px-3 py-2 rounded-lg border border-border">
                    <code className="text-primary">pip install context-gen-cli && ctx -d</code>
                    <button
                      type="button"
                      onClick={() => handleCopy("install-pip", "pip install context-gen-cli && ctx -d")}
                      className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {copiedKey === "install-pip" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Homebrew */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                    <span className="font-semibold text-foreground">Homebrew (macOS / Linux)</span>
                    <span>Formula Tap</span>
                  </div>
                  <div className="flex items-center justify-between bg-muted/40 px-3 py-2 rounded-lg border border-border">
                    <code className="text-primary truncate mr-2">brew tap yakkshit/context-gen https://github.com/yakkshit/context-gen.git && brew install context-gen-cli</code>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          "install-brew",
                          "brew tap yakkshit/context-gen https://github.com/yakkshit/context-gen.git && brew install context-gen-cli"
                        )
                      }
                      className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                    >
                      {copiedKey === "install-brew" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Dart */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                    <span className="font-semibold text-foreground">Dart / Flutter (pub.dev)</span>
                    <span>Pub Package</span>
                  </div>
                  <div className="flex items-center justify-between bg-muted/40 px-3 py-2 rounded-lg border border-border">
                    <code className="text-primary">dart pub global activate context_gen && ctx -d</code>
                    <button
                      type="button"
                      onClick={() => handleCopy("install-dart", "dart pub global activate context_gen && ctx -d")}
                      className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {copiedKey === "install-dart" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Java */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                    <span className="font-semibold text-foreground">Java / JVM (JBang / Maven)</span>
                    <span>Zero Install JVM CLI</span>
                  </div>
                  <div className="flex items-center justify-between bg-muted/40 px-3 py-2 rounded-lg border border-border">
                    <code className="text-primary truncate mr-2">jbang com.cedzlabs:context-gen-cli:1.3.4</code>
                    <button
                      type="button"
                      onClick={() => handleCopy("install-java", "jbang com.cedzlabs:context-gen-cli:1.3.4")}
                      className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                    >
                      {copiedKey === "install-java" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Core CLI Commands */}
            <section id="cli-reference" className="space-y-4 scroll-mt-24 border-t border-border pt-10">
              <h2 className="text-xl sm:text-2xl font-bold font-mono text-foreground tracking-tight flex items-center gap-2">
                <span className="text-primary font-bold">#</span>
                <span>Core CLI Commands</span>
              </h2>

              <div className="space-y-4 text-xs font-mono">
                {/* ctx -d */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-bold text-primary">ctx -d</code>
                    <Badge variant="outline">Default All-In-One</Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Scans all code files, builds the dependency graph, writes artifacts (`context/agent.md`, `agent.json`, `agent.yaml`), launches the local MCP server, and starts background auto-sync file watching.
                  </p>
                </div>

                {/* ctx distill */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-bold text-primary">ctx distill &lt;prompt&gt; [-p &lt;path&gt;] [-b &lt;budget&gt;]</code>
                    <Badge variant="cyan">EGRD Engine</Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Performs Entropy-Guided Reference Distillation on your prompt. Calculates $H(P)$ to either ask clarifying questions or output a surgical Senior Engineer Context Plan.
                  </p>
                </div>

                {/* ctx serve --public */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-bold text-primary">ctx serve [--public]</code>
                    <Badge variant="outline">Remote MCP</Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Boots the Model Context Protocol server. With <code className="text-foreground">--public</code>, provisions an encrypted tunnel (via native SSH or ngrok) with token-based API key authentication for remote cloud models.
                  </p>
                </div>

                {/* ctx update */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-bold text-primary">ctx update [-f md|json|yaml|all]</code>
                    <Badge variant="outline">Manual Refresh</Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Forces an immediate re-scan of the codebase and refreshes context files without starting the server.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4: How EGRD Works */}
            <section id="how-egrd-works" className="space-y-4 scroll-mt-24 border-t border-border pt-10">
              <h2 className="text-xl sm:text-2xl font-bold font-mono text-foreground tracking-tight flex items-center gap-2">
                <span className="text-primary font-bold">#</span>
                <span>How EGRD Works</span>
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Entropy-Guided Reference Distillation (EGRD) applies information theory principles to code context selection:
              </p>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <span className="text-primary font-semibold block text-sm">
                    1. Shannon Entropy Formulation
                  </span>
                  <div className="p-3 bg-muted/40 rounded-lg border border-border text-foreground font-mono">
                    H(P) = -∑ pᵢ · log₂(pᵢ)
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    The probability distribution P represents semantic similarity scores between your prompt and all codebase signatures (symbols, imports, exports, roles).
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <span className="text-secondary font-semibold block text-sm">
                    2. The Clarification Gate (H ≥ 1.50 bits)
                  </span>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    When a prompt is ambiguous (e.g., "add auth"), the probability distribution is spread out across many files. Instead of guessing, the engine pauses and asks targeted questions using actual file paths from your repo.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <span className="text-primary font-semibold block text-sm">
                    3. Knowledge Graph Blast Radius Propagation
                  </span>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    AST dependencies are traversed to identify which other files import the candidate module. The Senior Blueprint lists these under "Blast Radius" so the developer or agent knows what downstream code might break.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5: IDE & MCP Integration */}
            <section id="mcp-integration" className="space-y-4 scroll-mt-24 border-t border-border pt-10">
              <h2 className="text-xl sm:text-2xl font-bold font-mono text-foreground tracking-tight flex items-center gap-2">
                <span className="text-primary font-bold">#</span>
                <span>IDE & MCP Integration</span>
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Add the MCP config to your editor. The agent will call <code className="text-primary font-mono">distill_context</code> before generating or modifying code.
              </p>

              <div className="space-y-3 font-mono text-xs">
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">Antigravity / Cursor (.cursor/mcp.json)</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          "mcp-cursor",
                          `{\n  "mcpServers": {\n    "context-gen": {\n      "url": "http://localhost:3456/mcp"\n    }\n  }\n}`
                        )
                      }
                      className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
                    >
                      {copiedKey === "mcp-cursor" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-muted/40 rounded-lg border border-border text-foreground overflow-x-auto select-all">
{`{
  "mcpServers": {
    "context-gen": {
      "url": "http://localhost:3456/mcp"
    }
  }
}`}
                  </pre>
                </div>
              </div>
            </section>

            {/* Section 6: Benefits & Benchmarks */}
            <section id="benchmarks" className="space-y-4 scroll-mt-24 border-t border-border pt-10">
              <h2 className="text-xl sm:text-2xl font-bold font-mono text-foreground tracking-tight flex items-center gap-2">
                <span className="text-primary font-bold">#</span>
                <span>Benefits & Benchmarks</span>
              </h2>

              <div className="overflow-x-auto rounded-xl border border-border font-mono text-xs">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground text-[11px]">
                    <tr>
                      <th className="p-3">Metric</th>
                      <th className="p-3">Raw Context Dumps</th>
                      <th className="p-3 text-primary">ctx with EGRD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    <tr>
                      <td className="p-3 font-semibold text-foreground">Token Payload</td>
                      <td className="p-3 text-secondary">50,000 – 120,000</td>
                      <td className="p-3 text-primary font-bold">41 – 150 (-98.5%)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-foreground">Cost per Query</td>
                      <td className="p-3 text-secondary">~$0.20 – $0.60</td>
                      <td className="p-3 text-primary font-bold">&lt; $0.0001</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-foreground">Time to First Token</td>
                      <td className="p-3 text-secondary">6.0s – 12.0s</td>
                      <td className="p-3 text-primary font-bold">&lt; 0.25s</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-foreground">Hardware Requirement</td>
                      <td className="p-3 text-muted-foreground">Often requires GPU RAG</td>
                      <td className="p-3 text-primary font-bold">1–2 CPU cores</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-foreground">Ambiguity Protection</td>
                      <td className="p-3 text-secondary">None (Hallucinates)</td>
                      <td className="p-3 text-primary font-bold">Clarification Gate</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Bottom Nav Footer */}
            <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
              <Link href="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Homepage</span>
              </Link>

              <a
                href="https://resume.cedzlabs.com/labs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:brightness-110 font-semibold"
              >
                <span>Explore Cedzlabs Labs & More Tools</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
