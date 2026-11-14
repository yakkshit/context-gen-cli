package com.cedzlabs.contextgen;

import java.io.File;
import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.*;

public class Scanner {

    public static class ScanResult {
        public final List<String> files;
        public final Map<String, List<String>> graph;
        public final String framework;

        public ScanResult(List<String> files, Map<String, List<String>> graph, String framework) {
            this.files = files;
            this.graph = graph;
            this.framework = framework;
        }
    }

    private static final Set<String> IGNORED = new HashSet<>(Arrays.asList(
            "target", ".git", ".gradle", "node_modules", "dist", "build",
            ".idea", ".vscode", "__pycache__", ".venv", "venv", "site-packages",
            "context", ".next", ".turbo", ".cache"
    ));

    public static ScanResult scan(File rootDir) throws IOException {
        List<String> files = new ArrayList<>();
        Map<String, List<String>> graph = new HashMap<>();

        String framework = "Java/JVM";
        if (new File(rootDir, "pom.xml").exists()) {
            framework = "Maven (Java/Kotlin)";
        } else if (new File(rootDir, "build.gradle").exists() || new File(rootDir, "build.gradle.kts").exists()) {
            framework = "Gradle (Java/Kotlin/Android)";
        } else if (new File(rootDir, "package.json").exists()) {
            framework = "Node.js";
        } else if (new File(rootDir, "pyproject.toml").exists()) {
            framework = "Python";
        }

        Path rootPath = rootDir.toPath();
        if (Files.exists(rootPath)) {
            Files.walkFileTree(rootPath, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
                    String name = dir.getFileName().toString();
                    if (IGNORED.contains(name) || name.toLowerCase().contains("venv")) {
                        return FileVisitResult.SKIP_SUBTREE;
                    }
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
                    String rel = rootPath.relativize(file).toString();
                    if (files.size() < 500 && !rel.endsWith(".class") && !rel.endsWith(".jar")) {
                        files.add(rel);
                    }
                    return FileVisitResult.CONTINUE;
                }
            });
        }

        return new ScanResult(files, graph, framework);
    }
}

