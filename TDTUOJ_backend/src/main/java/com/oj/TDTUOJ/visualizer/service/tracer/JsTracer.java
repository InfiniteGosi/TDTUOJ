package com.oj.TDTUOJ.visualizer.service.tracer;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Script;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * JavaScript tracer (Node 12 runtime, Judge0 id 63).
 *
 * <p>Rhino's own parser stops at ES5.1+, so parsing is delegated to
 * <b>acorn</b> (ES2020-capable, ships as a single ES5-compatible file)
 * executed <i>inside</i> Rhino on the backend — the sandbox never sees any
 * of this. The instrumentation driver ({@code visualizer/js-instrument.js})
 * inserts {@code __viz.snap(line, {vars})} after every block-level statement
 * (TDZ-safe: a variable is captured only where its declaration precedes and
 * scopes over the insertion point) and wraps function bodies in
 * enter/try-finally-exit for call-stack tracking.
 *
 * <p>Serialization happens at runtime in the Node preamble and is fully
 * generic: WeakMap identity ids, arrays/Map/Set/class instances, cycle-safe,
 * uniform frame schema on stderr.
 */
public final class JsTracer implements Tracer {

    private static final Object LOCK = new Object();
    private static volatile Script acornScript;
    private static volatile Script driverScript;

    @Override
    public String instrument(String source) {
        try {
            ensureCompiled();
        } catch (Exception e) {
            throw new TracerException("JS instrumentation engine unavailable: " + e.getMessage(), e);
        }

        Context cx = Context.enter();
        try {
            cx.setLanguageVersion(Context.VERSION_ES6);
            cx.setOptimizationLevel(-1); // interpret — avoids 64K classfile limits on big sources
            Scriptable scope = cx.initStandardObjects();
            cx.evaluateString(scope, "var module={exports:{}};var exports=module.exports;", "shim", 1, null);
            acornScript.exec(cx, scope);
            cx.evaluateString(scope, "var acorn=module.exports;", "alias", 1, null);
            ScriptableObject.putProperty(scope, "src", source);
            Object result = driverScript.exec(cx, scope);
            String instrumented = Context.toString(result);
            return PREAMBLE.replace("__MAX_FRAMES__", String.valueOf(MAX_FRAMES))
                    + "\n" + instrumented;
        } catch (org.mozilla.javascript.RhinoException e) {
            throw new TracerException("JavaScript parse error: " + e.details(), e);
        } finally {
            Context.exit();
        }
    }

    private static void ensureCompiled() throws Exception {
        if (acornScript != null && driverScript != null) return;
        synchronized (LOCK) {
            if (acornScript != null && driverScript != null) return;
            Context cx = Context.enter();
            try {
                cx.setLanguageVersion(Context.VERSION_ES6);
                cx.setOptimizationLevel(-1);
                acornScript = cx.compileString(resource("/visualizer/acorn.js"), "acorn.js", 1, null);
                driverScript = cx.compileString(resource("/visualizer/js-instrument.js"), "js-instrument.js", 1, null);
            } finally {
                Context.exit();
            }
        }
    }

