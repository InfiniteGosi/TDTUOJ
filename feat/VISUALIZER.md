# Data Structure Visualizer — How It Works

> TDTUOJ's signature feature: paste any algorithm, see its data structures animate frame-by-frame.
>
> This document walks through every stage of the pipeline, from the moment the
> user clicks **Visualize** to the animated rendering on screen.

---

## High-Level Pipeline

```
┌──────────┐    POST /api/visualize     ┌────────────────────────────────────────────────────────────────────┐
│          │  { sourceCode, language,    │                          BACKEND                                  │
│ Frontend │    stdin }                  │                                                                    │
│ (React)  │ ──────────────────────────▶ │  ┌──────────────┐    ┌──────────┐    ┌──────────────────────────┐ │
│          │                             │  │ Tracer        │    │ Judge0   │    │ GeminiVariableClassifier │ │
│          │                             │  │ (instrument)  │───▶│ (execute)│    │ (LLM classify — async)  │ │
│          │                             │  └──────────────┘    └────┬─────┘    └────────────┬─────────────┘ │
│          │                             │                          │ stderr                  │               │
│          │                             │                     ┌────▼─────┐                   │               │
│          │                             │                     │ Parse    │                   │               │
│          │  { frames, stdout,          │                     │ Frames   │◀──────────────────┘               │
│          │    classifications }         │                     │ + Merge  │    (attach classifications)      │
│          │ ◀────────────────────────── │                     └──────────┘                                  │
└────┬─────┘                             └────────────────────────────────────────────────────────────────────┘
     │
     │  frames + classifications
     ▼
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│                                                                  │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────────────┐│
│  │ inferShape   │──▶│ RendererFact │──▶│ ArrayRenderer          ││
│  │ (heuristics  │   │ (pick viz)   │   │ TreeRenderer           ││
│  │  + LLM tags  │   │              │   │ GraphRenderer          ││
│  │  + overrides)│   │              │   │ LinkedListRenderer     ││
│  │              │   │              │   │ StackRenderer          ││
│  │              │   │              │   │ QueueRenderer          ││
│  │              │   │              │   │ MatrixRenderer         ││
│  │              │   │              │   │ ScatterRenderer        ││
│  │              │   │              │   │ MemoryModelRenderer    ││
│  └─────────────┘   └──────────────┘   └────────────────────────┘│
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │                   VisualizerPlayer                           ││
│  │   ⏮ ◀ ▶ Play ▶ ⏭   Step 14/200   Speed ●────    ← → keys ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

---

## Stage 1 — API Entry Point

**Endpoint:** `POST /api/visualize`
**Controller:** [`VisualizerController.java`](TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/visualizer/controller/VisualizerController.java)

### Request

```json
{
  "sourceCode": "def bubble_sort(arr):\n    n = len(arr)\n    ...",
  "language": "PYTHON",
  "stdin": "5\n3 1 4 1 5"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sourceCode` | string | Raw user code (max 50 KB) |
| `language` | enum | `PYTHON`, `JAVASCRIPT`, `JAVA`, `CPP`, `C`, `CSHARP` |
| `stdin` | string? | Optional test input fed to the program |

### Response

```json
{
  "statusCode": 200,
  "message": "Visualization complete",
  "data": {
    "frames": [ ... ],
    "stdout": "1 1 3 4 5",
    "error": null,
    "warning": null,
    "classifications": {
      "arr": { "role": "array", "confidence": 0.95 },
      "adj": { "role": "graph", "form": "adjacency-list", "directed": false, "confidence": 0.92 }
    },
    "language": "PYTHON"
  }
}
```

---

## Stage 2 — Instrumentation (Tracers)

**Interface:** [`Tracer.java`](TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/visualizer/service/tracer/Tracer.java)

The tracer's job: **rewrite the user's source code** so that when executed, it emits a JSON stream of execution frames on `stderr`, wrapped in `__FRAMES__[...]__END__` markers.

### Language-Specific Tracers

| Language | Tracer | Strategy |
|----------|--------|----------|
| **Python** | [`PythonTracer`](TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/visualizer/service/tracer/PythonTracer.java) | No source rewrite. Uses `sys.settrace()` — a built-in line-by-line tracing API. User code is embedded as base64 and `exec()`'d under the tracer. This is the cleanest approach. |
| **JavaScript** | [`JsTracer`](TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/visualizer/service/tracer/JsTracer.java) | Injects `_viz_snap()` calls after each statement via source transformation. |
| **Java** | [`JavaTracer`](TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/visualizer/service/tracer/JavaTracer.java) | Line-scan + inject snap calls + reflection-based serializer for objects. |
| **C++** | [`CppTracer`](TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/visualizer/service/tracer/CppTracer.java) | The most complex. Injects `_viz_snap()` after statements + RAII stack guards. Uses SFINAE template serializers for STL types + auto-generated serializers for user structs ([`StructCodegen`](TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/visualizer/service/tracer/StructCodegen.java)). |
| **C** | [`CTracer`](TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/visualizer/service/tracer/CTracer.java) | Similar to C++ but simpler (no templates, no STL). |
| **C#** | [`CSharpTracer`](TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/visualizer/service/tracer/CSharpTracer.java) | Injects snap calls + uses reflection for object serialization. |

### Python Tracer — Concrete Example

Given user code:
```python
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]

