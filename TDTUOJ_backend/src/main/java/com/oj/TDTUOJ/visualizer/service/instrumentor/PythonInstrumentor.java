package com.oj.TDTUOJ.visualizer.service.instrumentor;

import java.util.*;

/**
 * AUTO mode: injects _snap() calls after every meaningful Python statement.
 * MANUAL mode: prepends snapshot() helper + appends __FRAMES__ flush.
 */
public class PythonInstrumentor {

    // ── AUTO ──────────────────────────────────────────────────────────────────

    public static String instrumentAuto(String code) {
        String preamble =
                "import json as _json, sys as _sys\n" +
                "\n" +
                "_frames = []\n" +
                "\n" +
                "def _snap(line, fn, **locs):\n" +
                "    _frames.append({\n" +
                "        'line': line,\n" +
                "        'event': 'line',\n" +
                "        'function': fn,\n" +
                "        'locals': {k: _safe(v) for k, v in locs.items()}\n" +
                "    })\n" +
                "\n" +
                "def _safe(v):\n" +
                "    if isinstance(v, bool):         return v\n" +
                "    if isinstance(v, (int, float)): return v\n" +
                "    if isinstance(v, str):          return v[:200]\n" +
                "    if isinstance(v, (list,tuple)): return [_safe(x) for x in v[:100]]\n" +
                "    if isinstance(v, dict):         return {str(k):_safe(w) for k,w in list(v.items())[:50]}\n" +
                "    if v is None:                   return None\n" +
                "    try:                            return str(v)[:100]\n" +
                "    except:                         return '<err>'\n" +
                "\n";

        String suffix =
                "\n" +
                "print('__FRAMES__' + _json.dumps(_frames) + '__END__', flush=True)\n";

        return preamble + transformSource(code) + suffix;
    }

