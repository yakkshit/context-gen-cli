import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "context-gen-cli (ctx) — Stop Dumping 50,000 Tokens Into Your AI Agent",
  description:
    "Entropy-Guided Reference Distillation (EGRD), AST Knowledge Graphs, and Live Model Context Protocol (MCP) Server for Claude, Cursor, Antigravity, and VS Code. 1-2 CPU cores, zero GPU bloat.",
  keywords: [
    "context-gen-cli",
    "ctx",
    "Model Context Protocol",
    "MCP",
    "Entropy-Guided Reference Distillation",
    "EGRD",
    "AST Knowledge Graph",
    "Claude",
    "Cursor",
    "Antigravity",
    "AI coding",
  ],
  authors: [{ name: "yakkshit" }],
  openGraph: {
    title: "context-gen-cli (ctx) — Stop Dumping 50,000 Tokens Into Your AI Agent",
    description:
      "Entropy-Guided Reference Distillation (EGRD), AST Knowledge Graphs, and Live Model Context Protocol (MCP) Server. 1-2 CPU cores, zero GPU bloat.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark scroll-smooth`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
