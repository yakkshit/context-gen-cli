"""
context_gen.extractor: Extracts project metadata, tech stack, dependencies, and file descriptions.
"""

import ast
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

FRAMEWORK_PATTERNS = {
    "FastAPI": ["fastapi"],
    "Django": ["django"],
    "Flask": ["flask"],
    "Typer": ["typer"],
    "Click": ["click"],
    "PyTorch": ["torch", "pytorch"],
    "TensorFlow": ["tensorflow"],
    "Pandas": ["pandas"],
    "NumPy": ["numpy"],
    "Pydantic": ["pydantic"],
    "SQLAlchemy": ["sqlalchemy"],
    "Celery": ["celery"],
    "Pytest": ["pytest"],
    "Rich": ["rich"]
}


def _strip_markdown(text: str) -> str:
    """Removes markdown syntax like headers, asterisks, links, and bold tags."""
    clean = re.sub(r"#+\s*", "", text)
    clean = re.sub(r"\*\*([^*]+)\*\*", r"\1", clean)
    clean = re.sub(r"\*([^*]+)\*", r"\1", clean)
    clean = re.sub(r"`([^`]+)`", r"\1", clean)
    clean = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", clean)
    clean = re.sub(r"\n+", " ", clean)
    return clean.strip()


def extract_overview(root: Path, max_chars: int = 350) -> str:
    """Extracts project overview summary from README.md or fallback."""
    for readme_name in ["README.md", "readme.md", "README.rst", "README.txt", "README"]:
        readme_path = root / readme_name
        if readme_path.is_file():
            try:
                content = readme_path.read_text(encoding="utf-8", errors="ignore").strip()
                if content:
                    lines = [l.strip() for l in content.split("\n") if l.strip() and not l.startswith("#")]
                    summary = " ".join(lines[:4])
                    clean_summary = _strip_markdown(summary)
                    if len(clean_summary) > max_chars:
                        return clean_summary[:max_chars].rstrip() + "..."
                    return clean_summary or f"Project overview based on {readme_name}."
            except Exception:
                pass

    return f"Project workspace rooted at {root.name}."


def extract_dependencies(root: Path) -> Dict[str, Dict[str, str]]:
    """Extracts dependencies from requirements.txt, pyproject.toml, or setup.py."""
    prod_deps: Dict[str, str] = {}
    dev_deps: Dict[str, str] = {}

    req_path = root / "requirements.txt"
    if req_path.is_file():
        try:
            for line in req_path.read_text(encoding="utf-8", errors="ignore").splitlines():
                line = line.strip()
                if line and not line.startswith("#"):
                    match = re.match(r"^([a-zA-Z0-9_\-\.]+)([=<>!~]+.*)?$", line)
                    if match:
                        prod_deps[match.group(1)] = match.group(2) or "latest"
        except Exception:
            pass

    pyproject_path = root / "pyproject.toml"
    if pyproject_path.is_file():
        try:
            content = pyproject_path.read_text(encoding="utf-8", errors="ignore")
            # Simple regex parser for pyproject dependencies list
            dep_matches = re.findall(r'"([a-zA-Z0-9_\-\.]+)([=<>!~]+[^"]*)?"', content)
            for pkg, ver in dep_matches:
                if pkg not in {"setuptools", "wheel", "pytest", "build", "twine"}:
                    prod_deps[pkg] = ver or "latest"
                else:
                    dev_deps[pkg] = ver or "latest"
        except Exception:
            pass

    return {
        "production": prod_deps,
        "development": dev_deps
    }


def extract_tech_stack(root: Path, files: List[str], deps: Dict[str, Dict[str, str]]) -> List[str]:
    """Detects technologies and frameworks present in the codebase."""
    stack: List[str] = []

    has_py = any(f.endswith(".py") for f in files)
    has_js = any(f.endswith((".js", ".ts", ".jsx", ".tsx")) for f in files)
    has_html = any(f.endswith((".html", ".css")) for f in files)

    if has_py or (root / "pyproject.toml").is_file() or (root / "requirements.txt").is_file():
        stack.append("Python")
    if has_js or (root / "package.json").is_file():
        stack.append("JavaScript/Node.js")
    if has_html:
        stack.append("HTML/CSS")

    all_dep_names = {k.lower() for k in deps.get("production", {})}

    for framework, keywords in FRAMEWORK_PATTERNS.items():
        if any(kw in all_dep_names for kw in keywords):
            if framework not in stack:
                stack.append(framework)

    return stack or ["Python"]


def extract_file_description(file_path: Path) -> str:
    """Infers a file's purpose from module docstring or top comments."""
    if file_path.suffix == ".py":
        try:
            source = file_path.read_text(encoding="utf-8", errors="ignore")
            tree = ast.parse(source, filename=str(file_path))
            docstring = ast.get_docstring(tree)
            if docstring:
                return _strip_markdown(docstring.strip().split("\n")[0])
        except Exception:
            pass

    try:
        lines = file_path.read_text(encoding="utf-8", errors="ignore").splitlines()[:15]
        for line in lines:
            line = line.strip()
            if line.startswith(("#", "//", "/*")):
                cleaned = _strip_markdown(line.lstrip("#/*").strip())
                if cleaned and len(cleaned) > 5:
                    return cleaned
    except Exception:
        pass

    return f"Source file: {file_path.name}"


def extract_metadata(root_path: str, files: List[str]) -> Dict[str, Any]:
    """
    Extracts high-level metadata, tech stack, descriptions, and dependencies.

    Args:
        root_path (str): Project root directory.
        files (List[str]): Scanned project files.

    Returns:
        Dict[str, Any]: Extracted metadata.
    """
    root = Path(root_path).resolve()
    overview = extract_overview(root)
    dependencies = extract_dependencies(root)
    tech_stack = extract_tech_stack(root, files, dependencies)

    key_files: List[Dict[str, str]] = []
    # Identify top priority files
    top_candidates = [
        f for f in files if f.endswith((".py", ".js", ".ts", ".json", ".toml", ".md"))
        and not f.startswith("test")
    ][:12]

    for rel_file in top_candidates:
        full_path = root / rel_file
        desc = extract_file_description(full_path)
        key_files.append({"path": rel_file, "description": desc})

    return {
        "overview": overview,
        "techStack": tech_stack,
        "dependencies": dependencies,
        "keyFiles": key_files,
        "projectPath": str(root)
    }
