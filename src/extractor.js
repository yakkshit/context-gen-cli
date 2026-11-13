import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Extracts recent git commits from the project root if it is a git repository.
 * Safely handles non-git folders and command execution failures without crashing.
 * @param {string} rootPath - Absolute path to project root.
 * @param {number} [limit=5] - Maximum number of commits to fetch.
 * @returns {Promise<Array<{ hash: string, message: string, relativeDate: string, author: string }>>}
 */
async function extractGitCommits(rootPath, limit = 5) {
  try {
    // Check if .git directory or file exists in the target root
    const gitPath = path.join(rootPath, ".git");
    try {
      await fs.access(gitPath);
    } catch {
      // Not a git repository or inaccessible
      return [];
    }

    const { stdout } = await execFileAsync(
      "git",
      ["-C", rootPath, "log", "-n", String(limit), "--pretty=format:%h|||%s|||%cr|||%an"],
      { timeout: 3000 }
    );

    if (!stdout || !stdout.trim()) return [];

    return stdout
      .trim()
      .split("\n")
      .map((line) => {
        const [hash, message, relativeDate, author] = line.split("|||");
        return {
          hash: hash?.trim() || "",
          message: message?.trim() || "",
          relativeDate: relativeDate?.trim() || "",
          author: author?.trim() || ""
        };
      })
      .filter((c) => c.hash && c.message);
  } catch {
    // Return empty array gracefully on any error or missing git binary
    return [];
  }
}

/**
 * Language mapping based on file extensions.
 */
const EXTENSION_LANGUAGE_MAP = {
  ".js": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".jsx": "React (JSX)",
  ".ts": "TypeScript",
  ".tsx": "React (TSX)",
  ".py": "Python",
  ".go": "Go",
  ".rs": "Rust",
  ".java": "Java",
  ".rb": "Ruby",
  ".php": "PHP",
  ".html": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
  ".json": "JSON",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".md": "Markdown",
  ".vue": "Vue",
  ".svelte": "Svelte",
  ".sql": "SQL",
  ".sh": "Shell Script"
};

/**
 * Common framework signatures based on package names or key files.
 */
const FRAMEWORK_SIGNATURES = {
  express: "Express.js",
  react: "React",
  "react-dom": "React",
  next: "Next.js",
  vue: "Vue.js",
  nuxt: "Nuxt",
  svelte: "Svelte",
  "@sveltejs/kit": "SvelteKit",
  fastify: "Fastify",
  nestjs: "NestJS",
  "@nestjs/core": "NestJS",
  tailwindcss: "Tailwind CSS",
  prisma: "Prisma ORM",
  "@prisma/client": "Prisma ORM",
  mongoose: "Mongoose (MongoDB)",
  sequelize: "Sequelize ORM",
  vite: "Vite",
  webpack: "Webpack",
  jest: "Jest",
  vitest: "Vitest"
};

/**
 * Cleans markdown formatting, stripping badges, HTML tags/comments, and images.
 * @param {string} markdown - Raw markdown text.
 * @returns {string} Cleaned plain text.
 */
