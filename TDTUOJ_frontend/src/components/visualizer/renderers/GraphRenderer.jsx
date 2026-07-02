// src/components/visualizer/renderers/GraphRenderer.jsx
// Frame shape:
//   { type: "graph", nodes: [{id, label?}], edges: [{from, to, weight?, directed?}],
//     visited?: id[], highlighted?: id[], current?: id, activeEdge?: [from, to] }
// VisuAlgo-style: circular layout, solid circles, weighted/directed edges.
import { useMemo } from "react";
import { V, MONO, Canvas, Legend, EmptyNote, onColor } from "./vizTheme";

const NODE_R = 24;

function layout(nodes, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.max(Math.min(cx, cy) - NODE_R - 24, 40);
  const pos = {};
  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    pos[n.id] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
  return pos;
}

export default function GraphRenderer({ frame }) {
  if (!frame || !Array.isArray(frame.nodes) || frame.nodes.length === 0) {
    return <EmptyNote>No graph data in this frame.</EmptyNote>;
  }

  const {
    nodes,
    edges = [],
    visited = [],
    highlighted = [],
    current = null,
    activeEdge = null,
  } = frame;

  const size = Math.max(280, Math.min(460, nodes.length * 64));
  const W = size, H = size;
  const positions = useMemo(
    () => layout(nodes, W, H),
    [JSON.stringify(nodes.map((n) => n.id)), W, H],
  );

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

  return (
    <Canvas>
      <svg width={W} height={H} style={{ display: "block", margin: "0 auto" }}>
        <defs>
          <marker
            id="viz-graph-arrow"
            markerWidth="9"
            markerHeight="9"
            refX="8"
            refY="4.5"
            orient="auto"
          >
            <path d="M0,0 L9,4.5 L0,9 z" fill={V.edge} />
          </marker>
          <marker
            id="viz-graph-arrow-active"
            markerWidth="9"
            markerHeight="9"
            refX="8"
            refY="4.5"
            orient="auto"
          >
            <path d="M0,0 L9,4.5 L0,9 z" fill={V.edgeActive} />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((e, i) => {
          const a = positions[e.from];
          const b = positions[e.to];
          if (!a || !b) return null;
          const active = isActiveEdge(e);
          // trim endpoints to the circle boundary
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
                stroke={active ? V.edgeActive : V.edge}
                strokeWidth={active ? 3.5 : 2.5}
                markerEnd={
                  e.directed
                    ? `url(#viz-graph-arrow${active ? "-active" : ""})`
                    : undefined
                }
              />
              {e.weight != null && (
                <>
                  <rect
                    x={mx - 14}
                    y={my - 11}
                    width={28}
                    height={20}
                    rx={4}
                    fill={V.canvas}
                    stroke={V.canvasBorder}
                  />
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
                    {e.weight}
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
          const label = String(n.label ?? n.id);
          return (
            <g key={n.id}>
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
          visited.length > 0 && { color: V.visited, label: "Visited", round: true },
          edges.some((e) => e.directed) && { color: V.edge, label: "Directed edge" },
        ]}
      />
    </Canvas>
  );
}
