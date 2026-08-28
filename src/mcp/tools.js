import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { scanProject } from "../scanner.js";
import { extractMetadata } from "../extractor.js";
import { buildDependencyGraph } from "../graph.js";
import { generateAgentMd, generateAgentJson } from "../generator.js";

/**
 * List of sensitive filenames or patterns that must NEVER be served to any LLM.
 */
const FORBIDDEN_FILE_PATTERNS = [
  /^\.env/i,
  /\.context-gen-key$/i,
  /\.pem$/i,
  /\.key$/i,
  /\.cert$/i,
  /(^|[/\\])secrets([/\\]|$)/i,
  /(^|[/\\])\.git([/\\]|$)/i
];

/**
 * Validates that a file target is safe to read.
 * @param {string} projectRoot - Base project directory.
 * @param {string} relativeFilePath - Requested relative file path.
 * @returns {string} Resolved safe file path.
 * @throws {Error} If path traversal or security violation detected.
 */
function validateSafeFilePath(projectRoot, relativeFilePath) {
  const resolvedRoot = path.resolve(projectRoot);
  const resolvedFile = path.resolve(resolvedRoot, relativeFilePath);

  if (!resolvedFile.startsWith(resolvedRoot)) {
    throw new Error("Access denied: Path traversal outside project boundary is forbidden.");
  }

  for (const pattern of FORBIDDEN_FILE_PATTERNS) {
    if (pattern.test(relativeFilePath) || pattern.test(path.basename(resolvedFile))) {
      throw new Error(`Access denied: File '${relativeFilePath}' is protected for security.`);
    }
  }

  return resolvedFile;
}

/**
 * Registers all context-gen tools with the given McpServer instance.
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} mcpServer - MCP server instance.
 * @param {string} defaultProjectPath - Default project path configured at server start.
 */
export function registerMcpTools(mcpServer, defaultProjectPath) {
  const baseDefaultPath = path.resolve(defaultProjectPath || process.cwd());

  // 1. generate_context tool
  mcpServer.tool(
    "generate_context",
    "Scan a project codebase and generate full architecture & dependency context in Markdown or JSON format.",
    {
      projectPath: z
        .string()
        .optional()
        .describe("Directory path of the project to analyze (defaults to server project root)"),
      format: z
        .enum(["md", "json"])
        .default("md")
        .describe("Output format: 'md' for human-readable markdown, 'json' for structured data"),
      outputPath: z
        .string()
        .optional()
        .describe("Optional custom file path to write output to")
    },
    async ({ projectPath, format, outputPath }) => {
      const targetDir = path.resolve(projectPath || baseDefaultPath);
      const { files, tree } = await scanProject(targetDir, 3);
      const metadata = await extractMetadata(targetDir, files);
      const graph = await buildDependencyGraph(files, targetDir, metadata.pkgJson);

      let content = "";
      if (format === "json") {
        const jsonObject = generateAgentJson({
          tree,
          metadata,
          graph,
          projectPath: targetDir
        });
        content = JSON.stringify(jsonObject, null, 2);
      } else {
        content = generateAgentMd({ tree, metadata, graph });
      }

      if (outputPath) {
        const outResolved = path.resolve(targetDir, outputPath);
        await fs.mkdir(path.dirname(outResolved), { recursive: true });
        await fs.writeFile(outResolved, content, "utf-8");
      }

      return {
        content: [
          {
            type: "text",
            text: content
          }
        ]
      };
    }
  );

  // 2. get_context tool (JSON direct)
  mcpServer.tool(
    "get_context",
    "Generates and returns complete structured project context JSON (tech stack, entry points, dependency graph, key files).",
    {
      projectPath: z
        .string()
        .optional()
        .describe("Directory path of the project to analyze (defaults to server project root)")
    },
    async ({ projectPath }) => {
      const targetDir = path.resolve(projectPath || baseDefaultPath);
      const { files, tree } = await scanProject(targetDir, 3);
      const metadata = await extractMetadata(targetDir, files);
      const graph = await buildDependencyGraph(files, targetDir, metadata.pkgJson);

      const jsonContext = generateAgentJson({
        tree,
        metadata,
        graph,
        projectPath: targetDir
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(jsonContext, null, 2)
          }
        ]
      };
    }
  );

  // 3. scan_project tool (Scanner only)
  mcpServer.tool(
    "scan_project",
    "Scans a project directory and returns the list of files, directory tree structure, and detected tech stack.",
    {
      projectPath: z
        .string()
        .optional()
        .describe("Directory path of the project to scan")
    },
    async ({ projectPath }) => {
      const targetDir = path.resolve(projectPath || baseDefaultPath);
      const { files, tree } = await scanProject(targetDir, 3);
      const metadata = await extractMetadata(targetDir, files);

      const result = {
        projectPath: targetDir,
        fileCount: files.length,
        files,
        techStack: metadata.stack,
        directoryStructure: tree
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  );

  // 4. get_file tool (Safe file reading)
  mcpServer.tool(
    "get_file",
    "Reads and returns the content of a specific file in the project safely, blocking sensitive/secret files.",
    {
      filePath: z.string().describe("Relative file path within the project to read"),
      projectPath: z
        .string()
        .optional()
        .describe("Project directory containing the file (defaults to server project root)")
    },
    async ({ filePath, projectPath }) => {
      const targetDir = path.resolve(projectPath || baseDefaultPath);
      const safePath = validateSafeFilePath(targetDir, filePath);

      const fileContent = await fs.readFile(safePath, "utf-8");

      return {
        content: [
          {
            type: "text",
            text: fileContent
          }
        ]
      };
    }
  );

  // 5. list_tools_info tool
  mcpServer.tool(
    "list_tools_info",
    "Lists descriptions and parameter guides for all available context-gen MCP tools.",
    {},
    async () => {
      const info = {
        server: "context-gen-cli MCP Server",
        version: "1.0.0",
        tools: [
          {
            name: "generate_context",
            description: "Generates full context in markdown or JSON format.",
            inputs: ["projectPath (optional)", "format (md|json)", "outputPath (optional)"]
          },
          {
            name: "get_context",
            description: "Returns structured project context JSON for LLM reasoning.",
            inputs: ["projectPath (optional)"]
          },
          {
            name: "scan_project",
            description: "Returns files list, file tree, and detected tech stack.",
            inputs: ["projectPath (optional)"]
          },
          {
            name: "get_file",
            description: "Safely reads a project source file with security guards.",
            inputs: ["filePath (required)", "projectPath (optional)"]
          },
          {
            name: "list_tools_info",
            description: "Displays descriptions of all available context-gen MCP tools.",
            inputs: []
          }
        ]
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(info, null, 2)
          }
        ]
      };
    }
  );
}
