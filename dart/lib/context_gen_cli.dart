import 'dart:io';
import 'dart:math';
import 'package:path/path.dart' as p;

class ProjectContext {
  final List<String> files;
  final Map<String, List<String>> graph;
  final String primaryFramework;

  ProjectContext({
    required this.files,
    required this.graph,
    required this.primaryFramework,
  });
}

class ContextScanner {
  static const Set<String> defaultIgnores = {
    'node_modules',
    '.git',
    'dist',
    'build',
    '.dart_tool',
    '.idea',
    '.vscode',
    '.next',
    '.turbo',
    '.cache',
    'coverage',
    '__pycache__',
    '.venv',
    'venv',
    'site-packages',
    'context',
    '.DS_Store'
  };

  static Future<ProjectContext> scan(Directory root) async {
    final files = <String>[];
    final graph = <String, List<String>>{};
    String framework = 'Dart/General';

    if (!await root.exists()) {
      return ProjectContext(files: [], graph: {}, primaryFramework: framework);
    }

    final pubspec = File(p.join(root.path, 'pubspec.yaml'));
    if (await pubspec.exists()) {
      final content = await pubspec.readAsString();
      if (content.contains('flutter:')) {
        framework = 'Flutter';
      } else {
        framework = 'Dart';
      }
    } else if (await File(p.join(root.path, 'package.json')).exists()) {
      framework = 'Node.js/TypeScript';
    } else if (await File(p.join(root.path, 'pyproject.toml')).exists() ||
        await File(p.join(root.path, 'requirements.txt')).exists()) {
      framework = 'Python';
    }

    await for (final entity in root.list(recursive: true, followLinks: false)) {
      if (entity is File) {
        final rel = p.relative(entity.path, from: root.path);
        final parts = p.split(rel);

        bool ignored = parts.any((part) =>
            defaultIgnores.contains(part) ||
            part.toLowerCase().contains('venv') ||
            part.endsWith('.pyc') ||
            part.endsWith('.log'));

        if (!ignored && files.length < 500) {
          files.add(rel);
        }
      }
    }

    // Build simple dependency links
    for (final file in files.take(100)) {
      if (file.endsWith('.dart') || file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.py')) {
        try {
          final f = File(p.join(root.path, file));
          final lines = await f.readAsLines();
          final deps = <String>[];
          for (final line in lines) {
            if (line.startsWith('import ') || line.startsWith('export ') || line.startsWith('from ')) {
              final match = RegExp(r"['" + '"' + r"]([^'" + '"' + r"]+)['" + '"' + r"]").firstMatch(line);
              if (match != null) {
                final target = match.group(1)!;
                if (!target.startsWith('dart:') && !target.startsWith('package:flutter/')) {
                  deps.add(target);
                }
              }
            }
          }
          if (deps.isNotEmpty) {
            graph[file] = deps.take(5).toList();
          }
        } catch (_) {}
      }
    }

    return ProjectContext(
      files: files,
      graph: graph,
      primaryFramework: framework,
    );
  }
}

class EgrdDistiller {
  static const double threshold = 1.50;

  static Map<String, dynamic> distill(String query, ProjectContext context) {
    if (query.trim().isEmpty) {
      return {
        'status': 'error',
        'message': 'Prompt cannot be empty.',
      };
    }

    final queryTerms = query.toLowerCase().split(RegExp(r'\s+')).where((t) => t.length > 2).toList();
    final scores = <String, double>{};

    for (final f in context.files) {
      final fLower = f.toLowerCase();
      double score = 0.05;
      for (final term in queryTerms) {
        if (fLower.contains(term)) {
          score += 2.0;
        }
      }
      scores[f] = score;
    }

    // Calculate Shannon entropy: H = -sum(p * log2(p))
    final total = scores.values.fold(0.0, (a, b) => a + b);
    double entropy = 0.0;
    if (total > 0) {
      for (final s in scores.values) {
        final pVal = s / total;
        if (pVal > 0) {
          entropy -= pVal * (log(pVal) / ln2);
        }
      }
    }

    // Sort by relevance
    final sorted = scores.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    final primary = sorted.take(4).map((e) => e.key).toList();

    final blastRadius = <String>{};
    for (final pFile in primary) {
      context.graph.forEach((caller, deps) {
        if (deps.any((d) => d.contains(p.basenameWithoutExtension(pFile)))) {
          blastRadius.add(caller);
        }
      });
    }

    final needsClarification = entropy >= threshold && queryTerms.length <= 2;

    return {
      'status': needsClarification ? 'needs_clarification' : 'success',
      'entropy': double.parse(entropy.toStringAsFixed(2)),
      'primaryFiles': primary,
      'blastRadius': blastRadius.take(5).toList(),
      'clarification': needsClarification
          ? 'Prompt is ambiguous (H = ${entropy.toStringAsFixed(2)} bits). Target one of: ${primary.take(3).join(', ')}'
          : null,
    };
  }
}

