// tools/infer-test.mjs
import { readFileSync } from "node:fs";

// src/components/visualizer/inference/materialize.js
var REF_RE = /^@\d+$/;
function isRef(v) {
  return typeof v === "string" && REF_RE.test(v);
}
function refId(v) {
  return v.slice(1);
}
function materialize(value, frame, seen = /* @__PURE__ */ new Set()) {
  if (!isRef(value)) return value;
  const id = refId(value);
  const entry = frame?.heap?.[id];
  if (!entry) return value;
  if (seen.has(id)) return { __kind: "cycle", ref: value };
  seen.add(id);
  let out;
  switch (entry.type) {
    case "list":
    case "tuple":
    case "set":
    case "array":
      out = (entry.values ?? []).map((v) => materialize(v, frame, seen));
      break;
    case "dict":
    case "map":
      out = {
        __kind: "dict",
        entries: (entry.entries ?? []).map(([k, v]) => [
          materialize(k, frame, seen),
          materialize(v, frame, seen)
        ])
      };
      break;
    case "object": {
      const fields = {};
      for (const [k, v] of Object.entries(entry.fields ?? {})) {
        fields[k] = materialize(v, frame, seen);
      }
      out = { __kind: "object", class: entry.class, id, fields };
      break;
    }
    default:
      out = { __kind: "opaque", repr: entry.repr ?? String(entry.type) };
  }
  seen.delete(id);
  return out;
}
function isPrimitiveArray(v) {
  return Array.isArray(v) && v.every(isPrimitive);
}
function is2DArray(v) {
  return Array.isArray(v) && v.length > 0 && v.every((row) => Array.isArray(row) && row.every(isPrimitive));
}
function isPrimitive(v) {
  return v === null || typeof v === "number" || typeof v === "boolean" || typeof v === "string" && !isRef(v);
}
function visibleVariables(frame) {
  const stack = frame?.stack ?? [];
  if (stack.length === 0) return {};
  const merged = { ...stack[0].locals };
  if (stack.length > 1) Object.assign(merged, stack[stack.length - 1].locals);
  return merged;
}

