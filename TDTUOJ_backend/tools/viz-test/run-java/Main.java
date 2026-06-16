import java.util.*;

public class Main {

    static class Node {

        int val;

        Node left, right;

        Node(int val) {
            __Viz.enter("Node");
            try {
                this.val = val;
                __Viz.snap(7, new String[] { "val" }, new Object[] { val });
            } finally {
                __Viz.exit();
            }
        }
    }

    static Node insert(Node root, int val) {
        __Viz.enter("insert");
        try {
            if (root == null) {
                return new Node(val);
            }
            __Viz.snap(11, new String[] { "root", "val" }, new Object[] { root, val });
            if (val < root.val) {
                root.left = insert(root.left, val);
                __Viz.snap(12, new String[] { "root", "val" }, new Object[] { root, val });
            } else {
                root.right = insert(root.right, val);
                __Viz.snap(13, new String[] { "root", "val" }, new Object[] { root, val });
            }
            __Viz.snap(12, new String[] { "root", "val" }, new Object[] { root, val });
            return root;
        } finally {
            __Viz.exit();
        }
    }

    public static void main(String[] args) {
        __Viz.enter("main");
        try {
            int[] arr = { 5, 2, 8, 1, 9 };
            __Viz.snap(18, new String[] { "args", "arr" }, new Object[] { args, arr });
            int n = arr.length;
            __Viz.snap(19, new String[] { "args", "arr", "n" }, new Object[] { args, arr, n });
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n - 1 - i; j++) {
                    if (arr[j] > arr[j + 1]) {
                        int t = arr[j];
                        __Viz.snap(23, new String[] { "args", "arr", "n", "i", "j", "t" }, new Object[] { args, arr, n, i, j, t });
                        arr[j] = arr[j + 1];
                        __Viz.snap(23, new String[] { "args", "arr", "n", "i", "j", "t" }, new Object[] { args, arr, n, i, j, t });
                        arr[j + 1] = t;
                        __Viz.snap(23, new String[] { "args", "arr", "n", "i", "j", "t" }, new Object[] { args, arr, n, i, j, t });
                    }
                    __Viz.snap(22, new String[] { "args", "arr", "n", "i", "j" }, new Object[] { args, arr, n, i, j });
                }
                __Viz.snap(21, new String[] { "args", "arr", "n", "i" }, new Object[] { args, arr, n, i });
            }
            __Viz.snap(20, new String[] { "args", "arr", "n" }, new Object[] { args, arr, n });
            int[][] g = { { 0, 1, 1, 0 }, { 1, 0, 0, 1 }, { 1, 0, 0, 1 }, { 0, 1, 1, 0 } };
            __Viz.snap(28, new String[] { "args", "arr", "n", "g" }, new Object[] { args, arr, n, g });
            boolean[] visited = new boolean[4];
            __Viz.snap(34, new String[] { "args", "arr", "n", "g", "visited" }, new Object[] { args, arr, n, g, visited });
            Deque<Integer> stack = new ArrayDeque<>();
            __Viz.snap(35, new String[] { "args", "arr", "n", "g", "visited", "stack" }, new Object[] { args, arr, n, g, visited, stack });
            List<Integer> order = new ArrayList<>();
            __Viz.snap(36, new String[] { "args", "arr", "n", "g", "visited", "stack", "order" }, new Object[] { args, arr, n, g, visited, stack, order });
            stack.push(0);
            __Viz.snap(37, new String[] { "args", "arr", "n", "g", "visited", "stack", "order" }, new Object[] { args, arr, n, g, visited, stack, order });
            while (!stack.isEmpty()) {
                int u = stack.pop();
                __Viz.snap(39, new String[] { "args", "arr", "n", "g", "visited", "stack", "order", "u" }, new Object[] { args, arr, n, g, visited, stack, order, u });
                if (visited[u]) {
                    continue;
                }
                __Viz.snap(40, new String[] { "args", "arr", "n", "g", "visited", "stack", "order", "u" }, new Object[] { args, arr, n, g, visited, stack, order, u });
                visited[u] = true;
                __Viz.snap(41, new String[] { "args", "arr", "n", "g", "visited", "stack", "order", "u" }, new Object[] { args, arr, n, g, visited, stack, order, u });
                order.add(u);
                __Viz.snap(42, new String[] { "args", "arr", "n", "g", "visited", "stack", "order", "u" }, new Object[] { args, arr, n, g, visited, stack, order, u });
                for (int v = 3; v >= 0; v--) {
                    if (g[u][v] == 1 && !visited[v]) {
                        stack.push(v);
                        __Viz.snap(44, new String[] { "args", "arr", "n", "g", "visited", "stack", "order", "u", "v" }, new Object[] { args, arr, n, g, visited, stack, order, u, v });
                    }
                    __Viz.snap(44, new String[] { "args", "arr", "n", "g", "visited", "stack", "order", "u", "v" }, new Object[] { args, arr, n, g, visited, stack, order, u, v });
                }
                __Viz.snap(43, new String[] { "args", "arr", "n", "g", "visited", "stack", "order", "u" }, new Object[] { args, arr, n, g, visited, stack, order, u });
            }
            __Viz.snap(38, new String[] { "args", "arr", "n", "g", "visited", "stack", "order" }, new Object[] { args, arr, n, g, visited, stack, order });
            Node root = null;
            __Viz.snap(48, new String[] { "args", "arr", "n", "g", "visited", "stack", "order", "root" }, new Object[] { args, arr, n, g, visited, stack, order, root });
            for (int v : new int[] { 4, 2, 6, 1, 3 }) {
                root = insert(root, v);
                __Viz.snap(50, new String[] { "args", "arr", "n", "g", "visited", "stack", "order", "root", "v" }, new Object[] { args, arr, n, g, visited, stack, order, root, v });
            }
            __Viz.snap(49, new String[] { "args", "arr", "n", "g", "visited", "stack", "order", "root" }, new Object[] { args, arr, n, g, visited, stack, order, root });
            Map<Integer, Integer> freq = new HashMap<>();
            __Viz.snap(53, new String[] { "args", "arr", "n", "g", "visited", "stack", "order", "root", "freq" }, new Object[] { args, arr, n, g, visited, stack, order, root, freq });
            for (int x : arr) {
                freq.merge(x, 1, Integer::sum);
                __Viz.snap(55, new String[] { "args", "arr", "n", "g", "visited", "stack", "order", "root", "freq", "x" }, new Object[] { args, arr, n, g, visited, stack, order, root, freq, x });
            }
            __Viz.snap(54, new String[] { "args", "arr", "n", "g", "visited", "stack", "order", "root", "freq" }, new Object[] { args, arr, n, g, visited, stack, order, root, freq });
            System.out.println(order + " " + freq.get(1));
            __Viz.snap(58, new String[] { "args", "arr", "n", "g", "visited", "stack", "order", "root", "freq" }, new Object[] { args, arr, n, g, visited, stack, order, root, freq });
        } finally {
            __Viz.exit();
        }
    }
}

