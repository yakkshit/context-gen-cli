"""
context_gen.cli: Typer-based CLI entry point for context-gen-cli (Python Edition).
"""

import json
import time
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import List, Optional
import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from context_gen.scanner import scan_project
from context_gen.extractor import extract_metadata
from context_gen.graph import build_dependency_graph
from context_gen.generator import generate_agent_md, generate_agent_json, generate_agent_yaml

app = typer.Typer(
    name="context-gen",
    help="⚡ Generate graph-based project context (agent.md, agent.json, agent.yaml) for LLMs.",
    add_completion=False,
    no_args_is_help=False
)
console = Console()


class OutputFormat(str, Enum):
    """Supported output formats."""
    ALL = "all"
    MD = "md"
    JSON = "json"
    YAML = "yaml"


def execute_generation(
    target_dir: Path,
    format_choice: OutputFormat,
    output_override: Optional[Path] = None,
    max_depth: int = 3,
    verbose: bool = True
) -> dict:
    """Scans and generates the requested context format files."""
    scan_result = scan_project(str(target_dir), max_depth=max_depth)
    files = scan_result["files"]
    tree = scan_result["tree"]

    metadata = extract_metadata(str(target_dir), files)
    graph = build_dependency_graph(files, str(target_dir))

    # Read output directory from .context-gen.json if available
    config_file = target_dir / ".context-gen.json"
    output_dir_name = "context"
    if config_file.is_file():
        try:
            with open(config_file, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                output_dir_name = cfg.get("outputDir", "context")
        except Exception:
            pass

    dest_dir = target_dir / output_dir_name
    dest_dir.mkdir(parents=True, exist_ok=True)

    generated_files: List[Path] = []

    if output_override:
        out_file = output_override.resolve()
        out_file.parent.mkdir(parents=True, exist_ok=True)
        if format_choice == OutputFormat.JSON:
            json_data = generate_agent_json(metadata, graph, tree, str(target_dir))
            out_file.write_text(json.dumps(json_data, indent=2), encoding="utf-8")
        elif format_choice == OutputFormat.YAML:
            yaml_text = generate_agent_yaml(metadata, graph, tree, str(target_dir))
            out_file.write_text(yaml_text, encoding="utf-8")
        else:
            md_text = generate_agent_md(metadata, graph, tree)
            out_file.write_text(md_text, encoding="utf-8")
        generated_files.append(out_file)
    else:
        # Determine formats to generate
        formats_to_build = ["md", "json", "yaml"] if format_choice == OutputFormat.ALL else [format_choice.value]

        if "md" in formats_to_build:
            md_file = dest_dir / "agent.md"
            md_text = generate_agent_md(metadata, graph, tree)
            md_file.write_text(md_text, encoding="utf-8")
            generated_files.append(md_file)

        if "json" in formats_to_build:
            json_file = dest_dir / "agent.json"
            json_data = generate_agent_json(metadata, graph, tree, str(target_dir))
            json_file.write_text(json.dumps(json_data, indent=2), encoding="utf-8")
            generated_files.append(json_file)

        if "yaml" in formats_to_build:
            yaml_file = dest_dir / "agent.yaml"
            yaml_text = generate_agent_yaml(metadata, graph, tree, str(target_dir))
            yaml_file.write_text(yaml_text, encoding="utf-8")
            generated_files.append(yaml_file)

    return {
        "files": files,
        "graph": graph,
        "metadata": metadata,
        "generated_files": generated_files,
        "output_dir": dest_dir
    }


def run_watch_loop(target_dir: Path, format_choice: OutputFormat, max_depth: int = 3) -> None:
    """Runs a live background file watch loop that regenerates context on changes."""
    console.print(
        Panel(
            f"[bold cyan]👀 Watch Mode Active[/bold cyan]\n"
            f"[dim]Monitoring workspace:[/dim] [green]{target_dir}[/green]\n"
            f"[dim]Auto-updating context files on save. Press [bold]Ctrl+C[/bold] to exit.[/dim]",
            border_style="cyan"
        )
    )

    last_snapshot = {}

    def get_snapshot():
        snap = {}
        for p in target_dir.rglob("*"):
            if p.is_file():
                rel = p.relative_to(target_dir).as_posix()
                if not any(token in rel for token in ["context/", "node_modules/", ".git/", "__pycache__/", ".venv/", "agent."]):
                    try:
                        snap[rel] = p.stat().st_mtime
                    except Exception:
                        pass
        return snap

    last_snapshot = get_snapshot()

    try:
        while True:
            time.sleep(1.0)
            current_snapshot = get_snapshot()

            changed = False
            for f, mtime in current_snapshot.items():
                if f not in last_snapshot or last_snapshot[f] != mtime:
                    changed = True
                    break

            if not changed and set(last_snapshot.keys()) != set(current_snapshot.keys()):
                changed = True

            if changed:
                last_snapshot = current_snapshot
                time_str = datetime.now().strftime("%H:%M:%S")
                console.print(f"[dim][{time_str}][/dim] [bold green]🔄 Project changed. Regenerating context files...[/bold green]")
                execute_generation(target_dir, format_choice, max_depth=max_depth, verbose=False)
                console.print(f"[dim][{time_str}][/dim] [bold cyan]✓ Context files updated & synced in context/![/bold cyan]")
    except KeyboardInterrupt:
        console.print("\n[bold yellow]👋 Stopping watch mode...[/bold yellow]")


@app.command()
def main(
    path: Path = typer.Argument(
        default=Path("."),
        help="Target project directory to analyze.",
        file_okay=False,
        dir_okay=True,
        readable=True,
        resolve_path=True,
    ),
    project: Optional[Path] = typer.Option(
        None,
        "--project",
        "-p",
        help="Target project directory to analyze.",
        file_okay=False,
        dir_okay=True,
        readable=True,
        resolve_path=True,
    ),
    default_mode: bool = typer.Option(
        False,
        "--default",
        "-d",
        help="⚡ Zero-config default mode: generate all formats in context/ and run live auto-sync watcher.",
    ),
    format: OutputFormat = typer.Option(
        OutputFormat.ALL,
        "--format",
        "-f",
        help="Output format: 'all', 'md', 'json', or 'yaml'.",
        case_sensitive=False,
    ),
    mcp: bool = typer.Option(
        False,
        "--mcp",
        "-m",
        help="Start MCP server mode.",
    ),
    interactive: bool = typer.Option(
        False,
        "--interactive",
        "-i",
        help="Run in interactive mode.",
    ),
    output: Optional[Path] = typer.Option(
        None,
        "--output",
        "-o",
        help="Custom output file path (e.g. context/agent.md or custom.json).",
    ),
    watch: bool = typer.Option(
        False,
        "--watch",
        "-w",
        help="Watch directory and auto-regenerate context on file changes.",
    ),
    max_depth: int = typer.Option(
        3,
        "--max-depth",
        help="Maximum directory depth to scan.",
        min=1,
        max=10,
    ),
) -> None:
    """
    Scan a project, build an AST-powered dependency graph, and generate LLM context.
    """
    target_dir = (project or path).resolve()

    # If -d / --default is supplied, generate all formats and keep watch running
    if default_mode:
        console.print(
            Panel.fit(
                f"[bold cyan]⚡ context-gen-cli (Python All-In-One Mode -d)[/bold cyan]\n"
                f"[dim]Target:[/dim] [green]{target_dir}[/green]\n"
                f"[dim]Mode:[/dim] [yellow]Auto-Generate All Formats + Live Background Watcher[/yellow]",
                border_style="cyan"
            )
        )
        res = execute_generation(target_dir, OutputFormat.ALL, max_depth=max_depth)
        table = Table(show_header=False, box=None)
        table.add_row("[bold]Scanned Files:[/bold]", f"[cyan]{len(res['files'])}[/cyan]")
        table.add_row("[bold]AST Graph Edges:[/bold]", f"[cyan]{len(res['graph']['edges'])}[/cyan]")
        table.add_row("[bold]Tech Stack:[/bold]", f"[green]{', '.join(res['metadata']['techStack'])}[/green]")
        table.add_row("[bold]Generated Files:[/bold]", f"[yellow]{', '.join(f.name for f in res['generated_files'])}[/yellow]")
        console.print(Panel(table, title="[bold green]✅ Context Generated in context/[/bold green]", border_style="green"))
        run_watch_loop(target_dir, OutputFormat.ALL, max_depth=max_depth)
        return

    console.print(
        Panel.fit(
            f"[bold cyan]⚡ context-gen-cli (Python Edition)[/bold cyan]\n"
            f"[dim]Analyzing target:[/dim] [green]{target_dir}[/green]\n"
            f"[dim]Format:[/dim] [yellow]{format.value.upper()}[/yellow]",
            border_style="cyan"
        )
    )

    with console.status("[bold green]Scanning directory and parsing AST graph...[/bold green]"):
        res = execute_generation(target_dir, format, output_override=output, max_depth=max_depth)

    # Display completion summary
    table = Table(show_header=False, box=None)
    table.add_row("[bold]Scanned Files:[/bold]", f"[cyan]{len(res['files'])}[/cyan]")
    table.add_row("[bold]AST Graph Edges:[/bold]", f"[cyan]{len(res['graph']['edges'])}[/cyan]")
    table.add_row("[bold]Tech Stack:[/bold]", f"[green]{', '.join(res['metadata']['techStack'])}[/green]")
    table.add_row("[bold]Output Destination:[/bold]", f"[yellow]{res['output_dir']}[/yellow]")
    table.add_row("[bold]Generated Files:[/bold]", f"[green]{', '.join(f.name for f in res['generated_files'])}[/green]")

    console.print(
        Panel(
            table,
            title="[bold green]✅ Context Generated Successfully[/bold green]",
            border_style="green"
        )
    )

    if watch:
        run_watch_loop(target_dir, format, max_depth=max_depth)


if __name__ == "__main__":
    app()