function cleanMarkdownText(markdown) {
  return markdown
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, "")
    // Remove badge links [![...](...)](...)
    .replace(/\[!\[[\s\S]*?\]\([\s\S]*?\)\]\([\s\S]*?\)/g, "")
    // Remove image tags ![...](...)
    .replace(/!\[[\s\S]*?\]\([\s\S]*?\)/g, "")
    // Remove HTML tags
    .replace(/<[^>]+>/g, "")
    // Simplify markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove bold/italics markers
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    // Remove blockquotes/backticks
    .replace(/^>\s*/gm, "")
    .replace(/`{1,3}/g, "");
}

/**
 * Finds all candidate README files in the project root directory.
 * @param {string} rootPath - Absolute path to project root.
 * @returns {Promise<string[]>} List of README filenames.
 */
export async function findReadmeFiles(rootPath) {
  try {
    const dirEntries = await fs.readdir(rootPath, { withFileTypes: true });
    return dirEntries
      .filter((e) => e.isFile() && /^readme/i.test(e.name))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * Extracts a concise, high-signal overview from one or multiple README files or package.json.
 * @param {string} rootPath - Absolute path to project root.
 * @param {object|null} pkgJson - Parsed package.json object if available.
 * @param {string[]} files - List of relative file paths.
 * @param {string[]} stack - Detected tech stack array.
 * @param {string|string[]|null} [preferredReadmes=null] - Specific user-chosen README filename(s).
 * @returns {Promise<string>} Project overview summary.
 */
async function extractOverview(rootPath, pkgJson, files = [], stack = [], preferredReadmes = null) {
  try {
    const dirEntries = await fs.readdir(rootPath, { withFileTypes: true });
    const allReadmeNames = dirEntries
      .filter((e) => e.isFile() && /^readme/i.test(e.name))
      .map((e) => e.name);

    let targetReadmeList = [];

    if (Array.isArray(preferredReadmes) && preferredReadmes.length > 0) {
      targetReadmeList = preferredReadmes;
    } else if (typeof preferredReadmes === "string" && preferredReadmes.trim()) {
      targetReadmeList = [preferredReadmes.trim()];
    } else {
      // Prioritize exact README.md / readme.md
      targetReadmeList = allReadmeNames.sort((a, b) => {
        const aExact = /^readme\.md$/i.test(a) ? 0 : 1;
        const bExact = /^readme\.md$/i.test(b) ? 0 : 1;
        return aExact - bExact;
      });
    }

    const collectedSummaries = [];

    for (const readmeName of targetReadmeList) {
      try {
        const fullPath = path.join(rootPath, readmeName);
        const rawContent = await fs.readFile(fullPath, "utf-8");
        const lines = rawContent.split("\n");

        const paragraphLines = [];
        let skippedMainHeader = false;

        for (let line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            if (paragraphLines.length > 0 && paragraphLines.join(" ").length >= 400) {
              break;
            }
            continue;
          }

          // Skip leading top-level title header
          if (!skippedMainHeader && trimmed.startsWith("#")) {
            skippedMainHeader = true;
            continue;
          }

          // Stop if hitting a major sub-heading
          if (trimmed.startsWith("##") && paragraphLines.length > 0) {
            break;
          }

          if (trimmed.startsWith("#")) {
            continue;
          }

          paragraphLines.push(trimmed);
          if (paragraphLines.join(" ").length >= 400) {
            break;
          }
        }

        const rawOverview = paragraphLines.join(" ");
        const cleaned = cleanMarkdownText(rawOverview).replace(/\s+/g, " ").trim();

        if (cleaned.length >= 10) {
          if (targetReadmeList.length > 1) {
            collectedSummaries.push(`**${readmeName}**: ${cleaned}`);
          } else {
            collectedSummaries.push(cleaned);
          }
        }
      } catch {
        // Continue checking other files
      }
    }

    if (collectedSummaries.length > 0) {
      return collectedSummaries.join("\n\n");
    }
  } catch {
    // Ignore error
  }

  // 2. Fallback to package.json description
  if (pkgJson && pkgJson.description && typeof pkgJson.description === "string" && pkgJson.description.trim()) {
    return pkgJson.description.trim();
  }

  // 3. Smart fallback with file count and primary tech stack
  const primaryStack = stack.length > 0 ? stack.slice(0, 3).join(", ") : "general";
  return `No overview found. (Project contains ${files.length} files, primarily ${primaryStack} stack).`;
}

/**
 * Detects languages and frameworks present in the project.
 * @param {string[]} files - Array of relative file paths.
 * @param {object|null} pkgJson - Parsed package.json object.
 * @param {boolean} [hasRequirements=false] - Whether requirements.txt exists.
 * @param {boolean} [hasPyproject=false] - Whether pyproject.toml exists.
 * @returns {string[]} List of detected languages, runtimes, and frameworks.
 */
function detectTechStack(files, pkgJson, hasRequirements = false, hasPyproject = false) {
  const languages = new Set();
  const frameworks = new Set();

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (EXTENSION_LANGUAGE_MAP[ext]) {
      languages.add(EXTENSION_LANGUAGE_MAP[ext]);
    }
  }

  if (hasRequirements || hasPyproject || languages.has("Python")) {
    languages.add("Python");
  }

  if (pkgJson) {
    const allDeps = {
      ...(pkgJson.dependencies || {}),
      ...(pkgJson.devDependencies || {})
    };

    for (const [dep, name] of Object.entries(FRAMEWORK_SIGNATURES)) {
      if (allDeps[dep]) {
        frameworks.add(name);
      }
    }

    if (languages.has("JavaScript") || languages.has("TypeScript")) {
      frameworks.add("Node.js");
    }
  }

  return [...Array.from(languages), ...Array.from(frameworks)];
}

/**
 * Known specific configuration filenames and patterns mapped to descriptive purposes.
 */
const KNOWN_CONFIG_DESCRIPTIONS = [
  { match: /^package\.json$/i, desc: "Project manifest, metadata, dependencies, and script definitions." },
  { match: /^tsconfig(\..+)?\.json$/i, desc: "TypeScript compiler options and path aliases configuration." },
  { match: /^jsconfig(\..+)?\.json$/i, desc: "JavaScript compiler and module resolution configuration." },
  { match: /^vitest\.config\.(js|ts|mjs|cjs)$/i, desc: "Vitest testing framework configuration." },
  { match: /^jest\.config\.(js|ts|mjs|cjs|json)$/i, desc: "Jest testing framework configuration." },
  { match: /^(eslint\.config\.(js|mjs|cjs)|\.eslintrc(\..+)?)$/i, desc: "ESLint code linting and formatting rules." },
  { match: /^(postcss\.config\.(js|ts|mjs|cjs)|\.postcssrc(\..+)?)$/i, desc: "PostCSS configuration for CSS transformations." },
  { match: /^(tailwind\.config\.(js|ts|mjs|cjs))$/i, desc: "Tailwind CSS theme tokens and layout styling configuration." },
  { match: /^(vite\.config\.(js|ts|mjs|cjs))$/i, desc: "Vite bundler, plugin pipeline, and development server configuration." },
  { match: /^(next\.config\.(js|ts|mjs|cjs))$/i, desc: "Next.js framework runtime configuration and routing redirects." },
  { match: /^(prettier\.config\.(js|mjs|cjs)|\.prettierrc(\..+)?)$/i, desc: "Prettier code formatting configuration." },
  { match: /^(babel\.config\.(js|json)|\.babelrc(\..+)?)$/i, desc: "Babel compiler configuration." },
  { match: /^(webpack\.config\.(js|ts|mjs|cjs))$/i, desc: "Webpack bundling and asset compilation configuration." },
  { match: /^(rollup\.config\.(js|ts|mjs|cjs))$/i, desc: "Rollup module bundler configuration." },
  { match: /^components\.json$/i, desc: "shadcn/ui component library configuration." },
  { match: /^turbo\.json$/i, desc: "Turborepo monorepo pipeline configuration." },
  { match: /^\.gitignore$/i, desc: "Specifies intentionally untracked files to ignore." },
  { match: /^dockerfile$/i, desc: "Container build instructions and runtime environment definition." },
  { match: /^docker-compose(\..+)?\.(yml|yaml)$/i, desc: "Multi-container Docker application service configuration." },
  { match: /^requirements\.txt$/i, desc: "Python package dependencies specification." },
  { match: /^pyproject\.toml$/i, desc: "Python project metadata, build system configuration, and dependency definitions." }
];

/**
 * Validates whether an extracted string is a clean, natural language description.
 * @param {string|null} desc - Potential description.
 * @returns {boolean} True if clean and valid.
 */
function isValidPurposeDescription(desc) {
  if (!desc || typeof desc !== "string") return false;
  const trimmed = desc.trim();

  // Must be a reasonable sentence length
  if (trimmed.length < 10 || trimmed.length > 200) return false;

  // Reject raw code artifacts, syntax fragments, glob patterns
  if (
    trimmed.startsWith("/*") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("}") ||
    trimmed.startsWith("[") ||
    trimmed.startsWith("]") ||
    trimmed.startsWith("<") ||
    trimmed.includes("/*.ts") ||
    trimmed.includes("**/*") ||
    trimmed.includes("export default {") ||
    trimmed.includes("defineConfig({") ||
    trimmed.includes("module.exports =")
  ) {
    return false;
  }

  // Check unmatched quotes
  const singleQuotes = (trimmed.match(/'/g) || []).length;
  const doubleQuotes = (trimmed.match(/"/g) || []).length;
  if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
    return false;
  }

  // Must contain actual readable words
  if (!/[a-zA-Z]{3,}/.test(trimmed)) {
    return false;
  }

  return true;
}

/**
 * Reads the first few lines of a file to extract JSDoc or inspect exports.
 * @param {string} rootPath - Project root directory.
 * @param {string} file - Relative file path.
 * @returns {Promise<string|null>} Extracted comment or summary if found and valid.
 */
async function inspectFileContent(rootPath, file) {
  try {
    const fullPath = path.join(rootPath, file);
    const content = await fs.readFile(fullPath, "utf-8");
    const lines = content.split("\n").slice(0, 20);

    // 1. Look for JSDoc block /** ... */
    const joinedFirstLines = lines.join("\n");
    const jsdocMatch = joinedFirstLines.match(/\/\*\*([\s\S]*?)\*\//);
    if (jsdocMatch && jsdocMatch[1]) {
      const jsdocLines = jsdocMatch[1]
        .split("\n")
        .map((l) => l.replace(/^\s*\*\s?/, "").trim())
        .filter(
          (l) =>
            l &&
            !l.startsWith("@fileoverview") &&
            !l.startsWith("@param") &&
            !l.startsWith("@returns") &&
            !l.startsWith("@typedef") &&
            !l.startsWith("@type")
        );

      if (jsdocLines.length > 0) {
        let comment = jsdocLines[0];
        if (!comment.endsWith(".")) comment += ".";
        if (isValidPurposeDescription(comment)) {
          return comment;
        }
      }
    }

    // 2. Look for Python docstrings """ ... """
    const pyDocMatch = joinedFirstLines.match(/^(?:"""|''')([\s\S]*?)(?:"""|''')/m);
    if (pyDocMatch && pyDocMatch[1]) {
      let docLine = pyDocMatch[1].trim().split("\n")[0]?.trim();
      if (docLine) {
        if (!docLine.endsWith(".")) docLine += ".";
        if (isValidPurposeDescription(docLine)) {
          return docLine;
        }
      }
    }

    // 3. Inspect primary exports or declarations
    for (const line of lines) {
      const trimmed = line.trim();
      const exportFuncMatch = trimmed.match(/^export\s+(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/);
      if (exportFuncMatch) {
        return `Exports \`${exportFuncMatch[1]}\` function.`;
      }
      const exportClassMatch = trimmed.match(/^export\s+class\s+([a-zA-Z0-9_$]+)/);
      if (exportClassMatch) {
        return `Exports \`${exportClassMatch[1]}\` class.`;
      }
      const exportConstMatch = trimmed.match(/^export\s+(?:const|let|var)\s+([a-zA-Z0-9_$]+)/);
      if (exportConstMatch) {
        return `Exports \`${exportConstMatch[1]}\` definition.`;
      }
      const exportDefaultMatch = trimmed.match(/^export\s+default\s+(?:function\s+|class\s+)?([a-zA-Z0-9_$]+)?/);
      if (exportDefaultMatch && exportDefaultMatch[1]) {
        return `Exports default \`${exportDefaultMatch[1]}\` component/module.`;
      }
      if (trimmed.includes("express()") || trimmed.includes("fastify()")) {
        return "Initializes web application server and HTTP route handlers.";
      }
    }
  } catch {
    // Ignore error
  }
  return null;
}

