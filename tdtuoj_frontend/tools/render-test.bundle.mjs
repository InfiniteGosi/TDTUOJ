// tools/render-test.jsx
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";

// src/components/visualizer/renderers/vizTheme.jsx
import { jsx, jsxs } from "react/jsx-runtime";
var V = {
  // stage
  canvas: "#101b2d",
  canvasBorder: "#24344e",
  // text on canvas
  text: "#f2f6fc",
  muted: "#90a6c0",
  faint: "#566c87",
  // nodes (solid fills, VisuAlgo style)
  node: "#3c5878",
  // default — white text
  nodeBorder: "#6f8cad",
  nodeText: "#ffffff",
  current: "#ff8f1f",
  // orange — the element being processed (dark text)
  highlight: "#f6c10a",
  // amber — marked/compared (dark text)
  visited: "#9b6dd6",
  // violet — already seen (white text)
  sorted: "#2fbf71",
  // green — done/sorted (dark text)
  swap: "#ff5252",
  // red — swapped/removed (white text)
  darkText: "#15202e",
  // bars & edges
  bar: "#4fc3f7",
  edge: "#5d7ca0"
};
V.edgeActive = V.current;
var MONO = "'JetBrains Mono', monospace";
function onColor(fill) {
  return fill === V.current || fill === V.highlight || fill === V.sorted || fill === V.bar ? V.darkText : "#ffffff";
}
function Canvas({ children, style = {}, pad = 18 }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      style: {
        background: V.canvas,
        border: `1px solid ${V.canvasBorder}`,
        borderRadius: 10,
        padding: pad,
        margin: 10,
        overflow: "auto",
        ...style
      },
      children
    }
  );
}
function Legend({ items }) {
  const visible = items.filter(Boolean);
  if (visible.length === 0) return null;
  return /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }, children: visible.map(({ color, label, round }) => /* @__PURE__ */ jsxs(
    "div",
    {
      style: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: V.muted },
      children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            style: {
              width: 12,
              height: 12,
              borderRadius: round ? "50%" : 3,
              backgroundColor: color
            }
          }
        ),
        label
      ]
    },
    label
  )) });
}
function EmptyNote({ children }) {
  return /* @__PURE__ */ jsx(Canvas, { children: /* @__PURE__ */ jsx("div", { style: { color: V.muted, fontSize: 14, textAlign: "center", padding: 8 }, children }) });
}

// src/components/visualizer/renderers/ArrayRenderer.jsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function ArrayRenderer({ frame }) {
  if (!frame || !Array.isArray(frame.data)) {
    return /* @__PURE__ */ jsx2(EmptyNote, { children: "No array data in this frame." });
  }
  const { data, highlighted = [], sorted = [], swapped = [] } = frame;
  const numeric = data.every((v) => typeof v === "number");
  const maxVal = numeric ? Math.max(...data.map(Math.abs), 1) : 1;
  const n = data.length;
  const cellFont = n > 20 ? 12 : n > 12 ? 14 : 16;
  const fillOf = (i) => {
    if (swapped.includes(i)) return V.swap;
    if (highlighted.includes(i)) return V.current;
    if (sorted.includes(i)) return V.sorted;
    return V.bar;
  };
  return /* @__PURE__ */ jsxs2(Canvas, { children: [
    numeric && /* @__PURE__ */ jsx2(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "flex-end",
          gap: n > 24 ? 2 : 4,
          height: 150,
          marginBottom: 12
        },
        children: data.map((val, i) => {
          const fill = fillOf(i);
          const active = swapped.includes(i) || highlighted.includes(i);
          const heightPct = Math.max(Math.abs(val) / maxVal * 100, 5);
          return /* @__PURE__ */ jsxs2(
            "div",
            {
              style: {
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                height: "100%",
                minWidth: 14
              },
              children: [
                n <= 30 && /* @__PURE__ */ jsx2(
                  "div",
                  {
                    style: {
                      fontSize: n > 20 ? 11 : 13,
                      color: active ? fill : V.muted,
                      marginBottom: 3,
                      fontFamily: MONO,
                      fontWeight: 700
                    },
                    children: val
                  }
                ),
                /* @__PURE__ */ jsx2(
                  "div",
                  {
                    style: {
                      width: "100%",
                      height: `${heightPct}%`,
                      backgroundColor: fill,
                      borderRadius: "4px 4px 0 0",
                      transition: "height 0.15s ease, background-color 0.15s ease",
                      boxShadow: active ? `0 0 10px ${fill}aa` : "none"
                    }
                  }
                )
              ]
            },
            i
          );
        })
      }
    ),
    /* @__PURE__ */ jsx2("div", { style: { display: "flex", gap: n > 24 ? 2 : 4 }, children: data.map((val, i) => {
      const active = highlighted.includes(i) || swapped.includes(i) || sorted.includes(i);
      const fill = fillOf(i);
      return /* @__PURE__ */ jsxs2(
        "div",
        {
          style: {
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            minWidth: 26
          },
          children: [
            /* @__PURE__ */ jsx2(
              "div",
              {
                style: {
                  width: "100%",
                  minHeight: 42,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `2px solid ${active ? fill : V.nodeBorder}`,
                  borderRadius: 6,
                  backgroundColor: active ? fill : V.node,
                  fontSize: cellFont,
                  fontFamily: MONO,
                  fontWeight: 700,
                  color: active ? onColor(fill) : V.nodeText,
                  transition: "all 0.15s ease",
                  boxShadow: active ? `0 0 10px ${fill}66` : "none",
                  overflow: "hidden",
                  padding: "0 2px"
                },
                children: String(val)
              }
            ),
            /* @__PURE__ */ jsx2("div", { style: { fontSize: 11, color: V.faint, fontFamily: MONO }, children: i })
          ]
        },
        i
      );
    }) }),
    /* @__PURE__ */ jsx2(
      Legend,
      {
        items: [
          highlighted.length > 0 && { color: V.current, label: "Highlighted" },
          swapped.length > 0 && { color: V.swap, label: "Swapped" },
          sorted.length > 0 && { color: V.sorted, label: "Sorted" }
        ]
      }
    )
  ] });
}

