import fs from "node:fs/promises";
import path from "node:path";
import ignore from "ignore";
import { getDefaultConfig } from "./config.js";

const SENSITIVE_EXTENSIONS = new Set([
  ".pem",
  ".key",
  ".p12",
  ".pfx",
  ".pkcs12",
  ".keystore",
  ".jks",
  ".ovpn",
  ".crt",
  ".der"
]);

const SENSITIVE_FILENAME_REGEX = /^(id_rsa.*|id_ed25519.*|\.env(\..+)?|secrets?(\..+)?|credentials?(\..+)?)$/i;

const CONTENT_SECRET_REGEXES = [
  /-----BEGIN [A-Z0-9_-]+ PRIVATE KEY-----/i,
  /-----BEGIN CERTIFICATE-----/i,
  /ghp_[a-zA-Z0-9]{36}/,
  /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /xox[baprs]-[a-zA-Z0-9]{10,}/,
  /AIza[0-9A-Za-z-_]{35}/,
  /AKIA[0-9A-Z]{16}/
];

export async function scanForSensitiveFiles(files, rootPath, config = null) {
  const activeConfig = config || getDefaultConfig();
  const resolvedRoot = path.resolve(rootPath);

  const securityPatterns = activeConfig.securityPatterns || [];
  const securityKeywords = (activeConfig.securityKeywords || []).map((k) => String(k).toUpperCase());

  const ig = ignore();
  if (securityPatterns.length > 0) {
    ig.add(securityPatterns);
  }

  const sensitiveFiles = [];
  const reasons = {};
  const safeFiles = [];

  for (const relFile of files) {
    const filename = path.basename(relFile);
    const ext = path.extname(relFile).toLowerCase();

    if (SENSITIVE_EXTENSIONS.has(ext)) {
      sensitiveFiles.push(relFile);
      reasons[relFile] = `Sensitive key/certificate file extension (${ext})`;
      continue;
    }

    if (SENSITIVE_FILENAME_REGEX.test(filename)) {
      sensitiveFiles.push(relFile);
      reasons[relFile] = `Sensitive environment or secret filename (${filename})`;
      continue;
    }

    if (ig.ignores(relFile) || ig.ignores(filename)) {
      sensitiveFiles.push(relFile);
      reasons[relFile] = "Matched security exclusion pattern";
      continue;
    }

    const fullPath = path.join(resolvedRoot, relFile);
    try {
      const stats = await fs.stat(fullPath);
      if (stats.size > 1024 * 1024) {
        safeFiles.push(relFile);
        continue;
      }

      const content = await fs.readFile(fullPath, "utf-8");

      let foundPattern = null;
      for (const regex of CONTENT_SECRET_REGEXES) {
        if (regex.test(content)) {
          foundPattern = "Detected cryptographic key or raw API token";
          break;
        }
      }

      if (foundPattern) {
        sensitiveFiles.push(relFile);
        reasons[relFile] = foundPattern;
        continue;
      }

      let foundKeyword = null;
      for (const keyword of securityKeywords) {
        const pattern = new RegExp(`\\b${keyword}\\s*[:=]\\s*["\x27\x60][^"\x27\x60\\s]{6,}["\x27\x60]`, "i");
        if (pattern.test(content)) {
          foundKeyword = `Contains sensitive assignment for ${keyword}`;
          break;
        }
      }

      if (foundKeyword) {
        sensitiveFiles.push(relFile);
        reasons[relFile] = foundKeyword;
        continue;
      }

      safeFiles.push(relFile);
    } catch {
      safeFiles.push(relFile);
    }
  }

  return {
    sensitiveFiles,
    reasons,
    safeFiles
  };
}