/**
 * Summarizes the purpose of a key file in one concise sentence.
 * @param {string} rootPath - Project root directory.
 * @param {string} file - Relative file path.
 * @param {object|null} pkgJson - Parsed package.json object.
 * @returns {Promise<string>} 1-line purpose description.
 */
async function inferFilePurpose(rootPath, file, pkgJson) {
  const base = path.posix.basename(file).toLowerCase();

  // Check known config descriptions
  for (const entry of KNOWN_CONFIG_DESCRIPTIONS) {
    if (entry.match.test(base)) {
      return entry.desc;
    }
  }

  if (base.startsWith("readme")) return "Project documentation and overview.";

  // Inspect file content for valid JSDoc, docstring, or exports
  const contentPurpose = await inspectFileContent(rootPath, file);
  if (contentPurpose && isValidPurposeDescription(contentPurpose)) {
    return contentPurpose;
  }

  // Fallback heuristics based on directory structure and filename
  if (file.includes("component") || file.endsWith(".jsx") || file.endsWith(".tsx")) {
    return "UI or modular structural component.";
  }
  if (file.includes("util") || file.includes("helper")) {
    return "Utility helper functions and shared logic.";
  }
  if (
    base.startsWith("index.") ||
    base.startsWith("main.") ||
    (base.startsWith("app.") && !file.includes("/components/"))
  ) {
    return "Main application / package entry point.";
  }
  if (file.includes("route") || file.includes("controller") || file.includes("api")) {
    return "API routing and request handling.";
  }
  if (file.includes("model") || file.includes("schema")) {
    return "Data model or schema definition.";
  }
  if (file.includes("config") || base.endsWith(".config.js") || base.endsWith(".config.ts") || base.endsWith(".config.mjs")) {
    return "Environment or tool configuration.";
  }
  if (file.includes("test") || file.includes("spec")) {
    return "Automated test suite.";
  }

  return "Source module.";
}

