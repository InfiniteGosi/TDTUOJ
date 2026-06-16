// src/components/visualizer/renderers/ArrayRenderer.jsx
// Frame shape: { type: "array", data: any[], highlighted?: number[], sorted?: number[], swapped?: number[] }
// VisuAlgo-style: solid bars + boxed cells, orange compare / red swap / green sorted.
import { V, MONO, Canvas, Legend, EmptyNote, onColor } from "./vizTheme";

export default function ArrayRenderer({ frame }) {
  if (!frame || !Array.isArray(frame.data)) {
    return <EmptyNote>No array data in this frame.</EmptyNote>;
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

  return (
    <Canvas>
      {/* Bar chart — numeric data only */}
      {numeric && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: n > 24 ? 2 : 4,
            height: 150,
            marginBottom: 12,
          }}
        >
          {data.map((val, i) => {
            const fill = fillOf(i);
            const active = swapped.includes(i) || highlighted.includes(i);
            const heightPct = Math.max((Math.abs(val) / maxVal) * 100, 5);
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  height: "100%",
                  minWidth: 14,
                }}
              >
                {n <= 30 && (
                  <div
                    style={{
                      fontSize: n > 20 ? 11 : 13,
                      color: active ? fill : V.muted,
                      marginBottom: 3,
                      fontFamily: MONO,
                      fontWeight: 700,
                    }}
                  >
                    {val}
                  </div>
                )}
                <div
                  style={{
                    width: "100%",
                    height: `${heightPct}%`,
                    backgroundColor: fill,
                    borderRadius: "4px 4px 0 0",
                    transition: "height 0.15s ease, background-color 0.15s ease",
                    boxShadow: active ? `0 0 10px ${fill}aa` : "none",
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Cells with indexes */}
      <div style={{ display: "flex", gap: n > 24 ? 2 : 4 }}>
        {data.map((val, i) => {
          const active = highlighted.includes(i) || swapped.includes(i) || sorted.includes(i);
          const fill = fillOf(i);
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                minWidth: 26,
              }}
            >
              <div
                style={{
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
                  padding: "0 2px",
                }}
              >
                {String(val)}
              </div>
              <div style={{ fontSize: 11, color: V.faint, fontFamily: MONO }}>{i}</div>
            </div>
          );
        })}
      </div>

      <Legend
        items={[
          highlighted.length > 0 && { color: V.current, label: "Highlighted" },
          swapped.length > 0 && { color: V.swap, label: "Swapped" },
          sorted.length > 0 && { color: V.sorted, label: "Sorted" },
        ]}
      />
    </Canvas>
  );
}
