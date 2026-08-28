"""
Verification script for Checkpoints 2 & 3:
Tests scanner.py and graph.py on tests/test_fixture.
"""

import json
from pathlib import Path
from context_gen.scanner import scan_project
from context_gen.graph import build_dependency_graph


def main() -> None:
    fixture_dir = Path(__file__).parent / "test_fixture"

    print("=" * 60)
    print("🧪 Testing Checkpoint 2: scanner.py on test_fixture")
    print("=" * 60)
    scan_result = scan_project(str(fixture_dir))
    files = scan_result["files"]
    tree = scan_result["tree"]

    print(f"Scanned files ({len(files)}):")
    for f in files:
        print(f"  - {f}")
    print("\nVisual Tree:")
    print(tree)

    # Verification Assertions for Checkpoint 2
    assert "main.py" in files, "main.py should be detected"
    assert "utils.py" in files, "utils.py should be detected"
    assert "secret.txt" not in files, "secret.txt MUST be ignored by .gitignore"
    assert not any("__pycache__" in f for f in files), "__pycache__ MUST be ignored"
    print("\n✅ CHECKPOINT 2 PASSED: .gitignore respected & secret.txt excluded!\n")

    print("=" * 60)
    print("🧪 Testing Checkpoint 3: graph.py (AST parser) on test_fixture")
    print("=" * 60)
    graph = build_dependency_graph(files, str(fixture_dir))
    print(json.dumps(graph, indent=2))

    # Verification Assertions for Checkpoint 3
    edges = graph["edges"]
    assert any(e["from"] == "main.py" and e["to"] == "utils.py" for e in edges), \
        "Edge from main.py -> utils.py should be present"
    assert not any(e["to"] == "os" for e in edges), "Standard library 'os' should be ignored"
    assert not any(e["to"] == "sys" for e in edges), "Standard library 'sys' should be ignored"
    assert "main.py" in graph["entryPoints"], "main.py should be identified as entryPoint"
    assert "utils.py" in graph["utilities"], "utils.py should be identified as utility"
    print("\n✅ CHECKPOINT 3 PASSED: AST successfully resolved main.py -> utils.py and filtered stdlib!")


if __name__ == "__main__":
    main()
