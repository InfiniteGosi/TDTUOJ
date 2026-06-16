package com.oj.TDTUOJ.visualizer.service.tracer;

import java.util.ArrayList;
import java.util.List;

/**
 * Insert-only brace synthesizer for the C-family line scanners (C / C++ / C#).
 *
 * <p>The C/C++/C# tracers are line-oriented: they emit a state snapshot only at
 * the end of a line that ends in {@code ;}, and only when that statement sits
 * inside braces. A <em>braceless</em> control body therefore traces badly —
 * {@code for (...)\n    s += a[i];} appends the snap <em>after</em> the loop, so
 * the body fires once instead of per-iteration; and a then-branch immediately
 * followed by {@code else} is skipped entirely (the {@code nextIsElse} guard).
 *
 * <p>This pre-pass rewrites every braceless control body
 * ({@code if/else/for/while/do/switch} and C#'s {@code foreach}) into an
 * explicit block on its own lines:
 *
 * <pre>{@code
 *   for (i...)            for (i...) {
 *       s += a[i];   →        s += a[i];
 *                         }
 * }</pre>
 *
 * <p>It is <strong>insert-only</strong>: no original character is moved or
 * deleted, only {@code "{\n"} and {@code "\n}"} are spliced in at
 * grammatically-chosen positions. Because the scanner needs each statement on
 * its own line, a {@link Result} also carries an output-line → original-line map
 * so snap line numbers and {@code #line} directives keep pointing at the user's
 * source.
 *
 * <p>Safety: if the source contains no braceless body the original text is
 * returned verbatim with an identity map (the common braced one-statement-per-
 * line style is therefore byte-for-byte unchanged — zero behavioural risk). Any
 * parse anomaly — unbalanced braces/parens, a wrap that runs to EOF, overlapping
 * (non-nested) ranges, or any thrown exception — also falls back to the original
 * source, so the normalizer can never produce code that fails to compile when
 * the original would have compiled. Worst case it declines to help and the old
 * coarse-trace behaviour stands.
 */
public final class BraceSynthesizer {

    /** Normalized lines plus, per line, the 1-based original source line it maps to. */
    public record Result(String[] lines, int[] origLine) {}

    private final String src;
    private final int len;
    private final char[] mask;     // strings / chars / comments / preprocessor blanked, length-preserving
    private final int[] lineNo;    // lineNo[p] = 1-based original line of src char p (lineNo[len] = total)

    private BraceSynthesizer(String src) {
        this.src = src;
        this.len = src.length();
        this.mask = mask(src);
        this.lineNo = computeLineNo(src);
    }

    public static Result normalize(String source) {
        if (source == null || source.isEmpty()) return identity(source == null ? "" : source);
        try {
            return new BraceSynthesizer(source).run();
        } catch (RuntimeException e) {
            return identity(source); // never break the caller — degrade to original
        }
    }

    // ── core ──────────────────────────────────────────────────────────────────

    /** One synthesized brace pair around a braceless body: insert "{\n" at open, "\n}" at close. */
    private record Wrap(int open, int close, int seq) {}

    private Result run() {
        List<Wrap> wraps = collect();
        if (wraps.isEmpty()) return identity(src);
        if (!nests(wraps)) return identity(src);
        return build(wraps);
    }

