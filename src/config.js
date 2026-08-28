import fs from "fs";
import path from "path";

export const CONFIG_FILE_NAME = ".context-gen.json";

/**
 * Returns the default configuration object for context-gen.
 * @returns {object}
 */
export function getDefaultConfig() {
  return {
    version: "1.0.0",
    outputDir: "context",
    outputFormats: ["md", "json", "yaml"],
    maxTokens: 4000,
    ignorePatterns: [
      "node_modules",
      ".git",
      "dist",
      "build",
      "coverage",
      "__pycache__",
      ".venv"
    ],
    securityPatterns: [
      ".env",
      ".env.*",
      "*.pem",
      "*.key",
      "*.p12",
      "id_rsa*",
      "secrets/",
      "credentials/",
      "**/config/secrets.*"
    ],
    securityKeywords: [
      "API_KEY",
      "SECRET",
      "PASSWORD",
      "PRIVATE_KEY",
      "TOKEN",
      "AUTH_KEY"
    ],
    excludeFromContext: [
      "agent.md",
      "agent.json",
      "agent.yaml",
      "mcp.md",
      ".context-gen.json"
    ]
  };
}

/**
 * Loads the project configuration from .context-gen.json or creates a default one.
 * @param {string} projectPath 
 * @returns {object}
 */
export function loadConfig(projectPath) {
  const resolvedPath = path.resolve(projectPath || process.cwd());
  const configFilePath = path.join(resolvedPath, CONFIG_FILE_NAME);

  if (fs.existsSync(configFilePath)) {
    try {
      const raw = fs.readFileSync(configFilePath, "utf-8");
      const parsed = JSON.parse(raw);
      const defaults = getDefaultConfig();
      return {
        ...defaults,
        ...parsed,
        outputDir: parsed.outputDir || defaults.outputDir,
        ignorePatterns: Array.from(new Set([...(defaults.ignorePatterns || []), ...(parsed.ignorePatterns || [])])),
        securityPatterns: Array.from(new Set([...(defaults.securityPatterns || []), ...(parsed.securityPatterns || [])])),
        securityKeywords: Array.from(new Set([...(defaults.securityKeywords || []), ...(parsed.securityKeywords || [])])),
        excludeFromContext: Array.from(new Set([...(defaults.excludeFromContext || []), ...(parsed.excludeFromContext || [])]))
      };
    } catch (err) {
      console.warn(`[config] Failed to parse ${CONFIG_FILE_NAME}, using default config.`, err);
      return getDefaultConfig();
    }
  }

  return getDefaultConfig();
}

/**
 * Saves configuration to .context-gen.json in the specified project directory.
 * @param {string} projectPath 
 * @param {object} config 
 */
export function saveConfig(projectPath, config) {
  const resolvedPath = path.resolve(projectPath || process.cwd());
  const configFilePath = path.join(resolvedPath, CONFIG_FILE_NAME);
  const data = JSON.stringify(config, null, 2);
  fs.mkdirSync(resolvedPath, { recursive: true });
  fs.writeFileSync(configFilePath, data, "utf-8");
  return configFilePath;
}