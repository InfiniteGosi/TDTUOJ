// src/components/visualizer/inference/inferShape.js
// Layer 2a — heuristic shape inference. Decides what each variable *is*
// (graph, tree, stack…) from runtime data, never from source text.
//
// Precedence (applied in classifyVariables):
//   user "view as" override  >  LLM label (confidence ≥ 0.7)  >  heuristic rule
//
// Rules (first match wins) — see VISUALIZER-REFACTOR-PLAN.md §5.1:
//   1 object graph w/ two self-refs (left/right)        → tree
//   2 object chain w/ one self-ref (next)               → linkedlist
//   3 N×N 0/1 (or small-weight, zero-diagonal) matrix   → graph (adj. matrix)
//   4 list/dict of int-lists with values < N            → graph (adj. list)
//   5 list of [u,v]/[u,v,w] int pairs, reused small ids → graph (edge list)
//   7 1D list mutated only at the tail across frames    → stack   (behavioral)
//   8 1D list pushed at back, popped at front           → queue   (behavioral)
//   6 2D primitive array                                → matrix
//   9 1D primitive array                                → array
//  10 anything else                                     → memory

import {
  isRef,
  refId,
  materialize,
  isPrimitive,
  isPrimitiveArray,
  is2DArray,
  visibleVariables,
} from "./materialize";

export const KINDS = [
  "auto",
  "array",
  "matrix",
  "stack",
  "queue",
  "linkedlist",
  "tree",
  "graph",
  "memory",
];

const LLM_ROLE_TO_KIND = {
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
  list: "array",
};

// ── Behavioral inference (rules 7/8) ─────────────────────────────────────────

const MAX_HISTORY_SAMPLES = 80;

function sampleHistory(frames, name) {
  if (!frames?.length) return [];
  const step = Math.max(1, Math.floor(frames.length / MAX_HISTORY_SAMPLES));
  const out = [];
  for (let i = 0; i < frames.length; i += step) {
    const vars = visibleVariables(frames[i]);
    if (!(name in vars)) continue;
    const v = materialize(vars[name], frames[i]);
    if (isPrimitiveArray(v)) out.push(v);
  }
  return out;
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Classify mutation pattern across history.
 * @returns {{kind:"stack",orient:"back"|"front"}|{kind:"queue"}|null}
 */
function behavioralKind(history) {
  let pushBack = 0, popBack = 0, popFront = 0, pushFront = 0, ambiguous = 0, other = 0;
  for (let i = 1; i < history.length; i++) {
    const a = history[i - 1], b = history[i];
    if (arraysEqual(a, b)) continue;
    if (b.length === a.length + 1) {
      const back = arraysEqual(a, b.slice(0, -1));
      const front = arraysEqual(a, b.slice(1));
      if (back && front) ambiguous++;        // e.g. [] → [0] — direction unknowable
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
  // LIFO at the tail (JS/Python push/pop, vector push_back/pop_back)
  if (backOps > 0 && frontOps === 0 && popBack > 0) return { kind: "stack", orient: "back" };
  // LIFO at the head (Java ArrayDeque.push/pop, C# Stack iteration order)
  if (frontOps > 0 && backOps === 0 && popFront > 0) return { kind: "stack", orient: "front" };
  // FIFO either direction
  if (popFront > 0 && pushBack > 0 && popBack === 0 && pushFront === 0) return { kind: "queue" };
  if (popBack > 0 && pushFront > 0 && pushBack === 0 && popFront === 0) return { kind: "queue" };
  // only ambiguous single-element churn with at least one true pop somewhere
  if (ambiguous >= 3 && backOps === 0 && frontOps === 0) return { kind: "stack", orient: "back" };
  return null;
}

/** Re-derive stack orientation for the renderer (cheap — sampled history). */
export function stackOrientation(frames, name) {
  const b = behavioralKind(sampleHistory(frames, name));
  return b && b.kind === "stack" ? b.orient : "back";
}

// ── Structural rules ─────────────────────────────────────────────────────────

function isIntArray(v) {
  return isPrimitiveArray(v) && v.every((x) => Number.isInteger(x) || typeof x === "boolean");
}

/** Rule 3 — N×N small-int matrix with zero diagonal ⇒ adjacency matrix. */
function isAdjacencyMatrix(m) {
  if (!is2DArray(m)) return false;
  const n = m.length;
  if (n < 2 || n > 60) return false;
  if (!m.every((row) => row.length === n)) return false;
  let nonZero = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const v = m[i][j];
      if (typeof v !== "number" || !Number.isFinite(v)) return false;
      if (i === j && v !== 0) return false;
      if (v !== 0) nonZero++;
    }
  }
  if (nonZero === 0) return false;
  // binary matrices are confidently graphs; weighted ones need every value small-ish
  const binary = m.every((row) => row.every((v) => v === 0 || v === 1));
  return binary || m.every((row) => row.every((v) => v >= 0 && v < 10_000));
}

function isSymmetric(m) {
  const n = m.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) if (m[i][j] !== m[j][i]) return false;
  return true;
}