bubble_sort([3, 1, 4, 1, 5])
```

The `PythonTracer` wraps it in a ~200-line tracing preamble:

```python
import sys, json, base64, types

_viz_frames = []
_viz_step   = [0]
# ... (tracer internals: frame capturing, heap serialization) ...

def _viz_tracer(frame, event, arg):
    # called by CPython on every line/return/exception event
    # captures: step number, line number, call stack, local variables, heap state
    # appends a frame dict to _viz_frames
    ...

_viz_src = base64.b64decode('...base64 of user code...').decode('utf-8')
_viz_code = compile(_viz_src, '<viz>', 'exec')
sys.settrace(_viz_tracer)
exec(_viz_code, {'__name__': '__main__'})
# on exit → dumps _viz_frames as JSON to stderr between __FRAMES__ and __END__
```

Key: the user code is compiled with filename `<viz>` so `sys.settrace` only captures user lines (not preamble).

### C++ Tracer — Concrete Example

Given user code:
```cpp
#include <bits/stdc++.h>
using namespace std;
int main() {
    vector<int> arr = {3, 1, 4, 1, 5};
    int n = arr.size();
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n-i-1; j++)
            if (arr[j] > arr[j+1])
                swap(arr[j], arr[j+1]);
}
```

The `CppTracer`:
1. Prepends a ~300-line C++ preamble with SFINAE template serializers for `int`, `string`, `vector`, `map`, `set`, `stack`, `queue`, pairs, C arrays, and a catch-all
2. Inserts `_VizGuard _viz_g_("main");` at function entry (RAII — pops on scope exit, exception-safe)
3. Inserts `_viz_snap(line, "arr", arr, "n", n, "i", i, "j", j);` after each statement
4. Uses [`BraceSynthesizer`](TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/visualizer/service/tracer/BraceSynthesizer.java) to normalize braceless `if`/`for`/`while` bodies
5. Runs [`StructCodegen`](TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/visualizer/service/tracer/StructCodegen.java) to find `struct`/`class` definitions and generate field-level serializers so Node* pointers are followed into trees/linked lists
6. Uses `#line` directives to keep compiler errors pointing at the user's original lines

---

## Stage 3 — Sandbox Execution (Judge0)

**Orchestrator:** [`VisualizerServiceImpl.java`](TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/visualizer/service/VisualizerServiceImpl.java)

The instrumented code is submitted to Judge0 synchronously (`wait=true`):

```
POST http://judge0:2358/submissions?base64_encoded=true&wait=true
{
  "source_code": "<base64 of instrumented code>",
  "language_id": 71,        // Python
  "stdin":       "<base64>",
  "cpu_time_limit": 10.0,   // generous — instrumentation multiplies work
  "memory_limit": 262144    // 256 MB
}
```

Judge0 executes the code in an isolated container and returns:
- **stdout** — the user's normal program output
- **stderr** — contains `__FRAMES__[{...}, {...}, ...]__END__` (the frame stream)
- **status** — Accepted, TLE, CE, etc.

The service parses stderr to extract the JSON array between the markers. Everything outside the markers is treated as the user's runtime error output.

### Safety Limits

| Limit | Value | Enforced by |
|-------|-------|-------------|
| Max frames | 5,000 | Tracer self-disables after cap; appends `{truncated: true}` |
| Max heap entries/frame | 200 | Tracer serializer |
| Max container elements | 1,000 | Tracer serializer |
| Max string length | 256 chars | Tracer serializer |
| Max nesting depth | 8 | Tracer serializer |
| Max code size | 50 KB | `VisualizerServiceImpl` validation |
| CPU time limit | 10 seconds | Judge0 sandbox |
| Memory limit | 256 MB | Judge0 sandbox |

