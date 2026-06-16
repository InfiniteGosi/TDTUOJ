package com.oj.TDTUOJ.visualizer.service.tracer;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * C# tracer (Mono 6.6 / C# 7.3, Judge0 id 51).
 *
 * <p>No Roslyn is reachable from a Java backend, but none is needed: the
 * appended {@code __Viz} class serializes ANY value generically via reflection
 * (arrays incl. jagged, List/Dictionary/HashSet/Stack/Queue, user classes with
 * private fields), so instrumentation only has to harvest variable NAMES.
 * A line-oriented scanner with brace/paren tracking and string/comment
 * stripping does that: it records declarations per brace depth, inserts
 * {@code __Viz.Snap(line, names, values)} after each complete statement inside
 * a method, and wraps method bodies in Enter/try-finally-Exit.
 *
 * <p>C# treats unreachable code as a warning (CS0162), not an error, so a
 * mis-judged insert can never break compilation — snaps after
 * return/break/continue/throw are skipped anyway.
 */
public final class CSharpTracer implements Tracer {

    private static final Pattern METHOD = Pattern.compile(
            "^\\s*(?:(?:public|private|protected|internal|static|sealed|override|virtual|async|new|unsafe|extern|abstract)\\s+)*" +
            "(?:[\\w<>\\[\\],\\.\\?]+\\s+)?(\\w+)\\s*\\(([^)]*)\\)\\s*(\\{)?\\s*$");
    private static final Pattern DECL = Pattern.compile(
            "^\\s*(?:[\\w<>\\[\\],\\.\\?]+)\\s+(\\w+)\\s*=");
    private static final Pattern FOREACH = Pattern.compile(
            "foreach\\s*\\(\\s*[\\w<>\\[\\],\\.\\?]+\\s+(\\w+)\\s+in\\b");
    private static final Pattern FOR_INIT = Pattern.compile(
            "for\\s*\\(\\s*[\\w<>\\[\\],\\.\\?]+\\s+(\\w+)\\s*=");
    private static final Pattern OUT_VAR = Pattern.compile(
            "\\bout\\s+(?:var|[\\w<>\\[\\],\\.\\?]+)\\s+(\\w+)\\b");
    /** Method signature prefix "[modifiers] type name (" — params may run onto later lines
     *  (joined by {@link BraceSynthesizer#joinSignatures} before METHOD runs). */
    private static final Pattern SIG_START = Pattern.compile(
            "^\\s*(?:(?:public|private|protected|internal|static|sealed|override|virtual|async|new|unsafe|extern|abstract)\\s+)*" +
            "[\\w<>\\[\\],\\.\\?]+\\s+\\w+\\s*\\(");
    private static final java.util.Set<String> SIG_REJECT = java.util.Set.of(
            "return", "throw", "new", "if", "else", "for", "foreach", "while", "switch",
            "using", "lock", "catch", "fixed", "yield", "do");
    /** A lambda / anonymous-delegate body opening on this line ({@code => {} or {@code delegate {}).
     *  Snaps inside are suppressed: they would reference the (not-yet-assigned) lambda variable
     *  itself — "use of unassigned local" (CS0165). Suppression only drops frames, never breaks. */
    private static final Pattern LAMBDA_OPEN = Pattern.compile(
            "(?:=>|\\bdelegate\\b\\s*(?:\\([^)]*\\))?)\\s*\\{");

    private static final java.util.Set<String> KEYWORDS = java.util.Set.of(
            "if", "else", "for", "foreach", "while", "do", "switch", "case", "return", "break",
            "continue", "throw", "new", "using", "namespace", "class", "struct", "interface",
            "enum", "public", "private", "protected", "internal", "static", "void", "else if",
            "try", "catch", "finally", "lock", "get", "set", "out", "ref", "in", "default");

    private static final class Var {
        final String name; final int depth;
        Var(String name, int depth) { this.name = name; this.depth = depth; }
    }

