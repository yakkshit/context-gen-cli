import fs from "node:fs";
import os from "node:os";
import { scanRepository } from "./fingerprint.js";
import { scanProject } from "./scanner.js";
import { extractMetadata } from "./extractor.js";
import { buildDependencyGraph } from "./graph.js";

/**
 * Hardware-aware resource governor:
 * - CPU-only (zero GPU/CUDA downloads)
 * - Uses 1 core for small projects or low-spec machines, strictly capped at 2 cores max.
 */
function getHardwareBudget(fileCount) {
  const totalCores = os.cpus()?.length || 2;
  const freeMemGB = os.freemem() / (1024 ** 3);
  const optimalThreads = totalCores >= 6 && freeMemGB >= 3 && fileCount >= 80 ? 2 : 1;

  return {
    totalCores,
    freeMemGB: Number(freeMemGB.toFixed(1)),
    allocatedThreads: optimalThreads,
    useNeuralClassifier: totalCores >= 4 && freeMemGB >= 2.0,
  };
}

let embedderPromise = null;
async function getLocalTransformer(hwBudget) {
  if (!hwBudget.useNeuralClassifier) return null;
  if (!embedderPromise) {
    embedderPromise = (async () => {
      try {
        const transformers = await import("@huggingface/transformers");
        // Enforce strict CPU-only execution and 1-2 core ceiling
        if (transformers.env?.backends?.onnx?.wasm) {
          transformers.env.backends.onnx.wasm.numThreads = hwBudget.allocatedThreads;
        }
        process.env.OMP_NUM_THREADS = String(hwBudget.allocatedThreads);
        process.env.ORT_NUM_THREADS = String(hwBudget.allocatedThreads);

        return await transformers.pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
          dtype: "q8",
          device: "cpu",
        });
      } catch {
        return null;
      }
    })();
  }
  return embedderPromise;
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

const ENGINEERING_INTENTS = {
  new_feature: {
    label: "Feature Implementation",
    desc: "build create add new feature page component endpoint module",
    advice: "Mirror existing patterns in the codebase; keep new logic modular and add unit/integration coverage.",
  },
  bug_fix: {
    label: "Root-Cause Debugging & Fix",
    desc: "fix bug error crash broken failing issue debug trace",
    advice: "Reproduce the failure path first, check upstream callers in the dependency graph, and avoid band-aid patches.",
  },
  refactor_perf: {
    label: "Refactoring & Optimization",
    desc: "refactor clean optimize speed memory architecture restructure",
    advice: "Preserve existing public function signatures and exports so downstream dependents do not break.",
  },
  security_config: {
    label: "Security, Auth & Configuration",
    desc: "auth security token env permission config key middleware",
    advice: "Never hardcode secrets; validate inputs at the boundary and check existing auth guards first.",
  },
};

function computeShannonEntropy(probs) {
  let h = 0;
  for (const p of probs) {
    if (p > 1e-6) h -= p * Math.log2(p);
  }
  return h;
}

function softmax(scores, temperature = 0.35) {
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp((s - max) / temperature));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

function writeTrace(prompt, hw, mode, intent, initialH, steps, finalOutput) {
  const lines = [
    `=== EGRD SENIOR ENGINEER TRACE [${new Date().toISOString()}] ===`,
    `HARDWARE: CPU-only | ${hw.allocatedThreads}/${hw.totalCores} cores allocated | ${hw.freeMemGB} GB free RAM`,
    `ENGINE: ${mode} | INTENT: ${intent}`,
    `PROMPT: "${prompt}"`,
    `INITIAL ENTROPY (H0): ${initialH.toFixed(3)} bits`,
    `--------------------------------------------------`,
    ...steps,
    `--------------------------------------------------`,
    finalOutput,
    `==================================================\n`,
  ];
  try {
    fs.writeFileSync("/tmp/egrd-last-run.log", lines.join("\n"), "utf-8");
  } catch {}
}

