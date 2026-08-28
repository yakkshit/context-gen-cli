import { dump } from "js-yaml";
import path from "node:path";

/**
 * Generates the full agent.md markdown document from scan results, extracted metadata, and dependency graph.
 * @param {object} params - Input data for markdown generation.
 * @param {string} params.tree - ASCII Directory tree view.
 * @param {object} params.metadata - Metadata extracted by extractor.js.
 * @param {object} params.graph - Graph object built by graph.js.
 * @returns {string} Formatted agent.md markdown string.
 */
export function generateAgentMd({ tree, metadata, graph }) {
  const sections = [];

  // 1. # Project Context
  sections.push("# Project Context\n");

  // 2. ## Overview
  sections.push("## Overview\n");
  sections.push(metadata.overview || "No overview available.");
  sections.push("\n");

  // 3. ## Tech Stack
  sections.push("## Tech Stack\n");
  if (metadata.stack && metadata.stack.length > 0) {
    sections.push(metadata.stack.map((item) => `- ${item}`).join("\n"));
  } else {
    sections.push("- General / Unknown");
  }
  sections.push("\n");

  // 4. ## Directory Structure
  sections.push("## Directory Structure\n");
  sections.push("```text\n" + (tree || ".") + "\n```\n");

  // 5. ## Key Files
  sections.push("## Key Files\n");
  if (metadata.keyFiles && metadata.keyFiles.length > 0) {
    const keyFileLines = metadata.keyFiles.map(
      (kf) => `- **\`${kf.file}\`**: ${kf.purpose}`
    );
    sections.push(keyFileLines.join("\n"));
  } else {
    sections.push("- No key files detected.");
  }
  sections.push("\n");

  // 6. ## Dependencies
  sections.push("## Dependencies\n");
  const prodDeps = metadata.deps?.production || [];
  const devDeps = metadata.deps?.development || [];

  if (prodDeps.length > 0) {
    sections.push("### Production Dependencies");
    sections.push(prodDeps.slice(0, 30).map((d) => `- \`${d}\``).join("\n"));
  }
  if (devDeps.length > 0) {
    sections.push("### Development Dependencies");
    sections.push(devDeps.slice(0, 20).map((d) => `- \`${d}\``).join("\n"));
  }
  if (prodDeps.length === 0 && devDeps.length === 0) {
    sections.push("- No external dependencies listed.");
  }
  sections.push("\n");

  // 7. ## Entry Points
  sections.push("## Entry Points\n");
  if (metadata.entryPoints && metadata.entryPoints.length > 0) {
    sections.push(
      metadata.entryPoints.map((ep) => `- **${ep.name}**: \`${ep.path}\``).join("\n")
    );
  } else {
    sections.push("- No explicit entry point declared.");
  }
  sections.push("\n");

  // 8. ## Dependency Graph
  if (graph) {
    sections.push("## Dependency Graph\n");

    // Entry points
    sections.push("### Entry Points");
    if (graph.entryPoints && graph.entryPoints.length > 0) {
      sections.push(
        graph.entryPoints.map((ep) => `- \`${ep}\` (main entry)`).join("\n")
      );
    } else {
      sections.push("- None detected");
    }
    sections.push("");

    // Core modules (files imported by multiple files or modules)
    const coreModules = (graph.nodes || []).filter(
      (n) => n.importedBy.length >= 2 || (n.importedBy.length > 0 && n.imports.length > 0)
    );
    sections.push("### Core Modules");
    if (coreModules.length > 0) {
      sections.push(
        coreModules
          .slice(0, 10)
          .map((cm) => `- \`${cm.file}\` (imported by ${cm.importedBy.length} file${cm.importedBy.length === 1 ? "" : "s"})`)
          .join("\n")
      );
    } else {
      sections.push("- Standalone / direct module structure");
    }
    sections.push("");

    // Utilities
    sections.push("### Utilities");
    if (graph.utilities && graph.utilities.length > 0) {
      sections.push(
        graph.utilities
          .slice(0, 10)
          .map((u) => `- \`${u}\` (shared helper)`)
          .join("\n")
      );
    } else {
      sections.push("- None detected");
    }
    sections.push("");

    // Key relationships (max 10 edges)
    sections.push("### Key Relationships");
    if (graph.edges && graph.edges.length > 0) {
      const topEdges = graph.edges.slice(0, 10);
      sections.push(
        topEdges
          .map((e) => `- \`${e.from}\` → \`${e.to}\``)
          .join("\n")
      );
    } else {
      sections.push("- No internal module connections found.");
    }
    sections.push("\n");
  }

  // 9. ## Recent Git Commits
  if (metadata.commits && metadata.commits.length > 0) {
    sections.push("## Recent Git Commits\n");
    sections.push(
      metadata.commits
        .map(
          (c) =>
            `- \`${c.hash}\`: ${c.message} (${c.relativeDate}${c.author ? ` by ${c.author}` : ""})`
        )
        .join("\n")
    );
    sections.push("\n");
  }

  // 10. ## Quick Notes for the LLM
  sections.push("## Quick Notes for the LLM\n");
  sections.push(
    "- **Execution Context**: Refer to the entry points above to understand application bootstrap.\n" +
    "- **Modularity**: Check the Dependency Graph before refactoring to maintain module coupling.\n" +
    "- **Dependencies**: Rely on the installed packages and runtimes listed under Tech Stack."
  );

  return sections.join("\n").trim() + "\n";
}

