package com.oj.TDTUOJ.visualizer;

import com.oj.TDTUOJ.visualizer.service.tracer.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Instrumentation-level tests: every tracer must accept its §11 fixture and
 * produce output that (a) contains the runtime preamble, (b) contains snap
 * calls, (c) keeps the user code. Runtime golden-frame verification needs the
 * actual language toolchains and lives in tools/viz-test (manual, pre-defense
 * checklist) — see VISUALIZER-REFACTOR-PLAN.md §9.
 */
class TracerInstrumentationTest {

    private String fixture(String path) throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/visualizer/fixtures/" + path)) {
            assertNotNull(in, "missing fixture " + path);
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @Test
    @DisplayName("Python: settrace preamble wraps base64-embedded source")
    void python() throws Exception {
        String out = new PythonTracer().instrument(fixture("python/full_demo.py"));
        assertTrue(out.contains("sys.settrace(_viz_tracer)"));
        assertTrue(out.contains("__FRAMES__"));
        assertTrue(out.contains("base64.b64decode"));
        // user code must NOT appear verbatim — embedded as base64
        assertFalse(out.contains("def insert(root, val):"));
    }

    @Test
    @DisplayName("JavaScript: acorn-driven snaps + enter/exit wraps, classes parse")
    void javascript() throws Exception {
        String out = new JsTracer().instrument(fixture("javascript/full_demo.js"));
        assertTrue(out.contains("__viz.snap("));
        assertTrue(out.contains("__viz.enter(\"insert\")"));
        assertTrue(out.contains("class Node"));        // user code preserved
        assertTrue(out.contains("process.stderr.write"));
    }

    @Test
    @DisplayName("JavaScript: parse error surfaces as TracerException")
    void javascriptParseError() {
        assertThrows(TracerException.class, () -> new JsTracer().instrument("function {{{"));
    }

    @Test
    @DisplayName("Java: JavaParser snaps, try/finally exit, reflection preamble")
    void java() throws Exception {
        String out = new JavaTracer().instrument(fixture("java/full_demo.java"));
        assertTrue(out.contains("__Viz.snap("));
        assertTrue(out.contains("__Viz.enter(\"insert\")"));
        assertTrue(out.contains("__Viz.exit()"));
        assertTrue(out.contains("class __Viz"));
        // no snap directly after a return (unreachable-code compile error)
        assertFalse(out.matches("(?s).*return [^;]*;\\s*__Viz\\.snap.*"));
    }

    @Test
    @DisplayName("Java: parse error surfaces as TracerException")
    void javaParseError() {
        assertThrows(TracerException.class, () -> new JavaTracer().instrument("class X { void f( {"));
    }

    @Test
    @DisplayName("C#: snaps + Enter/finally-Exit + reflection preamble")
    void csharp() throws Exception {
        String out = new CSharpTracer().instrument(fixture("csharp/full_demo.cs"));
        assertTrue(out.contains("__Viz.Snap("));
        assertTrue(out.contains("__Viz.Enter(\"Insert\")"));
        assertTrue(out.contains("finally { __Viz.Exit(); }"));
        assertTrue(out.contains("static class __Viz"));
        // var-declared locals are captured
        assertTrue(out.contains("\"stack\""));
        assertTrue(out.contains("\"freq\""));
    }

    @Test
    @DisplayName("C++: template serializers + RAII guard + generated Node serializer")
    void cpp() throws Exception {
        String out = new CppTracer().instrument(fixture("cpp/full_demo.cpp"));
        assertTrue(out.contains("_viz_snap("));
        assertTrue(out.contains("_VizGuard _viz_g_(\"insertNode\")"));
        assertTrue(out.contains("#line 1 \"user.cpp\""));
        // struct codegen chases left/right pointers
        assertTrue(out.contains("_viz_enc(const Node& v"));
        assertTrue(out.contains("_viz_field(e, first, \"left\""));
        assertTrue(out.contains("_viz_field(e, first, \"right\""));
    }

    @Test
    @DisplayName("C: typed captures + cleanup-attribute guard + generated struct serializer")
    void c() throws Exception {
        String out = new CTracer().instrument(fixture("c/full_demo.c"));
        assertTrue(out.contains("_viz_begin("));
        assertTrue(out.contains("__attribute__((cleanup(_viz_pop)))"));
        assertTrue(out.contains("_viz_enc_Node"));
        // 2D adjacency matrix captured with sizeof-derived dimensions
        assertTrue(out.contains("_viz_cap_arr2_i(\"g\""));
        // struct pointer param captured inside insertNode
        assertTrue(out.contains("_viz_obj_Node(\"root\""));
    }

