package com.oj.TDTUOJ.visualizer.service.tracer;

import com.github.javaparser.JavaParser;
import com.github.javaparser.ParserConfiguration;
import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.NodeList;
import com.github.javaparser.ast.body.*;
import com.github.javaparser.ast.expr.VariableDeclarationExpr;
import com.github.javaparser.ast.stmt.*;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

/**
 * Java tracer (Judge0 id 62).
 *
 * <p>JavaParser builds a real AST (replacing the old regex instrumentor and
 * {@code BraceNormalizer}); after every statement we insert
 * {@code __Viz.snap(line, names, values)} with the locals actually in scope at
 * that point, and wrap method bodies in enter/try-finally-exit for call-stack
 * tracking. Line numbers baked into snap calls come from the ORIGINAL parse
 * positions, so re-printing the AST doesn't break code↔frame mapping.
 *
 * <p>Reachability care: Java rejects unreachable code at compile time, so no
 * snap is inserted after return/break/continue/throw, nor after constructs
 * whose every branch provably exits (conservative check in {@link #exits}).
 *
 * <p>The appended {@code __Viz} class serializes values generically at runtime
 * via reflection (arrays of any depth, Collections, Maps, user classes — even
 * private fields), with identity-stable heap ids and cycle protection. The
 * instrumentor needs variable NAMES only; it never needs to understand types.
 */
public final class JavaTracer implements Tracer {

    /**
     * Parse the source to an AST, insert snaps + method-body guards, then append the
     * {@code __Viz} runtime class. Snap line numbers are captured from original parse
     * positions before re-printing, so the trace still maps to the user's line numbers.
     */
    @Override
    public String instrument(String source) {
        CompilationUnit cu;
        try {
            ParserConfiguration cfg = new ParserConfiguration()
                    .setLanguageLevel(ParserConfiguration.LanguageLevel.JAVA_17);
            var result = new JavaParser(cfg).parse(source);
            if (!result.isSuccessful() || result.getResult().isEmpty()) {
                throw new TracerException("Java parse error: " + result.getProblems().stream()
                        .findFirst().map(Object::toString).orElse("invalid source"));
            }
            cu = result.getResult().get();
        } catch (TracerException e) {
            throw e;
        } catch (Exception e) {
            throw new TracerException("Java parse error: " + e.getMessage(), e);
        }

        cu.findAll(MethodDeclaration.class).forEach(m ->
                m.getBody().ifPresent(body -> instrumentCallable(body, m.getNameAsString(), paramNames(m.getParameters()))));
        cu.findAll(ConstructorDeclaration.class).forEach(c ->
                instrumentCallable(c.getBody(), c.getNameAsString(), paramNames(c.getParameters())));

        return cu.toString() + "\n" + PREAMBLE.replace("__MAX_FRAMES__", String.valueOf(MAX_FRAMES));
    }

    private static List<String> paramNames(NodeList<Parameter> params) {
        List<String> out = new ArrayList<>();
        params.forEach(p -> out.add(p.getNameAsString()));
        return out;
    }

    /** Wrap a method/constructor body in enter/try-finally-exit, then instrument it. */
    private void instrumentCallable(BlockStmt body, String name, List<String> params) {
        LinkedHashSet<String> scope = new LinkedHashSet<>(params);
        instrumentBlock(body, scope, name);

        NodeList<Statement> original = new NodeList<>(body.getStatements());
        body.getStatements().clear();

        // explicit this()/super() must stay first in constructors
        int keep = 0;
        if (!original.isEmpty() && original.get(0) instanceof ExplicitConstructorInvocationStmt) {
            body.addStatement(original.get(0));
            keep = 1;
        }
        body.addStatement(StaticJavaParser.parseStatement("__Viz.enter(\"" + name + "\");"));
        BlockStmt tryBlock = new BlockStmt();
        for (int i = keep; i < original.size(); i++) tryBlock.addStatement(original.get(i));
        BlockStmt finallyBlock = new BlockStmt();
        finallyBlock.addStatement(StaticJavaParser.parseStatement("__Viz.exit();"));
        body.addStatement(new TryStmt(tryBlock, new NodeList<>(), finallyBlock));
    }

