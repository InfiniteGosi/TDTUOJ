using System;
using System.Collections.Generic;

class Node {
    public int Val;
    public Node Left, Right;
    public Node(int val) { Val = val; }
}

class Program {
    static Node Insert(Node root, int val) { __Viz.Enter("Insert"); try {
        if (root == null) return new Node(val); __Viz.Snap(12, new string[]{"root","val"}, new object[]{root,val});
        if (val < root.Val) root.Left = Insert(root.Left, val);
        else root.Right = Insert(root.Right, val); __Viz.Snap(14, new string[]{"root","val"}, new object[]{root,val});
        return root;
    } finally { __Viz.Exit(); } }

    static void Main() { __Viz.Enter("Main"); try {
        int[] arr = {5, 2, 8, 1, 9}; __Viz.Snap(19, new string[]{"arr"}, new object[]{arr});
        int n = arr.Length; __Viz.Snap(20, new string[]{"arr","n"}, new object[]{arr,n});
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n - 1 - i; j++) {
                if (arr[j] > arr[j + 1]) {
                    int t = arr[j]; arr[j] = arr[j + 1]; arr[j + 1] = t; __Viz.Snap(24, new string[]{"arr","n","i","j","t"}, new object[]{arr,n,i,j,t});
                }
            }
        }

        int[][] g = {
            new[] {0, 1, 1, 0},
            new[] {1, 0, 0, 1},
            new[] {1, 0, 0, 1},
            new[] {0, 1, 1, 0},
        };
        bool[] visited = new bool[4]; __Viz.Snap(35, new string[]{"arr","n","g","visited"}, new object[]{arr,n,g,visited});
        var stack = new Stack<int>(); __Viz.Snap(36, new string[]{"arr","n","g","visited","stack"}, new object[]{arr,n,g,visited,stack});
        var order = new List<int>(); __Viz.Snap(37, new string[]{"arr","n","g","visited","stack","order"}, new object[]{arr,n,g,visited,stack,order});
        stack.Push(0); __Viz.Snap(38, new string[]{"arr","n","g","visited","stack","order"}, new object[]{arr,n,g,visited,stack,order});
        while (stack.Count > 0) {
            int u = stack.Pop(); __Viz.Snap(40, new string[]{"arr","n","g","visited","stack","order","u"}, new object[]{arr,n,g,visited,stack,order,u});
            if (visited[u]) continue; __Viz.Snap(41, new string[]{"arr","n","g","visited","stack","order","u"}, new object[]{arr,n,g,visited,stack,order,u});
            visited[u] = true; __Viz.Snap(42, new string[]{"arr","n","g","visited","stack","order","u"}, new object[]{arr,n,g,visited,stack,order,u});
            order.Add(u); __Viz.Snap(43, new string[]{"arr","n","g","visited","stack","order","u"}, new object[]{arr,n,g,visited,stack,order,u});
            for (int v = 3; v >= 0; v--) {
                if (g[u][v] == 1 && !visited[v]) stack.Push(v); __Viz.Snap(45, new string[]{"arr","n","g","visited","stack","order","u","v"}, new object[]{arr,n,g,visited,stack,order,u,v});
            }
        }

        Node root = null; __Viz.Snap(49, new string[]{"arr","n","g","visited","stack","order","root"}, new object[]{arr,n,g,visited,stack,order,root});
        foreach (int v in new[] {4, 2, 6, 1, 3}) {
            root = Insert(root, v); __Viz.Snap(51, new string[]{"arr","n","g","visited","stack","order","root","v"}, new object[]{arr,n,g,visited,stack,order,root,v});
        }

        var freq = new Dictionary<int, int>(); __Viz.Snap(54, new string[]{"arr","n","g","visited","stack","order","root","freq"}, new object[]{arr,n,g,visited,stack,order,root,freq});
        foreach (int x in arr) {
            if (freq.ContainsKey(x)) freq[x] = freq[x] + 1;
            else freq[x] = 1; __Viz.Snap(57, new string[]{"arr","n","g","visited","stack","order","root","freq","x"}, new object[]{arr,n,g,visited,stack,order,root,freq,x});
        }

