package com.cedzlabs.contextgen;

import picocli.CommandLine;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;
import picocli.CommandLine.Parameters;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.concurrent.Callable;

@Command(
    name = "ctx",
    mixinStandardHelpOptions = true,
    version = "context-gen-cli (Java) 1.3.4",
    description = "⚡ Generate graph-based project context & distill minimal AI prompts (EGRD)."
)
public class Main implements Callable<Integer> {

    @Option(names = {"-d", "--default"}, description = "Default all-in-one context generation")
    private boolean defaultMode;

    @Option(names = {"-t", "--tokens"}, description = "Display token analytics and savings")
    private boolean tokensMode;

    @Option(names = {"-o", "--output"}, defaultValue = "context", description = "Output directory name")
    private String outputDir;

    @Option(names = {"--distill"}, description = "Distill prompt into an EGRD Senior Engineer Context Plan")
    private String distillQuery;

    @Parameters(index = "0", defaultValue = ".", description = "Target project directory to analyze")
    private File projectDir;

    public static void main(String[] args) {
        int exitCode = new CommandLine(new Main()).execute(args);
        System.exit(exitCode);
    }

    @Override
    public Integer call() throws Exception {
        System.out.println("⚡ context-gen-cli (Java Edition) v1.3.4");
        System.out.println("📍 Target Directory: " + projectDir.getAbsolutePath());

        Scanner.ScanResult result = Scanner.scan(projectDir);
        System.out.println("✔ Scanned " + result.files.size() + " files (Framework: " + result.framework + ")");

        if (distillQuery != null && !distillQuery.isBlank()) {
            Distiller.DistillResult plan = Distiller.distill(distillQuery, result);
            System.out.println("\n╔════════════════════════════════════════════════════════╗");
            System.out.println("║  🧠 SENIOR ENGINEER CONTEXT PLAN (EGRD)                 ║");
            System.out.println("╚════════════════════════════════════════════════════════╝");
            System.out.printf("  Entropy: %.2f bits%n", plan.entropy);
            System.out.println("  Status:  " + plan.status);
            if (plan.clarification != null) {
                System.out.println("  ⚠️  " + plan.clarification);
            } else {
                System.out.println("  📂 Primary Files: " + String.join(", ", plan.primaryFiles));
                System.out.println("  💥 Blast Radius:  " + String.join(", ", plan.blastRadius));
            }
            return 0;
        }

        // Generate context files
        File out = new File(projectDir, outputDir);
        if (!out.exists()) {
            out.mkdirs();
        }

        File agentMd = new File(out, "agent.md");
        try (FileWriter writer = new FileWriter(agentMd)) {
            writer.write("# Project Architecture & Context\n\n");
            writer.write("- Primary Framework: " + result.framework + "\n");
            writer.write("- Total Analyzed Files: " + result.files.size() + "\n\n");
            writer.write("## File Structure\n");
            int count = 0;
            for (String f : result.files) {
                if (++count > 50) break;
                writer.write("- " + f + "\n");
            }
        }

        System.out.println("✅ Context generated in " + agentMd.getAbsolutePath());
        return 0;
    }
}

