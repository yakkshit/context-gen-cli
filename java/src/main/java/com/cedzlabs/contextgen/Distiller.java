package com.cedzlabs.contextgen;

import java.util.*;

public class Distiller {

    public static class DistillResult {
        public final String status;
        public final double entropy;
        public final List<String> primaryFiles;
        public final List<String> blastRadius;
        public final String clarification;

        public DistillResult(String status, double entropy, List<String> primaryFiles, List<String> blastRadius, String clarification) {
            this.status = status;
            this.entropy = entropy;
            this.primaryFiles = primaryFiles;
            this.blastRadius = blastRadius;
            this.clarification = clarification;
        }
    }

    public static DistillResult distill(String query, Scanner.ScanResult scan) {
        String[] terms = query.toLowerCase().split("\\s+");
        Map<String, Double> scores = new HashMap<>();

        for (String file : scan.files) {
            String lower = file.toLowerCase();
            double score = 0.05;
            for (String term : terms) {
                if (term.length() > 2 && lower.contains(term)) {
                    score += 2.0;
                }
            }
            scores.put(file, score);
        }

        double total = scores.values().stream().mapToDouble(Double::doubleValue).sum();
        double entropy = 0.0;
        if (total > 0) {
            for (double s : scores.values()) {
                double p = s / total;
                if (p > 0) {
                    entropy -= p * (Math.log(p) / Math.log(2));
                }
            }
        }

        List<Map.Entry<String, Double>> sorted = new ArrayList<>(scores.entrySet());
        sorted.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));

        List<String> primary = new ArrayList<>();
        for (int i = 0; i < Math.min(4, sorted.size()); i++) {
            primary.add(sorted.get(i).getKey());
        }

        boolean needsClarification = entropy >= 1.50 && terms.length <= 2;
        String clarification = needsClarification
                ? String.format("Prompt is ambiguous (H = %.2f bits). Target one of: %s", entropy, String.join(", ", primary))
                : null;

        return new DistillResult(
                needsClarification ? "needs_clarification" : "success",
                entropy,
                primary,
                Collections.emptyList(),
                clarification
        );
    }
}