        Console.WriteLine(string.Join(" ", order) + " " + freq[1]); __Viz.Snap(60, new string[]{"arr","n","g","visited","stack","order","root","freq"}, new object[]{arr,n,g,visited,stack,order,root,freq});
    } finally { __Viz.Exit(); } }
}


static class __Viz {
    const int MAXF = 5000, MAXH = 200, MAXE = 1000, MAXS = 256, MAXD = 8, MAXFLD = 64;
    static readonly System.Collections.Generic.List<string> frames = new System.Collections.Generic.List<string>();
    static readonly System.Collections.Generic.Dictionary<object, int> ids =
        new System.Collections.Generic.Dictionary<object, int>(new RefCmp());
    static int nextId = 1;
    static int step = 0;
    static bool done = false;
    static bool flushed = false;

    sealed class RefCmp : System.Collections.Generic.IEqualityComparer<object> {
        public new bool Equals(object a, object b) { return ReferenceEquals(a, b); }
        public int GetHashCode(object o) { return System.Runtime.CompilerServices.RuntimeHelpers.GetHashCode(o); }
    }

    sealed class Fr {
        public string Fn; public string[] Names = new string[0]; public object[] Vals = new object[0]; public int Line;
        public Fr(string fn) { Fn = fn; }
    }
    static readonly System.Collections.Generic.List<Fr> stack = new System.Collections.Generic.List<Fr>();

    sealed class CountingWriter : System.IO.TextWriter {
        readonly System.IO.TextWriter real;
        public long Count;
        public CountingWriter(System.IO.TextWriter r) { real = r; }
        public override System.Text.Encoding Encoding { get { return real.Encoding; } }
        public override void Write(char c) { Count++; real.Write(c); }
        public override void Write(string s) { if (s != null) Count += s.Length; real.Write(s); }
        public override void WriteLine(string s) { Count += (s == null ? 0 : s.Length) + 1; real.WriteLine(s); }
        public override void Flush() { real.Flush(); }
    }
    static readonly CountingWriter outWriter;

    static __Viz() {
        outWriter = new CountingWriter(System.Console.Out);
        System.Console.SetOut(outWriter);
        System.AppDomain.CurrentDomain.ProcessExit += delegate { Flush(); };
        System.AppDomain.CurrentDomain.UnhandledException += delegate { Flush(); };
    }

    public static void Enter(string fn) { stack.Add(new Fr(fn)); }
    public static void Exit() {
        if (stack.Count > 0) stack.RemoveAt(stack.Count - 1);
        if (stack.Count == 0) Flush();
    }

    public static void Snap(int line, string[] names, object[] vals) {
        if (done) return;
        if (frames.Count >= MAXF) {
            done = true;
            frames.Add("{\"step\":" + (++step) + ",\"truncated\":true}");
            return;
        }
        if (stack.Count == 0) stack.Add(new Fr("Main"));
        Fr top = stack[stack.Count - 1];
        top.Names = names; top.Vals = vals; top.Line = line;

        var heap = new System.Text.StringBuilder();
        var seen = new System.Collections.Generic.HashSet<int>();
        int heapCount = 0;
        var stk = new System.Text.StringBuilder();
        foreach (Fr f in stack) {
            if (stk.Length > 0) stk.Append(',');
            stk.Append("{\"function\":\"").Append(Esc(f.Fn))
               .Append("\",\"line\":").Append(f.Line == 0 ? line : f.Line)
               .Append(",\"locals\":{");
            for (int i = 0; i < f.Names.Length; i++) {
                if (i > 0) stk.Append(',');
                stk.Append('"').Append(Esc(f.Names[i])).Append("\":");
                Enc(f.Vals[i], heap, seen, ref heapCount, 0, stk);
            }
            stk.Append("}}");
        }
        var frame = new System.Text.StringBuilder();
        frame.Append("{\"step\":").Append(++step)
             .Append(",\"line\":").Append(line)
             .Append(",\"event\":\"line\"")
             .Append(",\"out_len\":").Append(outWriter.Count)
             .Append(",\"stack\":[").Append(stk).Append(']')
             .Append(",\"heap\":{").Append(heap).Append("}}");
        frames.Add(frame.ToString());
    }

