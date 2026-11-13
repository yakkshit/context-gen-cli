#!/usr/bin/env node

/**
 * @fileoverview CLI entry point for context-gen-cli.
 * Scans a project, builds an architecture & dependency graph model,
 * and generates triple context files (agent.md, agent.json, agent.yaml) for AI assistants & MCP servers.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { select, checkbox, input } from "@inquirer/prompts";
import chokidar from "chokidar";
import chalk from "chalk";
import ora from "ora";
import figlet from "figlet";
import { scanProject } from "./scanner.js";
import { extractMetadata, findReadmeFiles } from "./extractor.js";
import { buildDependencyGraph } from "./graph.js";
import { generateAgentMd, generateAgentJson, generateAgentYaml } from "./generator.js";
import { generateSkillMd } from "./skills.js";
import { loadConfig, getDefaultConfig, saveConfig, CONFIG_FILE_NAME } from "./config.js";
import { runInitWizard } from "./init.js";
import { printMainBanner, runAnimatedPipeline, printSummaryCard, printDistillCard } from "./ui.js";

export function showUsageGuideText() {
  return `=======================================================
✨ context-gen-cli (ctx) — AI Project Context Generator
=======================================================

📖 HOW TO USE:

1️⃣  ⚡ All-In-One Mode (Generate + Live MCP Server + Auto-sync Watcher)
    $ ctx -d              (or ctx --default)

2️⃣  Generate All Context Formats (agent.md, agent.json, agent.yaml)
    $ ctx                 (or ctx [path])
    $ ctx update          (quick refresh)

3️⃣  Start MCP Server for Cursor / Claude / Antigravity / VS Code
    $ ctx -m              (interactive 1-step setup)
    $ ctx serve --public  (shareable temporary URL)

4️⃣  Keep Context Fresh (Auto-updates on file save)
    $ ctx -w              (or ctx --watch)

5️⃣  Custom Formats & Folders
    $ ctx -f json         (formats: md, json, yaml, all)
    $ ctx -o docs/ctx     (custom output destination)
    $ ctx -p ./subapp     (analyze specific project folder)

6️⃣  Run Setup Wizard
    $ ctx init

💡 PRO-TIPS:
- Command alias 'ctx' works everywhere (npm / pip).
- Everything (agent.md, agent.json, agent.yaml, .context-gen.json) stays neatly inside context/.
- Security scanner automatically strips .env, keys, and credentials.
- Check context/mcp.md for 1-click AI client configuration.
=======================================================`;
}

export function showUsageGuide() {
  console.log(showUsageGuideText());
}

/**
 * Handles the interactive --mcp flow.
 * @param {string} targetPath - Directory path.
 */
