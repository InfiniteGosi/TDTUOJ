// src/components/visualizer/renderers/GraphRenderer.jsx
// Frame shape expected:
//   { type: "graph",
//     nodes: [{id, label?}],
//     edges: [{from, to, weight?, directed?}],
//     visited?: id[],
//     highlighted?: id[],
//     current?: id,
//     activeEdge?: [from, to]
//   }

import { useMemo } from "react";

const T = {
  surface: "#1a1a1a",
  border: "#2a2a2a",
  text: "#e8e8e8",
  textMuted: "#888",
  accent: "#ffa116",
  green: "#2cbb5d",
  blue: "#3b82f6",
  purple: "#a78bfa",
  red: "#ef4743",
};

const NODE_R = 20;

// Simple circular layout — deterministic, no physics needed
function circleLayout(nodes, w, h) {
  const cx = w / 2,
    cy = h / 2;
  const r = Math.min(w, h) / 2 - NODE_R - 16;
  const positions = {};
  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    positions[String(n.id)] = {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });
  return positions;
}

export default function GraphRenderer({ frame }) {
  if (!frame || !Array.isArray(frame.nodes) || frame.nodes.length === 0) {
    return (
      <div style={{ color: T.textMuted, fontSize: 13, padding: 16 }}>
        No graph data in this frame.
      </div>
    );
  }

  const {
    nodes,
    edges = [],
    visited = [],
    highlighted = [],
    current = null,
    activeEdge = null,
  } = frame;

  const W = 420,
    H = 320;

  const positions = useMemo(
    () => circleLayout(nodes, W, H),
    [JSON.stringify(nodes.map((n) => n.id))],
  );

  const getNodeColor = (id) => {
    const sid = String(id);
    if (sid === String(current)) return T.accent;
    if (highlighted.map(String).includes(sid)) return T.purple;
    if (visited.map(String).includes(sid)) return T.green;
    return T.blue;
  };

  const isActiveEdge = (from, to) => {
    if (!activeEdge) return false;
    return (
      (String(activeEdge[0]) === String(from) &&
        String(activeEdge[1]) === String(to)) ||
      (String(activeEdge[0]) === String(to) &&
        String(activeEdge[1]) === String(from))
    );
  };

  return (
    <div style={{ width: "100%", padding: "8px" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", maxHeight: 340 }}
      >
        <defs>
          <marker
            id="g-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L8,3 L0,6 Z" fill={T.textMuted} />
          </marker>
          <marker
            id="g-arrow-active"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L8,3 L0,6 Z" fill={T.accent} />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((e, i) => {
          const from = positions[String(e.from)];
          const to = positions[String(e.to)];
          if (!from || !to) return null;

          const active = isActiveEdge(e.from, e.to);
          const color = active ? T.accent : T.border;
          const directed = e.directed !== false; // default directed=true

          // Shorten line so arrowhead touches node edge, not center
          const dx = to.x - from.x,
            dy = to.y - from.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const ux = dx / len,
            uy = dy / len;
          const x2 = to.x - ux * (NODE_R + 4);
          const y2 = to.y - uy * (NODE_R + 4);

          // Midpoint for weight label
          const mx = (from.x + x2) / 2,
            my = (from.y + y2) / 2;

          return (
            <g key={i}>
              <line
                x1={from.x}
                y1={from.y}
                x2={x2}
                y2={y2}
                stroke={color}
                strokeWidth={active ? 2 : 1.5}
                markerEnd={
                  directed
                    ? `url(#g-arrow${active ? "-active" : ""})`
                    : undefined
                }
                style={{ transition: "stroke 0.15s" }}
              />
              {e.weight != null && (
                <text
                  x={mx}
                  y={my - 5}
                  textAnchor="middle"
                  fill={T.textMuted}
                  fontSize={10}
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {e.weight}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const pos = positions[String(n.id)];
          if (!pos) return null;
          const color = getNodeColor(n.id);
          const isCurrent = String(n.id) === String(current);
          const isVisited = visited.map(String).includes(String(n.id));
          const label = n.label ?? n.id;

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
                    ? `drop-shadow(0 0 7px ${color}88)`
                    : "none",
                  transition: "all 0.15s",
                }}
              />
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isCurrent || isVisited ? color : T.text}
                fontSize={String(label).length > 2 ? 9 : 12}
                fontFamily="'JetBrains Mono', monospace"
                fontWeight={700}
              >
                {label}
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
          marginTop: 4,
          paddingLeft: 8,
          flexWrap: "wrap",
        }}
      >
        {current != null && (
          <Legend color={T.accent} label={`Current: ${current}`} />
        )}
        {highlighted.length > 0 && (
          <Legend color={T.purple} label="Highlighted" />
        )}
        {visited.length > 0 && (
          <Legend color={T.green} label={`Visited (${visited.length})`} />
        )}
        {activeEdge != null && (
          <Legend
            color={T.accent}
            label={`Active edge: ${activeEdge[0]}→${activeEdge[1]}`}
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
