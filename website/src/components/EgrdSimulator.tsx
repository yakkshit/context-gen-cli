"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  FileCode2,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PromptScenario {
  id: "vague" | "specific";
  title: string;
  prompt: string;
  intent: string;
  initialEntropy: number;
  finalEntropy: number;
  status: "needs_clarification" | "ready";
  steps: {
    title: string;
    description: string;
    entropy: number;
  }[];
  tokensEstimate: {
    raw: number;
    distilled: number;
  };
}

const SCENARIOS: Record<"vague" | "specific", PromptScenario> = {
  vague: {
    id: "vague",
    title: "Vague Prompt",
    prompt: "add auth",
    intent: "Security, Auth & Configuration",
    initialEntropy: 3.42,
    finalEntropy: 2.18,
    status: "needs_clarification",
    steps: [
      {
        title: "1. Embedding & Intent Classification",
        description: "Scanned 14 files. High semantic dispersion across 8 potential auth surfaces.",
        entropy: 3.42,
      },
      {
        title: "2. AST Knowledge Graph Propagation",
        description: "Graph detected middleware, session handlers, and CLI flags with no clear winner.",
        entropy: 2.85,
      },
      {
        title: "3. Entropy Gate Evaluation",
        description: "H(P) = 2.18 bits ≥ 1.50 threshold. Ambiguity detected across multiple packages.",
        entropy: 2.18,
      },
      {
        title: "4. Clarification Gate Triggered",
        description: "HALTED: Demanding target workspace and token architecture before LLM hallucinations occur.",
        entropy: 2.18,
      },
    ],
    tokensEstimate: {
      raw: 14200,
      distilled: 86,
    },
  },
  specific: {
    id: "specific",
    title: "Specific Prompt",
    prompt: "update mcp tools and scanner graph",
    intent: "Feature Implementation",
    initialEntropy: 2.86,
    finalEntropy: 0.21,
    status: "ready",
    steps: [
      {
        title: "1. Neural & AST Signature Matching",
        description: "Matched src/mcp/tools.js, src/scanner.js, and src/graph.js with 94.2% confidence.",
        entropy: 1.84,
      },
      {
        title: "2. Knowledge Graph Activation Flow",
        description: "Propagated dependencies across 18 AST edges; identified downstream callers.",
        entropy: 0.89,
      },
      {
        title: "3. Shannon Information Optimization",
        description: "Ranked by ΔH / token density. Extracted exported AST signatures only.",
        entropy: 0.42,
      },
      {
        title: "4. Senior Context Blueprint Generated",
        description: "H(P) dropped to 0.21 bits. Zero ambiguity. Exact 41-token blueprint produced.",
        entropy: 0.21,
      },
    ],
    tokensEstimate: {
      raw: 2800,
      distilled: 41,
    },
  },
};

