import 'dart:io';
import 'package:args/args.dart';
import 'package:path/path.dart' as p;
import 'package:context_gen/context_gen.dart';

void main(List<String> arguments) async {
  final parser = ArgParser()
    ..addFlag('help', abbr: 'h', negatable: false, help: 'Show usage guide')
    ..addFlag('version', abbr: 'v', negatable: false, help: 'Show version')
    ..addFlag('default', abbr: 'd', negatable: false, help: 'Default all-in-one execution')
    ..addFlag('tokens', abbr: 't', negatable: false, help: 'Calculate token savings')
    ..addOption('output', abbr: 'o', defaultsTo: 'context', help: 'Output directory')
    ..addOption('distill', help: 'Distill prompt into an EGRD Senior Engineer Context Plan');

  ArgResults results;
  try {
    results = parser.parse(arguments);
  } catch (e) {
    stderr.writeln('Error: $e');
    exit(1);
  }

  if (results['help'] == true) {
    stdout.writeln('''
=======================================================
⚡ context-gen-cli (ctx) — Dart Edition v1.3.4
=======================================================

Usage:
  ctx [options]

Options:
${parser.usage}
''');
    exit(0);
  }

  if (results['version'] == true) {
    stdout.writeln('context-gen-cli (Dart) v1.3.4');
    exit(0);
  }

  final rootDir = Directory.current;
  stdout.writeln('⚡ Scanning project at ${rootDir.path}...');

  final project = await ContextScanner.scan(rootDir);
  stdout.writeln('✔ Scanned ${project.files.length} files (Framework: ${project.primaryFramework})');

  if (results['distill'] != null) {
    final query = results['distill'] as String;
    final plan = EgrdDistiller.distill(query, project);
    stdout.writeln('\n╔════════════════════════════════════════════════════════╗');
    stdout.writeln('║  🧠 SENIOR ENGINEER CONTEXT PLAN (EGRD)                 ║');
    stdout.writeln('╚════════════════════════════════════════════════════════╝');
    stdout.writeln('  Entropy: ${plan['entropy']} bits');
    stdout.writeln('  Status:  ${plan['status']}');
    if (plan['clarification'] != null) {
      stdout.writeln('  ⚠️  ${plan['clarification']}');
    } else {
      stdout.writeln('  📂 Primary Files: ${(plan['primaryFiles'] as List).join(', ')}');
      stdout.writeln('  💥 Blast Radius:  ${(plan['blastRadius'] as List).join(', ')}');
    }
    exit(0);
  }

  // Generate context/ directory
  final outDir = Directory(p.join(rootDir.path, results['output'] as String));
  if (!await outDir.exists()) {
    await outDir.create(recursive: true);
  }

  // Write agent.md
  final agentMd = File(p.join(outDir.path, 'agent.md'));
  await agentMd.writeAsString('''# Project Architecture & Context

- Framework: ${project.primaryFramework}
- Total Files: ${project.files.length}

## File Tree
${project.files.take(40).map((f) => '- $f').join('\n')}

## Dependency Graph
${project.graph.entries.map((e) => '- ${e.key} -> ${e.value.join(', ')}').join('\n')}
''');

  stdout.writeln('✅ Context generated in ${outDir.path}/agent.md');
}

