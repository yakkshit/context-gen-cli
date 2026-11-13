"use client";

import React from "react";
import {
  BrainCircuit,
  Network,
  Cpu,
  ShieldCheck,
  Radio,
  FileCode,
  Zap,
  Globe2,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BentoCard } from "@/components/ui/bento";

export function FeatureBento() {
  return (
    <section id="features" className="py-20 md:py-28 relative border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge variant="cyan" className="mb-2.5">
            ARCHITECTURE & CAPABILITIES
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight font-mono">
            System Design & Technical Pillars
          </h2>
          <p className="mt-2 text-muted-foreground text-xs sm:text-sm leading-relaxed">
            Every layer of <code className="text-foreground font-mono">ctx</code> delivers
            maximum semantic context with minimal token overhead and zero cloud dependencies.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: EGRD (Large 2 Cols on LG) */}
          <BentoCard
            className="lg:col-span-2"
            eyebrow="Core Engine"
            badge={<Badge variant="cyan">Shannon Information Theory</Badge>}
            title="Entropy-Guided Reference Distillation (EGRD)"
            description="Unlike naive RAG systems that retrieve hundreds of raw code lines, EGRD calculates Shannon Entropy H(P) = -∑ p log₂(p). It measures the ambiguity of your request against your codebase signatures and extracts only surgical AST symbol references."
            graphic={
              <div className="rounded-xl border border-border bg-muted/30 p-3.5 font-mono text-xs text-foreground space-y-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pb-2 border-b border-border">
                  <span>Distillation Ratio Metric</span>
                  <span className="text-primary font-semibold">ΔH / tokens = (p · H₀ · 1.6) / tokensEstimate</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center pt-1">
                  <div className="bg-card p-2.5 rounded-lg border border-border">
                    <span className="text-[10px] text-muted-foreground block">Vague Prompt Gate</span>
                    <span className="text-secondary font-bold">H(P) ≥ 1.50 bits ➔ Halts & Clarifies</span>
                  </div>
                  <div className="bg-card p-2.5 rounded-lg border border-border">
                    <span className="text-[10px] text-muted-foreground block">Distilled Blueprint</span>
                    <span className="text-primary font-bold">H(P) &lt; 0.50 bits ➔ 41 Tokens</span>
                  </div>
                </div>
              </div>
            }
          />

          {/* Card 2: Hardware-Aware CPU Governor */}
          <BentoCard
            eyebrow="Lightweight Execution"
            badge={<Badge variant="outline">Strict CPU Cap</Badge>}
            title="Hardware-Aware Resource Governor"
            description="Runs strictly on 1–2 CPU cores using lightweight quantized ONNX embeddings or probabilistic fallback. Zero CUDA, zero Torch, zero 2GB model downloads."
            graphic={
              <div className="rounded-xl border border-border bg-muted/30 p-3.5 font-mono text-xs text-foreground">
                <div className="flex items-center gap-1.5 text-primary mb-2">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>CPU Ceiling Governor</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Threads Allocated:</span>
                    <span className="text-foreground font-bold font-mono">1–2 cores max</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CUDA / GPU Requirement:</span>
                    <span className="text-emerald-400 font-bold font-mono">0.0 MB (None)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Embedding Model:</span>
                    <span className="text-foreground font-mono">all-MiniLM-L6-v2 (q8)</span>
                  </div>
                </div>
              </div>
            }
          />

          {/* Card 3: AST Knowledge Graph */}
          <BentoCard
            eyebrow="Graph Traversal"
            badge={<Badge variant="cyan">AST Resolution</Badge>}
            title="Dependency & Blast Radius Analysis"
            description="Deep static analysis traces import/export relationships, entrypoints, and downstream callers across TypeScript, JavaScript, Python, Go, and Rust projects."
            graphic={
              <div className="rounded-xl border border-border bg-muted/30 p-3.5 font-mono text-xs text-foreground space-y-1.5">
                <div className="flex items-center gap-1.5 text-primary mb-1.5">
                  <Network className="w-3.5 h-3.5" />
                  <span>AST Dependency Resolution</span>
                </div>
                <div className="text-[11px] text-muted-foreground space-y-1">
                  <p className="flex justify-between">
                    <span>Entrypoints detected:</span>
                    <span className="text-foreground">src/index.js, src/distill.js</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Graph traversal depth:</span>
                    <span className="text-foreground">3 levels (configurable)</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Blast radius warning:</span>
                    <span className="text-secondary font-semibold">Active</span>
                  </p>
                </div>
              </div>
            }
          />

          {/* Card 4: Built-in Multi-Tunneling */}
          <BentoCard
            eyebrow="Remote Connectivity"
            badge={<Badge variant="outline">Live MCP Bridge</Badge>}
            title="Multi-Tunnel Remote MCP Server"
            description="Share your local project context with cloud-based AI agents via free native SSH tunnels (localhost.run, serveo.net) or token-based providers (ngrok, cloudflared)."
            graphic={
              <div className="rounded-xl border border-border bg-muted/30 p-3.5 font-mono text-xs text-foreground space-y-2">
                <div className="flex items-center gap-1.5 text-primary mb-1">
                  <Globe2 className="w-3.5 h-3.5" />
                  <span>Public & Local Endpoints</span>
                </div>
                <div className="p-2 rounded bg-card border border-border text-[11px] text-foreground truncate">
                  $ ctx -m --public ➔ https://*.localhost.run
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>API Key Auth:</span>
                  <span className="text-emerald-400 font-semibold">Enforced</span>
                </div>
              </div>
            }
          />

          {/* Card 5: Smart Security Filters */}
          <BentoCard
            eyebrow="Security & Privacy"
            badge={<Badge variant="outline">Zero Secrets Leaked</Badge>}
            title="Intelligent Security & Redaction"
            description="Automatically respects .gitignore, .dockerignore, and .npmignore while redacting API keys, SSH credentials, certificates, and environment secret patterns."
            graphic={
              <div className="rounded-xl border border-border bg-muted/30 p-3.5 font-mono text-xs text-foreground space-y-1.5">
                <div className="flex items-center gap-1.5 text-primary mb-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Automated Redaction Guard</span>
                </div>
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <p className="flex justify-between">
                    <span>.env & secrets:</span>
                    <span className="text-secondary font-bold">[REDACTED]</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Target storage:</span>
                    <span className="text-foreground">Local context/ directory</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Third-party telemetry:</span>
                    <span className="text-emerald-400 font-bold">Zero (Air-gapped)</span>
                  </p>
                </div>
              </div>
            }
          />
        </div>
      </div>
    </section>
  );
}