/** Rule 4 — array of int-lists, every value a valid node index ⇒ adjacency list. */
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
  // require variance: identical row lengths of big numbers look like matrices
  const lens = new Set(v.map((r) => r.length));
  return edges > 0 && (lens.size > 1 || v.some((r) => r.length !== n));
}

/**
 * Rule 5 — list of `[u, v]` (or weighted `[u, v, w]`) int pairs whose endpoints
 * are small, reused node ids ⇒ edge list. Checked BEFORE rule 4: a uniform
 * width-2 list would otherwise be misread as an adjacency list. Low-confidence
 * by design (an N×2 numeric table looks the same) — the reused-id test below
 * rejects tables of distinct values, and LLM/override get the final say.
 */
function isEdgeList(v) {
  if (!Array.isArray(v) || v.length < 2 || v.length > 2000) return false;
  if (!v.every(isIntArray)) return false;
  // uniform width: all [u,v] (unweighted) or all [u,v,w] (weighted)
  const width = v[0].length;
  if (width !== 2 && width !== 3) return false;
  if (!v.every((r) => r.length === width)) return false;
  const ids = new Set();
  let maxNode = -1;
  for (const r of v) {
    for (let c = 0; c < 2; c++) {
      const x = r[c];
      if (typeof x === "boolean" || !Number.isInteger(x) || x < 0) return false;
      ids.add(x);
      if (x > maxNode) maxNode = x;
    }
  }
  // node ids must be small AND reused across edges (graphs share endpoints —
  // a 2-column data table of unique values does not).
  return (
    maxNode >= 1 &&
    maxNode < Math.max(50, v.length * 3) &&
    ids.size < v.length * 2
  );
}