    @Override
    public String instrument(String source) {
        BraceSynthesizer.Result norm = BraceSynthesizer.normalize(source);
        String[] lines = norm.lines();
        int[] origLine = norm.origLine();
        StringBuilder out = new StringBuilder();

        // pre-strip every line (string/char/comment-blanked) so multi-line method signatures
        // can be joined before the single-line METHOD regex runs
        String[] stripped = new String[lines.length];
        boolean inBlock = false;
        for (int i = 0; i < lines.length; i++) {
            StrippedLine s = strip(lines[i], inBlock);
            stripped[i] = s.code;
            inBlock = s.inBlockComment;
        }
        BraceSynthesizer.joinSignatures(lines, stripped, SIG_START, SIG_REJECT);

        List<Var> scope = new ArrayList<>();
        // stack of open method bodies: depth where the method's '{' lives
        List<Integer> methodDepth = new ArrayList<>();
        int depth = 0;       // brace depth
        int parenBal = 0;    // unclosed parens across lines (multi-line headers/calls)
        // brace depths of enclosing lambda bodies; snaps are suppressed while inside one
        java.util.Deque<Integer> lambdaDepths = new java.util.ArrayDeque<>();
        boolean pendingMethodBrace = false; // method signature seen, '{' expected on a later line
        List<String> pendingParams = null;
        String pendingName = null;

        for (int idx = 0; idx < lines.length; idx++) {
            String raw = lines[idx];
            String code = stripped[idx];
            String trimmed = code.trim();
            int lineNo = origLine[idx];

            int opens = count(code, '{');
            int closes = count(code, '}');

            // drop lambda scopes we've exited; whatever remains means this line is inside a lambda body
            while (!lambdaDepths.isEmpty() && depth < lambdaDepths.peek()) lambdaDepths.pop();
            boolean inLambda = !lambdaDepths.isEmpty();

            // ── method body closing? (handle before emitting the line) ──────
            boolean closesMethod = !methodDepth.isEmpty()
                    && depth + opens - closes < methodDepth.get(methodDepth.size() - 1) + 1
                    && closes > 0;
            if (closesMethod) {
                // insert "} finally { __Viz.Exit(); }" before the brace that closes the body
                int cut = raw.lastIndexOf('}');
                raw = raw.substring(0, cut) + "} finally { __Viz.Exit(); } }" +
                      raw.substring(cut + 1);
                methodDepth.remove(methodDepth.size() - 1);
            }

            out.append(raw);

            // ── method signature with '{' on the same line ──────────────────
            Matcher m = METHOD.matcher(code);
            boolean isMethodSig = parenBal == 0 && m.matches() && !KEYWORDS.contains(m.group(1))
                    && !trimmed.startsWith("else") && !trimmed.startsWith("if")
                    && !trimmed.startsWith("for") && !trimmed.startsWith("while")
                    && !trimmed.startsWith("switch") && !trimmed.startsWith("catch")
                    && !trimmed.startsWith("using");
            if (isMethodSig && m.group(3) != null) {
                out.append(" __Viz.Enter(\"").append(m.group(1)).append("\"); try {");
                methodDepth.add(depth); // '{' of body sits at this depth
                for (String p : paramNames(m.group(2))) scope.add(new Var(p, depth + 1));
            } else if (isMethodSig) {
                pendingMethodBrace = true;
                pendingName = m.group(1);
                pendingParams = paramNames(m.group(2));
            } else if (pendingMethodBrace && trimmed.startsWith("{")) {
                out.append(" __Viz.Enter(\"").append(pendingName).append("\"); try {");
                methodDepth.add(depth);
                for (String p : pendingParams) scope.add(new Var(p, depth + 1));
                pendingMethodBrace = false;
            } else if (pendingMethodBrace && !trimmed.isEmpty()) {
                pendingMethodBrace = false; // was an interface/abstract signature etc.
            }

            // ── declarations on this line ────────────────────────────────────
            boolean inMethod = !methodDepth.isEmpty();
            if (inMethod && !isMethodSig && !inLambda) {
                Matcher d = DECL.matcher(code);
                if (d.find() && !KEYWORDS.contains(firstWord(trimmed))) {
                    scope.add(new Var(d.group(1), depth));
                }
                // loop vars enter scope only when the loop opens a block on this line;
                // single-line loops (`foreach (var x in a) f(x);`) keep x out of later snaps
                if (code.contains("{")) {
                    Matcher fe = FOREACH.matcher(code);
                    while (fe.find()) scope.add(new Var(fe.group(1), depth + 1));
                    Matcher fi = FOR_INIT.matcher(code);
                    while (fi.find()) scope.add(new Var(fi.group(1), depth + 1));
                }
                Matcher ov = OUT_VAR.matcher(code);
                while (ov.find()) scope.add(new Var(ov.group(1), depth));
            }

            // ── statement-end snap ──────────────────────────────────────────
            parenBal += count(code, '(') - count(code, ')');
            // don't break an if/else chain: `if (c) x;` directly followed by `else …`
            boolean nextIsElse = false;
            for (int k = idx + 1; k < lines.length; k++) {
                String nt = stripped[k].trim();
                if (nt.isEmpty()) continue;
                nextIsElse = nt.startsWith("else");
                break;
            }
            boolean statementEnd = inMethod && parenBal == 0 && trimmed.endsWith(";")
                    && !isMethodSig && !nextIsElse && !inLambda
                    && !startsWithAny(trimmed, "return", "break", "continue", "throw", "using ", "case ", "default:")
                    && !trimmed.startsWith("}");
            if (statementEnd && !visible(scope).isEmpty()) {
                out.append(" __Viz.Snap(").append(lineNo).append(", new string[]{")
                   .append(joinQuoted(visible(scope))).append("}, new object[]{")
                   .append(String.join(",", visible(scope))).append("});");
            }

            out.append('\n');

            // ── update depth & drop out-of-scope vars ───────────────────────
            depth += opens - closes;
            if (closes > 0) {
                int finalDepth = depth;
                scope.removeIf(v -> v.depth > finalDepth);
            }
            // a lambda body opened on this line → suppress snaps until it closes
            if (opens > closes && LAMBDA_OPEN.matcher(code).find()) lambdaDepths.push(depth);
        }

        return out + "\n" + PREAMBLE.replace("__MAX_FRAMES__", String.valueOf(MAX_FRAMES));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private List<String> visible(List<Var> scope) {
        // dedupe keeping the most recent declaration of each name
        Map<String, Boolean> seen = new LinkedHashMap<>();
        for (Var v : scope) seen.put(v.name, true);
        return new ArrayList<>(seen.keySet());
    }

    private static String joinQuoted(List<String> names) {
        StringBuilder sb = new StringBuilder();
        for (String n : names) {
            if (sb.length() > 0) sb.append(',');
            sb.append('"').append(n).append('"');
        }
        return sb.toString();
    }

    private static List<String> paramNames(String params) {
        List<String> out = new ArrayList<>();
        if (params == null || params.isBlank()) return out;
        int angle = 0;
        StringBuilder cur = new StringBuilder();
        List<String> parts = new ArrayList<>();
        for (char c : params.toCharArray()) {
            if (c == '<') angle++;
            else if (c == '>') angle--;
            if (c == ',' && angle == 0) { parts.add(cur.toString()); cur.setLength(0); }
            else cur.append(c);
        }
        if (cur.length() > 0) parts.add(cur.toString());
        for (String p : parts) {
            String[] toks = p.trim().replaceAll("\\s*=\\s*.*$", "").split("\\s+");
            if (toks.length >= 2) out.add(toks[toks.length - 1]);
        }
        return out;
    }

    private static String firstWord(String s) {
        int i = 0;
        while (i < s.length() && (Character.isLetterOrDigit(s.charAt(i)) || s.charAt(i) == '_')) i++;
        return s.substring(0, i);
    }

    private static boolean startsWithAny(String s, String... prefixes) {
        for (String p : prefixes) {
            if (s.startsWith(p)) return true;
        }
        return s.equals("return;") || s.equals("break;") || s.equals("continue;");
    }

    private static int count(String s, char c) {
        int n = 0;
        for (int i = 0; i < s.length(); i++) if (s.charAt(i) == c) n++;
        return n;
    }

    private record StrippedLine(String code, boolean inBlockComment) {}

    /** Blank out string/char literals and comments so brace/paren counting is sane. */
    private static StrippedLine strip(String line, boolean inBlockComment) {
        StringBuilder out = new StringBuilder();
        boolean inStr = false, inChar = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            char next = i + 1 < line.length() ? line.charAt(i + 1) : '\0';
            if (inBlockComment) {
                if (c == '*' && next == '/') { inBlockComment = false; i++; }
                out.append(' ');
                continue;
            }
            if (inStr) {
                if (c == '\\') { out.append("  "); i++; continue; }
                if (c == '"') inStr = false;
                out.append(' ');
                continue;
            }
            if (inChar) {
                if (c == '\\') { out.append("  "); i++; continue; }
                if (c == '\'') inChar = false;
                out.append(' ');
                continue;
            }
            if (c == '/' && next == '/') break;                  // line comment
            if (c == '/' && next == '*') { inBlockComment = true; out.append(' '); i++; continue; }
            if (c == '"') { inStr = true; out.append(' '); continue; }
            if (c == '\'') { inChar = true; out.append(' '); continue; }
            out.append(c);
        }
        return new StrippedLine(out.toString(), inBlockComment);
    }

