package com.oj.TDTUOJ.visualizer.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.oj.TDTUOJ.common.enums.SubmissionLanguage;
import com.oj.TDTUOJ.common.enums.VisualizerMode;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.visualizer.VisualizerRequest;
import com.oj.TDTUOJ.visualizer.VisualizerResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class VisualizerServiceImpl implements VisualizerService {

    @Value("${judge0.api.url}")
    private String judge0Url;

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    private static final Map<SubmissionLanguage, Integer> LANG_ID = Map.of(
            SubmissionLanguage.PYTHON, 71,
            SubmissionLanguage.JAVA,   62,
            SubmissionLanguage.C,      50,
            SubmissionLanguage.CPP,    76
    );

    // ── Public entry point ────────────────────────────────────────────────────

    @Override
    public Response<VisualizerResponse> visualize(VisualizerRequest request) {
        validateRequest(request);

        String instrumented = instrument(request.getSourceCode(), request.getLanguage(), request.getMode());
        log.info("Visualizing: language={}, codeLength={}", request.getLanguage(),
                request.getSourceCode().length());

        Map<?, ?> judge0Response = submitToJudge0(
                instrumented,
                request.getLanguage(),
                request.getStdin()
        );

        VisualizerResponse result = parseJudge0Response(judge0Response);

        return Response.<VisualizerResponse>builder()
                .statusCode(HttpStatus.OK.value())
                .message(result.getError() != null ? "Visualization failed" : "Visualization complete")
                .data(result)
                .build();
    }

    // ── Judge0 submission ─────────────────────────────────────────────────────

    private Map<?, ?> submitToJudge0(String code, SubmissionLanguage language, String stdin) {
        Map<String, Object> body = new HashMap<>();
        body.put("source_code",    encode(code));
        body.put("language_id",    LANG_ID.get(language));
        body.put("stdin",          encode(stdin != null ? stdin : ""));
        body.put("cpu_time_limit", 10.0);
        body.put("memory_limit",   262144);  // KB — same default as Judge0Service (256 MB)

        return webClientBuilder
                .baseUrl(judge0Url)
                .build()
                .post()
                .uri("/submissions?base64_encoded=true&wait=true")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    // ── Response parsing ──────────────────────────────────────────────────────

    private VisualizerResponse parseJudge0Response(Map<?, ?> response) {
        if (response == null) {
            return error("No response from Judge0");
        }

        int statusId = extractStatusId(response);
        log.info("Judge0 visualizer status id: {}", statusId);

        // Compile error
        String compileOutput = decode(response.get("compile_output"));
        if (compileOutput != null && !compileOutput.isBlank()) {
            return error("Compile error:\n" + compileOutput.trim());
        }

        // Runtime error (but still try to parse stdout — partial frames are ok)
        String stderr = decode(response.get("stderr"));

        // TLE
        if (statusId == 5) {
            return error("Time limit exceeded — your algorithm may have too many snapshot() calls or an infinite loop");
        }

        String rawStdout = decode(response.get("stdout"));
        log.info("=== RAW STDOUT ===\n{}", rawStdout);  // ← add this
        log.info("=== STDERR ===\n{}", decode(response.get("stderr")));
        log.info("=== COMPILE OUTPUT ===\n{}", decode(response.get("compile_output")));

        if (rawStdout == null || rawStdout.isBlank()) {
            String msg = stderr != null && !stderr.isBlank()
                    ? "Runtime error:\n" + stderr.trim()
                    : "No output — did you call snapshot() in your code?";
            return error(msg);
        }

        return extractFrames(rawStdout, stderr);
    }

    private VisualizerResponse extractFrames(String rawStdout, String stderr) {
        int start = rawStdout.indexOf("__FRAMES__");
        int end   = rawStdout.indexOf("__END__");

        // Program ran fine but user never called snapshot()
        if (start == -1 || end == -1) {
            return VisualizerResponse.builder()
                    .frames(Collections.emptyList())
                    .stdout(rawStdout.trim())
                    .error("No frames found — did you call snapshot() in your code?")
                    .build();
        }

        String framesJson = rawStdout.substring(start + "__FRAMES__".length(), end).trim();
        String userStdout = rawStdout.substring(0, start).trim();

        try {
            List<Map<String, Object>> frames = objectMapper.readValue(
                    framesJson, new TypeReference<>() {});

            log.info("Parsed {} frames successfully", frames.size());

            return VisualizerResponse.builder()
                    .frames(frames)
                    .stdout(userStdout.isBlank() ? null : userStdout)
                    // surface stderr as a warning if frames still parsed ok
                    .error(stderr != null && !stderr.isBlank() ? stderr.trim() : null)
                    .build();

        } catch (Exception e) {
            log.error("Failed to parse frames JSON: {}", framesJson, e);
            return error("Failed to parse frames — make sure snapshot() receives a valid JSON-serializable object.\nDetail: " + e.getMessage());
        }
    }

    // ── Instrumentation ───────────────────────────────────────────────────────

    private String instrument(String code, SubmissionLanguage lang, VisualizerMode mode) {
        if (mode == VisualizerMode.MANUAL) {
            // existing behavior
            return switch (lang) {
                case PYTHON -> instrumentPythonManual(code);
                case JAVA   -> instrumentJavaManual(code);
                case C      -> instrumentCManual(code);
                case CPP    -> instrumentCppManual(code);
            };
        }
        // AUTO mode
        return switch (lang) {
            case PYTHON -> instrumentPythonAuto(code);
            case JAVA   -> instrumentJavaAuto(code);
            case C      -> instrumentCAuto(code);
            case CPP    -> instrumentCppAuto(code);
        };
    }

    private String instrumentPythonAuto(String code) {
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

        String transformed = transformPythonSource(code);
        return preamble + transformed + suffix;
    }

    private String transformPythonSource(String code) {
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

        // Stack of pending snaps — each: [lineNo, indent]
        Deque<int[]>  pendingSnapStack     = new ArrayDeque<>();
        Deque<String> pendingSnapFuncStack = new ArrayDeque<>();

        for (int i = 0; i < lines.length; i++) {
            String line    = lines[i];
            String trimmed = line.trim();
            int    lineNo  = i + 1;
            int    indent  = line.length() - line.stripLeading().length();

            out.append(line).append("\n");

            if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                continue;
            }

            boolean isBlockOpener = anyBlockOpener.matcher(line).matches();

            // Fire pending snaps only when:
            // 1. Current indent is greater than the pending snap's opener indent
            // 2. Current line is NOT itself a block opener (would leave empty block)
            boolean firedPending = false;
            if (!isBlockOpener && !pendingSnapStack.isEmpty()) {
                while (!pendingSnapStack.isEmpty()
                        && indent > pendingSnapStack.peek()[1]) {
                    int[]  ps  = pendingSnapStack.pop();
                    String psf = pendingSnapFuncStack.pop();
                    out.append(buildPythonSnap(ps[0], psf, knownVars, " ".repeat(indent)));
                    firedPending = true;
                }
            }

            // Skip imports
            if (importLine.matcher(line).matches()) {
                continue;
            }

            // Function definition
            java.util.regex.Matcher funcM = funcDef.matcher(line);
            if (funcM.find()) {
                currentFunc = funcM.group(2);
                pendingSnapStack.push(new int[]{lineNo, indent});
                pendingSnapFuncStack.push(currentFunc);
                continue;
            }

            // For loop
            java.util.regex.Matcher forM = forLoop.matcher(line);
            if (forM.find()) {
                String vname = forM.group(2);
                if (!vname.startsWith("_") && !knownVars.contains(vname)) {
                    knownVars.add(vname);
                }
                loopHeaderLines.put(indent, lineNo);
                loopHeaderLines.entrySet().removeIf(e -> e.getKey() > indent);
                pendingSnapStack.push(new int[]{lineNo, indent});
                pendingSnapFuncStack.push(currentFunc);
                continue;
            }

            // While loop
            java.util.regex.Matcher whileM = whileLoop.matcher(line);
            if (whileM.find()) {
                loopHeaderLines.put(indent, lineNo);
                loopHeaderLines.entrySet().removeIf(e -> e.getKey() > indent);
                pendingSnapStack.push(new int[]{lineNo, indent});
                pendingSnapFuncStack.push(currentFunc);
                continue;
            }

            // if/elif/else
            java.util.regex.Matcher ifM = ifLine.matcher(line);
            if (ifM.find()) {
                pendingSnapStack.push(new int[]{lineNo, indent});
                pendingSnapFuncStack.push(currentFunc);
                continue;
            }

            // Any other block opener
            if (isBlockOpener) {
                pendingSnapStack.push(new int[]{lineNo, indent});
                pendingSnapFuncStack.push(currentFunc);
                continue;
            }

            // Track variable assignments
            java.util.regex.Matcher assignM = simpleAssign.matcher(line);
            if (assignM.find()) {
                String vname = assignM.group(2);
                if (!vname.startsWith("_") && !knownVars.contains(vname)) {
                    knownVars.add(vname);
                }
            }

            if (trimmed.equals("pass") || trimmed.equals("break") || trimmed.equals("continue")) {
                continue;
            }

            String snapIndent = " ".repeat(indent);

            // Only inject regular snap if pending snap didn't already fire on this line
            if (!firedPending) {
                out.append(buildPythonSnap(lineNo, currentFunc, knownVars, snapIndent));
            } else {
                // Pending fired — still inject this line's snap with updated vars
                out.append(buildPythonSnap(lineNo, currentFunc, knownVars, snapIndent));
            }

            // Loop-back frame
            int bestIndent = -1;
            int bestLine   = -1;
            for (Map.Entry<Integer, Integer> e : loopHeaderLines.entrySet()) {
                if (e.getKey() < indent && e.getKey() > bestIndent) {
                    bestIndent = e.getKey();
                    bestLine   = e.getValue();
                }
            }
            if (bestLine > 0) {
                out.append(buildPythonSnap(bestLine, currentFunc, knownVars, snapIndent));
            }
        }

        return out.toString();
    }

    private String buildPythonSnap(int lineNo, String fn,
                                   List<String> knownVars, String indent) {
        if (knownVars.isEmpty()) {
            return indent + "_snap(" + lineNo + ", '" + fn + "')\n";
        }
        StringBuilder sb = new StringBuilder();
        sb.append(indent).append("try:\n");
        sb.append(indent).append("    _snap(").append(lineNo)
                .append(", '").append(fn).append("'");
        for (String v : knownVars) {
            sb.append(", ").append(v).append("=").append(v);
        }
        sb.append(")\n");
        sb.append(indent).append("except: pass\n");
        return sb.toString();
    }

    private String instrumentJavaAuto(String code) {
        // Hoist all user imports to the top
        StringBuilder userImports = new StringBuilder();
        StringBuilder userBody    = new StringBuilder();

        for (String line : code.split("\n")) {
            if (line.trim().startsWith("import ")) {
                userImports.append(line).append("\n");
            } else {
                userBody.append(line).append("\n");
            }
        }

        String helper =
                "import java.util.*;\n" +
                        "\n" +
                        "class _Tracer {\n" +
                        "    static final List<Map<String,Object>> _frames = new ArrayList<>();\n" +
                        "\n" +
                        "    static {\n" +
                        "        Runtime.getRuntime().addShutdownHook(new Thread(() -> {\n" +
                        "            StringBuilder sb = new StringBuilder(\"[\");\n" +
                        "            for (int i = 0; i < _frames.size(); i++) {\n" +
                        "                if (i > 0) sb.append(\",\");\n" +
                        "                Map<String,Object> f = _frames.get(i);\n" +
                        "                sb.append(\"{\");\n" +
                        "                sb.append(\"\\\"line\\\":\").append(f.get(\"line\")).append(\",\");\n" +
                        "                sb.append(\"\\\"function\\\":\\\"\").append(f.get(\"function\")).append(\"\\\",\");\n" +
                        "                sb.append(\"\\\"event\\\":\\\"line\\\",\");\n" +
                        "                sb.append(\"\\\"locals\\\":\").append(f.get(\"locals\"));\n" +
                        "                sb.append(\"}\");\n" +
                        "            }\n" +
                        "            sb.append(\"]\");\n" +
                        "            System.out.println(\"__FRAMES__\" + sb + \"__END__\");\n" +
                        "            System.out.flush();\n" +
                        "        }));\n" +
                        "    }\n" +
                        "\n" +
                        "    static void _line(int lineNo, String fn, String[] names, Object[] vals) {\n" +
                        "        StringBuilder locals = new StringBuilder(\"{\");\n" +
                        "        for (int i = 0; i < names.length; i++) {\n" +
                        "            if (i > 0) locals.append(\",\");\n" +
                        "            locals.append(\"\\\"\").append(names[i]).append(\"\\\":\");\n" +
                        "            locals.append(_toJson(vals[i]));\n" +
                        "        }\n" +
                        "        locals.append(\"}\");\n" +
                        "        Map<String,Object> frame = new LinkedHashMap<>();\n" +
                        "        frame.put(\"line\",     lineNo);\n" +
                        "        frame.put(\"function\", fn);\n" +
                        "        frame.put(\"locals\",   locals.toString());\n" +
                        "        _frames.add(frame);\n" +
                        "    }\n" +
                        "\n" +
                        "    static String _toJson(Object v) {\n" +
                        "        if (v == null)            return \"null\";\n" +
                        "        if (v instanceof Boolean) return v.toString();\n" +
                        "        if (v instanceof Number)  return v.toString();\n" +
                        "        if (v instanceof int[]) {\n" +
                        "            int[] a = (int[]) v;\n" +
                        "            StringBuilder sb = new StringBuilder(\"[\");\n" +
                        "            for (int i = 0; i < a.length; i++) {\n" +
                        "                if (i > 0) sb.append(\",\");\n" +
                        "                sb.append(a[i]);\n" +
                        "            }\n" +
                        "            return sb.append(\"]\").toString();\n" +
                        "        }\n" +
                        "        if (v instanceof List) {\n" +
                        "            List<?> l = (List<?>) v;\n" +
                        "            StringBuilder sb = new StringBuilder(\"[\");\n" +
                        "            for (int i = 0; i < l.size(); i++) {\n" +
                        "                if (i > 0) sb.append(\",\");\n" +
                        "                sb.append(_toJson(l.get(i)));\n" +
                        "            }\n" +
                        "            return sb.append(\"]\").toString();\n" +
                        "        }\n" +
                        "        return \"\\\"\" + v.toString()\n" +
                        "                          .replace(\"\\\\\", \"\\\\\\\\\")\n" +
                        "                          .replace(\"\\\"\", \"\\\\\\\"\") + \"\\\"\";\n" +
                        "    }\n" +
                        "}\n\n";

        String transformed = transformJavaSource(userBody.toString());
        return userImports + helper + transformed;
    }

    // ── Java source transformer ───────────────────────────────────────────────────
    private String transformJavaSource(String code) {
        String[] lines         = code.split("\n");
        StringBuilder out      = new StringBuilder();
        String currentMethod   = "main";
        List<String> knownVars = new ArrayList<>();
        List<String> loopVars  = new ArrayList<>();
        int braceDepth         = 0;
        int loopVarDepth       = -1;
        // Innermost loop header line per brace depth
        Map<Integer, Integer> loopHeaderLine = new LinkedHashMap<>();

        java.util.regex.Pattern methodDecl  = java.util.regex.Pattern
                .compile("(?:public|private|protected|static|void|int|long|double|boolean|String|float).*\\(.*\\)\\s*\\{");
        java.util.regex.Pattern varDecl     = java.util.regex.Pattern
                .compile("^\\s*(?:int|long|double|float|boolean|String|char)\\s+(\\w+)");
        java.util.regex.Pattern intArrDecl  = java.util.regex.Pattern
                .compile("^\\s*int\\[\\]\\s+(\\w+)");
        java.util.regex.Pattern forInitVar  = java.util.regex.Pattern
                .compile("for\\s*\\(\\s*(?:int|long|double)\\s+(\\w+)");
        java.util.regex.Pattern blockOpener = java.util.regex.Pattern
                .compile("^\\s*(?:for|while)\\b.*\\{\\s*$");
        java.util.regex.Pattern braceOnly   = java.util.regex.Pattern
                .compile("^\\s*[\\{\\}]\\s*$");

        for (int i = 0; i < lines.length; i++) {
            String line    = lines[i];
            String trimmed = line.trim();
            int    lineNo  = i + 1;

            boolean isLoopOpener = blockOpener.matcher(trimmed).matches()
                    && !trimmed.startsWith("//");

            // Track brace depth
            for (char c : trimmed.toCharArray()) {
                if (c == '{') braceDepth++;
                else if (c == '}') braceDepth--;
            }

            // Exit loop scope
            if (loopVarDepth >= 0 && braceDepth < loopVarDepth) {
                loopVars.clear();
                loopVarDepth = -1;
            }
            // Remove loop header tracking for depths we've exited
            int finalBraceDepth = braceDepth;
            loopHeaderLine.entrySet().removeIf(e -> e.getKey() > finalBraceDepth);

            // Track method — reset all
            if (methodDecl.matcher(line).find()) {
                java.util.regex.Matcher m = java.util.regex.Pattern
                        .compile("\\s(\\w+)\\s*\\(").matcher(line);
                if (m.find()) currentMethod = m.group(1);
                knownVars    = new ArrayList<>();
                loopVars     = new ArrayList<>();
                loopVarDepth = -1;
                loopHeaderLine.clear();
                out.append(line).append("\n");
                continue;
            }

            // Track regular variable declarations
            java.util.regex.Matcher declM    = varDecl.matcher(line);
            java.util.regex.Matcher arrDeclM = intArrDecl.matcher(line);
            java.util.regex.Matcher forInitM = forInitVar.matcher(line);

            if (declM.find()) {
                String vname = declM.group(1);
                if (!forInitM.reset(line).find()) {
                    if (!knownVars.contains(vname)) knownVars.add(vname);
                }
            }
            if (arrDeclM.find()) {
                String vname = arrDeclM.group(1);
                if (!knownVars.contains(vname)) knownVars.add(vname);
            }

            // Track for-init variables
            forInitM.reset(line);
            if (forInitM.find()) {
                String vname = forInitM.group(1);
                if (!loopVars.contains(vname)) {
                    loopVars.add(vname);
                    loopVarDepth = braceDepth;
                }
            }

            // Record loop header line at this brace depth
            if (isLoopOpener) {
                loopHeaderLine.put(braceDepth, lineNo);
            }

            out.append(line).append("\n");

            boolean isComment   = trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*");
            boolean isImport    = trimmed.startsWith("import") || trimmed.startsWith("package");
            boolean isBlank     = trimmed.isEmpty();
            boolean isBraceOnly = braceOnly.matcher(trimmed).matches();
            boolean isSemicolon = trimmed.endsWith(";") && !isComment && !isImport && !isBlank;

            if (isBraceOnly || (!isSemicolon && !isLoopOpener)) continue;

            // Build combined vars
            List<String> allVars = new ArrayList<>(knownVars);
            for (String lv : loopVars) {
                if (!allVars.contains(lv)) allVars.add(lv);
            }

            String fn = currentMethod;

            // Inject frame for current line
            emitJavaFrame(out, lineNo, fn, allVars);

            // After a ; inside a loop body — also inject a loop-header frame
            // so the blue line jumps back to the for/while line (condition check)
            if (isSemicolon && !loopHeaderLine.isEmpty()) {
                int headerLine = loopHeaderLine.values().stream()
                        .reduce((a, b) -> b).orElse(-1); // innermost loop
                if (headerLine > 0 && headerLine != lineNo) {
                    emitJavaFrame(out, headerLine, fn, allVars);
                }
            }
        }
        return out.toString();
    }

    private void emitJavaFrame(StringBuilder out, int lineNo, String fn, List<String> allVars) {
        if (allVars.isEmpty()) {
            out.append("try{_Tracer._line(").append(lineNo)
                    .append(",\"").append(fn)
                    .append("\",new String[]{},new Object[]{});}catch(Exception _e){}\n");
        } else {
            String namesArr = allVars.stream()
                    .map(v -> "\"" + v + "\"")
                    .collect(java.util.stream.Collectors.joining(","));
            String valsArr  = allVars.stream()
                    .map(v -> "(Object)" + v)
                    .collect(java.util.stream.Collectors.joining(","));
            out.append("try{_Tracer._line(").append(lineNo)
                    .append(",\"").append(fn)
                    .append("\",new String[]{").append(namesArr)
                    .append("},new Object[]{").append(valsArr)
                    .append("});}catch(Exception _e){}\n");
        }
    }

    private String instrumentCAuto(String code) {
        String preamble =
                "#include <stdio.h>\n" +
                        "#include <stdlib.h>\n" +
                        "#include <string.h>\n" +
                        "\n" +
                        "#define _FBUF_SIZE (16*1024*1024)\n" +
                        "static char  _fbuf[_FBUF_SIZE];\n" +
                        "static int   _fpos = 0;\n" +
                        "static int   _ffirst = 1;\n" +
                        "\n" +
                        "static void _Ti(int line, const char* fn, const char* name, long long val) {\n" +
                        "    if (_fpos >= _FBUF_SIZE - 512) return;\n" +
                        "    if (!_ffirst) _fbuf[_fpos++] = ',';\n" +
                        "    _ffirst = 0;\n" +
                        "    _fpos += snprintf(_fbuf + _fpos, 512,\n" +
                        "        \"{\\\"line\\\":%d,\\\"function\\\":\\\"%s\\\",\\\"event\\\":\\\"line\\\",\\\"locals\\\":{\\\"%s\\\":%lld}}\",\n" +
                        "        line, fn, name, val);\n" +
                        "}\n" +
                        "\n" +
                        "static void _Td(int line, const char* fn, const char* name, double val) {\n" +
                        "    if (_fpos >= _FBUF_SIZE - 512) return;\n" +
                        "    if (!_ffirst) _fbuf[_fpos++] = ',';\n" +
                        "    _ffirst = 0;\n" +
                        "    _fpos += snprintf(_fbuf + _fpos, 512,\n" +
                        "        \"{\\\"line\\\":%d,\\\"function\\\":\\\"%s\\\",\\\"event\\\":\\\"line\\\",\\\"locals\\\":{\\\"%s\\\":%g}}\",\n" +
                        "        line, fn, name, val);\n" +
                        "}\n" +
                        "\n" +
                        "static void _Ta(int line, const char* fn, const char* name, int* arr, int len) {\n" +
                        "    if (_fpos >= _FBUF_SIZE - 65536) return;\n" +
                        "    if (!_ffirst) _fbuf[_fpos++] = ',';\n" +
                        "    _ffirst = 0;\n" +
                        "    _fpos += snprintf(_fbuf + _fpos, 256,\n" +
                        "        \"{\\\"line\\\":%d,\\\"function\\\":\\\"%s\\\",\\\"event\\\":\\\"line\\\",\\\"locals\\\":{\\\"%s\\\":[\",\n" +
                        "        line, fn, name);\n" +
                        "    for (int _i = 0; _i < len && _fpos < _FBUF_SIZE - 64; _i++) {\n" +
                        "        if (_i) _fbuf[_fpos++] = ',';\n" +
                        "        _fpos += snprintf(_fbuf + _fpos, 32, \"%d\", arr[_i]);\n" +
                        "    }\n" +
                        "    _fpos += snprintf(_fbuf + _fpos, 8, \"]}}\");\n" +
                        "}\n" +
                        "\n" +
                        "static void _flush_auto(void) {\n" +
                        "    printf(\"__FRAMES__[\");\n" +
                        "    fwrite(_fbuf, 1, _fpos, stdout);\n" +
                        "    printf(\"]__END__\\n\");\n" +
                        "    fflush(stdout);\n" +
                        "}\n" +
                        "\n" +
                        "__attribute__((constructor))\n" +
                        "static void _reg(void) { atexit(_flush_auto); }\n" +
                        "\n";

        String transformed = transformCSource(code, false);
        return preamble + transformed;
    }

    private String instrumentCppAuto(String code) {
        String preamble =
                "#include <iostream>\n" +
                        "#include <vector>\n" +
                        "#include <string>\n" +
                        "#include <cstdio>\n" +
                        "#include <cstdlib>\n" +
                        "\n" +
                        "static std::string _fbuf;\n" +
                        "static bool _ffirst = true;\n" +
                        "\n" +
                        "static void _Ti(int line, const char* fn, const char* name, long long val) {\n" +
                        "    char tmp[512];\n" +
                        "    snprintf(tmp, sizeof(tmp),\n" +
                        "        \"{\\\"line\\\":%d,\\\"function\\\":\\\"%s\\\",\\\"event\\\":\\\"line\\\",\\\"locals\\\":{\\\"%s\\\":%lld}}\",\n" +
                        "        line, fn, name, val);\n" +
                        "    if (!_ffirst) _fbuf += ',';\n" +
                        "    _fbuf += tmp; _ffirst = false;\n" +
                        "}\n" +
                        "\n" +
                        "static void _Td(int line, const char* fn, const char* name, double val) {\n" +
                        "    char tmp[512];\n" +
                        "    snprintf(tmp, sizeof(tmp),\n" +
                        "        \"{\\\"line\\\":%d,\\\"function\\\":\\\"%s\\\",\\\"event\\\":\\\"line\\\",\\\"locals\\\":{\\\"%s\\\":%g}}\",\n" +
                        "        line, fn, name, val);\n" +
                        "    if (!_ffirst) _fbuf += ',';\n" +
                        "    _fbuf += tmp; _ffirst = false;\n" +
                        "}\n" +
                        "\n" +
                        "template<typename T>\n" +
                        "static void _Tv(int line, const char* fn, const char* name, const std::vector<T>& arr) {\n" +
                        "    std::string s;\n" +
                        "    s += \"{\\\"line\\\":\";\n" +
                        "    s += std::to_string(line);\n" +
                        "    s += \",\\\"function\\\":\\\"\";\n" +
                        "    s += fn;\n" +
                        "    s += \"\\\",\\\"event\\\":\\\"line\\\",\\\"locals\\\":{\\\"\";\n" +
                        "    s += name;\n" +
                        "    s += \"\\\":[\";\n" +
                        "    for (size_t i = 0; i < arr.size() && i < 200; i++) {\n" +
                        "        if (i) s += ',';\n" +
                        "        s += std::to_string(arr[i]);\n" +
                        "    }\n" +
                        "    s += \"]}}\"\n;" +
                        "    if (!_ffirst) _fbuf += ',';\n" +
                        "    _fbuf += s; _ffirst = false;\n" +
                        "}\n" +
                        "\n" +
                        "struct _FF {\n" +
                        "    _FF() { atexit([](){\n" +
                        "        std::cout << \"__FRAMES__[\" << _fbuf << \"]__END__\" << std::endl;\n" +
                        "    }); }\n" +
                        "};\n" +
                        "static _FF _ff;\n" +
                        "\n";

        String transformed = transformCSource(code, true);
        return preamble + transformed;
    }

    // ── C/C++ source transformer ──────────────────────────────────────────────────
    private String transformCSource(String code, boolean isCpp) {
        String[] lines = code.split("\n");
        StringBuilder out = new StringBuilder();
        String currentFn = "main";

        java.util.regex.Pattern intDecl   = java.util.regex.Pattern
                .compile("^\\s*(?:int|long|long long)\\s+(\\w+)\\s*(?:=|;)");
        java.util.regex.Pattern dblDecl   = java.util.regex.Pattern
                .compile("^\\s*(?:double|float)\\s+(\\w+)\\s*(?:=|;)");
        java.util.regex.Pattern vecDecl   = java.util.regex.Pattern
                .compile("^\\s*(?:vector<(?:int|long|double|float)>)\\s+(\\w+)");
        java.util.regex.Pattern fnDecl    = java.util.regex.Pattern
                .compile("^\\w[\\w\\s*]+\\s+(\\w+)\\s*\\([^)]*\\)\\s*\\{");
        java.util.regex.Pattern loopVar   = java.util.regex.Pattern
                .compile("for\\s*\\(\\s*(?:int|long)\\s+(\\w+)");
        java.util.regex.Pattern loopLine  = java.util.regex.Pattern
                .compile("^\\s*(?:for|while)\\b.*\\{\\s*$");

        Map<String, String> vars     = new LinkedHashMap<>();
        Map<String, String> loopVars = new LinkedHashMap<>();
        int braceDepth   = 0;
        int loopVarDepth = -1;
        // Track loop opener lines so we can inject at their line number on each iteration
        // key = brace depth of loop body, value = line number of the for/while header
        Map<Integer, Integer> loopHeaderLine = new LinkedHashMap<>();

        for (int i = 0; i < lines.length; i++) {
            String line    = lines[i];
            String trimmed = line.trim();
            int    lineNo  = i + 1;

            boolean isLoopOpener = loopLine.matcher(trimmed).matches()
                    && !trimmed.startsWith("//");

            // Count braces BEFORE processing so we know depth entering this line
            int depthBefore = braceDepth;
            for (char c : trimmed.toCharArray()) {
                if (c == '{') braceDepth++;
                else if (c == '}') braceDepth--;
            }

            // Exit loop scope
            if (loopVarDepth >= 0 && braceDepth < loopVarDepth) {
                loopVars.clear();
                loopVarDepth = -1;
            }
            // Remove loop header tracking for depths we've exited
            int finalBraceDepth = braceDepth;
            loopHeaderLine.entrySet().removeIf(e -> e.getKey() > finalBraceDepth);

            // Track function
            java.util.regex.Matcher fm = fnDecl.matcher(line);
            if (fm.find() && !trimmed.startsWith("//")) {
                currentFn    = fm.group(1);
                vars         = new LinkedHashMap<>();
                loopVars     = new LinkedHashMap<>();
                loopVarDepth = -1;
                loopHeaderLine.clear();
            }

            // Check for-loop line
            java.util.regex.Matcher loopCheck = loopVar.matcher(line);
            boolean isForLine = loopCheck.find();

            // Track method-scope declarations
            if (!isForLine) {
                java.util.regex.Matcher im = intDecl.matcher(line);
                java.util.regex.Matcher dm = dblDecl.matcher(line);
                if      (im.find() && !vars.containsKey(im.group(1))) vars.put(im.group(1), "i");
                else if (dm.find() && !vars.containsKey(dm.group(1))) vars.put(dm.group(1), "d");
            }

            if (isCpp) {
                java.util.regex.Matcher vm = vecDecl.matcher(line);
                if (vm.find() && !vars.containsKey(vm.group(1))) vars.put(vm.group(1), "v");
            }

            // Track for-loop init variable
            java.util.regex.Matcher lm = loopVar.matcher(line);
            if (lm.find()) {
                String vname = lm.group(1);
                if (!loopVars.containsKey(vname)) {
                    loopVars.put(vname, "i");
                    loopVarDepth = braceDepth;
                }
            }

            // Record loop header line number at the depth of the loop body
            if (isLoopOpener) {
                loopHeaderLine.put(braceDepth, lineNo);
            }

            out.append(line).append("\n");

            // Combine all vars
            Map<String, String> allVars = new LinkedHashMap<>(vars);
            allVars.putAll(loopVars);

            String fn = currentFn;

            boolean isComment   = trimmed.startsWith("//") || trimmed.startsWith("/*");
            boolean isPreproc   = trimmed.startsWith("#");
            boolean isSemicolon = trimmed.endsWith(";") && !isComment && !isPreproc;

            // Inject after every ; statement
            if (isSemicolon && !allVars.isEmpty()) {
                emitCppFrame(out, lineNo, fn, allVars, isCpp);

                // After injecting for a ; inside a loop body, ALSO inject a
                // "loop header" frame so the blue line jumps back to the for line
                // This simulates the loop condition check between iterations
                if (!loopHeaderLine.isEmpty()) {
                    int loopLine2 = loopHeaderLine.values().stream()
                            .reduce((a, b) -> b).orElse(-1); // innermost loop
                    if (loopLine2 > 0) {
                        emitCppFrame(out, loopLine2, fn, allVars, isCpp);
                    }
                }
            }

            // Also inject once on the loop opener line itself (first iteration entry)
            if (isLoopOpener && !allVars.isEmpty()) {
                emitCppFrame(out, lineNo, fn, allVars, isCpp);
            }
        }
        return out.toString();
    }

    // ── Helper: emit one unified frame for C or C++ ───────────────────────────────
    private void emitCppFrame(StringBuilder out, int lineNo, String fn,
                              Map<String, String> allVars, boolean isCpp) {
        List<String> scalarVars = new ArrayList<>();
        List<String> vecVars    = new ArrayList<>();
        for (Map.Entry<String, String> e : allVars.entrySet()) {
            if (e.getValue().equals("v")) vecVars.add(e.getKey());
            else scalarVars.add(e.getKey());
        }

        if (isCpp) {
            out.append("{\n");
            out.append("    std::string _ls = \"{\";\n");
            out.append("    bool _lf = true;\n");

            for (String vname : scalarVars) {
                String vtype = allVars.get(vname);
                out.append("    { if(!_lf)_ls+=\",\"; _lf=false;")
                        .append(" char _t[64]; snprintf(_t,64,\"\\\"")
                        .append(vname).append("\\\":");
                if (vtype.equals("i")) {
                    out.append("%lld\",(long long)").append(vname);
                } else {
                    out.append("%g\",(double)").append(vname);
                }
                out.append("); _ls+=_t; }\n");
            }

            for (String vname : vecVars) {
                out.append("    { if(!_lf)_ls+=\",\"; _lf=false;")
                        .append(" _ls+=\"\\\"").append(vname).append("\\\":[\";\n");
                out.append("      for(size_t _vi=0;_vi<").append(vname)
                        .append(".size()&&_vi<200;_vi++){")
                        .append("if(_vi)_ls+=\",\";")
                        .append("_ls+=std::to_string(").append(vname).append("[_vi]);}\n");
                out.append("      _ls+=\"]\"; }\n");
            }

            out.append("    _ls += \"}\";\n");
            out.append("    std::string _f = \"{\\\"line\\\":").append(lineNo)
                    .append(",\\\"function\\\":\\\"").append(fn)
                    .append("\\\",\\\"event\\\":\\\"line\\\",\\\"locals\\\":\"+_ls+\"}\";\n");
            out.append("    if(!_ffirst)_fbuf+=',';\n");
            out.append("    _fbuf+=_f; _ffirst=false;\n");
            out.append("}\n");

        } else {
            // C: one _Ti/_Td per scalar
            for (String vname : scalarVars) {
                String vtype = allVars.get(vname);
                if (vtype.equals("i")) {
                    out.append("_Ti(").append(lineNo).append(",\"")
                            .append(fn).append("\",\"").append(vname)
                            .append("\",(long long)").append(vname).append(");\n");
                } else {
                    out.append("_Td(").append(lineNo).append(",\"")
                            .append(fn).append("\",\"").append(vname)
                            .append("\",(double)").append(vname).append(");\n");
                }
            }
        }
    }

    private String instrumentPythonManual(String code) {
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

    private String instrumentJavaManual(String code) {
        // Strip any existing imports from user code and hoist them to the top
        StringBuilder userImports = new StringBuilder();
        StringBuilder userBody = new StringBuilder();

        for (String line : code.split("\n")) {
            if (line.trim().startsWith("import ")) {
                userImports.append(line).append("\n");
            } else {
                userBody.append(line).append("\n");
            }
        }

        String helper = """
            import java.util.*;
            
            class Snapshot {
                private static final StringBuilder _buf = new StringBuilder();
                private static boolean _first = true;
            
                static {
                    Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                        System.out.println("__FRAMES__[" + _buf + "]__END__");
                        System.out.flush();
                    }));
                }
            
                public static void snapshot(String rawJson) {
                    if (!_first) _buf.append(',');
                    _buf.append(rawJson);
                    _first = false;
                }
            
                public static String jsonObj(Object... keyValues) {
                    StringBuilder sb = new StringBuilder("{");
                    for (int i = 0; i < keyValues.length - 1; i += 2) {
                        if (i > 0) sb.append(',');
                        sb.append('"').append(keyValues[i]).append('"').append(':');
                        sb.append(toJson(keyValues[i + 1]));
                    }
                    return sb.append('}').toString();
                }
            
                public static String jsonArr(int[] arr) {
                    StringBuilder sb = new StringBuilder("[");
                    for (int i = 0; i < arr.length; i++) {
                        if (i > 0) sb.append(',');
                        sb.append(arr[i]);
                    }
                    return sb.append(']').toString();
                }
            
                public static String jsonArr(List<?> list) {
                    StringBuilder sb = new StringBuilder("[");
                    for (int i = 0; i < list.size(); i++) {
                        if (i > 0) sb.append(',');
                        sb.append(toJson(list.get(i)));
                    }
                    return sb.append(']').toString();
                }
            
                public static String jsonIntArr(int... values) {
                    StringBuilder sb = new StringBuilder("[");
                    for (int i = 0; i < values.length; i++) {
                        if (i > 0) sb.append(',');
                        sb.append(values[i]);
                    }
                    return sb.append(']').toString();
                }
            
                public static String toJson(Object v) {
                    if (v == null)            return "null";
                    if (v instanceof Boolean) return v.toString();
                    if (v instanceof Number)  return v.toString();
                    if (v instanceof int[])   return jsonArr((int[]) v);
                    if (v instanceof List)    return jsonArr((List<?>) v);
                    if (v instanceof String) {
                        String s = (String) v;
                        String trimmed = s.trim();
                        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) ||
                            (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
                            return trimmed;
                        }
                        return "\\"" + s.replace("\\\\", "\\\\\\\\")
                                        .replace("\\"", "\\\\\\"") + "\\"";
                    }
                    return "\\"" + v.toString().replace("\\\\", "\\\\\\\\")
                                    .replace("\\"", "\\\\\\"") + "\\"";
                }
            }
            
            """;

        // Final order: all imports first, then Snapshot class, then user code body
        return userImports + helper + userBody;
    }

    private String instrumentCManual(String code) {
        String preamble = """
                #include <stdio.h>
                #include <stdlib.h>
                #include <string.h>
                
                #define _FRAME_BUF_SIZE (8 * 1024 * 1024)  /* 8 MB */
                
                static char  _buf[_FRAME_BUF_SIZE];
                static int   _pos  = 0;
                static int   _first = 1;
                
                /*
                 * snapshot(json_string)
                 * Pass a raw JSON object string.
                 * Example: snapshot("{\\"type\\":\\"array\\",\\"data\\":[1,2,3]}");
                 */
                void snapshot(const char* json_state) {
                    if (!_first) { _buf[_pos++] = ','; }
                    _first = 0;
                    int len = (int)strlen(json_state);
                    if (_pos + len + 32 < _FRAME_BUF_SIZE) {
                        memcpy(_buf + _pos, json_state, len);
                        _pos += len;
                    }
                }
                
                static void _flush_frames(void) {
                    printf("__FRAMES__[%.*s]__END__\\n", _pos, _buf);
                    fflush(stdout);
                }
                
                __attribute__((constructor))
                static void _register_flush(void) { atexit(_flush_frames); }
                
                """;
        return preamble + code;
    }

    private String instrumentCppManual(String code) {
        String preamble = """
            #include <iostream>
            #include <vector>
            #include <string>
            #include <utility>
            #include <cstdlib>
            
            struct J {
                std::string raw;
                J() : raw("null") {}
                J(int v)                { raw = std::to_string(v); }
                J(long v)               { raw = std::to_string(v); }
                J(double v)             { raw = std::to_string(v); }
                J(bool v)               { raw = v ? "true" : "false"; }
                J(const char* v)        { raw = std::string("\\"") + v + "\\""; }
                J(const std::string& v) { raw = "\\"" + v + "\\""; }
                template<typename T>
                J(const std::vector<T>& v) {
                    raw = "[";
                    for (size_t i = 0; i < v.size(); i++) {
                        if (i) raw += ",";
                        raw += J(v[i]).raw;
                    }
                    raw += "]";
                }
            };
            
            static std::string _frames_buf;
            static bool _frames_first = true;
            
            // Overload 1: initializer list — for simple snapshots
            void snapshot(std::initializer_list<std::pair<const char*, J>> fields) {
                std::string s = "{";
                bool first = true;
                for (auto it = fields.begin(); it != fields.end(); ++it) {
                    if (!first) s += ",";
                    s += "\\"" + std::string(it->first) + "\\":" + it->second.raw;
                    first = false;
                }
                s += "}";
                if (!_frames_first) _frames_buf += ",";
                _frames_buf += s;
                _frames_first = false;
            }
            
            // Overload 2: raw const char* — for manually built JSON strings
            void snapshot(const char* rawJson) {
                if (!_frames_first) _frames_buf += ",";
                _frames_buf += rawJson;
                _frames_first = false;
            }
            
            // Overload 3: std::string — same as above but for string variables
            void snapshot(const std::string& rawJson) {
                if (!_frames_first) _frames_buf += ",";
                _frames_buf += rawJson;
                _frames_first = false;
            }
            
            struct _FrameFlusher {
                _FrameFlusher() {
                    atexit([]() {
                        std::cout << "__FRAMES__[" << _frames_buf << "]__END__" << std::endl;
                    });
                }
            };
            static _FrameFlusher _flusher;
            
            """;
        return preamble + code;
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    private void validateRequest(VisualizerRequest request) {
        if (request.getSourceCode() == null || request.getSourceCode().isBlank()) {
            throw new IllegalArgumentException("Source code is required");
        }
        if (request.getLanguage() == null) {
            throw new IllegalArgumentException("Language is required");
        }
        if (!LANG_ID.containsKey(request.getLanguage())) {
            throw new IllegalArgumentException("Unsupported language: " + request.getLanguage());
        }
    }

    private int extractStatusId(Map<?, ?> response) {
        try {
            return (int) ((Map<?, ?>) response.get("status")).get("id");
        } catch (Exception e) {
            return -1;
        }
    }

    private VisualizerResponse error(String message) {
        return VisualizerResponse.builder().error(message).build();
    }

    private String encode(String text) {
        return Base64.getEncoder().encodeToString(text.getBytes());
    }

    private String decode(Object value) {
        if (value == null) return null;
        try {
            String cleaned = value.toString().replaceAll("\\s+", "");
            return new String(Base64.getDecoder().decode(cleaned));
        } catch (Exception e) {
            return value.toString();
        }
    }
}