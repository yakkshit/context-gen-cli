import React from "react";
import Link from "next/link";
import { Zap, ArrowUpRight, BookOpen } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/60 py-12 md:py-16 text-muted-foreground font-mono text-xs">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-card border border-border flex items-center justify-center">
                <Zap className="w-3 h-3 text-primary" />
              </div>
              <span className="font-bold text-foreground tracking-tight text-sm">
                context-gen-cli (`ctx`)
              </span>
            </div>
            <p className="text-muted-foreground max-w-sm text-xs leading-relaxed font-sans">
              Codebase context modeler and live Model Context Protocol (MCP) server.
              Powered by Entropy-Guided Reference Distillation (EGRD) with 1–2 CPU cores and zero GPU bloat.
            </p>
            <div className="pt-1 text-muted-foreground/80 text-[11px]">
              MIT License • Built for Claude, Cursor, Antigravity, and VS Code.
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <span className="font-semibold text-foreground uppercase tracking-wider block text-[11px]">
              Documentation
            </span>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link
                  href="/doc"
                  className="hover:text-foreground flex items-center gap-1 transition-colors text-primary font-medium"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Documentation Hub (/doc)</span>
                </Link>
              </li>
              <li>
                <a
                  href="/#simulator"
                  className="hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <span>Live EGRD Simulator</span>
                </a>
              </li>
              <li>
                <a
                  href="/#examples"
                  className="hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <span>Developer Cookbooks</span>
                </a>
              </li>
              <li>
                <a
                  href="/#workflow"
                  className="hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <span>MCP Setup Guide</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Standards & Labs */}
          <div className="space-y-2">
            <span className="font-semibold text-foreground uppercase tracking-wider block text-[11px]">
              Products & Ecosystem
            </span>
            <ul className="space-y-1.5 text-xs">
              <li>
                <a
                  href="https://resume.cedzlabs.com/labs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground flex items-center gap-1 transition-colors text-primary font-medium"
                >
                  <span>Cedzlabs Labs & AI Products</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/yakkshit/context-gen"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <span>GitHub Repository</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.npmjs.com/package/context-gen-cli"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <span>npm: context-gen-cli</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://modelcontextprotocol.io"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <span>Model Context Protocol (MCP)</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-muted-foreground text-[11px]">
          <div>
            © {new Date().getFullYear()} yakkshit / context-gen-cli. Open source under MIT.
          </div>
          <div className="flex items-center gap-1">
            <span>Built by <strong className="text-foreground">Cedzlabs</strong> — Open-Source AI Developer Tooling.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