export async function startMcpInteractive(targetPath = ".") {
  const rootDir = path.resolve(targetPath);

  console.log("");
  console.log(chalk.bold.hex("#6366f1")("╔════════════════════════════════════════════════════════╗"));
  console.log(chalk.bold.hex("#6366f1")("║   ⚡ context-gen-cli — Interactive MCP Server Setup    ║"));
  console.log(chalk.bold.hex("#6366f1")("╚════════════════════════════════════════════════════════╝"));
  console.log("");

  let config = loadConfig(rootDir);
  const candidateConfigPaths = [
    path.join(rootDir, config.outputDir || "context", CONFIG_FILE_NAME),
    path.join(rootDir, CONFIG_FILE_NAME)
  ];

  let hasConfig = false;
  for (const cPath of candidateConfigPaths) {
    try {
      await fs.access(cPath);
      hasConfig = true;
      break;
    } catch {}
  }

  if (!hasConfig) {
    console.log(chalk.yellow("ℹ️  No configuration found. Running initial setup wizard first...\n"));
    config = await runInitWizard(rootDir);
  }

  // 1. Where to run
  const runMode = await select({
    message: "Where do you want to run the MCP server?",
    choices: [
      { name: "1. Local only (http://localhost:3456/mcp)", value: "local" },
      { name: "2. Public URL (temporary shareable link for remote AI agents)", value: "public" }
    ]
  });

  let tunnelService = "local only";
  if (runMode === "public") {
    tunnelService = await select({
      message: "Which tunnel service would you like to use for the public URL?",
      choices: [
        { name: "1. localhost.run (Free, native SSH, NO token required, highly reliable)", value: "localhost.run" },
        { name: "2. serveo.net (Free, native SSH, NO token required)", value: "serveo.net" },
        { name: "3. ngrok (Official, fast, requires free auth token)", value: "ngrok" },
        { name: "4. cloudflare (Cloudflare Quick Tunnel via cloudflared)", value: "cloudflare" }
      ]
    });
  }

  // 2. Generate triple context files
  const genSpinner = ora({ text: chalk.blue("🔍 Generating fresh project context..."), color: "cyan" }).start();
  const { files, tree } = await scanProject(rootDir, 3, [], config);
  const metadata = await extractMetadata(rootDir, files);
  const graph = await buildDependencyGraph(files, rootDir, metadata.pkgJson);

  const jsonObject = generateAgentJson({ tree, metadata, graph, projectPath: rootDir });
  const jsonString = JSON.stringify(jsonObject, null, 2);
  const mdString = generateAgentMd({ tree, metadata, graph });
  const yamlString = generateAgentYaml({ tree, metadata, graph, projectPath: rootDir });

  const outDirName = config.outputDir || "context";
  const outDirPath = path.resolve(rootDir, outDirName);
  await fs.mkdir(outDirPath, { recursive: true });

  const activeFormats = Array.isArray(config.outputFormats) && config.outputFormats.length > 0
    ? config.outputFormats
    : ["json", "md"];

  if (activeFormats.includes("json")) {
    await fs.writeFile(path.join(outDirPath, "agent.json"), jsonString, "utf-8");
  }
  if (activeFormats.includes("md")) {
    await fs.writeFile(path.join(outDirPath, "agent.md"), mdString, "utf-8");
  }
  if (activeFormats.includes("yaml")) {
    await fs.writeFile(path.join(outDirPath, "agent.yaml"), yamlString, "utf-8");
  }

  genSpinner.succeed(chalk.green(`✓ Context generated in ${chalk.bold(outDirName + "/")} & synced for MCP!`));
  console.log("");

  // 3. Start MCP server
  const { startMcpServer } = await import("./mcp/server.js");
  const { apiKey, publicUrl, boundPort } = await startMcpServer({
    port: 3456,
    isPublic: runMode === "public",
    tunnelService,
    projectPath: rootDir
  });

  const activePort = boundPort || 3456;
  const activeUrl = publicUrl ? `${publicUrl}/mcp` : `http://localhost:${activePort}/mcp`;

  // 4. Beautiful Summary
  console.log(`
╔════════════════════════════════════════════════════════╗
║   🚀 MCP Server Ready!                                ║
╚════════════════════════════════════════════════════════╝

📍 Project:    ${rootDir}
🔌 Local URL:   http://localhost:${activePort}/mcp
${publicUrl ? `🌐 Public URL:  ${activeUrl}\n` : ""}🔐 API Key:     ${apiKey}

📋 Quick Connect (Cursor / Claude Desktop / Antigravity / VS Code):
─────────────────────────────────────────────────────────
{\n  "mcpServers": {\n    "context-gen": {\n      "url": "${activeUrl}",\n      "headers": {\n        "X-API-Key": "${apiKey}"\n      }\n    }\n  }\n}
─────────────────────────────────────────────────────────

💡 The server is running. Press Ctrl+C to stop.
`);
}

/**
 * Executes default all-in-one mode (-d, --default):
 * Generates context in context/, starts MCP server (local or public), and runs live watch mode in background.
 * Automatically shuts down watcher when MCP server is stopped (Ctrl+C).
 * @param {string} targetPath - Directory path.
 * @param {object} options - CLI options.
 */
