import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import dotenv from "dotenv";

/**
 * Ensures security files (.env, .env.*, .context-gen-key, mcp.md) are in .gitignore.
 * @param {string} rootDir - Project root path.
 */
export async function ensureGitignoreEntries(rootDir) {
  const gitignorePath = path.join(rootDir, ".gitignore");
  const entriesToAdd = [".env", ".env.*", ".context-gen-key", "mcp.md"];
  try {
    let content = "";
    try {
      content = await fs.readFile(gitignorePath, "utf-8");
    } catch {
      // .gitignore does not exist yet
    }

    const lines = content.split("\n").map((l) => l.trim());
    const missing = entriesToAdd.filter((entry) => !lines.includes(entry));

    if (missing.length > 0) {
      const suffix = content.endsWith("\n") || content.length === 0 ? "" : "\n";
      const appended = suffix + "# context-gen-cli security & secrets\n" + missing.join("\n") + "\n";
      await fs.writeFile(gitignorePath, content + appended, "utf-8");
    }
  } catch {
    // Gracefully handle if gitignore is read-only
  }
}

/**
 * Retrieves existing API key from .env or generates and saves a new one.
 * @param {string} rootDir - Project root path.
 * @param {string|null} [providedKey=null] - User-supplied key via CLI flag.
 * @returns {Promise<{ key: string, isNew: boolean }>}
 */
export async function getOrCreateApiKey(rootDir, providedKey = null) {
  await ensureGitignoreEntries(rootDir);

  const envPath = path.join(rootDir, ".env");
  dotenv.config({ path: envPath });

  // 1. If user provided a custom key via CLI
  if (providedKey && typeof providedKey === "string" && providedKey.trim()) {
    const key = providedKey.trim();
    await saveApiKeyToEnv(envPath, key);
    return { key, isNew: false };
  }

  // 2. Check if CONTEXT_GEN_API_KEY exists in process.env or .env file
  let existingEnvContent = "";
  try {
    existingEnvContent = await fs.readFile(envPath, "utf-8");
    const match = existingEnvContent.match(/^CONTEXT_GEN_API_KEY\s*=\s*(.+)$/m);
    if (match && match[1]?.trim()) {
      const key = match[1].trim().replace(/^["']|["']$/g, "");
      return { key, isNew: false };
    }
  } catch {
    // .env does not exist
  }

  if (process.env.CONTEXT_GEN_API_KEY) {
    const key = process.env.CONTEXT_GEN_API_KEY.trim();
    await saveApiKeyToEnv(envPath, key);
    return { key, isNew: false };
  }

  // 3. Generate a new secure 32-byte hex key
  const newKey = crypto.randomBytes(32).toString("hex");
  await saveApiKeyToEnv(envPath, newKey);

  return { key: newKey, isNew: true };
}

/**
 * Writes or appends CONTEXT_GEN_API_KEY to the .env file.
 * @param {string} envPath - Absolute path to .env file.
 * @param {string} key - API Key value.
 */
async function saveApiKeyToEnv(envPath, key) {
  try {
    let content = "";
    try {
      content = await fs.readFile(envPath, "utf-8");
    } catch {
      // File doesn't exist
    }

    if (/^CONTEXT_GEN_API_KEY\s*=/m.test(content)) {
      content = content.replace(/^CONTEXT_GEN_API_KEY\s*=.*$/m, `CONTEXT_GEN_API_KEY=${key}`);
    } else {
      const suffix = content.endsWith("\n") || content.length === 0 ? "" : "\n";
      content += `${suffix}CONTEXT_GEN_API_KEY=${key}\n`;
    }

    await fs.writeFile(envPath, content, "utf-8");
  } catch (err) {
    console.warn("⚠️  Could not write API key to .env:", err.message);
  }
}

/**
 * Express middleware to validate X-API-Key header.
 * @param {string} expectedKey - The expected valid API key.
 * @returns {import("express").RequestHandler}
 */
export function createAuthMiddleware(expectedKey) {
  return (req, res, next) => {
    const headerKey = req.headers["x-api-key"];
    const authHeader = req.headers["authorization"];
    let token = headerKey;

    if (!token && authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }
    if (!token && req.query?.apiKey) {
      token = req.query.apiKey;
    }

    if (!token || token !== expectedKey) {
      return res.status(401).json({
        jsonrpc: "2.0",
        error: {
          code: 401,
          message: "Unauthorized: Missing or invalid X-API-Key header."
        }
      });
    }

    next();
  };
}