    /** Scan for control keywords and record a wrap for each braceless body. */
    private List<Wrap> collect() {
        List<Wrap> out = new ArrayList<>();
        int seq = 0;
        int j = 0;
        while (j < len) {
            char c = mask[j];
            if (!isIdentStart(c)) { j++; continue; }
            int e = afterWord(j);
            String w = src.substring(j, e); // keyword chars are unaffected by masking
            switch (w) {
                case "if", "for", "while", "switch", "foreach" -> {
                    int p = skipWs(e);
                    if (p >= len || mask[p] != '(') break; // not a real control header
                    int cp = matchParen(p);
                    if (cp < 0) break;
                    int bodyStart = skipWs(cp + 1);
                    if (bodyStart >= len) break;
                    char bc = mask[bodyStart];
                    if (bc != '{' && bc != ';') {
                        int end = consumeFullStatement(bodyStart);
                        if (end > bodyStart && end <= len) out.add(new Wrap(cp + 1, end, seq++));
                    }
                }
                case "do" -> {
                    int bodyStart = skipWs(e);
                    if (bodyStart < len && mask[bodyStart] != '{' && mask[bodyStart] != ';') {
                        int end = consumeFullStatement(bodyStart);
                        if (end > bodyStart && end <= len) out.add(new Wrap(e, end, seq++));
                    }
                }
                case "else" -> {
                    int p = skipWs(e);
                    if (p < len && mask[p] != '{' && !"if".equals(wordAt(p))) {
                        int end = consumeFullStatement(p);
                        if (end > p && end <= len) out.add(new Wrap(e, end, seq++));
                    }
                }
                default -> { /* not a control keyword */ }
            }
            j = e; // continue past the keyword; nested bodies are found as the scan advances
        }
        return out;
    }

    /** Verify the wrap ranges are properly nested or disjoint (never partially overlapping). */
    private boolean nests(List<Wrap> wraps) {
        List<Wrap> sorted = new ArrayList<>(wraps);
        sorted.sort((a, b) -> a.open != b.open ? Integer.compare(a.open, b.open)
                                               : Integer.compare(b.close, a.close));
        java.util.Deque<Integer> stack = new java.util.ArrayDeque<>();
        for (Wrap w : sorted) {
            if (w.open >= w.close) return false;
            while (!stack.isEmpty() && stack.peek() <= w.open) stack.pop();
            if (!stack.isEmpty() && w.close > stack.peek()) return false; // partial overlap
            stack.push(w.close);
        }
        return true;
    }

    // ── statement-extent finder (operates on the masked structural view) ───────

    /** Index just past one complete statement starting at/after {@code j}; -1 on malformed input. */
    private int consumeFullStatement(int j) {
        j = skipWs(j);
        if (j >= len) return len;
        char c = mask[j];
        if (c == '{') { int m = matchBrace(j); return m < 0 ? -1 : m + 1; }
        if (c == ';') return j + 1;
        String w = wordAt(j);
        switch (w) {
            case "if", "for", "while", "switch", "foreach" -> {
                int p = skipWs(afterWord(j));
                if (p >= len || mask[p] != '(') return consumeSimpleOrDef(j);
                int cp = matchParen(p);
                if (cp < 0) return -1;
                int body = consumeFullStatement(cp + 1);
                if (body < 0) return -1;
                if (w.equals("if")) {
                    int k = skipWs(body);
                    if ("else".equals(wordAt(k))) {
                        int eb = consumeFullStatement(afterWord(k));
                        return eb < 0 ? -1 : eb;
                    }
                }
                return body;
            }
            case "do" -> {
                int body = consumeFullStatement(afterWord(j));
                if (body < 0) return -1;
                int k = skipWs(body);
                if ("while".equals(wordAt(k))) {
                    int p = skipWs(afterWord(k));
                    if (p < len && mask[p] == '(') {
                        int cp = matchParen(p);
                        if (cp < 0) return -1;
                        int s = skipWs(cp + 1);
                        return (s < len && mask[s] == ';') ? s + 1 : cp + 1;
                    }
                }
                return body;
            }
            case "else" -> {
                int eb = consumeFullStatement(afterWord(j));
                return eb < 0 ? -1 : eb;
            }
            default -> { return consumeSimpleOrDef(j); }
        }
    }

