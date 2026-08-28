import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import figlet from "figlet";
import { checkbox, input, confirm } from "@inquirer/prompts";
import { getDefaultConfig, saveConfig, loadConfig } from "./config.js";

/**
 * Displays the ASCII art welcome banner.
 */
function showBanner() {
  console.log(
    chalk.cyan(
      figlet.textSync("context-gen", {
        font: "Standard",
        horizontalLayout: "default",
        verticalLayout: "default",
      })
    )
  );
  console.log(
    chalk.bold.hex("#7c3aed")( 
      "╔═══════════════════════════════════════════════════════════════╗"
    )
  );
  console.log(
    chalk.bold.hex("#7c3aed")( 
      "║   🎨 Welcome to context-gen-cli Interactive Setup Wizard!    ║"
    )
  );
  console.log(
    chalk.bold.hex("#7c3aed")( 
      "╚═══════════════════════════════════════════════════════════════╝"
    )
  );
  console.log("");
}

/**
 * Scans directories and detects potential sensitive files and folders for wizard setup.
 * @param {string} projectPath
 */
async function discoverProjectItems(projectPath) {
  const resolved = path.resolve(projectPath || process.cwd());
  const discoveredFolders = new Set();
  const discoveredSensitiveFiles = new Set();

  const sensitivePatternMatches = [
    /^\.env(\..+)?$/i,
    /\.(pem|key|p12|pfx|pkcs12)$/i,
    /^id_rsa/i,
    /secrets?/i,
    /credentials?/i,
  ];

  async function walk(dir, depth = 0) {
    if (depth > 3) return;
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;

        if (entry.isDirectory()) {
          discoveredFolders.add(entry.name);
          if (sensitivePatternMatches.some((r) => r.test(entry.name))) {
            discoveredSensitiveFiles.add(path.relative(resolved, path.join(dir, entry.name)));
          }
          await walk(path.join(dir, entry.name), depth + 1);
        } else if (entry.isFile()) {
          if (sensitivePatternMatches.some((r) => r.test(entry.name))) {
            discoveredSensitiveFiles.add(path.relative(resolved, path.join(dir, entry.name)));
          }
        }
      }
    } catch {
      // Ignore unreadable dirs
    }
  }

  await walk(resolved);
  return {
    folders: Array.from(discoveredFolders),
    sensitiveFiles: Array.from(discoveredSensitiveFiles),
  };
}

/**
 * Runs the interactive initial setup wizard.
 * @param {string} projectPath
 * @returns {Promise<object>} The generated configuration.
 */