    static int Oid(object o) {
        int v;
        if (!ids.TryGetValue(o, out v)) { v = nextId++; ids[o] = v; }
        return v;
    }

    static void Enc(object v, System.Text.StringBuilder heap,
                    System.Collections.Generic.HashSet<int> seen,
                    ref int heapCount, int depth, System.Text.StringBuilder o) {
        if (v == null) { o.Append("null"); return; }
        if (v is bool) { o.Append(((bool) v) ? "true" : "false"); return; }
        if (v is int || v is long || v is short || v is byte || v is sbyte || v is uint || v is ulong || v is ushort) {
            o.Append(System.Convert.ToString(v, System.Globalization.CultureInfo.InvariantCulture)); return;
        }
        if (v is double || v is float || v is decimal) {
            double d = System.Convert.ToDouble(v, System.Globalization.CultureInfo.InvariantCulture);
            if (double.IsNaN(d) || double.IsInfinity(d)) { o.Append('"').Append(d).Append('"'); }
            else o.Append(d.ToString("R", System.Globalization.CultureInfo.InvariantCulture));
            return;
        }
        if (v is char) { o.Append('"').Append(Esc(v.ToString())).Append('"'); return; }
        if (v is string) {
            string s = (string) v;
            if (s.Length > MAXS) s = s.Substring(0, MAXS) + "...";
            o.Append('"').Append(Esc(s)).Append('"');
            return;
        }
        if (v is System.Enum) { o.Append('"').Append(Esc(v.ToString())).Append('"'); return; }

        int id = Oid(v);
        o.Append("\"@").Append(id).Append('"');
        if (!seen.Add(id)) return;
        if (heapCount >= MAXH || depth >= MAXD) {
            HeapEntry(heap, ref heapCount, id, "{\"type\":\"opaque\",\"repr\":\"(deep)\",\"truncated\":true}");
            return;
        }
        var e = new System.Text.StringBuilder();
        var arr = v as System.Array;
        if (arr != null && arr.Rank == 1) {
            e.Append("{\"type\":\"list\",\"values\":[");
            int n = arr.Length;
            for (int i = 0; i < n && i < MAXE; i++) {
                if (i > 0) e.Append(',');
                Enc(arr.GetValue(i), heap, seen, ref heapCount, depth + 1, e);
            }
            e.Append(']');
            if (n > MAXE) e.Append(",\"truncated\":true");
            e.Append('}');
        } else if (arr != null && arr.Rank == 2) {
            // rectangular int[,] etc. → list of row lists
            e.Append("{\"type\":\"list\",\"values\":[");
            int rows = arr.GetLength(0), cols = arr.GetLength(1);
            for (int r = 0; r < rows && r < MAXE; r++) {
                if (r > 0) e.Append(',');
                int rowId = nextId++;
                e.Append("\"@").Append(rowId).Append('"');
                var row = new System.Text.StringBuilder();
                row.Append("{\"type\":\"list\",\"values\":[");
                for (int c = 0; c < cols && c < MAXE; c++) {
                    if (c > 0) row.Append(',');
                    Enc(arr.GetValue(r, c), heap, seen, ref heapCount, depth + 2, row);
                }
                row.Append("]}");
                HeapEntry(heap, ref heapCount, rowId, row.ToString());
            }
            e.Append("]}");
        } else if (v is System.Collections.IDictionary) {
            var m = (System.Collections.IDictionary) v;
            e.Append("{\"type\":\"dict\",\"entries\":[");
            int i = 0;
            foreach (System.Collections.DictionaryEntry en in m) {
                if (i >= MAXE) break;
                if (i++ > 0) e.Append(',');
                e.Append('[');
                Enc(en.Key, heap, seen, ref heapCount, depth + 1, e);
                e.Append(',');
                Enc(en.Value, heap, seen, ref heapCount, depth + 1, e);
                e.Append(']');
            }
            e.Append(']');
            if (m.Count > MAXE) e.Append(",\"truncated\":true");
            e.Append('}');
        } else if (v is System.Collections.IEnumerable) {
            string kind = "list";
            string tn = v.GetType().Name;
            if (tn.StartsWith("HashSet") || tn.StartsWith("SortedSet")) kind = "set";
            e.Append("{\"type\":\"").Append(kind).Append("\",\"values\":[");
            int i = 0;
            foreach (object x in (System.Collections.IEnumerable) v) {
                if (i >= MAXE) break;
                if (i++ > 0) e.Append(',');
                Enc(x, heap, seen, ref heapCount, depth + 1, e);
            }
            e.Append("]}");
        } else {
            e.Append("{\"type\":\"object\",\"class\":\"").Append(Esc(v.GetType().Name))
             .Append("\",\"fields\":{");
            int cnt = 0;
            var t = v.GetType();
            while (t != null && t != typeof(object)) {
                var fields = t.GetFields(System.Reflection.BindingFlags.Public
                    | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance
                    | System.Reflection.BindingFlags.DeclaredOnly);
                foreach (var fl in fields) {
                    if (cnt >= MAXFLD) break;
                    if (fl.Name.IndexOf('<') >= 0) continue; // auto-property backing fields: <X>k__BackingField → use prop name
                    object fv;
                    try { fv = fl.GetValue(v); } catch (System.Exception) { continue; }
                    if (cnt++ > 0) e.Append(',');
                    e.Append('"').Append(Esc(fl.Name)).Append("\":");
                    Enc(fv, heap, seen, ref heapCount, depth + 1, e);
                }
                t = t.BaseType;
            }
            // surface auto-properties under their property names
            var props = v.GetType().GetProperties(System.Reflection.BindingFlags.Public
                | System.Reflection.BindingFlags.Instance);
            foreach (var pr in props) {
                if (cnt >= MAXFLD) break;
                if (!pr.CanRead || pr.GetIndexParameters().Length > 0) continue;
                var getter = pr.GetGetMethod(true);
                if (getter == null || !IsAutoProperty(v.GetType(), pr.Name)) continue;
                object pv;
                try { pv = pr.GetValue(v, null); } catch (System.Exception) { continue; }
                if (cnt++ > 0) e.Append(',');
                e.Append('"').Append(Esc(pr.Name)).Append("\":");
                Enc(pv, heap, seen, ref heapCount, depth + 1, e);
            }
            e.Append("}}");
        }
        HeapEntry(heap, ref heapCount, id, e.ToString());
    }

