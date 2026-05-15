package com.oj.TDTUOJ.visualizer.service.instrumentor;

import java.util.*;

/**
 * C / C++ instrumentation.
 * AUTO mode: transforms source to call _Ti/_Td/_Tv helpers per statement.
 * MANUAL mode: prepends snapshot() C buffer + atexit flush.
 *
 * Pass isCpp=true for C++ (enables vector<T> detection via _Tv template).
 */
public class CppInstrumentor {

    // ── AUTO ──────────────────────────────────────────────────────────────────

    public static String instrumentCAuto(String code) {
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

        return preamble + transformCSource(code, false);
    }

    public static String instrumentCppAuto(String code) {
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
                "// _toStr overloads — numeric, string, char*\n" +
                "template<typename T>\n" +
                "static std::string _toStr(const T& v) { return std::to_string(v); }\n" +
                "static std::string _toStr(const std::string& v) { return \"\\\"\" + v + \"\\\"\"; }\n" +
                "static std::string _toStr(const char* v) { return std::string(\"\\\"\")+v+\"\\\"\"; }\n" +
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
                "        s += _toStr(arr[i]);\n" +
                "    }\n" +
                "    s += \"]}}\"\n" +
                ";\n" +
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

        return preamble + transformCSource(code, true);
    }

    // ── shared C/C++ transformer ──────────────────────────────────────────────

    private static String transformCSource(String code, boolean isCpp) {
        code = BraceNormalizer.addBraces(code);

        String[] lines = code.split("\n");
        StringBuilder out = new StringBuilder();
        String currentFn = "main";

        java.util.regex.Pattern intDecl  = java.util.regex.Pattern
                .compile("^\\s*(?:int|long|long long)\\s+(\\w+)\\s*(?:=|;)");
        java.util.regex.Pattern dblDecl  = java.util.regex.Pattern
                .compile("^\\s*(?:double|float)\\s+(\\w+)\\s*(?:=|;)");
        java.util.regex.Pattern vecDecl  = java.util.regex.Pattern
                .compile("^\\s*(?:vector<(?:int|long|long long|double|float|string|char|bool)>)\\s+(\\w+)");
        java.util.regex.Pattern fnDecl   = java.util.regex.Pattern
                .compile("^\\w[\\w\\s*]+\\s+(\\w+)\\s*\\([^)]*\\)\\s*\\{");
        java.util.regex.Pattern loopVar  = java.util.regex.Pattern
                .compile("for\\s*\\(\\s*(?:int|long)\\s+(\\w+)");
        java.util.regex.Pattern loopLine = java.util.regex.Pattern
                .compile("^\\s*(?:for|while)\\b.*\\{\\s*$");

        Map<String, String> vars     = new LinkedHashMap<>();
        Map<String, String> loopVars = new LinkedHashMap<>();
        int braceDepth   = 0;
        int loopVarDepth = -1;
        Map<Integer, Integer> loopHeaderLine = new LinkedHashMap<>();

        for (int i = 0; i < lines.length; i++) {
            String line    = lines[i];
            String trimmed = line.trim();
            int    lineNo  = i + 1;

            boolean isLoopOpener = loopLine.matcher(trimmed).matches() && !trimmed.startsWith("//");

            for (char c : trimmed.toCharArray()) {
                if (c == '{') braceDepth++;
                else if (c == '}') braceDepth--;
            }

            if (loopVarDepth >= 0 && braceDepth < loopVarDepth) {
                loopVars.clear(); loopVarDepth = -1;
            }
            int fbd = braceDepth;
            loopHeaderLine.entrySet().removeIf(e -> e.getKey() > fbd);

            java.util.regex.Matcher fm = fnDecl.matcher(line);
            if (fm.find() && !trimmed.startsWith("//")) {
                currentFn = fm.group(1);
                vars = new LinkedHashMap<>();
                loopVars = new LinkedHashMap<>();
                loopVarDepth = -1;
                loopHeaderLine.clear();
            }

            java.util.regex.Matcher loopCheck = loopVar.matcher(line);
            boolean isForLine = loopCheck.find();

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

            java.util.regex.Matcher lm = loopVar.matcher(line);
            if (lm.find()) {
                String vname = lm.group(1);
                if (!loopVars.containsKey(vname)) { loopVars.put(vname, "i"); loopVarDepth = braceDepth; }
            }

            if (isLoopOpener) loopHeaderLine.put(braceDepth, lineNo);

            out.append(line).append("\n");

            Map<String, String> allVars = new LinkedHashMap<>(vars);
            allVars.putAll(loopVars);

            boolean isComment  = trimmed.startsWith("//") || trimmed.startsWith("/*");
            boolean isPreproc  = trimmed.startsWith("#");
            boolean isSemicolon = trimmed.endsWith(";") && !isComment && !isPreproc;
            boolean isJump     = trimmed.equals("return;") || trimmed.startsWith("return ")
                    || trimmed.equals("break;") || trimmed.equals("continue;")
                    || trimmed.startsWith("throw ");

            if (isSemicolon && !isJump && !allVars.isEmpty()) {
                emitFrame(out, lineNo, currentFn, allVars, isCpp);
                if (!loopHeaderLine.isEmpty()) {
                    int loopLn = loopHeaderLine.values().stream().reduce((a, b) -> b).orElse(-1);
                    if (loopLn > 0) emitFrame(out, loopLn, currentFn, allVars, isCpp);
                }
            }

            if (isLoopOpener && !allVars.isEmpty()) emitFrame(out, lineNo, currentFn, allVars, isCpp);
        }
        return out.toString();
    }

