import fs from "node:fs/promises";
import path from "node:path";
import ignore from "ignore";
import { loadConfig } from "./config.js";
import { scanForSensitiveFiles } from "./security.js";

const DEFAULT_IGNORES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  "__pycache__",
  ".venv",
  "*.log",
  ".DS_Store",
  "agent.md",
  "agent.json",
  "agent.yaml",
  "mcp.md",
  ".context-gen.json",
  ".env",
  ".env.*",
  "*.pem",
  "*.key",
  "*.cert",
  "secrets",
  "secrets/**"
];

async function createIgnoreFilter(rootPath, customIgnores = [], config = null) {
  const ig = ignore();
  ig.add(DEFAULT_IGNORES);

  if (config) {
    if (Array.isArray(config.ignorePatterns)) ig.add(config.ignorePatterns);
    if (Array.isArray(config.securityPatterns)) ig.add(config.securityPatterns);
    if (Array.isArray(config.excludeFromContext)) ig.add(config.excludeFromContext);
    if (config.outputDir) {
      ig.add([config.outputDir, `${config.outputDir}/**`]);
    }
  }

  // Automatically parse and apply rules from any standard ignore file in the project
  const standardIgnoreFiles = [
    ".gitignore",
    ".npmignore",
    ".dockerignore",
    ".contextignore",
    ".ignore",
    ".eslintignore",
    ".prettierignore"
  ];

  for (const ignoreFileName of standardIgnoreFiles) {
    try {
      const filePath = path.join(rootPath, ignoreFileName);
      const content = await fs.readFile(filePath, "utf-8");
      ig.add(content);
    } catch {}
  }

  if (customIgnores && customIgnores.length > 0) {
    for (const rule of customIgnores) {
      if (rule.toLowerCase() === ".gitignore" || rule.toLowerCase() === ".npmignore") {
        try {
          const content = await fs.readFile(path.join(rootPath, rule), "utf-8");
          ig.add(content);
        } catch {}
      } else {
        ig.add(rule);
      }
    }
  }

  return ig;
}

function formatTree(node, prefix = "", isLast = true) {
  if (!node) return "";
  let result = "";
  if (node.name) {
    const connector = isLast ? "└── " : "├── ";
    result += `${prefix}${connector}${node.name}${node.isDirectory ? "/" : ""}\n`;
  }
  if (node.children && node.children.length > 0) {
    const childPrefix = node.name ? prefix + (isLast ? "    " : "│   ") : "";
    node.children.forEach((child, index) => {
      const childIsLast = index === node.children.length - 1;
      result += formatTree(child, childPrefix, childIsLast);
    });
  }
  return result;
}

export async function scanProject(rootPath, maxTreeDepth = 3, customIgnores = [], passedConfig = null) {
  const resolvedRoot = path.resolve(rootPath);
  const config = passedConfig || loadConfig(resolvedRoot);
  const ig = await createIgnoreFilter(resolvedRoot, customIgnores, config);
  const rawFiles = [];

  async function walk(currentDir, relativeDir = "", depth = 1) {
    let entries = [];
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return [];
    }

    entries.sort((a, b) => {
      if (a.isDirectory() === b.isDirectory()) {
        return a.name.localeCompare(b.name);
      }
      return a.isDirectory() ? -1 : 1;
    });

    const children = [];
    for (const entry of entries) {
      const entryRelativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      const testPath = entry.isDirectory() ? `${entryRelativePath}/` : entryRelativePath;

      if (ig.ignores(testPath) || ig.ignores(entry.name)) {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        const childNode = {
          name: entry.name,
          isDirectory: true,
          children: []
        };
        const subChildren = await walk(fullPath, entryRelativePath, depth + 1);
        if (depth < maxTreeDepth) {
          childNode.children = subChildren;
        } else if (subChildren.length > 0) {
          childNode.children = [{ name: "...", isDirectory: false, children: [] }];
        }
        children.push(childNode);
      } else if (entry.isFile()) {
        rawFiles.push(entryRelativePath);
        children.push({
          name: entry.name,
          isDirectory: false,
          children: []
        });
      }
    }
    return children;
  }

  const rootChildren = await walk(resolvedRoot);
  const rootNode = {
    name: path.basename(resolvedRoot),
    isDirectory: true,
    children: rootChildren
  };

  const tree = formatTree(rootNode).trim();

  // Run security scan to filter out any sensitive files or embedded credentials
  const securityResult = await scanForSensitiveFiles(rawFiles, resolvedRoot, config);
  const files = securityResult.safeFiles;

  return {
    files,
    tree,
    sensitiveFiles: securityResult.sensitiveFiles,
    securityReasons: securityResult.reasons
  };
}