// src/components/visualizer/renderers/TreeRenderer.jsx
import { useMemo } from "react";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var NODE_R = 26;
var V_GAP = 58;
var H_GAP = 16;
function buildLayout(nodes) {
  if (!nodes || nodes.length === 0)
    return { positions: {}, width: 0, height: 0, edges: [] };
  const map = {};
  nodes.forEach((n) => {
    map[n.id] = n;
  });
  const childIds = /* @__PURE__ */ new Set();
  nodes.forEach((n) => {
    if (n.left != null) childIds.add(n.left);
    if (n.right != null) childIds.add(n.right);
  });
  const roots = nodes.filter((n) => !childIds.has(n.id));
  if (roots.length === 0)
    return { positions: {}, width: 0, height: 0, edges: [] };
  const root = roots[0];
  const depth = {};
  const subtreeW = {};
  const order = [];
  function dfs(id, d) {
    if (id == null || !map[id]) return 0;
    depth[id] = d;
    order.push(id);
    const node = map[id];
    const lw = dfs(node.left, d + 1);
    const rw = dfs(node.right, d + 1);
    const w = Math.max(lw + rw + H_GAP, NODE_R * 2 + H_GAP);
    subtreeW[id] = w;
    return w;
  }
  dfs(root.id, 0);
  const x = {};
  function assignX(id, left) {
    if (id == null || !map[id]) return;
    const node = map[id];
    const lw = node.left != null && map[node.left] ? subtreeW[node.left] : 0;
    x[id] = left + lw + NODE_R;
    assignX(node.left, left);
    assignX(node.right, left + lw + H_GAP + NODE_R * 2);
  }
  assignX(root.id, 0);
  const positions = {};
  order.forEach((id) => {
    positions[id] = {
      x: x[id] + NODE_R,
      y: depth[id] * (NODE_R * 2 + V_GAP) + NODE_R + 10
    };
  });
  const edges = [];
  nodes.forEach((n) => {
    if (n.left != null && map[n.left] && positions[n.id] && positions[n.left])
      edges.push({ from: n.id, to: n.left });
    if (n.right != null && map[n.right] && positions[n.id] && positions[n.right])
      edges.push({ from: n.id, to: n.right });
  });
  const allX = Object.values(positions).map((p) => p.x);
  const allY = Object.values(positions).map((p) => p.y);
  const width = Math.max(...allX) + NODE_R + 20;
  const height = Math.max(...allY) + NODE_R + 20;
  return { positions, width, height, edges };
}
function TreeRenderer({ frame }) {
  if (!frame || !Array.isArray(frame.nodes) || frame.nodes.length === 0) {
    return /* @__PURE__ */ jsx3(EmptyNote, { children: "No tree data in this frame." });
  }
  const { nodes, highlighted = [], current = null } = frame;
  const { positions, width, height, edges } = useMemo(
    () => buildLayout(nodes),
    [JSON.stringify(nodes)]
  );
  const fillOf = (id) => {
    if (current != null && String(id) === String(current)) return V.current;
    if (highlighted.map(String).includes(String(id))) return V.highlight;
    return V.node;
  };
  return /* @__PURE__ */ jsxs3(Canvas, { children: [
    /* @__PURE__ */ jsxs3(
      "svg",
      {
        width: Math.max(width, 200),
        height: Math.max(height, 100),
        style: { display: "block", margin: "0 auto" },
        children: [
          edges.map((e, i) => {
            const from = positions[e.from];
            const to = positions[e.to];
            if (!from || !to) return null;
            return /* @__PURE__ */ jsx3(
              "line",
              {
                x1: from.x,
                y1: from.y,
                x2: to.x,
                y2: to.y,
                stroke: V.edge,
                strokeWidth: 2.5
              },
              i
            );
          }),
          nodes.map((n) => {
            const pos = positions[n.id];
            if (!pos) return null;
            const fill = fillOf(n.id);
            const isCurrent = current != null && String(n.id) === String(current);
            const label = n.val == null ? "\xB7" : String(n.val);
            return /* @__PURE__ */ jsxs3("g", { children: [
              /* @__PURE__ */ jsx3(
                "circle",
                {
                  cx: pos.x,
                  cy: pos.y,
                  r: NODE_R,
                  fill,
                  stroke: fill === V.node ? V.nodeBorder : "#ffffff66",
                  strokeWidth: isCurrent ? 3 : 2,
                  style: {
                    filter: isCurrent ? `drop-shadow(0 0 8px ${fill}cc)` : "none"
                  }
                }
              ),
              /* @__PURE__ */ jsx3(
                "text",
                {
                  x: pos.x,
                  y: pos.y,
                  textAnchor: "middle",
                  dominantBaseline: "central",
                  fill: onColor(fill),
                  fontSize: label.length > 3 ? 12 : label.length > 2 ? 14 : 16,
                  fontFamily: MONO,
                  fontWeight: 700,
                  children: label
                }
              )
            ] }, n.id);
          })
        ]
      }
    ),
    /* @__PURE__ */ jsx3(
      Legend,
      {
        items: [
          current != null && { color: V.current, label: `Current: ${current}`, round: true },
          highlighted.length > 0 && { color: V.highlight, label: "Highlighted", round: true }
        ]
      }
    )
  ] });
}

