var __viz = (function () {
  var MAXF = 5000, MAXH = 200, MAXE = 1000, MAXS = 256, MAXD = 8, MAXFLD = 64;
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
      process.stderr.write("\n__FRAMES__" + JSON.stringify(frames) + "__END__\n");
    } catch (e) {
      process.stderr.write("\n__FRAMES__[]__END__\n");
    }
  });

  return { snap: snap, enter: enter, exit: exit };
})();

class Node {
  constructor(val) {__viz.enter("constructor");try{
    this.val = val;;__viz.snap(3,{"val":(typeof val==='undefined'?undefined:val)});
    this.left = null;;__viz.snap(4,{"val":(typeof val==='undefined'?undefined:val)});
    this.right = null;;__viz.snap(5,{"val":(typeof val==='undefined'?undefined:val)});
  }finally{__viz.exit();}}
}

function insert(root, val) {__viz.enter("insert");try{
  if (root === null) return new Node(val);;__viz.snap(10,{"root":(typeof root==='undefined'?undefined:root),"val":(typeof val==='undefined'?undefined:val)});
  if (val < root.val) root.left = insert(root.left, val);
  else root.right = insert(root.right, val);;__viz.snap(11,{"root":(typeof root==='undefined'?undefined:root),"val":(typeof val==='undefined'?undefined:val)});
  return root;
}finally{__viz.exit();}}

// 1) array + bubble sort
const arr = [5, 2, 8, 1, 9];;__viz.snap(17,{"arr":(typeof arr==='undefined'?undefined:arr)});
const n = arr.length;;__viz.snap(18,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n)});
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n - 1 - i; j++) {
    if (arr[j] > arr[j + 1]) {
      const t = arr[j];;__viz.snap(22,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"i":(typeof i==='undefined'?undefined:i),"j":(typeof j==='undefined'?undefined:j),"t":(typeof t==='undefined'?undefined:t)}); arr[j] = arr[j + 1];;__viz.snap(22,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"i":(typeof i==='undefined'?undefined:i),"j":(typeof j==='undefined'?undefined:j),"t":(typeof t==='undefined'?undefined:t)}); arr[j + 1] = t;;__viz.snap(22,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"i":(typeof i==='undefined'?undefined:i),"j":(typeof j==='undefined'?undefined:j),"t":(typeof t==='undefined'?undefined:t)});
    };__viz.snap(21,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"i":(typeof i==='undefined'?undefined:i),"j":(typeof j==='undefined'?undefined:j)});
  };__viz.snap(20,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"i":(typeof i==='undefined'?undefined:i),"j":(typeof j==='undefined'?undefined:j)});
};__viz.snap(19,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"i":(typeof i==='undefined'?undefined:i)});

// 2) graph as adjacency matrix + iterative DFS
const g = [
  [0, 1, 1, 0],
  [1, 0, 0, 1],
  [1, 0, 0, 1],
  [0, 1, 1, 0],
];;__viz.snap(28,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"g":(typeof g==='undefined'?undefined:g)});
const visited = [false, false, false, false];;__viz.snap(34,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"g":(typeof g==='undefined'?undefined:g),"visited":(typeof visited==='undefined'?undefined:visited)});
const stack = [0];;__viz.snap(35,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"g":(typeof g==='undefined'?undefined:g),"visited":(typeof visited==='undefined'?undefined:visited),"stack":(typeof stack==='undefined'?undefined:stack)});
const order = [];;__viz.snap(36,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"g":(typeof g==='undefined'?undefined:g),"visited":(typeof visited==='undefined'?undefined:visited),"stack":(typeof stack==='undefined'?undefined:stack),"order":(typeof order==='undefined'?undefined:order)});
while (stack.length > 0) {
  const u = stack.pop();;__viz.snap(38,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"g":(typeof g==='undefined'?undefined:g),"visited":(typeof visited==='undefined'?undefined:visited),"stack":(typeof stack==='undefined'?undefined:stack),"order":(typeof order==='undefined'?undefined:order),"u":(typeof u==='undefined'?undefined:u)});
  if (visited[u]) continue;;__viz.snap(39,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"g":(typeof g==='undefined'?undefined:g),"visited":(typeof visited==='undefined'?undefined:visited),"stack":(typeof stack==='undefined'?undefined:stack),"order":(typeof order==='undefined'?undefined:order),"u":(typeof u==='undefined'?undefined:u)});
  visited[u] = true;;__viz.snap(40,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"g":(typeof g==='undefined'?undefined:g),"visited":(typeof visited==='undefined'?undefined:visited),"stack":(typeof stack==='undefined'?undefined:stack),"order":(typeof order==='undefined'?undefined:order),"u":(typeof u==='undefined'?undefined:u)});
  order.push(u);;__viz.snap(41,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"g":(typeof g==='undefined'?undefined:g),"visited":(typeof visited==='undefined'?undefined:visited),"stack":(typeof stack==='undefined'?undefined:stack),"order":(typeof order==='undefined'?undefined:order),"u":(typeof u==='undefined'?undefined:u)});
  for (let v = 3; v >= 0; v--) {
    if (g[u][v] === 1 && !visited[v]) stack.push(v);;__viz.snap(43,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"g":(typeof g==='undefined'?undefined:g),"visited":(typeof visited==='undefined'?undefined:visited),"stack":(typeof stack==='undefined'?undefined:stack),"order":(typeof order==='undefined'?undefined:order),"u":(typeof u==='undefined'?undefined:u),"v":(typeof v==='undefined'?undefined:v)});
  };__viz.snap(42,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"g":(typeof g==='undefined'?undefined:g),"visited":(typeof visited==='undefined'?undefined:visited),"stack":(typeof stack==='undefined'?undefined:stack),"order":(typeof order==='undefined'?undefined:order),"u":(typeof u==='undefined'?undefined:u),"v":(typeof v==='undefined'?undefined:v)});
};__viz.snap(37,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"g":(typeof g==='undefined'?undefined:g),"visited":(typeof visited==='undefined'?undefined:visited),"stack":(typeof stack==='undefined'?undefined:stack),"order":(typeof order==='undefined'?undefined:order)});

