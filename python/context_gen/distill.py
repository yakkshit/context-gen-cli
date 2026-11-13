import os
import re
import math
from pathlib import Path

IGNORE_DIRS = {
    "node_modules", ".git", ".next", "dist", "build", ".graviton",
    "target", "__pycache__", ".venv", "venv", ".dart_tool", "bin", "obj",
    "test", "tests", "context", "public",
}

SUPPORTED_EXT = {
    ".ts": "ts", ".tsx": "ts", ".js": "js", ".jsx": "js",
    ".py": "python", ".rs": "rust", ".go": "go", ".dart": "dart", ".cs": "csharp",
}

def get_hardware_budget(file_count: int) -> dict:
    total_cores = os.cpu_count() or 2
    allocated = 2 if (total_cores >= 6 and file_count >= 80) else 1
    return {"total_cores": total_cores, "allocated_threads": allocated}

def scan_signatures(root_dir: Path) -> list[dict]:
    sigs = []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS and not d.startswith(".") and not d.endswith(".egg-info")]
        for fname in filenames:
            ext = Path(fname).suffix
            if ext not in SUPPORTED_EXT:
                continue
            full_path = Path(dirpath) / fname
            rel_path = str(full_path.relative_to(root_dir))
            try:
                code = full_path.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue

            imports = re.findall(r"(?:import|from|use|using)\s+['\"]?([\w./:-]+)", code)[:6]
            exports = re.findall(r"(?:export\s+(?:async\s+)?(?:function|const|class)|def|class|pub\s+fn|func)\s+([A-Za-z_]\w*)", code)[:6]
            tokens = max(10, len(f"{rel_path} {' '.join(imports)} {' '.join(exports)}") // 4)
            sigs.append({
                "path": rel_path,
                "lang": SUPPORTED_EXT[ext],
                "imports": list(dict.fromkeys(imports)),
                "exports": list(dict.fromkeys(exports)),
                "tokens": tokens,
            })
    return sigs

def distill_query(root_dir: str, prompt: str, budget: int = 250) -> dict:
    root = Path(root_dir).resolve()
    sigs = scan_signatures(root)
    hw = get_hardware_budget(len(sigs))

    if not sigs:
        return {"status": "needs_clarification", "output": "No source files found. Which directory contains your code?"}

    words = [w for w in re.split(r"\W+", prompt.lower()) if len(w) > 2]
    scored = []
    for s in sigs:
        haystack = f"{s['path']} {' '.join(s['imports'])} {' '.join(s['exports'])}".lower()
        hits = sum(1 for w in words if w in haystack)
        scored.append((s, 0.1 + hits * 0.45))

    max_s = max(sc for _, sc in scored)
    exps = [math.exp((sc - max_s) / 0.35) for _, sc in scored]
    total_exp = sum(exps)
    probs = [e / total_exp for e in exps]
    initial_h = -sum(p * math.log2(p) for p in probs if p > 1e-6)

    ranked = sorted(
        [(s, p, (p * initial_h * 1.6), (p * initial_h * 1.6) / s["tokens"]) for (s, _), p in zip(scored, probs)],
        key=lambda x: x[3],
        reverse=True,
    )

    entropy = initial_h
    picked = []
    used_tokens = 0
    for sig, prob, delta_h, _ in ranked:
        if used_tokens + sig["tokens"] > budget or entropy < 1.5:
            break
        if prob < 0.05 and picked:
            break
        picked.append(sig)
        used_tokens += sig["tokens"]
        entropy = max(0.35, entropy - delta_h)

    if entropy >= 1.5 or (len(words) <= 3 and ranked[0][1] < 0.22):
        sample = ranked[0][0]["path"] if ranked else "src/main.py"
        output = (
            f"CLARIFICATION NEEDED (Before Writing Code):\n"
            f"1. **Implementation Pattern:** Should I extend an existing module? (e.g., *Follow `{sample}`* or *Create a standalone file*)\n"
            f"2. **Side Effects:** Should this persist state/files or run read-only?"
        )
        return {"status": "needs_clarification", "output": output}

    refs = "\n".join(
        f"  • {p['path']} [{p['lang']}] — exports: [{', '.join(p['exports'][:4])}], imports: [{', '.join(p['imports'][:4])}]"
        for p in picked
    )
    output = (
        f"### Senior Engineer Context Plan ({used_tokens} tokens | CPU: {hw['allocated_threads']} core)\n"
        f"- **Task:** {prompt}\n"
        f"- **Primary Files to Reference:**\n{refs}\n"
        f"- **Architecture Guardrail:** Match existing imports, function signatures, and module boundaries."
    )
    return {"status": "ready", "output": output}