// src/components/visualizer/renderers/GraphRenderer.jsx
import { useMemo as useMemo2 } from "react";
import { Fragment, jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
var NODE_R2 = 24;
function layout(nodes, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.max(Math.min(cx, cy) - NODE_R2 - 24, 40);
  const pos = {};
  nodes.forEach((n, i) => {
    const angle = 2 * Math.PI * i / nodes.length - Math.PI / 2;
    pos[n.id] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
  return pos;
}
function GraphRenderer({ frame }) {
  if (!frame || !Array.isArray(frame.nodes) || frame.nodes.length === 0) {
    return /* @__PURE__ */ jsx4(EmptyNote, { children: "No graph data in this frame." });
  }
  const {
    nodes,
    edges = [],
    visited = [],
    highlighted = [],
    current = null,
    activeEdge = null
  } = frame;
  const size = Math.max(280, Math.min(460, nodes.length * 64));
  const W = size, H = size;
  const positions = useMemo2(
    () => layout(nodes, W, H),
    [JSON.stringify(nodes.map((n) => n.id)), W, H]
  );
  const visitedSet = new Set(visited.map(String));
  const highlightedSet = new Set(highlighted.map(String));
  const fillOf = (id) => {
    if (current != null && String(id) === String(current)) return V.current;
    if (highlightedSet.has(String(id))) return V.highlight;
    if (visitedSet.has(String(id))) return V.visited;
    return V.node;
  };
  const isActiveEdge = (e) => activeEdge && (String(activeEdge[0]) === String(e.from) && String(activeEdge[1]) === String(e.to) || !e.directed && String(activeEdge[0]) === String(e.to) && String(activeEdge[1]) === String(e.from));
  return /* @__PURE__ */ jsxs4(Canvas, { children: [
    /* @__PURE__ */ jsxs4("svg", { width: W, height: H, style: { display: "block", margin: "0 auto" }, children: [
      /* @__PURE__ */ jsxs4("defs", { children: [
        /* @__PURE__ */ jsx4(
          "marker",
          {
            id: "viz-graph-arrow",
            markerWidth: "9",
            markerHeight: "9",
            refX: "8",
            refY: "4.5",
            orient: "auto",
            children: /* @__PURE__ */ jsx4("path", { d: "M0,0 L9,4.5 L0,9 z", fill: V.edge })
          }
        ),
        /* @__PURE__ */ jsx4(
          "marker",
          {
            id: "viz-graph-arrow-active",
            markerWidth: "9",
            markerHeight: "9",
            refX: "8",
            refY: "4.5",
            orient: "auto",
            children: /* @__PURE__ */ jsx4("path", { d: "M0,0 L9,4.5 L0,9 z", fill: V.edgeActive })
          }
        )
      ] }),
      edges.map((e, i) => {
        const a = positions[e.from];
        const b = positions[e.to];
        if (!a || !b) return null;
        const active = isActiveEdge(e);
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        const x1 = a.x + ux * NODE_R2, y1 = a.y + uy * NODE_R2;
        const x2 = b.x - ux * (NODE_R2 + (e.directed ? 6 : 0));
        const y2 = b.y - uy * (NODE_R2 + (e.directed ? 6 : 0));
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        return /* @__PURE__ */ jsxs4("g", { children: [
          /* @__PURE__ */ jsx4(
            "line",
            {
              x1,
              y1,
              x2,
              y2,
              stroke: active ? V.edgeActive : V.edge,
              strokeWidth: active ? 3.5 : 2.5,
              markerEnd: e.directed ? `url(#viz-graph-arrow${active ? "-active" : ""})` : void 0
            }
          ),
          e.weight != null && /* @__PURE__ */ jsxs4(Fragment, { children: [
            /* @__PURE__ */ jsx4(
              "rect",
              {
                x: mx - 14,
                y: my - 11,
                width: 28,
                height: 20,
                rx: 4,
                fill: V.canvas,
                stroke: V.canvasBorder
              }
            ),
            /* @__PURE__ */ jsx4(
              "text",
              {
                x: mx,
                y: my,
                textAnchor: "middle",
                dominantBaseline: "central",
                fill: V.muted,
                fontSize: 12,
                fontFamily: MONO,
                fontWeight: 700,
                children: e.weight
              }
            )
          ] })
        ] }, i);
      }),
      nodes.map((n) => {
        const pos = positions[n.id];
        if (!pos) return null;
        const fill = fillOf(n.id);
        const isCurrent = current != null && String(n.id) === String(current);
        const label = String(n.label ?? n.id);
        return /* @__PURE__ */ jsxs4("g", { children: [
          /* @__PURE__ */ jsx4(
            "circle",
            {
              cx: pos.x,
              cy: pos.y,
              r: NODE_R2,
              fill,
              stroke: fill === V.node ? V.nodeBorder : "#ffffff66",
              strokeWidth: isCurrent ? 3 : 2,
              style: { filter: isCurrent ? `drop-shadow(0 0 8px ${fill}cc)` : "none" }
            }
          ),
          /* @__PURE__ */ jsx4(
            "text",
            {
              x: pos.x,
              y: pos.y,
              textAnchor: "middle",
              dominantBaseline: "central",
              fill: onColor(fill),
              fontSize: label.length > 3 ? 12 : label.length > 2 ? 14 : 16,
              fontFamily: MONO,
              fontWeight: 700,
              children: label
            }
          )
        ] }, n.id);
      })
    ] }),
    /* @__PURE__ */ jsx4(
      Legend,
      {
        items: [
          current != null && { color: V.current, label: `Current: ${current}`, round: true },
          highlighted.length > 0 && { color: V.highlight, label: "Highlighted", round: true },
          visited.length > 0 && { color: V.visited, label: "Visited", round: true },
          edges.some((e) => e.directed) && { color: V.edge, label: "Directed edge" }
        ]
      }
    )
  ] });
}

// src/components/visualizer/renderers/LinkedListRenderer.jsx
import { jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
function LinkedListRenderer({ frame }) {
  if (!frame || !Array.isArray(frame.nodes) || frame.nodes.length === 0) {
    return /* @__PURE__ */ jsx5(EmptyNote, { children: "No linked list data in this frame." });
  }
  const { nodes, highlighted = [], current = null } = frame;
  const highlightedSet = new Set(highlighted.map(String));
  const map = {};
  nodes.forEach((n) => map[String(n.id)] = n);
  const pointedTo = new Set(
    nodes.filter((n) => n.next != null).map((n) => String(n.next))
  );
  const head = nodes.find((n) => !pointedTo.has(String(n.id))) ?? nodes[0];
  const ordered = [];
  const seen = /* @__PURE__ */ new Set();
  let cur = head;
  while (cur && !seen.has(String(cur.id)) && ordered.length <= nodes.length) {
    seen.add(String(cur.id));
    ordered.push(cur);
    cur = cur.next != null ? map[String(cur.next)] : null;
  }
  nodes.forEach((n) => {
    if (!seen.has(String(n.id))) ordered.push(n);
  });
  const fillOf = (id) => {
    if (current != null && String(id) === String(current)) return V.current;
    if (highlightedSet.has(String(id))) return V.highlight;
    return V.node;
  };
  return /* @__PURE__ */ jsxs5(Canvas, { children: [
    /* @__PURE__ */ jsxs5(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 0,
          flexWrap: "wrap",
          rowGap: 18
        },
        children: [
          /* @__PURE__ */ jsx5(
            "div",
            {
              style: {
                fontSize: 12,
                fontFamily: MONO,
                fontWeight: 700,
                color: V.muted,
                marginRight: 8
              },
              children: "HEAD \u2192"
            }
          ),
          ordered.map((n, idx) => {
            const fill = fillOf(n.id);
            const active = fill !== V.node;
            const isLast = idx === ordered.length - 1 || n.next == null;
            return /* @__PURE__ */ jsxs5("div", { style: { display: "flex", alignItems: "center" }, children: [
              /* @__PURE__ */ jsxs5(
                "div",
                {
                  style: {
                    display: "flex",
                    border: `2px solid ${active ? fill : V.nodeBorder}`,
                    borderRadius: 8,
                    overflow: "hidden",
                    boxShadow: active ? `0 0 10px ${fill}66` : "none",
                    transition: "all 0.15s ease"
                  },
                  children: [
                    /* @__PURE__ */ jsx5(
                      "div",
                      {
                        style: {
                          minWidth: 52,
                          minHeight: 46,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: fill,
                          color: onColor(fill),
                          fontSize: 16,
                          fontFamily: MONO,
                          fontWeight: 700,
                          padding: "0 10px"
                        },
                        children: String(n.val ?? "\xB7")
                      }
                    ),
                    /* @__PURE__ */ jsx5(
                      "div",
                      {
                        style: {
                          width: 24,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: V.canvas,
                          color: V.muted,
                          fontSize: 14,
                          borderLeft: `2px solid ${active ? fill : V.nodeBorder}`
                        },
                        children: n.next != null ? "\u2022" : "\u2205"
                      }
                    )
                  ]
                }
              ),
              !isLast && n.next != null && /* @__PURE__ */ jsxs5("svg", { width: "36", height: "20", style: { flexShrink: 0 }, children: [
                /* @__PURE__ */ jsx5("line", { x1: "2", y1: "10", x2: "28", y2: "10", stroke: V.edge, strokeWidth: "2.5" }),
                /* @__PURE__ */ jsx5("path", { d: "M26,4 L35,10 L26,16 z", fill: V.edge })
              ] })
            ] }, n.id);
          }),
          ordered.length > 0 && ordered[ordered.length - 1].next == null && /* @__PURE__ */ jsx5(
            "div",
            {
              style: {
                marginLeft: 10,
                fontSize: 13,
                fontFamily: MONO,
                fontWeight: 700,
                color: V.faint
              },
              children: "NULL"
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsx5(
      Legend,
      {
        items: [
          current != null && { color: V.current, label: `Current: ${current}` },
          highlighted.length > 0 && { color: V.highlight, label: "Highlighted" }
        ]
      }
    )
  ] });
}

// src/components/visualizer/renderers/StackRenderer.jsx
import { jsx as jsx6, jsxs as jsxs6 } from "react/jsx-runtime";
var MAX_VISIBLE = 12;
function StackRenderer({ frame }) {
  if (!frame || !Array.isArray(frame.data)) {
    return /* @__PURE__ */ jsx6(EmptyNote, { children: "No stack data in this frame." });
  }
  const { data, highlighted = [], pushed = null, popped = null } = frame;
  const topIndex = frame.top ?? data.length - 1;
  const display = data.map((val, i) => ({ val, i })).reverse().slice(0, MAX_VISIBLE);
  const hiddenCount = Math.max(0, data.length - MAX_VISIBLE);
  const fillOf = (i) => {
    if (i === pushed) return V.sorted;
    if (highlighted.includes(i)) return V.current;
    return V.node;
  };
  return /* @__PURE__ */ jsxs6(Canvas, { children: [
    /* @__PURE__ */ jsx6("div", { style: { display: "flex", justifyContent: "center", gap: 24 }, children: /* @__PURE__ */ jsxs6("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }, children: [
      popped !== null && popped !== void 0 && /* @__PURE__ */ jsxs6(
        "div",
        {
          style: {
            width: 130,
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `2px dashed ${V.swap}`,
            borderRadius: 8,
            color: V.swap,
            fontSize: 15,
            fontFamily: MONO,
            fontWeight: 700,
            opacity: 0.85,
            marginBottom: 6
          },
          children: [
            String(popped),
            " \u2934"
          ]
        }
      ),
      data.length === 0 ? /* @__PURE__ */ jsx6(
        "div",
        {
          style: {
            width: 130,
            minHeight: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `2px dashed ${V.faint}`,
            borderRadius: 8,
            color: V.muted,
            fontSize: 13,
            fontFamily: MONO
          },
          children: "(empty)"
        }
      ) : display.map(({ val, i }) => {
        const fill = fillOf(i);
        const isTop = i === topIndex;
        const active = fill !== V.node;
        return /* @__PURE__ */ jsxs6("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
          /* @__PURE__ */ jsx6(
            "div",
            {
              style: {
                width: 130,
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid ${active ? fill : V.nodeBorder}`,
                borderRadius: 8,
                backgroundColor: fill,
                color: onColor(fill),
                fontSize: 16,
                fontFamily: MONO,
                fontWeight: 700,
                boxShadow: active ? `0 0 10px ${fill}66` : "none",
                transition: "all 0.15s ease"
              },
              children: String(val)
            }
          ),
          /* @__PURE__ */ jsx6(
            "div",
            {
              style: {
                width: 64,
                fontSize: 12,
                fontFamily: MONO,
                fontWeight: 700,
                color: isTop ? V.current : V.faint
              },
              children: isTop ? "\u2190 TOP" : `[${i}]`
            }
          )
        ] }, i);
      }),
      hiddenCount > 0 && /* @__PURE__ */ jsxs6("div", { style: { color: V.muted, fontSize: 12, fontFamily: MONO }, children: [
        "\u2026 ",
        hiddenCount,
        " more below"
      ] }),
      /* @__PURE__ */ jsx6(
        "div",
        {
          style: {
            width: 150,
            height: 6,
            background: V.nodeBorder,
            borderRadius: 3,
            marginTop: 2
          }
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx6(
      Legend,
      {
        items: [
          pushed != null && { color: V.sorted, label: "Just pushed" },
          popped != null && { color: V.swap, label: `Popped: ${popped}` },
          highlighted.length > 0 && { color: V.current, label: "Highlighted" }
        ]
      }
    )
  ] });
}

// src/components/visualizer/renderers/QueueRenderer.jsx
import { jsx as jsx7, jsxs as jsxs7 } from "react/jsx-runtime";
var MAX_VISIBLE2 = 10;
function QueueRenderer({ frame }) {
  if (!frame || !Array.isArray(frame.data)) {
    return /* @__PURE__ */ jsx7(EmptyNote, { children: "No queue data in this frame." });
  }
  const { data, highlighted = [], enqueued = null, dequeued = null } = frame;
  const front = frame.front ?? 0;
  const back = frame.back ?? data.length - 1;
  const display = data.map((val, i) => ({ val, i })).slice(0, MAX_VISIBLE2);
  const hiddenCount = Math.max(0, data.length - MAX_VISIBLE2);
  const fillOf = (i) => {
    if (i === enqueued) return V.sorted;
    if (highlighted.includes(i)) return V.current;
    return V.node;
  };
  return /* @__PURE__ */ jsxs7(Canvas, { children: [
    /* @__PURE__ */ jsxs7(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          flexWrap: "wrap"
        },
        children: [
          dequeued !== null && dequeued !== void 0 && /* @__PURE__ */ jsxs7(
            "div",
            {
              style: {
                minWidth: 56,
                minHeight: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px dashed ${V.swap}`,
                borderRadius: 8,
                color: V.swap,
                fontSize: 15,
                fontFamily: MONO,
                fontWeight: 700,
                padding: "0 8px",
                opacity: 0.85
              },
              children: [
                "\u2934 ",
                String(dequeued)
              ]
            }
          ),
          data.length === 0 ? /* @__PURE__ */ jsx7(
            "div",
            {
              style: {
                minWidth: 140,
                minHeight: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px dashed ${V.faint}`,
                borderRadius: 8,
                color: V.muted,
                fontSize: 13,
                fontFamily: MONO
              },
              children: "(empty)"
            }
          ) : display.map(({ val, i }) => {
            const fill = fillOf(i);
            const active = fill !== V.node;
            const isFront = i === front;
            const isBack = i === back;
            return /* @__PURE__ */ jsxs7(
              "div",
              {
                style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 5 },
                children: [
                  /* @__PURE__ */ jsx7(
                    "div",
                    {
                      style: {
                        fontSize: 11,
                        fontFamily: MONO,
                        fontWeight: 700,
                        color: isFront ? V.current : isBack ? V.sorted : "transparent",
                        minHeight: 14
                      },
                      children: isFront && isBack ? "FRONT/BACK" : isFront ? "FRONT \u2193" : isBack ? "BACK \u2193" : "\xB7"
                    }
                  ),
                  /* @__PURE__ */ jsx7(
                    "div",
                    {
                      style: {
                        minWidth: 56,
                        minHeight: 48,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: `2px solid ${active ? fill : V.nodeBorder}`,
                        borderRadius: 8,
                        backgroundColor: fill,
                        color: onColor(fill),
                        fontSize: 16,
                        fontFamily: MONO,
                        fontWeight: 700,
                        padding: "0 10px",
                        boxShadow: active ? `0 0 10px ${fill}66` : "none",
                        transition: "all 0.15s ease"
                      },
                      children: String(val)
                    }
                  ),
                  /* @__PURE__ */ jsx7("div", { style: { fontSize: 11, color: V.faint, fontFamily: MONO }, children: i })
                ]
              },
              i
            );
          }),
          hiddenCount > 0 && /* @__PURE__ */ jsxs7("div", { style: { color: V.muted, fontSize: 12, fontFamily: MONO }, children: [
            "\u2026 +",
            hiddenCount
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsx7(
      Legend,
      {
        items: [
          enqueued != null && { color: V.sorted, label: "Just enqueued" },
          dequeued != null && { color: V.swap, label: `Dequeued: ${dequeued}` },
          highlighted.length > 0 && { color: V.current, label: "Highlighted" }
        ]
      }
    )
  ] });
}

// src/components/visualizer/renderers/MatrixRenderer.jsx
import { jsx as jsx8, jsxs as jsxs8 } from "react/jsx-runtime";
var key = (r, c) => `${r},${c}`;
function MatrixRenderer({ frame }) {
  if (!frame || !Array.isArray(frame.data) || frame.data.length === 0 || !Array.isArray(frame.data[0])) {
    return /* @__PURE__ */ jsx8(EmptyNote, { children: "No matrix data in this frame." });
  }
  const {
    data,
    current = null,
    highlighted = [],
    path = [],
    visited = [],
    walls = [],
    rowLabels = null,
    colLabels = null
  } = frame;
  const rows = data.length;
  const cols = Math.max(...data.map((r) => r.length));
  const pathSet = new Set(path.map(([r, c]) => key(r, c)));
  const visitedSet = new Set(visited.map(([r, c]) => key(r, c)));
  const wallSet = new Set(walls.map(([r, c]) => key(r, c)));
  const highlightedSet = new Set(highlighted.map(([r, c]) => key(r, c)));
  const currentKey = current ? key(current[0], current[1]) : null;
  const cell = cols > 16 || rows > 16 ? 30 : cols > 10 || rows > 10 ? 38 : 46;
  const font = cell >= 46 ? 15 : cell >= 38 ? 13 : 11;
  const fillOf = (r, c) => {
    const k = key(r, c);
    if (k === currentKey) return V.current;
    if (highlightedSet.has(k)) return V.highlight;
    if (pathSet.has(k)) return V.sorted;
    if (wallSet.has(k)) return "#5b2733";
    if (visitedSet.has(k)) return V.visited;
    return V.node;
  };
  return /* @__PURE__ */ jsxs8(Canvas, { children: [
    /* @__PURE__ */ jsxs8("div", { style: { display: "inline-block", margin: "0 auto" }, children: [
      /* @__PURE__ */ jsx8("div", { style: { display: "flex", marginLeft: rowLabels || rows > 1 ? 30 : 0 }, children: Array.from({ length: cols }, (_, c) => /* @__PURE__ */ jsx8(
        "div",
        {
          style: {
            width: cell,
            marginRight: 3,
            textAlign: "center",
            fontSize: 11,
            color: V.faint,
            fontFamily: MONO
          },
          children: colLabels?.[c] ?? c
        },
        c
      )) }),
      data.map((row, r) => /* @__PURE__ */ jsxs8("div", { style: { display: "flex", alignItems: "center", marginTop: 3 }, children: [
        /* @__PURE__ */ jsx8(
          "div",
          {
            style: {
              width: 26,
              marginRight: 4,
              textAlign: "right",
              fontSize: 11,
              color: V.faint,
              fontFamily: MONO
            },
            children: rowLabels?.[r] ?? r
          }
        ),
        Array.from({ length: cols }, (_, c) => {
          const val = row[c];
          const fill = fillOf(r, c);
          const active = fill !== V.node && fill !== "#5b2733";
          return /* @__PURE__ */ jsx8(
            "div",
            {
              style: {
                width: cell,
                height: cell,
                marginRight: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: fill,
                border: `2px solid ${active ? "#ffffff55" : V.canvasBorder}`,
                borderRadius: 5,
                fontSize: font,
                fontFamily: MONO,
                fontWeight: 700,
                color: fill === "#5b2733" ? "#e08a96" : onColor(fill),
                transition: "all 0.15s ease",
                boxShadow: key(r, c) === currentKey ? `0 0 10px ${V.current}aa` : "none",
                overflow: "hidden"
              },
              children: val === void 0 ? "" : String(val)
            },
            c
          );
        })
      ] }, r))
    ] }),
    /* @__PURE__ */ jsx8(
      Legend,
      {
        items: [
          current && { color: V.current, label: `Current (${current[0]}, ${current[1]})` },
          highlighted.length > 0 && { color: V.highlight, label: "Highlighted" },
          path.length > 0 && { color: V.sorted, label: "Path" },
          visited.length > 0 && { color: V.visited, label: "Visited" },
          walls.length > 0 && { color: "#5b2733", label: "Wall" }
        ]
      }
    )
  ] });
}

// src/components/visualizer/renderers/RendererFactory.jsx
import { jsx as jsx9, jsxs as jsxs9 } from "react/jsx-runtime";
var T = {
  textMuted: V.muted,
  surface: V.canvas,
  border: V.canvasBorder,
  accent: V.current
};
function RendererFactory({ frame }) {
  if (!frame) {
    return /* @__PURE__ */ jsx9(
      "div",
      {
        style: {
          color: T.textMuted,
          fontSize: 13,
          padding: 24,
          textAlign: "center"
        },
        children: "No frame to display."
      }
    );
  }
  switch (frame.type) {
    case "array":
      return /* @__PURE__ */ jsx9(ArrayRenderer, { frame });
    case "tree":
      return /* @__PURE__ */ jsx9(TreeRenderer, { frame });
    case "graph":
      return /* @__PURE__ */ jsx9(GraphRenderer, { frame });
    case "linkedlist":
    case "linked_list":
    case "list":
      return /* @__PURE__ */ jsx9(LinkedListRenderer, { frame });
    case "stack":
      return /* @__PURE__ */ jsx9(StackRenderer, { frame });
    case "queue":
    case "deque":
      return /* @__PURE__ */ jsx9(QueueRenderer, { frame });
    case "matrix":
    case "grid":
    case "board":
      return /* @__PURE__ */ jsx9(MatrixRenderer, { frame });
    default:
      return /* @__PURE__ */ jsxs9(Canvas, { children: [
        /* @__PURE__ */ jsxs9("div", { style: { fontSize: 12, color: V.muted, marginBottom: 8 }, children: [
          "Unknown frame type:",
          " ",
          /* @__PURE__ */ jsx9("code", { style: { color: V.current }, children: frame.type ?? "(none)" })
        ] }),
        /* @__PURE__ */ jsx9(
          "pre",
          {
            style: {
              fontSize: 13,
              color: V.text,
              fontFamily: MONO,
              margin: 0,
              overflowX: "auto",
              whiteSpace: "pre-wrap"
            },
            children: JSON.stringify(frame, null, 2)
          }
        )
      ] });
  }
}

// src/components/visualizer/renderers/MemoryModelRenderer.jsx
import { useLayoutEffect, useRef, useState } from "react";

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

// src/components/visualizer/renderers/MemoryModelRenderer.jsx
import { jsx as jsx10, jsxs as jsxs10 } from "react/jsx-runtime";
var T2 = {
  bg: V.canvas,
  surface: "#1a2940",
  border: V.canvasBorder,
  text: V.text,
  textMuted: V.muted,
  textDim: V.faint,
  accent: V.current,
  purple: "#c39ae8"
};
var BOX_COLORS = {
  list: "#4fc3f7",
  tuple: "#4fc3f7",
  array: "#4fc3f7",
  set: "#c39ae8",
  dict: "#2fbf71",
  map: "#2fbf71",
  object: "#ff8f1f",
  opaque: "#90a6c0"
};
function fmt(v) {
  if (v === null || v === void 0) return "\u2205";
  if (typeof v === "string") return `"${v.length > 24 ? v.slice(0, 24) + "\u2026" : v}"`;
  return String(v);
}
function RefChip({ to, registerRef }) {
  return /* @__PURE__ */ jsx10(
    "span",
    {
      ref: (el) => registerRef && registerRef(`src-${to}`, el),
      style: {
        display: "inline-block",
        padding: "0 5px",
        borderRadius: 3,
        fontSize: 10,
        background: "rgba(255,161,22,0.14)",
        color: T2.accent,
        border: `1px solid ${T2.accent}33`,
        fontFamily: "'JetBrains Mono', monospace"
      },
      children: "\u25CF\u2192"
    }
  );
}
function Cell({ v, registerRef }) {
  if (isRef(v)) return /* @__PURE__ */ jsx10(RefChip, { to: refId(v), registerRef });
  return /* @__PURE__ */ jsx10("span", { style: { color: T2.text }, children: fmt(v) });
}
function HeapBox({ id, entry, registerRef, highlight }) {
  const color = BOX_COLORS[entry.type] ?? BOX_COLORS.opaque;
  const title = entry.type === "object" ? entry.class : entry.type + (entry.truncated ? " (truncated)" : "");
  let body;
  if (entry.type === "object") {
    body = Object.entries(entry.fields ?? {}).map(([k, v]) => /* @__PURE__ */ jsxs10("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
      /* @__PURE__ */ jsx10("span", { style: { color: T2.textMuted, fontSize: 12 }, children: k }),
      /* @__PURE__ */ jsx10(Cell, { v, registerRef })
    ] }, k));
  } else if (entry.type === "dict" || entry.type === "map") {
    body = (entry.entries ?? []).slice(0, 30).map(([k, v], i) => /* @__PURE__ */ jsxs10("div", { style: { display: "flex", gap: 6, alignItems: "center" }, children: [
      /* @__PURE__ */ jsx10(Cell, { v: k, registerRef }),
      /* @__PURE__ */ jsx10("span", { style: { color: T2.textDim }, children: "\u2192" }),
      /* @__PURE__ */ jsx10(Cell, { v, registerRef })
    ] }, i));
  } else if (entry.type === "opaque") {
    body = /* @__PURE__ */ jsx10("div", { style: { color: T2.textMuted, fontStyle: "italic" }, children: entry.repr });
  } else {
    body = /* @__PURE__ */ jsxs10("div", { style: { display: "flex", flexWrap: "wrap", gap: 3, maxWidth: 220 }, children: [
      (entry.values ?? []).slice(0, 40).map((v, i) => /* @__PURE__ */ jsx10(
        "span",
        {
          style: {
            padding: "2px 6px",
            borderRadius: 4,
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${T2.border}`,
            fontSize: 12
          },
          children: /* @__PURE__ */ jsx10(Cell, { v, registerRef })
        },
        i
      )),
      (entry.values?.length ?? 0) > 40 && /* @__PURE__ */ jsxs10("span", { style: { color: T2.textDim, fontSize: 10 }, children: [
        "\u2026",
        entry.values.length - 40,
        " more"
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs10(
    "div",
    {
      ref: (el) => registerRef && registerRef(`box-${id}`, el),
      style: {
        border: `1px solid ${highlight ? color : T2.border}`,
        borderRadius: 6,
        background: T2.surface,
        minWidth: 70,
        maxWidth: 260,
        overflow: "hidden",
        boxShadow: highlight ? `0 0 0 1px ${color}` : "none"
      },
      children: [
        /* @__PURE__ */ jsxs10(
          "div",
          {
            style: {
              padding: "3px 9px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color,
              background: `${color}14`,
              borderBottom: `1px solid ${T2.border}`,
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              fontFamily: "'JetBrains Mono', monospace"
            },
            children: [
              /* @__PURE__ */ jsx10("span", { children: title }),
              /* @__PURE__ */ jsxs10("span", { style: { opacity: 0.5 }, children: [
                "@",
                id
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsx10(
          "div",
          {
            style: {
              padding: "8px 10px",
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
              display: "flex",
              flexDirection: "column",
              gap: 3
            },
            children: body
          }
        )
      ]
    }
  );
}
function MemoryModelRenderer({ frame, roots }) {
  const containerRef = useRef(null);
  const nodeRefs = useRef(/* @__PURE__ */ new Map());
  const [arrows, setArrows] = useState([]);
  const heap = frame?.heap ?? {};
  const rootList = roots ?? (frame?.stack ?? []).flatMap(
    (s) => Object.entries(s.locals ?? {}).map(([name, value]) => ({ name, value }))
  );
  const depth = /* @__PURE__ */ new Map();
  const queue = [];
  for (const r of rootList) {
    if (isRef(r.value) && heap[refId(r.value)] && !depth.has(refId(r.value))) {
      depth.set(refId(r.value), 0);
      queue.push(refId(r.value));
    }
  }
  while (queue.length) {
    const id = queue.shift();
    const d = depth.get(id);
    const entry = heap[id];
    const children = [];
    if (entry?.type === "object") children.push(...Object.values(entry.fields ?? {}));
    else if (entry?.type === "dict" || entry?.type === "map")
      (entry.entries ?? []).forEach(([k, v]) => children.push(k, v));
    else children.push(...entry?.values ?? []);
    for (const c of children) {
      if (isRef(c) && heap[refId(c)] && !depth.has(refId(c))) {
        depth.set(refId(c), d + 1);
        queue.push(refId(c));
      }
    }
  }
  const maxDepth = Math.max(0, ...depth.values());
  const columns = Array.from({ length: maxDepth + 1 }, () => []);
  for (const [id, d] of depth) columns[d].push(id);
  const registerRef = (key2, el) => {
    if (el) nodeRefs.current.set(key2, el);
    else nodeRefs.current.delete(key2);
  };
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const out = [];
    const center = (el) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left - cRect.left + container.scrollLeft + r.width / 2,
        y: r.top - cRect.top + container.scrollTop + r.height / 2,
        left: r.left - cRect.left + container.scrollLeft,
        right: r.right - cRect.left + container.scrollLeft
      };
    };
    for (const r of rootList) {
      if (!isRef(r.value)) continue;
      const from = nodeRefs.current.get(`var-${r.name}`);
      const to = nodeRefs.current.get(`box-${refId(r.value)}`);
      if (from && to) {
        const a = center(from), b = center(to);
        out.push({ x1: a.right, y1: a.y, x2: b.left, y2: b.y });
      }
    }
    for (const [key2, el] of nodeRefs.current) {
      if (!key2.startsWith("src-")) continue;
      const target = nodeRefs.current.get(`box-${key2.slice(4)}`);
      if (el && target) {
        const a = center(el), b = center(target);
        out.push({ x1: a.right, y1: a.y, x2: b.left, y2: b.y });
      }
    }
    setArrows(out);
  }, [frame, roots]);
  if (rootList.length === 0) {
    return /* @__PURE__ */ jsx10("div", { style: { padding: 16, color: T2.textMuted, fontSize: 12 }, children: "Nothing to display." });
  }
  return /* @__PURE__ */ jsxs10(
    "div",
    {
      ref: containerRef,
      style: {
        position: "relative",
        display: "flex",
        gap: 32,
        padding: 18,
        margin: 10,
        overflow: "auto",
        background: V.canvas,
        border: `1px solid ${V.canvasBorder}`,
        borderRadius: 10
      },
      children: [
        /* @__PURE__ */ jsxs10(
          "svg",
          {
            style: {
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              overflow: "visible"
            },
            children: [
              /* @__PURE__ */ jsx10("defs", { children: /* @__PURE__ */ jsx10("marker", { id: "viz-arrow", markerWidth: "7", markerHeight: "7", refX: "6", refY: "3.5", orient: "auto", children: /* @__PURE__ */ jsx10("path", { d: "M0,0 L7,3.5 L0,7 z", fill: T2.accent, opacity: "0.55" }) }) }),
              arrows.map((a, i) => /* @__PURE__ */ jsx10(
                "path",
                {
                  d: `M ${a.x1} ${a.y1} C ${a.x1 + 24} ${a.y1}, ${a.x2 - 24} ${a.y2}, ${a.x2} ${a.y2}`,
                  stroke: T2.accent,
                  strokeWidth: "1.2",
                  fill: "none",
                  opacity: "0.55",
                  markerEnd: "url(#viz-arrow)"
                },
                i
              ))
            ]
          }
        ),
        /* @__PURE__ */ jsxs10("div", { style: { display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }, children: [
          /* @__PURE__ */ jsx10(
            "div",
            {
              style: {
                fontSize: 10,
                fontWeight: 700,
                color: T2.textMuted,
                letterSpacing: "0.08em"
              },
              children: "VARIABLES"
            }
          ),
          rootList.map((r) => /* @__PURE__ */ jsxs10(
            "div",
            {
              ref: (el) => registerRef(`var-${r.name}`, el),
              style: {
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "5px 10px",
                border: `1px solid ${T2.border}`,
                borderRadius: 6,
                background: T2.surface,
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace"
              },
              children: [
                /* @__PURE__ */ jsx10("span", { style: { color: T2.purple }, children: r.name }),
                isRef(r.value) ? /* @__PURE__ */ jsx10("span", { style: { color: T2.accent, fontSize: 10 }, children: "\u25CF\u2192" }) : /* @__PURE__ */ jsx10("span", { style: { color: T2.text }, children: fmt(r.value) })
              ]
            },
            r.name
          ))
        ] }),
        columns.map((ids, d) => /* @__PURE__ */ jsx10("div", { style: { display: "flex", flexDirection: "column", gap: 12, flexShrink: 0 }, children: ids.map((id) => /* @__PURE__ */ jsx10(HeapBox, { id, entry: heap[id], registerRef }, id)) }, d))
      ]
    }
  );
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
  const binary = m.every((row) => row.every((v) => v === 0 || v === 1));
  return binary || m.every((row) => row.every((v) => v >= 0 && v < 1e4));
}
function isSymmetric(m) {
  const n = m.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) if (m[i][j] !== m[j][i]) return false;
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
    const m = materialize(value, frame);
    const entries = m.entries ?? [];
    if (entries.length >= 2 && entries.every(([k, v]) => Number.isInteger(k) && isIntArray(v))) {
      const keys = new Set(entries.map(([k]) => k));
      if (entries.every(([, v]) => v.every((x) => keys.has(x)))) return "graph";
    }
    return "memory";
  }
  if (["list", "tuple", "array", "set"].includes(entry.type)) {
    const m = materialize(value, frame);
    if (isAdjacencyMatrix(m)) return "graph";
    if (isAdjacencyList(m)) return "graph";
    if (isPrimitiveArray(m)) {
      const behavioral = behavioralKind(sampleHistory(frames2, name));
      if (behavioral) return behavioral.kind;
      return "array";
    }
    if (is2DArray(m)) return "matrix";
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
  const seen = /* @__PURE__ */ new Set();
  let symmetric = true;
  rows.forEach((row, u) => row.forEach((v) => {
    if (!rows[v]?.includes(u)) symmetric = false;
  }));
  rows.forEach(
    (row, u) => row.forEach((v) => {
      const key2 = symmetric ? [Math.min(u, v), Math.max(u, v)].join("-") : `${u}-${v}`;
      if (seen.has(key2)) return;
      seen.add(key2);
      edges.push({ from: u, to: v, directed: !symmetric });
    })
  );
  return { type: "graph", nodes, edges };
}
function dictToGraph(m) {
  const entries = m.entries ?? [];
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
      const key2 = symmetric ? [Math.min(u, v), Math.max(u, v)].join("-") : `${u}-${v}`;
      if (seen.has(key2)) continue;
      seen.add(key2);
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
  const m = materialize(value, frame);
  const prevValue = prevFrame ? visibleVariables(prevFrame)[name] : void 0;
  const prevM = prevValue !== void 0 ? materialize(prevValue, prevFrame) : void 0;
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
      const headFirst = stackOrientation(frames2, name) === "front";
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
      if (isAdjacencyList(m)) return { ...adjacencyListToGraph(m), label: name };
      if (m?.__kind === "dict") return { ...dictToGraph(m), label: name };
      if (m?.__kind === "object") {
        const g = objectGraphToGraph(value, frame);
        return g ? { ...g, label: name } : null;
      }
      if (is2DArray(m)) return { ...adjacencyMatrixToGraph(m), label: name };
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

// tools/render-test.jsx
import { jsx as jsx11 } from "react/jsx-runtime";
var raw = readFileSync(process.argv[2], "utf-8");
var frames = JSON.parse(raw.match(/__FRAMES__([\s\S]*)__END__/)[1]);
var kinds = classifyVariables(frames, {}, {});
var last = frames.length - 2;
var ok = 0;
var fail = 0;
for (const [name, info] of kinds) {
  if (["scalar"].includes(info.kind)) continue;
  try {
    if (info.kind === "memory") {
      const vars = visibleVariables(frames[last]);
      const html2 = renderToString(
        /* @__PURE__ */ jsx11(MemoryModelRenderer, { frame: frames[last], roots: [{ name, value: vars[name] }] })
      );
      console.log(`OK  memory  ${name}  (${html2.length} bytes)`);
      ok++;
      continue;
    }
    const rf = buildRendererFrame(name, info.kind, frames[last], frames[last - 1], frames);
    if (!rf) {
      console.log(`--  ${info.kind}  ${name}  (no renderer frame)`);
      continue;
    }
    const html = renderToString(/* @__PURE__ */ jsx11(RendererFactory, { frame: rf }));
    console.log(`OK  ${info.kind.padEnd(10)} ${name}  (${html.length} bytes)`);
    ok++;
  } catch (e) {
    console.log(`FAIL ${info.kind} ${name}: ${e.message}`);
    fail++;
  }
}
for (const synth of [
  { type: "stack", data: [1, 2, 3], pushed: 2 },
  { type: "queue", data: [4, 5, 6], enqueued: 2, dequeued: 9 },
  { type: "matrix", data: [[1, 0], [0, 1]], current: [0, 0], path: [[1, 1]] },
  { type: "linkedlist", nodes: [{ id: "a", val: 1, next: "b" }, { id: "b", val: 2, next: null }], current: "a" },
  { type: "nonsense", weird: true }
]) {
  try {
    renderToString(/* @__PURE__ */ jsx11(RendererFactory, { frame: synth }));
    console.log(`OK  synthetic ${synth.type}`);
    ok++;
  } catch (e) {
    console.log(`FAIL synthetic ${synth.type}: ${e.message}`);
    fail++;
  }
}
console.log(`
${ok} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