class __Viz {
    private static final int MAXF = 5000, MAXH = 200, MAXE = 1000, MAXS = 256, MAXD = 8, MAXFLD = 64;
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
            frames.add("{\"step\":" + (++step) + ",\"truncated\":true}");
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
            stk.append("{\"function\":\"").append(esc(f.fn))
               .append("\",\"line\":").append(f.line == 0 ? line : f.line)
               .append(",\"locals\":{");
            for (int i = 0; i < f.names.length; i++) {
                if (i > 0) stk.append(',');
                stk.append('"').append(esc(f.names[i])).append("\":");
                enc(f.vals[i], heap, seen, heapCount, 0, stk);
            }
            stk.append("}}");
        }
        StringBuilder frame = new StringBuilder();
        frame.append("{\"step\":").append(++step)
             .append(",\"line\":").append(line)
             .append(",\"event\":\"line\"")
             .append(",\"out_len\":").append(outLen)
             .append(",\"stack\":[").append(stk).append(']')
             .append(",\"heap\":{").append(heap).append("}}");
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
        out.append("\"@").append(id).append('"');
        if (!seen.add(id)) return;
        if (heapCount[0] >= MAXH || depth >= MAXD) {
            heapEntry(heap, heapCount, id, "{\"type\":\"opaque\",\"repr\":\"(deep)\",\"truncated\":true}");
            return;
        }
        StringBuilder e = new StringBuilder();
        if (v.getClass().isArray()) {
            int n = java.lang.reflect.Array.getLength(v);
            e.append("{\"type\":\"list\",\"values\":[");
            for (int i = 0; i < n && i < MAXE; i++) {
                if (i > 0) e.append(',');
                enc(java.lang.reflect.Array.get(v, i), heap, seen, heapCount, depth + 1, e);
            }
            e.append(']');
            if (n > MAXE) e.append(",\"truncated\":true");
            e.append('}');
        } else if (v instanceof java.util.Map) {
            java.util.Map<?, ?> m = (java.util.Map<?, ?>) v;
            e.append("{\"type\":\"dict\",\"entries\":[");
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
            if (m.size() > MAXE) e.append(",\"truncated\":true");
            e.append('}');
        } else if (v instanceof java.util.Collection) {
            java.util.Collection<?> c = (java.util.Collection<?>) v;
            e.append("{\"type\":\"").append(v instanceof java.util.Set ? "set" : "list").append("\",\"values\":[");
            int i = 0;
            for (Object x : c) {
                if (i >= MAXE) break;
                if (i++ > 0) e.append(',');
                enc(x, heap, seen, heapCount, depth + 1, e);
            }
            e.append(']');
            if (c.size() > MAXE) e.append(",\"truncated\":true");
            e.append('}');
        } else {
            e.append("{\"type\":\"object\",\"class\":\"").append(esc(v.getClass().getSimpleName()))
             .append("\",\"fields\":{");
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
                    e.append('"').append(esc(fl.getName())).append("\":");
                    enc(fv, heap, seen, heapCount, depth + 1, e);
                }
            }
            e.append("}}");
        }
        heapEntry(heap, heapCount, id, e.toString());
    }

    private static void heapEntry(StringBuilder heap, int[] heapCount, int id, String json) {
        if (heap.length() > 0) heap.append(',');
        heap.append('"').append(id).append("\":").append(json);
        heapCount[0]++;
    }

    private static String esc(String s) {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '"') b.append("\\\"");
            else if (c == '\\') b.append("\\\\");
            else if (c == '\n') b.append("\\n");
            else if (c == '\r') b.append("\\r");
            else if (c == '\t') b.append("\\t");
            else if (c < 0x20) b.append(String.format("\\u%04x", (int) c));
            else b.append(c);
        }
        return b.toString();
    }

    static void flush() {
        done = true;
        StringBuilder sb = new StringBuilder("\n__FRAMES__[");
        for (int i = 0; i < frames.size(); i++) {
            if (i > 0) sb.append(',');
            sb.append(frames.get(i));
        }
        sb.append("]__END__\n");
        System.err.print(sb);
        System.err.flush();
    }
}