// src/components/visualizer/inference/inferShape.js
var LLM_ROLE_TO_KIND = {
  graph: "graph",
  tree: "tree",
  bst: "tree",
  "binary-tree": "tree",
  "linked-list": "linkedlist",
  linkedlist: "linkedlist",
  stack: "stack",
  queue: "queue",
  deque: "queue",
  "dp-table": "matrix",
  matrix: "matrix",
  grid: "matrix",
  board: "matrix",
  array: "array",
  list: "array"
};
var MAX_HISTORY_SAMPLES = 80;
function sampleHistory(frames2, name) {
  if (!frames2?.length) return [];
  const step = Math.max(1, Math.floor(frames2.length / MAX_HISTORY_SAMPLES));
  const out = [];
  for (let i = 0; i < frames2.length; i += step) {
    const vars = visibleVariables(frames2[i]);
    if (!(name in vars)) continue;
    const v = materialize(vars[name], frames2[i]);
    if (isPrimitiveArray(v)) out.push(v);
  }
  return out;
}
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
function behavioralKind(history) {
  let pushBack = 0, popBack = 0, popFront = 0, pushFront = 0, ambiguous = 0, other = 0;
  for (let i = 1; i < history.length; i++) {
    const a = history[i - 1], b = history[i];
    if (arraysEqual(a, b)) continue;
    if (b.length === a.length + 1) {
      const back = arraysEqual(a, b.slice(0, -1));
      const front = arraysEqual(a, b.slice(1));
      if (back && front) ambiguous++;
      else if (back) pushBack++;
      else if (front) pushFront++;
      else other++;
    } else if (a.length === b.length + 1) {
      const back = arraysEqual(b, a.slice(0, -1));
      const front = arraysEqual(b, a.slice(1));
      if (back && front) ambiguous++;
      else if (back) popBack++;
      else if (front) popFront++;
      else other++;
    } else other++;
  }
  const events = pushBack + popBack + popFront + pushFront + ambiguous;
  if (events < 3 || other > events) return null;
  const backOps = pushBack + popBack;
  const frontOps = pushFront + popFront;
  if (backOps > 0 && frontOps === 0 && popBack > 0) return { kind: "stack", orient: "back" };
  if (frontOps > 0 && backOps === 0 && popFront > 0) return { kind: "stack", orient: "front" };
  if (popFront > 0 && pushBack > 0 && popBack === 0 && pushFront === 0) return { kind: "queue" };
  if (popBack > 0 && pushFront > 0 && pushBack === 0 && popFront === 0) return { kind: "queue" };
  if (ambiguous >= 3 && backOps === 0 && frontOps === 0) return { kind: "stack", orient: "back" };
  return null;
}
function stackOrientation(frames2, name) {
  const b = behavioralKind(sampleHistory(frames2, name));
  return b && b.kind === "stack" ? b.orient : "back";
}
function isIntArray(v) {
  return isPrimitiveArray(v) && v.every((x) => Number.isInteger(x) || typeof x === "boolean");
}
function isAdjacencyMatrix(m2) {
  if (!is2DArray(m2)) return false;
  const n = m2.length;
  if (n < 2 || n > 60) return false;
  if (!m2.every((row) => row.length === n)) return false;
  let nonZero = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const v = m2[i][j];
      if (typeof v !== "number" || !Number.isFinite(v)) return false;
      if (i === j && v !== 0) return false;
      if (v !== 0) nonZero++;
    }
  }
  if (nonZero === 0) return false;
  const binary = m2.every((row) => row.every((v) => v === 0 || v === 1));
  return binary || m2.every((row) => row.every((v) => v >= 0 && v < 1e4));
}
function isSymmetric(m2) {
  const n = m2.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) if (m2[i][j] !== m2[j][i]) return false;
  return true;
}
function isAdjacencyList(v) {
  if (!Array.isArray(v) || v.length < 2 || v.length > 200) return false;
  if (!v.every(isIntArray)) return false;
  const n = v.length;
  let edges = 0;
  for (const row of v) {
    for (const x of row) {
      if (typeof x === "boolean" || x < 0 || x >= n) return false;
      edges++;
    }
  }
  const lens = new Set(v.map((r) => r.length));
  return edges > 0 && (lens.size > 1 || v.some((r) => r.length !== n));
}
function analyzeObjectGraph(rootRef, frame) {
  const heap = frame?.heap ?? {};
  const rootEntry = heap[refId(rootRef)];
  if (!rootEntry || rootEntry.type !== "object") return null;
  const cls = rootEntry.class;
  const nodes = /* @__PURE__ */ new Map();
  const queue = [refId(rootRef)];
  const indegree = /* @__PURE__ */ new Map();
  while (queue.length) {
    const id = queue.shift();
    if (nodes.has(id)) continue;
    const e = heap[id];
    if (!e || e.type !== "object" || e.class !== cls) continue;
    nodes.set(id, e);
    if (nodes.size > 500) return null;
    for (const v of Object.values(e.fields ?? {})) {
      if (isRef(v) && heap[refId(v)]?.type === "object" && heap[refId(v)].class === cls) {
        indegree.set(refId(v), (indegree.get(refId(v)) ?? 0) + 1);
        queue.push(refId(v));
      }
    }
  }
  if (nodes.size === 0) return null;
  const refFields = /* @__PURE__ */ new Map();
  for (const e of nodes.values()) {
    for (const [k, v] of Object.entries(e.fields ?? {})) {
      if (isRef(v) && nodes.has(refId(v))) {
        refFields.set(k, (refFields.get(k) ?? 0) + 1);
      } else if (v === null && refFields.has(k)) {
      }
    }
  }
  const fieldNames = /* @__PURE__ */ new Set();
  for (const e of nodes.values())
    for (const k of Object.keys(e.fields ?? {})) fieldNames.add(k);
  const linkNames = [...fieldNames].filter(
    (k) => [...nodes.values()].every((e) => {
      const v = e.fields?.[k];
      return v === null || v === void 0 || isRef(v) && nodes.has(refId(v));
    }) && [...nodes.values()].some((e) => isRef(e.fields?.[k]))
  );
  const valueField = [...fieldNames].find((k) => ["val", "value", "data", "key", "label"].includes(k)) ?? [...fieldNames].find((k) => [...nodes.values()].some((e) => isPrimitive(e.fields?.[k])));
  const acyclic = ![...indegree.values()].some((d) => d > 1) || nodes.size <= 1;
  return { cls, nodes, linkNames, valueField, rootId: refId(rootRef), acyclic, indegree };
}
function inferKind(name, value, frame, frames2) {
  if (isPrimitive(value) && !isRef(value)) return "scalar";
  const entry = frame?.heap?.[isRef(value) ? refId(value) : ""];
  if (!entry) return "scalar";
  if (entry.type === "object") {
    const g = analyzeObjectGraph(value, frame);
    if (g && g.acyclic) {
      const lower = g.linkNames.map((k) => k.toLowerCase());
      const hasLR = lower.includes("left") && lower.includes("right") || g.linkNames.length === 2;
      if (hasLR && g.linkNames.length >= 2) return "tree";
      if (g.linkNames.length === 1) return g.nodes.size > 1 ? "linkedlist" : "memory";
    }
    return "memory";
  }
  if (entry.type === "dict" || entry.type === "map") {
    const m2 = materialize(value, frame);
    const entries = m2.entries ?? [];
    if (entries.length >= 2 && entries.every(([k, v]) => Number.isInteger(k) && isIntArray(v))) {
      const keys = new Set(entries.map(([k]) => k));
      if (entries.every(([, v]) => v.every((x) => keys.has(x)))) return "graph";
    }
    return "memory";
  }
  if (["list", "tuple", "array", "set"].includes(entry.type)) {
    const m2 = materialize(value, frame);
    if (isAdjacencyMatrix(m2)) return "graph";
    if (isAdjacencyList(m2)) return "graph";
    if (isPrimitiveArray(m2)) {
      const behavioral = behavioralKind(sampleHistory(frames2, name));
      if (behavioral) return behavioral.kind;
      return "array";
    }
    if (is2DArray(m2)) return "matrix";
    return "memory";
  }
  return "memory";
}
function classifyVariables(frames2, classifications = {}, overrides = {}) {
  const result = /* @__PURE__ */ new Map();
  if (!frames2?.length) return result;
  const lastSeen = /* @__PURE__ */ new Map();
  for (let i = frames2.length - 1; i >= 0; i--) {
    for (const name of Object.keys(visibleVariables(frames2[i]))) {
      if (!lastSeen.has(name)) lastSeen.set(name, i);
    }
    if (i < frames2.length - 50 && lastSeen.size > 0) break;
  }
  for (const f of frames2.slice(0, 5)) {
    for (const name of Object.keys(visibleVariables(f))) {
      if (!lastSeen.has(name)) lastSeen.set(name, frames2.indexOf(f));
    }
  }
  for (const [name, idx] of lastSeen) {
    const frame = frames2[idx];
    const value = visibleVariables(frame)[name];
    const heuristic = inferKind(name, value, frame, frames2);
    let kind = heuristic;
    let source = "heuristic";
    const llm = classifications?.[name];
    const llmKind = llm && LLM_ROLE_TO_KIND[String(llm.role ?? "").toLowerCase()];
    if (llmKind && (llm.confidence == null || llm.confidence >= 0.7) && heuristic !== "scalar") {
      kind = llmKind;
      source = "llm";
    }
    const userKind = overrides?.[name];
    if (userKind && userKind !== "auto") {
      kind = userKind;
      source = "user";
    }
    result.set(name, { kind, source, llm: llm ?? null, lastFrame: idx });
  }
  return result;
}
function diffIndices(prev, cur) {
  if (!isPrimitiveArray(prev) || !isPrimitiveArray(cur)) return [];
  const out = [];
  const n = Math.max(prev.length, cur.length);
  for (let i = 0; i < n; i++) if (prev[i] !== cur[i]) out.push(i);
  return out.length <= 8 ? out : [];
}
function adjacencyMatrixToGraph(m2) {
  const n = m2.length;
  const symmetric = isSymmetric(m2);
  const nodes = Array.from({ length: n }, (_, i) => ({ id: i }));
  const edges = [];
  for (let i = 0; i < n; i++) {
    for (let j = symmetric ? i + 1 : 0; j < n; j++) {
      if (i === j || m2[i][j] === 0) continue;
      const e = { from: i, to: j, directed: !symmetric };
      if (m2[i][j] !== 1) e.weight = m2[i][j];
      edges.push(e);
    }
  }
  return { type: "graph", nodes, edges };
}
function adjacencyListToGraph(rows) {
  const nodes = rows.map((_, i) => ({ id: i }));
  const edges = [];
  const seen = /* @__PURE__ */ new Set();
  let symmetric = true;
  rows.forEach((row, u) => row.forEach((v) => {
    if (!rows[v]?.includes(u)) symmetric = false;
  }));
  rows.forEach(
    (row, u) => row.forEach((v) => {
      const key = symmetric ? [Math.min(u, v), Math.max(u, v)].join("-") : `${u}-${v}`;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push({ from: u, to: v, directed: !symmetric });
    })
  );
  return { type: "graph", nodes, edges };
}
function dictToGraph(m2) {
  const entries = m2.entries ?? [];
  const nodes = entries.map(([k]) => ({ id: k }));
  const ids = new Set(entries.map(([k]) => k));
  const edges = [];
  const seen = /* @__PURE__ */ new Set();
  let symmetric = true;
  const adj = new Map(entries);
  for (const [u, row] of entries)
    for (const v of row) if (!(adj.get(v) ?? []).includes(u)) symmetric = false;
  for (const [u, row] of entries) {
    for (const v of row) {
      if (!ids.has(v)) continue;
      const key = symmetric ? [Math.min(u, v), Math.max(u, v)].join("-") : `${u}-${v}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: u, to: v, directed: !symmetric });
    }
  }
  return { type: "graph", nodes, edges };
}
function objectGraphToTree(value, frame) {
  const g = analyzeObjectGraph(value, frame);
  if (!g) return null;
  const lower = (s) => s.toLowerCase();
  let leftName = g.linkNames.find((k) => lower(k).includes("left")) ?? g.linkNames[0];
  let rightName = g.linkNames.find((k) => lower(k).includes("right")) ?? g.linkNames.find((k) => k !== leftName);
  const nodes = [...g.nodes.entries()].map(([id, e]) => ({
    id,
    val: g.valueField != null ? e.fields?.[g.valueField] : id,
    left: isRef(e.fields?.[leftName]) ? refId(e.fields[leftName]) : null,
    right: rightName && isRef(e.fields?.[rightName]) ? refId(e.fields[rightName]) : null
  }));
  return { type: "tree", nodes, rootId: g.rootId };
}
function objectGraphToLinkedList(value, frame) {
  const g = analyzeObjectGraph(value, frame);
  if (!g) return null;
  const nextName = g.linkNames.find((k) => k.toLowerCase().includes("next")) ?? g.linkNames[0];
  const nodes = [...g.nodes.entries()].map(([id, e]) => ({
    id,
    val: g.valueField != null ? e.fields?.[g.valueField] : id,
    next: isRef(e.fields?.[nextName]) ? refId(e.fields[nextName]) : null
  }));
  return { type: "linkedlist", nodes };
}
function objectGraphToGraph(value, frame) {
  const g = analyzeObjectGraph(value, frame);
  if (!g) return null;
  const nodes = [...g.nodes.entries()].map(([id, e]) => ({
    id,
    label: String(g.valueField != null ? e.fields?.[g.valueField] : id)
  }));
  const edges = [];
  for (const [id, e] of g.nodes.entries()) {
    for (const v of Object.values(e.fields ?? {})) {
      if (isRef(v) && g.nodes.has(refId(v))) {
        edges.push({ from: id, to: refId(v), directed: true });
      }
    }
  }
  return { type: "graph", nodes, edges };
}
function buildRendererFrame(name, kind, frame, prevFrame, frames2) {
  const value = visibleVariables(frame)[name];
  if (value === void 0) return null;
  const m2 = materialize(value, frame);
  const prevValue = prevFrame ? visibleVariables(prevFrame)[name] : void 0;
  const prevM = prevValue !== void 0 ? materialize(prevValue, prevFrame) : void 0;
  switch (kind) {
    case "array": {
      if (!isPrimitiveArray(m2)) return null;
      return { type: "array", data: m2, highlighted: diffIndices(prevM, m2), label: name };
    }
    case "matrix": {
      if (is2DArray(m2)) return { type: "matrix", data: m2, label: name };
      if (isPrimitiveArray(m2)) return { type: "matrix", data: [m2], label: name };
      return null;
    }
    case "stack": {
      if (!isPrimitiveArray(m2)) return null;
      const headFirst = stackOrientation(frames2, name) === "front";
      const data = headFirst ? [...m2].reverse() : m2;
      const out = { type: "stack", data, label: name };
      if (isPrimitiveArray(prevM) && m2.length === prevM.length + 1) out.pushed = data.length - 1;
      return out;
    }
    case "queue": {
      if (!isPrimitiveArray(m2)) return null;
      const out = { type: "queue", data: m2, label: name };
      if (isPrimitiveArray(prevM) && m2.length === prevM.length + 1) out.enqueued = m2.length - 1;
      return out;
    }
    case "graph": {
      if (isAdjacencyMatrix(m2)) return { ...adjacencyMatrixToGraph(m2), label: name };
      if (isAdjacencyList(m2)) return { ...adjacencyListToGraph(m2), label: name };
      if (m2?.__kind === "dict") return { ...dictToGraph(m2), label: name };
      if (m2?.__kind === "object") {
        const g = objectGraphToGraph(value, frame);
        return g ? { ...g, label: name } : null;
      }
      if (is2DArray(m2)) return { ...adjacencyMatrixToGraph(m2), label: name };
      return null;
    }
    case "tree": {
      if (m2?.__kind !== "object") return null;
      const t = objectGraphToTree(value, frame);
      return t ? { ...t, label: name } : null;
    }
    case "linkedlist": {
      if (m2?.__kind !== "object") return null;
      const l = objectGraphToLinkedList(value, frame);
      return l ? { ...l, label: name } : null;
    }
    default:
      return null;
  }
}

// tools/infer-test.mjs
var raw = readFileSync(process.argv[2], "utf-8");
var m = raw.match(/__FRAMES__([\s\S]*)__END__/);
var frames = JSON.parse(m[1]);
console.log("frames:", frames.length);
var kinds = classifyVariables(frames, {}, {});
for (const [name, info] of kinds) {
  console.log(`${name.padEnd(10)} -> ${info.kind.padEnd(11)} (${info.source})`);
}
var last = frames.length - 2;
for (const [name, info] of kinds) {
  if (["scalar", "memory"].includes(info.kind)) continue;
  const rf = buildRendererFrame(name, info.kind, frames[last], frames[last - 1], frames);
  console.log(`
== ${name} (${info.kind}) ==`);
  console.log(JSON.stringify(rf)?.slice(0, 300));
}