export async function startDefaultAllInOne(targetPath = ".", options = {}) {
  const rootDir = path.resolve(targetPath);
  const config = loadConfig(rootDir);
  const outDirName = config.outputDir || "context";
  const outDirPath = path.resolve(rootDir, outDirName);
  await fs.mkdir(outDirPath, { recursive: true });

  const isPublic = Boolean(options.public);
  const tunnelService = options.tunnel || (isPublic ? "localhost.run" : "local only");

  console.log(chalk.bold.cyan("\n⚡ context-gen-cli — Default All-In-One Mode (-d)\n"));

  const genSpinner = ora({ text: chalk.blue("1/3 Scanning project and generating context..."), color: "cyan" }).start();

  const regenerate = async (changedFile = null) => {
    try {
      const { files, tree } = await scanProject(rootDir, 3, [], config);
      const metadata = await extractMetadata(rootDir, files);
      const graph = await buildDependencyGraph(files, rootDir, metadata.pkgJson);

      const mdContent = generateAgentMd({ tree, metadata, graph });
      const jsonObject = generateAgentJson({ tree, metadata, graph, projectPath: rootDir });
      const jsonContent = JSON.stringify(jsonObject, null, 2);
      const yamlContent = generateAgentYaml({ tree, metadata, graph, projectPath: rootDir });
      const skillMdContent = generateSkillMd(metadata.primaryFramework);

      await fs.writeFile(path.join(outDirPath, "agent.md"), mdContent, "utf-8");
      await fs.writeFile(path.join(outDirPath, "agent.json"), jsonContent, "utf-8");
      await fs.writeFile(path.join(outDirPath, "agent.yaml"), yamlContent, "utf-8");
      await fs.writeFile(path.join(outDirPath, "skill.md"), skillMdContent, "utf-8");
      
      const publicDirPath = path.join(rootDir, "public");
      await fs.mkdir(publicDirPath, { recursive: true });
      await fs.writeFile(path.join(publicDirPath, "skills.md"), skillMdContent, "utf-8");

      if (changedFile) {
        const timeStr = new Date().toLocaleTimeString();
        console.log(chalk.green(`[${timeStr}] 🔄 File changed: ${chalk.bold(changedFile)}. Context updated & live synced with MCP!`));
      }
    } catch (err) {
      console.error(chalk.red("Error regenerating context:"), err.message || err);
    }
  };

  await regenerate();
  genSpinner.succeed(chalk.green(`✓ Context files generated in ${chalk.bold(outDirName + "/")}`));

  // 2. Start MCP server (local or public)
  const mcpSpinner = ora({ text: chalk.blue(`2/3 Starting MCP Server (${isPublic ? `Public: ${tunnelService}` : "Local"})...`), color: "cyan" }).start();
  const { startMcpServer } = await import("./mcp/server.js");
  const { apiKey, server, boundPort, publicUrl } = await startMcpServer({
    port: 3456,
    isPublic,
    tunnelService,
    projectPath: rootDir
  });

  const activePort = boundPort || 3456;
  const activeUrl = publicUrl ? `${publicUrl}/mcp` : `http://localhost:${activePort}/mcp`;
  mcpSpinner.succeed(chalk.green(`✓ MCP Server live on ${chalk.bold(activeUrl)}`));

  // 3. Start background file watcher
  const ignoredPatterns = [
    /(^|[\/\\])node_modules([\/\\]|$)/,
    /(^|[\/\\])\.git([\/\\]|$)/,
    /(^|[\/\\])dist([\/\\]|$)/,
    /(^|[\/\\])build([\/\\]|$)/,
    /(^|[\/\\])\.next([\/\\]|$)/,
    /(^|[\/\\])context([\/\\]|$)/,
    /agent\.(md|json|yaml)$/,
    /\.context-gen\.json$/,
    /\.log$/
  ];

  const watcher = chokidar.watch(rootDir, {
    ignored: ignoredPatterns,
    ignoreInitial: true,
    persistent: true
  });

  let debounceTimer = null;
  const handleFileChange = (filePath) => {
    const filename = path.basename(filePath);
    if (filename.startsWith("agent.") || filename === ".context-gen.json" || filename === "mcp.md") return;

    const relativeFile = path.relative(rootDir, filePath);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      regenerate(relativeFile);
    }, 800);
  };

  watcher.on("add", handleFileChange);
  watcher.on("change", handleFileChange);
  watcher.on("unlink", handleFileChange);

  // 4. Print Beautiful Connection Summary
  console.log(`
╔════════════════════════════════════════════════════════╗
║   🚀 MCP Server & Background Watcher Active!           ║
╚════════════════════════════════════════════════════════╝

📍 Project:    ${rootDir}
🔌 Local URL:   http://localhost:${activePort}/mcp
${publicUrl ? `🌐 Public URL:  ${activeUrl}\n` : ""}🌐 Dashboard:   http://localhost:${activePort}/
🔐 API Key:     ${apiKey}
👀 Watch Mode:  Running in background (auto-syncing changes)

📋 Quick Connect (Cursor / Claude Desktop / Antigravity / VS Code):
─────────────────────────────────────────────────────────
{
  "mcpServers": {
    "context-gen": {
      "url": "${activeUrl}",
      "headers": {
        "X-API-Key": "${apiKey}"
      }
    }
  }
}
─────────────────────────────────────────────────────────

💡 Watching for file changes. Press Ctrl+C to stop both server & watcher.
`);

  // Handle clean exit
  const handleShutdown = () => {
    console.log(chalk.cyan("\n👋 Stopping MCP server and file watcher..."));
    try { watcher.close(); } catch {}
    try { server.close(); } catch {}
    process.exit(0);
  };

  process.on("SIGINT", handleShutdown);
  process.on("SIGTERM", handleShutdown);
}