/**
 * Selects top key files (top 10-15) and generates 1-line purposes for each.
 * @param {string} rootPath - Project root directory.
 * @param {string[]} files - Array of relative file paths.
 * @param {object|null} pkgJson - Parsed package.json.
 * @returns {Promise<Array<{ file: string, purpose: string }>>} Key files list.
 */
async function selectKeyFiles(rootPath, files, pkgJson) {
  const priorityFiles = [];
  const otherFiles = [];

  for (const file of files) {
    const base = path.posix.basename(file).toLowerCase();
    const isHighPriority =
      base === "package.json" ||
      base.startsWith("readme") ||
      base.startsWith("index.") ||
      base.startsWith("main.") ||
      base.startsWith("app.") ||
      base.includes("config") ||
      file.startsWith("src/");

    if (isHighPriority) {
      priorityFiles.push(file);
    } else {
      otherFiles.push(file);
    }
  }

  const selected = [...priorityFiles, ...otherFiles].slice(0, 15);

  const results = [];
  for (const file of selected) {
    const purpose = await inferFilePurpose(rootPath, file, pkgJson);
    results.push({ file, purpose });
  }

  return results;
}

/**
 * Extracts entry points from package.json and project files.
 * @param {string[]} files - Array of relative file paths.
 * @param {object|null} pkgJson - Parsed package.json.
 * @returns {Array<{ name: string, path: string }>} List of entry points.
 */