    static bool IsAutoProperty(System.Type t, string name) {
        while (t != null) {
            if (t.GetField("<" + name + ">k__BackingField",
                    System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance) != null)
                return true;
            t = t.BaseType;
        }
        return false;
    }

    static void HeapEntry(System.Text.StringBuilder heap, ref int heapCount, int id, string json) {
        if (heap.Length > 0) heap.Append(',');
        heap.Append('"').Append(id).Append("\":").Append(json);
        heapCount++;
    }

    static string Esc(string s) {
        var b = new System.Text.StringBuilder();
        foreach (char c in s) {
            if (c == '"') b.Append("\\\"");
            else if (c == '\\') b.Append("\\\\");
            else if (c == '\n') b.Append("\\n");
            else if (c == '\r') b.Append("\\r");
            else if (c == '\t') b.Append("\\t");
            else if (c < (char) 0x20) b.Append("\\u").Append(((int) c).ToString("x4"));
            else b.Append(c);
        }
        return b.ToString();
    }

    public static void Flush() {
        if (flushed) return;
        flushed = true;
        done = true;
        var sb = new System.Text.StringBuilder("\n__FRAMES__[");
        for (int i = 0; i < frames.Count; i++) {
            if (i > 0) sb.Append(',');
            sb.Append(frames[i]);
        }
        sb.Append("]__END__\n");
        System.Console.Error.Write(sb.ToString());
        System.Console.Error.Flush();
    }
}
