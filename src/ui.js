/**
 * @fileoverview High-performance Fancy Terminal UI components, animated progress bars,
 * gradient banners, and structured metrics cards for context-gen-cli (ctx).
 */

import chalk from "chalk";
import figlet from "figlet";

/**
 * Generates an interpolated color gradient between start and end RGB.
 * @param {string} text 
 * @param {[number,number,number]} startRgb 
 * @param {[number,number,number]} endRgb 
 * @returns {string}
 */
export function gradientText(text, startRgb = [99, 102, 241], endRgb = [6, 182, 212]) {
  const chars = Array.from(text);
  const len = chars.length || 1;
  return chars.map((char, i) => {
    const factor = i / len;
    const r = Math.round(startRgb[0] + factor * (endRgb[0] - startRgb[0]));
    const g = Math.round(startRgb[1] + factor * (endRgb[1] - startRgb[1]));
    const b = Math.round(startRgb[2] + factor * (endRgb[2] - startRgb[2]));
    return chalk.rgb(r, g, b)(char);
  }).join("");
}

/**
 * Renders the high-tech ASCII logo banner.
 */
export function printMainBanner() {
  const rawAscii = figlet.textSync("ctx", {
    font: "Slant",
    horizontalLayout: "default",
    verticalLayout: "default"
  });

  console.log("");
  console.log(gradientText(rawAscii, [139, 92, 246], [6, 182, 212]));
  console.log(
    chalk.bold.hex("#6366f1")("  ┌─────────────────────────────────────────────────────────────┐")
  );
  console.log(
    chalk.bold.hex("#6366f1")("  │ ") +
    gradientText("⚡ context-gen-cli — AI Project Context & Live MCP Server", [168, 85, 247], [56, 189, 248]) +
    chalk.bold.hex("#6366f1")(" │")
  );
  console.log(
    chalk.bold.hex("#6366f1")("  └─────────────────────────────────────────────────────────────┘")
  );
  console.log("");
}

/**
 * Renders an animated stylish terminal progress bar.
 * @param {number} percent - 0 to 100
 * @param {string} label - Current action label
 * @param {number} barWidth - Length of the bar
 */
export function renderProgressBar(percent, label = "", barWidth = 30) {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * barWidth);
  const empty = barWidth - filled;

  const filledBar = gradientText("█".repeat(filled), [139, 92, 246], [6, 182, 212]);
  const emptyBar = chalk.gray("░".repeat(empty));
  const percentText = chalk.bold.cyan(`${clamped.toString().padStart(3, " ")}%`);

  process.stdout.write(`\r  [${filledBar}${emptyBar}] ${percentText} ${chalk.dim("│")} ${chalk.white(label)} `);
}

/**
 * Executes a smooth multi-step animated pipeline with real progress bar ticks.
 * @param {Array<{ label: string, weight: number, run: () => Promise<any> }>} steps
 * @returns {Promise<any[]>}
 */
export async function runAnimatedPipeline(steps) {
  const totalWeight = steps.reduce((sum, s) => sum + (s.weight || 1), 0);
  let accumulatedWeight = 0;
  const results = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const startPct = Math.round((accumulatedWeight / totalWeight) * 100);
    const endPct = Math.round(((accumulatedWeight + (step.weight || 1)) / totalWeight) * 100);

    // Initial tick
    renderProgressBar(startPct, step.label);

    // Smooth animation ticks
    for (let p = startPct; p < endPct; p += Math.max(1, Math.round((endPct - startPct) / 5))) {
      renderProgressBar(p, step.label);
      await new Promise((r) => setTimeout(r, 20));
    }

    const res = await step.run();
    results.push(res);

    accumulatedWeight += step.weight || 1;
    renderProgressBar(endPct, chalk.green(`✓ ${step.label}`));
    await new Promise((r) => setTimeout(r, 30));
  }

  process.stdout.write("\n\n");
  return results;
}