    private static String transformSource(String code) {
        String[] lines = code.split("\n");
        StringBuilder out = new StringBuilder();

        java.util.regex.Pattern simpleAssign = java.util.regex.Pattern
                .compile("^(\\s*)([a-zA-Z_]\\w*)\\s*(?:=|\\+=|-=|\\*=|/=)(?!=)");
        java.util.regex.Pattern forLoop = java.util.regex.Pattern
                .compile("^(\\s*)for\\s+([a-zA-Z_]\\w*)\\s+in\\b");
        java.util.regex.Pattern whileLoop = java.util.regex.Pattern
                .compile("^(\\s*)while\\b");
        java.util.regex.Pattern ifLine = java.util.regex.Pattern
                .compile("^(\\s*)(?:if|elif|else)\\b");
        java.util.regex.Pattern funcDef = java.util.regex.Pattern
                .compile("^(\\s*)def\\s+(\\w+)\\s*\\(");
        java.util.regex.Pattern importLine = java.util.regex.Pattern
                .compile("^\\s*(?:import|from)\\s+");
        java.util.regex.Pattern anyBlockOpener = java.util.regex.Pattern
                .compile("^\\s*(?:for|while|if|elif|else|def|class|try|except|finally|with)\\b.*:\\s*$");

        List<String> knownVars = new ArrayList<>();
        String currentFunc = "<module>";
        Map<Integer, Integer> loopHeaderLines = new LinkedHashMap<>();

        Deque<int[]>  pendingSnapStack     = new ArrayDeque<>();
        Deque<String> pendingSnapFuncStack = new ArrayDeque<>();

        for (int i = 0; i < lines.length; i++) {
            String line    = lines[i];
            String trimmed = line.trim();
            int    lineNo  = i + 1;
            int    indent  = line.length() - line.stripLeading().length();

            out.append(line).append("\n");

            if (trimmed.isEmpty() || trimmed.startsWith("#")) continue;

            boolean isBlockOpener = anyBlockOpener.matcher(line).matches();

            boolean firedPending = false;
            if (!isBlockOpener && !pendingSnapStack.isEmpty()) {
                while (!pendingSnapStack.isEmpty()
                        && indent > pendingSnapStack.peek()[1]) {
                    int[]  ps  = pendingSnapStack.pop();
                    String psf = pendingSnapFuncStack.pop();
                    out.append(buildSnap(ps[0], psf, knownVars, " ".repeat(indent)));
                    firedPending = true;
                }
            }

            if (importLine.matcher(line).matches()) continue;

            java.util.regex.Matcher funcM = funcDef.matcher(line);
            if (funcM.find()) {
                currentFunc = funcM.group(2);
                pendingSnapStack.push(new int[]{lineNo, indent});
                pendingSnapFuncStack.push(currentFunc);
                continue;
            }

            java.util.regex.Matcher forM = forLoop.matcher(line);
            if (forM.find()) {
                String vname = forM.group(2);
                if (!vname.startsWith("_") && !knownVars.contains(vname)) knownVars.add(vname);
                loopHeaderLines.put(indent, lineNo);
                loopHeaderLines.entrySet().removeIf(e -> e.getKey() > indent);
                pendingSnapStack.push(new int[]{lineNo, indent});
                pendingSnapFuncStack.push(currentFunc);
                continue;
            }

            java.util.regex.Matcher whileM = whileLoop.matcher(line);
            if (whileM.find()) {
                loopHeaderLines.put(indent, lineNo);
                loopHeaderLines.entrySet().removeIf(e -> e.getKey() > indent);
                pendingSnapStack.push(new int[]{lineNo, indent});
                pendingSnapFuncStack.push(currentFunc);
                continue;
            }

            java.util.regex.Matcher ifM = ifLine.matcher(line);
            if (ifM.find()) {
                pendingSnapStack.push(new int[]{lineNo, indent});
                pendingSnapFuncStack.push(currentFunc);
                continue;
            }

            if (isBlockOpener) {
                pendingSnapStack.push(new int[]{lineNo, indent});
                pendingSnapFuncStack.push(currentFunc);
                continue;
            }

            java.util.regex.Matcher assignM = simpleAssign.matcher(line);
            if (assignM.find()) {
                String vname = assignM.group(2);
                if (!vname.startsWith("_") && !knownVars.contains(vname)) knownVars.add(vname);
            }

            if (trimmed.equals("pass") || trimmed.equals("break") || trimmed.equals("continue")) continue;

            String snapIndent = " ".repeat(indent);
            out.append(buildSnap(lineNo, currentFunc, knownVars, snapIndent));

            int bestIndent = -1, bestLine = -1;
            for (Map.Entry<Integer, Integer> e : loopHeaderLines.entrySet()) {
                if (e.getKey() < indent && e.getKey() > bestIndent) {
                    bestIndent = e.getKey();
                    bestLine   = e.getValue();
                }
            }
            if (bestLine > 0) out.append(buildSnap(bestLine, currentFunc, knownVars, snapIndent));
        }

        return out.toString();
    }

    private static String buildSnap(int lineNo, String fn, List<String> knownVars, String indent) {
        if (knownVars.isEmpty()) {
            return indent + "_snap(" + lineNo + ", '" + fn + "')\n";
        }
        StringBuilder sb = new StringBuilder();
        sb.append(indent).append("try:\n");
        sb.append(indent).append("    _snap(").append(lineNo).append(", '").append(fn).append("'");
        for (String v : knownVars) sb.append(", ").append(v).append("=").append(v);
        sb.append(")\n");
        sb.append(indent).append("except: pass\n");
        return sb.toString();
    }

    // ── MANUAL ────────────────────────────────────────────────────────────────

    public static String instrumentManual(String code) {
        String preamble =
                "import json as _json, copy as _copy\n" +
                "\n" +
                "_frames = []\n" +
                "\n" +
                "def snapshot(state):\n" +
                "    _frames.append(_copy.deepcopy(state))\n" +
                "\n";

        String suffix =
                "\n" +
                "print('__FRAMES__' + _json.dumps(_frames) + '__END__', flush=True)\n";

        return preamble + code + suffix;
    }

    private PythonInstrumentor() {}
}