// 3) BST from user class (recursive insert)
let root = null;;__viz.snap(48,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"g":(typeof g==='undefined'?undefined:g),"visited":(typeof visited==='undefined'?undefined:visited),"stack":(typeof stack==='undefined'?undefined:stack),"order":(typeof order==='undefined'?undefined:order),"root":(typeof root==='undefined'?undefined:root)});
for (const v of [4, 2, 6, 1, 3]) {
  root = insert(root, v);;__viz.snap(50,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"g":(typeof g==='undefined'?undefined:g),"visited":(typeof visited==='undefined'?undefined:visited),"stack":(typeof stack==='undefined'?undefined:stack),"order":(typeof order==='undefined'?undefined:order),"root":(typeof root==='undefined'?undefined:root),"v":(typeof v==='undefined'?undefined:v)});
};__viz.snap(49,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"g":(typeof g==='undefined'?undefined:g),"visited":(typeof visited==='undefined'?undefined:visited),"stack":(typeof stack==='undefined'?undefined:stack),"order":(typeof order==='undefined'?undefined:order),"root":(typeof root==='undefined'?undefined:root),"v":(typeof v==='undefined'?undefined:v)});

// 4) Map -> memory-model fallback
const freq = new Map();;__viz.snap(54,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"g":(typeof g==='undefined'?undefined:g),"visited":(typeof visited==='undefined'?undefined:visited),"stack":(typeof stack==='undefined'?undefined:stack),"order":(typeof order==='undefined'?undefined:order),"root":(typeof root==='undefined'?undefined:root),"freq":(typeof freq==='undefined'?undefined:freq)});
for (const x of arr) {
  freq.set(x, (freq.get(x) || 0) + 1);;__viz.snap(56,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"g":(typeof g==='undefined'?undefined:g),"visited":(typeof visited==='undefined'?undefined:visited),"stack":(typeof stack==='undefined'?undefined:stack),"order":(typeof order==='undefined'?undefined:order),"root":(typeof root==='undefined'?undefined:root),"freq":(typeof freq==='undefined'?undefined:freq),"x":(typeof x==='undefined'?undefined:x)});
};__viz.snap(55,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"g":(typeof g==='undefined'?undefined:g),"visited":(typeof visited==='undefined'?undefined:visited),"stack":(typeof stack==='undefined'?undefined:stack),"order":(typeof order==='undefined'?undefined:order),"root":(typeof root==='undefined'?undefined:root),"freq":(typeof freq==='undefined'?undefined:freq),"x":(typeof x==='undefined'?undefined:x)});

console.log(order.join(" "), freq.get(1));;__viz.snap(59,{"arr":(typeof arr==='undefined'?undefined:arr),"n":(typeof n==='undefined'?undefined:n),"g":(typeof g==='undefined'?undefined:g),"visited":(typeof visited==='undefined'?undefined:visited),"stack":(typeof stack==='undefined'?undefined:stack),"order":(typeof order==='undefined'?undefined:order),"root":(typeof root==='undefined'?undefined:root),"freq":(typeof freq==='undefined'?undefined:freq)});
