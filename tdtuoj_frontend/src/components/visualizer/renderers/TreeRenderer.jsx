// src/components/visualizer/renderers/TreeRenderer.jsx
// Frame shape: { type: "tree", nodes: [{id, val, left?, right?}], highlighted?: (id|val)[], current?: id|val }
// VisuAlgo-style: solid filled circles, thick edges, bold labels.
import { useMemo } from "react";
import { V, MONO, Canvas, Legend, EmptyNote, onColor } from "./vizTheme";

const NODE_R = 26;
const V_GAP = 58; // vertical gap between levels
const H_GAP = 16; // minimum horizontal gap between siblings

// ── Tree layout: Walker's algorithm (simplified) ─────────────────────────────
function buildLayout(nodes) {
  if (!nodes || nodes.length === 0)
    return { positions: {}, width: 0, height: 0, edges: [] };

  const map = {};
  nodes.forEach((n) => {
    map[n.id] = n;
  });

  // Root = node never referenced as a child (id == null guard keeps id 0 valid).
  const childIds = new Set();
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
      y: depth[id] * (NODE_R * 2 + V_GAP) + NODE_R + 10,
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

export default function TreeRenderer({ frame }) {
  if (!frame || !Array.isArray(frame.nodes) || frame.nodes.length === 0) {
    return <EmptyNote>No tree data in this frame.</EmptyNote>;
  }

  const { nodes, highlighted = [], current = null } = frame;
  const { positions, width, height, edges } = useMemo(
    () => buildLayout(nodes),
    [JSON.stringify(nodes)],
  );

  const fillOf = (id) => {
    if (current != null && String(id) === String(current)) return V.current;
    if (highlighted.map(String).includes(String(id))) return V.highlight;
    return V.node;
  };

  return (
    <Canvas>
      <svg
        width={Math.max(width, 200)}
        height={Math.max(height, 100)}
        style={{ display: "block", margin: "0 auto" }}
      >
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
              stroke={V.edge}
              strokeWidth={2.5}
            />
          );
        })}

        {nodes.map((n) => {
          const pos = positions[n.id];
          if (!pos) return null;
          const fill = fillOf(n.id);
          const isCurrent = current != null && String(n.id) === String(current);
          const label = n.val == null ? "·" : String(n.val);
          return (
            <g key={n.id}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={NODE_R}
                fill={fill}
                stroke={fill === V.node ? V.nodeBorder : "#ffffff66"}
                strokeWidth={isCurrent ? 3 : 2}
                style={{
                  filter: isCurrent ? `drop-shadow(0 0 8px ${fill}cc)` : "none",
                }}
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
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      <Legend
        items={[
          current != null && { color: V.current, label: `Current: ${current}`, round: true },
          highlighted.length > 0 && { color: V.highlight, label: "Highlighted", round: true },
        ]}
      />
    </Canvas>
  );
}
