package com.oj.TDTUOJ.visualizer.service.instrumentor;

import java.util.*;
import java.util.stream.Collectors;

/**
 * AUTO mode: injects _Tracer._line() calls after every meaningful Java statement.
 * MANUAL mode: prepends Snapshot helper class + exposes snapshot() / jsonObj() etc.
 */
public class JavaInstrumentor {

    // ── AUTO ──────────────────────────────────────────────────────────────────

    public static String instrumentAuto(String code) {
        StringBuilder userImports = new StringBuilder();
        StringBuilder userBody    = new StringBuilder();
        for (String line : code.split("\n")) {
            if (line.trim().startsWith("import ")) userImports.append(line).append("\n");
            else                                   userBody.append(line).append("\n");
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
                "            for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(\",\"); sb.append(a[i]); }\n" +
                "            return sb.append(\"]\").toString();\n" +
                "        }\n" +
                "        if (v instanceof List) {\n" +
                "            List<?> l = (List<?>) v;\n" +
                "            StringBuilder sb = new StringBuilder(\"[\");\n" +
                "            for (int i = 0; i < l.size(); i++) { if (i > 0) sb.append(\",\"); sb.append(_toJson(l.get(i))); }\n" +
                "            return sb.append(\"]\").toString();\n" +
                "        }\n" +
                "        return \"\\\"\" + v.toString().replace(\"\\\\\", \"\\\\\\\\\").replace(\"\\\"\", \"\\\\\\\"\") + \"\\\"\";\n" +
                "    }\n" +
                "}\n\n";

        return userImports + helper + transformSource(userBody.toString());
    }

    private static String transformSource(String code) {
        code = BraceNormalizer.addBraces(code);

        String[] lines         = code.split("\n");
        StringBuilder out      = new StringBuilder();
        String currentMethod   = "main";
        List<String> knownVars   = new ArrayList<>();
        List<String> knownVars2d = new ArrayList<>();
        List<String> loopVars    = new ArrayList<>();
        int braceDepth         = 0;
        int loopVarDepth       = -1;
        Map<Integer, Integer> loopHeaderLine = new LinkedHashMap<>();

        java.util.regex.Pattern methodDecl  = java.util.regex.Pattern
                .compile("(?:public|private|protected|static|void|int|long|double|boolean|String|float).*\\(.*\\)\\s*\\{");
        java.util.regex.Pattern varDecl     = java.util.regex.Pattern
                .compile("^\\s*(?:int|long|double|float|boolean|String|char)\\s+(\\w+)");
        java.util.regex.Pattern intArrDecl  = java.util.regex.Pattern
                .compile("^\\s*int\\[\\]\\s+(\\w+)");
        java.util.regex.Pattern int2dArrDecl = java.util.regex.Pattern
                .compile("^\\s*int\\[\\]\\[\\]\\s+(\\w+)");
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

            boolean isLoopOpener = blockOpener.matcher(trimmed).matches() && !trimmed.startsWith("//");

            for (char c : trimmed.toCharArray()) {
                if      (c == '{') braceDepth++;
                else if (c == '}') braceDepth--;
            }

            if (loopVarDepth >= 0 && braceDepth < loopVarDepth) {
                loopVars.clear(); loopVarDepth = -1;
            }
            int fbd = braceDepth;
            loopHeaderLine.entrySet().removeIf(e -> e.getKey() > fbd);

            if (methodDecl.matcher(line).find()) {
                java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\s(\\w+)\\s*\\(").matcher(line);
                if (m.find()) currentMethod = m.group(1);
                knownVars    = new ArrayList<>();
                knownVars2d  = new ArrayList<>();
                loopVars     = new ArrayList<>();
                loopVarDepth = -1;
                loopHeaderLine.clear();
                out.append(line).append("\n");
                continue;
            }

            java.util.regex.Matcher declM    = varDecl.matcher(line);
            java.util.regex.Matcher arrDeclM = intArrDecl.matcher(line);
            java.util.regex.Matcher forInitM = forInitVar.matcher(line);

            if (declM.find()) {
                String vname = declM.group(1);
                if (!forInitM.reset(line).find() && !knownVars.contains(vname)) knownVars.add(vname);
            }
            if (arrDeclM.find()) {
                String vname = arrDeclM.group(1);
                if (!knownVars.contains(vname)) knownVars.add(vname);
            }
            java.util.regex.Matcher arr2dM = int2dArrDecl.matcher(line);
            if (arr2dM.find()) {
                String vname = arr2dM.group(1);
                if (!knownVars2d.contains(vname)) knownVars2d.add(vname);
            }

            forInitM.reset(line);
            if (forInitM.find()) {
                String vname = forInitM.group(1);
                if (!loopVars.contains(vname)) { loopVars.add(vname); loopVarDepth = braceDepth; }
            }

            if (isLoopOpener) loopHeaderLine.put(braceDepth, lineNo);

            out.append(line).append("\n");

            boolean isComment   = trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*");
            boolean isImport    = trimmed.startsWith("import") || trimmed.startsWith("package");
            boolean isBlank     = trimmed.isEmpty();
            boolean isBraceOnly = braceOnly.matcher(trimmed).matches();
            boolean isSemicolon = trimmed.endsWith(";") && !isComment && !isImport && !isBlank;
            boolean isJump      = trimmed.equals("return;") || trimmed.startsWith("return ")
                    || trimmed.equals("break;")  || trimmed.equals("continue;")
                    || trimmed.startsWith("throw ");

            if (isBraceOnly || isJump || (!isSemicolon && !isLoopOpener)) continue;

            List<String> allVars = new ArrayList<>(knownVars);
            for (String lv : loopVars) if (!allVars.contains(lv)) allVars.add(lv);

            emitFrame(out, lineNo, currentMethod, allVars, knownVars2d);

            if (isSemicolon && !loopHeaderLine.isEmpty()) {
                int headerLine = loopHeaderLine.values().stream().reduce((a, b) -> b).orElse(-1);
                if (headerLine > 0 && headerLine != lineNo) emitFrame(out, headerLine, currentMethod, allVars, knownVars2d);
            }
        }
        return out.toString();
    }

    private static void emitFrame(StringBuilder out, int lineNo, String fn,
                                  List<String> allVars, List<String> vars2d) {
        if (allVars.isEmpty()) {
            out.append("try{_Tracer._line(").append(lineNo)
                    .append(",\"").append(fn)
                    .append("\",new String[]{},new Object[]{});}catch(Exception _e){}\n");
        } else {
            String namesArr = allVars.stream().map(v -> "\"" + v + "\"").collect(Collectors.joining(","));
            String valsArr  = allVars.stream().map(v -> "(Object)" + v).collect(Collectors.joining(","));
            out.append("try{_Tracer._line(").append(lineNo)
                    .append(",\"").append(fn)
                    .append("\",new String[]{").append(namesArr)
                    .append("},new Object[]{").append(valsArr)
                    .append("});}catch(Exception _e){}\n");
        }
        for (String vname : vars2d) {
            out.append("try{ StringBuilder _sb=new StringBuilder(\"[\");");
            out.append("for(int _ri=0;_ri<").append(vname).append(".length&&_ri<50;_ri++){");
            out.append("if(_ri>0)_sb.append(\",\");_sb.append(\"[\");");
            out.append("for(int _ci=0;_ci<").append(vname).append("[_ri].length&&_ci<50;_ci++){");
            out.append("if(_ci>0)_sb.append(\",\");_sb.append(").append(vname).append("[_ri][_ci]);}");
            out.append("_sb.append(\"]\");}_sb.append(\"]\");");
            out.append("_Tracer._line(").append(lineNo).append(",\"").append(fn).append("\",");
            out.append("new String[]{\"").append(vname).append("\"},");
            out.append("new Object[]{_sb.toString()});}catch(Exception _e2){}\n");
        }
    }

    // ── MANUAL ────────────────────────────────────────────────────────────────

    public static String instrumentManual(String code) {
        StringBuilder userImports = new StringBuilder();
        StringBuilder userBody    = new StringBuilder();
        for (String line : code.split("\n")) {
            if (line.trim().startsWith("import ")) userImports.append(line).append("\n");
            else                                   userBody.append(line).append("\n");
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
                    for (int i = 0; i < arr.length; i++) { if (i > 0) sb.append(','); sb.append(arr[i]); }
                    return sb.append(']').toString();
                }
            
                public static String jsonArr(List<?> list) {
                    StringBuilder sb = new StringBuilder("[");
                    for (int i = 0; i < list.size(); i++) { if (i > 0) sb.append(','); sb.append(toJson(list.get(i))); }
                    return sb.append(']').toString();
                }
            
                public static String jsonIntArr(int... values) {
                    StringBuilder sb = new StringBuilder("[");
                    for (int i = 0; i < values.length; i++) { if (i > 0) sb.append(','); sb.append(values[i]); }
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
                            (trimmed.startsWith("[") && trimmed.endsWith("]"))) return trimmed;
                        return "\\"" + s.replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"") + "\\"";
                    }
                    return "\\"" + v.toString().replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"") + "\\"";
                }
            }
            
            """;

        return userImports + helper + userBody;
    }

    private JavaInstrumentor() {}
}
