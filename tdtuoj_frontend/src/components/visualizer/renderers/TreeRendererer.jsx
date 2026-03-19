// src/components/visualizer/renderers/TreeRenderer.jsx
// Frame shape expected:
//   { type: "tree", nodes: [{id, val, left?, right?}], highlighted?: (id|val)[], current?: id|val }
//
// nodes is a flat array. Missing left/right keys mean no child.
// highlighted and current match against node.id (fallback to node.val).

import { useMemo } from "react";

const T = {
  bg: "#0f0f0f",
  surface: "#1a1a1a",
  border: "#2a2a2a",
  text: "#e8e8e8",
  textMuted: "#888",
  accent: "#ffa116",
  green: "#2cbb5d",
  red: "#ef4743",
  blue: "#3b82f6",
  purple: "#a78bfa",
};

const NODE_R = 22;
const V_GAP = 64; // vertical gap between levels
const H_GAP = 12; // minimum horizontal gap between siblings

// ── Tree layout: Walker's algorithm (simplified) ─────────────────────────────
function buildLayout(nodes, highlighted = [], current = null) {
  if (!nodes || nodes.length === 0)
    return { positions: {}, width: 0, height: 0, edges: [] };

  // Build a lookup map
  const map = {};
  nodes.forEach((n) => {
    map[n.id] = n;
  });

  // Find root: node whose id doesn't appear as left/right of any other node.
  // FIX: use != null instead of !== 0 so that node id=0 is correctly
  // identified as a child when it appears in another node's left/right field.
  const childIds = new Set();
  nodes.forEach((n) => {
    if (n.left != null) childIds.add(n.left);
    if (n.right != null) childIds.add(n.right);
  });
  const roots = nodes.filter((n) => !childIds.has(n.id));
  if (roots.length === 0)
    return { positions: {}, width: 0, height: 0, edges: [] };
  const root = roots[0];

  // Assign depth + compute subtree widths.
  // FIX: guard with id == null instead of !id so that id===0 is not skipped.
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

  // Assign x positions.
  // FIX: same guard as above.
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
      y: depth[id] * (NODE_R * 2 + V_GAP) + NODE_R + 10,
    };
  });

  // Collect edges
  const edges = [];
  nodes.forEach((n) => {
    if (n.left != null && map[n.left] && positions[n.id] && positions[n.left])
      edges.push({ from: n.id, to: n.left });
    if (
      n.right != null &&
      map[n.right] &&
      positions[n.id] &&
      positions[n.right]
    )
      edges.push({ from: n.id, to: n.right });
  });

  const allX = Object.values(positions).map((p) => p.x);
  const allY = Object.values(positions).map((p) => p.y);
  const width = Math.max(...allX) + NODE_R + 20;
  const height = Math.max(...allY) + NODE_R + 20;

  return { positions, width, height, edges, map };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TreeRenderer({ frame }) {
  if (!frame || !Array.isArray(frame.nodes) || frame.nodes.length === 0) {
    return (
      <div style={{ color: T.textMuted, fontSize: 13, padding: 16 }}>
        No tree data in this frame.
      </div>
    );
  }

  const { nodes, highlighted = [], current = null } = frame;
  const { positions, width, height, edges } = useMemo(
    () => buildLayout(nodes, highlighted, current),
    [JSON.stringify(nodes), JSON.stringify(highlighted), current],
  );

  const getNodeColor = (id) => {
    if (String(id) === String(current)) return T.accent;
    if (highlighted.map(String).includes(String(id))) return T.purple;
    return T.blue;
  };

  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
        overflowY: "auto",
        padding: 8,
      }}
    >
      <svg
        width={Math.max(width, 200)}
        height={Math.max(height, 100)}
        style={{ display: "block", margin: "0 auto" }}
      >
        {/* Edges */}
        {edges.map((e, i) => {
          const from = positions[e.from];
          const to = positions[e.to];
          if (!from || !to) return null;
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={T.border}
              strokeWidth={1.5}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const pos = positions[n.id];
          if (!pos) return null;
          const color = getNodeColor(n.id);
          const isCurrent = String(n.id) === String(current);
          const isHighlighted = highlighted.map(String).includes(String(n.id));

          return (
            <g key={n.id}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={NODE_R}
                fill={`${color}22`}
                stroke={color}
                strokeWidth={isCurrent ? 2.5 : 1.5}
                style={{
                  filter: isCurrent
                    ? `drop-shadow(0 0 6px ${color}88)`
                    : "none",
                }}
              />
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isHighlighted || isCurrent ? color : T.text}
                fontSize={String(n.val).length > 2 ? 10 : 13}
                fontFamily="'JetBrains Mono', monospace"
                fontWeight={700}
              >
                {n.val}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 8,
          paddingLeft: 8,
          flexWrap: "wrap",
        }}
      >
        {current != null && (
          <Legend color={T.accent} label={`Current: ${current}`} />
        )}
        {highlighted.length > 0 && (
          <Legend
            color={T.purple}
            label={`Highlighted: [${highlighted.join(", ")}]`}
          />
        )}
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        color: T.textMuted,
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          backgroundColor: color,
        }}
      />
      {label}
    </div>
  );
}