const program = new Command();

program
  .name("context-gen-cli")
  .description("Scan any project folder and generate context/agent.md or context/agent.json model for LLMs")
  .version("1.3.3")
  .addHelpText("after", () => `\n${showUsageGuideText()}`)
  .argument("[path]", "Directory path of the project to scan", ".")
  .option("-d, --default", "Run in zero-config default mode: generate context, boot MCP server, and keep watch running", false)
  .option("--public", "Expose MCP server via public tunnel (used with -d or serve)", false)
  .option("--tunnel <service>", "Tunnel provider to use ('localhost.run', 'serveo.net', 'ngrok', 'cloudflare')", "localhost.run")
  .option("-f, --format <type>", "Output format (md, json, yaml, or all)", "all")
  .option("-o, --output <path>", "Custom output folder or file path")
  .option("-i, --interactive", "Run in interactive mode with user prompts", false)
  .option("-w, --watch", "Watch directory and continuously regenerate context on file changes", false)
  .option("-m, --mcp", "Start interactive MCP server with automatic triple context generation", false)
  .option("-p, --project <path>", "Directory path of the project to scan")
  .action(async (targetPath, options) => {
    let projectDir = options.project || targetPath || ".";
    if (projectDir === "update" || projectDir === "generate") {
      projectDir = ".";
    }
    const rootDir = path.resolve(projectDir);

    try {
      const stats = await fs.stat(rootDir);
      if (!stats.isDirectory()) {
        console.error(chalk.red(`\n❌ Error: Target path is not a directory: ${chalk.bold(rootDir)}\n`));
        process.exit(1);
      }
    } catch {
      console.error(chalk.red(`\n❌ Error: Directory not found: ${chalk.bold(rootDir)}\n`));
      process.exit(1);
    }

    if (options.default) {
      await startDefaultAllInOne(rootDir, options);
      return;
    }

    if (options.mcp) {
      await startMcpInteractive(rootDir);
      return;
    }

    // 1. Check or initialize configuration
    let config = loadConfig(rootDir, options.output);
    const candidateConfigPaths = [
      path.join(rootDir, options.output || config.outputDir || "context", CONFIG_FILE_NAME),
      path.join(rootDir, CONFIG_FILE_NAME)
    ];

    let isFirstRun = true;
    for (const cPath of candidateConfigPaths) {
      try {
        await fs.access(cPath);
        isFirstRun = false;
        break;
      } catch {}
    }

    if (isFirstRun || options.interactive) {
      config = await runInitWizard(rootDir);
    }

    const outputDir = options.output || config.outputDir || "context";
    const outDirPath = path.resolve(rootDir, outputDir);

    /**
     * Executes the scanning and generation pipeline with animated progress bars and metrics cards.
     */
    async function executeContextGeneration(watchChangedFile = false) {
      try {
        if (!watchChangedFile) {
          printMainBanner();
        } else {
          console.log(chalk.cyan(`\n🔄 Change detected: ${watchChangedFile}. Regenerating context...`));
        }

        let scanData = null;
        let metadata = null;
        let graph = null;
        const generatedFiles = [];
        const activeFormats = options.format
          ? (options.format.toLowerCase() === "all" ? ["md", "json", "yaml"] : [options.format.toLowerCase()])
          : (Array.isArray(config.outputFormats) && config.outputFormats.length > 0
              ? config.outputFormats.map((f) => f.toLowerCase())
              : ["md", "json", "yaml"]);

        await runAnimatedPipeline([
          {
            label: "Scanning workspace & filtering security ignores...",
            weight: 25,
            run: async () => {
              scanData = await scanProject(rootDir, 3, [], config);
              await new Promise((r) => setTimeout(r, 120));
            }
          },
          {
            label: "Extracting metadata & tech stack signals...",
            weight: 20,
            run: async () => {
              metadata = await extractMetadata(rootDir, scanData.files);
              await new Promise((r) => setTimeout(r, 100));
            }
          },
          {
            label: "Constructing AST module dependency graph...",
            weight: 25,
            run: async () => {
              graph = await buildDependencyGraph(scanData.files, rootDir, metadata.pkgJson);
              await new Promise((r) => setTimeout(r, 120));
            }
          },
          {
            label: `Generating context artifacts (${activeFormats.join(", ")})...`,
            weight: 30,
            run: async () => {
              await fs.mkdir(outDirPath, { recursive: true });

              if (activeFormats.includes("md") || activeFormats.includes("all")) {
                const mdContent = generateAgentMd({ tree: scanData.tree, metadata, graph });
                const mdPath = path.join(outDirPath, "agent.md");
                await fs.writeFile(mdPath, mdContent, "utf-8");
                const mdTokens = Math.round(mdContent.length / 4);
                generatedFiles.push({ name: "agent.md", chars: mdContent.length, extra: `~${mdTokens.toLocaleString()} tokens, Markdown` });
              }

              if (activeFormats.includes("json") || activeFormats.includes("all")) {
                const jsonObject = generateAgentJson({ tree: scanData.tree, metadata, graph, projectPath: rootDir });
                const jsonContent = JSON.stringify(jsonObject, null, 2);
                const jsonPath = path.join(outDirPath, "agent.json");
                await fs.writeFile(jsonPath, jsonContent, "utf-8");
                generatedFiles.push({ name: "agent.json", chars: jsonContent.length, extra: "structured JSON" });
              }

              if (activeFormats.includes("yaml") || activeFormats.includes("all")) {
                const yamlContent = generateAgentYaml({ tree: scanData.tree, metadata, graph, projectPath: rootDir });
                const yamlPath = path.join(outDirPath, "agent.yaml");
                await fs.writeFile(yamlPath, yamlContent, "utf-8");
                generatedFiles.push({ name: "agent.yaml", chars: yamlContent.length, extra: "clean YAML" });
              }

              // Always generate skill.md
              const skillMdContent = generateSkillMd(metadata.primaryFramework);
              const skillPath = path.join(outDirPath, "skill.md");
              await fs.writeFile(skillPath, skillMdContent, "utf-8");
              generatedFiles.push({ name: "skill.md", chars: skillMdContent.length, extra: `Framework: ${metadata.primaryFramework || "General"}` });

              // Copy to public/skills.md for web scraping
              const publicDirPath = path.join(rootDir, "public");
              await fs.mkdir(publicDirPath, { recursive: true });
              await fs.writeFile(path.join(publicDirPath, "skills.md"), skillMdContent, "utf-8");
              generatedFiles.push({ name: "public/skills.md", chars: skillMdContent.length, extra: "For Web LLM Scraping" });

              await new Promise((r) => setTimeout(r, 100));
            }
          }
        ]);

        const secCount = scanData.sensitiveFiles ? scanData.sensitiveFiles.length : 0;

        // Step 5: Summary Card
        if (!watchChangedFile) {
          printSummaryCard({
            filesCount: scanData.files.length,
            secCount,
            nodesCount: graph.nodes.length,
            edgesCount: graph.edges.length,
            techStack: metadata.stack || [],
            outputDir,
            generatedFiles
          });

          console.log(chalk.bold("💡 Pro-Tips & Next Steps:"));
          console.log(chalk.gray("  • ") + chalk.bold.cyan("ctx -m") + chalk.gray(" (or ") + chalk.cyan("ctx --mcp") + chalk.gray(")          → Start interactive live MCP server for AI clients"));
          console.log(chalk.gray("  • ") + chalk.bold.cyan("ctx -w") + chalk.gray(" (or ") + chalk.cyan("ctx --watch") + chalk.gray(")        → Keep context fresh (auto-syncs on file save)"));
          console.log(chalk.gray("  • ") + chalk.bold.cyan("ctx -d") + chalk.gray(" (or ") + chalk.cyan("ctx --default") + chalk.gray(")      → ⚡ All-in-one (generate + live MCP + watcher)"));
          console.log(chalk.gray("  • ") + chalk.bold.cyan("ctx update -f json") + chalk.gray(" (or ") + chalk.cyan("-f yaml / md") + chalk.gray(") → Quick format change or regenerate"));
          console.log(chalk.gray("  • ") + chalk.bold.cyan("ctx -o <dir>") + chalk.gray(" (or ") + chalk.cyan("-p <path>") + chalk.gray(")          → Custom output folder or project target"));
          console.log(chalk.gray("  • ") + chalk.gray("Config saved in: ") + chalk.yellow(`${outputDir}/.context-gen.json`));
          console.log("");
        }
      } catch (err) {
        console.error(chalk.red("\n❌ Error generating context:"), err.message || err);
        if (!options.watch) {
          process.exit(1);
        }
      }
    }

    await executeContextGeneration(false);

    // Watch mode
    if (options.watch) {
      console.log(chalk.yellow("👀 Watching for changes in project... (Press Ctrl+C to stop)\n"));

      let debounceTimer = null;
      const ignoredPatterns = [
        /(^|[\/\\])node_modules([\/\\]|$)/,
        /(^|[\/\\])\.git([\/\\]|$)/,
        /(^|[\/\\])dist([\/\\]|$)/,
        /(^|[\/\\])build([\/\\]|$)/,
        /(^|[\/\\])\.next([\/\\]|$)/,
        /(^|[\/\\])context([\/\\]|$)/,
        /agent\.(md|json|yaml)$/,
        /\.context-gen\.json$/,
        /\.log$/
      ];

      const watcher = chokidar.watch(rootDir, {
        ignored: ignoredPatterns,
        ignoreInitial: true,
        persistent: true
      });

      const handleFileChange = (filePath) => {
        const filename = path.basename(filePath);
        if (filename.startsWith("agent.") || filename === ".context-gen.json") return;

        const relativeFile = path.relative(rootDir, filePath);
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          executeContextGeneration(relativeFile);
        }, 800);
      };

      watcher.on("add", handleFileChange);
      watcher.on("change", handleFileChange);
      watcher.on("unlink", handleFileChange);

      process.on("SIGINT", () => {
        console.log(chalk.cyan("\n👋 Stopping watch mode..."));
        watcher.close();
        process.exit(0);
      });
    }
  });

