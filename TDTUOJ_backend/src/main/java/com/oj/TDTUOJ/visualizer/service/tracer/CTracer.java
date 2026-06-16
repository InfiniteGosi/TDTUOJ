package com.oj.TDTUOJ.visualizer.service.tracer;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * C tracer (GCC 9.2 / C11, Judge0 id 50).
 *
 * <p>C has neither reflection nor templates, so capture calls are TYPED at
 * instrumentation time: the scanner records each declaration's type and emits
 * the matching {@code _viz_cap_*} call (scalars, double, char[] strings,
 * 1D/2D arrays with {@code sizeof}-derived lengths — always correct for true
 * arrays — and generated per-struct serializers for pointer chasing).
 *
 * <p>Call-stack tracking uses GCC's {@code __attribute__((cleanup))} as a
 * poor-man's RAII: one declaration at function entry pushes the frame and pops
 * it on ANY exit path. {@code #line} keeps compile errors on original lines.
 *
 * <p>Documented limits: {@code malloc}'d buffers (unknown length) render as
 * opaque pointers; {@code out_len} is not tracked (no portable stdout hook);
 * anonymous {@code typedef struct {...} X;} (no tag) is not serialized.
 */
public final class CTracer implements Tracer {

    private static final Pattern FUNC = Pattern.compile(
            "^\\s*(?:static\\s+|inline\\s+)*(?:struct\\s+)?[\\w]+(?:\\s*\\*+)?\\s+\\**(\\w+)\\s*\\(([^;{}]*)\\)\\s*\\{\\s*$");
    /** Allman style — same signature, '{' on a later line (no trailing brace, no ';'). */
    private static final Pattern FUNC_SIG = Pattern.compile(
            "^\\s*(?:static\\s+|inline\\s+)*(?:struct\\s+)?[\\w]+(?:\\s*\\*+)?\\s+\\**(\\w+)\\s*\\(([^;{}]*)\\)\\s*$");

    private static final Pattern P_NUM = Pattern.compile(
            "^\\s*(?:static\\s+)?(?:const\\s+)?(?:(unsigned|signed)\\s+)?(int|long\\s+long|long|short|char|_Bool|bool|size_t)\\s+(\\w+)\\s*(\\[[^\\]]*\\])?\\s*(\\[[^\\]]*\\])?\\s*(?:=|;|\\{)");
    private static final Pattern P_DBL = Pattern.compile(
            "^\\s*(?:static\\s+)?(?:const\\s+)?(double|float)\\s+(\\w+)\\s*(\\[[^\\]]*\\])?\\s*(?:=|;|\\{)");
    private static final Pattern P_STRUCT_PTR = Pattern.compile(
            "^\\s*(?:static\\s+)?(?:const\\s+)?(?:struct\\s+)?(\\w+)\\s*\\*\\s*(\\w+)\\s*(?:=|;)");
    private static final Pattern P_STRUCT_VAL = Pattern.compile(
            "^\\s*(?:static\\s+)?struct\\s+(\\w+)\\s+(\\w+)\\s*(?:=|;|\\{)");
    private static final Pattern FOR_INIT = Pattern.compile(
            "for\\s*\\(\\s*(?:int|long|size_t)\\s+(\\w+)\\s*=");
    /** "type name (" prefix at line start — a function signature whose params may run onto
     *  later lines (joined by {@link BraceSynthesizer#joinSignatures}). */
    private static final Pattern SIG_START = Pattern.compile(
            "^\\s*(?:static\\s+|inline\\s+)*(?:struct\\s+)?[A-Za-z_]\\w*(?:\\s*\\*+)?\\s+\\**[A-Za-z_]\\w*\\s*\\(");
    private static final java.util.Set<String> SIG_REJECT = java.util.Set.of(
            "return", "goto", "case", "sizeof", "typedef", "struct", "union", "enum", "else", "do", "while", "for", "if", "switch");

    private static final java.util.Set<String> KEYWORDS = java.util.Set.of(
            "if", "else", "for", "while", "do", "switch", "case", "return", "break", "continue",
            "struct", "union", "enum", "typedef", "static", "const", "void", "sizeof", "goto",
            "printf", "scanf", "default", "main", "free");

    private enum Kind { LL, DBL, STR, ARR_I, ARR_D, ARR2_I, OBJ, OPQ }

    private static final class Var {
        final String name; final int depth; final Kind kind; final String structName;
        Var(String name, int depth, Kind kind, String structName) {
            this.name = name; this.depth = depth; this.kind = kind; this.structName = structName;
        }
    }

    @Override
    public String instrument(String source) {
        BraceSynthesizer.Result norm = BraceSynthesizer.normalize(source);
        String[] lines = norm.lines();
        int[] origLine = norm.origLine();
        String[] stripped = new String[lines.length];
        boolean inBlock = false;
        for (int i = 0; i < lines.length; i++) {
            CppTracer.CSrc s = CppTracer.strip(lines[i], inBlock);
            stripped[i] = s.code();
            inBlock = s.inBlockComment();
        }
        BraceSynthesizer.joinSignatures(lines, stripped, SIG_START, SIG_REJECT);

        List<StructCodegen.StructDef> structs = StructCodegen.findStructs(stripped);
        java.util.Set<String> structNames = new java.util.HashSet<>();
        structs.forEach(s -> structNames.add(s.name()));

        StringBuilder out = new StringBuilder();
        out.append(PREAMBLE.replace("__MAX_FRAMES__", String.valueOf(MAX_FRAMES)));
        // struct serializers must come after the struct definitions, but C has no ADL:
        // forward-declare prototypes now, emit bodies at the end.
        for (StructCodegen.StructDef s : structs) {
            out.append("struct ").append(s.name()).append(";\n");
            out.append("static void _viz_enc_").append(s.name())
               .append("(const struct ").append(s.name()).append("* p, int d, _VizStr* o);\n");
            out.append("static void _viz_obj_").append(s.name()).append("(const char* n, const void* p);\n");
        }

        List<Var> scope = new ArrayList<>();
        List<Var> globals = new ArrayList<>();
        List<Integer> funcDepth = new ArrayList<>();
        int depth = 0;
        int parenBal = 0;
        int expectedLine = -1; // forces an initial "#line" reset after the generated prototypes
        boolean pendingFuncBrace = false;   // Allman signature seen, '{' expected on a later line
        String pendingFuncName = null;
        List<Var> pendingFuncParams = null;

        for (int idx = 0; idx < lines.length; idx++) {
            String raw = lines[idx];
            String code = stripped[idx];
            String trimmed = code.trim();
            int lineNo = origLine[idx];

            // keep compiler errors on the user's original line numbers despite synthesized lines
            if (lineNo != expectedLine) out.append("#line ").append(lineNo).append(" \"user.c\"\n");
            expectedLine = lineNo + 1;

            if (trimmed.startsWith("#")) {
                out.append(raw).append('\n');
                continue;
            }

            int opens = count(code, '{');
            int closes = count(code, '}');

            boolean closesFunc = !funcDepth.isEmpty() && closes > 0
                    && depth + opens - closes <= funcDepth.get(funcDepth.size() - 1);
            if (closesFunc) funcDepth.remove(funcDepth.size() - 1);

            out.append(raw);

            Matcher fm = FUNC.matcher(code);
            boolean isFunc = parenBal == 0 && fm.matches()
                    && isFuncFirstWord(firstWord(trimmed));
            boolean isFuncSig = false;     // Allman signature line; '{' awaited
            boolean opensFuncBody = false; // the lone '{' line that opens an Allman body
            if (isFunc) {
                out.append(" __attribute__((cleanup(_viz_pop))) int _viz_g_ = _viz_push(\"")
                   .append(fm.group(1)).append("\");");
                funcDepth.add(depth);
                for (Var p : cParams(fm.group(2), structNames)) {
                    scope.add(new Var(p.name, depth + 1, p.kind, p.structName));
                }
            } else if (pendingFuncBrace) {
                if (trimmed.startsWith("{")) {
                    out.append(" __attribute__((cleanup(_viz_pop))) int _viz_g_ = _viz_push(\"")
                       .append(pendingFuncName).append("\");");
                    funcDepth.add(depth);
                    for (Var p : pendingFuncParams) {
                        scope.add(new Var(p.name, depth + 1, p.kind, p.structName));
                    }
                    pendingFuncBrace = false;
                    opensFuncBody = true;
                } else if (!trimmed.isEmpty()) {
                    pendingFuncBrace = false; // false alarm
                }
            } else {
                Matcher fs = FUNC_SIG.matcher(code);
                if (parenBal == 0 && fs.matches() && isFuncFirstWord(firstWord(trimmed))) {
                    pendingFuncBrace = true;
                    pendingFuncName = fs.group(1);
                    pendingFuncParams = cParams(fs.group(2), structNames);
                    isFuncSig = true;
                }
            }

            boolean inFunc = !funcDepth.isEmpty();
            boolean funcStructure = isFunc || isFuncSig || opensFuncBody;

            if (!funcStructure && !trimmed.isEmpty() && depth >= (inFunc ? 1 : 0)) {
                Var v = classify(code, trimmed, structNames, depth);
                if (v != null) {
                    if (inFunc) scope.add(v);
                    else if (depth == 0 && trimmed.endsWith(";")) globals.add(v);
                }
                // loop vars enter scope only when the loop opens a block on this line
                if (code.contains("{")) {
                    Matcher fi = FOR_INIT.matcher(code);
                    while (fi.find()) scope.add(new Var(fi.group(1), depth + 1, Kind.LL, null));
                }
            }

            parenBal += count(code, '(') - count(code, ')');
            boolean nextIsElse = false;
            for (int k = idx + 1; k < lines.length; k++) {
                String nt = stripped[k].trim();
                if (nt.isEmpty()) continue;
                nextIsElse = nt.startsWith("else");
                break;
            }
            List<Var> visible = visible(globals, scope);
            boolean statementEnd = inFunc && parenBal == 0 && trimmed.endsWith(";")
                    && !funcStructure && !nextIsElse && !closesFunc
                    && !startsWithAny(trimmed, "return", "break", "continue", "goto", "typedef")
                    && !trimmed.startsWith("}");
            if (statementEnd && !visible.isEmpty()) {
                out.append(" { _viz_begin(").append(lineNo).append(");");
                for (Var v : visible) out.append(cap(v));
                out.append(" _viz_end(); }");
            }

            out.append('\n');

            depth += opens - closes;
            if (closes > 0) {
                int fd = depth;
                scope.removeIf(v -> v.depth > fd);
            }
        }

        out.append("#line 1 \"viz-generated.c\"\n");
        out.append(StructCodegen.cSerializers(structs));
        for (StructCodegen.StructDef s : structs) {
            out.append("static void _viz_obj_").append(s.name()).append("(const char* n, const void* p) {\n")
               .append("  _viz_cap_name(n);\n")
               .append("  _viz_enc_").append(s.name()).append("((const struct ").append(s.name())
               .append("*)p, 0, _viz_cur());\n}\n");
        }
        return out.toString();
    }

    // ── classification & capture codegen ─────────────────────────────────────

    private Var classify(String code, String trimmed, java.util.Set<String> structNames, int depth) {
        // struct declarations first — "struct" itself is a keyword
        Matcher sv = P_STRUCT_VAL.matcher(code);
        if (sv.find() && structNames.contains(sv.group(1)) && !code.contains("*")) {
            return new Var(sv.group(2), depth, Kind.OBJ, "&" + sv.group(1)); // by value — pass address
        }
        Matcher sp = P_STRUCT_PTR.matcher(code);
        if (sp.find() && structNames.contains(sp.group(1))) {
            return new Var(sp.group(2), depth, Kind.OBJ, sp.group(1));
        }

        String fw = firstWord(trimmed);
        if (KEYWORDS.contains(fw)) return null;
        Matcher n = P_NUM.matcher(code);
        if (n.find()) {
            boolean isChar = n.group(2).equals("char");
            if (n.group(5) != null) return new Var(n.group(3), depth, Kind.ARR2_I, null);
            if (n.group(4) != null) return new Var(n.group(3), depth, isChar ? Kind.STR : Kind.ARR_I, null);
            return new Var(n.group(3), depth, Kind.LL, null);
        }
        Matcher d = P_DBL.matcher(code);
        if (d.find()) {
            if (d.group(3) != null) return new Var(d.group(2), depth, Kind.ARR_D, null);
            return new Var(d.group(2), depth, Kind.DBL, null);
        }
        return null;
    }

    private String cap(Var v) {
        return switch (v.kind) {
            case LL    -> " _viz_cap_ll(\"" + v.name + "\", (long long)" + v.name + ");";
            case DBL   -> " _viz_cap_d(\"" + v.name + "\", (double)" + v.name + ");";
            case STR   -> " _viz_cap_s(\"" + v.name + "\", " + v.name + ");";
            case ARR_I -> " _viz_cap_arr_i(\"" + v.name + "\", " + v.name +
                          ", (int)(sizeof(" + v.name + ")/sizeof(" + v.name + "[0])));";
            case ARR_D -> " _viz_cap_arr_d(\"" + v.name + "\", " + v.name +
                          ", (int)(sizeof(" + v.name + ")/sizeof(" + v.name + "[0])));";
            case ARR2_I -> " _viz_cap_arr2_i(\"" + v.name + "\", &" + v.name + "[0][0]" +
                          ", (int)(sizeof(" + v.name + ")/sizeof(" + v.name + "[0]))" +
                          ", (int)(sizeof(" + v.name + "[0])/sizeof(" + v.name + "[0][0])));";
            case OBJ   -> {
                boolean byValue = v.structName.startsWith("&");
                String sn = byValue ? v.structName.substring(1) : v.structName;
                yield " _viz_obj_" + sn + "(\"" + v.name + "\", (const void*)" +
                        (byValue ? "&" + v.name : v.name) + ");";
            }
            case OPQ   -> " _viz_cap_opq(\"" + v.name + "\");";
        };
    }

    private List<Var> cParams(String params, java.util.Set<String> structNames) {
        List<Var> out = new ArrayList<>();
        if (params == null || params.isBlank() || params.trim().equals("void")) return out;
        for (String p : params.split(",")) {
            String t = p.trim();
            Matcher sp = Pattern.compile("(?:struct\\s+)?(\\w+)\\s*\\*\\s*(\\w+)$").matcher(t);
            if (sp.find() && structNames.contains(sp.group(1))) {
                out.add(new Var(sp.group(2), 0, Kind.OBJ, sp.group(1)));
                continue;
            }
            Matcher num = Pattern.compile("(?:unsigned\\s+|signed\\s+)?(int|long\\s+long|long|short|char|size_t|_Bool|bool)\\s+(\\w+)$").matcher(t);
            if (num.find()) {
                out.add(new Var(num.group(2), 0, Kind.LL, null));
                continue;
            }
            Matcher dbl = Pattern.compile("(double|float)\\s+(\\w+)$").matcher(t);
            if (dbl.find()) out.add(new Var(dbl.group(2), 0, Kind.DBL, null));
        }
        return out;
    }

    private static List<Var> visible(List<Var> globals, List<Var> scope) {
        Map<String, Var> seen = new LinkedHashMap<>();
        for (Var g : globals) seen.put(g.name, g);
        for (Var v : scope) seen.put(v.name, v);
        return new ArrayList<>(seen.values());
    }

    private static String firstWord(String s) {
        int i = 0;
        while (i < s.length() && (Character.isLetterOrDigit(s.charAt(i)) || s.charAt(i) == '_')) i++;
        return s.substring(0, i);
    }

    /** Whether a line's first word may begin a function definition's return type.
     *  Rejects control/library keywords; allows {@code void} (common helper return type)
     *  even though it is a keyword. {@code struct}/{@code union}/{@code enum} stay rejected:
     *  instrumenting struct-by-value-returning functions was tried and reverted (a generated
     *  serializer chases an uninitialized pointer field → segfault). */
    private static boolean isFuncFirstWord(String fw) {
        return !KEYWORDS.contains(fw) || fw.equals("void");
    }

    private static boolean startsWithAny(String s, String... prefixes) {
        for (String p : prefixes) {
            if (s.startsWith(p + " ") || s.startsWith(p + ";") || s.startsWith(p + "(") || s.equals(p)) return true;
        }
        return false;
    }

    private static int count(String s, char c) {
        int n = 0;
        for (int i = 0; i < s.length(); i++) if (s.charAt(i) == c) n++;
        return n;
    }

    // ── C11 runtime preamble ─────────────────────────────────────────────────
    private static final String PREAMBLE = """
            #include <stdio.h>
            #include <stdlib.h>
            #include <string.h>

            typedef struct { char* buf; size_t len; size_t cap; } _VizStr;
            static void _viz_init(_VizStr* s) { s->cap = 256; s->len = 0; s->buf = (char*)malloc(s->cap); s->buf[0] = 0; }
            static void _viz_app(_VizStr* s, const char* t) {
                size_t n = strlen(t);
                while (s->len + n + 1 > s->cap) { s->cap *= 2; s->buf = (char*)realloc(s->buf, s->cap); }
                memcpy(s->buf + s->len, t, n + 1);
                s->len += n;
            }
            static void _viz_app_ll(_VizStr* s, long long v) { char t[32]; snprintf(t, 32, "%lld", v); _viz_app(s, t); }
            static void _viz_app_d(_VizStr* s, double v) { char t[40]; snprintf(t, 40, "%g", v); _viz_app(s, t); }
            static void _viz_app_esc(_VizStr* s, const char* t) {
                char b[8];
                for (int i = 0; t[i] && i < 256; i++) {
                    char c = t[i];
                    if (c == '"') _viz_app(s, "\\\\\\"");
                    else if (c == '\\\\') _viz_app(s, "\\\\\\\\");
                    else if (c == '\\n') _viz_app(s, "\\\\n");
                    else if (c == '\\r') _viz_app(s, "\\\\r");
                    else if (c == '\\t') _viz_app(s, "\\\\t");
                    else if ((unsigned char)c < 0x20) { snprintf(b, 8, "\\\\u%04x", c); _viz_app(s, b); }
                    else { b[0] = c; b[1] = 0; _viz_app(s, b); }
                }
            }

            #define _VIZ_MAXF __MAX_FRAMES__
            #define _VIZ_MAX_IDS 65536
            static const void* _viz_id_ptr[_VIZ_MAX_IDS];
            static long long _viz_id_val[_VIZ_MAX_IDS];
            static int _viz_id_n = 0;
            static long long _viz_next_id = 1;
            static char* _viz_frames[_VIZ_MAXF + 1];
            static int _viz_frames_n = 0;
            static int _viz_stepn = 0;
            static int _viz_done = 0;

            static long long _viz_oid(const void* p) {
                for (int i = _viz_id_n - 1; i >= 0; i--) if (_viz_id_ptr[i] == p) return _viz_id_val[i];
                if (_viz_id_n < _VIZ_MAX_IDS) {
                    _viz_id_ptr[_viz_id_n] = p;
                    _viz_id_val[_viz_id_n] = _viz_next_id;
                    _viz_id_n++;
                }
                return _viz_next_id++;
            }

            typedef struct { const char* fn; int line; char* locals; char* heap; } _VizSF;
            static _VizSF _viz_stack[512];
            static int _viz_sp = 0;

            /* per-snap state */
            static _VizStr _viz_locals;
            static _VizStr _viz_heap;
            static int _viz_first;
            static int _viz_heap_n;
            static long long _viz_seen[512];
            static int _viz_seen_n;
            static int _viz_line;

            static _VizStr* _viz_cur(void) { return &_viz_locals; }

            static int _viz_mark(long long id, int d) {
                for (int i = 0; i < _viz_seen_n; i++) if (_viz_seen[i] == id) return 0;
                if (_viz_seen_n < 512) _viz_seen[_viz_seen_n++] = id;
                if (_viz_heap_n >= 200 || d >= 8 || _viz_seen_n >= 512) return 0;
                return 1;
            }
            static void _viz_entry(long long id, const char* json) {
                if (_viz_heap.len) _viz_app(&_viz_heap, ",");
                _viz_app(&_viz_heap, "\\"");
                _viz_app_ll(&_viz_heap, id);
                _viz_app(&_viz_heap, "\\":");
                _viz_app(&_viz_heap, json);
                _viz_heap_n++;
            }

            static void _viz_flush(void) {
                static int flushed = 0;
                if (flushed) return;
                flushed = 1;
                fputs("\\n__FRAMES__[", stderr);
                for (int i = 0; i < _viz_frames_n; i++) {
                    if (i) fputc(',', stderr);
                    fputs(_viz_frames[i], stderr);
                }
                fputs("]__END__\\n", stderr);
                fflush(stderr);
            }

            static int _viz_push(const char* fn) {
                if (_viz_sp < 512) {
                    _viz_stack[_viz_sp].fn = fn;
                    _viz_stack[_viz_sp].line = 0;
                    _viz_stack[_viz_sp].locals = NULL;
                    _viz_stack[_viz_sp].heap = NULL;
                    _viz_sp++;
                }
                static int registered = 0;
                if (!registered) { registered = 1; atexit(_viz_flush); }
                return 0;
            }
            static void _viz_pop(int* unused) {
                (void)unused;
                if (_viz_sp > 0) {
                    _viz_sp--;
                    free(_viz_stack[_viz_sp].locals);
                    free(_viz_stack[_viz_sp].heap);
                    _viz_stack[_viz_sp].locals = NULL;
                    _viz_stack[_viz_sp].heap = NULL;
                }
            }

            static void _viz_begin(int line) {
                if (_viz_done) return;
                _viz_init(&_viz_locals);
                _viz_init(&_viz_heap);
                _viz_first = 1;
                _viz_heap_n = 0;
                _viz_seen_n = 0;
                _viz_line = line;
            }
            static void _viz_cap_name(const char* n) {
                if (!_viz_first) _viz_app(&_viz_locals, ",");
                _viz_first = 0;
                _viz_app(&_viz_locals, "\\"");
                _viz_app_esc(&_viz_locals, n);
                _viz_app(&_viz_locals, "\\":");
            }
            static void _viz_cap_ll(const char* n, long long v) { _viz_cap_name(n); _viz_app_ll(&_viz_locals, v); }
            static void _viz_cap_d(const char* n, double v) { _viz_cap_name(n); _viz_app_d(&_viz_locals, v); }
            static void _viz_cap_s(const char* n, const char* v) {
                _viz_cap_name(n);
                if (!v) { _viz_app(&_viz_locals, "null"); return; }
                _viz_app(&_viz_locals, "\\"");
                _viz_app_esc(&_viz_locals, v);
                _viz_app(&_viz_locals, "\\"");
            }
            static void _viz_cap_opq(const char* n) { _viz_cap_name(n); _viz_app(&_viz_locals, "\\"(opaque)\\""); }

            static void _viz_arr_entry(const char* n, long long id, _VizStr* body) {
                _viz_cap_name(n);
                _viz_app(&_viz_locals, "\\"@");
                _viz_app_ll(&_viz_locals, id);
                _viz_app(&_viz_locals, "\\"");
                if (_viz_mark(id, 0)) _viz_entry(id, body->buf);
                free(body->buf);
            }
            static void _viz_cap_arr_i(const char* n, const int* a, int len) {
                long long id = _viz_oid((const void*)a);
                _VizStr e; _viz_init(&e);
                _viz_app(&e, "{\\"type\\":\\"list\\",\\"values\\":[");
                for (int i = 0; i < len && i < 1000; i++) { if (i) _viz_app(&e, ","); _viz_app_ll(&e, a[i]); }
                _viz_app(&e, "]}");
                _viz_arr_entry(n, id, &e);
            }
            static void _viz_cap_arr_d(const char* n, const double* a, int len) {
                long long id = _viz_oid((const void*)a);
                _VizStr e; _viz_init(&e);
                _viz_app(&e, "{\\"type\\":\\"list\\",\\"values\\":[");
                for (int i = 0; i < len && i < 1000; i++) { if (i) _viz_app(&e, ","); _viz_app_d(&e, a[i]); }
                _viz_app(&e, "]}");
                _viz_arr_entry(n, id, &e);
            }
            static void _viz_cap_arr2_i(const char* n, const int* a, int rows, int cols) {
                long long id = _viz_oid((const void*)a);
                _VizStr e; _viz_init(&e);
                _viz_app(&e, "{\\"type\\":\\"list\\",\\"values\\":[");
                for (int r = 0; r < rows && r < 200; r++) {
                    if (r) _viz_app(&e, ",");
                    /* synthetic ids — &a[0][0] aliases &a, which would collide with the outer id */
                    long long rid = _viz_next_id++;
                    _viz_app(&e, "\\"@"); _viz_app_ll(&e, rid); _viz_app(&e, "\\"");
                    if (_viz_mark(rid, 1)) {
                        _VizStr row; _viz_init(&row);
                        _viz_app(&row, "{\\"type\\":\\"list\\",\\"values\\":[");
                        for (int c2 = 0; c2 < cols && c2 < 1000; c2++) {
                            if (c2) _viz_app(&row, ",");
                            _viz_app_ll(&row, a[(size_t)r * cols + c2]);
                        }
                        _viz_app(&row, "]}");
                        _viz_entry(rid, row.buf);
                        free(row.buf);
                    }
                }
                _viz_app(&e, "]}");
                _viz_arr_entry(n, id, &e);
            }

            static char* _viz_strdup(const char* s) { char* r = (char*)malloc(strlen(s) + 1); strcpy(r, s); return r; }

            static void _viz_end(void) {
                if (_viz_done) { free(_viz_locals.buf); free(_viz_heap.buf); return; }
                if (_viz_frames_n >= _VIZ_MAXF) {
                    _viz_done = 1;
                    _VizStr t; _viz_init(&t);
                    _viz_app(&t, "{\\"step\\":");
                    _viz_app_ll(&t, ++_viz_stepn);
                    _viz_app(&t, ",\\"truncated\\":true}");
                    _viz_frames[_viz_frames_n++] = t.buf;
                    free(_viz_locals.buf); free(_viz_heap.buf);
                    return;
                }
                if (_viz_sp == 0) _viz_push("main");
                _VizSF* top = &_viz_stack[_viz_sp - 1];
                free(top->locals); free(top->heap);
                top->locals = _viz_locals.buf;
                top->heap = _viz_heap.buf;
                top->line = _viz_line;

                _VizStr f; _viz_init(&f);
                _viz_app(&f, "{\\"step\\":");
                _viz_app_ll(&f, ++_viz_stepn);
                _viz_app(&f, ",\\"line\\":");
                _viz_app_ll(&f, _viz_line);
                _viz_app(&f, ",\\"event\\":\\"line\\",\\"stack\\":[");
                for (int i = 0; i < _viz_sp; i++) {
                    if (i) _viz_app(&f, ",");
                    _viz_app(&f, "{\\"function\\":\\"");
                    _viz_app_esc(&f, _viz_stack[i].fn ? _viz_stack[i].fn : "?");
                    _viz_app(&f, "\\",\\"line\\":");
                    _viz_app_ll(&f, _viz_stack[i].line ? _viz_stack[i].line : _viz_line);
                    _viz_app(&f, ",\\"locals\\":{");
                    if (_viz_stack[i].locals) _viz_app(&f, _viz_stack[i].locals);
                    _viz_app(&f, "}}");
                }
                _viz_app(&f, "],\\"heap\\":{");
                int any = 0;
                for (int i = 0; i < _viz_sp; i++) {
                    if (_viz_stack[i].heap && _viz_stack[i].heap[0]) {
                        if (any) _viz_app(&f, ",");
                        _viz_app(&f, _viz_stack[i].heap);
                        any = 1;
                    }
                }
                _viz_app(&f, "}}");
                _viz_frames[_viz_frames_n++] = f.buf;
            }
            """;
}