    /** A simple statement / declaration / definition: ends at the depth-0 ';' or after a
     *  definitional '{...}' block (function / struct / class / enum / namespace / try). */
    private int consumeSimpleOrDef(int j) {
        String first = wordAt(j);
        boolean firstReturn = first.equals("return") || first.equals("co_return");
        boolean defKeyword = first.equals("struct") || first.equals("class")
                || first.equals("union") || first.equals("enum")
                || first.equals("namespace") || first.equals("try");
        int paren = 0, brace = 0;
        int k = j;
        while (k < len) {
            char c = mask[k];
            switch (c) {
                case '(', '[' -> paren++;
                case ')', ']' -> { if (paren > 0) paren--; }
                case '{' -> {
                    if (paren == 0 && brace == 0) {
                        char prev = prevSignificant(k);
                        boolean defLike = !firstReturn && (prev == ')' || defKeyword);
                        if (defLike) {
                            int m = matchBrace(k);
                            if (m < 0) return -1;
                            int s = skipWs(m + 1);
                            return (s < len && mask[s] == ';') ? s + 1 : m + 1;
                        }
                        brace++; // initializer / uniform-init brace
                    } else brace++;
                }
                case '}' -> {
                    if (brace > 0) brace--;
                    else return k; // closing brace of an enclosing block — statement ended here
                }
                case ';' -> { if (paren == 0 && brace == 0) return k + 1; }
                default -> { /* ordinary char */ }
            }
            k++;
        }
        return -1; // ran off the end without a terminator
    }

    // ── output assembly with line map ──────────────────────────────────────────

    private record Ev(int idx, boolean open, int seq) {}

    private Result build(List<Wrap> wraps) {
        List<Ev> events = new ArrayList<>(wraps.size() * 2);
        for (Wrap w : wraps) {
            events.add(new Ev(w.open, true, w.seq));
            events.add(new Ev(w.close, false, w.seq));
        }
        // at one index: emit closes first (inner = higher seq before outer), then opens (outer = lower seq first)
        events.sort((a, b) -> {
            if (a.idx != b.idx) return Integer.compare(a.idx, b.idx);
            if (a.open != b.open) return a.open ? 1 : -1;       // closes before opens
            return a.open ? Integer.compare(a.seq, b.seq)        // opens: outer (lower seq) first
                          : Integer.compare(b.seq, a.seq);       // closes: inner (higher seq) first
        });

        List<String> outLines = new ArrayList<>();
        List<Integer> outOrig = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        int[] curOrig = { -1 };
        int ei = 0;
        for (int p = 0; p <= len; p++) {
            while (ei < events.size() && events.get(ei).idx == p) {
                String text = events.get(ei).open ? "{\n" : "\n}";
                emit(text, ctxLine(p), cur, curOrig, outLines, outOrig);
                ei++;
            }
            if (p < len) emit(String.valueOf(src.charAt(p)), lineNo[p], cur, curOrig, outLines, outOrig);
        }
        if (cur.length() > 0) { // trailing partial line (source did not end with '\n')
            outLines.add(cur.toString());
            outOrig.add(curOrig[0] == -1 ? lineNo[len] : curOrig[0]);
        }

        String[] lines = outLines.toArray(new String[0]);
        int[] orig = new int[outOrig.size()];
        for (int i = 0; i < orig.length; i++) orig[i] = outOrig.get(i);
        return new Result(lines, orig);
    }

