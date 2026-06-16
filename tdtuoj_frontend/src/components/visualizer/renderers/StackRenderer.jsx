// src/components/visualizer/renderers/StackRenderer.jsx
// Frame shape: { type: "stack", data: any[] (bottom→top), top?: number,
//   highlighted?: number[], pushed?: number, popped?: any, label?: string }
// VisuAlgo-style: vertical slot stack, TOP pointer, green pushed / red popped ghost.
import { V, MONO, Canvas, Legend, EmptyNote, onColor } from "./vizTheme";

const MAX_VISIBLE = 12;

export default function StackRenderer({ frame }) {
  if (!frame || !Array.isArray(frame.data)) {
    return <EmptyNote>No stack data in this frame.</EmptyNote>;
  }

  const { data, highlighted = [], pushed = null, popped = null } = frame;
  const topIndex = frame.top ?? data.length - 1;

  // display top-first; cap visible cells
  const display = data
    .map((val, i) => ({ val, i }))
    .reverse()
    .slice(0, MAX_VISIBLE);
  const hiddenCount = Math.max(0, data.length - MAX_VISIBLE);

  const fillOf = (i) => {
    if (i === pushed) return V.sorted;
    if (highlighted.includes(i)) return V.current;
    return V.node;
  };

  return (
    <Canvas>
      <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          {/* popped ghost */}
          {popped !== null && popped !== undefined && (
            <div
              style={{
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
                marginBottom: 6,
              }}
            >
              {String(popped)} ⤴
            </div>
          )}

          {data.length === 0 ? (
            <div
              style={{
                width: 130,
                minHeight: 56,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px dashed ${V.faint}`,
                borderRadius: 8,
                color: V.muted,
                fontSize: 13,
                fontFamily: MONO,
              }}
            >
              (empty)
            </div>
          ) : (
            display.map(({ val, i }) => {
              const fill = fillOf(i);
              const isTop = i === topIndex;
              const active = fill !== V.node;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
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
                      transition: "all 0.15s ease",
                    }}
                  >
                    {String(val)}
                  </div>
                  <div
                    style={{
                      width: 64,
                      fontSize: 12,
                      fontFamily: MONO,
                      fontWeight: 700,
                      color: isTop ? V.current : V.faint,
                    }}
                  >
                    {isTop ? "← TOP" : `[${i}]`}
                  </div>
                </div>
              );
            })
          )}

          {hiddenCount > 0 && (
            <div style={{ color: V.muted, fontSize: 12, fontFamily: MONO }}>
              … {hiddenCount} more below
            </div>
          )}

          {/* base */}
          <div
            style={{
              width: 150,
              height: 6,
              background: V.nodeBorder,
              borderRadius: 3,
              marginTop: 2,
            }}
          />
        </div>
      </div>

      <Legend
        items={[
          pushed != null && { color: V.sorted, label: "Just pushed" },
          popped != null && { color: V.swap, label: `Popped: ${popped}` },
          highlighted.length > 0 && { color: V.current, label: "Highlighted" },
        ]}
      />
    </Canvas>
  );
}