/**
 * Helper to convert dependency array or object into a clean dictionary.
 * @param {string[]|object} deps - Dependencies data.
 * @returns {Record<string, string>} Formatted dependency map.
 */
function normalizeDepsMap(deps) {
  if (!deps) return {};
  if (!Array.isArray(deps) && typeof deps === "object") {
    return { ...deps };
  }

  const result = {};
  for (const item of deps) {
    if (typeof item !== "string") continue;
    if (item.includes("@")) {
      const lastAt = item.lastIndexOf("@");
      if (lastAt > 0) {
        const name = item.slice(0, lastAt);
        const version = item.slice(lastAt + 1);
        result[name] = version;
        continue;
      }
    }
    const match = item.match(/^([a-zA-Z0-9_-]+)\s*(==|>=|<=|~=|>|<)?\s*(.*)$/);
    if (match) {
      const name = match[1];
      const version = (match[2] || "") + (match[3] || "");
      result[name] = version || "*";
    } else {
      result[item] = "*";
    }
  }
  return result;
}

/**
 * Strips markdown syntax (bold, headers, links, backticks) to produce clean plain text.
 * @param {string} text - Raw markdown text.
 * @returns {string} Clean plain text.
 */
function stripMarkdown(text) {
  if (!text) return "";
  return text
    // Replace bold/italics
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // Replace inline code
    .replace(/`([^`]+)`/g, "$1")
    // Replace links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove headers
    .replace(/^#+\s+/gm, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generates a clean, structured JSON model of the project context.
 * MCP-ready and programmatic-friendly.
 * @param {object} params - Input data or metadata object.
 * @param {string} [params.tree=""] - ASCII directory tree.
 * @param {object} params.metadata - Metadata extracted by extractor.js.
 * @param {object} params.graph - Graph object built by graph.js.
 * @param {string} [params.projectPath=""] - Absolute project root path.
 * @param {object} [fallbackGraph] - Secondary argument if called as generateAgentJson(metadata, graph).
 * @returns {object} Structured context JSON object.
 */
export function generateAgentJson(params, fallbackGraph) {
  // Support both generateAgentJson({ tree, metadata, graph, projectPath }) and generateAgentJson(metadata, graph)
  const metadata = params?.metadata || (params?.overview !== undefined ? params : {});
  const graph = params?.graph || fallbackGraph || {};
  const tree = params?.tree || metadata?.directoryStructure || "";
  const projectPath = params?.projectPath || metadata?.projectPath || process.cwd();

  const coreModules = (graph?.nodes || [])
    .filter((n) => n.importedBy.length >= 2 || (n.importedBy.length > 0 && n.imports.length > 0))
    .map((n) => n.file);

  const cleanKeyFiles = (metadata.keyFiles || []).map((kf) => ({
    path: kf.file || kf.path || "",
    description: kf.purpose || kf.description || ""
  }));

  const cleanCommits = (metadata.commits || []).map((c) => ({
    hash: c.hash || "",
    message: c.message || "",
    date: c.relativeDate || c.date || "",
    author: c.author || ""
  }));

  // Clean entry points: filter out CLI commands like "node src/index.js", "npm ...", or strings with spaces
  const rawEntryCandidates = [
    ...(metadata.entryPoints || []).map((ep) => ep.path || ep.name || ep),
    ...(graph.entryPoints || [])
  ];

  const cleanEntryPoints = Array.from(
    new Set(
      rawEntryCandidates
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(
          (item) =>
            item &&
            !item.includes(" ") &&
            !item.startsWith("node") &&
            !item.startsWith("npm") &&
            !item.startsWith("npx")
        )
    )
  );

  const prodDeps = metadata.pkgJson?.dependencies
    ? { ...metadata.pkgJson.dependencies }
    : normalizeDepsMap(metadata.deps?.production);

  const devDeps = metadata.pkgJson?.devDependencies
    ? { ...metadata.pkgJson.devDependencies }
    : normalizeDepsMap(metadata.deps?.development);

  // Clean overview without any markdown bold, headers, or backticks
  const cleanOverview = stripMarkdown(metadata.overview || "No overview available.");

  return {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    projectPath: path.resolve(projectPath),
    overview: cleanOverview,
    techStack: metadata.stack || [],
    directoryStructure: tree || "",
    keyFiles: cleanKeyFiles,
    dependencies: {
      production: prodDeps,
      development: devDeps
    },
    entryPoints: cleanEntryPoints,
    dependencyGraph: {
      nodes: graph?.nodes || [],
      edges: graph?.edges || [],
      coreModules,
      utilities: graph?.utilities || []
    },
    recentCommits: cleanCommits,
    quickNotes: [
      "Execution Context: Refer to the entry points to understand application bootstrap.",
      "Modularity: Check the Dependency Graph before refactoring to maintain module coupling.",
      "Dependencies: Rely on the installed packages and runtimes listed under Tech Stack."
    ]
  };
}


/**
 * Generates a clean, structured YAML model of the project context.
 * Human-readable and matching the exact agent.json structure.
 * @param {object} params - Input data or metadata object.
 * @param {object} [fallbackGraph] - Secondary argument if called as generateAgentYaml(metadata, graph).
 * @returns {string} Clean YAML string.
 */
export function generateAgentYaml(params, fallbackGraph) {
  const jsonObject = generateAgentJson(params, fallbackGraph);
  return dump(jsonObject, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    quotingType: "\"",
    forceQuotes: false,
  });
}
