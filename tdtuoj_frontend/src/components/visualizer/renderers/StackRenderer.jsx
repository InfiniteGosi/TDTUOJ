// src/components/visualizer/renderers/StackRenderer.jsx
// Frame shape expected:
//   {
//     type: "stack",
//     data: any[],          // bottom → top order (data[0] is bottom)
//     top?: number,         // index of top element (defaults to data.length - 1)
//     highlighted?: number[],  // indices to highlight (yellow)
//     pushed?: number,      // index just pushed (green glow)
//     popped?: any,         // value that was just popped (shown as ghost)
//     label?: string        // optional stack name
//   }
//
// C++ snapshot example:
//   string stackSnap(stack<int> s, int pushed=-1) {
//       vector<int> v; while(!s.empty()){v.push_back(s.top());s.pop();}
//       reverse(v.begin(),v.end());
//       string data="["; for(int i=0;i<v.size();i++){if(i)data+=",";data+=to_string(v[i]);}data+="]";
//       return "{\"type\":\"stack\",\"data\":"+data+(pushed!=-1?",\"pushed\":"+to_string(v.size()-1):"")+"}";
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

const CELL_H = 40;
const CELL_W = 120;
const MAX_VISIBLE = 12; // cap visible cells before scrolling

export default function StackRenderer({ frame }) {
  if (!frame || !Array.isArray(frame.data)) {
    return (
      <div style={{ color: T.textMuted, fontSize: 13, padding: 16 }}>
        No stack data in this frame.
      </div>
    );
  }

  const {
    data,
    highlighted = [],
    pushed = null,
    popped = null,
    label = "stack",
  } = frame;

  const topIdx = frame.top != null ? frame.top : data.length - 1;

  // Render top-of-stack first (visually stack grows upward)
  const reversed = [...data].reverse();
  const reversedBase = data.length - 1; // maps reversed[i] → original index

  const getCellColor = (origIdx) => {
    if (origIdx === pushed) return T.green;
    if (highlighted.includes(origIdx)) return T.accent;
    if (origIdx === topIdx) return T.blue;
    return null; // default
  };

  const visibleCount = Math.min(reversed.length, MAX_VISIBLE);
  const hiddenCount = reversed.length - visibleCount;

  return (
    <div style={{ padding: "16px 24px", userSelect: "none" }}>
      {/* Label */}
      <div
        style={{
          fontSize: 10,
          color: T.textMuted,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.08em",
          marginBottom: 10,
          textTransform: "uppercase",
        }}
      >
        {label}
        <span style={{ color: T.accent, marginLeft: 8 }}>
          [{data.length} item{data.length !== 1 ? "s" : ""}]
        </span>
      </div>

      <div style={{ display: "flex", gap: 32, alignItems: "flex-end" }}>
        {/* Stack column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {/* TOP label */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: data.length > 0 ? T.accent : T.textMuted,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              ▲ TOP
            </div>
            {popped != null && (
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
                <span style={{ opacity: 0.7 }}>popped</span>{" "}
                <span style={{ color: T.text, fontWeight: 700 }}>
                  {String(popped)}
                </span>
              </div>
            )}
          </div>

          {/* Hidden overflow indicator */}
          {hiddenCount > 0 && (
            <div
              style={{
                width: CELL_W,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                color: T.textMuted,
                fontFamily: "'JetBrains Mono', monospace",
                borderLeft: `1px dashed ${T.border}`,
                borderRight: `1px dashed ${T.border}`,
                marginBottom: 0,
              }}
            >
              ··· {hiddenCount} more below ···
            </div>
          )}

          {/* Empty stack */}
          {data.length === 0 && (
            <div
              style={{
                width: CELL_W,
                height: CELL_H,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px dashed ${T.border}`,
                borderRadius: 4,
                fontSize: 11,
                color: T.textMuted,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              (empty)
            </div>
          )}

          {/* Cells — top to bottom */}
          {reversed.slice(0, visibleCount).map((val, i) => {
            const origIdx = reversedBase - i;
            const color = getCellColor(origIdx);
            const isTop = origIdx === topIdx && data.length > 0;
            const isFirst = i === 0;
            const isLast = i === visibleCount - 1 && hiddenCount === 0;

            return (
              <div
                key={origIdx}
                style={{
                  width: CELL_W,
                  height: CELL_H,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 12px",
                  backgroundColor: color ? `${color}18` : T.surface,
                  border: `1px solid ${color ?? T.border}`,
                  borderTop: isFirst
                    ? `1px solid ${color ?? T.border}`
                    : "none",
                  borderRadius:
                    isFirst && isLast
                      ? 6
                      : isFirst
                        ? "6px 6px 0 0"
                        : isLast
                          ? "0 0 6px 6px"
                          : 0,
                  boxShadow: color ? `inset 0 0 0 1px ${color}22` : "none",
                  filter:
                    origIdx === pushed
                      ? `drop-shadow(0 0 6px ${T.green}66)`
                      : "none",
                  transition: "all 0.15s ease",
                  position: "relative",
                }}
              >
                {/* Value */}
                <span
                  style={{
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    color: color ?? T.text,
                  }}
                >
                  {String(val)}
                </span>

                {/* Index + TOP badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {isTop && (
                    <span
                      style={{
                        fontSize: 9,
                        color: T.accent,
                        fontFamily: "'JetBrains Mono', monospace",
                        background: "rgba(255,161,22,0.12)",
                        border: `1px solid ${T.accent}44`,
                        borderRadius: 3,
                        padding: "1px 5px",
                        fontWeight: 700,
                      }}
                    >
                      top
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 9,
                      color: T.textMuted,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    [{origIdx}]
                  </span>
                </div>
              </div>
            );
          })}

          {/* Bottom wall */}
          <div
            style={{
              width: CELL_W,
              height: 4,
              background: T.border,
              borderRadius: "0 0 4px 4px",
              marginTop: data.length === 0 ? 0 : 0,
            }}
          />
          <div
            style={{
              fontSize: 9,
              color: T.textMuted,
              fontFamily: "'JetBrains Mono', monospace",
              marginTop: 4,
              textAlign: "center",
              letterSpacing: "0.06em",
            }}
          >
            ▼ BOTTOM
          </div>
        </div>

        {/* Legend / info column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            paddingBottom: 28,
            justifyContent: "flex-end",
          }}
        >
          {pushed != null && (
            <Legend
              color={T.green}
              label={`Pushed → [${pushed}] = ${data[pushed]}`}
            />
          )}
          {highlighted.length > 0 && (
            <Legend
              color={T.accent}
              label={`Highlighted [${highlighted.join(", ")}]`}
            />
          )}
          {topIdx >= 0 && data.length > 0 && (
            <Legend color={T.blue} label={`Top = ${data[topIdx]}`} />
          )}
        </div>
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
