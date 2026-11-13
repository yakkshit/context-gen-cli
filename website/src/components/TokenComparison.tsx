"use client";

import React from "react";
import { XCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function TokenComparison() {
  return (
    <section className="py-20 md:py-28 relative border-t border-border bg-card/40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge variant="crimson" className="mb-2.5">
            TOKEN ECONOMICS
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight font-mono">
            Raw File Dumps vs. EGRD Distillation
          </h2>
          <p className="mt-2 text-muted-foreground text-xs sm:text-sm leading-relaxed">
            Flooding 1M-token context windows with unrelated boilerplate dilutes attention weights,
            degrades reasoning accuracy, and increases inference latency.
          </p>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Card 1: Raw File Dumping */}
          <div className="rounded-2xl border border-secondary/30 bg-card p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between shadow-xs">
            <div className="absolute top-0 right-0 px-3 py-1 bg-secondary/10 text-secondary text-[11px] font-mono font-medium rounded-bl-xl border-l border-b border-secondary/20">
              Raw Dump Anti-Pattern
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center font-bold">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground font-mono">Raw Context Dump</h3>
                  <span className="text-[11px] font-mono text-secondary">~50,000 to 120,000 Tokens</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                Concatenates dozens of whole source files into the prompt, including unrelated imports,
                formatting comments, and unused helper routines.
              </p>

              {/* Drawbacks Checklist */}
              <div className="space-y-2.5 font-mono text-xs">
                <div className="flex items-start gap-2 text-foreground/80">
                  <XCircle className="w-3.5 h-3.5 shrink-0 text-secondary mt-0.5" />
                  <span><strong>Context Window Rot:</strong> Attention dilution leads to hallucinated interfaces.</span>
                </div>
                <div className="flex items-start gap-2 text-foreground/80">
                  <XCircle className="w-3.5 h-3.5 shrink-0 text-secondary mt-0.5" />
                  <span><strong>High Latency:</strong> 6 to 12s time-to-first-token while LLM processes prompt payload.</span>
                </div>
                <div className="flex items-start gap-2 text-foreground/80">
                  <XCircle className="w-3.5 h-3.5 shrink-0 text-secondary mt-0.5" />
                  <span><strong>High API Costs:</strong> Up to $0.25 to $0.60 per query on frontier models.</span>
                </div>
                <div className="flex items-start gap-2 text-foreground/80">
                  <XCircle className="w-3.5 h-3.5 shrink-0 text-secondary mt-0.5" />
                  <span><strong>Silent Regressions:</strong> Modifies unintended files due to vague semantic boundaries.</span>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="mt-6 pt-5 border-t border-border grid grid-cols-2 gap-3 text-center font-mono">
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                <span className="text-[10px] text-muted-foreground block">Token Load</span>
                <span className="text-base font-bold text-secondary">50,000+</span>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                <span className="text-[10px] text-muted-foreground block">Query Cost</span>
                <span className="text-base font-bold text-secondary">~$0.20/call</span>
              </div>
            </div>
          </div>

          {/* Card 2: EGRD Distillation */}
          <div className="rounded-2xl border border-primary/30 bg-card p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between shadow-xs">
            <div className="absolute top-0 right-0 px-3 py-1 bg-primary/10 text-primary text-[11px] font-mono font-medium rounded-bl-xl border-l border-b border-primary/20">
              Senior Engineer Blueprint
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground font-mono">EGRD Surgical Blueprint</h3>
                  <span className="text-[11px] font-mono text-primary">~41 to 120 Tokens</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                Calculates Shannon Entropy across AST edges, identifies blast radius callers, and feeds
                the AI only exact type signatures and architecture guardrails.
              </p>

              {/* Benefits Checklist */}
              <div className="space-y-2.5 font-mono text-xs">
                <div className="flex items-start gap-2 text-foreground/80">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-primary mt-0.5" />
                  <span><strong>Zero Hallucinations:</strong> The LLM focuses 100% of attention on target interfaces.</span>
                </div>
                <div className="flex items-start gap-2 text-foreground/80">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-primary mt-0.5" />
                  <span><strong>Sub-Second Latency:</strong> Near-instant generation with TTFT under 250 milliseconds.</span>
                </div>
                <div className="flex items-start gap-2 text-foreground/80">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-primary mt-0.5" />
                  <span><strong>Near-Zero Cost:</strong> &lt;$0.0001 per query, enabling background agent loops.</span>
                </div>
                <div className="flex items-start gap-2 text-foreground/80">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-primary mt-0.5" />
                  <span><strong>Clarification Gate:</strong> Automatically pauses vague requests ("add auth") before code breaks.</span>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="mt-6 pt-5 border-t border-border grid grid-cols-2 gap-3 text-center font-mono">
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                <span className="text-[10px] text-muted-foreground block">Token Load</span>
                <span className="text-base font-bold text-primary">41 tokens</span>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                <span className="text-[10px] text-muted-foreground block">Query Cost</span>
                <span className="text-base font-bold text-primary">&lt; $0.0001</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
