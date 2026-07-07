// src/components/visualizer/renderers/GraphRenderer.jsx
// Frame shape:
//   { type: "graph", nodes: [{id, label?}], edges: [{from, to, weight?, directed?}],
//     visited?: id[], highlighted?: id[], current?: id, activeEdge?: [from, to] }
// Ports algorithm-visualizer's GraphRenderer: wheel-zoom + drag-pan, draggable nodes,
// switchable layouts (circle / tree / grid), per-state directed arrowheads.
import { useMemo, useRef, useState, useCallback } from "react";
import { V, MONO, Canvas, Legend, EmptyNote, onColor } from "./vizTheme";
import { fmt } from "./vizFormat";
import { useZoomPan, ZoomControls } from "./useZoomPan";

const NODE_R = 24;
const LAYOUTS = ["circle", "tree", "grid"];

// ── Deterministic layouts (ported from GraphTracer.layout*) ──────────────────
function layoutCircle(nodes, w, h) {
  const cx = w / 2, cy = h / 2;
  const r = Math.max(Math.min(cx, cy) - NODE_R - 24, 40);
  const pos = {};
  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    pos[n.id] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
  return pos;
}

function layoutTree(nodes, edges, w) {
  // BFS levels from the lowest-indegree roots; place by (depth, order-in-level).
  const adj = new Map(nodes.map((n) => [String(n.id), []]));
  const indeg = new Map(nodes.map((n) => [String(n.id), 0]));
  edges.forEach((e) => {
    const f = String(e.from), t = String(e.to);
    if (adj.has(f) && adj.has(t)) {
      adj.get(f).push(t);
      indeg.set(t, indeg.get(t) + 1);
      if (!e.directed) adj.get(t).push(f);
    }
  });
  const roots = nodes.filter((n) => indeg.get(String(n.id)) === 0).map((n) => String(n.id));
  const seed = roots.length ? roots : [String(nodes[0].id)];
  const level = new Map();
  const q = seed.map((id) => [id, 0]);
  seed.forEach((id) => level.set(id, 0));
  while (q.length) {
    const [id, d] = q.shift();
    for (const nb of adj.get(id) ?? []) {
      if (!level.has(nb)) {
        level.set(nb, d + 1);
        q.push([nb, d + 1]);
      }
    }
  }
  nodes.forEach((n) => {
    if (!level.has(String(n.id))) level.set(String(n.id), 0);
  });
  const byLevel = {};
  nodes.forEach((n) => {
    const d = level.get(String(n.id));
    (byLevel[d] ??= []).push(String(n.id));
  });
  const pos = {};
  const depths = Object.keys(byLevel).map(Number);
  const maxDepth = Math.max(...depths, 0);
  depths.forEach((d) => {
    const row = byLevel[d];
    row.forEach((id, i) => {
      pos[id] = {
        x: ((i + 1) * w) / (row.length + 1),
        y: NODE_R + 30 + d * (NODE_R * 2 + 46),
      };
    });
  });
  // keep numeric-id keys aligned with String() lookups
  const out = {};
  nodes.forEach((n) => (out[n.id] = pos[String(n.id)]));
  return { pos: out, height: NODE_R + 60 + maxDepth * (NODE_R * 2 + 46) };
}

function layoutGrid(nodes, w) {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const gap = NODE_R * 2 + 34;
  const pos = {};
  nodes.forEach((n, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    pos[n.id] = { x: NODE_R + 20 + c * gap, y: NODE_R + 20 + r * gap };
  });
  const rows = Math.ceil(nodes.length / cols);
  return { pos, width: cols * gap + 40, height: rows * gap + 40 };
}

