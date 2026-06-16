# Visualizer Refactor Plan — Runtime Tracing + Shape Inference

## STATUS — read this first (last update 2026-06-07)

**Sections 1–10 of this document are the original design; they are all IMPLEMENTED.
Open work lives ONLY in §13. Next session: start at §13 Step 1.**

### ✅ DONE
- [x] Phases 0–9: all 6 tracers (`visualizer/service/tracer/`), uniform frame schema on
      stderr, Gemini classifier (`classifier/`, @Primary + Redis cache), frontend inference
      (`inference/inferShape.js`, rules 1–4 + 6–10), MemoryModelRenderer, per-variable
      "view as", MANUAL mode deleted
- [x] Verified: local toolchains all 6 languages (`g`→graph, `root`→tree, `stack`→stack,
      `freq`→memory); JUnit `TracerInstrumentationTest` 9/9; full backend suite; npm build
- [x] **E2E through real Judge0 passing** — user manually tested §11 `full_demo` fixtures in UI
- [x] UI overhaul: VisuAlgo style (`renderers/vizTheme.jsx`, fixed dark canvas — light-mode
      immune, solid nodes, bigger fonts); SSR render test 13/13
- [x] Light-mode invisible text on Run & Submit buttons fixed (7 spots, `var(--text-inverse)`)
- [x] Fixtures (§11) in `src/test/resources/visualizer/fixtures/`; manual harness
      `TDTUOJ_backend/tools/viz-test/README.md`

### ❌ TODO → full detail in §13
1. **Commit everything** (large uncommitted change set — do first)
2. ~~Rule 5 (edge-list→graph)~~ **DONE 2026-06-08** — `isEdgeList`/`edgeListToGraph` in inferShape.js (checked before rule 4); sanity-checked + build green
3. Tier-3 fixtures: floats/NaN, sets, C++ `std::stack` hack, adjacency-list, JS plain-object
   tree, C++ globals — implemented code paths never exercised
4. §11.7 edge fixtures (files not written): stdin, DP-ambiguity/Gemini test, linked list,
   queue, frame bomb, runtime/parse errors, unicode
