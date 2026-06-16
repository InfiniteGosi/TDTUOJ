// src/components/visualizer/renderers/QueueRenderer.jsx
// Frame shape: { type: "queue", data: any[] (front→back), front?: number, back?: number,
//   highlighted?: number[], enqueued?: number, dequeued?: any, label?: string }
// VisuAlgo-style: horizontal FIFO band, FRONT/BACK pointers, green enqueued / red dequeued ghost.
import { V, MONO, Canvas, Legend, EmptyNote, onColor } from "./vizTheme";

const MAX_VISIBLE = 10;

export default function QueueRenderer({ frame }) {
  if (!frame || !Array.isArray(frame.data)) {
    return <EmptyNote>No queue data in this frame.</EmptyNote>;
  }

  const { data, highlighted = [], enqueued = null, dequeued = null } = frame;
  const front = frame.front ?? 0;
  const back = frame.back ?? data.length - 1;

  const display = data.map((val, i) => ({ val, i })).slice(0, MAX_VISIBLE);
  const hiddenCount = Math.max(0, data.length - MAX_VISIBLE);

  const fillOf = (i) => {
    if (i === enqueued) return V.sorted;
    if (highlighted.includes(i)) return V.current;
    return V.node;
  };

  return (
    <Canvas>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {/* dequeued ghost (leaves from the front) */}
        {dequeued !== null && dequeued !== undefined && (
          <div
            style={{
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
              opacity: 0.85,
            }}
          >
            ⤴ {String(dequeued)}
          </div>
        )}

        {data.length === 0 ? (
          <div
            style={{
              minWidth: 140,
              minHeight: 48,
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
            const active = fill !== V.node;
            const isFront = i === front;
            const isBack = i === back;
            return (
              <div
                key={i}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: MONO,
                    fontWeight: 700,
                    color: isFront ? V.current : isBack ? V.sorted : "transparent",
                    minHeight: 14,
                  }}
                >
                  {isFront && isBack ? "FRONT/BACK" : isFront ? "FRONT ↓" : isBack ? "BACK ↓" : "·"}
                </div>
                <div
                  style={{
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
                    transition: "all 0.15s ease",
                  }}
                >
                  {String(val)}
                </div>
                <div style={{ fontSize: 11, color: V.faint, fontFamily: MONO }}>{i}</div>
              </div>
            );
          })
        )}

        {hiddenCount > 0 && (
          <div style={{ color: V.muted, fontSize: 12, fontFamily: MONO }}>
            … +{hiddenCount}
          </div>
        )}
      </div>

      <Legend
        items={[
          enqueued != null && { color: V.sorted, label: "Just enqueued" },
          dequeued != null && { color: V.swap, label: `Dequeued: ${dequeued}` },
          highlighted.length > 0 && { color: V.current, label: "Highlighted" },
        ]}
      />
    </Canvas>
  );
}