function extractEntryPoints(files, pkgJson) {
  const entries = [];

  if (pkgJson) {
    if (pkgJson.main) entries.push({ name: "main", path: pkgJson.main });
    if (pkgJson.bin) {
      if (typeof pkgJson.bin === "string") {
        entries.push({ name: "bin", path: pkgJson.bin });
      } else if (typeof pkgJson.bin === "object") {
        for (const [cmd, binPath] of Object.entries(pkgJson.bin)) {
          entries.push({ name: `bin (${cmd})`, path: binPath });
        }
      }
    }
    if (pkgJson.scripts?.start) entries.push({ name: "scripts.start", path: pkgJson.scripts.start });
    if (pkgJson.scripts?.dev) entries.push({ name: "scripts.dev", path: pkgJson.scripts.dev });
  }

  // If no package.json entry found, look for index or main in files
  if (entries.length === 0) {
    const commonEntries = files.filter((f) => {
      const base = path.posix.basename(f).toLowerCase();
      return base.startsWith("index.") || base.startsWith("main.") || base.startsWith("app.");
    });
    for (const f of commonEntries) {
      entries.push({ name: "entry file", path: f });
    }
  }

  return entries;
}

/**
 * Extracts comprehensive project metadata from project files.
 * @param {string} rootPath - Project root path.
 * @param {string[]} files - Array of relative file paths.
 * @returns {Promise<{
 *   overview: string,
 *   stack: string[],
 *   primaryFramework: string | null,
 *   deps: { production: string[], development: string[] },
 *   entryPoints: Array<{ name: string, path: string }>,
 *   keyFiles: Array<{ file: string, purpose: string }>
 * }>}
 */
export async function extractMetadata(rootPath, files, options = {}) {
  const resolvedRoot = path.resolve(rootPath);
  let pkgJson = null;

  try {
    const raw = await fs.readFile(path.join(resolvedRoot, "package.json"), "utf-8");
    pkgJson = JSON.parse(raw);
  } catch {
    // Optional
  }

  // Check Python requirement files
  let hasRequirements = false;
  let hasPyproject = false;
  const pythonDeps = [];

  try {
    const reqPath = path.join(resolvedRoot, "requirements.txt");
    const reqContent = await fs.readFile(reqPath, "utf-8");
    hasRequirements = true;
    const reqLines = reqContent
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    pythonDeps.push(...reqLines);
  } catch {
    // Optional
  }

  try {
    const pyprojPath = path.join(resolvedRoot, "pyproject.toml");
    await fs.access(pyprojPath);
    hasPyproject = true;
  } catch {
    // Optional
  }

  const stack = detectTechStack(files, pkgJson, hasRequirements, hasPyproject);
  const primaryFramework = stack.find(s => Object.values(FRAMEWORK_SIGNATURES).includes(s)) || null;
  const overview = await extractOverview(resolvedRoot, pkgJson, files, stack, options.preferredReadme);
  const keyFiles = await selectKeyFiles(resolvedRoot, files, pkgJson);
  const entryPoints = extractEntryPoints(files, pkgJson);
  const commits = await extractGitCommits(resolvedRoot, 5);

  const jsProdDeps = pkgJson?.dependencies
    ? Object.entries(pkgJson.dependencies).map(([k, v]) => `${k}@${v}`)
    : [];
  const jsDevDeps = pkgJson?.devDependencies
    ? Object.entries(pkgJson.devDependencies).map(([k, v]) => `${k}@${v}`)
    : [];

  const deps = {
    production: [...jsProdDeps, ...pythonDeps],
    development: jsDevDeps
  };

  return {
    overview,
    stack,
    primaryFramework,
    deps,
    entryPoints,
    keyFiles,
    commits,
    pkgJson
  };
}