export async function distillQuery(rootDir, prompt, budget = 250) {
  const signatures = scanRepository(rootDir);
  const hw = getHardwareBudget(signatures.length);

  if (signatures.length === 0) {
    return {
      status: "needs_clarification",
      entropy: 3.5,
      output: "No source files detected here. Which directory contains your project code? (e.g., `src/` or `app/`)",
    };
  }

  let graphEdges = [];
  try {
    const { files } = await scanProject(rootDir, 3);
    const metadata = await extractMetadata(rootDir, files);
    const graph = await buildDependencyGraph(files, rootDir, metadata.pkgJson);
    graphEdges = graph.edges || [];
  } catch {}

  const embedder = await getLocalTransformer(hw);
  const mode = embedder
    ? `CPU Transformer (${hw.allocatedThreads} core) + KnowledgeGraph`
    : `Lightweight Probabilistic Engine (${hw.allocatedThreads} core) + KnowledgeGraph`;

  let intentKey = "new_feature";
  let rawScores = [];

  if (embedder) {
    const promptOut = await embedder(prompt, { pooling: "mean", normalize: true });
    const promptVec = Array.from(promptOut.data);

    let bestSim = -1;
    for (const [key, cfg] of Object.entries(ENGINEERING_INTENTS)) {
      const iOut = await embedder(cfg.desc, { pooling: "mean", normalize: true });
      const sim = cosineSimilarity(promptVec, Array.from(iOut.data));
      if (sim > bestSim) {
        bestSim = sim;
        intentKey = key;
      }
    }

    for (const sig of signatures) {
      const sigText = `${sig.path} role:${sig.role} workspace:${sig.workspace} imports:${sig.imports.join(" ")} exports:${sig.exports.join(" ")}`;
      const sOut = await embedder(sigText, { pooling: "mean", normalize: true });
      rawScores.push({ sig, score: Math.max(0.01, cosineSimilarity(promptVec, Array.from(sOut.data))) });
    }
  } else {
    const words = prompt.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
    if (words.some((w) => ["fix", "bug", "error", "crash", "debug", "broken"].includes(w))) intentKey = "bug_fix";
    else if (words.some((w) => ["refactor", "clean", "optimize", "speed", "memory"].includes(w))) intentKey = "refactor_perf";
    else if (words.some((w) => ["auth", "security", "token", "env", "secret", "key"].includes(w))) intentKey = "security_config";

    rawScores = signatures.map((sig) => {
      const haystack = `${sig.path} ${sig.workspace} ${sig.role} ${sig.imports.join(" ")} ${sig.exports.join(" ")}`.toLowerCase();
      const hits = words.filter((w) => haystack.includes(w)).length;
      return { sig, score: 0.1 + hits * 0.45 };
    });
  }

  // Knowledge Graph dependency propagation
  const scoreMap = new Map(rawScores.map((r) => [r.sig.path, r]));
  for (const edge of graphEdges) {
    const src = edge.source || edge.from;
    const tgt = edge.target || edge.to;
    if (src && tgt && scoreMap.has(src) && scoreMap.has(tgt)) {
      scoreMap.get(tgt).score += scoreMap.get(src).score * 0.2;
    }
  }

  const probs = softmax(rawScores.map((r) => r.score), 0.35);
  const initialH = computeShannonEntropy(probs);

  const ranked = rawScores
    .map((r, idx) => ({
      sig: r.sig,
      prob: probs[idx],
      deltaH: probs[idx] * initialH * 1.6,
      ratio: (probs[idx] * initialH * 1.6) / r.sig.tokensEstimate,
    }))
    .sort((a, b) => b.ratio - a.ratio);

  const workspaces = [...new Set(signatures.map((s) => s.workspace))].filter((w) => w !== "root");
  const multiWorkspaceAmbiguity =
    workspaces.length > 1 &&
    !workspaces.some((w) => prompt.toLowerCase().includes(w.split("/").pop().toLowerCase()));
  const isVaguePrompt = prompt.trim().split(/\s+/).length <= 3 && ranked[0]?.prob < 0.22;

  let entropy = initialH;
  const picked = [];
  const traceSteps = [];
  let usedTokens = 0;

  for (const item of ranked) {
    if (usedTokens + item.sig.tokensEstimate > budget || entropy < 1.5) break;
    if (item.prob < 0.05 && picked.length > 0) break;
    picked.push(item.sig);
    usedTokens += item.sig.tokensEstimate;
    entropy = Math.max(0.35, entropy - item.deltaH);
    traceSteps.push(
      `[Iter ${picked.length}] Picked: ${item.sig.path} (p=${(item.prob * 100).toFixed(1)}%) | -${item.deltaH.toFixed(2)} bits | +${item.sig.tokensEstimate} tok -> H = ${entropy.toFixed(3)}`
    );
  }

  const intentMeta = ENGINEERING_INTENTS[intentKey];

  // Ask-With-Examples Gate when ambiguous
  if (entropy >= 1.5 || isVaguePrompt || multiWorkspaceAmbiguity) {
    const sampleFiles = ranked.slice(0, 3).map((r) => r.sig.path);
    const questions = [];

    if (multiWorkspaceAmbiguity) {
      questions.push(
        `1. **Target Workspace:** Which package should I modify? (e.g., \`${workspaces.join("` or `")}\`)`
      );
    }
    questions.push(
      `${questions.length + 1}. **Implementation Pattern:** Should I extend an existing module? (e.g., *"Follow \`${sampleFiles[0] || "src/index.js"}\`"* or *"Create a standalone module"*)`
    );
    questions.push(
      `${questions.length + 1}. **Side Effects & Persistence:** Should this persist state/files or stay stateless? (e.g., *"Save to disk/DB"* vs *"Return computed output only"*)`
    );

    const output = [
      `CLARIFICATION NEEDED (Before Writing Code):`,
      `I detected **${intentMeta.label}**, but the scope has multiple valid interpretations. Please clarify:\n`,
      ...questions,
    ].join("\n");

    writeTrace(prompt, hw, mode, intentMeta.label, initialH, traceSteps, output);
    return { status: "needs_clarification", entropy, intent: intentMeta.label, output };
  }

  // Senior Engineer Blueprint Output
  const pickedPaths = new Set(picked.map((p) => p.path));
  const blastRadius = graphEdges
    .filter((e) => pickedPaths.has(e.target || e.to))
    .map((e) => e.source || e.from)
    .filter((p) => !pickedPaths.has(p))
    .slice(0, 4);

  const refs = picked.map(
    (p) =>
      `  • ${p.path} [${p.language}/${p.role}] — exports: [${p.exports.slice(0, 4).join(", ") || "default"}], imports: [${p.imports.slice(0, 4).join(", ")}]`
  );

  const output = [
    `### Senior Engineer Context Plan (${usedTokens} tokens | CPU: ${hw.allocatedThreads} core)`,
    `- **Task:** ${prompt}`,
    `- **Engineering Mode:** ${intentMeta.label}`,
    `- **Primary Files to Reference:**`,
    ...refs,
    ...(blastRadius.length > 0
      ? [`- **Blast Radius (Check for breaking changes):** ${blastRadius.join(", ")}`]
      : []),
    `- **Architecture Guardrail:** ${intentMeta.advice}`,
  ].join("\n");

  writeTrace(prompt, hw, mode, intentMeta.label, initialH, traceSteps, output);
  return { status: "ready", entropy, intent: intentMeta.label, output };
}