export function EgrdSimulator() {
  const [selectedScenario, setSelectedScenario] = useState<"vague" | "specific">("specific");
  const [copied, setCopied] = useState(false);
  const scenario = SCENARIOS[selectedScenario];

  const handleCopy = (text: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const tokenSavingsPercent = Math.round(
    ((scenario.tokensEstimate.raw - scenario.tokensEstimate.distilled) /
      scenario.tokensEstimate.raw) *
      100
  );

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="cyan" className="gap-1.5">
              <Zap className="w-3 h-3 text-primary" />
              Interactive Engine
            </Badge>
            <Badge variant="outline" className="gap-1 font-mono">
              <Cpu className="w-3 h-3 text-muted-foreground" />
              1 Core • CPU Only
            </Badge>
          </div>
          <h3 className="text-xl font-bold tracking-tight text-foreground font-mono">
            Shannon Entropy $H(P)$ Distillation Simulator
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            Watch $H(P)$ evaluate uncertainty and route to either the Clarification Gate or the Senior Context Blueprint.
          </p>
        </div>

        {/* Scenario Toggle */}
        <div className="flex items-center bg-muted/60 border border-border p-0.5 rounded-full">
          <button
            type="button"
            onClick={() => setSelectedScenario("vague")}
            className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer ${
              selectedScenario === "vague"
                ? "bg-secondary text-secondary-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Vague Prompt ("add auth")
          </button>
          <button
            type="button"
            onClick={() => setSelectedScenario("specific")}
            className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer ${
              selectedScenario === "specific"
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Specific Prompt ("update mcp...")
          </button>
        </div>
      </div>

      {/* Simulator Grid */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Col: Entropy Pipeline (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Active Prompt Box */}
          <div className="rounded-xl border border-border bg-card p-3.5">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-1.5">
              <span className="flex items-center gap-1.5">
                <FileCode2 className="w-3.5 h-3.5 text-primary" />
                Input Query to <code className="text-foreground">ctx distill</code>
              </span>
              <span>Mode: {scenario.intent}</span>
            </div>
            <div className="flex items-center justify-between bg-muted/40 rounded-lg px-3.5 py-2.5 border border-border font-mono text-xs text-foreground">
              <span>"{scenario.prompt}"</span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {scenario.id === "vague" ? "High Ambiguity" : "Low Entropy"}
              </span>
            </div>
          </div>

          {/* Shannon Entropy Gauge */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <span className="text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                  Shannon Entropy Metric $H(P) = -\sum p_i \log_2(p_i)$
                </span>
                <div className="text-lg font-bold font-mono text-foreground mt-0.5 flex items-center gap-2">
                  <span>H(P) = {scenario.finalEntropy.toFixed(2)} bits</span>
                  {scenario.status === "needs_clarification" ? (
                    <Badge variant="crimson">Uncertainty (≥ 1.50 bits)</Badge>
                  ) : (
                    <Badge variant="cyan">Deterministic (&lt; 0.50 bits)</Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-muted-foreground">Initial H₀</span>
                <div className="text-xs font-mono text-foreground">
                  {scenario.initialEntropy.toFixed(2)} bits
                </div>
              </div>
            </div>

            {/* Gauge Bar */}
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (scenario.finalEntropy / 3.5) * 100)}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  scenario.status === "needs_clarification" ? "bg-secondary" : "bg-primary"
                }`}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1.5">
              <span>0.0 bits (Certainty)</span>
              <span className="text-foreground font-semibold">1.50 bits (Gate Threshold)</span>
              <span>3.50 bits (Noise)</span>
            </div>
          </div>

          {/* Stepper Pipeline */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-wider block">
              Distillation Pipeline
            </span>
            <div className="space-y-2">
              {scenario.steps.map((step, idx) => (
                <div
                  key={step.title}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card/60 p-3"
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5 ${
                      idx === 3 && scenario.status === "needs_clarification"
                        ? "bg-secondary/20 text-secondary border border-secondary/40"
                        : idx === 3
                        ? "bg-primary/20 text-primary border border-primary/40"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold text-foreground">
                        {step.title}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        H = {step.entropy.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Output Blueprint vs Clarification Gate (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Token Comparison Pill */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-semibold text-muted-foreground uppercase">
                Context Payload
              </span>
              <Badge variant="cyan" className="font-bold">
                -{tokenSavingsPercent}% Reduction
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2.5 font-mono text-center">
              <div className="rounded-lg border border-secondary/30 bg-secondary/10 p-2.5">
                <span className="text-[10px] text-muted-foreground block">Raw Context</span>
                <span className="text-base font-bold text-secondary">
                  {scenario.tokensEstimate.raw.toLocaleString()}
                </span>
                <span className="text-[9px] text-muted-foreground block">tokens</span>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-2.5">
                <span className="text-[10px] text-muted-foreground block">EGRD Distilled</span>
                <span className="text-base font-bold text-primary">
                  {scenario.tokensEstimate.distilled}
                </span>
                <span className="text-[9px] text-muted-foreground block">tokens</span>
              </div>
            </div>
          </div>

          {/* Generated Result Card */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-border mb-3">
              <span className="text-xs font-mono font-semibold text-foreground flex items-center gap-1.5">
                {scenario.status === "needs_clarification" ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-secondary" />
                    <span>Clarification Gate Output</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    <span>Senior Engineer Blueprint</span>
                  </>
                )}
              </span>

              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    scenario.status === "needs_clarification"
                      ? "CLARIFICATION NEEDED:\n1. Target Workspace: Which package should I modify?\n2. Implementation Pattern: Extend existing module or standalone?\n3. Persistence: Persist to disk/DB or stay stateless?"
                      : "### Senior Engineer Context Plan (41 tokens)\n- Task: update mcp tools and scanner graph\n- Primary: src/mcp/tools.js, src/graph.js\n- Blast Radius: src/index.js\n- Guardrail: Preserve signatures."
                  )
                }
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer font-mono"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {scenario.status === "needs_clarification" ? (
                <motion.div
                  key="vague-output"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="space-y-2.5 font-mono text-xs text-foreground"
                >
                  <div className="p-2.5 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary">
                    <p className="font-semibold text-xs mb-0.5">
                      Ambiguity Detected ($H(P) = 2.18$ bits):
                    </p>
                    <p className="text-[11px] text-foreground/80 leading-relaxed">
                      Halts execution before code is written, asking targeted questions grounded in your repository:
                    </p>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-lg bg-muted/40 border border-border text-foreground text-[11px]">
                    <p>
                      <strong>1. Target Workspace:</strong> Which package should I modify? (<code className="text-primary">apps/api</code> or <code className="text-primary">packages/auth</code>)
                    </p>
                    <p>
                      <strong>2. Implementation Pattern:</strong> Follow <code className="text-primary">src/mcp/auth.js</code> or build standalone?
                    </p>
                    <p>
                      <strong>3. Persistence:</strong> Store in <code className="text-primary">.env</code> or session storage?
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="specific-output"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="space-y-2.5 font-mono text-xs text-foreground"
                >
                  <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                    <p className="font-semibold text-xs mb-0.5">
                      Surgical Context Blueprint (41 tokens | CPU 1 core):
                    </p>
                    <p className="text-[11px] text-foreground/80">
                      Zero hallucinations. AI receives only exact signatures and AST dependencies.
                    </p>
                  </div>

                  <pre className="p-3 rounded-lg bg-muted/40 border border-border text-[11px] text-foreground overflow-x-auto leading-relaxed select-all">
{`### Senior Engineer Context Plan (41 tokens)
- Task: update mcp tools and scanner graph
- Engineering Mode: Feature Implementation

- Primary Files to Reference:
  • src/mcp/tools.js [js/mcp]
    exports: [registerTools, handleCall]
  • src/graph.js [js/core]
    exports: [buildDependencyGraph]

- Blast Radius (Dependents):
  • src/index.js (imports tools)

- Architecture Guardrail:
  Keep tool schema backwards compatible.`}
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