5. §12 UI checklist blocks C–E (block C needs live Gemini key)
5.5. Scanner gaps: ~~Allman-style functions invisible in C/C++~~ **DONE 2026-06-08**
   (ported C#'s pending-brace mechanism to CppTracer/CTracer; verified C++ Allman
   recursion traced end-to-end). ~~Braceless control bodies (`for/while/if/else/do`
   without `{}`) traced once-only, and a then-branch before `else` was invisible~~
   **DONE 2026-06-08** — new `tracer/BraceSynthesizer.java` runs as a shared
   insert-only pre-pass for C/C++/C#: wraps every braceless control body in
   `{\n…\n}` on its own lines and carries an output→original line map (so snap
   line numbers + `#line` stay correct). Returns the source verbatim when no
   braceless body exists (braced one-per-line code is byte-identical — zero risk)
   and falls back to the original on any parse anomaly (unbalanced/overlap/EOF →
   never emits non-compiling code). Verified live (gcc C11 / g++ C++14 / dotnet):
   braceless nested loop body now snaps per-iteration (25 frames vs 1), both
   if/else branches visible (2 / 3), do-while body per-iteration (5); output
   `25 2 3 5` correct in all three. JUnit `TracerInstrumentationTest` 20/20.
   ~~Multi-line C++ lambdas break compile~~ **DONE 2026-06-08** — and the same class of
   gaps closed in one pass:
   - **Lambda bodies (C++ `[...]{}` / C# `=>{}`/`delegate{}`)**: the scanner snapped body
     statements that referenced uncaptured outer locals (C++: "not captured"; C#: CS0165
     "use of unassigned local" — the lambda var inside its own initializer). Fix: a
     lambda-body brace-depth stack in CppTracer/CSharpTracer suppresses snaps inside the
     body (detect `[...](...)?{` / `=>{`/`delegate{`). Suppression only drops frames, so a
     false match is always compile-safe. Verified live: assigned multi-line lambdas now
     compile + run in both languages; lambda-as-arg unaffected.
   - **`void`-returning C functions invisible**: `void` is in C's KEYWORDS so the FUNC guard
     rejected them → no frame, body never snapped. Fix: `isFuncFirstWord` allows `void`
     (still rejects `struct`/`union`/`enum` returns — the reverted segfault class below).
     C++ already worked (no `void` in its KEYWORDS).
   - **Multi-line function signatures** (`int f(int a,\n int b){`) invisible in C/C++/C#:
     new `BraceSynthesizer.joinSignatures` collapses a `type name(...)` whose params span
     lines onto its first line (blanking continuations, preserving the line→origin map) so
     the single-line FUNC/METHOD regex matches. Conservative (skips prototypes, calls,
     comment-bearing or `;`-bearing runs). Verified live in all three. (C# was refactored to
     pre-strip into a `stripped[]` array like C/C++.)
   JUnit `TracerInstrumentationTest` 24/24.
   NOTE: broadening the function keyword guard to also instrument struct-returning C
   functions was tried and **reverted** — it segfaults (serializer chases an
   uninitialized `Node*` field right after `malloc`, before field init). Documented limit.
   Remaining minor limits: `static`-prefixed return types in C still rejected; C# delegate
   values serialize as deep `IntPtr` chains (bounded by MAXH/depth, renders opaque).
6. Hardening: Judge0 stderr size limit, rate-limit on `/api/visualize`, gitignore dev artifacts
7. Thesis material (capability matrix, classifier accuracy, screenshots)

### Implementation deviations from the design below (for the thesis)
1. JS parsing = **acorn executed inside Rhino** (Rhino's own parser stops at ES5) —
   `resources/visualizer/acorn.js` + `js-instrument.js`
2. C: typed capture calls + `sizeof` lengths (not `_Generic`); call stack via
   `__attribute__((cleanup))`
3. C++: RAII guard call stack; `#line` keeps compiler errors on original lines
4. Outer stack frames in Java/C#/C/C++/JS show last-snapped (not live) locals
5. **Judge0 toolchains are OLD — preambles must target them, not local toolchains**:
   Java = OpenJDK **13** (no pattern instanceof / switch arrows — broke once, fixed,
   harness now uses `javac --release 13`), C++ = Clang 7 / C++14, Node 12, Mono 6.6
   (C# 7.3), GCC 9 (C11). Single-line loops (`for (int x : a) f(x);`) also fixed
   2026-06-07: loop vars now enter scanner scope only when the loop opens a brace
   (C/C++/C# — leaked into later snaps as undeclared identifiers before).

> **Goal**: Replace source-regex-based data-structure detection with a CodeChef/Python-Tutor-style pipeline:
> **capture everything at runtime → infer structure from data shape → render semantically, fall back to memory model**.
> Works regardless of how the user encodes a structure (tree as class, as adjacency matrix, as dict, …).

**Decisions locked in:**
| Decision | Choice |
|---|---|
| Render style | Semantic renderers (tree/graph/matrix/…) stay; **memory-model renderer as universal fallback** |
| MANUAL mode | **Dropped from UI**; replaced by per-variable "view as" override |
| LLM role | **Deterministic tracer + Gemini Flash as variable classifier** (out of critical path, heuristic fallback) |
| Language depth | **Equal depth across all 6** — Python, Java, C, C++, **JavaScript** (Judge0 63, Node 12.14), **C#** (Judge0 51, Mono 6.6) |
| Inference location | Heuristics in **frontend** (instant "view as" toggle); LLM classification in **backend** (API key lives there), results attached to response |

---

## 1. Why the current design fails

Current AUTO mode (backend `visualizer/service/instrumentor/`) detects variables by **regexing source lines**:

- `JavaInstrumentor` only matches `int[] x`, `int[][] x`, primitive declarations — misses `Map`, `List`, user classes, `var`.
- `CppInstrumentor` only matches `int/long/double` and `vector<primitive>` — misses `map`, `set`, `pair`, structs, pointers.
- `PythonInstrumentor` regexes assignments/for/while — misses mutations (`arr[i] = x`, `node.left = y`), comprehensions, nested functions, recursion depth.
- Frontend `AutoTraceRenderer` only recognizes 1D/2D numeric arrays. A tree stored as `class Node` or a graph stored as `dict[int, list[int]]` renders as a raw table or nothing.

Root cause: **detection happens at the source-text level**. The fix: capture *runtime values generically*, decide *what they are* afterwards from the data itself.

---

## 2. Target architecture (3 layers)

```
┌────────────────────────────────────────────────────────────────────┐
│ LAYER 1 — CAPTURE (backend, per language)                          │
│  Goal: emit a uniform frame stream of ALL program state            │
│  Python: sys.settrace (real tracer)                                │
│  Java:   JavaParser-based instrumentation + reflection serializer  │
│  C++:    instrumentation + template serializers + struct codegen   │
│  C:      instrumentation + generated per-struct serializers        │
│  JS:     Rhino-parsed instrumentation + WeakMap-id serializer      │
│  C#:     decl-parsed instrumentation + reflection serializer       │
│  Output: uniform Frame JSON on stderr (__FRAMES__…__END__)         │
├────────────────────────────────────────────────────────────────────┤
│ LAYER 2 — CLASSIFY                                                 │
│  a) Heuristic shape inference (frontend JS) — instant, offline     │
│  b) Gemini Flash classifier (backend) — source + var samples →     │
│     semantic labels {g: "graph-adj-matrix", dp: "dp-table"}        │
│     Cached by code hash. Failure ⇒ heuristics only. Never blocks.  │
│  c) User override — per-variable "view as" dropdown (final say)    │
├────────────────────────────────────────────────────────────────────┤
│ LAYER 3 — RENDER (frontend)                                        │
│  Recognized   → existing semantic renderers (Tree/Graph/Matrix/…)  │
│  Unrecognized → NEW MemoryModelRenderer (boxes + pointer arrows)   │
│  Never renders "nothing".                                          │
└────────────────────────────────────────────────────────────────────┘
```

Thesis framing: clean separation of *tracing* (language-dependent) from *interpretation* (language-independent) — same argument Python Tutor's papers make, plus an LLM-assisted classification layer they don't have.

---

## 3. Uniform frame schema (replaces current flat `locals` map)

One schema for all languages. Heap-and-reference model so linked structures, sharing, and recursion are representable:

```json
{
  "step": 12,
  "line": 10,
  "event": "line | call | return | exception",
  "stdout": "output produced so far (cumulative length)",
  "stack": [
    { "function": "main", "line": 42, "locals": { "n": 5, "root": "@1" } },
    { "function": "insert", "line": 10, "locals": { "cur": "@3", "val": 7 } }
  ],
  "heap": {
    "1": { "type": "object", "class": "Node", "fields": { "val": 5, "left": "@2", "right": "@3" } },
    "2": { "type": "object", "class": "Node", "fields": { "val": 3, "left": null, "right": null } },
    "4": { "type": "list",  "values": [1, 2, "@5"] },
    "5": { "type": "dict",  "entries": [[ "a", 1 ], [ "b", 2 ]] },
    "6": { "type": "array2d", "values": [[0,1],[1,0]] }
  }
}
```

Rules:
- Primitives inline; compound values become heap entries referenced as `"@id"`.
- `id` is stable across frames (Python `id()`, Java `IdentityHashMap` counter, C/C++ pointer value) → enables animating the *same* node moving.
- Cycle-safe: serializers carry a visited-set; revisits emit the ref only.
- Caps per frame: heap ≤ 200 entries, container ≤ 1000 elements, string ≤ 256 chars, depth ≤ 8 — beyond that emit `{"truncated": true}`.
- Frames go to **stderr** (Judge0 returns stdout/stderr separately) → user `print` output no longer interleaves with trace markers. `stdout` field enables the "console output so far" panel per step.

Backend `VisualizerResponse` gains: `frames` (new schema), `classifications` (LLM labels, may be empty), `language`, `limits` metadata. Keep `stdout`, `error`.

---

## 4. Layer 1 — per-language capture design

### 4.1 Python — `sys.settrace` (rewrite, ~replaces PythonInstrumentor)

The only language where a *real* tracer runs inside Judge0 with zero dependencies.

- Prepend a tracer preamble (~150 lines of stdlib-only Python); user code is `exec`'d under `sys.settrace(tracer)`.
- Tracer fires on every `line/call/return/exception` event in **user code only** (filter by filename `<usercode>`).
- Serializer walks `frame.f_locals` + full call stack via `frame.f_back`; compound objects → heap entries keyed by `id(obj)`; user-class instances → `vars(obj)` fields.
- Captures everything the regex approach missed: mutations, comprehensions, recursion, closures, dicts, sets, tuples, user classes.
- Frame throttling: emit on line events only; skip frames where state hash is unchanged.
- Delete: all of `transformSource()` regex machinery.

**Risk**: settrace overhead on hot loops → respect existing MAX_FRAMES=5000 by hard-stopping the tracer (`sys.settrace(None)`) and appending a `"truncated"` marker frame.

### 4.2 Java — JavaParser instrumentation + reflection serializer

No `sys.settrace` equivalent usable inside Judge0 (no JVMTI agent, no JDI attach). But two big upgrades close most of the gap:

1. **Real parsing instead of regex** — add `com.github.javaparser:javaparser-core` to *our backend* (instrumentation runs in our Spring service, not in the sandbox, so dependencies are free). Visit the AST: after every statement in every method, insert `_T.snap(line, "method", new String[]{...names in scope...}, new Object[]{...values...})`. Scope resolution comes from the AST — every local of *any* type is captured, including `var`, generics, user classes. Deletes `BraceNormalizer` (parser handles braces) and all `varDecl/intArrDecl/...` regexes.
2. **Reflection serializer in the preamble** — `_T.snap` serializes values generically at runtime:
   - arrays (any dimension/type), `Collection`, `Map`, `String`, boxed primitives → native heap types;
   - any other object → reflect fields (`getDeclaredFields` + `setAccessible(true)`; fine on Judge0, no SecurityManager) → `object` heap entry;
   - identity via `IdentityHashMap<Object,Integer>` → stable `@id`s; visited-set for cycles.

Result: a user's `class Node { int val; Node left, right; }` tree is fully captured without the instrumentor knowing the class exists.

Call-stack depth: maintain a thread-local stack in `_T` pushed/popped by instrumented method entry/exit (JavaParser inserts the hooks), giving the multi-frame `stack` array for recursion display.

### 4.3 C++ — template serializers + per-struct codegen

No reflection in C++. Equal-depth strategy = move intelligence to **instrumentation-time codegen** (runs in our backend, can be smart):

1. **Declaration tracking, widened**: parse declarations for *all* types — primitives, `std::vector/map/set/unordered_*/pair/string/stack/queue/deque` (any nesting), C arrays with static size, and user `struct`/`class` types. Upgrade from current regex set to a small declaration parser (still line-oriented, but type-grammar-aware: balanced `<>` template parsing instead of a fixed alternation).
2. **Template serializer preamble** (~250 lines): overloads/SFINAE for arithmetic types, `std::string`, all STL containers (recursive — `vector<map<int, vector<int>>>` just works), `pair`, `tuple`.
3. **Per-struct codegen**: backend parses user `struct Node { int val; Node* next; };` definitions and *generates* a serializer overload for each:
   ```cpp
   void _ser(const Node& v, _Ctx& c) {
     c.obj("Node"); c.field("val", v.val); c.fieldPtr("next", v.next); c.end();
   }
   ```
   Pointer members recurse through a visited-set keyed by address → heap entries with `@<addr>` ids → **linked lists and pointer-based trees in C++ become fully visualizable**, which the current system cannot do at all.
4. Call stack: instrumented function entry/exit pushes/pops a static frame stack (same pattern as Java).

Documented limits (honest thesis material): raw `new T[n]` / `malloc` buffers without a parseable size expression are shown as opaque pointers; unions, bitfields, and template user classes are out of scope.

### 4.4 C — subset of the C++ approach

Same pipeline minus templates:
- Serializer preamble in plain C for primitives + static arrays (size via `sizeof` at instrumentation time when the declaration is `T x[N]`).
- Per-struct codegen identical to C++ (works even better — C structs are plain).
- `malloc`'d arrays: when the declaration line is `T* p = malloc(n * sizeof(T))` with a simple `n`, instrumentation records `n` as the length expression and the serializer uses it; otherwise opaque pointer.
- Pointer-chasing structs (linked list, tree) work exactly as in C++ via generated serializers + visited set.

### 4.5 JavaScript — Rhino-parsed instrumentation + WeakMap-id serializer

> Currently blocked outright: `VisualizerServiceImpl.java:81,89` throws `BadRequestException` for `JAVASCRIPT`/`CSHARP`. This refactor removes those cases.

Runtime: **Node.js 12.14** (Judge0 id 63). No in-process tracer exists for synchronous JS (the `inspector` module cannot pause its own thread), so JS follows the **instrumentation** path — but with two strong advantages:

1. **Real parsing via Rhino** — add `org.mozilla:rhino` to our backend; its parser produces a full AST for ES6-era JS. Visit statements like the JavaParser approach: after each statement insert `_T.snap(line, fn, {x, y, arr})` with scope known from the AST (`var`/`let`/`const`, function params, closures by lexical walk).
   *Lucky alignment*: Node 12 itself lacks post-ES2019 syntax (optional chaining, nullish coalescing land in Node 14) — so Rhino's parser ceiling ≈ the runtime's ceiling; code that runs on Judge0 parses in Rhino.
2. **Trivial generic serialization** — the preamble serializer walks any value natively: `Array`, plain objects (`Object.entries`), `Map`, `Set`, class instances (own enumerable props), nested anything. Identity via `WeakMap<object, id>` → stable `@id`s; visited-set for cycles. No type knowledge needed at instrumentation time at all — JS reaches **near-Python capture depth**.

Call stack: instrumented function entry/exit pushes/pops a module-level frame stack (same pattern as Java/C++). Frames emitted on `process.stderr`.

### 4.6 C# — decl-parsed instrumentation + reflection serializer

Runtime: **Mono 6.6** (Judge0 id 51). Same shape as Java but the parser side is lighter:

1. **Reflection serializer preamble** (C# in the submitted source): handles arrays (incl. jagged/multi-dim), `List<>`, `Dictionary<,>`, `HashSet<>`, `Stack<>`, `Queue<>`, `string`, primitives, and **any user class** via `GetType().GetFields(BindingFlags.NonPublic|Public|Instance)`. Identity via a reference-equality `Dictionary<object,int>` (`ReferenceEqualityComparer`) → stable `@id`s; visited-set for cycles. Like Java, the serializer's generality means instrumentation needs *names only, not types*.
2. **Decl parser** (backend) — no Roslyn available from our Java service, but because the serializer is fully generic, scope detection reduces to identifier harvesting: `Type name = …` / `var name = …` / `foreach (var x in …)` / method params, plus brace-depth scope tracking. Much simpler than the C++ type-grammar parser; closer in effort to the current Java regex set but capture-all.

Frames emitted on `Console.Error`. Call stack via instrumented method entry/exit (static frame stack in the preamble class).

Documented limit: properties with side-effectful getters are skipped (fields only); `Span<T>`/unsafe code out of scope.

### 4.7 Shared backend refactor

```
visualizer/
├── controller/VisualizerController.java        (unchanged route)
├── dto/  Frame, StackEntry, HeapObject, VisualizerRequest/Response (new schema)
├── service/
│   ├── VisualizerServiceImpl.java              (orchestrator: instrument → Judge0 → parse → classify)
│   ├── classifier/GeminiVariableClassifier.java (Layer 2b, see §5)
│   └── tracer/                                  (renamed from instrumentor/)
│       ├── Tracer.java                          (interface: String instrument(String src))
│       ├── PythonTracer.java                    (settrace preamble)
│       ├── JavaTracer.java                      (JavaParser visitor + preamble)
│       ├── CppTracer.java / CTracer.java        (decl parser + codegen + preamble)
│       ├── JsTracer.java                        (Rhino AST visitor + preamble)
│       ├── CSharpTracer.java                    (identifier decl parser + preamble)
│       └── StructCodegen.java                   (shared C/C++ struct serializer generator)
```

Also:
- Remove the `case CSHARP, JAVASCRIPT -> throw BadRequestException` branches in `VisualizerServiceImpl` (`:81`, `:89`); add `CSHARP→51`, `JAVASCRIPT→63` to the visualizer LANG_ID map (matching `Judge0Service.LANGUAGE_MAP`).
- Frontend: add `csharp`/`javascript` to the visualizer language selector + Monaco language pass-through (both ship natively in Monaco — no grammar config; naming bridges per `add-csharp-javascript-languages.md` §1: editor key `csharp`/`javascript` ↔ enum `CSHARP`/`JAVASCRIPT`).
- New Maven deps: `com.github.javaparser:javaparser-core`, `org.mozilla:rhino`.

Delete: MANUAL-mode preambles in all instrumentors, `VisualizerMode` enum usage in this module (keep enum if referenced elsewhere), `BraceNormalizer` (Java side; C/C++ may retain a copy until the decl parser supersedes it).

---

## 5. Layer 2 — classification

### 5.1 Heuristic inference engine (frontend, new `src/components/visualizer/inference/inferShape.js`)

Pure functions over heap entries; runs per variable, memoized per (heap id, frame). Rule order (first match wins):

| # | Rule | Inferred type |
|---|------|---------------|
| 1 | object graph where nodes have `left`/`right`-named refs (or exactly 2 ref fields) and no cycles, single root | `tree` |
| 2 | object chain via single ref field (`next`), no branching | `linkedlist` |
| 3 | N×N 2D array, values ∈ {0,1} or numeric-with-0-diagonal | `graph` (adjacency matrix; symmetric ⇒ undirected) |
| 4 | dict/map `int → list[int]` or array of int-lists where values < N | `graph` (adjacency list) |
| 5 | list of `[u, v]` / `[u, v, w]` pairs with small int range | `graph` (edge list) |
| 6 | 2D array (non-square or wide value range) | `matrix` (DP table styling if monotone growth across frames) |
| 7 | 1D list mutated only at tail across frames (append/pop same end) | `stack` — **behavioral inference across frames** |
| 8 | 1D list mutated at opposite ends across frames | `queue` |
| 9 | 1D list/array | `array` |
| 10 | anything else | `memory` (fallback renderer) |

Rules 7–8 use the frame *sequence*, not a single snapshot — a genuinely novel point vs. static inspection (cite in thesis).

Confidence threshold: ambiguous cases (e.g., rule 3 vs 6) defer to LLM label if present, else pick the lower rule and surface the "view as" control prominently.

### 5.2 Gemini Flash classifier (backend, `GeminiVariableClassifier`)

- **Input**: user source code + per-variable digest (name, declared/observed type, 2–3 sampled values from early/middle/late frames).
- **Output (strict JSON)**: `{ "g": {"role": "graph", "form": "adjacency-matrix", "directed": false, "confidence": 0.9}, "dp": {"role": "dp-table"}, ... }`
- **Out of the critical path**: orchestrator fires classification concurrently with nothing blocking — if the Gemini call errors or exceeds a 3 s budget, `classifications` returns empty and frontend heuristics carry the result. A failed/slow LLM can never break or delay a run beyond the budget.
- **Cache**: Redis, key = SHA-256(source + language), TTL 24 h — repeat runs of the same code (typical while debugging) cost zero tokens.
- Reuse existing WebClient Gemini plumbing from `hintLLM`.
- Prompt hardening: respond-JSON-only instruction + schema; reject/ignore non-conforming output (treat as failure).

### 5.3 Precedence

`user "view as" override > LLM label (confidence ≥ 0.7) > heuristic rule > memory fallback`

---

## 6. Layer 3 — frontend changes

### Keep (with adapter)
- All semantic renderers (`Array/Tree/Graph/LinkedList/Stack/Queue/Matrix`). New `frameAdapter.js` converts (heap entry + inferred type) → each renderer's existing prop shape, so renderer internals stay untouched.
- `VisualizerPlayer` (playback, keyboard, speed) — unchanged except it now receives per-step `stack`/`heap`.

### New
- **`MemoryModelRenderer.jsx`** — the universal fallback: stack-frame column (function, locals) + heap column (typed boxes) + SVG pointer arrows. Layout: simple layered left-to-right by reference depth; reuse arrow-drawing approach from `LinkedListRenderer`.
- **`inference/inferShape.js`** — §5.1 engine.
- **Variable panel** — list of variables in the current frame; each row: name, inferred type chip, **"view as" dropdown** (auto / array / matrix / tree / graph / linked list / stack / queue / memory). Selection stored in component state, applied instantly (no re-run — inference and adaptation are client-side).
- **Stack panel** — collapsed call-stack display; expanding a frame shows that frame's locals (recursion demo: factorial/DFS shows frames piling up).
- **Stdout panel** — incremental console output synced to current step.

### Remove
- MANUAL mode toggle, manual code editor branch, snapshot snippet library (~600 LOC in `VisualizerModal.jsx`).
- `AutoTraceRenderer`'s ad-hoc array detection (replaced by inference engine); its locals-merging logic migrates into the frame adapter if still needed.

`ApiService.visualize()` drops `mode` param.

---

## 7. Phases & estimates

| Phase | Work | Est. | Demo-able outcome |
|-------|------|------|-------------------|
| **0** | Frame schema DTOs, orchestrator refactor, stderr channel, drop MANUAL backend paths | 2 d | Builds green, old AUTO still works via shim |
| **1** | Python `sys.settrace` tracer | 3–4 d | Python: any code traces fully |
| **2** | Frontend: frame adapter, inference engine, MemoryModelRenderer, variable panel + "view as", stack/stdout panels, remove MANUAL UI | 5–6 d | **End-to-end demo in Python — defense-ready milestone** |
| **3** | Gemini Flash classifier + Redis cache + precedence wiring | 2–3 d | Ambiguous cases (graph vs DP) resolve correctly |
| **4** | JavaScript: Rhino AST instrumentation + WeakMap serializer | 4–5 d | JS at near-Python depth (second-best demo language) |
| **5** | Java: JavaParser instrumentation + reflection serializer | 5–6 d | Java user classes/collections fully visualized |
| **6** | C#: reflection serializer preamble + identifier decl parser | 4–5 d | C# parity with Java (minus property getters) |
| **7** | C++: decl parser, template serializers, struct codegen | 6–8 d | C++ pointer-based lists/trees visualized |
| **8** | C: plain-C serializers + struct codegen reuse | 3–4 d | C parity (minus documented limits) |
| **9** | Hardening: limits, truncation UX, error surfaces, unit tests (tracer outputs per language ×fixture programs §11), build verification | 3–4 d | |

**Total ≈ 7.5–8 weeks.** Order is deliberate: after Phase 3 (~2.5 weeks) the system is fully demo-able in Python with AI classification — if the defense date arrives early, later phases degrade gracefully (remaining languages keep current behavior — for JS/C# that means the existing "not supported" error until their phase lands; thesis documents the per-language roadmap). Language order = capture-quality per unit effort: JS and Java/C# get generic runtime serializers (high ceiling, moderate work); C/C++ need codegen (highest work).

---

## 8. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| `sys.settrace` slows hot loops, frame explosion | MAX_FRAMES hard stop + tracer self-disable + truncation marker frame |
| JavaParser fails on exotic user code | catch parse error → respond with clear "couldn't instrument" message + raw run output |
| Rhino can't parse user JS syntax | Node 12 runtime is the same ES generation — code that runs parses; on parse failure same "couldn't instrument" path as Java |
| Mono 6.6 reflection quirks (older runtime) | serializer wraps every field read in try/catch; unreadable field renders as `"<unreadable>"` |
| C/C++ decl parser misses a declaration | variable silently absent (not a crash); memory fallback still shows what was captured |
| Gemini latency/outage/quota | 3 s budget, async, Redis cache, heuristics always present |
| LLM returns malformed JSON | strict parse, discard on failure |
| Frame payload size (heap per frame) | per-frame caps (§3) + delta encoding if needed later (out of scope v1) |
| Judge0 output size limit | frames on stderr; Judge0 `max_file_size`/stdout caps checked in Phase 0; if frames exceed limit, binary search MAX_FRAMES down |
| Stable ids in C/C++ across reallocations | pointer = id is best-effort; document |

---

## 9. Testing

- **Backend**: JUnit per tracer — the §11 fixture programs → golden-file frame JSON assertions. Add to existing Mockito/JaCoCo suite.
- **Inference engine**: Vitest unit tests per rule with crafted heap fixtures (incl. ambiguous graph-vs-DP cases).
- **E2E smoke**: one script per language through real Judge0 (manual, pre-defense checklist).
- **Build rule**: `npm run build` + `./mvnw compile -q` green before each phase closes (per CLAUDE.md).

---

## 10. Thesis material map

- *Architecture chapter*: 3-layer separation (capture / classify / render) + comparison table vs Python Tutor (debugger-based) and CodeChef (closed-source) — our contribution: source-instrumentation capture that works inside a sandboxed judge, plus LLM-assisted semantic classification.
- *Novelty points*: (1) behavioral inference from frame sequences (stack/queue detection), (2) LLM variable classifier with deterministic fallback, (3) per-struct serializer codegen for C/C++ inside a no-debugger sandbox.
- *Evaluation section*: per-language capability matrix (what's captured / inferred / rendered), classifier accuracy on a labeled set of ~30 student programs, overhead measurements (frames/sec, latency).
- *Limitations section*: §4.3/4.4/4.6 documented limits, MAX_FRAMES truncation, LLM dependence for ambiguous cases.

---

## 11. Test fixture programs (one per language)

Each program exercises the same four scenarios so golden-file frames are cross-comparable:

1. **Array + bubble sort** → inference rule 9 (`array`), swap animation
2. **Graph stored as adjacency matrix + iterative DFS with explicit stack** → rules 3 (`graph`) + 7 (`stack`, behavioral) — *the motivating case: no Tree/Graph class anywhere in source*
3. **BST built from a user class/struct with pointer/reference children + recursive insert** → rule 1 (`tree`) + recursion (multi-frame call stack)
4. **Frequency map/dict** → no rule match → MemoryModelRenderer fallback

Expected inference per variable (same names in all six programs):

| Variable | Expected classification | Layer that decides |
|---|---|---|
| `arr` | `array` | heuristic rule 9 |
| `g` | `graph` (adjacency matrix, undirected) | rule 3, LLM confirms vs DP-table |
| `stack` | `stack` | rule 7 (behavioral, push/pop same end) |
| `visited` | `array` (boolean) | rule 9 |
| `order` | `array` | rule 9 |
| `root` | `tree` | rule 1 (left/right refs) |
| `freq` | `memory` fallback (dict boxes) | rule 10 |
| `insert(...)` frames | recursion depth in stack panel | capture layer |

### 11.1 Python

```python
class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

def insert(root, val):
    if root is None:
        return Node(val)
    if val < root.val:
        root.left = insert(root.left, val)
    else:
        root.right = insert(root.right, val)
    return root

# 1) array + bubble sort
arr = [5, 2, 8, 1, 9]
n = len(arr)
for i in range(n):
    for j in range(n - 1 - i):
        if arr[j] > arr[j + 1]:
            arr[j], arr[j + 1] = arr[j + 1], arr[j]

# 2) graph as adjacency matrix + iterative DFS
g = [[0, 1, 1, 0],
     [1, 0, 0, 1],
     [1, 0, 0, 1],
     [0, 1, 1, 0]]
visited = [False] * 4
stack = [0]
order = []
while stack:
    u = stack.pop()
    if visited[u]:
        continue
    visited[u] = True
    order.append(u)
    for v in range(3, -1, -1):
        if g[u][v] == 1 and not visited[v]:
            stack.append(v)

# 3) BST from user class (recursive insert)
root = None
for v in [4, 2, 6, 1, 3]:
    root = insert(root, v)

# 4) dict -> memory-model fallback
freq = {}
for x in arr:
    freq[x] = freq.get(x, 0) + 1

print(order, freq[1])
```

### 11.2 JavaScript (Node 12 syntax only — no `?.`/`??`)

```javascript
class Node {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

function insert(root, val) {
  if (root === null) return new Node(val);
  if (val < root.val) root.left = insert(root.left, val);
  else root.right = insert(root.right, val);
  return root;
}

// 1) array + bubble sort
const arr = [5, 2, 8, 1, 9];
const n = arr.length;
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n - 1 - i; j++) {
    if (arr[j] > arr[j + 1]) {
      const t = arr[j]; arr[j] = arr[j + 1]; arr[j + 1] = t;
    }
  }
}

// 2) graph as adjacency matrix + iterative DFS
const g = [
  [0, 1, 1, 0],
  [1, 0, 0, 1],
  [1, 0, 0, 1],
  [0, 1, 1, 0],
];
const visited = [false, false, false, false];
const stack = [0];
const order = [];
while (stack.length > 0) {
  const u = stack.pop();
  if (visited[u]) continue;
  visited[u] = true;
  order.push(u);
  for (let v = 3; v >= 0; v--) {
    if (g[u][v] === 1 && !visited[v]) stack.push(v);
  }
}

// 3) BST from user class (recursive insert)
let root = null;
for (const v of [4, 2, 6, 1, 3]) {
  root = insert(root, v);
}

// 4) Map -> memory-model fallback
const freq = new Map();
for (const x of arr) {
  freq.set(x, (freq.get(x) || 0) + 1);
}

console.log(order.join(" "), freq.get(1));
```

### 11.3 Java

```java
import java.util.*;

public class Main {
    static class Node {
        int val;
        Node left, right;
        Node(int val) { this.val = val; }
    }

    static Node insert(Node root, int val) {
        if (root == null) return new Node(val);
        if (val < root.val) root.left = insert(root.left, val);
        else root.right = insert(root.right, val);
        return root;
    }

    public static void main(String[] args) {
        // 1) array + bubble sort
        int[] arr = {5, 2, 8, 1, 9};
        int n = arr.length;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n - 1 - i; j++) {
                if (arr[j] > arr[j + 1]) {
                    int t = arr[j]; arr[j] = arr[j + 1]; arr[j + 1] = t;
                }
            }
        }

        // 2) graph as adjacency matrix + iterative DFS
        int[][] g = {
            {0, 1, 1, 0},
            {1, 0, 0, 1},
            {1, 0, 0, 1},
            {0, 1, 1, 0},
        };
        boolean[] visited = new boolean[4];
        Deque<Integer> stack = new ArrayDeque<>();
        List<Integer> order = new ArrayList<>();
        stack.push(0);
        while (!stack.isEmpty()) {
            int u = stack.pop();
            if (visited[u]) continue;
            visited[u] = true;
            order.add(u);
            for (int v = 3; v >= 0; v--) {
                if (g[u][v] == 1 && !visited[v]) stack.push(v);
            }
        }

        // 3) BST from user class (recursive insert)
        Node root = null;
        for (int v : new int[]{4, 2, 6, 1, 3}) {
            root = insert(root, v);
        }

        // 4) map -> memory-model fallback
        Map<Integer, Integer> freq = new HashMap<>();
        for (int x : arr) {
            freq.merge(x, 1, Integer::sum);
        }

        System.out.println(order + " " + freq.get(1));
    }
}
```

### 11.4 C# (Mono 6.6 — classic `Main`, no top-level statements)

```csharp
using System;
using System.Collections.Generic;

class Node {
    public int Val;
    public Node Left, Right;
    public Node(int val) { Val = val; }
}

class Program {
    static Node Insert(Node root, int val) {
        if (root == null) return new Node(val);
        if (val < root.Val) root.Left = Insert(root.Left, val);
        else root.Right = Insert(root.Right, val);
        return root;
    }

    static void Main() {
        // 1) array + bubble sort
        int[] arr = {5, 2, 8, 1, 9};
        int n = arr.Length;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n - 1 - i; j++) {
                if (arr[j] > arr[j + 1]) {
                    int t = arr[j]; arr[j] = arr[j + 1]; arr[j + 1] = t;
                }
            }
        }

        // 2) graph as adjacency matrix (jagged) + iterative DFS
        int[][] g = {
            new[] {0, 1, 1, 0},
            new[] {1, 0, 0, 1},
            new[] {1, 0, 0, 1},
            new[] {0, 1, 1, 0},
        };
        bool[] visited = new bool[4];
        var stack = new Stack<int>();
        var order = new List<int>();
        stack.Push(0);
        while (stack.Count > 0) {
            int u = stack.Pop();
            if (visited[u]) continue;
            visited[u] = true;
            order.Add(u);
            for (int v = 3; v >= 0; v--) {
                if (g[u][v] == 1 && !visited[v]) stack.Push(v);
            }
        }

        // 3) BST from user class (recursive insert)
        Node root = null;
        foreach (int v in new[] {4, 2, 6, 1, 3}) {
            root = Insert(root, v);
        }

        // 4) dictionary -> memory-model fallback
        var freq = new Dictionary<int, int>();
        foreach (int x in arr) {
            freq[x] = freq.TryGetValue(x, out int c) ? c + 1 : 1;
        }

        Console.WriteLine(string.Join(" ", order) + " " + freq[1]);
    }
}
```

### 11.5 C++

```cpp
#include <bits/stdc++.h>
using namespace std;

struct Node {
    int val;
    Node *left, *right;
    Node(int v) : val(v), left(nullptr), right(nullptr) {}
};

Node* insertNode(Node* root, int val) {
    if (root == nullptr) return new Node(val);
    if (val < root->val) root->left = insertNode(root->left, val);
    else root->right = insertNode(root->right, val);
    return root;
}

int main() {
    // 1) array + bubble sort
    vector<int> arr = {5, 2, 8, 1, 9};
    int n = (int)arr.size();
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) swap(arr[j], arr[j + 1]);
        }
    }

    // 2) graph as adjacency matrix + iterative DFS
    vector<vector<int>> g = {
        {0, 1, 1, 0},
        {1, 0, 0, 1},
        {1, 0, 0, 1},
        {0, 1, 1, 0},
    };
    vector<bool> visited(4, false);
    vector<int> stack_;       // explicit stack (push_back/pop_back)
    vector<int> order;
    stack_.push_back(0);
    while (!stack_.empty()) {
        int u = stack_.back();
        stack_.pop_back();
        if (visited[u]) continue;
        visited[u] = true;
        order.push_back(u);
        for (int v = 3; v >= 0; v--) {
            if (g[u][v] == 1 && !visited[v]) stack_.push_back(v);
        }
    }

    // 3) BST from user struct (recursive insert) — exercises struct codegen + pointer chasing
    Node* root = nullptr;
    for (int v : {4, 2, 6, 1, 3}) {
        root = insertNode(root, v);
    }

    // 4) map -> memory-model fallback
    map<int, int> freq;
    for (int x : arr) freq[x]++;

    cout << order.size() << " " << freq[1] << "\n";
    return 0;
}
```

### 11.6 C

```c
#include <stdio.h>
#include <stdlib.h>

struct Node {
    int val;
    struct Node *left;
    struct Node *right;
};

struct Node* insertNode(struct Node* root, int val) {
    if (root == NULL) {
        struct Node* nd = (struct Node*)malloc(sizeof(struct Node));
        nd->val = val;
        nd->left = NULL;
        nd->right = NULL;
        return nd;
    }
    if (val < root->val) root->left = insertNode(root->left, val);
    else root->right = insertNode(root->right, val);
    return root;
}

int main(void) {
    // 1) array + bubble sort (static size -> sizeof-known length)
    int arr[5] = {5, 2, 8, 1, 9};
    int n = 5;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                int t = arr[j]; arr[j] = arr[j + 1]; arr[j + 1] = t;
            }
        }
    }

    // 2) graph as adjacency matrix + iterative DFS
    int g[4][4] = {
        {0, 1, 1, 0},
        {1, 0, 0, 1},
        {1, 0, 0, 1},
        {0, 1, 1, 0},
    };
    int visited[4] = {0, 0, 0, 0};
    int stack[16];
    int top = 0;            /* stack pointer */
    int order[4];
    int cnt = 0;
    stack[top++] = 0;
    while (top > 0) {
        int u = stack[--top];
        if (visited[u]) continue;
        visited[u] = 1;
        order[cnt++] = u;
        for (int v = 3; v >= 0; v--) {
            if (g[u][v] == 1 && !visited[v]) stack[top++] = v;
        }
    }

    // 3) BST from struct + malloc (recursive insert) — exercises struct codegen + pointer chasing
    struct Node* root = NULL;
    int vals[5] = {4, 2, 6, 1, 3};
    for (int i = 0; i < 5; i++) {
        root = insertNode(root, vals[i]);
    }

    // 4) parallel arrays as a poor man's map -> memory fallback or arrays
    int keys[5];
    int counts[5];
    int m = 0;
    for (int i = 0; i < n; i++) {
        int found = 0;
        for (int k = 0; k < m; k++) {
            if (keys[k] == arr[i]) { counts[k]++; found = 1; break; }
        }
        if (!found) { keys[m] = arr[i]; counts[m] = 1; m++; }
    }

    printf("%d %d\n", cnt, counts[0]);
    return 0;
}
```

Notes:
- C variant uses `int stack[16]` + `top` index — rule 7's behavioral detection must recognize "array + monotone index used as top" (write the rule to accept index-tracked arrays, or accept `memory`/`array` rendering for C stacks and document).
- C# uses jagged `int[][]` (not `int[,]`) so the serializer's array path stays uniform; add a `int[,]` case to the serializer but keep it out of the golden fixture.
- These six files live at `TDTUOJ_backend/src/test/resources/visualizer/fixtures/{lang}/full_demo.{ext}` and double as: JUnit golden inputs, E2E smoke scripts (§9), and live defense demo material.

### 11.7 Edge-case fixture set (gap coverage — beyond the happy path)

The `full_demo` fixtures exercise the four core scenarios only. A second fixture set
covers the failure modes and ambiguous cases the demo must survive. One file per case,
Python first (reference language), other languages only where the behavior is
language-specific:

| Fixture | What it proves | Expected outcome |
|---|---|---|
| `stdin_sum.py` (+`.cpp`) | stdin plumbing through Judge0 | reads input, frames show parsed values, stdout panel shows result |
| `dp_table.py` | ambiguity: `dp[i][j]` square-ish numeric 2D | classifies **matrix** (not graph); with Gemini up, LLM label `dp-table` wins the tiebreak — THE classifier test |
| `linked_list.py` (+`.c`) | rule 2 — single `next` self-ref | **linkedlist** rendering, arrows follow next |
| `bfs_queue.py` (+`.java`) | rule 8 — push back / pop front | **queue** rendering |
| `frame_bomb.py` | >5000 frames (nested loop 100×100) | truncation marker frame + warning banner, UI stays responsive |
| `runtime_error.py` (+`.cpp` null deref) | crash mid-run | frames up to the crash + error text shown; C/C++ segfault = documented frame loss, UI shows graceful "no trace" not a spinner |
| `parse_fail.js` | unsupported syntax | HTTP 200 with `error: "Couldn't instrument…"`, never a 500 |
| `unicode_strings.py` | escaping robustness | strings with quotes/newlines/emoji don't break frame JSON |

Location: `TDTUOJ_backend/src/test/resources/visualizer/fixtures/edge/`.
JUnit asserts instrumentation survives each; runtime outcomes verified via the
tools/viz-test harness + §12 UI checklist.

---

## 12. Manual UI verification checklist (pre-defense)

Prerequisites: PostgreSQL :5431, Redis :6379, Judge0 :2358 running; `GEMINI_API_KEY`
set in `TDTUOJ_backend/.env` (optional — without it heuristics still work, the AI
badge just never appears).

```powershell
cd D:\OJ\TDTUOJ_backend; .\mvnw.cmd spring-boot:run     # :8090
cd D:\OJ\tdtuoj_frontend; npm run dev                   # :5173
```

Open any problem → code editor → paste a §11 fixture (match the editor language) →
click **Visualize**. Then walk this list:

**A. Core rendering (use `full_demo` fixture, each of the 6 languages)**
- [ ] `arr` renders as an array card; stepping through the bubble-sort swaps shows changed-index highlights
- [ ] `g` renders as a **graph** (4 nodes, 4 undirected edges) — no Graph class exists in the source
- [ ] `stack` renders as a stack; push/pop animates during DFS
- [ ] `root` renders as a **tree** with correct BST shape (4 → 2,6 → 1,3)
- [ ] `freq` lands in the MEMORY card as dict boxes with arrows
- [ ] scalars (`i`, `j`, `u`, `n`…) appear in the compact scalar strip, values update per step

**B. Trace navigation**
- [ ] code panel highlights current line (blue) and next line (yellow), follows playback
- [ ] CALL STACK strip appears during `insert` recursion, chips pile up (`global › insert › insert …`), innermost highlighted
- [ ] STDOUT panel fills incrementally with the step (Python/JS/Java/C#: `out_len` sync; C/C++: full output, documented)
- [ ] keyboard: `←`/`→` step, space play/pause; progress slider scrubs
- [ ] Play / Loop / Step modes all work; speed slider changes tempo

**C. Override & classification**
- [ ] "view as" dropdown on the `g` card: switch to *matrix* → re-renders instantly, NO new network request (check devtools)
- [ ] switch back to *auto* → graph returns
- [ ] with Gemini key set: run `dp_table.py` → `dp` shows **matrix/DP** with the purple **AI** badge; run same code again → response fast (Redis cache hit)
- [ ] without Gemini (kill key): everything still classifies via heuristics, no AI badge, no errors

**D. Failure modes (edge fixtures)**
- [ ] `frame_bomb.py` → warning banner "Trace truncated at 5000 steps", playback works
- [ ] `runtime_error.py` → frames up to the crash + red error box with traceback
- [ ] broken syntax (e.g. `function {{{` as JS) → friendly "Couldn't instrument" message, not a blank screen or 500
- [ ] compile error (C++ missing semicolon) → compiler message shown, line number matches the ORIGINAL source line (`#line` check)
- [ ] empty stdin program that reads input → TLE message after ~10 s, not an infinite spinner

**E. Cross-language sanity**
- [ ] same `full_demo` in all 6 languages produces the same classification table (graph/tree/stack/array/memory)
- [ ] language chip in the header matches the editor language

Any box unchecked = file it against the matching phase before the defense.

---

## 13. Next steps — closing the gaps (status as of 2026-06-07)

Manual UI testing through real Judge0 with the §11 `full_demo` fixtures is passing.
What remains, in priority order. Coverage tiers: **T1** = written fixtures (passing),
**T2** = §11.7 edge fixtures (planned, files not written), **T3** = implemented code
paths no fixture exercises (where bugs hide — the C `&g[0][0]` id-collision and the
Rhino-can't-parse-`class` pivot were both caught only because a fixture hit the path).

### Step 1 — commit the work (do first; everything below builds on it)
Large uncommitted change set: backend tracer package, frontend inference + renderers,
UI overhaul, light-mode button fixes, fixtures, tests, plan. Split into reviewable commits:
backend refactor / frontend refactor / UI overhaul / fixtures+tests / docs.

### Step 2 — resolve plan↔code drift (small, removes a thesis inconsistency) ✅ DONE 2026-06-08
- [x] **Rule 5 (edge list → graph)** implemented in `inferShape.js`: `isEdgeList`
      (uniform width-2/3 int pairs, small reused node ids, checked BEFORE rule 4 so
      uniform-width lists aren't misread as adjacency lists; rejects N×2 tables of
      unique values via the reused-id test) + `edgeListToGraph` (auto directed/undirected,
      optional weight from col 3). Sanity-checked with crafted frames (edge/weighted/
      table/adj-list) + `npm run build` green.

### Step 3 — Tier-3 fixtures: verify implemented-but-unexercised serializer paths
One `full_demo_2.{ext}` per language, validated with the local harness
(`tools/viz-test/README.md` workflow), covering:
- [ ] floats/doubles incl. a NaN (every language — `%g` formatting + JSON safety untested)
- [ ] sets (Python `set`, JS `Set`, Java `HashSet`, C# `HashSet`, C++ `std::set`)
- [ ] **C++ `std::stack` / `std::queue`** (protected-member-hack overloads never compiled against)
- [ ] C++ `pair` + `map<string,int>`; C# `int[,]` rectangular array
- [ ] adjacency LIST graph (rule 4: Python `dict[int]→list`, C++ ragged `vector<vector<int>>`)
- [ ] JS plain-object tree (`{val, left, right}` literals — `class:"Object"` tree path)
- [ ] C++ globals (CppTracer's global-tracking branch never exercised)
- [ ] negative numbers, jagged non-square 2D

### Step 4 — write the §11.7 edge fixtures (failure modes the demo must survive)
- [ ] stdin program; DP-table ambiguity (`dp_table.py` — THE Gemini classifier test);
      linked list (rule 2); BFS queue (rule 8); frame bomb (truncation banner);
      runtime error mid-run; parse failure (friendly message, never 500); unicode strings
- [ ] add all of Steps 3–4 to `TracerInstrumentationTest` (instrument-level) and the
      local runtime harness; new inference rules get cases in `tools/infer-test`

### Step 5 — finish the §12 UI checklist blocks not yet walked
(blocks A–B effectively covered by the user's manual `full_demo` testing — passing)
- [ ] C (override check): "view as" flip with no re-run; **AI badge + Redis cache hit with
      Gemini key; heuristics-only without key** ← only block needing live Gemini
- [ ] D (failure modes — needs Step 4 fixtures)
- [ ] E (cross-language classification parity in the UI, all 6)

### Step 5.5 — known scanner gaps (C/C++/C# line scanners; Java is AST-based, immune)
Brace-style audit (2026-06-07). Working: braced bodies, single-line/next-line unbraced
`if`/`while`/`for` bodies (snap lands safely AFTER the construct, skipped before `else`
and after `return`/`break`/`continue`), initializer-list braces, multi-line `for` headers.
Open gaps, fix in this order:
- [x] **Allman style — function `{` on its own line — C and C++** ✅ DONE 2026-06-08.
      Ported C#'s `pendingMethodBrace` mechanism to `CppTracer`/`CTracer` as
      `pendingFuncBrace` (FUNC_SIG = signature without trailing `{` and no `;`; the next
      line starting with `{` opens the body — insert guard after it, push `funcDepth` at
      the pre-open depth, add params at depth+1; a non-`{` non-blank next line clears the
      flag). `isFuncSig`/`opensFuncBody` feed a `funcStructure` flag that suppresses decl
      capture + statement snaps on the signature/open lines. JUnit `cppAllman`/`cAllman`
      (11/11) + end-to-end: instrumented Allman C++ `insertNode` (recursive) compiled with
      g++ 13 and emitted `"function":"insertNode"` frames; C full_demo still runs clean.
      **Hazard found & avoided**: I first broadened the keyword guard so struct/void-
      returning functions (e.g. C `struct Node* insertNode`) would also be detected — this
      SEGFAULTS at runtime. The base-case snap fires right after `nd = malloc(...)` but
      before `nd->left/right` are assigned; the generated `_viz_enc_Node` then chases an
      uninitialized pointer (`0xbaadf00d`). gdb backtrace confirmed. Reverted — struct/void-
      returning C functions stay uninstrumented (no regression: same-line ones never were
      either). This is likely why the 2026-06-07 attempt was reverted. C++ is unaffected in
      practice because it constructs via `new Node(val)` (atomic ctor), so its `Node*`-
      returning `insertNode` was always instrumented and is safe. Fixtures kept at
      `tools/viz-test/allman.{c,cpp}`. FOLLOW-UP (deferred): to safely trace struct-pointer-
      returning C functions, the serializer would need to not deep-chase pointer fields
      that may be uninitialized — no safe way to validate an arbitrary C pointer, so out
      of scope for now.
- [ ] **Multi-line C++ lambda bodies**: snaps inserted inside a lambda body reference
      outer-function vars the lambda doesn't capture → compile error. Single-line lambdas
      (sort comparators) are unaffected. Options: suppress snaps inside lambda bodies
      (track `](`-style lambda-open heuristically) or document as a limitation. Decide.
- [ ] `} while (c);` do-while tail gets no snap (line starts with `}`) — cosmetic only.

### Step 6 — hardening odds and ends
- [ ] Judge0 stderr size limit: measure frame payloads on a worst-case run; if
      truncated mid-stream, lower MAX_FRAMES or add `max_file_size` to the submission
- [ ] rate/abuse: `/api/visualize` runs untrusted code per click — confirm existing
      rate-limit buckets cover it like submissions
- [ ] remove or `.gitignore` dev artifacts: `tools/viz-test/*.exe|out.*|*.class`,
      `tools/*.bundle.mjs`

### Step 7 — thesis material (after code freeze)
- [ ] per-language capability matrix (capture depth / inferred kinds / documented limits)
- [ ] classifier accuracy table on ~30 labeled student programs (§10 evaluation)
- [ ] update architecture chapter with implementation deviations (acorn-in-Rhino,
      typed C captures, RAII/cleanup guards, frozen outer frames)
- [ ] screenshots of the VisuAlgo-style UI for the figures pipeline

**Definition of done**: Steps 1–5 complete + §12 checklist fully green = feature
complete for the defense. Step 6 before public deployment; Step 7 before thesis freeze.

---

## 14. Manual edge-case test programs (C/C++/C# formatting fixes — 2026-06-08)

Paste into the visualizer, pick the language, hit **Visualize**. The §11 `full_demo`
fixtures test semantic shapes (array/graph/tree/memory) — they do **not** exercise the
brace/lambda/signature fixes. These do. Each prints a deterministic line → instant
pass/fail. **Only C/C++/C# are affected by these fixes** (Python = no braces; Java =
JavaParser AST; JS = acorn AST — all already robust). The Python/Java/JS programs are
regression sanity only.

**Pass criteria**: correct stdout + no "couldn't instrument" error + per-iteration steps
on the braceless loop bodies + every helper function shows as its own call frame.

### C — braceless loops + if/else + do-while + `void` fn + multi-line signature → `15 2 3 3`

```c
#include <stdio.h>

void bump(int *x,
          int by) {          // multi-line sig + void fn
    *x += by;
}

int main() {
    int a[5] = {5, 2, 8, 1, 9};
    int n = 5, s = 0;

    for (int i = 0; i < n; i++)      // braceless nested loops
        for (int j = 0; j < n; j++)
            s += a[i] % 2;

    int evens = 0, odds = 0;
    for (int i = 0; i < n; i++)      // braceless if / else
        if (a[i] % 2 == 0)
            evens++;
        else
            odds++;

    int k = 0;
    do                                // braceless do-while + void call
        bump(&k, 1);
    while (k < 3);

    printf("%d %d %d %d\n", s, evens, odds, k);
    return 0;
}
```

### C++ — braceless + assigned multi-line lambda + multi-line signature → `45 3 2`

```cpp
#include <iostream>

int add(int a,
        int b) {              // multi-line sig
    int s = a + b;
    return s;
}

int main() {
    int total = 0;

    for (int i = 1; i <= 3; i++)     // braceless nested loops
        for (int j = 1; j <= 3; j++)
            total += i * j;

    auto sq = [](int x) {            // assigned lambda (used to break compile)
        int r = x * x;
        return r;
    };

    int p = 0, q = 0;
    for (int i = -2; i <= 2; i++)    // braceless if / else
        if (i >= 0)
            p++;
        else
            q++;

    std::cout << add(sq(3), total) << " " << p << " " << q << "\n";
    return 0;
}
```

### C# — braceless + assigned lambda + multi-line method signature → `45 3 2`

```csharp
using System;

class Program {
    static int Add(int a,
                   int b) {          // multi-line method sig
        int s = a + b;
        return s;
    }

    static void Main() {
        int total = 0;

        for (int i = 1; i <= 3; i++)     // braceless nested loops
            for (int j = 1; j <= 3; j++)
                total += i * j;

        Func<int,int> sq = x => {        // assigned lambda (used to break: CS0165)
            int r = x * x;
            return r;
        };

        int p = 0, q = 0;
        for (int i = -2; i <= 2; i++)    // braceless if / else
            if (i >= 0)
                p++;
            else
                q++;

        Console.WriteLine(Add(sq(3), total) + " " + p + " " + q);
    }
}
```

### Python / Java / JS — regression sanity (unaffected by the fixes), all → `45 3 2`

```python
def add(a, b):
    s = a + b
    return s

total = 0
for i in range(1, 4):
    for j in range(1, 4):
        total += i * j

p, q = 0, 0
for i in range(-2, 3):
    if i >= 0:
        p += 1
    else:
        q += 1

print(add(9, total), p, q)
```

```java
public class Main {
    static int add(int a, int b) { int s = a + b; return s; }
    public static void main(String[] args) {
        int total = 0;
        for (int i = 1; i <= 3; i++)
            for (int j = 1; j <= 3; j++)
                total += i * j;
        int p = 0, q = 0;
        for (int i = -2; i <= 2; i++)
            if (i >= 0) p++;
            else q++;
        System.out.println(add(9, total) + " " + p + " " + q);
    }
}
```

```javascript
function add(a, b) { let s = a + b; return s; }
let total = 0;
for (let i = 1; i <= 3; i++)
  for (let j = 1; j <= 3; j++)
    total += i * j;
let p = 0, q = 0;
for (let i = -2; i <= 2; i++)
  if (i >= 0) p++;
  else q++;
console.log(add(9, total), p, q);
```

> Automated coverage already exists: `TracerInstrumentationTest` (24 cases) asserts the
> same constructs at the instrumentation level. These programs are for **end-to-end UI**
> confirmation through real Judge0. No further code is required for the fixes — committing
> permanent `edge_demo.*` fixtures would only be a nice-to-have regression set (optional).
