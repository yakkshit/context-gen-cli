"""
context_gen.mcp.advanced_tools: Advanced MCP tools for deep code inspection, search, AST analysis, git diffs, and security validation.
"""

import ast
import fnmatch
from pathlib import Path
import re
import subprocess
from typing import Any, Dict, List, Optional

from context_gen.extractor import extract_metadata
from context_gen.graph import build_dependency_graph
from context_gen.scanner import scan_project

SENSITIVE_EXTENSIONS = {
    ".pem", ".key", ".p12", ".pfx", ".pkcs12", ".keystore",
    ".jks", ".ovpn", ".crt", ".der"
}

SENSITIVE_FILENAME_REGEX = re.compile(
    r"^(id_rsa.*|id_ed25519.*|\.env(\..+)?|secrets?(\..+)?|credentials?(\..+)?)$",
    re.IGNORECASE
)

CONTENT_SECRET_REGEXES = [
    re.compile(r"-----BEGIN [A-Z0-9_-]+ PRIVATE KEY-----", re.IGNORECASE),
    re.compile(r"-----BEGIN CERTIFICATE-----", re.IGNORECASE),
    re.compile(r"ghp_[a-zA-Z0-9]{36}"),
    re.compile(r"github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}"),
    re.compile(r"sk-[a-zA-Z0-9]{20,}"),
    re.compile(r"xox[baprs]-[a-zA-Z0-9]{10,}"),
    re.compile(r"AIza[0-9A-Za-z-_]{35}"),
    re.compile(r"AKIA[0-9A-Z]{16}")
]

LANGUAGE_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".md": "markdown",
    ".html": "html",
    ".css": "css",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".c": "c",
    ".cpp": "cpp",
    ".sh": "bash"
}


def is_sensitive_path(rel_path: str, full_path: Optional[Path] = None) -> Optional[str]:
    """Checks whether a file path or its content represents a sensitive secret."""
    path_obj = Path(rel_path)
    filename = path_obj.name
    ext = path_obj.suffix.lower()

    if ext in SENSITIVE_EXTENSIONS:
        return f"Sensitive key/certificate extension ({ext})"

    if SENSITIVE_FILENAME_REGEX.match(filename):
        return f"Sensitive secret/environment file ({filename})"

    if full_path and full_path.is_file():
        try:
            if full_path.stat().st_size <= 512 * 1024:
                content = full_path.read_text(encoding="utf-8", errors="ignore")
                for pattern in CONTENT_SECRET_REGEXES:
                    if pattern.search(content):
                        return "Contains embedded secret token or cryptographic private key"
        except Exception:
            pass

    return None


def get_code_snippet(
    file_path: str,
    function_name: Optional[str] = None,
    class_name: Optional[str] = None,
    start_line: Optional[int] = None,
    end_line: Optional[int] = None,
    project_path: str = "."
) -> Dict[str, Any]:
    """
    Reads a file and extracts the requested section (by function/class name or line range).
    Respects security boundaries.
    """
    root = Path(project_path).resolve()
    target = (root / file_path).resolve()

    if not target.is_file():
        raise FileNotFoundError(f"File not found: {file_path}")

    rel_path = target.relative_to(root).as_posix()
    sec_issue = is_sensitive_path(rel_path, target)
    if sec_issue:
        raise PermissionError(f"Access denied: {rel_path} is protected for security ({sec_issue})")

    content = target.read_text(encoding="utf-8", errors="replace")
    lines = content.splitlines(keepends=True)
    ext = target.suffix.lower()
    language = LANGUAGE_MAP.get(ext, "text")

    # 1. Function / Class extraction using Python AST for Python files
    if (function_name or class_name) and ext == ".py":
        try:
            tree = ast.parse(content, filename=str(target))
            target_node = None

            for node in ast.walk(tree):
                if function_name and isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    if node.name == function_name:
                        target_node = node
                        break
                elif class_name and isinstance(node, ast.ClassDef):
                    if node.name == class_name:
                        target_node = node
                        break

            if target_node:
                s_line = target_node.lineno
                e_line = getattr(target_node, "end_lineno", s_line)
                snippet_lines = lines[s_line - 1:e_line]
                return {
                    "path": rel_path,
                    "content": "".join(snippet_lines),
                    "startLine": s_line,
                    "endLine": e_line,
                    "language": language
                }
        except SyntaxError:
            pass

    # Fallback for JS/TS/other languages or when AST match was not found
    if function_name or class_name:
        query_name = function_name or class_name
        pattern = re.compile(rf"(?:def|function|class|const|let|var)\s+{re.escape(query_name)}\b")
        found_start = None
        for idx, line in enumerate(lines):
            if pattern.search(line):
                found_start = idx + 1
                break

        if found_start:
            s_line = max(1, found_start)
            e_line = min(len(lines), s_line + 40)
            return {
                "path": rel_path,
                "content": "".join(lines[s_line - 1:e_line]),
                "startLine": s_line,
                "endLine": e_line,
                "language": language
            }

    # 2. Line range extraction
    s_line = max(1, start_line) if start_line is not None else 1
    e_line = min(len(lines), end_line) if end_line is not None else len(lines)

    snippet = "".join(lines[s_line - 1:e_line])
    return {
        "path": rel_path,
        "content": snippet,
        "startLine": s_line,
        "endLine": e_line,
        "language": language
    }


