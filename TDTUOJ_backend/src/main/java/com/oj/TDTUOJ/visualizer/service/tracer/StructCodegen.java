package com.oj.TDTUOJ.visualizer.service.tracer;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Shared C/C++ struct discovery + serializer code generation.
 *
 * <p>Neither C nor C++ has reflection, so the only way to visualize a user's
 * {@code struct Node} (and chase its pointers into linked lists / trees) is to
 * GENERATE a serializer for it at instrumentation time. This class finds
 * top-level {@code struct}/{@code class} definitions with a light parser and
 * emits one serializer function per struct.
 *
 * <p>C++ serializers are found via ADL at end-of-TU template instantiation, so
 * they can be appended AFTER the user code. C serializers are dispatched via a
 * generated {@code _Generic} macro instead.
 */
final class StructCodegen {

    /** One field of a struct: its type, name, level of pointer indirection (0/1/2, capped),
     *  and the raw array-size text if it is an array member (else {@code null}). */
    record Member(String type, String name, int pointerDepth, String arraySize) {}

    /** A discovered struct/class and its serializable members. */
    record StructDef(String name, List<Member> members) {}

    private static final Pattern STRUCT_OPEN =
            Pattern.compile("^\\s*(?:typedef\\s+)?(?:struct|class)\\s+(\\w+)\\s*(\\{)?\\s*$|^\\s*(?:typedef\\s+)?(?:struct|class)\\s+(\\w+)\\s*\\{");
    private static final Pattern MEMBER = Pattern.compile(
            "^\\s*((?:struct\\s+)?[\\w:<>,\\s]+?)\\s*([*&\\s]*)\\b(\\w+)\\s*(\\[\\s*(\\w+)\\s*\\])?\\s*(?:=[^;]*)?;\\s*$");

    /** Find top-level struct/class definitions (depth-0 declarations only). */
    static List<StructDef> findStructs(String[] strippedLines) {
        List<StructDef> out = new ArrayList<>();
        int depth = 0;
        for (int i = 0; i < strippedLines.length; i++) {
            String line = strippedLines[i];
            if (depth == 0) {
                Matcher m = STRUCT_OPEN.matcher(line);
                if (m.find()) {
                    String name = m.group(1) != null ? m.group(1) : m.group(3);
                    boolean opened = line.contains("{");
                    int j = i;
                    if (!opened) { // '{' on the next line
                        while (j + 1 < strippedLines.length && !strippedLines[j].contains("{")) j++;
                    }
                    StructDef def = parseBody(strippedLines, j, name);
                    if (def != null && !def.members().isEmpty()) out.add(def);
                }
            }
            depth += count(line, '{') - count(line, '}');
            if (depth < 0) depth = 0;
        }
        return out;
    }

    /** Parse member declarations from the struct body starting at the line holding '{'. */
    private static StructDef parseBody(String[] lines, int openLine, String name) {
        List<Member> members = new ArrayList<>();
        int depth = 0;
        boolean started = false;
        for (int i = openLine; i < lines.length; i++) {
            String line = lines[i];
            int opens = count(line, '{'), closes = count(line, '}');
            if (!started && opens > 0) started = true;
            int before = depth;
            depth += opens - closes;
            if (started && before <= 1 && depth >= 1 && !line.contains("(")) {
                // body-level, not a method — may declare several members: "Node *l, *r;"
                for (String piece : splitDeclarators(line)) {
                    Matcher m = MEMBER.matcher(piece);
                    if (m.matches()) {
                        String type = m.group(1).trim().replaceAll("^struct\\s+", "");
                        if (type.matches("public|private|protected|return|using|typedef|static|const")) continue;
                        // pointer depth = stars anywhere before the member name
                        int ptr = count(piece.substring(0, piece.indexOf(m.group(3))), '*');
                        members.add(new Member(type, m.group(3), Math.min(ptr, 2), m.group(5)));
                    }
                }
            }
            if (started && depth <= 0) break;
        }
        return new StructDef(name, members);
    }

    /** "Node *left, *right;" → ["Node *left;", "Node *right;"] */
    private static List<String> splitDeclarators(String line) {
        List<String> out = new ArrayList<>();
        String t = line.trim();
        if (!t.endsWith(";") || !t.contains(",")) { out.add(t); return out; }
        int lt = 0;
        int split = -1;
        for (int i = 0; i < t.length(); i++) {
            char c = t.charAt(i);
            if (c == '<') lt++;
            else if (c == '>') lt--;
            else if (c == ',' && lt == 0) { split = i; break; }
        }
        if (split == -1) { out.add(t); return out; }
        // type prefix = everything up to the first declarator name
        Matcher m = MEMBER.matcher(t.substring(0, split) + ";");
        if (!m.matches()) { out.add(t); return out; }
        String type = m.group(1).trim();
        out.add(t.substring(0, split) + ";");
        for (String rest : t.substring(split + 1).replace(";", "").split(",")) {
            out.add(type + " " + rest.trim() + ";");
        }
        return out;
    }

    // ── C++ serializer generation ────────────────────────────────────────────

