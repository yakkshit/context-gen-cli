"""
Unit tests for context_gen.mcp.advanced_tools
"""

import os
from pathlib import Path
import pytest

from context_gen.mcp.advanced_tools import (
    get_code_snippet,
    search_code,
    list_functions,
    get_git_diff,
    explain_architecture,
    validate_security
)


def test_get_code_snippet_function():
    res = get_code_snippet(
        file_path="context_gen/scanner.py",
        function_name="scan_project",
        project_path=str(Path(__file__).parent.parent)
    )
    assert res["path"] == "context_gen/scanner.py"
    assert "def scan_project" in res["content"]
    assert res["language"] == "python"


def test_get_code_snippet_lines():
    res = get_code_snippet(
        file_path="context_gen/scanner.py",
        start_line=1,
        end_line=10,
        project_path=str(Path(__file__).parent.parent)
    )
    assert res["startLine"] == 1
    assert res["endLine"] == 10


def test_search_code():
    res = search_code(
        pattern="scan_project",
        project_path=str(Path(__file__).parent.parent)
    )
    assert len(res["matches"]) > 0
    assert any("scan_project" in m["line"] for m in res["matches"])


def test_list_functions():
    res = list_functions(
        file_path="context_gen/scanner.py",
        project_path=str(Path(__file__).parent.parent)
    )
    func_names = [f["name"] for f in res["functions"]]
    assert "scan_project" in func_names
    assert "load_gitignore" in func_names


def test_explain_architecture():
    res = explain_architecture(
        depth="high",
        project_path=str(Path(__file__).parent.parent)
    )
    assert "summary" in res
    assert len(res["summary"]) > 0


def test_validate_security():
    res = validate_security(
        project_path=str(Path(__file__).parent.parent)
    )
    assert "safe" in res
    assert "issues" in res