    /**
     * Insert snaps after each statement of `block`, recursing into nested
     * control flow. `scope` carries names visible on entry; declarations made
     * inside extend it for subsequent statements (and are dropped on exit).
     */
    private void instrumentBlock(BlockStmt block, LinkedHashSet<String> scope, String fn) {
        LinkedHashSet<String> local = new LinkedHashSet<>(scope);
        List<Statement> stmts = new ArrayList<>(block.getStatements());
        int index = 0; // index in the live (mutating) statement list
        for (Statement stmt : stmts) {
            instrumentNested(stmt, local, fn);

            // declarations become visible AFTER their own statement
            if (stmt instanceof ExpressionStmt es && es.getExpression() instanceof VariableDeclarationExpr vd) {
                vd.getVariables().forEach(v -> local.add(v.getNameAsString()));
            }

            if (insertAfter(stmt) && !local.isEmpty()) {
                int line = stmt.getBegin().map(p -> p.line).orElse(0);
                block.addStatement(index + 1, snapStmt(line, local));
                index++; // skip over the snap we just added
            }
            index++;
        }
    }

    /** Recurse into the bodies of control-flow statements, block-ifying single-statement bodies. */
    private void instrumentNested(Statement stmt, LinkedHashSet<String> scope, String fn) {
        if (stmt instanceof ForStmt f) {
            LinkedHashSet<String> inner = new LinkedHashSet<>(scope);
            f.getInitialization().forEach(init -> {
                if (init instanceof VariableDeclarationExpr vd) {
                    vd.getVariables().forEach(v -> inner.add(v.getNameAsString()));
                }
            });
            instrumentBlock(blockify(f.getBody(), f::setBody), inner, fn);
        } else if (stmt instanceof ForEachStmt f) {
            LinkedHashSet<String> inner = new LinkedHashSet<>(scope);
            f.getVariable().getVariables().forEach(v -> inner.add(v.getNameAsString()));
            instrumentBlock(blockify(f.getBody(), f::setBody), inner, fn);
        } else if (stmt instanceof WhileStmt w) {
            instrumentBlock(blockify(w.getBody(), w::setBody), scope, fn);
        } else if (stmt instanceof DoStmt d) {
            instrumentBlock(blockify(d.getBody(), d::setBody), scope, fn);
        } else if (stmt instanceof IfStmt i) {
            instrumentBlock(blockify(i.getThenStmt(), i::setThenStmt), scope, fn);
            i.getElseStmt().ifPresent(els -> {
                if (els instanceof IfStmt) instrumentNested(els, scope, fn); // else-if chain
                else instrumentBlock(blockify(els, i::setElseStmt), scope, fn);
            });
        } else if (stmt instanceof TryStmt t) {
            instrumentBlock(t.getTryBlock(), scope, fn);
            t.getCatchClauses().forEach(cc -> {
                LinkedHashSet<String> inner = new LinkedHashSet<>(scope);
                inner.add(cc.getParameter().getNameAsString());
                instrumentBlock(cc.getBody(), inner, fn);
            });
            t.getFinallyBlock().ifPresent(fb -> instrumentBlock(fb, scope, fn));
        } else if (stmt instanceof SwitchStmt s) {
            s.getEntries().forEach(entry -> {
                // statements inside case labels — no snaps (fall-through reachability is tricky),
                // but recurse so nested loops/ifs still get instrumented
                entry.getStatements().forEach(st -> instrumentNested(st, scope, fn));
            });
        } else if (stmt instanceof BlockStmt b) {
            instrumentBlock(b, scope, fn);
        } else if (stmt instanceof LabeledStmt l) {
            instrumentNested(l.getStatement(), scope, fn);
        }
    }