    /** One value-overload + pointer-overloads per struct, ADL-discovered. */
    static String cppSerializers(List<StructDef> structs) {
        StringBuilder sb = new StringBuilder();
        // prototypes first — mutual recursion between structs
        for (StructDef s : structs) {
            sb.append("inline void _viz_enc(const ").append(s.name()).append("& v, _VizCtx& c, int d, std::string& o);\n");
            sb.append("inline void _viz_enc(").append(s.name()).append("* const& p, _VizCtx& c, int d, std::string& o);\n");
            sb.append("inline void _viz_enc(const ").append(s.name()).append("* const& p, _VizCtx& c, int d, std::string& o);\n");
        }
        for (StructDef s : structs) {
            sb.append("inline void _viz_enc(const ").append(s.name()).append("& v, _VizCtx& c, int d, std::string& o) {\n");
            sb.append("  long long _id = c.oid((const void*)&v);\n");
            sb.append("  o += \"\\\"@\"; o += std::to_string(_id); o += '\"';\n");
            sb.append("  if (!c.mark(_id, d)) return;\n");
            sb.append("  std::string e = \"{\\\"type\\\":\\\"object\\\",\\\"class\\\":\\\"")
              .append(s.name()).append("\\\",\\\"fields\\\":{\";\n");
            sb.append("  bool first = true;\n");
            for (Member m : s.members()) {
                if (m.pointerDepth() > 1 || m.arraySize() != null) continue; // beyond v1
                sb.append("  _viz_field(e, first, \"").append(m.name()).append("\", v.")
                  .append(m.name()).append(", c, d);\n");
            }
            sb.append("  e += \"}}\";\n");
            sb.append("  c.entry(_id, e);\n");
            sb.append("}\n");
            sb.append("inline void _viz_enc(").append(s.name())
              .append("* const& p, _VizCtx& c, int d, std::string& o) { if (!p) { o += \"null\"; return; } _viz_enc(*p, c, d, o); }\n");
            sb.append("inline void _viz_enc(const ").append(s.name())
              .append("* const& p, _VizCtx& c, int d, std::string& o) { if (!p) { o += \"null\"; return; } _viz_enc(*p, c, d, o); }\n");
        }
        return sb.toString();
    }

    // ── C serializer generation ──────────────────────────────────────────────

    /** Per-struct C functions + the names needed for the _Generic dispatch macro. */
    static String cSerializers(List<StructDef> structs) {
        StringBuilder sb = new StringBuilder();
        for (StructDef s : structs) {
            sb.append("static void _viz_enc_").append(s.name())
              .append("(const struct ").append(s.name()).append("* p, int d, _VizStr* o);\n");
        }
        for (StructDef s : structs) {
            sb.append("static void _viz_enc_").append(s.name())
              .append("(const struct ").append(s.name()).append("* p, int d, _VizStr* o) {\n");
            sb.append("  if (!p) { _viz_app(o, \"null\"); return; }\n");
            sb.append("  long long _id = _viz_oid((const void*)p);\n");
            sb.append("  _viz_app(o, \"\\\"@\"); _viz_app_ll(o, _id); _viz_app(o, \"\\\"\");\n");
            sb.append("  if (!_viz_mark(_id, d)) return;\n");
            sb.append("  _VizStr e; _viz_init(&e);\n");
            sb.append("  _viz_app(&e, \"{\\\"type\\\":\\\"object\\\",\\\"class\\\":\\\"")
              .append(s.name()).append("\\\",\\\"fields\\\":{\");\n");
            boolean first = true;
            for (Member m : s.members()) {
                if (m.arraySize() != null) continue;
                String sep = first ? "" : "_viz_app(&e, \",\"); ";
                first = false;
                sb.append("  ").append(sep).append("_viz_app(&e, \"\\\"").append(m.name()).append("\\\":\"); ");
                if (m.pointerDepth() == 1 && isStructType(m.type(), structs)) {
                    sb.append("_viz_enc_").append(m.type()).append("(p->").append(m.name()).append(", d + 1, &e);\n");
                } else if (m.pointerDepth() == 0 && isStructType(m.type(), structs)) {
                    sb.append("_viz_enc_").append(m.type()).append("(&p->").append(m.name()).append(", d + 1, &e);\n");
                } else if (m.pointerDepth() == 0 && isFloatType(m.type())) {
                    sb.append("_viz_app_d(&e, (double)p->").append(m.name()).append(");\n");
                } else if (m.pointerDepth() == 0 && isIntType(m.type())) {
                    sb.append("_viz_app_ll(&e, (long long)p->").append(m.name()).append(");\n");
                } else {
                    sb.append("_viz_app(&e, \"\\\"(opaque)\\\"\");\n");
                }
            }
            sb.append("  _viz_app(&e, \"}}\");\n");
            sb.append("  _viz_entry(_id, e.buf);\n");
            sb.append("}\n");
        }
        return sb.toString();
    }

    static boolean isStructType(String type, List<StructDef> structs) {
        return structs.stream().anyMatch(s -> s.name().equals(type));
    }

    static boolean isIntType(String t) {
        return t.matches("(unsigned\\s+)?(int|long|long\\s+long|short|char|size_t|bool|_Bool)");
    }

    static boolean isFloatType(String t) {
        return t.matches("double|float|long\\s+double");
    }

    private static int count(String s, char c) {
        int n = 0;
        for (int i = 0; i < s.length(); i++) if (s.charAt(i) == c) n++;
        return n;
    }
}