---

## Stage 4 — LLM Variable Classification (Concurrent)

**Interface:** [`VariableClassifier.java`](TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/visualizer/service/classifier/VariableClassifier.java)
**Implementation:** [`GeminiVariableClassifier.java`](TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/visualizer/service/classifier/GeminiVariableClassifier.java)

While Judge0 executes the code, the backend **concurrently** sends the raw source to Gemini 2.5 Flash with a structured prompt:

```
System: You label variables in a program for a data-structure visualizer.
        For each variable that holds a data structure, decide its semantic
        role from how the CODE uses it...

        role must be one of: graph, tree, linked-list, stack, queue,
        dp-table, matrix, array, other

        form (only for graphs): adjacency-matrix, adjacency-list, edge-list
        directed (only for graphs): true/false

User:   Language: PYTHON

        ```
        def bfs(adj, start):
            visited = [False] * len(adj)
            queue = [start]
            ...
        ```
```

**Response (temperature=0, JSON mode):**

```json
{
  "adj":     { "role": "graph", "form": "adjacency-list", "directed": false, "confidence": 0.95 },
  "visited": { "role": "array", "confidence": 0.8 },
  "queue":   { "role": "queue", "confidence": 0.9 }
}
```

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Best-effort, never blocks** | Hard 3-second budget (`CLASSIFIER_BUDGET_MS`). Timeout/failure → empty map → frontend heuristics carry the run |
| **Cached in Redis** | Key = SHA-256 of (language + source). Same code costs zero tokens on re-run. TTL: 24 hours |
| **Runs concurrently** | `CompletableFuture` — starts when instrumentation begins, result awaited after Judge0 returns |
| **Strict parsing** | Only entries with a valid `role` string survive. Bad labels can't crash inference |

---

## Stage 5 — Uniform Frame Schema

Every tracer (Python, C++, Java, etc.) emits frames in the **same schema**, regardless of language. This is what the frontend receives:

```json
{
  "step": 12,
  "line": 10,
  "event": "line",
  "out_len": 34,
  "stack": [
    {
      "function": "main",
      "line": 42,
      "locals": { "n": 5, "root": "@1" }
    },
    {
      "function": "insert",
      "line": 10,
      "locals": { "cur": "@3", "val": 7 }
    }
  ],
  "heap": {
    "1": {
      "type": "object",
      "class": "Node",
      "fields": { "val": 5, "left": "@2", "right": null }
    },
    "2": {
      "type": "object",
      "class": "Node",
      "fields": { "val": 3, "left": null, "right": null }
    },
    "4": {
      "type": "list",
      "values": [1, 2, "@5"]
    },
    "5": {
      "type": "dict",
      "entries": [["a", 1], ["b", 2]]
    }
  }
}
```

### Schema Rules

- **Primitives** (int, float, bool, short strings) are inlined in `locals`
- **Compound values** (lists, dicts, objects, sets) become `heap` entries, referenced as `"@<id>"` strings
- **Heap IDs are stable** across frames (same object identity → same ID) so the frontend can animate the same node moving/changing
- **Serializers are cycle-safe** — revisits emit the ref string only (no infinite recursion)
- **`out_len`** tracks cumulative stdout length at each step, so the player can sync output display with execution progress

---

## Stage 6 — Frontend Shape Inference

**Module:** [`inferShape.js`](tdtuoj_frontend/src/components/visualizer/inference/inferShape.js)

The frontend must decide: *"Is variable `adj` an array, a graph, a tree, or something else?"* It uses a three-tier precedence system:

```
User "view as" override  >  LLM label (confidence ≥ 0.7)  >  Heuristic rule
```

### Heuristic Rules (first match wins)

| # | Rule | Detection Logic | Result |
|---|------|----------------|--------|
| 1 | Object graph with 2 self-referencing fields (`left`/`right`) | Walk heap, find objects of same class pointing to each other. Acyclic + 2 link fields. | `tree` |
| 2 | Object chain with 1 self-referencing field (`next`) | Same walk, but only 1 link field. | `linkedlist` |
| 3 | N×N zero-diagonal matrix | Square, all entries numeric, diagonal is zero, some non-zero entries. | `graph` (adj. matrix) |
| 4 | Array of int-lists, values < N | Each sub-array's values are valid node indices. Variable row lengths. | `graph` (adj. list) |
| 5 | List of [u,v] or [u,v,w] pairs | Uniform width 2 or 3, small reused integer IDs. | `graph` (edge list) |
| 5.5 | List of [x,y] coordinate pairs | Non-integer or negative values (distinguishes from edge lists). | `scatter` |
| 6 | 2D primitive array | Rectangular, all values primitive. | `matrix` |
| 7 | 1D list — only tail mutations across frames | **Behavioral**: sample ~80 frames, detect push/pop at back only (LIFO). | `stack` |
| 8 | 1D list — pushed at back, popped at front | **Behavioral**: detect FIFO access pattern across frames. | `queue` |
| 9 | 1D primitive array | Flat list of numbers/strings/booleans. | `array` |
| 10 | Everything else | — | `memory` (raw heap view) |