    private interface BodySetter { void set(Statement s); }

    private BlockStmt blockify(Statement body, BodySetter setter) {
        if (body instanceof BlockStmt b) return b;
        BlockStmt block = new BlockStmt();
        block.addStatement(body.clone());
        setter.set(block);
        return block;
    }

    /** No snap after statements that end or may end control flow (unreachable-code errors). */
    private boolean insertAfter(Statement stmt) {
        if (stmt instanceof ReturnStmt || stmt instanceof ThrowStmt
                || stmt instanceof BreakStmt || stmt instanceof ContinueStmt) return false;
        if (stmt instanceof BlockStmt || stmt instanceof LocalClassDeclarationStmt
                || stmt instanceof ExplicitConstructorInvocationStmt) return false;
        if (exits(stmt)) return false;
        return true;
    }

    /** Conservative: does this statement provably exit on every path? */
    private boolean exits(Statement stmt) {
        if (stmt instanceof ReturnStmt || stmt instanceof ThrowStmt
                || stmt instanceof BreakStmt || stmt instanceof ContinueStmt) return true;
        if (stmt instanceof BlockStmt b) {
            NodeList<Statement> ss = b.getStatements();
            return !ss.isEmpty() && exits(ss.get(ss.size() - 1));
        }
        if (stmt instanceof IfStmt i) {
            return i.getElseStmt().isPresent()
                    && exits(i.getThenStmt())
                    && exits(i.getElseStmt().get());
        }
        if (stmt instanceof WhileStmt w) {
            // while(true) without break in body is an exit point for what follows
            return w.getCondition().isBooleanLiteralExpr()
                    && w.getCondition().asBooleanLiteralExpr().getValue()
                    && w.getBody().findFirst(BreakStmt.class).isEmpty();
        }
        return false;
    }

    private Statement snapStmt(int line, LinkedHashSet<String> names) {
        StringBuilder ns = new StringBuilder();
        StringBuilder vs = new StringBuilder();
        for (String n : names) {
            if (ns.length() > 0) { ns.append(','); vs.append(','); }
            ns.append('"').append(n).append('"');
            vs.append(n);
        }
        return StaticJavaParser.parseStatement(
                "__Viz.snap(" + line + ", new String[]{" + ns + "}, new Object[]{" + vs + "});");
    }

