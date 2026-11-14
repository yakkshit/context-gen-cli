import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

let ts = null;
try {
  ts = (await import("typescript")).default;
} catch {
  // Fallback to zero-dependency regex parser if typescript isn't installed
}

const SUPPORTED_EXT = {
  ".ts": "ts",
  ".tsx": "ts",
  ".js": "js",
  ".jsx": "js",
  ".mjs": "js",
  ".py": "python",
  ".rs": "rust",
  ".go": "go",
  ".dart": "dart",
  ".cs": "csharp",
};

const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", ".graviton",
  "target", "__pycache__", ".venv", "venv", ".dart_tool", "bin", "obj",
  "test", "tests", "context", "public", "site-packages", ".turbo", ".cache",
  ".pytest_cache", ".mypy_cache", ".ruff_cache",
]);

function detectWorkspace(relPath) {
  const parts = relPath.split(path.sep);
  if (parts.length >= 3 && ["apps", "packages", "services", "crates"].includes(parts[0])) {
    return `${parts[0]}/${parts[1]}`;
  }
  if (parts[0] === "python" && parts.length >= 2) {
    return "python";
  }
  return "root";
}

function detectRole(relPath) {
  const p = relPath.toLowerCase();
  if (p.includes("/pages/") || p.includes("/app/") || p.includes("/screens/") || p.includes("/views/")) return "page";
  if (p.includes("/components/") || p.includes("/widgets/")) return "component";
  if (p.includes("/stores/") || p.includes("store") || p.includes("/state/") || p.includes("/bloc/")) return "store";
  if (p.includes("/api/") || p.includes("/routes/") || p.includes("/controllers/") || p.includes("/handlers/") || p.includes("/mcp/")) return "api";
  if (p.includes("/models/") || p.includes("/schemas/") || p.includes("/entities/")) return "model";
  if (p.includes("/lib/") || p.includes("/utils/") || p.includes("/services/") || p.includes("scanner") || p.includes("extractor") || p.includes("graph")) return "lib";
  return "other";
}

function extractByLanguage(lang, code, filePath) {
  const imports = new Set();
  const exports = new Set();

  if (lang === "ts" || lang === "js") {
    if (ts) {
      const sf = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);
      ts.forEachChild(sf, (node) => {
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
          imports.add(node.moduleSpecifier.text);
        }
        if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name) {
          if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
            exports.add(node.name.text);
          }
        }
        if (ts.isVariableStatement(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
          for (const decl of node.declarationList.declarations) {
            if (ts.isIdentifier(decl.name)) exports.add(decl.name.text);
          }
        }
      });
    } else {
      for (const m of code.matchAll(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g)) imports.add(m[1]);
      for (const m of code.matchAll(/export\s+(?:async\s+)?(?:function|const|class|let)\s+([A-Za-z0-9_$]+)/g)) exports.add(m[1]);
    }
  } else if (lang === "python") {
    for (const m of code.matchAll(/^(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm)) {
      imports.add(m[1] || m[2]);
    }
    for (const m of code.matchAll(/^(?:async\s+def|def|class)\s+([a-zA-Z0-9_]+)/gm)) {
      if (!m[1].startsWith("_")) exports.add(m[1]);
    }
  } else if (lang === "rust") {
    for (const m of code.matchAll(/^use\s+([\w:]+)/gm)) imports.add(m[1]);
    for (const m of code.matchAll(/^pub\s+(?:async\s+)?(?:fn|struct|enum|trait)\s+(\w+)/gm)) exports.add(m[1]);
  } else if (lang === "go") {
    for (const m of code.matchAll(/^\s*"([^"]+)"/gm)) imports.add(m[1]);
    for (const m of code.matchAll(/^(?:func(?:\s*\([^)]+\))?|type)\s+([A-Z]\w*)/gm)) exports.add(m[1]);
  } else if (lang === "dart") {
    for (const m of code.matchAll(/^import\s+['"]([^'"]+)['"]/gm)) imports.add(m[1]);
    for (const m of code.matchAll(/^class\s+([A-Za-z]\w*)/gm)) exports.add(m[1]);
  } else if (lang === "csharp") {
    for (const m of code.matchAll(/^using\s+([\w.]+);/gm)) imports.add(m[1]);
    for (const m of code.matchAll(/public\s+(?:static\s+|partial\s+|sealed\s+)?(?:class|interface|record|enum)\s+(\w+)/gm)) {
      exports.add(m[1]);
    }
  }

  return { imports: [...imports], exports: [...exports] };
}

export function scanRepository(rootDir) {
  const cacheDir = path.join(rootDir, ".graviton");
  const cacheFile = path.join(cacheDir, "fingerprint.json");

  const previousMap = new Map();
  if (fs.existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
      for (const item of cached) previousMap.set(item.path, item);
    } catch {
      // Rebuild cache if corrupted
    }
  }

  const results = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith(".") || entry.name.endsWith(".egg-info")) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        const ext = path.extname(entry.name);
        const lang = SUPPORTED_EXT[ext];
        if (!lang) continue;

        const code = fs.readFileSync(fullPath, "utf-8");
        const relPath = path.relative(rootDir, fullPath);
        const hash = crypto.createHash("sha256").update(code).digest("hex").slice(0, 12);

        const cachedItem = previousMap.get(relPath);
        if (cachedItem && cachedItem.hash === hash) {
          results.push(cachedItem);
          continue;
        }

        const { imports, exports } = extractByLanguage(lang, code, fullPath);
        const summary = `${relPath} ${imports.join(" ")} ${exports.join(" ")}`;

        results.push({
          path: relPath,
          workspace: detectWorkspace(relPath),
          language: lang,
          role: detectRole(relPath),
          imports,
          exports,
          tokensEstimate: Math.max(10, Math.ceil(summary.length / 4)),
          hash,
        });
      }
    }
  }

  walk(rootDir);

  try {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(results, null, 2), "utf-8");
  } catch {
    // Ignore cache write errors in read-only environments
  }

  return results;
}