    private static void emitFrame(StringBuilder out, int lineNo, String fn,
                                  Map<String, String> allVars, boolean isCpp) {
        List<String> scalarVars = new ArrayList<>();
        List<String> vecVars    = new ArrayList<>();
        for (Map.Entry<String, String> e : allVars.entrySet()) {
            if (e.getValue().equals("v")) vecVars.add(e.getKey());
            else                          scalarVars.add(e.getKey());
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
                if (vtype.equals("i")) out.append("%lld\",(long long)").append(vname);
                else                   out.append("%g\",(double)").append(vname);
                out.append("); _ls+=_t; }\n");
            }

            for (String vname : vecVars) {
                out.append("    { if(!_lf)_ls+=\",\"; _lf=false;")
                        .append(" _ls+=\"\\\"\" + std::string(\"").append(vname).append("\") + \"\\\":[\";\n");
                out.append("      for(size_t _vi=0;_vi<").append(vname)
                        .append(".size()&&_vi<200;_vi++){")
                        .append("if(_vi)_ls+=\",\";")
                        .append("_ls+=_toStr(").append(vname).append("[_vi]);}\n");
                out.append("      _ls+=\"]\"; }\n");
            }

            out.append("    _ls += \"}\";\n");
            out.append("    std::string _f = \"{\\\"line\\\":");
            out.append(lineNo);
            out.append(",\\\"function\\\":\\\"");
            out.append(fn);
            out.append("\\\",\\\"event\\\":\\\"line\\\",\\\"locals\\\":\"+_ls+\"}\";\n");
            out.append("    if(!_ffirst)_fbuf+=',';\n");
            out.append("    _fbuf+=_f; _ffirst=false;\n");
            out.append("}\n");

        } else {
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

    // ── MANUAL ────────────────────────────────────────────────────────────────

    public static String instrumentCManual(String code) {
        String preamble = """
                #include <stdio.h>
                #include <stdlib.h>
                #include <string.h>
                
                #define _FRAME_BUF_SIZE (8 * 1024 * 1024)
                
                static char  _buf[_FRAME_BUF_SIZE];
                static int   _pos  = 0;
                static int   _first = 1;
                
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

    public static String instrumentCppManual(String code) {
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
            
            void snapshot(const char* rawJson) {
                if (!_frames_first) _frames_buf += ",";
                _frames_buf += rawJson;
                _frames_first = false;
            }
            
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

    private CppInstrumentor() {}
}