/**
 * Prints a sleek summary metrics table.
 * @param {object} params
 */
export function printSummaryCard({
  filesCount = 0,
  secCount = 0,
  nodesCount = 0,
  edgesCount = 0,
  techStack = [],
  outputDir = "context",
  generatedFiles = []
}) {
  const border = chalk.bold.hex("#6366f1");
  const stackStr = techStack.length > 0 ? techStack.slice(0, 8).join(chalk.dim(", ")) : "General Codebase";

  console.log(border("  ┌─────────────────────────────────────────────────────────────┐"));
  console.log(border("  │ ") + chalk.bold.green("✨ Context Generation Summary") + "                              " + border("│"));
  console.log(border("  ├─────────────────────────────────────────────────────────────┤"));
  console.log(border("  │ ") + chalk.bold("📂 Scanned Files:   ") + chalk.cyan(filesCount.toString().padEnd(6)) + (secCount > 0 ? chalk.yellow(` (${secCount} excluded for security)`) : "").padEnd(31) + border("│"));
  console.log(border("  │ ") + chalk.bold("🕸️  Graph Mapped:    ") + chalk.magenta(`${nodesCount} nodes, ${edgesCount} edges`).padEnd(38) + border("│"));
  console.log(border("  │ ") + chalk.bold("⚡ Tech Stack:      ") + chalk.green(stackStr.slice(0, 38).padEnd(38)) + border("│"));
  console.log(border("  │ ") + chalk.bold("📁 Destination:     ") + chalk.yellow(`${outputDir}/`).padEnd(38) + border("│"));
  console.log(border("  ├─────────────────────────────────────────────────────────────┤"));
  console.log(border("  │ ") + chalk.bold("📦 Generated Artifacts:") + "                                    " + border("│"));

  for (const gf of generatedFiles) {
    const line = `  • ${chalk.bold.cyan(gf.name)} ${chalk.dim(`(${gf.chars.toLocaleString()} chars, ${gf.extra})`)}`;
    console.log(border("  │ ") + line.padEnd(58) + border("│"));
  }

  console.log(border("  └─────────────────────────────────────────────────────────────┘"));
  console.log("");
}

/**
 * Renders a high-contrast, color-coded Senior Engineer Context Plan or Clarification Card.
 */
export function printDistillCard(result) {
  console.log("");
  if (result.status === "needs_clarification") {
    const warn = chalk.bold.yellow;
    console.log(warn("  ╔═══════════════════════════════════════════════════════════════╗"));
    console.log(warn("  ║  ⚠️  CLARIFICATION NEEDED — Ambiguous Prompt Detected         ║"));
    console.log(warn("  ╚═══════════════════════════════════════════════════════════════╝"));
    console.log("");
    for (const line of result.output.split("\n").slice(2)) {
      if (!line.trim()) continue;
      console.log("  " + chalk.yellow("▸ ") + chalk.white(line.replace(/\*\*/g, "")));
    }
    console.log("");
    console.log(chalk.dim("  💡 Tip: Re-run with a specific file or workspace name to bypass guessing."));
    console.log("");
    return;
  }

  const border = chalk.bold.cyan;
  console.log(border("  ╔═══════════════════════════════════════════════════════════════╗"));
  console.log(border("  ║  🧠 SENIOR ENGINEER CONTEXT PLAN (EGRD Distilled)             ║"));
  console.log(border("  ╚═══════════════════════════════════════════════════════════════╝"));
  console.log("");

  const seenLines = new Set();
  for (const rawLine of result.output.split("\n")) {
    if (rawLine.startsWith("### ") || !rawLine.trim()) continue;
    const clean = rawLine.replace(/\*\*/g, "").trim();
    if (seenLines.has(clean)) continue;
    seenLines.add(clean);

    if (clean.startsWith("- Task:")) {
      console.log("  " + chalk.bold.white("🎯 " + clean.slice(2)));
    } else if (clean.startsWith("- Engineering Mode:")) {
      console.log("  " + chalk.bold.magenta("⚙️  " + clean.slice(2)));
    } else if (clean.startsWith("- Primary Files")) {
      console.log("\n  " + chalk.bold.cyan("📂 Primary Files to Reference:"));
    } else if (clean.startsWith("•")) {
      console.log("     " + chalk.green("✔ ") + chalk.bold.white(clean.slice(2)));
    } else if (clean.startsWith("- Blast Radius")) {
      // Deduplicate file paths in Blast Radius
      const [label, filesPart] = clean.slice(2).split(": ");
      const uniqueFiles = [...new Set((filesPart || "").split(", ").map((s) => s.trim()))];
      console.log("\n  " + chalk.bold.yellow(`💥 ${label}: `) + chalk.yellow(uniqueFiles.join(", ")));
    } else if (clean.startsWith("- Architecture Guardrail:")) {
      console.log("\n  " + chalk.bold.blue("🛡️  " + clean.slice(2)));
    }
  }
  console.log("");
}