/** Object-graph analysis for rules 1/2. Works on the RAW heap (refs, not materialized). */
function analyzeObjectGraph(rootRef, frame) {
  const heap = frame?.heap ?? {};
  const rootEntry = heap[refId(rootRef)];
  if (!rootEntry || rootEntry.type !== "object") return null;
  const cls = rootEntry.class;

  const nodes = new Map(); // id -> entry
  const queue = [refId(rootRef)];
  const indegree = new Map();
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

  // self-referencing field names, ordered by how consistently they appear
  const refFields = new Map();
  for (const e of nodes.values()) {
    for (const [k, v] of Object.entries(e.fields ?? {})) {
      if (isRef(v) && nodes.has(refId(v))) {
        refFields.set(k, (refFields.get(k) ?? 0) + 1);
      } else if (v === null && refFields.has(k)) {
        // keep — null children are normal
      }
    }
  }
  // also count fields that are null everywhere they appear but named like links
  const fieldNames = new Set();
  for (const e of nodes.values())
    for (const k of Object.keys(e.fields ?? {})) fieldNames.add(k);

  const linkNames = [...fieldNames].filter((k) =>
    [...nodes.values()].every((e) => {
      const v = e.fields?.[k];
      return v === null || v === undefined || (isRef(v) && nodes.has(refId(v)));
    }) &&
    [...nodes.values()].some((e) => isRef(e.fields?.[k]))
  );

  const valueField =
    [...fieldNames].find((k) => ["val", "value", "data", "key", "label"].includes(k)) ??
    [...fieldNames].find((k) => [...nodes.values()].some((e) => isPrimitive(e.fields?.[k])));

  const acyclic = ![...indegree.values()].some((d) => d > 1) || nodes.size <= 1;

  return { cls, nodes, linkNames, valueField, rootId: refId(rootRef), acyclic, indegree };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Heuristically classify one variable. Returns a kind string.
 * `frames` (full run) enables the behavioral rules; `frame` is the
 * representative frame used for structural checks.
 */
export function inferKind(name, value, frame, frames) {
  if (isPrimitive(value) && !isRef(value)) return "scalar";
  const entry = frame?.heap?.[isRef(value) ? refId(value) : ""];
  if (!entry) return "scalar";

  if (entry.type === "object") {
    const g = analyzeObjectGraph(value, frame);
    if (g && g.acyclic) {
      const lower = g.linkNames.map((k) => k.toLowerCase());
      const hasLR =
        (lower.includes("left") && lower.includes("right")) || g.linkNames.length === 2;
      if (hasLR && g.linkNames.length >= 2) return "tree";                  // rule 1
      if (g.linkNames.length === 1) return g.nodes.size > 1 ? "linkedlist" : "memory"; // rule 2
    }
    return "memory";
  }

  if (entry.type === "dict" || entry.type === "map") {
    const m = materialize(value, frame);
    // dict int → int-list, values valid indices ⇒ adjacency list (rule 4)
    const entries = m.entries ?? [];
    if (
      entries.length >= 2 &&
      entries.every(([k, v]) => Number.isInteger(k) && isIntArray(v))
    ) {
      const keys = new Set(entries.map(([k]) => k));
      if (entries.every(([, v]) => v.every((x) => keys.has(x)))) return "graph";
    }
    return "memory";
  }

  if (["list", "tuple", "array", "set"].includes(entry.type)) {
    const m = materialize(value, frame);
    if (isAdjacencyMatrix(m)) return "graph";        // rule 3
    if (isEdgeList(m)) return "graph";               // rule 5 (before rule 4)
    if (isAdjacencyList(m)) return "graph";          // rule 4
    if (isPrimitiveArray(m)) {
      const behavioral = behavioralKind(sampleHistory(frames, name)); // rules 7/8
      if (behavioral) return behavioral.kind;
      return "array";                                // rule 9
    }
    if (is2DArray(m)) return "matrix";               // rule 6
    return "memory";                                 // rule 10
  }

  return "memory";
}

/**
 * Classify every variable that ever appears, applying full precedence.
 * @param frames           full frame list
 * @param classifications  LLM labels { name: {role, form, directed, confidence} }
 * @param overrides        user "view as" choices { name: kind | "auto" }
 * @returns Map name → { kind, source: "user"|"llm"|"heuristic", llm }
 */
export function classifyVariables(frames, classifications = {}, overrides = {}) {
  const result = new Map();
  if (!frames?.length) return result;

  // last frame each variable appears in = richest structural sample
  const lastSeen = new Map();
  for (let i = frames.length - 1; i >= 0; i--) {
    for (const name of Object.keys(visibleVariables(frames[i]))) {
      if (!lastSeen.has(name)) lastSeen.set(name, i);
    }
    if (i < frames.length - 50 && lastSeen.size > 0) break; // variables rarely vanish; cap the scan
  }
  // also pick up anything from early frames
  for (const f of frames.slice(0, 5)) {
    for (const name of Object.keys(visibleVariables(f))) {
      if (!lastSeen.has(name)) lastSeen.set(name, frames.indexOf(f));
    }
  }

  for (const [name, idx] of lastSeen) {
    const frame = frames[idx];
    const value = visibleVariables(frame)[name];
    const heuristic = inferKind(name, value, frame, frames);

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

// ── Renderer-frame builders (Layer 3 adapter) ────────────────────────────────

function diffIndices(prev, cur) {
  if (!isPrimitiveArray(prev) || !isPrimitiveArray(cur)) return [];
  const out = [];
  const n = Math.max(prev.length, cur.length);
  for (let i = 0; i < n; i++) if (prev[i] !== cur[i]) out.push(i);
  return out.length <= 8 ? out : []; // wholesale changes aren't a "highlight"
}

function adjacencyMatrixToGraph(m) {
  const n = m.length;
  const symmetric = isSymmetric(m);
  const nodes = Array.from({ length: n }, (_, i) => ({ id: i }));
  const edges = [];
  for (let i = 0; i < n; i++) {
    for (let j = symmetric ? i + 1 : 0; j < n; j++) {
      if (i === j || m[i][j] === 0) continue;
      const e = { from: i, to: j, directed: !symmetric };
      if (m[i][j] !== 1) e.weight = m[i][j];
      edges.push(e);
    }
  }
  return { type: "graph", nodes, edges };
}

function adjacencyListToGraph(rows) {
  const nodes = rows.map((_, i) => ({ id: i }));
  const edges = [];
  const seen = new Set();
  let symmetric = true;
  rows.forEach((row, u) => row.forEach((v) => {
    if (!rows[v]?.includes(u)) symmetric = false;
  }));
  rows.forEach((row, u) =>
    row.forEach((v) => {
      const key = symmetric ? [Math.min(u, v), Math.max(u, v)].join("-") : `${u}-${v}`;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push({ from: u, to: v, directed: !symmetric });
    })
  );
  return { type: "graph", nodes, edges };
}

function edgeListToGraph(rows) {
  const weighted = rows.every((r) => r.length === 3);
  const ids = new Set();
  for (const r of rows) { ids.add(r[0]); ids.add(r[1]); }
  const nodes = [...ids].sort((a, b) => a - b).map((id) => ({ id }));
  const present = new Set(rows.map((r) => `${r[0]}-${r[1]}`));
  const symmetric = rows.every((r) => present.has(`${r[1]}-${r[0]}`));
  const edges = [];
  const seen = new Set();
  for (const r of rows) {
    const [u, v] = r;
    const key = symmetric ? [Math.min(u, v), Math.max(u, v)].join("-") : `${u}-${v}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const e = { from: u, to: v, directed: !symmetric };
    if (weighted) e.weight = r[2];
    edges.push(e);
  }
  return { type: "graph", nodes, edges };
}

function dictToGraph(m) {
  const entries = m.entries ?? [];
  const nodes = entries.map(([k]) => ({ id: k }));
  const ids = new Set(entries.map(([k]) => k));
  const edges = [];
  const seen = new Set();
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
  let rightName = g.linkNames.find((k) => lower(k).includes("right")) ??
    g.linkNames.find((k) => k !== leftName);
  const nodes = [...g.nodes.entries()].map(([id, e]) => ({
    id,
    val: g.valueField != null ? e.fields?.[g.valueField] : id,
    left: isRef(e.fields?.[leftName]) ? refId(e.fields[leftName]) : null,
    right: rightName && isRef(e.fields?.[rightName]) ? refId(e.fields[rightName]) : null,
  }));
  return { type: "tree", nodes, rootId: g.rootId };
}

function objectGraphToLinkedList(value, frame) {
  const g = analyzeObjectGraph(value, frame);
  if (!g) return null;
  const nextName =
    g.linkNames.find((k) => k.toLowerCase().includes("next")) ?? g.linkNames[0];
  const nodes = [...g.nodes.entries()].map(([id, e]) => ({
    id,
    val: g.valueField != null ? e.fields?.[g.valueField] : id,
    next: isRef(e.fields?.[nextName]) ? refId(e.fields[nextName]) : null,
  }));
  return { type: "linkedlist", nodes };
}

function objectGraphToGraph(value, frame) {
  const g = analyzeObjectGraph(value, frame);
  if (!g) return null;
  const nodes = [...g.nodes.entries()].map(([id, e]) => ({
    id,
    label: String(g.valueField != null ? e.fields?.[g.valueField] : id),
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

/**
 * Build the prop-frame for the semantic renderer of `kind`,
 * or null when the value can't be presented as that kind
 * (caller falls back to the memory view).
 */
export function buildRendererFrame(name, kind, frame, prevFrame, frames) {
  const value = visibleVariables(frame)[name];
  if (value === undefined) return null;
  const m = materialize(value, frame);
  const prevValue = prevFrame ? visibleVariables(prevFrame)[name] : undefined;
  const prevM = prevValue !== undefined ? materialize(prevValue, prevFrame) : undefined;

  switch (kind) {
    case "array": {
      if (!isPrimitiveArray(m)) return null;
      return { type: "array", data: m, highlighted: diffIndices(prevM, m), label: name };
    }
    case "matrix": {
      if (is2DArray(m)) return { type: "matrix", data: m, label: name };
      if (isPrimitiveArray(m)) return { type: "matrix", data: [m], label: name };
      return null;
    }
    case "stack": {
      if (!isPrimitiveArray(m)) return null;
      // StackRenderer wants data[0] = bottom; head-oriented stacks get reversed
      const headFirst = stackOrientation(frames, name) === "front";
      const data = headFirst ? [...m].reverse() : m;
      const out = { type: "stack", data, label: name };
      if (isPrimitiveArray(prevM) && m.length === prevM.length + 1) out.pushed = data.length - 1;
      return out;
    }
    case "queue": {
      if (!isPrimitiveArray(m)) return null;
      const out = { type: "queue", data: m, label: name };
      if (isPrimitiveArray(prevM) && m.length === prevM.length + 1) out.enqueued = m.length - 1;
      return out;
    }
    case "graph": {
      if (isAdjacencyMatrix(m)) return { ...adjacencyMatrixToGraph(m), label: name };
      if (isEdgeList(m)) return { ...edgeListToGraph(m), label: name };
      if (isAdjacencyList(m)) return { ...adjacencyListToGraph(m), label: name };
      if (m?.__kind === "dict") return { ...dictToGraph(m), label: name };
      if (m?.__kind === "object") {
        const g = objectGraphToGraph(value, frame);
        return g ? { ...g, label: name } : null;
      }
      if (is2DArray(m)) return { ...adjacencyMatrixToGraph(m), label: name }; // user forced it
      return null;
    }
    case "tree": {
      if (m?.__kind !== "object") return null;
      const t = objectGraphToTree(value, frame);
      return t ? { ...t, label: name } : null;
    }
    case "linkedlist": {
      if (m?.__kind !== "object") return null;
      const l = objectGraphToLinkedList(value, frame);
      return l ? { ...l, label: name } : null;
    }
    default:
      return null;
  }
}
