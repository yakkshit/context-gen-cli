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
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn, TimeElapsedColumn

from context_gen.scanner import scan_project
from context_gen.extractor import extract_metadata
from context_gen.graph import build_dependency_graph
from context_gen.generator import generate_agent_md, generate_agent_json, generate_agent_yaml
from context_gen.distill import distill_query

app = typer.Typer(
    name="context-gen",
    help="⚡ Generate graph-based project context & distill minimal AI prompts (ctx).",
    add_completion=False,
    no_args_is_help=False,
)
console = Console()


class OutputFormat(str, Enum):
    ALL = "all"
    MD = "md"
    JSON = "json"
    YAML = "yaml"


def print_python_banner() -> None:
    banner = r"""
   ___ _   _  __
  / __| |_ \ \/ /
 | (__|  _| >  < 
  \___|\__|/_/\_\
"""
    console.print(f"[bold magenta]{banner}[/bold magenta]")
    console.print(
        Panel.fit(
            "[bold cyan]⚡ context-gen-cli (ctx)[/bold cyan] — [magenta]Senior Engineer Context & Knowledge Graph Engine[/magenta]",
            border_style="cyan",
        )
    )
    console.print("")


def execute_generation_with_progress(
    target_dir: Path,
    format_choice: OutputFormat,
    output_override: Optional[Path] = None,
    max_depth: int = 3,
) -> dict:
    with Progress(
        SpinnerColumn("dots", style="cyan"),
        TextColumn("[bold blue]{task.description}"),
        BarColumn(bar_width=35, complete_style="magenta", finished_style="green"),
        TaskProgressColumn(),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        t1 = progress.add_task("🔍 Scanning workspace files & security guards...", total=100)
        scan_result = scan_project(str(target_dir), max_depth=max_depth)
        progress.update(t1, completed=100)

        t2 = progress.add_task("📦 Extracting metadata & tech stack signals...", total=100)
        files = scan_result["files"]
        tree = scan_result["tree"]
        metadata = extract_metadata(str(target_dir), files)
        progress.update(t2, completed=100)

        t3 = progress.add_task("🕸️  Building AST module dependency graph...", total=100)
        graph = build_dependency_graph(files, str(target_dir))
        progress.update(t3, completed=100)

        t4 = progress.add_task(f"✍️  Generating context artifacts ({format_choice.value})...", total=100)

        output_dir_name = "context"
        config_file = target_dir / "context" / ".context-gen.json"
        if not config_file.is_file():
            config_file = target_dir / ".context-gen.json"

        if config_file.is_file():
            try:
                cfg = json.loads(config_file.read_text(encoding="utf-8"))
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
                out_file.write_text(json.dumps(generate_agent_json(metadata, graph, tree, str(target_dir)), indent=2), encoding="utf-8")
            elif format_choice == OutputFormat.YAML:
                out_file.write_text(generate_agent_yaml(metadata, graph, tree, str(target_dir)), encoding="utf-8")
            else:
                out_file.write_text(generate_agent_md(metadata, graph, tree), encoding="utf-8")
            generated_files.append(out_file)
        else:
            formats_to_build = ["md", "json", "yaml"] if format_choice == OutputFormat.ALL else [format_choice.value]
            if "md" in formats_to_build:
                f = dest_dir / "agent.md"
                f.write_text(generate_agent_md(metadata, graph, tree), encoding="utf-8")
                generated_files.append(f)
            if "json" in formats_to_build:
                f = dest_dir / "agent.json"
                f.write_text(json.dumps(generate_agent_json(metadata, graph, tree, str(target_dir)), indent=2), encoding="utf-8")
                generated_files.append(f)
            if "yaml" in formats_to_build:
                f = dest_dir / "agent.yaml"
                f.write_text(generate_agent_yaml(metadata, graph, tree, str(target_dir)), encoding="utf-8")
                generated_files.append(f)

        progress.update(t4, completed=100)

    console.print("")
    return {
        "files": files,
        "graph": graph,
        "metadata": metadata,
        "generated_files": generated_files,
        "output_dir": dest_dir,
    }


def run_watch_loop(target_dir: Path, format_choice: OutputFormat, max_depth: int = 3) -> None:
    console.print(
        Panel(
            f"[bold cyan]👀 Watch Mode Active[/bold cyan]\n"
            f"[dim]Monitoring:[/dim] [green]{target_dir}[/green]\n"
            f"[dim]Auto-updating context on save. Press [bold]Ctrl+C[/bold] to stop.[/dim]",
            border_style="cyan",
        )
    )

    def get_snapshot():
        snap = {}
        for p in target_dir.rglob("*"):
            if p.is_file():
                rel = p.relative_to(target_dir).as_posix()
                if not any(t in rel for t in ["context/", "node_modules/", ".git/", "__pycache__/", ".venv/", "agent."]):
                    try:
                        snap[rel] = p.stat().st_mtime
                    except Exception:
                        pass
        return snap

    last_snapshot = get_snapshot()
    try:
        while True:
            time.sleep(1.0)
            current = get_snapshot()
            if current != last_snapshot:
                last_snapshot = current
                ts = datetime.now().strftime("%H:%M:%S")
                console.print(f"[dim][{ts}][/dim] [bold green]🔄 Change detected. Syncing context...[/bold green]")
                execute_generation_with_progress(target_dir, format_choice, max_depth=max_depth)
    except KeyboardInterrupt:
        console.print("\n[bold yellow]👋 Stopping watch mode...[/bold yellow]")


@app.callback(invoke_without_command=True)
def main(
    ctx: typer.Context,
    path: Path = typer.Argument(default=Path("."), help="Target project directory."),
    project: Optional[Path] = typer.Option(None, "--project", "-p", help="Target project directory."),
    default_mode: bool = typer.Option(False, "--default", "-d", help="⚡ Generate all formats + live watch mode."),
    format: OutputFormat = typer.Option(OutputFormat.ALL, "--format", "-f", help="Output format: all, md, json, yaml."),
    output: Optional[Path] = typer.Option(None, "--output", "-o", help="Custom output path."),
    watch: bool = typer.Option(False, "--watch", "-w", help="Watch directory for changes."),
    max_depth: int = typer.Option(3, "--max-depth", min=1, max=10, help="Max scan depth."),
) -> None:
    if ctx.invoked_subcommand is not None:
        return

    target_dir = (project or path).resolve()
    print_python_banner()
    res = execute_generation_with_progress(target_dir, format, output_override=output, max_depth=max_depth)

    table = Table(show_header=False, box=None)
    table.add_row("[bold]📂 Scanned Files:[/bold]", f"[cyan]{len(res['files'])}[/cyan]")
    table.add_row("[bold]🕸️  Graph Edges:[/bold]", f"[magenta]{len(res['graph']['edges'])}[/magenta]")
    table.add_row("[bold]⚡ Tech Stack:[/bold]", f"[green]{', '.join(res['metadata']['techStack'])}[/green]")
    table.add_row("[bold]📁 Destination:[/bold]", f"[yellow]{res['output_dir']}[/yellow]")
    table.add_row("[bold]�� Artifacts:[/bold]", f"[bold cyan]{', '.join(f.name for f in res['generated_files'])}[/bold cyan]")

    console.print(Panel(table, title="[bold green]✅ Context Generated Successfully[/bold green]", border_style="green"))
    console.print(
        Panel(
            "[bold cyan]ctx distill \"add feature\"[/bold cyan]  → 🧠 Get minimal Senior Engineer context plan\n"
            "[bold cyan]ctx -d[/bold cyan]                      → ⚡ All-in-one generate + live watcher\n"
            "[bold cyan]ctx update -f json[/bold cyan]          → 🔄 Quick format refresh",
            title="[bold]💡 Quick Commands[/bold]",
            border_style="blue",
        )
    )

    if default_mode or watch:
        run_watch_loop(target_dir, format, max_depth=max_depth)


@app.command()
def distill(
    prompt: str = typer.Argument(..., help="Task or feature request to distill context for."),
    budget: int = typer.Option(250, "--budget", "-b", help="Max token budget."),
    project: Path = typer.Option(Path("."), "--project", "-p", help="Target project directory."),
) -> None:
    """🧠 Distill minimal high-signal context using Entropy + Knowledge Graph."""
    res = distill_query(str(project.resolve()), prompt, budget=budget)
    if res["status"] == "needs_clarification":
        console.print(Panel(res["output"], title="[bold yellow]⚠️  Clarification Needed[/bold yellow]", border_style="yellow"))
    else:
        console.print(Panel(res["output"], title="[bold cyan]🧠 Senior Engineer Context Plan[/bold cyan]", border_style="cyan"))


@app.command()
def update(
    path: Path = typer.Argument(default=Path("."), help="Target project directory."),
    format: OutputFormat = typer.Option(OutputFormat.ALL, "--format", "-f", help="Output format."),
    output: Optional[Path] = typer.Option(None, "--output", "-o", help="Custom output path."),
) -> None:
    """🔄 Regenerate and update project context files."""
    target_dir = path.resolve()
    res = execute_generation_with_progress(target_dir, format, output_override=output)
    console.print(f"[bold green]✓ Context updated in {res['output_dir']}![/bold green]")


if __name__ == "__main__":
    app()