    // ── Runtime preamble (C# 7.3 / Mono 6.6 compatible) ──────────────────────
    private static final String PREAMBLE = """
            static class __Viz {
                const int MAXF = __MAX_FRAMES__, MAXH = 200, MAXE = 1000, MAXS = 256, MAXD = 8, MAXFLD = 64;
                static readonly System.Collections.Generic.List<string> frames = new System.Collections.Generic.List<string>();
                static readonly System.Collections.Generic.Dictionary<object, int> ids =
                    new System.Collections.Generic.Dictionary<object, int>(new RefCmp());
                static int nextId = 1;
                static int step = 0;
                static bool done = false;
                static bool flushed = false;

                sealed class RefCmp : System.Collections.Generic.IEqualityComparer<object> {
                    public new bool Equals(object a, object b) { return ReferenceEquals(a, b); }
                    public int GetHashCode(object o) { return System.Runtime.CompilerServices.RuntimeHelpers.GetHashCode(o); }
                }

                sealed class Fr {
                    public string Fn; public string[] Names = new string[0]; public object[] Vals = new object[0]; public int Line;
                    public Fr(string fn) { Fn = fn; }
                }
                static readonly System.Collections.Generic.List<Fr> stack = new System.Collections.Generic.List<Fr>();

                sealed class CountingWriter : System.IO.TextWriter {
                    readonly System.IO.TextWriter real;
                    public long Count;
                    public CountingWriter(System.IO.TextWriter r) { real = r; }
                    public override System.Text.Encoding Encoding { get { return real.Encoding; } }
                    public override void Write(char c) { Count++; real.Write(c); }
                    public override void Write(string s) { if (s != null) Count += s.Length; real.Write(s); }
                    public override void WriteLine(string s) { Count += (s == null ? 0 : s.Length) + 1; real.WriteLine(s); }
                    public override void Flush() { real.Flush(); }
                }
                static readonly CountingWriter outWriter;

                static __Viz() {
                    outWriter = new CountingWriter(System.Console.Out);
                    System.Console.SetOut(outWriter);
                    System.AppDomain.CurrentDomain.ProcessExit += delegate { Flush(); };
                    System.AppDomain.CurrentDomain.UnhandledException += delegate { Flush(); };
                }

                public static void Enter(string fn) { stack.Add(new Fr(fn)); }
                public static void Exit() {
                    if (stack.Count > 0) stack.RemoveAt(stack.Count - 1);
                    if (stack.Count == 0) Flush();
                }

                public static void Snap(int line, string[] names, object[] vals) {
                    if (done) return;
                    if (frames.Count >= MAXF) {
                        done = true;
                        frames.Add("{\\"step\\":" + (++step) + ",\\"truncated\\":true}");
                        return;
                    }
                    if (stack.Count == 0) stack.Add(new Fr("Main"));
                    Fr top = stack[stack.Count - 1];
                    top.Names = names; top.Vals = vals; top.Line = line;

                    var heap = new System.Text.StringBuilder();
                    var seen = new System.Collections.Generic.HashSet<int>();
                    int heapCount = 0;
                    var stk = new System.Text.StringBuilder();
                    foreach (Fr f in stack) {
                        if (stk.Length > 0) stk.Append(',');
                        stk.Append("{\\"function\\":\\"").Append(Esc(f.Fn))
                           .Append("\\",\\"line\\":").Append(f.Line == 0 ? line : f.Line)
                           .Append(",\\"locals\\":{");
                        for (int i = 0; i < f.Names.Length; i++) {
                            if (i > 0) stk.Append(',');
                            stk.Append('"').Append(Esc(f.Names[i])).Append("\\":");
                            Enc(f.Vals[i], heap, seen, ref heapCount, 0, stk);
                        }
                        stk.Append("}}");
                    }
                    var frame = new System.Text.StringBuilder();
                    frame.Append("{\\"step\\":").Append(++step)
                         .Append(",\\"line\\":").Append(line)
                         .Append(",\\"event\\":\\"line\\"")
                         .Append(",\\"out_len\\":").Append(outWriter.Count)
                         .Append(",\\"stack\\":[").Append(stk).Append(']')
                         .Append(",\\"heap\\":{").Append(heap).Append("}}");
                    frames.Add(frame.ToString());
                }

                static int Oid(object o) {
                    int v;
                    if (!ids.TryGetValue(o, out v)) { v = nextId++; ids[o] = v; }
                    return v;
                }

                static void Enc(object v, System.Text.StringBuilder heap,
                                System.Collections.Generic.HashSet<int> seen,
                                ref int heapCount, int depth, System.Text.StringBuilder o) {
                    if (v == null) { o.Append("null"); return; }
                    if (v is bool) { o.Append(((bool) v) ? "true" : "false"); return; }
                    if (v is int || v is long || v is short || v is byte || v is sbyte || v is uint || v is ulong || v is ushort) {
                        o.Append(System.Convert.ToString(v, System.Globalization.CultureInfo.InvariantCulture)); return;
                    }
                    if (v is double || v is float || v is decimal) {
                        double d = System.Convert.ToDouble(v, System.Globalization.CultureInfo.InvariantCulture);
                        if (double.IsNaN(d) || double.IsInfinity(d)) { o.Append('"').Append(d).Append('"'); }
                        else o.Append(d.ToString("R", System.Globalization.CultureInfo.InvariantCulture));
                        return;
                    }
                    if (v is char) { o.Append('"').Append(Esc(v.ToString())).Append('"'); return; }
                    if (v is string) {
                        string s = (string) v;
                        if (s.Length > MAXS) s = s.Substring(0, MAXS) + "...";
                        o.Append('"').Append(Esc(s)).Append('"');
                        return;
                    }
                    if (v is System.Enum) { o.Append('"').Append(Esc(v.ToString())).Append('"'); return; }

                    int id = Oid(v);
                    o.Append("\\"@").Append(id).Append('"');
                    if (!seen.Add(id)) return;
                    if (heapCount >= MAXH || depth >= MAXD) {
                        HeapEntry(heap, ref heapCount, id, "{\\"type\\":\\"opaque\\",\\"repr\\":\\"(deep)\\",\\"truncated\\":true}");
                        return;
                    }
                    var e = new System.Text.StringBuilder();
                    var arr = v as System.Array;
                    if (arr != null && arr.Rank == 1) {
                        e.Append("{\\"type\\":\\"list\\",\\"values\\":[");
                        int n = arr.Length;
                        for (int i = 0; i < n && i < MAXE; i++) {
                            if (i > 0) e.Append(',');
                            Enc(arr.GetValue(i), heap, seen, ref heapCount, depth + 1, e);
                        }
                        e.Append(']');
                        if (n > MAXE) e.Append(",\\"truncated\\":true");
                        e.Append('}');
                    } else if (arr != null && arr.Rank == 2) {
                        // rectangular int[,] etc. → list of row lists
                        e.Append("{\\"type\\":\\"list\\",\\"values\\":[");
                        int rows = arr.GetLength(0), cols = arr.GetLength(1);
                        for (int r = 0; r < rows && r < MAXE; r++) {
                            if (r > 0) e.Append(',');
                            int rowId = nextId++;
                            e.Append("\\"@").Append(rowId).Append('"');
                            var row = new System.Text.StringBuilder();
                            row.Append("{\\"type\\":\\"list\\",\\"values\\":[");
                            for (int c = 0; c < cols && c < MAXE; c++) {
                                if (c > 0) row.Append(',');
                                Enc(arr.GetValue(r, c), heap, seen, ref heapCount, depth + 2, row);
                            }
                            row.Append("]}");
                            HeapEntry(heap, ref heapCount, rowId, row.ToString());
                        }
                        e.Append("]}");
                    } else if (v is System.Collections.IDictionary) {
                        var m = (System.Collections.IDictionary) v;
                        e.Append("{\\"type\\":\\"dict\\",\\"entries\\":[");
                        int i = 0;
                        foreach (System.Collections.DictionaryEntry en in m) {
                            if (i >= MAXE) break;
                            if (i++ > 0) e.Append(',');
                            e.Append('[');
                            Enc(en.Key, heap, seen, ref heapCount, depth + 1, e);
                            e.Append(',');
                            Enc(en.Value, heap, seen, ref heapCount, depth + 1, e);
                            e.Append(']');
                        }
                        e.Append(']');
                        if (m.Count > MAXE) e.Append(",\\"truncated\\":true");
                        e.Append('}');
                    } else if (v is System.Collections.IEnumerable) {
                        string kind = "list";
                        string tn = v.GetType().Name;
                        if (tn.StartsWith("HashSet") || tn.StartsWith("SortedSet")) kind = "set";
                        e.Append("{\\"type\\":\\"").Append(kind).Append("\\",\\"values\\":[");
                        int i = 0;
                        foreach (object x in (System.Collections.IEnumerable) v) {
                            if (i >= MAXE) break;
                            if (i++ > 0) e.Append(',');
                            Enc(x, heap, seen, ref heapCount, depth + 1, e);
                        }
                        e.Append("]}");
                    } else {
                        e.Append("{\\"type\\":\\"object\\",\\"class\\":\\"").Append(Esc(v.GetType().Name))
                         .Append("\\",\\"fields\\":{");
                        int cnt = 0;
                        var t = v.GetType();
                        while (t != null && t != typeof(object)) {
                            var fields = t.GetFields(System.Reflection.BindingFlags.Public
                                | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance
                                | System.Reflection.BindingFlags.DeclaredOnly);
                            foreach (var fl in fields) {
                                if (cnt >= MAXFLD) break;
                                if (fl.Name.IndexOf('<') >= 0) continue; // auto-property backing fields: <X>k__BackingField → use prop name
                                object fv;
                                try { fv = fl.GetValue(v); } catch (System.Exception) { continue; }
                                if (cnt++ > 0) e.Append(',');
                                e.Append('"').Append(Esc(fl.Name)).Append("\\":");
                                Enc(fv, heap, seen, ref heapCount, depth + 1, e);
                            }
                            t = t.BaseType;
                        }
                        // surface auto-properties under their property names
                        var props = v.GetType().GetProperties(System.Reflection.BindingFlags.Public
                            | System.Reflection.BindingFlags.Instance);
                        foreach (var pr in props) {
                            if (cnt >= MAXFLD) break;
                            if (!pr.CanRead || pr.GetIndexParameters().Length > 0) continue;
                            var getter = pr.GetGetMethod(true);
                            if (getter == null || !IsAutoProperty(v.GetType(), pr.Name)) continue;
                            object pv;
                            try { pv = pr.GetValue(v, null); } catch (System.Exception) { continue; }
                            if (cnt++ > 0) e.Append(',');
                            e.Append('"').Append(Esc(pr.Name)).Append("\\":");
                            Enc(pv, heap, seen, ref heapCount, depth + 1, e);
                        }
                        e.Append("}}");
                    }
                    HeapEntry(heap, ref heapCount, id, e.ToString());
                }

                static bool IsAutoProperty(System.Type t, string name) {
                    while (t != null) {
                        if (t.GetField("<" + name + ">k__BackingField",
                                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance) != null)
                            return true;
                        t = t.BaseType;
                    }
                    return false;
                }

                static void HeapEntry(System.Text.StringBuilder heap, ref int heapCount, int id, string json) {
                    if (heap.Length > 0) heap.Append(',');
                    heap.Append('"').Append(id).Append("\\":").Append(json);
                    heapCount++;
                }

                static string Esc(string s) {
                    var b = new System.Text.StringBuilder();
                    foreach (char c in s) {
                        if (c == '"') b.Append("\\\\\\"");
                        else if (c == '\\\\') b.Append("\\\\\\\\");
                        else if (c == '\\n') b.Append("\\\\n");
                        else if (c == '\\r') b.Append("\\\\r");
                        else if (c == '\\t') b.Append("\\\\t");
                        else if (c < (char) 0x20) b.Append("\\\\u").Append(((int) c).ToString("x4"));
                        else b.Append(c);
                    }
                    return b.ToString();
                }

                public static void Flush() {
                    if (flushed) return;
                    flushed = true;
                    done = true;
                    var sb = new System.Text.StringBuilder("\\n__FRAMES__[");
                    for (int i = 0; i < frames.Count; i++) {
                        if (i > 0) sb.Append(',');
                        sb.Append(frames[i]);
                    }
                    sb.Append("]__END__\\n");
                    System.Console.Error.Write(sb.ToString());
                    System.Console.Error.Flush();
                }
            }
            """;
}