export async function runInitWizard(projectPath = process.cwd()) {
  const resolvedPath = path.resolve(projectPath);
  showBanner();

  const spinner = ora({
    text: chalk.blue("🔍 Scanning project workspace..."),
    color: "cyan",
  }).start();

  const discovered = await discoverProjectItems(resolvedPath);
  await new Promise((r) => setTimeout(r, 600));

  spinner.succeed(
    chalk.green(
      `✓ Workspace analyzed! Found ${discovered.folders.length} directories and ${discovered.sensitiveFiles.length} sensitive patterns.`
    )
  );
  console.log("");

  const defaultConfig = getDefaultConfig();

  // 1. Output directory selection
  console.log(chalk.bold.cyan("📂 1. Output Location & Formats"));
  const outputDirAnswer = await input({
    message: "Where should context files be saved (relative to project root)?",
    default: "context",
  });
  const outputDir = outputDirAnswer.trim() || "context";
  console.log(chalk.green(`  ↳ Context files will be generated in: ${chalk.bold(outputDir + "/")}\n`));

  const selectedFormats = await checkbox({
    message: "Which context formats would you like to generate?",
    choices: [
      { name: "Markdown (agent.md) — Recommended for LLM prompts & documentation", value: "md", checked: true },
      { name: "JSON (agent.json) — Machine-readable & MCP protocol ready", value: "json", checked: true },
      { name: "YAML (agent.yaml) — Clean structured architecture format", value: "yaml", checked: false },
    ],
  });
  const finalFormats = selectedFormats.length > 0 ? selectedFormats : ["md", "json"];
  console.log(chalk.green(`  ↳ Formats enabled: ${finalFormats.join(", ")}\n`));

  // 2. Folder Ignores
  const defaultIgnoreChoices = [
    { name: "node_modules (dependencies)", value: "node_modules", checked: true },
    { name: ".git (version control)", value: ".git", checked: true },
    { name: "dist/ / build/ (compiled output)", value: "dist", checked: true },
    { name: "build/ (build artifacts)", value: "build", checked: true },
    { name: "coverage/ (test coverage)", value: "coverage", checked: true },
    { name: "__pycache__/ (python cache)", value: "__pycache__", checked: true },
    { name: ".venv/ (python virtual environment)", value: ".venv", checked: true },
  ];

  for (const folder of discovered.folders) {
    if (
      !["node_modules", ".git", "dist", "build", "coverage", "__pycache__", ".venv"].includes(folder) &&
      /^(temp|tmp|out|\.next|\.nuxt|\.turbo|\.cache)$/i.test(folder)
    ) {
      defaultIgnoreChoices.push({
        name: `${folder}/ (discovered temp folder)`,
        value: folder,
        checked: true,
      });
    }
  }

  console.log(chalk.bold.yellow("📁 2. Which folders should be IGNORED from context?"));
  const selectedIgnores = await checkbox({
    message: "Select folders to ignore (Press <space> to toggle, <enter> to confirm):",
    choices: defaultIgnoreChoices,
  });

  const addCustomIgnore = await confirm({
    message: "Would you like to add custom ignore patterns?",
    default: false,
  });

  let customIgnorePatterns = [];
  if (addCustomIgnore) {
    const customInput = await input({
      message: "Enter custom ignore patterns (comma-separated, e.g. logs/, *.tmp):",
    });
    if (customInput.trim()) {
      customIgnorePatterns = customInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  const finalIgnorePatterns = Array.from(
    new Set([...selectedIgnores, ...customIgnorePatterns, "node_modules", ".git"])
  );

  console.log("");

  // 3. Security Setup
  console.log(chalk.bold.red("🔐 3. SECURITY SETUP — Files that should NEVER be shared with LLMs"));
  if (discovered.sensitiveFiles.length > 0) {
    console.log(chalk.yellow("⚠️  Auto-detected sensitive files in your workspace:"));
    for (const file of discovered.sensitiveFiles) {
      console.log(chalk.red(`  • ${file} (contains credentials/keys)`));
    }
    console.log("");
  }

  const defaultSecurityChoices = [
    { name: "🛡️  Default: Auto-ignore all rules from .gitignore, .npmignore, any *ignore files, and .env*", value: "default-ignore-files", checked: true },
    { name: ".env, .env.* (Environment secrets & tokens)", value: ".env*", checked: true },
    { name: "*.pem, *.key, *.p12 (Private keys & certificates)", value: "*.key", checked: true },
    { name: "id_rsa*, id_ed25519* (SSH private keys)", value: "id_rsa*", checked: true },
    { name: "secrets/, credentials/ (Secret folders)", value: "secrets/", checked: true },
    { name: "**/config/secrets.* (Config secrets)", value: "**/config/secrets.*", checked: true },
  ];

  const selectedSecurity = await checkbox({
    message: "Select security protection patterns to enforce:",
    choices: defaultSecurityChoices,
  });

  const finalSecurityPatterns = Array.from(
    new Set([
      ...defaultConfig.securityPatterns,
      ...selectedSecurity.filter((s) => s !== "default-ignore-files"),
      ...discovered.sensitiveFiles,
    ])
  );

  console.log("");

  // 4. Save Configuration
  const saveSpinner = ora({
    text: chalk.blue("💾 Saving configuration to .context-gen.json..."),
    color: "magenta",
  }).start();

  const newConfig = {
    version: "1.0.0",
    outputDir: outputDir,
    outputFormats: finalFormats,
    maxTokens: 4000,
    ignorePatterns: finalIgnorePatterns,
    securityPatterns: finalSecurityPatterns,
    securityKeywords: defaultConfig.securityKeywords,
    excludeFromContext: defaultConfig.excludeFromContext,
  };

  const savedFilePath = saveConfig(resolvedPath, newConfig);
  await new Promise((r) => setTimeout(r, 500));

  saveSpinner.succeed(chalk.green(`✓ Configuration saved to ${chalk.bold(path.basename(savedFilePath))}!`));
  console.log("");

  console.log(
    chalk.bold.green("🎉 Setup complete! Run ") +
      chalk.bold.cyan("context-gen-cli") +
      chalk.bold.green(" to generate your context files in ") +
      chalk.bold.yellow(outputDir + "/")
  );
  console.log("");

  return newConfig;
}