def search_code(
    pattern: str,
    file_pattern: Optional[str] = None,
    case_sensitive: bool = False,
    max_results: int = 50,
    project_path: str = "."
) -> Dict[str, Any]:
    """
    Grep-like search across all project files respecting security and ignore rules.
    Limits to 50 results maximum.
    """
    root = Path(project_path).resolve()
    scanned = scan_project(str(root))
    files = scanned.get("files", [])

    flags = 0 if case_sensitive else re.IGNORECASE
    try:
        regex = re.compile(pattern, flags)
    except re.error:
        regex = re.compile(re.escape(pattern), flags)

    matches: List[Dict[str, Any]] = []
    limit = min(max_results, 50)

    for rel_file in files:
        if file_pattern and not fnmatch.fnmatch(rel_file, file_pattern):
            continue

        full_path = root / rel_file
        if is_sensitive_path(rel_file, full_path):
            continue

        try:
            content = full_path.read_text(encoding="utf-8", errors="ignore")
            lines = content.splitlines()

            for idx, line in enumerate(lines):
                if regex.search(line):
                    # Gather context (1 line before & after)
                    start_ctx = max(0, idx - 1)
                    end_ctx = min(len(lines), idx + 2)
                    context_block = "\n".join(lines[start_ctx:end_ctx])

                    matches.append({
                        "file": rel_file,
                        "line": line.strip(),
                        "lineNumber": idx + 1,
                        "context": context_block
                    })

                    if len(matches) >= limit:
                        return {"matches": matches, "total": len(matches), "capped": True}
        except Exception:
            continue

    return {"matches": matches, "total": len(matches), "capped": False}


def list_functions(
    file_path: str,
    project_path: str = "."
) -> Dict[str, Any]:
    """
    Parses a file and lists all declared/exported functions, classes, and signatures.
    Uses Python AST for 100% accurate Python parsing and regex heuristics for JS/TS.
    """
    root = Path(project_path).resolve()
    target = (root / file_path).resolve()

    if not target.is_file():
        raise FileNotFoundError(f"File not found: {file_path}")

    rel_path = target.relative_to(root).as_posix()
    sec_issue = is_sensitive_path(rel_path, target)
    if sec_issue:
        raise PermissionError(f"Access denied: {rel_path} is protected for security ({sec_issue})")

    content = target.read_text(encoding="utf-8", errors="replace")
    ext = target.suffix.lower()
    functions: List[Dict[str, Any]] = []

    # Python AST parsing
    if ext == ".py":
        try:
            tree = ast.parse(content, filename=str(target))
            for node in tree.body:
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    args = [a.arg for a in node.args.args]
                    sig = f"def {node.name}({', '.join(args)})"
                    doc = ast.get_docstring(node) or ""
                    functions.append({
                        "name": node.name,
                        "type": "async_function" if isinstance(node, ast.AsyncFunctionDef) else "function",
                        "line": node.lineno,
                        "signature": sig,
                        "description": doc.strip().split("\n")[0] if doc else ""
                    })
                elif isinstance(node, ast.ClassDef):
                    doc = ast.get_docstring(node) or ""
                    functions.append({
                        "name": node.name,
                        "type": "class",
                        "line": node.lineno,
                        "signature": f"class {node.name}",
                        "description": doc.strip().split("\n")[0] if doc else ""
                    })
        except SyntaxError:
            pass

    # JavaScript / TypeScript heuristic parsing
    elif ext in {".js", ".jsx", ".ts", ".tsx", ".mjs"}:
        lines = content.splitlines()
        for idx, line in enumerate(lines):
            line_no = idx + 1
            # export function ...
            m_func = re.search(r"export\s+(?:default\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\((.*?)\)", line)
            if m_func:
                functions.append({
                    "name": m_func.group(1),
                    "type": "function",
                    "line": line_no,
                    "signature": f"function {m_func.group(1)}({m_func.group(2)})",
                    "description": "Exported function"
                })
                continue

            # export const name = ...
            m_const = re.search(r"export\s+const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\((.*?)\)\s*=>", line)
            if m_const:
                functions.append({
                    "name": m_const.group(1),
                    "type": "arrow_function",
                    "line": line_no,
                    "signature": f"const {m_const.group(1)} = ({m_const.group(2)}) =>",
                    "description": "Exported arrow function"
                })
                continue

            # export class ...
            m_class = re.search(r"export\s+(?:default\s+)?class\s+([a-zA-Z0-9_$]+)", line)
            if m_class:
                functions.append({
                    "name": m_class.group(1),
                    "type": "class",
                    "line": line_no,
                    "signature": f"class {m_class.group(1)}",
                    "description": "Exported class"
                })

    return {"functions": functions, "filePath": rel_path}


