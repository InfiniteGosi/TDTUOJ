package com.oj.TDTUOJ.visualizer.service.tracer;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * C++ tracer (Judge0 id 76, C++14-compatible output).
 *
 * <p>No reflection exists in C++, so the preamble carries a family of SFINAE
 * template serializers (arithmetic, std::string, any iterable, maps, pairs,
 * C arrays, std::stack/queue via the protected-member trick, and an opaque
 * catch-all so NO type can break compilation). User structs get serializers
 * GENERATED per definition ({@link StructCodegen}) and appended after the user
 * code — ADL finds them at end-of-TU template instantiation, which lets the
 * tracer chase {@code Node*} pointers into linked lists and trees.
 *
 * <p>Call stack uses an RAII guard (ctor pushes, dtor pops — exception-safe
 * with zero closing-edit bookkeeping). {@code #line} directives keep compiler
 * errors pointing at the user's original line numbers.
 *
 * <p>Known limits (documented): raw {@code new T[n]}/malloc buffers render as
 * opaque pointers; outer stack frames show state frozen at their last own
 * statement; printf output is not counted into {@code out_len} (cout is).
 */
public final class CppTracer implements Tracer {

    private static final Pattern FUNC = Pattern.compile(
            "^\\s*(?:template\\s*<[^>]*>\\s*)?(?:static\\s+|inline\\s+|constexpr\\s+)*" +
            "[\\w:<>,\\*&\\s]+?[\\s\\*&]([\\w:~]+)\\s*\\(([^;{}]*)\\)\\s*(?:const\\s*)?(?:noexcept\\s*)?(?::[^{]*)?\\{\\s*$");
    /** Allman style — same signature but the '{' lives on a later line (no trailing brace,
     *  and not a prototype: the lack of a ';' is what distinguishes it from a declaration). */
    private static final Pattern FUNC_SIG = Pattern.compile(
            "^\\s*(?:template\\s*<[^>]*>\\s*)?(?:static\\s+|inline\\s+|constexpr\\s+)*" +
            "[\\w:<>,\\*&\\s]+?[\\s\\*&]([\\w:~]+)\\s*\\(([^;{}]*)\\)\\s*(?:const\\s*)?(?:noexcept\\s*)?(?::[^{]*)?$");
    private static final Pattern DECL = Pattern.compile(
            "^\\s*(?:const\\s+|static\\s+|unsigned\\s+|signed\\s+|long\\s+)*" +
            "[A-Za-z_][\\w:]*(?:\\s*<[^;=]*>)?[\\s\\*&]+(\\w+)\\s*(?:\\[[^\\]]*\\]\\s*)*\\s*(?:=|;|\\{|\\()");
    private static final Pattern FOR_INIT = Pattern.compile(
            "for\\s*\\(\\s*(?:const\\s+)?[\\w:<>,]+(?:\\s*<[^;:]*>)?[\\s\\*&]+(\\w+)\\s*(?:=|:)");
    /** A lambda introducer that opens its body brace on this line: a capture list {@code [...]}
     *  (not an array subscript — guarded by the lookbehind), optional {@code (params)},
     *  optional {@code mutable} / trailing return, then '{'. Used to suppress snaps inside the
     *  body: the line scanner would otherwise reference outer locals the lambda never captured,
     *  which does not compile. Suppression only drops frames, so a false match is always safe. */
    private static final Pattern LAMBDA_OPEN = Pattern.compile(
            "(?<![\\w\\]\\)])\\[[^\\]\\[]*\\]\\s*(?:\\([^()]*\\))?\\s*(?:mutable\\b)?\\s*(?:->[^{;]*)?\\s*\\{");

    /** "type name (" prefix at line start — a function signature whose params may run onto
     *  later lines (joined by {@link BraceSynthesizer#joinSignatures}). */
    private static final Pattern SIG_START = Pattern.compile(
            "^\\s*(?:template\\s*<[^>]*>\\s*)?(?:static\\s+|inline\\s+|constexpr\\s+)*" +
            "[A-Za-z_][\\w:<>,]*[\\s\\*&]+~?[A-Za-z_][\\w:]*\\s*\\(");
    /** First words that look like "type name (" but are not function definitions. */
    private static final java.util.Set<String> SIG_REJECT = java.util.Set.of(
            "return", "throw", "new", "delete", "case", "goto", "else", "sizeof",
            "typedef", "using", "namespace", "struct", "class", "enum", "union", "co_return", "co_await");

    private static final java.util.Set<String> KEYWORDS = java.util.Set.of(
            "if", "else", "for", "while", "do", "switch", "case", "return", "break", "continue",
            "throw", "new", "delete", "using", "namespace", "class", "struct", "union", "enum",
            "public", "private", "protected", "template", "typedef", "typename", "operator",
            "sizeof", "goto", "try", "catch", "cout", "cin", "cerr", "std", "printf", "scanf",
            "default", "main");

    private static final class Var {
        final String name; final int depth;
        Var(String name, int depth) { this.name = name; this.depth = depth; }
    }

    @Override
    public String instrument(String source) {
        BraceSynthesizer.Result norm = BraceSynthesizer.normalize(source);
        String[] lines = norm.lines();
        int[] origLine = norm.origLine();
        String[] stripped = new String[lines.length];
        boolean inBlock = false;
        for (int i = 0; i < lines.length; i++) {
            CSrc s = strip(lines[i], inBlock);
            stripped[i] = s.code();
            inBlock = s.inBlockComment();
        }
        BraceSynthesizer.joinSignatures(lines, stripped, SIG_START, SIG_REJECT);

        List<StructCodegen.StructDef> structs = StructCodegen.findStructs(stripped);

        StringBuilder out = new StringBuilder();
        out.append(PREAMBLE.replace("__MAX_FRAMES__", String.valueOf(MAX_FRAMES)));

        List<Var> scope = new ArrayList<>();
        List<String> globals = new ArrayList<>();
        List<Integer> funcDepth = new ArrayList<>();
        int depth = 0;
        int parenBal = 0;
        int expectedLine = -1; // forces an initial "#line" reset after the preamble
        // brace depths at which an enclosing lambda body sits; while inside one, snaps are
        // suppressed (the body cannot reference uncaptured outer locals)
        java.util.Deque<Integer> lambdaDepths = new java.util.ArrayDeque<>();
        boolean pendingFuncBrace = false;   // Allman signature seen, '{' expected on a later line
        String pendingFuncName = null;
        List<String> pendingFuncParams = null;

        for (int idx = 0; idx < lines.length; idx++) {
            String raw = lines[idx];
            String code = stripped[idx];
            String trimmed = code.trim();
            int lineNo = origLine[idx];

            // keep compiler errors on the user's original line numbers despite synthesized lines
            if (lineNo != expectedLine) out.append("#line ").append(lineNo).append(" \"user.cpp\"\n");
            expectedLine = lineNo + 1;

            if (trimmed.startsWith("#")) { // preprocessor — leave untouched
                out.append(raw).append('\n');
                continue;
            }

            int opens = count(code, '{');
            int closes = count(code, '}');

            // drop lambda scopes we've exited; whatever remains means this line is inside a lambda body
            while (!lambdaDepths.isEmpty() && depth < lambdaDepths.peek()) lambdaDepths.pop();
            boolean inLambda = !lambdaDepths.isEmpty();

            boolean closesFunc = !funcDepth.isEmpty() && closes > 0
                    && depth + opens - closes <= funcDepth.get(funcDepth.size() - 1);
            if (closesFunc) funcDepth.remove(funcDepth.size() - 1);

            out.append(raw);

            // ── function body opens on this line (K&R same-line or Allman) ──
            Matcher fm = FUNC.matcher(code);
            boolean isFunc = parenBal == 0 && fm.matches()
                    && !KEYWORDS.contains(firstWord(trimmed))
                    && !trimmed.startsWith("else") && !fm.group(1).contains("~");
            boolean isFuncSig = false;     // Allman signature line; '{' awaited
            boolean opensFuncBody = false; // the lone '{' line that opens an Allman body
            if (isFunc) {
                String fname = fm.group(1).replaceAll(".*::", "");
                out.append(" _VizGuard _viz_g_(\"").append(fname).append("\");");
                funcDepth.add(depth);
                for (String p : paramNames(fm.group(2))) scope.add(new Var(p, depth + 1));
            } else if (pendingFuncBrace) {
                if (trimmed.startsWith("{")) {
                    out.append(" _VizGuard _viz_g_(\"").append(pendingFuncName).append("\");");
                    funcDepth.add(depth);
                    for (String p : pendingFuncParams) scope.add(new Var(p, depth + 1));
                    pendingFuncBrace = false;
                    opensFuncBody = true;
                } else if (!trimmed.isEmpty()) {
                    pendingFuncBrace = false; // false alarm (prototype-like line, etc.)
                }
            } else {
                Matcher fs = FUNC_SIG.matcher(code);
                if (parenBal == 0 && fs.matches() && !KEYWORDS.contains(firstWord(trimmed))
                        && !trimmed.startsWith("else") && !fs.group(1).contains("~")) {
                    pendingFuncBrace = true;
                    pendingFuncName = fs.group(1).replaceAll(".*::", "");
                    pendingFuncParams = paramNames(fs.group(2));
                    isFuncSig = true;
                }
            }

            boolean inFunc = !funcDepth.isEmpty();
            boolean funcStructure = isFunc || isFuncSig || opensFuncBody;

            // ── declarations ────────────────────────────────────────────────
            if (!funcStructure && !trimmed.isEmpty() && !inLambda) {
                Matcher d = DECL.matcher(code);
                String fw = firstWord(trimmed);
                if (d.find() && d.start() == 0 && !KEYWORDS.contains(fw) && !fw.isEmpty()) {
                    if (inFunc) scope.add(new Var(d.group(1), depth));
                    else if (depth == 0 && trimmed.endsWith(";")) globals.add(d.group(1));
                }
                // loop vars enter scope only when the loop opens a block on this line;
                // single-line loops (`for (int x : a) f(x);`) keep x out of later snaps
                if (code.contains("{")) {
                    Matcher fi = FOR_INIT.matcher(code);
                    while (fi.find()) scope.add(new Var(fi.group(1), depth + 1));
                }
            }

            // ── statement-end snap ──────────────────────────────────────────
            parenBal += count(code, '(') - count(code, ')');
            boolean nextIsElse = false;
            for (int k = idx + 1; k < lines.length; k++) {
                String nt = stripped[k].trim();
                if (nt.isEmpty()) continue;
                nextIsElse = nt.startsWith("else");
                break;
            }
            List<String> visible = visible(globals, scope);
            boolean statementEnd = inFunc && parenBal == 0 && trimmed.endsWith(";")
                    && !funcStructure && !nextIsElse && !closesFunc && !inLambda
                    && !startsWithAny(trimmed, "return", "break", "continue", "throw", "using", "typedef", "goto")
                    && !trimmed.startsWith("}");
            if (statementEnd && !visible.isEmpty()) {
                out.append(" _viz_snap(").append(lineNo);
                for (String v : visible) out.append(", \"").append(v).append("\", ").append(v);
                out.append(");");
            }

            out.append('\n');

            depth += opens - closes;
            if (closes > 0) {
                int fd = depth;
                scope.removeIf(v -> v.depth > fd);
            }
            // a lambda body opened on this line → suppress snaps until it closes (depth returns below)
            if (opens > closes && LAMBDA_OPEN.matcher(code).find()) lambdaDepths.push(depth);
        }

        out.append("#line 1 \"viz-generated.cpp\"\n");
        out.append(StructCodegen.cppSerializers(structs));
        return out.toString();
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static List<String> visible(List<String> globals, List<Var> scope) {
        Map<String, Boolean> seen = new LinkedHashMap<>();
        for (String g : globals) seen.put(g, true);
        for (Var v : scope) seen.put(v.name, true);
        return new ArrayList<>(seen.keySet());
    }

    private static List<String> paramNames(String params) {
        List<String> out = new ArrayList<>();
        if (params == null || params.isBlank() || params.trim().equals("void")) return out;
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
            String t = p.trim().replaceAll("\\s*=\\s*.*$", "").replaceAll("\\[[^\\]]*\\]", "");
            String[] toks = t.split("[\\s\\*&]+");
            if (toks.length >= 2) {
                String name = toks[toks.length - 1];
                if (name.matches("\\w+")) out.add(name);
            }
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
            if (s.startsWith(p + " ") || s.startsWith(p + ";") || s.startsWith(p + "(") || s.equals(p)) return true;
        }
        return false;
    }

    private static int count(String s, char c) {
        int n = 0;
        for (int i = 0; i < s.length(); i++) if (s.charAt(i) == c) n++;
        return n;
    }

    record CSrc(String code, boolean inBlockComment) {}

    /** Blank out string/char literals and comments (shared shape with CSharpTracer). */
    static CSrc strip(String line, boolean inBlockComment) {
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
            if (c == '/' && next == '/') break;
            if (c == '/' && next == '*') { inBlockComment = true; out.append(' '); i++; continue; }
            if (c == '"') { inStr = true; out.append(' '); continue; }
            if (c == '\'') { inChar = true; out.append(' '); continue; }
            out.append(c);
        }
        return new CSrc(out.toString(), inBlockComment);
    }

    // ── C++14 runtime preamble ───────────────────────────────────────────────
    private static final String PREAMBLE = """
            #include <cstdio>
            #include <cstdlib>
            #include <string>
            #include <vector>
            #include <map>
            #include <set>
            #include <deque>
            #include <list>
            #include <stack>
            #include <queue>
            #include <utility>
            #include <type_traits>
            #include <iostream>
            #include <exception>

            static std::map<const void*, long long> _viz_ids;
            static long long _viz_next_id = 1;
            static std::vector<std::string> _viz_frames;
            static int _viz_stepn = 0;
            static bool _viz_done = false;

            struct _VizSF { const char* fn; int line; std::string locals; std::string heapFrag; };
            static std::vector<_VizSF> _viz_stack;

            struct _VizBuf : std::streambuf {
              std::streambuf* real = nullptr; long long n = 0;
              int overflow(int ch) override { if (ch != EOF) n++; return real->sputc((char)ch); }
              std::streamsize xsputn(const char* s, std::streamsize k) override { n += k; return real->sputn(s, k); }
            };
            static _VizBuf _viz_buf;

            static std::string _viz_esc(const std::string& s) {
              std::string b;
              for (size_t i = 0; i < s.size() && i < 256; i++) {
                char c = s[i];
                if (c == '"') b += "\\\\\\"";
                else if (c == '\\\\') b += "\\\\\\\\";
                else if (c == '\\n') b += "\\\\n";
                else if (c == '\\r') b += "\\\\r";
                else if (c == '\\t') b += "\\\\t";
                else if ((unsigned char)c < 0x20) { char t[8]; snprintf(t, 8, "\\\\u%04x", c); b += t; }
                else b += c;
              }
              return b;
            }

            struct _VizCtx {
              std::set<long long> seen;
              std::string heap;
              int heapCount = 0;
              long long oid(const void* p) {
                std::map<const void*, long long>::iterator it = _viz_ids.find(p);
                if (it != _viz_ids.end()) return it->second;
                return _viz_ids[p] = _viz_next_id++;
              }
              void entry(long long id, const std::string& json) {
                if (!heap.empty()) heap += ',';
                heap += '"'; heap += std::to_string(id); heap += "\\":"; heap += json;
                heapCount++;
              }
              bool mark(long long id, int d) {
                if (seen.count(id)) return false;
                seen.insert(id);
                if (heapCount >= 200 || d >= 8) {
                  entry(id, "{\\"type\\":\\"opaque\\",\\"repr\\":\\"(deep)\\",\\"truncated\\":true}");
                  return false;
                }
                return true;
              }
            };

            template<class...> struct _viz_void { typedef void type; };
            template<class T, class = void> struct _viz_is_iter : std::false_type {};
            template<class T> struct _viz_is_iter<T, typename _viz_void<typename T::const_iterator,
                decltype(std::declval<const T&>().begin())>::type> : std::true_type {};
            template<class T, class = void> struct _viz_is_map : std::false_type {};
            template<class T> struct _viz_is_map<T, typename _viz_void<typename T::mapped_type>::type> : std::true_type {};
            template<class T, class = void> struct _viz_is_setlike : std::false_type {};
            template<class T> struct _viz_is_setlike<T, typename _viz_void<typename T::key_type>::type> : std::true_type {};
            template<class T, class = void> struct _viz_is_pair : std::false_type {};
            template<class T> struct _viz_is_pair<T, typename _viz_void<typename T::first_type>::type> : std::true_type {};
            template<class T> struct _viz_known : std::integral_constant<bool,
                std::is_arithmetic<T>::value || std::is_enum<T>::value || std::is_pointer<T>::value ||
                std::is_array<T>::value || _viz_is_iter<T>::value || _viz_is_map<T>::value ||
                _viz_is_pair<T>::value || std::is_same<T, std::string>::value> {};

            inline void _viz_enc(const bool& v, _VizCtx&, int, std::string& o) { o += (v ? "true" : "false"); }
            inline void _viz_enc(const char& v, _VizCtx&, int, std::string& o) { o += '"'; o += _viz_esc(std::string(1, v)); o += '"'; }
            inline void _viz_enc(const std::string& v, _VizCtx&, int, std::string& o) { o += '"'; o += _viz_esc(v); o += '"'; }
            inline void _viz_enc(const char* const& v, _VizCtx&, int, std::string& o) {
              if (!v) { o += "null"; return; }
              o += '"'; o += _viz_esc(std::string(v)); o += '"';
            }

            template<class T>
            typename std::enable_if<std::is_arithmetic<T>::value && !std::is_same<T, bool>::value && !std::is_same<T, char>::value>::type
            _viz_enc(const T& v, _VizCtx&, int, std::string& o) {
              char t[64];
              if (std::is_floating_point<T>::value) {
                double d = (double)v;
                if (d != d) { o += "\\"nan\\""; return; }
                snprintf(t, 64, "%g", d);
              } else {
                snprintf(t, 64, "%lld", (long long)v);
              }
              o += t;
            }

            template<class T>
            typename std::enable_if<std::is_enum<T>::value>::type
            _viz_enc(const T& v, _VizCtx&, int, std::string& o) {
              char t[32]; snprintf(t, 32, "%lld", (long long)v); o += t;
            }

            template<class T, class... R> void _viz_cap(std::string&, bool&, _VizCtx&, const char*, const T&, R&&...);

            template<class T>
            typename std::enable_if<_viz_is_iter<T>::value && !_viz_is_map<T>::value && !std::is_same<T, std::string>::value>::type
            _viz_enc(const T& v, _VizCtx& c, int d, std::string& o) {
              long long id = c.oid((const void*)&v);
              o += "\\"@"; o += std::to_string(id); o += '"';
              if (!c.mark(id, d)) return;
              std::string e = "{\\"type\\":\\"";
              e += (_viz_is_setlike<T>::value ? "set" : "list");
              e += "\\",\\"values\\":[";
              int i = 0;
              for (typename T::const_iterator it = v.begin(); it != v.end() && i < 1000; ++it, ++i) {
                if (i) e += ',';
                _viz_enc(*it, c, d + 1, e);
              }
              e += "]}";
              c.entry(id, e);
            }

            template<class T>
            typename std::enable_if<_viz_is_map<T>::value>::type
            _viz_enc(const T& v, _VizCtx& c, int d, std::string& o) {
              long long id = c.oid((const void*)&v);
              o += "\\"@"; o += std::to_string(id); o += '"';
              if (!c.mark(id, d)) return;
              std::string e = "{\\"type\\":\\"dict\\",\\"entries\\":[";
              int i = 0;
              for (typename T::const_iterator it = v.begin(); it != v.end() && i < 1000; ++it, ++i) {
                if (i) e += ',';
                e += '[';
                _viz_enc(it->first, c, d + 1, e);
                e += ',';
                _viz_enc(it->second, c, d + 1, e);
                e += ']';
              }
              e += "]}";
              c.entry(id, e);
            }

            template<class T>
            typename std::enable_if<_viz_is_pair<T>::value && !_viz_is_iter<T>::value>::type
            _viz_enc(const T& v, _VizCtx& c, int d, std::string& o) {
              long long id = c.oid((const void*)&v);
              o += "\\"@"; o += std::to_string(id); o += '"';
              if (!c.mark(id, d)) return;
              std::string e = "{\\"type\\":\\"list\\",\\"values\\":[";
              _viz_enc(v.first, c, d + 1, e);
              e += ',';
              _viz_enc(v.second, c, d + 1, e);
              e += "]}";
              c.entry(id, e);
            }

            template<class T, size_t N>
            void _viz_enc(const T (&a)[N], _VizCtx& c, int d, std::string& o) {
              long long id = c.oid((const void*)&a);
              o += "\\"@"; o += std::to_string(id); o += '"';
              if (!c.mark(id, d)) return;
              std::string e = "{\\"type\\":\\"list\\",\\"values\\":[";
              for (size_t i = 0; i < N && i < 1000; i++) {
                if (i) e += ',';
                _viz_enc(a[i], c, d + 1, e);
              }
              e += "]}";
              c.entry(id, e);
            }
            template<size_t N>
            void _viz_enc(const char (&a)[N], _VizCtx&, int, std::string& o) {
              o += '"'; o += _viz_esc(std::string(a, a + (a[N-1] == 0 ? N - 1 : N))); o += '"';
            }

            template<class T, class C> struct _VizStackHack : std::stack<T, C> {
              static const C& get(const std::stack<T, C>& s) { return s.*&_VizStackHack::c; }
            };
            template<class T, class C> void _viz_enc(const std::stack<T, C>& v, _VizCtx& c, int d, std::string& o) {
              _viz_enc(_VizStackHack<T, C>::get(v), c, d, o);
            }
            template<class T, class C> struct _VizQueueHack : std::queue<T, C> {
              static const C& get(const std::queue<T, C>& s) { return s.*&_VizQueueHack::c; }
            };
            template<class T, class C> void _viz_enc(const std::queue<T, C>& v, _VizCtx& c, int d, std::string& o) {
              _viz_enc(_VizQueueHack<T, C>::get(v), c, d, o);
            }

            // generic pointer (no generated serializer): opaque address or null
            template<class T>
            typename std::enable_if<std::is_pointer<T>::value &&
                !std::is_same<T, char*>::value && !std::is_same<T, const char*>::value>::type
            _viz_enc(const T& p, _VizCtx&, int, std::string& o) {
              if (!p) { o += "null"; return; }
              o += "\\"(pointer)\\"";
            }

            // catch-all: never break compilation
            template<class T>
            typename std::enable_if<!_viz_known<T>::value>::type
            _viz_enc(const T&, _VizCtx&, int, std::string& o) { o += "\\"(object)\\""; }

            template<class T> void _viz_field(std::string& e, bool& first, const char* n, const T& v, _VizCtx& c, int d) {
              if (!first) e += ',';
              first = false;
              e += '"'; e += n; e += "\\":";
              _viz_enc(v, c, d + 1, e);
            }

            inline void _viz_cap(std::string&, bool&, _VizCtx&) {}
            template<class T, class... R>
            void _viz_cap(std::string& l, bool& first, _VizCtx& c, const char* n, const T& v, R&&... rest) {
              if (!first) l += ',';
              first = false;
              l += '"'; l += n; l += "\\":";
              _viz_enc(v, c, 0, l);
              _viz_cap(l, first, c, rest...);
            }

            static void _viz_flush() {
              static bool flushed = false;
              if (flushed) return;
              flushed = true;
              fputs("\\n__FRAMES__[", stderr);
              for (size_t i = 0; i < _viz_frames.size(); i++) {
                if (i) fputc(',', stderr);
                fputs(_viz_frames[i].c_str(), stderr);
              }
              fputs("]__END__\\n", stderr);
              fflush(stderr);
            }

            template<class... A> void _viz_snap(int line, A&&... args) {
              if (_viz_done) return;
              if (_viz_frames.size() >= (size_t)__MAX_FRAMES__) {
                _viz_done = true;
                _viz_frames.push_back("{\\"step\\":" + std::to_string(++_viz_stepn) + ",\\"truncated\\":true}");
                return;
              }
              if (_viz_stack.empty()) { _VizSF f; f.fn = "main"; f.line = line; _viz_stack.push_back(f); }
              _VizCtx c;
              std::string locals;
              bool first = true;
              _viz_cap(locals, first, c, std::forward<A>(args)...);
              _VizSF& top = _viz_stack.back();
              top.line = line; top.locals = locals; top.heapFrag = c.heap;
              std::string stk, heap;
              for (size_t i = 0; i < _viz_stack.size(); i++) {
                const _VizSF& f = _viz_stack[i];
                if (!stk.empty()) stk += ',';
                stk += "{\\"function\\":\\""; stk += _viz_esc(f.fn ? f.fn : "?");
                stk += "\\",\\"line\\":"; stk += std::to_string(f.line ? f.line : line);
                stk += ",\\"locals\\":{"; stk += f.locals; stk += "}}";
                if (!f.heapFrag.empty()) {
                  if (!heap.empty()) heap += ',';
                  heap += f.heapFrag;
                }
              }
              std::string frame = "{\\"step\\":" + std::to_string(++_viz_stepn)
                + ",\\"line\\":" + std::to_string(line)
                + ",\\"event\\":\\"line\\",\\"out_len\\":" + std::to_string(_viz_buf.n)
                + ",\\"stack\\":[" + stk + "],\\"heap\\":{" + heap + "}}";
              _viz_frames.push_back(frame);
            }

            struct _VizGuard {
              _VizGuard(const char* fn) { _VizSF f; f.fn = fn; f.line = 0; _viz_stack.push_back(f); }
              ~_VizGuard() { if (!_viz_stack.empty()) _viz_stack.pop_back(); }
            };

            struct _VizInit {
              _VizInit() {
                _viz_buf.real = std::cout.rdbuf();
                std::cout.rdbuf(&_viz_buf);
                std::atexit(_viz_flush);
                std::set_terminate([]() { _viz_flush(); std::abort(); });
              }
              ~_VizInit() { if (_viz_buf.real) std::cout.rdbuf(_viz_buf.real); }
            };
            static _VizInit _viz_init_;
            """;
}