    private static void emit(String text, int orig, StringBuilder cur, int[] curOrig,
                             List<String> outLines, List<Integer> outOrig) {
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (cur.length() == 0 && curOrig[0] == -1) curOrig[0] = orig;
            if (c == '\n') {
                outLines.add(cur.toString());
                outOrig.add(curOrig[0] == -1 ? orig : curOrig[0]);
                cur.setLength(0);
                curOrig[0] = -1;
            } else {
                cur.append(c);
            }
        }
    }

    private int ctxLine(int p) { return p < len ? lineNo[p] : lineNo[len]; }

    // ── lexical helpers over the masked view ───────────────────────────────────

    private boolean isIdentStart(char c) { return Character.isLetter(c) || c == '_'; }
    private boolean isIdentPart(char c) { return Character.isLetterOrDigit(c) || c == '_'; }

    private int afterWord(int j) {
        int k = j;
        while (k < len && isIdentPart(mask[k])) k++;
        return k;
    }

    private String wordAt(int j) {
        if (j >= len || !isIdentStart(mask[j])) return "";
        return src.substring(j, afterWord(j));
    }

    private int skipWs(int j) {
        while (j < len && Character.isWhitespace(mask[j])) j++;
        return j;
    }

    private char prevSignificant(int k) {
        int i = k - 1;
        while (i >= 0 && Character.isWhitespace(mask[i])) i--;
        return i >= 0 ? mask[i] : '\0';
    }

    private int matchParen(int j) {
        int depth = 0;
        for (int k = j; k < len; k++) {
            char c = mask[k];
            if (c == '(') depth++;
            else if (c == ')') { if (--depth == 0) return k; }
        }
        return -1;
    }

    private int matchBrace(int j) {
        int depth = 0;
        for (int k = j; k < len; k++) {
            char c = mask[k];
            if (c == '{') depth++;
            else if (c == '}') { if (--depth == 0) return k; }
        }
        return -1;
    }

    // ── masking: blank strings / chars / comments / preprocessor, preserve length & newlines ──

    private static char[] mask(String s) {
        int n = s.length();
        char[] m = new char[n];
        int state = 0; // 0 normal, 1 //, 2 /* */, 3 "..", 4 '..', 5 preprocessor
        boolean atLineStart = true;
        int i = 0;
        while (i < n) {
            char c = s.charAt(i);
            char next = i + 1 < n ? s.charAt(i + 1) : '\0';
            switch (state) {
                case 0 -> {
                    if (c == '\n') { m[i] = '\n'; atLineStart = true; i++; }
                    else if (atLineStart && c == '#') { m[i] = ' '; state = 5; i++; }
                    else if (c == '/' && next == '/') { m[i] = ' '; m[i + 1] = ' '; state = 1; i += 2; }
                    else if (c == '/' && next == '*') { m[i] = ' '; m[i + 1] = ' '; state = 2; i += 2; }
                    else if (c == '"') { m[i] = ' '; state = 3; i++; if (!Character.isWhitespace(c)) atLineStart = false; }
                    else if (c == '\'') {
                        char prev = i > 0 ? s.charAt(i - 1) : ' ';
                        if (Character.isLetterOrDigit(prev)) { m[i] = c; i++; } // C++14 digit separator: 1'000
                        else { m[i] = ' '; state = 4; i++; }
                        atLineStart = false;
                    } else {
                        m[i] = c;
                        if (!Character.isWhitespace(c)) atLineStart = false;
                        i++;
                    }
                }
                case 1 -> { // line comment
                    if (c == '\n') { m[i] = '\n'; atLineStart = true; state = 0; }
                    else m[i] = ' ';
                    i++;
                }
                case 2 -> { // block comment
                    if (c == '*' && next == '/') { m[i] = ' '; m[i + 1] = ' '; state = 0; i += 2; }
                    else { m[i] = c == '\n' ? '\n' : ' '; i++; }
                }
                case 3 -> { // string literal
                    if (c == '\\') { m[i] = ' '; if (i + 1 < n) m[i + 1] = ' '; i += 2; }
                    else if (c == '"') { m[i] = ' '; state = 0; i++; }
                    else { m[i] = c == '\n' ? '\n' : ' '; i++; }
                }
                case 4 -> { // char literal
                    if (c == '\\') { m[i] = ' '; if (i + 1 < n) m[i + 1] = ' '; i += 2; }
                    else if (c == '\'') { m[i] = ' '; state = 0; i++; }
                    else { m[i] = c == '\n' ? '\n' : ' '; i++; }
                }
                default -> { // 5: preprocessor line (ignore content; '\' continuation not handled — rare)
                    if (c == '\n') { m[i] = '\n'; atLineStart = true; state = 0; }
                    else m[i] = ' ';
                    i++;
                }
            }
        }
        return m;
    }

    private static int[] computeLineNo(String s) {
        int n = s.length();
        int[] ln = new int[n + 1];
        int line = 1;
        for (int i = 0; i < n; i++) {
            ln[i] = line;
            if (s.charAt(i) == '\n') line++;
        }
        ln[n] = line;
        return ln;
    }

    // ── multi-line function-signature joiner (used by the C-family tracers) ─────

    /**
     * Collapse a function signature whose parameter list spans several physical lines
     * ({@code int f(int a,\n int b) {}) onto its first line, blanking the continuation lines.
     * The single-line {@code FUNC}/{@code FUNC_SIG}/{@code METHOD} regexes in the tracers then
     * match it like any one-line definition. Line count is preserved (continuations become
     * empty strings) so a caller's output-line → original-line map stays aligned.
     *
     * <p>Operates on the masked {@code stripped} array for all structural decisions and mutates
     * BOTH arrays in place. Conservative: only joins when the run starts with {@code sigStart}
     * (a "type name (" prefix, first word not in {@code reject}), the parentheses balance within
     * the run, the tail after the closing {@code )} is empty or an opening brace (a definition,
     * not a prototype/call), and no joined line carries a {@code ;} or a comment (joining raw text
     * across a {@code //} comment would swallow the rest of the signature).
     */
    public static void joinSignatures(String[] lines, String[] stripped, java.util.regex.Pattern sigStart,
                                      java.util.Set<String> reject) {
        int n = lines.length;
        int i = 0;
        while (i < n) {
            String code = stripped[i];
            if (!code.trim().isEmpty() && code.indexOf(';') < 0 && !hasComment(lines[i])
                    && sigStart.matcher(code).find() && !reject.contains(firstWordOf(code.trim()))) {
                int bal = parenDelta(code);
                if (bal > 0) {
                    int j = i, b = bal;
                    boolean bad = false;
                    while (j + 1 < n && b > 0) {
                        j++;
                        if (hasComment(lines[j]) || stripped[j].indexOf(';') >= 0) { bad = true; break; }
                        b += parenDelta(stripped[j]);
                    }
                    if (!bad && b == 0 && j > i) {
                        StringBuilder js = new StringBuilder();
                        for (int k = i; k <= j; k++) { if (k > i) js.append(' '); js.append(stripped[k]); }
                        String joined = js.toString();
                        int rp = joined.lastIndexOf(')');
                        String tail = rp >= 0 ? joined.substring(rp + 1).trim() : "x";
                        if (tail.isEmpty() || tail.startsWith("{")) {
                            StringBuilder jr = new StringBuilder();
                            for (int k = i; k <= j; k++) { if (k > i) jr.append(' '); jr.append(lines[k]); }
                            lines[i] = jr.toString();
                            stripped[i] = joined;
                            for (int k = i + 1; k <= j; k++) { lines[k] = ""; stripped[k] = ""; }
                            i = j + 1;
                            continue;
                        }
                    }
                }
            }
            i++;
        }
    }

    private static int parenDelta(String s) {
        int d = 0;
        for (int k = 0; k < s.length(); k++) {
            char c = s.charAt(k);
            if (c == '(') d++;
            else if (c == ')') d--;
        }
        return d;
    }

    private static boolean hasComment(String raw) {
        return raw.contains("//") || raw.contains("/*");
    }

    private static String firstWordOf(String t) {
        int i = 0;
        while (i < t.length() && (Character.isLetterOrDigit(t.charAt(i)) || t.charAt(i) == '_')) i++;
        return t.substring(0, i);
    }

    private static Result identity(String s) {
        String[] lines = s.split("\n", -1);
        int[] orig = new int[lines.length];
        for (int i = 0; i < orig.length; i++) orig[i] = i + 1;
        return new Result(lines, orig);
    }
}