    @Test
    @DisplayName("C++: Allman-style functions ('{' on next line) get guard + body snaps")
    void cppAllman() {
        String src = """
                int add(int a, int b)
                {
                    int s = a + b;
                    return s;
                }
                int main()
                {
                    int x = add(2, 3);
                    return 0;
                }
                """;
        String out = new CppTracer().instrument(src);
        assertTrue(out.contains("_VizGuard _viz_g_(\"add\")"), "Allman fn 'add' must be guarded");
        assertTrue(out.contains("_VizGuard _viz_g_(\"main\")"), "Allman fn 'main' must be guarded");
        assertTrue(out.contains("_viz_snap("), "body statements must be snapped");
        // guard is inserted INSIDE the body — right after the opening '{'
        assertTrue(out.matches("(?s).*\\{\\s*_VizGuard _viz_g_\\(\"add\"\\);.*"));
    }

    @Test
    @DisplayName("C: Allman-style functions ('{' on next line) get cleanup guard + snaps")
    void cAllman() {
        String src = """
                int add(int a, int b)
                {
                    int s = a + b;
                    return s;
                }
                int main(void)
                {
                    int x = add(2, 3);
                    return 0;
                }
                """;
        String out = new CTracer().instrument(src);
        assertTrue(out.contains("_viz_push(\"add\")"), "Allman fn 'add' must be guarded");
        assertTrue(out.contains("_viz_push(\"main\")"), "Allman fn 'main' must be guarded");
        assertTrue(out.contains("_viz_begin("), "body statements must be snapped");
    }

    // ── BraceSynthesizer: braceless control bodies ──────────────────────────

    private static int count(String s, char c) {
        int n = 0;
        for (int i = 0; i < s.length(); i++) if (s.charAt(i) == c) n++;
        return n;
    }

    private static String joinLines(BraceSynthesizer.Result r) {
        return String.join("\n", r.lines());
    }

    @Test
    @DisplayName("BraceSynth: braceless for/while bodies get a block, balance preserved")
    void braceSynthLoops() {
        String src = "for (int i = 0; i < n; i++)\n    s += a[i];\n";
        BraceSynthesizer.Result r = BraceSynthesizer.normalize(src);
        String out = joinLines(r);
        assertTrue(out.contains("for (int i = 0; i < n; i++){"), "header gains an opening brace:\n" + out);
        // body sits on its own line ending in ';' (so the line scanner will snap it)
        assertTrue(out.matches("(?s).*\\{\\s*s \\+= a\\[i\\];\\s*\\}.*"), out);
        assertEquals(count(src, '{') + 1, count(out, '{'));
        assertEquals(count(out, '{'), count(out, '}'));
        // every output line maps to a real original line
        assertEquals(r.lines().length, r.origLine().length);
    }

    @Test
    @DisplayName("BraceSynth: braceless if/else — both branches wrapped, else binding kept")
    void braceSynthIfElse() {
        String src = "if (x > 0)\n    pos++;\nelse\n    neg++;\n";
        String out = joinLines(BraceSynthesizer.normalize(src));
        assertTrue(out.matches("(?s).*if \\(x > 0\\)\\{\\s*pos\\+\\+;\\s*\\}.*"), out);
        assertTrue(out.matches("(?s).*else\\{\\s*neg\\+\\+;\\s*\\}.*"), out);
        assertEquals(count(out, '{'), count(out, '}'));
    }

    @Test
    @DisplayName("BraceSynth: nested dangling-else binds to inner if (no semantic shift)")
    void braceSynthDanglingElse() {
        String src = "if (a)\n  if (b)\n    x;\n  else\n    y;\n";
        String out = joinLines(BraceSynthesizer.normalize(src));
        // outer 'if (a)' wraps the WHOLE inner if/else; the else stays inside that block
        assertTrue(out.matches("(?s).*if \\(a\\)\\{.*if \\(b\\)\\{.*x;.*\\}.*else\\{.*y;.*\\}.*\\}.*"), out);
        assertEquals(count(out, '{'), count(out, '}'));
    }

    @Test
    @DisplayName("BraceSynth: do/while body wrapped, while-tail untouched")
    void braceSynthDoWhile() {
        String src = "do\n    k++;\nwhile (k < n);\n";
        String out = joinLines(BraceSynthesizer.normalize(src));
        assertTrue(out.matches("(?s).*do\\{\\s*k\\+\\+;\\s*\\}\\s*while \\(k < n\\);.*"), out);
        assertEquals(count(out, '{'), count(out, '}'));
    }

    @Test
    @DisplayName("BraceSynth: already-braced source is returned byte-identical (zero risk)")
    void braceSynthIdentity() {
        String src = "for (int i = 0; i < n; i++) {\n    s += a[i];\n}\n";
        BraceSynthesizer.Result r = BraceSynthesizer.normalize(src);
        assertArrayEquals(src.split("\n", -1), r.lines());
        for (int i = 0; i < r.origLine().length; i++) assertEquals(i + 1, r.origLine()[i]);
    }

    @Test
    @DisplayName("BraceSynth: keyword inside a string/comment is not mistaken for control")
    void braceSynthMaskedKeywords() {
        String src = "printf(\"for while if\");\nchar c = ';';\n// for (;;) x;\n";
        BraceSynthesizer.Result r = BraceSynthesizer.normalize(src);
        // nothing to wrap → identity
        assertArrayEquals(src.split("\n", -1), r.lines());
    }

