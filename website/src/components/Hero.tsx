"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Zap,
  Terminal as TerminalIcon,
  Copy,
  Check,
  ArrowRight,
  Cpu,
  Layers,
  BookOpen,
  ShieldAlert,
} from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Terminal, AnimatedSpan, TypingAnimation } from "@/components/ui/terminal";

const INSTALL_COMMANDS = {
  npx: "npx context-gen-cli@latest -d",
  pip: "pip install context-gen-cli",
  brew: "brew tap yakkshit/context-gen https://github.com/yakkshit/context-gen.git && brew install context-gen-cli",
  dart: "dart pub global activate context_gen",
  java: "jbang com.cedzlabs:context-gen-cli:1.3.4",
};

export function Hero() {
  const [activeTab, setActiveTab] = useState<"npx" | "pip" | "brew" | "dart" | "java">("npx");
  const [copied, setCopied] = useState(false);

  const handleCopy = (command: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <section className="relative pt-24 pb-14 md:pt-32 md:pb-20 border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column: Headline & Install Tabs (7 cols) */}
          <div className="lg:col-span-7 space-y-5 text-left">
            {/* Version Pill */}
            <div className="inline-flex items-center gap-2">
              <Badge variant="cyan" className="py-0.5 px-2.5 text-xs font-mono">
                EGRD v1.3.0
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">
                Entropy-Guided Reference Distillation
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
              Stop Dumping{" "}
              <span className="text-secondary line-through decoration-secondary/60">
                50,000 Tokens
              </span>{" "}
              Into Your AI Agent.
            </h1>

            {/* Subheadline */}
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl font-normal leading-relaxed">
              <code>ctx</code> scans your codebase, extracts an AST Knowledge Graph, and calculates
              Shannon Entropy $H(P)$ to yield a surgical ~40-token Senior Engineer Context Plan—or
              pauses at the <strong>Clarification Gate</strong> when your prompt is ambiguous.
              Runs on <strong className="text-foreground">1–2 CPU cores</strong> with zero GPU overhead.
            </p>

            {/* Interactive Install Tabs */}
            <div className="pt-1 max-w-xl">
              <Tabs
                defaultValue="npx"
                value={activeTab}
                onValueChange={(val) => setActiveTab(val as "npx" | "pip" | "brew")}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider font-semibold">
                    Installation
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    macOS, Linux & Windows
                  </span>
                </div>

                <TabsList className="w-full justify-start bg-card border border-border p-0.5 overflow-x-auto">
                  <TabsTrigger value="npx" className="flex-1 text-[11px] sm:text-xs">
                    npx (Node)
                  </TabsTrigger>
                  <TabsTrigger value="pip" className="flex-1 text-[11px] sm:text-xs">
                    pip (Python)
                  </TabsTrigger>
                  <TabsTrigger value="brew" className="flex-1 text-[11px] sm:text-xs">
                    brew (Mac)
                  </TabsTrigger>
                  <TabsTrigger value="dart" className="flex-1 text-[11px] sm:text-xs">
                    dart (pub.dev)
                  </TabsTrigger>
                  <TabsTrigger value="java" className="flex-1 text-[11px] sm:text-xs">
                    java (JBang)
                  </TabsTrigger>
                </TabsList>

                {(["npx", "pip", "brew", "dart", "java"] as const).map((tabKey) => (
                  <TabsContent key={tabKey} value={tabKey}>
                    <div className="group relative flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5">
                      <div className="flex items-center gap-2.5 overflow-x-auto pr-2 font-mono text-xs text-foreground select-all">
                        <span className="text-primary select-none font-bold">$</span>
                        <span>{INSTALL_COMMANDS[tabKey]}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(INSTALL_COMMANDS[tabKey])}
                        className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        title="Copy command"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/doc">
                <Button variant="primary" size="lg" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Documentation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>

              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  document.getElementById("simulator")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="gap-2"
              >
                <span>Live Simulator</span>
              </Button>

              <a
                href="https://github.com/yakkshit/context-gen"
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="ghost" size="lg" className="gap-2 border border-border">
                  <GithubIcon className="w-4 h-4" />
                  <span>GitHub</span>
                </Button>
              </a>
            </div>

            {/* Metrics Band */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border max-w-xl font-mono">
              <div>
                <span className="text-xl sm:text-2xl font-bold text-primary">
                  98.5%
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">Token Reduction</p>
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-bold text-foreground">
                  1–2 Cores
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">Strict CPU Bound</p>
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-bold text-foreground">
                  0 CUDA
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">Zero GPU Downloads</p>
              </div>
            </div>
          </div>

          {/* Right Column: 21st.dev Terminal (5 cols) */}
          <div className="lg:col-span-5 w-full">
            <Terminal title="bash — context-gen-cli">
              <TypingAnimation delay={100}>$ ctx -d</TypingAnimation>

              <AnimatedSpan delay={300} className="text-primary font-bold">
                ⚡ context-gen-cli (ctx) v1.3.0
              </AnimatedSpan>

              <AnimatedSpan delay={600} className="text-muted-foreground">
                [✓] AST Scanner: 14 source files mapped
              </AnimatedSpan>

              <AnimatedSpan delay={900} className="text-foreground">
                [✓] Dependency Graph: 18 edges resolved
              </AnimatedSpan>

              <AnimatedSpan delay={1200} className="text-muted-foreground">
                [✓] Context Artifacts: context/agent.md, agent.json, agent.yaml
              </AnimatedSpan>

              <AnimatedSpan delay={1500} className="text-emerald-400 font-semibold">
                [✓] MCP Server live on http://localhost:3456/mcp
              </AnimatedSpan>

              <AnimatedSpan delay={1800} className="text-muted-foreground">
                [✓] Auto-sync watcher running in background
              </AnimatedSpan>

              <TypingAnimation delay={2200}>
                $ ctx distill "update scanner graph"
              </TypingAnimation>

              <AnimatedSpan delay={2600} className="text-muted-foreground">
                [EGRD] Initial Entropy H₀ = 2.86 bits (CPU 1 core)
              </AnimatedSpan>

              <AnimatedSpan delay={2900} className="text-primary font-bold">
                [EGRD] Final H = 0.21 bits ➔ Senior Blueprint (41 tokens)
              </AnimatedSpan>
            </Terminal>
          </div>
        </div>
      </div>
    </section>
  );
}
