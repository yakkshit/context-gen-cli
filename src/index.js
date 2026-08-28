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
import { loadConfig, getDefaultConfig, saveConfig, CONFIG_FILE_NAME } from "./config.js";
import { runInitWizard } from "./init.js";

export function showUsageGuideText() {
  return `=======================================================
✨ context-gen-cli — AI Project Context Generator
=======================================================

📖 HOW TO USE:

1️⃣  ⚡ All-In-One Default Mode (Generate + Live MCP Server + Auto-sync Watcher)
    $ context-gen-cli -d

2️⃣  Generate All Context Formats (agent.md, agent.json, agent.yaml)
    $ context-gen-cli [path]

3️⃣  Run Setup Wizard (Configure folders, security, output location)
    $ context-gen-cli init

4️⃣  Keep Context Fresh (Auto-updates on file save)
    $ context-gen-cli --watch

5️⃣  Start MCP Server (Interactive 1-step setup + live context)
    $ context-gen-cli --mcp

6️⃣  Start Public MCP Server (Shareable temporary URL)
    $ context-gen-cli serve --public

💡 TIPS:
- Output folder defaults to context/ in project root.
- Security scanner automatically strips .env, keys, and credentials.
- Check the generated mcp.md file for AI client setup instructions.
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

  const configPath = path.join(rootDir, CONFIG_FILE_NAME);
  let config = loadConfig(rootDir);
  try {
    await fs.access(configPath);
  } catch {
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

      await fs.writeFile(path.join(outDirPath, "agent.md"), mdContent, "utf-8");
      await fs.writeFile(path.join(outDirPath, "agent.json"), jsonContent, "utf-8");
      await fs.writeFile(path.join(outDirPath, "agent.yaml"), yamlContent, "utf-8");

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
  .version("1.2.2")
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
    const configPath = path.join(rootDir, CONFIG_FILE_NAME);
    let config = loadConfig(rootDir);
    let isFirstRun = false;

    try {
      await fs.access(configPath);
    } catch {
      isFirstRun = true;
    }

    if (isFirstRun || options.interactive) {
      config = await runInitWizard(rootDir);
    }

    const outputDir = options.output || config.outputDir || "context";
    const outDirPath = path.resolve(rootDir, outputDir);

    /**
     * Executes the scanning and generation pipeline with beautiful ora spinners.
     */
    async function executeContextGeneration(watchChangedFile = false) {
      try {
        if (!watchChangedFile) {
          console.log("");
          console.log(chalk.bold.hex("#6366f1")("🎨 context-gen-cli — AI Project Context Generator"));
          console.log("");
        } else {
          console.log(chalk.cyan(`\n🔄 Change detected: ${watchChangedFile}. Regenerating context...`));
        }

        // Step 1: Scan project files
        const scanSpinner = ora({ text: chalk.blue("Scanning project files..."), color: "cyan" }).start();
        const { files, tree, sensitiveFiles, securityReasons } = await scanProject(rootDir, 3, [], config);
        await new Promise((r) => setTimeout(r, 250));

        const secCount = sensitiveFiles ? sensitiveFiles.length : 0;
        scanSpinner.succeed(
          chalk.green(
            `✓ Found ${files.length} files ${secCount > 0 ? chalk.yellow(`(${secCount} excluded for security)`) : ""}`
          )
        );

        // Step 2: Build dependency graph
        const graphSpinner = ora({ text: chalk.blue("Analyzing dependencies & modules..."), color: "magenta" }).start();
        const metadata = await extractMetadata(rootDir, files);
        const graph = await buildDependencyGraph(files, rootDir, metadata.pkgJson);
        await new Promise((r) => setTimeout(r, 250));
        graphSpinner.succeed(chalk.green(`✓ Mapped ${graph.nodes.length} nodes and ${graph.edges.length} edges`));

        // Step 3: Tech stack detection
        const stackSpinner = ora({ text: chalk.blue("Detecting tech stack..."), color: "yellow" }).start();
        const stackList = metadata.stack && metadata.stack.length > 0 ? metadata.stack.join(", ") : "General Codebase";
        await new Promise((r) => setTimeout(r, 200));
        stackSpinner.succeed(chalk.green(`✓ Tech stack: ${chalk.bold(stackList)}`));

        // Step 4: Generate context files according to selected formats
        const genSpinner = ora({ text: chalk.blue("Generating context files..."), color: "cyan" }).start();
        await fs.mkdir(outDirPath, { recursive: true });

        const activeFormats = options.format
          ? [options.format.toLowerCase()]
          : (Array.isArray(config.outputFormats) && config.outputFormats.length > 0
              ? config.outputFormats.map((f) => f.toLowerCase())
              : ["md", "json"]);

        const generatedFiles = [];

        if (activeFormats.includes("md")) {
          const mdContent = generateAgentMd({ tree, metadata, graph });
          const mdPath = path.join(outDirPath, "agent.md");
          await fs.writeFile(mdPath, mdContent, "utf-8");
          const mdTokens = Math.round(mdContent.length / 4);
          generatedFiles.push({ name: "agent.md", chars: mdContent.length, extra: `~${mdTokens.toLocaleString()} tokens, Markdown` });
        }

        if (activeFormats.includes("json")) {
          const jsonObject = generateAgentJson({ tree, metadata, graph, projectPath: rootDir });
          const jsonContent = JSON.stringify(jsonObject, null, 2);
          const jsonPath = path.join(outDirPath, "agent.json");
          await fs.writeFile(jsonPath, jsonContent, "utf-8");
          generatedFiles.push({ name: "agent.json", chars: jsonContent.length, extra: "structured JSON" });
        }

        if (activeFormats.includes("yaml")) {
          const yamlContent = generateAgentYaml({ tree, metadata, graph, projectPath: rootDir });
          const yamlPath = path.join(outDirPath, "agent.yaml");
          await fs.writeFile(yamlPath, yamlContent, "utf-8");
          generatedFiles.push({ name: "agent.yaml", chars: yamlContent.length, extra: "clean YAML" });
        }

        await new Promise((r) => setTimeout(r, 200));
        genSpinner.succeed(chalk.green(`✓ Generated context files in ${chalk.bold(outputDir + "/")}:`));

        for (const gf of generatedFiles) {
          console.log(chalk.cyan(`  • ${gf.name} (${gf.chars.toLocaleString()} chars, ${gf.extra})`));
        }

        // Step 5: Summary Card
        if (!watchChangedFile) {
          console.log("");
          console.log(chalk.bold.green("╔════════════════════════════════════════════════════════╗"));
          console.log(chalk.bold.green("║   ✨ Context Generation Complete!                      ║"));
          console.log(chalk.bold.green("╚════════════════════════════════════════════════════════╝"));
          console.log("");
          console.log(chalk.bold("📁 Output destination:") + ` ${chalk.yellow(outputDir + "/")}`);
          if (secCount > 0) {
            console.log(chalk.bold.red("🔐 Security:") + chalk.yellow(` ${secCount} sensitive files protected and excluded.`));
          }
          console.log("");
          console.log(chalk.bold("💡 Next steps:"));
          console.log(chalk.gray("  • Run ") + chalk.cyan("context-gen-cli --mcp") + chalk.gray(" to start your live MCP server"));
          console.log(chalk.gray("  • Run ") + chalk.cyan("context-gen-cli --watch") + chalk.gray(" to auto-update on file changes"));
          console.log(chalk.gray("  • Edit ") + chalk.cyan(".context-gen.json") + chalk.gray(" to customize ignore & security rules"));
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

    const scanSpinner = ora({ text: chalk.blue("Scanning project files..."), color: "cyan" }).start();
    const { files, tree, sensitiveFiles } = await scanProject(rootDir, 3, [], config);
    scanSpinner.succeed(chalk.green(`✓ Found ${files.length} files`));

    const graphSpinner = ora({ text: chalk.blue("Analyzing dependencies & modules..."), color: "magenta" }).start();
    const metadata = await extractMetadata(rootDir, files);
    const graph = await buildDependencyGraph(files, rootDir, metadata.pkgJson);
    graphSpinner.succeed(chalk.green(`✓ Mapped ${graph.nodes.length} nodes and ${graph.edges.length} edges`));

    const genSpinner = ora({ text: chalk.blue("Generating context files..."), color: "cyan" }).start();
    const activeFormats = options.format
      ? [options.format.toLowerCase()]
      : (Array.isArray(config.outputFormats) && config.outputFormats.length > 0
          ? config.outputFormats.map((f) => f.toLowerCase())
          : ["md", "json", "yaml"]);

    if (activeFormats.includes("md") || activeFormats.includes("all")) {
      const mdContent = generateAgentMd({ tree, metadata, graph });
      await fs.writeFile(path.join(outDirPath, "agent.md"), mdContent, "utf-8");
    }
    if (activeFormats.includes("json") || activeFormats.includes("all")) {
      const jsonObject = generateAgentJson({ tree, metadata, graph, projectPath: rootDir });
      await fs.writeFile(path.join(outDirPath, "agent.json"), JSON.stringify(jsonObject, null, 2), "utf-8");
    }
    if (activeFormats.includes("yaml") || activeFormats.includes("all")) {
      const yamlContent = generateAgentYaml({ tree, metadata, graph, projectPath: rootDir });
      await fs.writeFile(path.join(outDirPath, "agent.yaml"), yamlContent, "utf-8");
    }
    genSpinner.succeed(chalk.green(`✓ Context updated in ${chalk.bold(outputDir + "/")}`));
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

program.parse(process.argv);