program
  .command("init")
  .description("Run the interactive configuration and security setup wizard")
  .argument("[path]", "Directory path of the project", ".")
  .action(async (targetPath) => {
    const { runInitWizard } = await import("./init.js");
    await runInitWizard(targetPath);
  });

program
  .command("generate")
  .alias("update")
  .description("Generate or update project context files (agent.md, agent.json, agent.yaml)")
  .argument("[path]", "Directory path of the project to scan", ".")
  .option("-f, --format <type>", "Output format (md, json, yaml, or all)", "all")
  .option("-o, --output <path>", "Custom output folder or file path")
  .option("-p, --project <path>", "Directory path of the project to scan")
  .action(async (targetPath, options) => {
    const projectDir = options.project || (targetPath && targetPath !== "update" && targetPath !== "generate" ? targetPath : ".");
    const rootDir = path.resolve(projectDir);
    const config = loadConfig(rootDir);
    const outputDir = options.output || config.outputDir || "context";
    const outDirPath = path.resolve(rootDir, outputDir);
    await fs.mkdir(outDirPath, { recursive: true });

    let scanData = null;
    let metadata = null;
    let graph = null;
    const generatedFiles = [];
    const activeFormats = options.format
      ? (options.format.toLowerCase() === "all" ? ["md", "json", "yaml"] : [options.format.toLowerCase()])
      : (Array.isArray(config.outputFormats) && config.outputFormats.length > 0
          ? config.outputFormats.map((f) => f.toLowerCase())
          : ["md", "json", "yaml"]);

    await runAnimatedPipeline([
      {
        label: "Scanning project files & security rules...",
        weight: 30,
        run: async () => {
          scanData = await scanProject(rootDir, 3, [], config);
          await new Promise((r) => setTimeout(r, 100));
        }
      },
      {
        label: "Analyzing dependencies & module relationships...",
        weight: 35,
        run: async () => {
          metadata = await extractMetadata(rootDir, scanData.files);
          graph = await buildDependencyGraph(scanData.files, rootDir, metadata.pkgJson);
          await new Promise((r) => setTimeout(r, 100));
        }
      },
      {
        label: `Updating context files in ${outputDir}/...`,
        weight: 35,
        run: async () => {
          if (activeFormats.includes("md") || activeFormats.includes("all")) {
            const mdContent = generateAgentMd({ tree: scanData.tree, metadata, graph });
            await fs.writeFile(path.join(outDirPath, "agent.md"), mdContent, "utf-8");
            const mdTokens = Math.round(mdContent.length / 4);
            generatedFiles.push({ name: "agent.md", chars: mdContent.length, extra: `~${mdTokens.toLocaleString()} tokens, Markdown` });
          }
          if (activeFormats.includes("json") || activeFormats.includes("all")) {
            const jsonObject = generateAgentJson({ tree: scanData.tree, metadata, graph, projectPath: rootDir });
            const jsonContent = JSON.stringify(jsonObject, null, 2);
            await fs.writeFile(path.join(outDirPath, "agent.json"), jsonContent, "utf-8");
            generatedFiles.push({ name: "agent.json", chars: jsonContent.length, extra: "structured JSON" });
          }
          if (activeFormats.includes("yaml") || activeFormats.includes("all")) {
            const yamlContent = generateAgentYaml({ tree: scanData.tree, metadata, graph, projectPath: rootDir });
            await fs.writeFile(path.join(outDirPath, "agent.yaml"), yamlContent, "utf-8");
            generatedFiles.push({ name: "agent.yaml", chars: yamlContent.length, extra: "clean YAML" });
          }

          // Always generate skill.md
          const skillMdContent = generateSkillMd(metadata.primaryFramework);
          const skillPath = path.join(outDirPath, "skill.md");
          await fs.writeFile(skillPath, skillMdContent, "utf-8");
          generatedFiles.push({ name: "skill.md", chars: skillMdContent.length, extra: `Framework: ${metadata.primaryFramework || "General"}` });

          // Copy to public/skills.md for web scraping
          const publicDirPath = path.join(rootDir, "public");
          await fs.mkdir(publicDirPath, { recursive: true });
          await fs.writeFile(path.join(publicDirPath, "skills.md"), skillMdContent, "utf-8");
          generatedFiles.push({ name: "public/skills.md", chars: skillMdContent.length, extra: "For Web LLM Scraping" });

          await new Promise((r) => setTimeout(r, 100));
        }
      }
    ]);

    printSummaryCard({
      filesCount: scanData.files.length,
      secCount: scanData.sensitiveFiles ? scanData.sensitiveFiles.length : 0,
      nodesCount: graph.nodes.length,
      edgesCount: graph.edges.length,
      techStack: metadata.stack || [],
      outputDir,
      generatedFiles
    });
  });

