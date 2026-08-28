"""
context_gen.graph: AST-based Python dependency graph builder.
"""

import ast
import logging
from pathlib import Path
from typing import Any, Dict, List, Set

logger = logging.getLogger("context_gen.graph")

ENTRY_CANDIDATES = {"main.py", "app.py", "cli.py", "index.py", "server.py", "manage.py", "run.py"}
UTIL_KEYWORDS = {"util", "utils", "helper", "helpers", "common", "tool", "tools", "config", "constant", "constants"}


def _resolve_module_to_file(
    module_name: str,
    from_file: str,
    level: int,
    available_files: Set[str],
    root_path: Path
) -> List[str]:
    """
    Resolves an AST import target to a concrete file in available_files.

    Args:
        module_name (str): Module path (e.g. 'utils', 'models.user').
        from_file (str): Relative path of the importing file.
        level (int): Relative import level (0 for absolute, 1 for ., 2 for .., etc.).
        available_files (Set[str]): Set of all scanned project files.
        root_path (Path): Absolute project root path.

    Returns:
        List[str]: Resolved matching file paths in the project.
    """
    resolved: List[str] = []
    current_file_path = Path(from_file)
    current_dir = current_file_path.parent

    # Determine base directory for resolution
    if level > 0:
        # Relative import
        base_dir = current_dir
        for _ in range(level - 1):
            base_dir = base_dir.parent
    else:
        # Absolute import in project root or relative to current_dir
        base_dir = Path(".")

    module_parts = module_name.split(".") if module_name else []
    module_rel_path = "/".join(module_parts)

    candidates: List[str] = []

    if module_rel_path:
        # 1. module as a .py file from base_dir: base_dir/module.py
        candidates.append((base_dir / f"{module_rel_path}.py").as_posix())
        # 2. module as a package: base_dir/module/__init__.py
        candidates.append((base_dir / module_rel_path / "__init__.py").as_posix())

        # 3. If level == 0, also try relative to current_dir
        if level == 0 and current_dir != Path("."):
            candidates.append((current_dir / f"{module_rel_path}.py").as_posix())
            candidates.append((current_dir / module_rel_path / "__init__.py").as_posix())

    # Normalize candidate paths (strip leading './' etc.)
    for cand in candidates:
        norm = Path(cand).as_posix()
        if norm.startswith("./"):
            norm = norm[2:]
        if norm in available_files:
            resolved.append(norm)

    return resolved


def build_dependency_graph(files: List[str], root_path: str) -> Dict[str, Any]:
    """
    Builds a module dependency graph from project files using Python's AST parser.

    Args:
        files (List[str]): List of relative file paths in the project.
        root_path (str): Root project directory path.

    Returns:
        Dict[str, Any]: Graph structure matching MCP context schema.
    """
    root = Path(root_path).resolve()
    available_files: Set[str] = set(files)
    py_files = [f for f in files if f.endswith(".py")]

    imports_map: Dict[str, Set[str]] = {f: set() for f in py_files}
    imported_by_map: Dict[str, Set[str]] = {f: set() for f in py_files}
    edges: List[Dict[str, str]] = []
    seen_edges: Set[tuple[str, str]] = set()

    for py_file in py_files:
        full_path = root / py_file
        try:
            with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                source = f.read()
            tree = ast.parse(source, filename=py_file)
        except (SyntaxError, UnicodeDecodeError) as err:
            logger.warning("Skipping syntax-invalid Python file %s: %s", py_file, err)
            continue
        except Exception as err:
            logger.warning("Error reading %s: %s", py_file, err)
            continue

        for node in ast.walk(tree):
            # Handle standard import statements: import a, b as c
            if isinstance(node, ast.Import):
                for alias in node.names:
                    targets = _resolve_module_to_file(
                        alias.name,
                        py_file,
                        level=0,
                        available_files=available_files,
                        root_path=root
                    )
                    for target in targets:
                        if target != py_file:
                            imports_map[py_file].add(target)
                            imported_by_map[target].add(py_file)
                            edge_key = (py_file, target)
                            if edge_key not in seen_edges:
                                seen_edges.add(edge_key)
                                edges.append({"from": py_file, "to": target, "type": "import"})

            # Handle from ... import statements: from .models import User, or from utils import helper
            elif isinstance(node, ast.ImportFrom):
                module_name = node.module or ""
                targets = _resolve_module_to_file(
                    module_name,
                    py_file,
                    level=node.level,
                    available_files=available_files,
                    root_path=root
                )

                # If from package import submodule (e.g. from models import user)
                if not targets and node.names:
                    for alias in node.names:
                        sub_module = f"{module_name}.{alias.name}" if module_name else alias.name
                        sub_targets = _resolve_module_to_file(
                            sub_module,
                            py_file,
                            level=node.level,
                            available_files=available_files,
                            root_path=root
                        )
                        targets.extend(sub_targets)

                for target in targets:
                    if target != py_file:
                        imports_map[py_file].add(target)
                        imported_by_map[target].add(py_file)
                        edge_key = (py_file, target)
                        if edge_key not in seen_edges:
                            seen_edges.add(edge_key)
                            edges.append({"from": py_file, "to": target, "type": "import"})

    entry_points: List[str] = []
    utilities: List[str] = []
    nodes: List[Dict[str, Any]] = []

    for f in sorted(py_files):
        name_lower = Path(f).name.lower()
        stem_lower = Path(f).stem.lower()

        # Classify node type
        if name_lower in ENTRY_CANDIDATES or (len(imported_by_map[f]) == 0 and len(imports_map[f]) > 0):
            node_type = "entry"
            entry_points.append(f)
        elif any(k in stem_lower for k in UTIL_KEYWORDS):
            node_type = "util"
            utilities.append(f)
        else:
            node_type = "module"

        nodes.append({
            "file": f,
            "type": node_type,
            "imports": sorted(list(imports_map[f])),
            "importedBy": sorted(list(imported_by_map[f]))
        })

    # Sort edges deterministically
    edges.sort(key=lambda e: (e["from"], e["to"]))

    return {
        "nodes": nodes,
        "edges": edges,
        "entryPoints": sorted(entry_points),
        "utilities": sorted(utilities)
    }
