# context_gen_cli (Dart Edition)

⚡ **High-performance project context generator and Entropy-Guided Reference Distillation (EGRD) CLI.**

Stop dumping 50,000 raw prompt tokens into Claude, Cursor, and ChatGPT. `context_gen_cli` extracts lightweight architectural graphs, module dependencies, and precision blueprints in 1-2 CPU cores with zero GPU bloat.

## Installation

```bash
# Global installation via pub.dev
dart pub global activate context_gen_cli

# Run anywhere
ctx --help
```

## Quick Start

```bash
# Generate architecture context (agent.md, agent.json, agent.yaml in context/)
ctx

# Distill an AI prompt into an entropy-minimal Senior Engineer Context Plan
ctx --distill "Add JWT refresh token rotation to the authentication service"

# Check token weight and savings
ctx --tokens
```

## Publishing to pub.dev

```bash
# Dry run verification
dart pub publish --dry-run

# Publish live
dart pub publish
```

