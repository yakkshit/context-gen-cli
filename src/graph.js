import fs from "node:fs/promises";
import path from "node:path";

/**
 * Supported source file extensions for dependency graph analysis.
 */
const SUPPORTED_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".py"
]);

/**
 * Regex patterns to extract relative imports and exports in JS/TS.
 */
const JS_IMPORT_EXPORT_PATTERNS = [
  // import ... from './path' or import ... from "../path"
  /(?:import\s+(?:[\s\S]*?from\s+)?['"](\.{1,2}\/[^'"]+)['"])/g,
  // export ... from './path' or export * from './path'
  /(?:export\s+(?:[\s\S]*?from\s+)?['"](\.{1,2}\/[^'"]+)['"])/g,
  // const/let/var ... = require('./path')
  /(?:require\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\))/g,
  // dynamic import: import('./path')
  /(?:import\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\))/g
];

/**
 * Regex patterns to extract Python imports.
 */
const PYTHON_IMPORT_PATTERNS = [
  // from .relative import X or from ..relative import X
  /from\s+(\.{1,2}[a-zA-Z0-9_.]*)\s+import/g,
  // from module import X (where module might be a local file or folder)
  /from\s+([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)\s+import/g,
  // import module
  /^\s*import\s+([a-zA-Z0-9_]+)/gm
];

/**
 * Resolves a relative import path to a known project file path.
 * @param {string} sourceFile - Relative path of the importing file.
 * @param {string} importPath - Relative import string (e.g. "./utils/math").
 * @param {Set<string>} allFilesSet - Set of all known project relative files.
 * @returns {string|null} Resolved project relative path or null if unresolved.
 */
function resolveImportPath(sourceFile, importPath, allFilesSet) {
  const dir = path.posix.dirname(sourceFile);
  const isPython = sourceFile.endsWith(".py");

  if (isPython) {
    // Handle Python relative imports like .utils or ..helpers
    let cleanSpecifier = importPath;
    if (cleanSpecifier.startsWith(".")) {
      const leadingDots = cleanSpecifier.match(/^\.+/)[0].length;
      let targetDir = dir;
      for (let i = 1; i < leadingDots; i++) {
        targetDir = path.posix.dirname(targetDir);
      }
      const remainder = cleanSpecifier.slice(leadingDots).replace(/\./g, "/");
      const candidatePath = path.posix.join(targetDir === "." ? "" : targetDir, remainder);

      if (allFilesSet.has(`${candidatePath}.py`)) return `${candidatePath}.py`;
      if (allFilesSet.has(path.posix.join(candidatePath, "__init__.py"))) {
        return path.posix.join(candidatePath, "__init__.py");
      }
    } else {
      // Direct local module import (e.g. `import math_util`)
      const pyDirect = path.posix.join(dir === "." ? "" : dir, `${cleanSpecifier.replace(/\./g, "/")}.py`);
      if (allFilesSet.has(pyDirect)) return pyDirect;

      // Root level import
      const pyRoot = `${cleanSpecifier.replace(/\./g, "/")}.py`;
      if (allFilesSet.has(pyRoot)) return pyRoot;
    }
    return null;
  }

  const rawTarget = path.posix.normalize(path.posix.join(dir === "." ? "" : dir, importPath));

  // 1. Direct match
  if (allFilesSet.has(rawTarget)) {
    return rawTarget;
  }

  // 2. Match with supported extensions
  const extensions = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py", ".json"];
  for (const ext of extensions) {
    const withExt = rawTarget + ext;
    if (allFilesSet.has(withExt)) {
      return withExt;
    }
  }

  // 3. Match directory index files (e.g. ./utils -> utils/index.js)
  for (const ext of extensions) {
    const indexTarget = path.posix.join(rawTarget, `index${ext}`);
    if (allFilesSet.has(indexTarget)) {
      return indexTarget;
    }
  }

  return null;
}

/**
 * Determines the architectural node type for a file.
 * @param {string} file - Relative file path.
 * @param {number} importsCount - Number of imports made by this file.
 * @param {number} importedByCount - Number of times this file is imported.
 * @param {Set<string>} manifestEntries - Explicit entry points from package.json or config.
 * @returns {"entry"|"component"|"util"|"module"} Node type.
 */
function determineNodeType(file, importsCount, importedByCount, manifestEntries) {
  const lower = file.toLowerCase();
  const baseName = path.posix.basename(file);

  if (
    manifestEntries.has(file) ||
    baseName === "main.py" ||
    baseName === "app.py" ||
    baseName === "index.js" ||
    baseName === "index.ts" ||
    baseName === "layout.tsx" ||
    baseName === "page.tsx" ||
    (importedByCount === 0 && importsCount >= 2 && !file.includes("/components/"))
  ) {
    return "entry";
  }

  if (
    lower.includes("util") ||
    lower.includes("helper") ||
    (importedByCount >= 2 && importsCount <= 1)
  ) {
    return "util";
  }

  if (
    lower.includes("component") ||
    file.endsWith(".jsx") ||
    file.endsWith(".tsx") ||
    /^[A-Z]/.test(baseName)
  ) {
    return "component";
  }

  return "module";
}

/**
 * Builds a dependency graph representing imports and exports across project files.
 * @param {string[]} files - Array of relative file paths in the project.
 * @param {string} rootPath - Absolute or relative project root path.
 * @param {object} [pkgJson=null] - Parsed package.json object if available.
 * @returns {Promise<{
 *   nodes: Array<{ file: string, type: string, imports: string[], importedBy: string[] }>,
 *   edges: Array<{ from: string, to: string, type: string }>,
 *   entryPoints: string[],
 *   utilities: string[],
 *   chapters: Array<{ name: string, files: string[], dependencies: string[] }>
 * }>}
 */
export async function buildDependencyGraph(files, rootPath, pkgJson = null) {
  const resolvedRoot = path.resolve(rootPath);
  const normalizedFiles = files.map((f) => f.replace(/\\/g, "/"));
  const allFilesSet = new Set(normalizedFiles);

  const codeFiles = normalizedFiles.filter((f) =>
    SUPPORTED_EXTENSIONS.has(path.posix.extname(f).toLowerCase())
  );

  /** @type {Set<string>} Explicit entry points from package.json */
  const manifestEntries = new Set();
  if (pkgJson) {
    if (pkgJson.main) manifestEntries.add(pkgJson.main.replace(/^\.\//, ""));
    if (typeof pkgJson.bin === "string") manifestEntries.add(pkgJson.bin.replace(/^\.\//, ""));
    if (typeof pkgJson.bin === "object") {
      Object.values(pkgJson.bin).forEach((b) => manifestEntries.add(b.replace(/^\.\//, "")));
    }
  }

  /** @type {Map<string, { imports: Set<string>, importedBy: Set<string> }>} */
  const nodeMap = new Map();

  for (const file of codeFiles) {
    nodeMap.set(file, {
      imports: new Set(),
      importedBy: new Set()
    });
  }

  const edges = [];

  for (const file of codeFiles) {
    const fullPath = path.join(resolvedRoot, file);
    let content = "";
    try {
      content = await fs.readFile(fullPath, "utf-8");
    } catch {
      continue;
    }

    const isPy = file.endsWith(".py");
    const patterns = isPy ? PYTHON_IMPORT_PATTERNS : JS_IMPORT_EXPORT_PATTERNS;

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importSpecifier = match[1];
        if (!importSpecifier) continue;

        const resolvedTarget = resolveImportPath(file, importSpecifier, allFilesSet);
        if (resolvedTarget && resolvedTarget !== file) {
          const isExport = pattern.source.includes("export");
          const edgeType = isExport ? "export" : "import";

          const exists = edges.some(
            (e) => e.from === file && e.to === resolvedTarget && e.type === edgeType
          );

          if (!exists) {
            edges.push({
              from: file,
              to: resolvedTarget,
              type: edgeType
            });
          }

          nodeMap.get(file)?.imports.add(resolvedTarget);
          if (nodeMap.has(resolvedTarget)) {
            nodeMap.get(resolvedTarget)?.importedBy.add(file);
          }
        }
      }
    }
  }

  const nodes = [];
  const entryCandidates = [];
  const utilCandidates = [];

  for (const [file, data] of nodeMap.entries()) {
    const imports = Array.from(data.imports);
    const importedBy = Array.from(data.importedBy);
    const type = determineNodeType(file, imports.length, importedBy.length, manifestEntries);

    nodes.push({
      file,
      type,
      imports,
      importedBy
    });

    if (type === "entry") {
      entryCandidates.push({ file, priority: manifestEntries.has(file) ? 10 : imports.length });
    } else if (type === "util") {
      utilCandidates.push({ file, priority: importedBy.length });
    }
  }

  // Sort entry points by importance and limit to max 7
  entryCandidates.sort((a, b) => b.priority - a.priority);
  const entryPoints = entryCandidates.slice(0, 7).map((e) => e.file);

  // If no entry point detected, choose the top imported or top importing node
  if (entryPoints.length === 0 && nodes.length > 0) {
    const sorted = [...nodes].sort((a, b) => b.imports.length - a.imports.length);
    if (sorted[0]) entryPoints.push(sorted[0].file);
  }

  // Sort utilities by how many files import them
  utilCandidates.sort((a, b) => b.priority - a.priority);
  const utilities = utilCandidates.slice(0, 10).map((u) => u.file);

  // Build Chapters based on directory structure (top-level folders)
  const chapters = {};
  for (const node of nodes) {
    const dir = path.posix.dirname(node.file);
    const topLevelDir = dir === "." || !dir.includes("/") ? dir : dir.split("/")[0];
    const chapterName = topLevelDir === "." ? "Root" : topLevelDir;
    
    if (!chapters[chapterName]) {
      chapters[chapterName] = { files: [], dependencies: new Set() };
    }
    chapters[chapterName].files.push(node.file);
  }

  // Calculate chapter dependencies
  for (const edge of edges) {
    const fromDir = path.posix.dirname(edge.from);
    const toDir = path.posix.dirname(edge.to);
    const fromChapter = (fromDir === "." || !fromDir.includes("/")) ? (fromDir === "." ? "Root" : fromDir) : fromDir.split("/")[0];
    const toChapter = (toDir === "." || !toDir.includes("/")) ? (toDir === "." ? "Root" : toDir) : toDir.split("/")[0];
    
    if (fromChapter !== toChapter) {
      chapters[fromChapter]?.dependencies.add(toChapter);
    }
  }

  // Format chapters for output
  const formattedChapters = Object.entries(chapters).map(([name, data]) => ({
    name,
    files: data.files,
    dependencies: Array.from(data.dependencies)
  }));

  return {
    nodes,
    edges,
    entryPoints,
    utilities,
    chapters: formattedChapters
  };
}