def get_git_diff(
    commits: int = 5,
    file_path: Optional[str] = None,
    project_path: str = "."
) -> Dict[str, Any]:
    """
    Executes git log/diff safely to return recent changes and commits.
    """
    root = Path(project_path).resolve()
    commits_list: List[Dict[str, str]] = []
    diff_output = ""

    try:
        # Get commit log
        cmd_log = ["git", "log", f"-n{max(1, commits)}", "--pretty=format:%H|%an|%ad|%s", "--date=short"]
        if file_path:
            cmd_log.extend(["--", file_path])

        res_log = subprocess.run(cmd_log, cwd=root, capture_output=True, text=True, check=False)
        if res_log.returncode == 0 and res_log.stdout.strip():
            for entry in res_log.stdout.strip().split("\n"):
                parts = entry.split("|", 3)
                if len(parts) == 4:
                    commits_list.append({
                        "hash": parts[0][:8],
                        "author": parts[1],
                        "date": parts[2],
                        "message": parts[3]
                    })

        # Get diff of recent changes or unstaged changes
        cmd_diff = ["git", "diff", "HEAD~1"] if commits_list else ["git", "diff"]
        if file_path:
            cmd_diff.extend(["--", file_path])

        res_diff = subprocess.run(cmd_diff, cwd=root, capture_output=True, text=True, check=False)
        if res_diff.returncode == 0:
            diff_output = res_diff.stdout[:8000]
        else:
            diff_output = "No active diff or repository not initialized."
    except Exception as err:
        diff_output = f"Git execution error: {str(err)}"

    return {
        "diff": diff_output,
        "commits": commits_list
    }


def explain_architecture(
    depth: str = "high",
    project_path: str = "."
) -> Dict[str, Any]:
    """
    Generates a natural language architecture summary from graph and metadata.
    Supported depths: 'high', 'medium', 'deep'.
    """
    root = Path(project_path).resolve()
    scanned = scan_project(str(root))
    files = scanned.get("files", [])
    metadata = extract_metadata(str(root), files)
    graph = build_dependency_graph(files, str(root))

    stack = ", ".join(metadata.get("techStack", [])) or "General Codebase"
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])

    entry_points = [n["id"] for n in nodes if n.get("isEntry")]
    util_nodes = [n["id"] for n in nodes if n.get("type") == "util" or "util" in n["id"].lower()]

    diagram = ""

    if depth == "high":
        summary = (
            f"This project is a {metadata.get('name', root.name)} codebase built primarily with {stack}. "
            f"It comprises {len(files)} source files organized across {len(nodes)} modules with {len(edges)} "
            f"inter-module dependency connections. Key entry points include: {', '.join(entry_points) or 'main modules'}."
        )
    elif depth == "medium":
        summary = (
            f"### Architecture Overview: {metadata.get('name', root.name)}\n\n"
            f"- **Primary Stack**: {stack}\n"
            f"- **Entry Points**: {', '.join(entry_points) if entry_points else 'Root entry files'}\n"
            f"- **Core Modules**: {len(nodes)} modules mapped in the dependency graph\n"
            f"- **Utilities & Helpers**: {len(util_nodes)} utility modules detected\n\n"
            f"The application follows a modular structure where entry modules coordinate domain functionality "
            f"supported by core abstractions and shared utility libraries."
        )
    else:  # deep
        # Generate Mermaid diagram snippet
        mermaid_lines = ["graph TD"]
        for edge in edges[:25]:
            src = Path(edge["source"]).name.replace(".", "_")
            tgt = Path(edge["target"]).name.replace(".", "_")
            mermaid_lines.append(f"  {src} --> {tgt}")

        diagram = "\n".join(mermaid_lines)
        summary = (
            f"### In-Depth Architectural & Graph Analysis\n\n"
            f"**Workspace**: `{root.as_posix()}`\n"
            f"**Technologies**: {stack}\n"
            f"**Component Graph**: {len(nodes)} nodes, {len(edges)} directed dependency edges\n\n"
            f"#### Module Classification\n"
            f"- **Entry Points**: {len(entry_points)} ({', '.join(entry_points[:5])})\n"
            f"- **Utilities & Shared**: {len(util_nodes)} ({', '.join(util_nodes[:5])})\n"
            f"- **Graph Density**: {(len(edges) / max(1, len(nodes))):.2f} average connections per node."
        )

    return {
        "summary": summary,
        "diagrams": diagram if diagram else None
    }


def validate_security(
    project_path: str = "."
) -> Dict[str, Any]:
    """
    Runs the security validator across all project files and reports sensitive files or embedded secrets.
    """
    root = Path(project_path).resolve()
    scanned = scan_project(str(root))
    files = scanned.get("files", [])

    issues: List[Dict[str, Any]] = []

    for rel_file in files:
        full_path = root / rel_file
        reason = is_sensitive_path(rel_file, full_path)
        if reason:
            severity = "HIGH" if "key" in reason.lower() or "secret" in reason.lower() else "MEDIUM"
            issues.append({
                "file": rel_file,
                "reason": reason,
                "severity": severity
            })

    return {
        "safe": len(issues) == 0,
        "issues": issues,
        "totalScanned": len(files),
        "totalIssues": len(issues)
    }