    @Test
    @DisplayName("C++: braceless inner loop body becomes a per-iteration snap site")
    void cppBracelessSnap() {
        String src = """
                int main() {
                    int s = 0;
                    for (int i = 0; i < 5; i++)
                        for (int j = 0; j < 5; j++)
                            s += i * j;
                    return s;
                }
                """;
        String out = new CppTracer().instrument(src);
        // the innermost body 's += i * j;' must now be snapped (inside synthesized braces)
        assertTrue(out.matches("(?s).*s \\+= i \\* j; _viz_snap\\(.*"), "braceless body must be snapped");
    }

    @Test
    @DisplayName("C: braceless if-branch is snapped (was invisible before the else guard)")
    void cBracelessIfSnap() {
        String src = """
                int main() {
                    int n = 5, evens = 0, odds = 0;
                    if (n % 2 == 0)
                        evens++;
                    else
                        odds++;
                    return 0;
                }
                """;
        String out = new CTracer().instrument(src);
        assertTrue(out.contains("evens++; { _viz_begin("), "then-branch must snap despite following else:\n" + out);
        assertTrue(out.contains("odds++; { _viz_begin("), "else-branch must snap:\n" + out);
    }

    @Test
    @DisplayName("C#: braceless if/else branches are both snapped")
    void csharpBracelessSnap() {
        String src = """
                class Program {
                    static void Main() {
                        int n = 5, evens = 0, odds = 0;
                        if (n % 2 == 0)
                            evens++;
                        else
                            odds++;
                    }
                }
                """;
        String out = new CSharpTracer().instrument(src);
        assertTrue(out.contains("evens++; __Viz.Snap("), "then-branch must snap despite following else:\n" + out);
        assertTrue(out.contains("odds++; __Viz.Snap("), "else-branch must snap:\n" + out);
    }

    @Test
    @DisplayName("C: void-returning functions are detected and traced")
    void cVoidFunction() {
        String src = """
                #include <stdio.h>
                void greet(int x) {
                    int y = x + 1;
                    printf("y=%d\\n", y);
                }
                int main() {
                    greet(5);
                    return 0;
                }
                """;
        String out = new CTracer().instrument(src);
        assertTrue(out.contains("_viz_push(\"greet\")"), "void fn 'greet' must be guarded:\n" + out);
        assertTrue(out.contains("int y = x + 1; { _viz_begin("), "void fn body must snap");
    }

    @Test
    @DisplayName("C++: assigned multi-line lambda body is not snapped (no uncaptured-var compile break)")
    void cppLambdaBodyNotSnapped() {
        String src = """
                int main() {
                    int total = 100;
                    auto sq = [](int x) {
                        int r = x * x;
                        return r;
                    };
                    int a = sq(3);
                    return a + total;
                }
                """;
        String out = new CppTracer().instrument(src);
        // the lambda body local 'r' must NOT be snapped — that snap would reference uncaptured 'total'
        assertFalse(out.matches("(?s).*int r = x \\* x; _viz_snap.*"), "lambda body must not be snapped:\n" + out);
        // code outside the lambda still traces
        assertTrue(out.matches("(?s).*int a = sq\\(3\\); _viz_snap.*"), "post-lambda statement must snap");
    }

    @Test
    @DisplayName("C / C++: multi-line function signatures are detected")
    void multiLineSignature() {
        String src = """
                int add(int a,
                        int b) {
                    int s = a + b;
                    return s;
                }
                int main() {
                    return add(2, 3);
                }
                """;
        assertTrue(new CTracer().instrument(src).contains("_viz_push(\"add\")"), "C: multi-line sig 'add'");
        assertTrue(new CppTracer().instrument(src).contains("_VizGuard _viz_g_(\"add\")"), "C++: multi-line sig 'add'");
    }

    @Test
    @DisplayName("C#: multi-line method signature detected + lambda body not snapped")
    void csharpMultiLineAndLambda() {
        String src = """
                using System;
                class Program {
                    static int Add(int a,
                                   int b) {
                        int s = a + b;
                        return s;
                    }
                    static void Main() {
                        Func<int,int> sq = x => {
                            int r = x * x;
                            return r;
                        };
                        Console.WriteLine(Add(2, 3) + sq(3));
                    }
                }
                """;
        String out = new CSharpTracer().instrument(src);
        assertTrue(out.contains("__Viz.Enter(\"Add\")"), "multi-line method 'Add' must be entered:\n" + out);
        assertFalse(out.matches("(?s).*int r = x \\* x; __Viz.Snap.*"), "lambda body must not be snapped (CS0165)");
    }

    @Test
    @DisplayName("All tracers reject nothing structurally — markers consistent")
    void markers() {
        assertEquals("__FRAMES__", Tracer.FRAMES_BEGIN);
        assertEquals("__END__", Tracer.FRAMES_END);
        assertEquals(5000, Tracer.MAX_FRAMES);
    }
}