    // ── Runtime preamble (appended as a package-private top-level class) ─────
    // NOTE: this is a Java text block whose contents ARE Java source. Backslashes are
    // doubled because they must survive twice: once as this text-block literal, and again
    // as string literals inside the emitted __Viz code — e.g. "{\\"step\\":" here becomes
    // the source {"step": in __Viz's own StringBuilder output. Do not "simplify" them.
    private static final String PREAMBLE = """
            class __Viz {
                private static final int MAXF = __MAX_FRAMES__, MAXH = 200, MAXE = 1000, MAXS = 256, MAXD = 8, MAXFLD = 64;
                private static final java.util.List<String> frames = new java.util.ArrayList<>();
                private static final java.util.IdentityHashMap<Object, Integer> ids = new java.util.IdentityHashMap<>();
                private static int nextId = 1;
                private static int step = 0;
                private static long outLen = 0;
                private static boolean done = false;

                static final class Fr {
                    final String fn; String[] names = new String[0]; Object[] vals = new Object[0]; int line;
                    Fr(String fn) { this.fn = fn; }
                }
                private static final java.util.ArrayDeque<Fr> stack = new java.util.ArrayDeque<>();

                static {
                    final java.io.PrintStream real = System.out;
                    System.setOut(new java.io.PrintStream(new java.io.OutputStream() {
                        public void write(int b) { outLen++; real.write(b); }
                        public void write(byte[] b, int off, int len) { outLen += len; real.write(b, off, len); }
                        public void flush() { real.flush(); }
                    }, true));
                    Runtime.getRuntime().addShutdownHook(new Thread(__Viz::flush));
                }

                static void enter(String fn) { stack.addLast(new Fr(fn)); }
                static void exit() { if (!stack.isEmpty()) stack.removeLast(); }

                static void snap(int line, String[] names, Object[] vals) {
                    if (done) return;
                    if (frames.size() >= MAXF) {
                        done = true;
                        frames.add("{\\"step\\":" + (++step) + ",\\"truncated\\":true}");
                        return;
                    }
                    Fr top = stack.peekLast();
                    if (top == null) { top = new Fr("main"); stack.addLast(top); }
                    top.names = names; top.vals = vals; top.line = line;

                    StringBuilder heap = new StringBuilder();
                    java.util.Set<Integer> seen = new java.util.HashSet<>();
                    int[] heapCount = {0};
                    StringBuilder stk = new StringBuilder();
                    for (Fr f : stack) {
                        if (stk.length() > 0) stk.append(',');
                        stk.append("{\\"function\\":\\"").append(esc(f.fn))
                           .append("\\",\\"line\\":").append(f.line == 0 ? line : f.line)
                           .append(",\\"locals\\":{");
                        for (int i = 0; i < f.names.length; i++) {
                            if (i > 0) stk.append(',');
                            stk.append('"').append(esc(f.names[i])).append("\\":");
                            enc(f.vals[i], heap, seen, heapCount, 0, stk);
                        }
                        stk.append("}}");
                    }
                    StringBuilder frame = new StringBuilder();
                    frame.append("{\\"step\\":").append(++step)
                         .append(",\\"line\\":").append(line)
                         .append(",\\"event\\":\\"line\\"")
                         .append(",\\"out_len\\":").append(outLen)
                         .append(",\\"stack\\":[").append(stk).append(']')
                         .append(",\\"heap\\":{").append(heap).append("}}");
                    frames.add(frame.toString());
                }

                private static int oid(Object o) {
                    Integer v = ids.get(o);
                    if (v == null) { v = nextId++; ids.put(o, v); }
                    return v;
                }

                /** Appends the encoded value to `out`; compound values also append a heap entry. */
                private static void enc(Object v, StringBuilder heap, java.util.Set<Integer> seen,
                                        int[] heapCount, int depth, StringBuilder out) {
                    if (v == null) { out.append("null"); return; }
                    if (v instanceof Boolean || v instanceof Integer || v instanceof Long
                            || v instanceof Short || v instanceof Byte) { out.append(v); return; }
                    if (v instanceof Double || v instanceof Float) {
                        double d = ((Number) v).doubleValue();
                        if (Double.isNaN(d) || Double.isInfinite(d)) out.append('"').append(d).append('"');
                        else out.append(v);
                        return;
                    }
                    if (v instanceof Character) { out.append('"').append(esc(String.valueOf(v))).append('"'); return; }
                    if (v instanceof String) {
                        String s = (String) v;
                        out.append('"').append(esc(s.length() > MAXS ? s.substring(0, MAXS) + "..." : s)).append('"');
                        return;
                    }
                    if (v instanceof Enum) { out.append('"').append(esc(((Enum<?>) v).name())).append('"'); return; }

                    int id = oid(v);
                    out.append("\\"@").append(id).append('"');
                    if (!seen.add(id)) return;
                    if (heapCount[0] >= MAXH || depth >= MAXD) {
                        heapEntry(heap, heapCount, id, "{\\"type\\":\\"opaque\\",\\"repr\\":\\"(deep)\\",\\"truncated\\":true}");
                        return;
                    }
                    StringBuilder e = new StringBuilder();
                    if (v.getClass().isArray()) {
                        int n = java.lang.reflect.Array.getLength(v);
                        e.append("{\\"type\\":\\"list\\",\\"values\\":[");
                        for (int i = 0; i < n && i < MAXE; i++) {
                            if (i > 0) e.append(',');
                            enc(java.lang.reflect.Array.get(v, i), heap, seen, heapCount, depth + 1, e);
                        }
                        e.append(']');
                        if (n > MAXE) e.append(",\\"truncated\\":true");
                        e.append('}');
                    } else if (v instanceof java.util.Map) {
                        java.util.Map<?, ?> m = (java.util.Map<?, ?>) v;
                        e.append("{\\"type\\":\\"dict\\",\\"entries\\":[");
                        int i = 0;
                        for (java.util.Map.Entry<?, ?> en : m.entrySet()) {
                            if (i >= MAXE) break;
                            if (i++ > 0) e.append(',');
                            e.append('[');
                            enc(en.getKey(), heap, seen, heapCount, depth + 1, e);
                            e.append(',');
                            enc(en.getValue(), heap, seen, heapCount, depth + 1, e);
                            e.append(']');
                        }
                        e.append(']');
                        if (m.size() > MAXE) e.append(",\\"truncated\\":true");
                        e.append('}');
                    } else if (v instanceof java.util.Collection) {
                        java.util.Collection<?> c = (java.util.Collection<?>) v;
                        e.append("{\\"type\\":\\"").append(v instanceof java.util.Set ? "set" : "list").append("\\",\\"values\\":[");
                        int i = 0;
                        for (Object x : c) {
                            if (i >= MAXE) break;
                            if (i++ > 0) e.append(',');
                            enc(x, heap, seen, heapCount, depth + 1, e);
                        }
                        e.append(']');
                        if (c.size() > MAXE) e.append(",\\"truncated\\":true");
                        e.append('}');
                    } else {
                        e.append("{\\"type\\":\\"object\\",\\"class\\":\\"").append(esc(v.getClass().getSimpleName()))
                         .append("\\",\\"fields\\":{");
                        int cnt = 0;
                        for (Class<?> k = v.getClass(); k != null && k != Object.class; k = k.getSuperclass()) {
                            for (java.lang.reflect.Field fl : k.getDeclaredFields()) {
                                if (cnt >= MAXFLD) break;
                                int mod = fl.getModifiers();
                                if (java.lang.reflect.Modifier.isStatic(mod) || fl.isSynthetic()
                                        || fl.getName().indexOf('$') >= 0) continue;
                                Object fv;
                                try { fl.setAccessible(true); fv = fl.get(v); }
                                catch (Throwable t) { continue; }
                                if (cnt++ > 0) e.append(',');
                                e.append('"').append(esc(fl.getName())).append("\\":");
                                enc(fv, heap, seen, heapCount, depth + 1, e);
                            }
                        }
                        e.append("}}");
                    }
                    heapEntry(heap, heapCount, id, e.toString());
                }

                private static void heapEntry(StringBuilder heap, int[] heapCount, int id, String json) {
                    if (heap.length() > 0) heap.append(',');
                    heap.append('"').append(id).append("\\":").append(json);
                    heapCount[0]++;
                }

                private static String esc(String s) {
                    StringBuilder b = new StringBuilder();
                    for (int i = 0; i < s.length(); i++) {
                        char c = s.charAt(i);
                        if (c == '"') b.append("\\\\\\"");
                        else if (c == '\\\\') b.append("\\\\\\\\");
                        else if (c == '\\n') b.append("\\\\n");
                        else if (c == '\\r') b.append("\\\\r");
                        else if (c == '\\t') b.append("\\\\t");
                        else if (c < 0x20) b.append(String.format("\\\\u%04x", (int) c));
                        else b.append(c);
                    }
                    return b.toString();
                }

                static void flush() {
                    done = true;
                    StringBuilder sb = new StringBuilder("\\n__FRAMES__[");
                    for (int i = 0; i < frames.size(); i++) {
                        if (i > 0) sb.append(',');
                        sb.append(frames.get(i));
                    }
                    sb.append("]__END__\\n");
                    System.err.print(sb);
                    System.err.flush();
                }
            }
            """;
}
