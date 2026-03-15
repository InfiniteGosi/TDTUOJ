// src/components/visualizer/renderers/LinkedListRenderer.jsx
// Frame shape expected:
//   { type: "linkedlist", nodes: [{id, val, next?}], highlighted?: id[], current?: id }

const T = {
  surface: "#1a1a1a",
  border: "#2a2a2a",
  text: "#e8e8e8",
  textMuted: "#888",
  accent: "#ffa116",
  green: "#2cbb5d",
  blue: "#3b82f6",
  purple: "#a78bfa",
};

const NODE_W = 52;
const NODE_H = 36;
const GAP = 40; // space between nodes (for arrow)

export default function LinkedListRenderer({ frame }) {
  if (!frame || !Array.isArray(frame.nodes) || frame.nodes.length === 0) {
    return (
      <div style={{ color: T.textMuted, fontSize: 13, padding: 16 }}>
        No linked list data in this frame.
      </div>
    );
  }

  const { nodes, highlighted = [], current = null } = frame;

  // Sort nodes in list order following .next pointers
  const map = {};
  nodes.forEach((n) => {
    map[n.id] = n;
  });
  const childIds = new Set(nodes.map((n) => n.next).filter(Boolean));
  const heads = nodes.filter((n) => !childIds.has(n.id));
  const head = heads[0] || nodes[0];

  const ordered = [];
  let cur = head;
  const seen = new Set();
  while (cur && !seen.has(cur.id)) {
    ordered.push(cur);
    seen.add(cur.id);
    cur = cur.next != null ? map[cur.next] : null;
  }

  const totalW = ordered.length * NODE_W + (ordered.length - 1) * GAP + 32;
  const svgH = NODE_H + 60;

  const getColor = (id) => {
    if (String(id) === String(current)) return T.accent;
    if (highlighted.map(String).includes(String(id))) return T.purple;
    return T.blue;
  };

  return (
    <div style={{ width: "100%", overflowX: "auto", padding: "16px 8px" }}>
      <svg
        width={Math.max(totalW, 200)}
        height={svgH}
        style={{ display: "block", margin: "0 auto" }}
      >
        {ordered.map((node, i) => {
          const x = 16 + i * (NODE_W + GAP);
          const y = 20;
          const color = getColor(node.id);
          const isActive =
            String(node.id) === String(current) ||
            highlighted.map(String).includes(String(node.id));

          return (
            <g key={node.id}>
              {/* Node box */}
              <rect
                x={x}
                y={y}
                width={NODE_W}
                height={NODE_H}
                rx={6}
                fill={`${color}18`}
                stroke={color}
                strokeWidth={isActive ? 2 : 1}
                style={{
                  filter: isActive ? `drop-shadow(0 0 5px ${color}66)` : "none",
                }}
              />
              <text
                x={x + NODE_W / 2}
                y={y + NODE_H / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isActive ? color : T.text}
                fontSize={String(node.val).length > 3 ? 9 : 12}
                fontFamily="'JetBrains Mono', monospace"
                fontWeight={700}
              >
                {node.val}
              </text>

              {/* Index label */}
              <text
                x={x + NODE_W / 2}
                y={y + NODE_H + 14}
                textAnchor="middle"
                fill={T.textMuted}
                fontSize={9}
                fontFamily="'JetBrains Mono', monospace"
              >
                {i}
              </text>

              {/* Arrow to next */}
              {i < ordered.length - 1 && (
                <>
                  <line
                    x1={x + NODE_W}
                    y1={y + NODE_H / 2}
                    x2={x + NODE_W + GAP - 6}
                    y2={y + NODE_H / 2}
                    stroke={T.border}
                    strokeWidth={1.5}
                    markerEnd="url(#arrowhead)"
                  />
                </>
              )}

              {/* NULL cap on last node */}
              {i === ordered.length - 1 && (
                <text
                  x={x + NODE_W + 6}
                  y={y + NODE_H / 2 + 1}
                  fill={T.textMuted}
                  fontSize={10}
                  fontFamily="'JetBrains Mono', monospace"
                  dominantBaseline="central"
                >
                  → null
                </text>
              )}
            </g>
          );
        })}

        <defs>
          <marker
            id="arrowhead"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill={T.textMuted} />
          </marker>
        </defs>
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
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
      {label}
    </div>
  );
}