### LLM Label Override

If the Gemini classifier returned `{ "adj": { "role": "graph", "form": "adjacency-list", "confidence": 0.95 } }`, and confidence ≥ 0.7, the LLM label overrides the heuristic. The user's "view as" dropdown always has final say.

### Sibling-Variable Correlation (for graphs)

When a graph's adjacency structure doesn't change across frames (it's constant), the **traversal progress** lives in other variables. The inference engine automatically detects:

- **Current node**: a scalar named `u`, `v`, `node`, `cur`, etc. whose integer value is a valid node ID
- **Visited set**: a boolean array of length N, or a list named `visited`/`seen`

These are attached to the graph frame so the renderer can highlight the walk — no explicit `graph.visit(u)` annotation needed.

---

## Stage 7 — Rendering (D3.js + React)

**Player:** [`VisualizerPlayer.jsx`](tdtuoj_frontend/src/components/visualizer/VisualizerPlayer.jsx)
**Router:** [`RendererFactory.jsx`](tdtuoj_frontend/src/components/visualizer/renderers/RendererFactory.jsx)

The player partitions each frame's variables into three groups:

| Group | Condition | Display |
|-------|-----------|---------|
| **Scalars** | Primitive, non-ref value | Compact pills: `n = 5`, `i = 3` |
| **Structure cards** | Recognized kind (array/tree/graph/...) | Full renderer with "view as" dropdown |
| **Memory fallback** | Unrecognized compound value | Generic heap explorer (MemoryModelRenderer) |

### Available Renderers

| Renderer | Visualization | Highlights |
|----------|--------------|------------|
| [`ArrayRenderer`](tdtuoj_frontend/src/components/visualizer/renderers/ArrayRenderer.jsx) | Indexed horizontal cells | Changed indices glow on step |
| [`MatrixRenderer`](tdtuoj_frontend/src/components/visualizer/renderers/MatrixRenderer.jsx) | Grid with cell coloring | Changed cells highlighted |
| [`StackRenderer`](tdtuoj_frontend/src/components/visualizer/renderers/StackRenderer.jsx) | Vertical LIFO blocks, top marked | Pushed element animates in |
| [`QueueRenderer`](tdtuoj_frontend/src/components/visualizer/renderers/QueueRenderer.jsx) | Horizontal FIFO with front/back markers | Enqueued element animates in |
| [`LinkedListRenderer`](tdtuoj_frontend/src/components/visualizer/renderers/LinkedListRenderer.jsx) | Nodes with → arrows | Current node highlighted |
| [`TreeRenderer`](tdtuoj_frontend/src/components/visualizer/renderers/TreeRenderer.jsx) | D3 tree layout with links | New/changed nodes highlighted |
| [`GraphRenderer`](tdtuoj_frontend/src/components/visualizer/renderers/GraphRenderer.jsx) | D3 force-directed layout | Visited nodes, active edge, current node |
| [`ScatterRenderer`](tdtuoj_frontend/src/components/visualizer/renderers/ScatterRenderer.jsx) | 2D scatter plot | — |
| [`MemoryModelRenderer`](tdtuoj_frontend/src/components/visualizer/renderers/MemoryModelRenderer.jsx) | Raw heap explorer (Python Tutor style) | — |

### Player Controls

```
⏮ ◀  ▶ Play  ▶ ⏭     Step 14 / 200     Speed ●────
```

- **Three modes**: Play (once), Loop (continuous), Step (manual ← →)
- **Keyboard**: Arrow keys or A/D to step, Space to play/pause
- **Speed**: exponential curve — `delay = 4000 / exp(speed)`, range 40ms → 4s
- **Scrubber**: drag the range slider to jump to any frame
- **Stdout sync**: output display shows only what the program has printed *up to* the current step (`out_len`)

---

## Concrete End-to-End Example: BFS on a Graph

### User writes:

```python
from collections import deque

def bfs(adj, start):
    visited = [False] * len(adj)
    queue = deque([start])
    visited[start] = True
    while queue:
        u = queue.popleft()
        for v in adj[u]:
            if not visited[v]:
                visited[v] = True
                queue.append(v)

adj = [[1,2], [0,3], [0,4], [1], [2]]
bfs(adj, 0)
```

### What happens:

1. **Tracer** wraps code in `sys.settrace` preamble (no source rewrite for Python)
2. **Judge0** executes → produces ~30 frames on stderr, each capturing `adj`, `visited`, `queue`, `u`, `v` and their values at every line
3. **Gemini** (concurrent) classifies: `adj → graph (adjacency-list)`, `queue → queue`, `visited → array`
4. **Frontend inference** confirms:
   - `adj` → heuristic rule 4 (array of int-lists, values valid indices) → **graph**
   - `queue` → behavioral rule 8 (pushed at back, popped at front) → **queue**
   - `visited` → heuristic rule 9 (1D boolean array) → **array**
   - `u`, `v` → scalars
5. **Sibling correlation** detects `u` as the current node (valid graph index, changes each step) and `visited` as the visited mask → attaches to graph frame
6. **Renderers** display:
   - `adj` → **GraphRenderer** with force-directed layout, current node highlighted, visited nodes dimmed, active edge animated
   - `queue` → **QueueRenderer** with front/back markers
   - `visited` → **ArrayRenderer** with changed index glowing
   - `u = 3`, `v = 1` → scalar pills

---

## File Map

### Backend (`TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/visualizer/`)

```
visualizer/
├── controller/
│   └── VisualizerController.java       # POST /api/visualize endpoint
├── service/
│   ├── VisualizerService.java          # Interface
│   ├── VisualizerServiceImpl.java      # Orchestrator: instrument → execute → parse → classify
│   ├── tracer/
│   │   ├── Tracer.java                 # Interface + uniform frame schema
│   │   ├── PythonTracer.java           # sys.settrace approach (no source rewrite)
│   │   ├── JsTracer.java              # Statement-level snap injection
│   │   ├── JavaTracer.java            # Snap injection + reflection serializer
│   │   ├── CppTracer.java             # SFINAE templates + RAII guards + struct codegen
│   │   ├── CTracer.java              # Simpler C variant
│   │   ├── CSharpTracer.java         # Snap injection + reflection
│   │   ├── StructCodegen.java         # Generates C++ field serializers for user structs
│   │   ├── BraceSynthesizer.java      # Normalizes braceless if/for/while blocks
│   │   └── TracerException.java       # Instrumentation failure
│   └── classifier/
│       ├── VariableClassifier.java     # Interface: async classify(source, language)
│       ├── GeminiVariableClassifier.java  # Gemini Flash + Redis cache
│       └── NoopVariableClassifier.java    # Fallback when no API key
├── VisualizerRequest.java              # { sourceCode, language, stdin }
└── VisualizerResponse.java             # { frames, stdout, error, warning, classifications }
```

### Frontend (`tdtuoj_frontend/src/components/visualizer/`)

```
visualizer/
├── VisualizerModal.jsx                 # Modal wrapper (code editor + player)
├── VisualizerPlayer.jsx                # Playback controls + variable partitioning
├── theme.js                            # Color tokens
├── inference/
│   ├── inferShape.js                   # 10-rule heuristic + LLM merge + behavioral analysis
│   └── materialize.js                  # Dereference heap refs into plain JS values
└── renderers/
    ├── RendererFactory.jsx             # Routes frame.type → correct renderer
    ├── ArrayRenderer.jsx               # Indexed cells with diff highlighting
    ├── MatrixRenderer.jsx              # 2D grid
    ├── StackRenderer.jsx               # Vertical LIFO
    ├── QueueRenderer.jsx               # Horizontal FIFO
    ├── LinkedListRenderer.jsx          # Node chain with arrows
    ├── TreeRenderer.jsx                # D3 tree layout
    ├── GraphRenderer.jsx               # D3 force-directed graph
    ├── ScatterRenderer.jsx             # 2D scatter plot
    ├── MemoryModelRenderer.jsx         # Raw heap explorer (fallback)
    ├── vizTheme.jsx                    # Renderer color/spacing tokens
    ├── vizFormat.js                    # Value formatting helpers
    └── useZoomPan.jsx                  # Pan/zoom for graph/tree SVGs
```
