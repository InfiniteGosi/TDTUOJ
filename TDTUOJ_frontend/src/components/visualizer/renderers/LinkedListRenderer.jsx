// src/components/visualizer/renderers/LinkedListRenderer.jsx
// Frame shape: { type: "linkedlist", nodes: [{id, val, next?}], highlighted?: id[], current?: id }
// VisuAlgo-style: boxed nodes with a pointer compartment, thick arrows, ∅ terminator.
import { V, MONO, Canvas, Legend, EmptyNote, onColor } from "./vizTheme";

export default function LinkedListRenderer({ frame }) {
  if (!frame || !Array.isArray(frame.nodes) || frame.nodes.length === 0) {
    return <EmptyNote>No linked list data in this frame.</EmptyNote>;
  }

  const { nodes, highlighted = [], current = null } = frame;
  const highlightedSet = new Set(highlighted.map(String));

  // order nodes by following next pointers from the head
  const map = {};
  nodes.forEach((n) => (map[String(n.id)] = n));
  const pointedTo = new Set(
    nodes.filter((n) => n.next != null).map((n) => String(n.next)),
  );
  const head = nodes.find((n) => !pointedTo.has(String(n.id))) ?? nodes[0];

  const ordered = [];
  const seen = new Set();
  let cur = head;
  while (cur && !seen.has(String(cur.id)) && ordered.length <= nodes.length) {
    seen.add(String(cur.id));
    ordered.push(cur);
    cur = cur.next != null ? map[String(cur.next)] : null;
  }
  // orphans (cycles / disconnected) appended so nothing vanishes
  nodes.forEach((n) => {
    if (!seen.has(String(n.id))) ordered.push(n);
  });

  const fillOf = (id) => {
    if (current != null && String(id) === String(current)) return V.current;
    if (highlightedSet.has(String(id))) return V.highlight;
    return V.node;
  };

  return (
    <Canvas>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          flexWrap: "wrap",
          rowGap: 18,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontFamily: MONO,
            fontWeight: 700,
            color: V.muted,
            marginRight: 8,
          }}
        >
          HEAD →
        </div>

        {ordered.map((n, idx) => {
          const fill = fillOf(n.id);
          const active = fill !== V.node;
          const isLast = idx === ordered.length - 1 || n.next == null;
          return (
            <div key={n.id} style={{ display: "flex", alignItems: "center" }}>
              {/* node box: value | pointer compartment */}
              <div
                style={{
                  display: "flex",
                  border: `2px solid ${active ? fill : V.nodeBorder}`,
                  borderRadius: 8,
                  overflow: "hidden",
                  boxShadow: active ? `0 0 10px ${fill}66` : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{
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
                    padding: "0 10px",
                  }}
                >
                  {String(n.val ?? "·")}
                </div>
                <div
                  style={{
                    width: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: V.canvas,
                    color: V.muted,
                    fontSize: 14,
                    borderLeft: `2px solid ${active ? fill : V.nodeBorder}`,
                  }}
                >
                  {n.next != null ? "•" : "∅"}
                </div>
              </div>

              {/* arrow to the next node */}
              {!isLast && n.next != null && (
                <svg width="36" height="20" style={{ flexShrink: 0 }}>
                  <line x1="2" y1="10" x2="28" y2="10" stroke={V.edge} strokeWidth="2.5" />
                  <path d="M26,4 L35,10 L26,16 z" fill={V.edge} />
                </svg>
              )}
            </div>
          );
        })}

        {ordered.length > 0 && ordered[ordered.length - 1].next == null && (
          <div
            style={{
              marginLeft: 10,
              fontSize: 13,
              fontFamily: MONO,
              fontWeight: 700,
              color: V.faint,
            }}
          >
            NULL
          </div>
        )}
      </div>

      <Legend
        items={[
          current != null && { color: V.current, label: `Current: ${current}` },
          highlighted.length > 0 && { color: V.highlight, label: "Highlighted" },
        ]}
      />
    </Canvas>
  );
}