program
  .command("serve")
  .description("Start the context-gen-cli Model Context Protocol (MCP) server")
  .option("--port <number>", "Port to bind MCP server to", "3456")
  .option("--public", "Expose server publicly via secure tunnel", false)
  .option("-p, --project <path>", "Directory path of the project to analyze", ".")
  .option("--key <string>", "Custom API key to use instead of auto-generating")
  .action(async (options) => {
    let tunnelService = "local only";
    if (options.public) {
      tunnelService = await select({
        message: "Which service would you like to use for the public URL?",
        choices: [
          { name: "1. localhost.run (Free, native SSH, random URL, NO token required, highly reliable)", value: "localhost.run" },
          { name: "2. serveo.net (Free, native SSH, NO token required)", value: "serveo.net" },
          { name: "3. ngrok (Official, fast, requires free auth token)", value: "ngrok" },
          { name: "4. cloudflare (Cloudflare Quick Tunnel via cloudflared)", value: "cloudflare" },
          { name: "5. local only (Skip public URL, just run locally)", value: "local only" }
        ]
      });
    }

    const { startMcpServer } = await import("./mcp/server.js");
    await startMcpServer({
      port: options.port,
      isPublic: options.public,
      tunnelService,
      projectPath: options.project,
      key: options.key
    });
  });

program
  .command("distill")
  .description("Distill minimal high-signal context for a prompt using Knowledge Graph + Entropy reduction")
  .argument("<prompt>", "Task or feature description to distill context for")
  .option("-b, --budget <tokens>", "Maximum token budget for distilled references", "250")
  .option("-p, --project <path>", "Directory path of the project", ".")
  .action(async (promptText, options) => {
    const { distillQuery } = await import("./distill.js");
    const rootDir = path.resolve(options.project || ".");
    const res = await distillQuery(rootDir, promptText, Number(options.budget) || 250);
    console.log("");
    printDistillCard(res);
    console.log("");
  });

program.parse(process.argv);
