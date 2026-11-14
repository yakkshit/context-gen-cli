"""
context_gen.scanner: Directory walker and .gitignore filtering.
"""

from pathlib import Path
from typing import Any, List
import pathspec

DEFAULT_IGNORES: List[str] = [
    "__pycache__",
    "__pycache__/**",
    "*.pyc",
    ".git",
    ".git/**",
    ".venv",
    ".venv/**",
    ".venv*",
    ".venv*/**",
    "venv",
    "venv/**",
    "venv*",
    "venv*/**",
    "*venv*",
    "*venv*/**",
    "env",
    "env/**",
    "site-packages",
    "site-packages/**",
    ".pytest_cache",
    ".pytest_cache/**",
    ".mypy_cache",
    ".mypy_cache/**",
    ".ruff_cache",
    ".ruff_cache/**",
    "node_modules",
    "node_modules/**",
    ".next",
    ".next/**",
    ".turbo",
    ".turbo/**",
    ".DS_Store",
    "context",
    "context/**",
    ".env*",
    "secrets",
    "secrets/**",
    "*.pem",
    "*.key",
    "dist",
    "dist/**",
    "build",
    "build/**",
    "*.egg-info",
    "*.egg-info/**"
]


def load_gitignore(root: Path) -> pathspec.PathSpec:
    """
    Loads and compiles ignore rules from all standard ignore files (.gitignore, .npmignore, etc.)
    along with default security ignores.

    Args:
        root (Path): The project root directory.

    Returns:
        pathspec.PathSpec: Compiled path matcher.
    """
    patterns: List[str] = list(DEFAULT_IGNORES)

    standard_ignore_files = [
        ".gitignore",
        ".npmignore",
        ".dockerignore",
        ".contextignore",
        ".ignore",
        ".eslintignore",
        ".prettierignore"
    ]

    for ignore_name in standard_ignore_files:
        ignore_path = root / ignore_name
        if ignore_path.is_file():
            try:
                with open(ignore_path, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        stripped = line.strip()
                        if stripped and not stripped.startswith("#"):
                            patterns.append(stripped)
            except Exception:
                pass

    return pathspec.PathSpec.from_lines("gitignore", patterns)


def generate_tree(root: Path, spec: pathspec.PathSpec, max_depth: int = 3) -> str:
    """
    Builds a visual ASCII directory tree string.

    Args:
        root (Path): Project root directory.
        spec (pathspec.PathSpec): Ignore pattern matcher.
        max_depth (int): Max level of recursion (1-indexed).

    Returns:
        str: Formatted tree string.
    """
    lines: List[str] = [f"{root.name}/"]

    def _build_tree(current_dir: Path, prefix: str = "", depth: int = 1) -> None:
        if depth > max_depth:
            return

        try:
            entries = sorted(list(current_dir.iterdir()), key=lambda e: (not e.is_dir(), e.name.lower()))
        except PermissionError:
            return

        # Filter out ignored entries
        visible_entries: List[Path] = []
        for entry in entries:
            try:
                rel = entry.relative_to(root).as_posix()
            except ValueError:
                continue

            rel_test = f"{rel}/" if entry.is_dir() else rel
            if not spec.match_file(rel_test):
                visible_entries.append(entry)

        for i, entry in enumerate(visible_entries):
            is_last = (i == len(visible_entries) - 1)
            connector = "└── " if is_last else "├── "
            display_name = f"{entry.name}/" if entry.is_dir() else entry.name
            lines.append(f"{prefix}{connector}{display_name}")

            if entry.is_dir():
                sub_prefix = prefix + ("    " if is_last else "│   ")
                _build_tree(entry, sub_prefix, depth + 1)

    _build_tree(root, "", 1)
    return "\n".join(lines)


def scan_project(root_path: str, max_depth: int = 3) -> dict[str, Any]:
    """
    Scans a directory, filtering against .gitignore, and constructs a file list and tree.

    Args:
        root_path (str): Path to the target project directory.
        max_depth (int): Depth limit for directory tree rendering.

    Returns:
        dict[str, Any]: Dictionary containing 'files' (list of relative paths) and 'tree' (string).
    """
    root = Path(root_path).resolve()
    if not root.exists() or not root.is_dir():
        raise ValueError(f"Target path does not exist or is not a directory: {root_path}")

    spec = load_gitignore(root)
    files: List[str] = []

    for item in root.rglob("*"):
        if item.is_file():
            try:
                rel = item.relative_to(root).as_posix()
            except ValueError:
                continue

            if not spec.match_file(rel):
                files.append(rel)

    files = sorted(files)
    tree_str = generate_tree(root, spec, max_depth)

    return {
        "files": files,
        "tree": tree_str
    }
