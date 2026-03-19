// src/components/visualizer/renderers/QueueRenderer.jsx
// Frame shape expected:
//   {
//     type: "queue",
//     data: any[],           // front → back order (data[0] is front/head)
//     front?: number,        // index of front element (default 0)
//     back?: number,         // index of back element (default data.length-1)
//     highlighted?: number[], // indices to highlight (yellow)
//     enqueued?: number,     // index just enqueued (green glow, typically back)
//     dequeued?: any,        // value that was just dequeued (shown as ghost)
//     label?: string         // optional queue name
//   }
//
// C++ snapshot example (std::queue):
//   string queueSnap(queue<int> q) {
//       string data = "[";
//       bool first = true;
//       queue<int> tmp = q;
//       while (!tmp.empty()) {
//           if (!first) data += ",";
//           data += to_string(tmp.front());
//           tmp.pop(); first = false;
//       }
//       data += "]";
//       return "{\"type\":\"queue\",\"data\":" + data + "}";
//   }

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

const CELL_W = 64;
const CELL_H = 48;
const MAX_VISIBLE = 10;

export default function QueueRenderer({ frame }) {
  if (!frame || !Array.isArray(frame.data)) {
    return (
      <div style={{ color: T.textMuted, fontSize: 13, padding: 16 }}>
        No queue data in this frame.
      </div>
    );
  }

  const {
    data,
    highlighted = [],
    enqueued = null,
    dequeued = null,
    label = "queue",
  } = frame;

  const frontIdx = frame.front != null ? frame.front : 0;
  const backIdx = frame.back != null ? frame.back : data.length - 1;

  // Truncate if too long; keep front and back ends visible
  let visible = data;
  let truncated = false;
  if (data.length > MAX_VISIBLE) {
    visible = data.slice(0, MAX_VISIBLE);
    truncated = true;
  }

  const getCellColor = (origIdx) => {
    if (origIdx === enqueued) return T.green;
    if (highlighted.includes(origIdx)) return T.accent;
    if (origIdx === frontIdx) return T.blue;
    if (origIdx === backIdx) return T.purple;
    return null;
  };

  return (
    <div style={{ padding: "16px 24px", userSelect: "none" }}>
      {/* Label */}
      <div
        style={{
          fontSize: 10,
          color: T.textMuted,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.08em",
          marginBottom: 14,
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span>{label}</span>
        <span style={{ color: T.accent }}>
          [{data.length} item{data.length !== 1 ? "s" : ""}]
        </span>
        {dequeued != null && (
          <div
            style={{
              fontSize: 10,
              color: T.red,
              fontFamily: "'JetBrains Mono', monospace",
              background: "rgba(239,71,67,0.1)",
              border: `1px solid ${T.red}44`,
              borderRadius: 4,
              padding: "1px 7px",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span style={{ opacity: 0.7 }}>dequeued</span>{" "}
            <span style={{ color: T.text, fontWeight: 700 }}>
              {String(dequeued)}
            </span>
          </div>
        )}
      </div>

      {/* FRONT label */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 0,
          marginBottom: 4,
          paddingLeft: 0,
        }}
      >
        <div
          style={{
            width: CELL_W,
            textAlign: "center",
            fontSize: 10,
            color: T.blue,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            letterSpacing: "0.06em",
          }}
        >
          FRONT
        </div>
      </div>

      {/* Queue row */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
        {/* Dequeue arrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            paddingRight: 8,
            color: T.red,
            fontSize: 16,
            opacity: 0.5,
          }}
        >
          ←
        </div>

        {/* Empty state */}
        {data.length === 0 && (
          <div
            style={{
              width: CELL_W * 2,
              height: CELL_H,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px dashed ${T.border}`,
              borderRadius: 6,
              fontSize: 11,
              color: T.textMuted,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            (empty)
          </div>
        )}

        {/* Cells */}
        {visible.map((val, i) => {
          const color = getCellColor(i);
          const isFirst = i === 0;
          const isLast = i === visible.length - 1 && !truncated;

          return (
            <div
              key={i}
              style={{
                width: CELL_W,
                height: CELL_H,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                backgroundColor: color ? `${color}18` : T.surface,
                border: `1px solid ${color ?? T.border}`,
                borderLeft: isFirst ? `1px solid ${color ?? T.border}` : "none",
                borderRadius:
                  isFirst && isLast
                    ? 6
                    : isFirst
                      ? "6px 0 0 6px"
                      : isLast
                        ? "0 6px 6px 0"
                        : 0,
                filter:
                  i === enqueued ? `drop-shadow(0 0 6px ${T.green}66)` : "none",
                transition: "all 0.15s ease",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: String(val).length > 4 ? 9 : 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  color: color ?? T.text,
                }}
              >
                {String(val)}
              </span>
              <span
                style={{
                  fontSize: 8,
                  color: T.textMuted,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                [{i}]
              </span>
            </div>
          );
        })}

        {/* Truncation indicator */}
        {truncated && (
          <div
            style={{
              width: 40,
              height: CELL_H,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              color: T.textMuted,
              fontFamily: "'JetBrains Mono', monospace",
              border: `1px dashed ${T.border}`,
              borderLeft: "none",
              borderRadius: "0 6px 6px 0",
            }}
          >
            +{data.length - MAX_VISIBLE}
          </div>
        )}

        {/* Enqueue arrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            paddingLeft: 8,
            color: T.green,
            fontSize: 16,
            opacity: 0.5,
          }}
        >
          ←
        </div>
      </div>

      {/* BACK label — aligned to last visible cell */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 0,
          marginTop: 4,
        }}
      >
        <div style={{ width: 24 }} />
        {/* offset for dequeue arrow */}
        {Array.from({ length: visible.length }).map((_, i) => (
          <div
            key={i}
            style={{
              width: CELL_W,
              textAlign: "center",
              fontSize: 9,
              color:
                i === visible.length - 1 && !truncated
                  ? T.purple
                  : "transparent",
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              letterSpacing: "0.06em",
            }}
          >
            {i === visible.length - 1 && !truncated ? "BACK" : ""}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 16,
          flexWrap: "wrap",
        }}
      >
        {enqueued != null && (
          <Legend
            color={T.green}
            label={`Enqueued → [${enqueued}] = ${data[enqueued]}`}
          />
        )}
        {highlighted.length > 0 && (
          <Legend
            color={T.accent}
            label={`Highlighted [${highlighted.join(", ")}]`}
          />
        )}
        {data.length > 0 && (
          <Legend color={T.blue} label={`Front = ${data[frontIdx]}`} />
        )}
        {data.length > 1 && (
          <Legend color={T.purple} label={`Back = ${data[backIdx]}`} />
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
        gap: 6,
        fontSize: 11,
        color: T.textMuted,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: 2,
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      {label}
    </div>
  );
}
