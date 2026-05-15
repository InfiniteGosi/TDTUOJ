package com.oj.TDTUOJ.visualizer.service.instrumentor;

/**
 * Shared brace-normalizer pre-pass used by AUTO-mode C / C++ / Java instrumentors.
 * Converts single-statement control bodies to braced form so the line-by-line
 * tracer can safely inject after every statement.
 */
public class BraceNormalizer {

    public static String addBraces(String code) {
        code = code.replace("\r\n", "\n").replace("\r", "\n");

        String[] lines = code.split("\n", -1);
        java.util.List<String> out = new java.util.ArrayList<>();

        java.util.regex.Pattern controlPat = java.util.regex.Pattern.compile(
                "^(\\s*)(?:(?:else\\s+if|if|for|while)\\s*\\(.*\\)|else)\\s*$"
        );

        for (int i = 0; i < lines.length; i++) {
            String line    = lines[i];
            String trimmed = line.trim();

            java.util.regex.Matcher m = controlPat.matcher(line);
            boolean isControl = m.matches()
                    && !trimmed.startsWith("//")
                    && !trimmed.startsWith("/*");

            if (isControl && i + 1 < lines.length) {
                String nextTrimmed = lines[i + 1].trim();
                if (!nextTrimmed.startsWith("{")) {
                    int bodyIdx = i + 1;
                    while (bodyIdx < lines.length) {
                        String candidate        = lines[bodyIdx];
                        String candidateTrimmed = candidate.trim();
                        java.util.regex.Matcher cm = controlPat.matcher(candidate);
                        boolean candidateIsControl = cm.matches()
                                && !candidateTrimmed.startsWith("//")
                                && !candidateTrimmed.startsWith("/*");
                        if (!candidateIsControl) break;
                        bodyIdx++;
                    }

                    if (bodyIdx < lines.length) {
                        String indent = m.group(1);
                        out.add(line + " {");
                        for (int k = i + 1; k <= bodyIdx; k++) {
                            out.add(lines[k]);
                        }
                        out.add(indent + "}");
                        i = bodyIdx;
                        continue;
                    }
                }
            }

            out.add(line);
        }

        String result = String.join("\n", out);
        if (!result.equals(code)) {
            return addBraces(result);
        }
        return result;
    }

    private BraceNormalizer() {}
}