export default function GraphRenderer({ frame }) {
  const [layoutKind, setLayoutKind] = useState("circle");
  const [dragPos, setDragPos] = useState({}); // id -> {x,y} user drag override
  const dragId = useRef(null);

  const nodes = frame?.nodes;
  const isEmpty = !frame || !Array.isArray(nodes) || nodes.length === 0;

  const {
    edges = [],
    visited = [],
    highlighted = [],
    current = null,
    activeEdge = null,
  } = frame ?? {};

  const size = Math.max(300, Math.min(720, (nodes?.length ?? 0) * 66));
  const W = size, H = size;

  const base = useMemo(() => {
    if (isEmpty) return { pos: {}, W, H };
    if (layoutKind === "tree") {
      const { pos, height } = layoutTree(nodes, edges, W);
      return { pos, W, H: Math.max(H, height) };
    }
    if (layoutKind === "grid") {
      const { pos, width, height } = layoutGrid(nodes, W);
      return { pos, W: Math.max(W, width), H: Math.max(200, height) };
    }
    return { pos: layoutCircle(nodes, W, H), W, H };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmpty, layoutKind, JSON.stringify(nodes?.map((n) => n.id)), JSON.stringify(edges), W, H]);

  const positions = useMemo(() => {
    const merged = {};
    for (const n of nodes ?? []) merged[n.id] = dragPos[n.id] ?? base.pos[n.id];
    return merged;
  }, [nodes, base.pos, dragPos]);

  const posRef = useRef(positions);
  posRef.current = positions;

  const onGrab = useCallback(
    (ux, uy) => {
      const hit = (nodes ?? []).find((n) => {
        const p = posRef.current[n.id];
        return p && Math.hypot(p.x - ux, p.y - uy) <= NODE_R + 4;
      });
      if (hit) {
        dragId.current = hit.id;
        return true;
      }
      return false;
    },
    [nodes],
  );
  const onDrag = useCallback((ux, uy) => {
    if (dragId.current != null) setDragPos((p) => ({ ...p, [dragId.current]: { x: ux, y: uy } }));
  }, []);
  const onDrop = useCallback(() => {
    dragId.current = null;
  }, []);

  const zp = useZoomPan({ onGrab, onDrag, onDrop });

  if (isEmpty) return <EmptyNote>No graph data in this frame.</EmptyNote>;

  const visitedSet = new Set(visited.map(String));
  const highlightedSet = new Set(highlighted.map(String));

  const fillOf = (id) => {
    if (current != null && String(id) === String(current)) return V.current;
    if (highlightedSet.has(String(id))) return V.highlight;
    if (visitedSet.has(String(id))) return V.visited;
    return V.node;
  };

  const isActiveEdge = (e) =>
    activeEdge &&
    ((String(activeEdge[0]) === String(e.from) && String(activeEdge[1]) === String(e.to)) ||
      (!e.directed &&
        String(activeEdge[0]) === String(e.to) &&
        String(activeEdge[1]) === String(e.from)));

  // an edge is "visited" once both its endpoints are visited (monotonic, so it
  // lights up progressively as the traversal advances — like GraphTracer's visitedCount)
  const isVisitedEdge = (e) =>
    visitedSet.has(String(e.from)) && visitedSet.has(String(e.to));

  const layoutBtn = (
    <div style={{ display: "flex", gap: 3, marginRight: 4 }}>
      {LAYOUTS.map((l) => (
        <button
          key={l}
          onClick={() => {
            setLayoutKind(l);
            setDragPos({});
          }}
          title={`${l} layout`}
          style={{
            padding: "3px 8px",
            borderRadius: 6,
            border: `1px solid ${layoutKind === l ? V.current : V.canvasBorder}`,
            background: layoutKind === l ? "#2a2010" : "#1b2942",
            color: layoutKind === l ? V.current : V.muted,
            fontSize: 10,
            fontFamily: MONO,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {l}
        </button>
      ))}
    </div>
  );

  return (
    <Canvas>
      <div style={{ position: "relative" }}>
        <ZoomControls reset={zp.reset} zoomBy={zp.zoomBy} extra={layoutBtn} />
        <svg
          ref={zp.ref}
          width="100%"
          height={Math.max(base.H, 200)}
          viewBox={`0 0 ${base.W} ${Math.max(base.H, 200)}`}
          preserveAspectRatio="xMidYMid meet"
          {...zp.handlers}
        >
          <defs>
            <marker id="viz-graph-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
              <path d="M0,0 L9,4.5 L0,9 z" fill={V.edge} />
            </marker>
            <marker id="viz-graph-arrow-active" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
              <path d="M0,0 L9,4.5 L0,9 z" fill={V.edgeActive} />
            </marker>
            <marker id="viz-graph-arrow-visited" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
              <path d="M0,0 L9,4.5 L0,9 z" fill={V.visited} />
            </marker>
          </defs>

          <g transform={zp.transform}>
            {/* Edges — draw grey first, then visited, then the active hop on top */}
            {[...edges]
              .sort((a, b) => {
                const rank = (e) => (isActiveEdge(e) ? 2 : isVisitedEdge(e) ? 1 : 0);
                return rank(a) - rank(b);
              })
              .map((e, i) => {
              const a = positions[e.from];
              const b = positions[e.to];
              if (!a || !b) return null;
              const active = isActiveEdge(e);
              const vis = !active && isVisitedEdge(e);
              const stroke = active ? V.edgeActive : vis ? V.visited : V.edge;
              const strokeWidth = active ? 3.5 : vis ? 3 : 2.5;
              const arrowKind = active ? "-active" : vis ? "-visited" : "";
              const dx = b.x - a.x, dy = b.y - a.y;
              const len = Math.hypot(dx, dy) || 1;
              const ux = dx / len, uy = dy / len;
              const x1 = a.x + ux * NODE_R, y1 = a.y + uy * NODE_R;
              const x2 = b.x - ux * (NODE_R + (e.directed ? 6 : 0));
              const y2 = b.y - uy * (NODE_R + (e.directed ? 6 : 0));
              const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
              return (
                <g key={i}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    style={{ transition: "stroke 0.15s ease" }}
                    markerEnd={e.directed ? `url(#viz-graph-arrow${arrowKind})` : undefined}
                  />
                  {e.weight != null && (
                    <>
                      <rect x={mx - 14} y={my - 11} width={28} height={20} rx={4} fill={V.canvas} stroke={V.canvasBorder} />
                      <text
                        x={mx}
                        y={my}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={V.muted}
                        fontSize={12}
                        fontFamily={MONO}
                        fontWeight={700}
                      >
                        {fmt(e.weight)}
                      </text>
                    </>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((n) => {
              const pos = positions[n.id];
              if (!pos) return null;
              const fill = fillOf(n.id);
              const isCurrent = current != null && String(n.id) === String(current);
              const label = n.label != null ? String(n.label) : fmt(n.id);
              return (
                <g key={n.id} style={{ cursor: "grab" }}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={NODE_R}
                    fill={fill}
                    stroke={fill === V.node ? V.nodeBorder : "#ffffff66"}
                    strokeWidth={isCurrent ? 3 : 2}
                    style={{ filter: isCurrent ? `drop-shadow(0 0 8px ${fill}cc)` : "none" }}
                  />
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={onColor(fill)}
                    fontSize={label.length > 3 ? 12 : label.length > 2 ? 14 : 16}
                    fontFamily={MONO}
                    fontWeight={700}
                    style={{ pointerEvents: "none" }}
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <Legend
        items={[
          current != null && { color: V.current, label: `Current: ${current}`, round: true },
          highlighted.length > 0 && { color: V.highlight, label: "Highlighted", round: true },
          visited.length > 0 && { color: V.visited, label: "Visited node" },
          edges.some((e) => isVisitedEdge(e)) && { color: V.visited, label: "Visited edge" },
          edges.some((e) => e.directed) && { color: V.edge, label: "Directed edge" },
        ]}
      />
      <div style={{ fontSize: 10, color: V.faint, marginTop: 6, fontFamily: MONO }}>
        scroll = zoom · drag node = move · drag canvas = pan
      </div>
    </Canvas>
  );
}
