"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Zap, Terminal, Copy, Check, Sun, Moon, BookOpen } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { useTheme } from "@/components/theme-provider";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const [copied, setCopied] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const copyQuickInstall = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText("npx context-gen-cli@latest -d");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="container mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center transition-colors group-hover:border-primary/50">
            <Zap className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground tracking-tight text-sm sm:text-base font-mono">
              context-gen-cli
            </span>
            <Badge variant="cyan" className="py-0 px-1.5 text-[10px]">
              ctx
            </Badge>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-mono text-muted-foreground">
          <Link
            href="/doc"
            className="flex items-center gap-1.5 text-primary font-semibold hover:brightness-110 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Docs</span>
          </Link>
          <a href="/#simulator" className="hover:text-foreground transition-colors">
            Simulator
          </a>
          <a href="/#workflow" className="hover:text-foreground transition-colors">
            Workflow
          </a>
          <a href="/#examples" className="hover:text-foreground transition-colors">
            Cookbooks
          </a>
          <a href="/#features" className="hover:text-foreground transition-colors">
            Architecture
          </a>
          <a href="/#faq" className="hover:text-foreground transition-colors">
            FAQ
          </a>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          <a
            href="https://resume.cedzlabs.com/labs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-mono font-medium text-primary hover:brightness-110 transition-colors px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-1"
          >
            <span>Cedzlabs Labs</span>
            <span className="text-[10px]">↗</span>
          </a>

          <button
            type="button"
            onClick={copyQuickInstall}
            className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card hover:bg-muted text-xs font-mono text-foreground transition-colors cursor-pointer"
            title="Copy Quick Install"
          >
            <span className="text-primary font-bold">$</span>
            <span>ctx -d</span>
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400 ml-0.5" />
            ) : (
              <Copy className="w-3 h-3 text-muted-foreground ml-0.5" />
            )}
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-foreground" />}
          </button>

          <a
            href="https://github.com/yakkshit/context-gen"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1 rounded-full border border-border bg-card hover:bg-muted text-xs font-mono font-medium text-foreground transition-colors"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