/**
 * Renders a high-contrast, color-coded Senior Engineer Context Plan or Clarification Card.
 */
export function printDistillCard(result) {
  console.log("");
  if (result.status === "needs_clarification") {
    const warn = chalk.bold.yellow;
    console.log(warn("  ╔═══════════════════════════════════════════════════════════════╗"));
    console.log(warn("  ║  ⚠️  CLARIFICATION NEEDED — Ambiguous Prompt Detected         ║"));
    console.log(warn("  ╚═══════════════════════════════════════════════════════════════╝"));
    console.log("");
    for (const line of result.output.split("\n").slice(2)) {
      if (!line.trim()) continue;
      console.log("  " + chalk.yellow("▸ ") + chalk.white(line.replace(/\*\*/g, "")));
    }
    console.log("");
    console.log(chalk.dim("  💡 Tip: Re-run with a specific file or workspace name to bypass guessing."));
    console.log("");
    return;
  }

  const border = chalk.bold.cyan;
  console.log(border("  ╔═══════════════════════════════════════════════════════════════╗"));
  console.log(border("  ║  🧠 SENIOR ENGINEER CONTEXT PLAN (EGRD Distilled)             ║"));
  console.log(border("  ╚═══════════════════════════════════════════════════════════════╝"));
  console.log("");

  const seenLines = new Set();
  for (const rawLine of result.output.split("\n")) {
    if (rawLine.startsWith("### ") || !rawLine.trim()) continue;
    const clean = rawLine.replace(/\*\*/g, "").trim();
    if (seenLines.has(clean)) continue;
    seenLines.add(clean);

    if (clean.startsWith("- Task:")) {
      console.log("  " + chalk.bold.white("🎯 " + clean.slice(2)));
    } else if (clean.startsWith("- Engineering Mode:")) {
      console.log("  " + chalk.bold.magenta("⚙️  " + clean.slice(2)));
    } else if (clean.startsWith("- Primary Files")) {
      console.log("\n  " + chalk.bold.cyan("📂 Primary Files to Reference:"));
    } else if (clean.startsWith("•")) {
      console.log("     " + chalk.green("✔ ") + chalk.bold.white(clean.slice(2)));
    } else if (clean.startsWith("- Blast Radius")) {
      // Deduplicate file paths in Blast Radius
      const [label, filesPart] = clean.slice(2).split(": ");
      const uniqueFiles = [...new Set((filesPart || "").split(", ").map((s) => s.trim()))];
      console.log("\n  " + chalk.bold.yellow(`💥 ${label}: `) + chalk.yellow(uniqueFiles.join(", ")));
    } else if (clean.startsWith("- Architecture Guardrail:")) {
      console.log("\n  " + chalk.bold.blue("🛡️  " + clean.slice(2)));
    }
  }
  console.log("");
}