    private static String resource(String path) throws Exception {
        try (InputStream in = JsTracer.class.getResourceAsStream(path)) {
            if (in == null) throw new IllegalStateException("Missing classpath resource " + path);
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    // Node-12-compatible: no optional chaining / nullish coalescing.
    private static final String PREAMBLE = """
            var __viz = (function () {
              var MAXF = __MAX_FRAMES__, MAXH = 200, MAXE = 1000, MAXS = 256, MAXD = 8, MAXFLD = 64;
              var frames = [];
              var ids = new WeakMap();
              var nextId = 1;
              var step = 0;
              var outLen = 0;
              var done = false;
              var stack = [{ fn: "global", vars: {}, line: 0 }];

              var realWrite = process.stdout.write.bind(process.stdout);
              process.stdout.write = function (chunk, enc, cb) {
                try { outLen += (typeof chunk === "string") ? chunk.length : chunk.length; } catch (e) {}
                return realWrite(chunk, enc, cb);
              };

              function oid(o) {
                var v = ids.get(o);
                if (v === undefined) { v = nextId++; ids.set(o, v); }
                return v;
              }

              function enc(v, heap, seen, depth) {
                if (v === null || v === undefined) return null;
                var t = typeof v;
                if (t === "number") return isFinite(v) ? v : String(v);
                if (t === "boolean") return v;
                if (t === "string") return v.length <= MAXS ? v : v.slice(0, MAXS) + "...";
                if (t === "function") return undefined;
                if (t === "bigint" || t === "symbol") return String(v);
                var id = oid(v);
                var ref = "@" + id;
                if (seen.has(id)) return ref;
                seen.add(id);
                var key = String(id);
                if (Object.keys(heap).length >= MAXH || depth >= MAXD) {
                  heap[key] = { type: "opaque", repr: "(deep)", truncated: true };
                  return ref;
                }
                if (Array.isArray(v)) {
                  var vals = [];
                  for (var i = 0; i < v.length && i < MAXE; i++) {
                    var e = enc(v[i], heap, seen, depth + 1);
                    vals.push(e === undefined ? null : e);
                  }
                  var entA = { type: "list", values: vals };
                  if (v.length > MAXE) entA.truncated = true;
                  heap[key] = entA;
                  return ref;
                }
                if (v instanceof Map) {
                  var ents = []; var c = 0;
                  v.forEach(function (val, k) {
                    if (c++ >= MAXE) return;
                    var ek = enc(k, heap, seen, depth + 1);
                    var ev = enc(val, heap, seen, depth + 1);
                    ents.push([ek === undefined ? null : ek, ev === undefined ? null : ev]);
                  });
                  var entM = { type: "dict", entries: ents };
                  if (v.size > MAXE) entM.truncated = true;
                  heap[key] = entM;
                  return ref;
                }
                if (v instanceof Set) {
                  var sv = []; var c2 = 0;
                  v.forEach(function (x) {
                    if (c2++ >= MAXE) return;
                    var ex = enc(x, heap, seen, depth + 1);
                    sv.push(ex === undefined ? null : ex);
                  });
                  var entS = { type: "set", values: sv };
                  if (v.size > MAXE) entS.truncated = true;
                  heap[key] = entS;
                  return ref;
                }
                var cls = (v.constructor && v.constructor.name && v.constructor.name !== "Object")
                  ? v.constructor.name : "Object";
                var fields = {}; var cnt = 0;
                var keys;
                try { keys = Object.keys(v); } catch (e) { keys = []; }
                for (var j = 0; j < keys.length; j++) {
                  if (cnt >= MAXFLD) break;
                  var k2 = keys[j];
                  if (k2.indexOf("_") === 0) continue;
                  var ef;
                  try { ef = enc(v[k2], heap, seen, depth + 1); } catch (e) { ef = "(error)"; }
                  if (ef !== undefined) { fields[k2] = ef; cnt++; }
                }
                heap[key] = { type: "object", "class": cls, fields: fields };
                return ref;
              }

              function snap(line, vars) {
                if (done) return;
                if (frames.length >= MAXF) {
                  done = true;
                  frames.push({ step: ++step, truncated: true });
                  return;
                }
                var top = stack[stack.length - 1];
                top.vars = vars;
                top.line = line;
                var heap = {};
                var seen = new Set();
                var stk = [];
                for (var i = 0; i < stack.length; i++) {
                  var f = stack[i];
                  var locs = {};
                  for (var k in f.vars) {
                    if (!Object.prototype.hasOwnProperty.call(f.vars, k)) continue;
                    var e;
                    try { e = enc(f.vars[k], heap, seen, 0); } catch (err) { e = "(error)"; }
                    if (e !== undefined) locs[k] = e;
                  }
                  stk.push({ "function": f.fn, line: f.line || line, locals: locs });
                }
                frames.push({ step: ++step, line: line, event: "line", out_len: outLen, stack: stk, heap: heap });
              }

              function enter(fn) { stack.push({ fn: fn, vars: {}, line: 0 }); }
              function exit() { if (stack.length > 1) stack.pop(); }

              process.on("exit", function () {
                try {
                  process.stderr.write("\\n__FRAMES__" + JSON.stringify(frames) + "__END__\\n");
                } catch (e) {
                  process.stderr.write("\\n__FRAMES__[]__END__\\n");
                }
              });

              return { snap: snap, enter: enter, exit: exit };
            })();
            """;
}
