"use client";

import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { EgrdSimulator } from "@/components/EgrdSimulator";
import { WorkflowSection } from "@/components/WorkflowSection";
import { DeveloperExamples } from "@/components/DeveloperExamples";
import { FeatureBento } from "@/components/FeatureBento";
import { TokenComparison } from "@/components/TokenComparison";
import { FaqSection } from "@/components/FaqSection";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Fixed Navbar */}
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <Hero />

        {/* Live EGRD Interactive Simulator Anchor */}
        <section id="simulator" className="py-16 md:py-24 relative border-t border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <Badge variant="cyan" className="mb-2">
                INTERACTIVE DEMO
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight font-mono">
                Shannon Entropy $H(P)$ Distillation in Action
              </h2>
              <p className="mt-2 text-muted-foreground text-xs sm:text-sm leading-relaxed">
                Test how the engine detects ambiguous prompts and prevents hallucinatory multi-file writes.
              </p>
            </div>

            <EgrdSimulator />
          </div>
        </section>

        {/* 3-Step Workflow & Universal MCP Connection Snippet */}
        <WorkflowSection />

        {/* Real-World Developer Examples & Cookbooks */}
        <DeveloperExamples />

        {/* Feature Bento Grid */}
        <FeatureBento />

        {/* Side-by-Side Token Economics Comparison */}
        <TokenComparison />

        {/* FAQ Accordion */}
        <FaqSection />

        {/* Final Documentation Callout Banner */}
        <section className="py-16 md:py-20 relative border-t border-border bg-card/60">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center max-w-3xl">
            <Badge variant="cyan" className="mb-3 font-mono">
              DOCUMENTATION HUB
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight font-mono">
              Complete Reference, CLI Flags & Architecture
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Read the full technical breakdown, mathematical formulas, and MCP JSON configurations for Cursor, Claude, Antigravity, and VS Code.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/doc">
                <Button variant="primary" size="lg" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Open Documentation (/doc)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>

              <a
                href="https://resume.cedzlabs.com/labs"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="lg" className="gap-2">
                  <span>Explore Cedzlabs Labs</span>
                  <span className="text-xs">↗</span>
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
