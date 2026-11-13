"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const FAQS = [
  {
    value: "item-1",
    question: "Why does dumping 50,000 tokens hurt LLMs if they support 1M context windows?",
    answer:
      "While modern frontier models (Claude 3.7 Sonnet, Gemini 2.5 Flash, GPT-4o) have enormous theoretical context windows, empirical research shows that 'needle-in-a-haystack' retrieval degrades reasoning quality. Irrelevant boilerplate dilutes attention weights, increases time-to-first-token latency by 5x–10x, and causes the model to guess or rewrite the wrong files. EGRD extracts only the exact AST signatures and blast radius callers needed.",
  },
  {
    value: "item-2",
    question: "How does Shannon Entropy H(P) measure ambiguity in my prompt?",
    answer:
      "When you run `ctx distill <prompt>`, the engine embeds your task intent against your codebase signatures and builds a probability distribution P across candidate files. Shannon Entropy H(P) = -∑ pᵢ log₂(pᵢ) computes the uncertainty in bits. If H(P) ≥ 1.50 bits (e.g. 'add auth'), multiple disjoint files could be the target; the Clarification Gate halts and asks targeted questions. When H(P) < 0.50 bits, certainty is high, and a surgical 41-token blueprint is generated.",
  },
  {
    value: "item-3",
    question: "How does the hardware governor enforce CPU-only execution?",
    answer:
      "Unlike heavyweight Python ML stacks that download 2GB of PyTorch and CUDA drivers, context-gen-cli uses a quantized ONNX runtime (`Xenova/all-MiniLM-L6-v2` in q8) with strict OMP/ORT thread caps (1 core for standard laptops, strictly capped at 2 cores for heavy multi-core workstations). On low-memory environments, it automatically falls back to an ultra-fast probabilistic AST tokenizer that uses 0% neural overhead.",
  },
  {
    value: "item-4",
    question: "How does the live MCP server connect to Cursor, Claude, and Antigravity?",
    answer:
      "When you run `ctx -d` or `ctx serve`, it launches a JSON-RPC Model Context Protocol (MCP) server. Any MCP-compatible client (Cursor Composer, Antigravity, Claude Code, Claude Desktop, or VS Code Continue) connects via stdio or HTTP. The agent can then call tools like `read_file`, `search_symbols`, `get_ast_graph`, and `distill_context` in real time.",
  },
  {
    value: "item-5",
    question: "Is any of my code or context sent to external third-party clouds?",
    answer:
      "No. All AST scanning, graph building, and entropy distillation happen 100% locally on your machine. Everything is stored in your local `context/` directory (`agent.md`, `agent.json`, `agent.yaml`). If you choose to share your MCP server with remote cloud models, `ctx -m --public` generates an encrypted SSH tunnel with mandatory token-based API key authentication.",
  },
  {
    value: "item-6",
    question: "Which languages and frameworks are supported?",
    answer:
      "context-gen-cli natively parses JavaScript, TypeScript, JSX, TSX, Python, Go, Rust, Ruby, PHP, and shell configurations. It maps monorepo structures (Turborepo, pnpm, npm, Bun, Cargo workspaces, Python venvs) automatically.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="py-20 md:py-28 relative border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        {/* Section Header */}
        <div className="text-center mb-14">
          <Badge variant="cyan" className="mb-2.5">
            FREQUENTLY ASKED QUESTIONS
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight font-mono">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-muted-foreground text-xs sm:text-sm leading-relaxed">
            Details on entropy calculation, hardware bounds, and protocol integration.
          </p>
        </div>

        {/* Accordion */}
        <Accordion defaultValue="item-1">
          {FAQS.map((faq) => (
            <AccordionItem key={faq.value} value={faq.value}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
