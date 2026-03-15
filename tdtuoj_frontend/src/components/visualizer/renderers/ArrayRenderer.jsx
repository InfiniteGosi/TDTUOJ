// src/components/visualizer/renderers/ArrayRenderer.jsx
// Frame shape expected:
//   { type: "array", data: number[], highlighted?: number[], sorted?: number[], swapped?: number[] }

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

export default function ArrayRenderer({ frame }) {
  if (!frame || !Array.isArray(frame.data)) {
    return (
      <div style={{ color: T.textMuted, fontSize: 13, padding: 16 }}>
        No array data in this frame.
      </div>
    );
  }

  const { data, highlighted = [], sorted = [], swapped = [] } = frame;
  const maxVal = Math.max(...data.map(Math.abs), 1);

  const getColor = (index) => {
    if (swapped.includes(index)) return T.red;
    if (highlighted.includes(index)) return T.accent;
    if (sorted.includes(index)) return T.green;
    return T.blue;
  };

  const getBarOpacity = (index) => {
    if (swapped.includes(index)) return 1;
    if (highlighted.includes(index)) return 1;
    if (sorted.includes(index)) return 0.9;
    return 0.5;
  };

  return (
    <div style={{ width: "100%", padding: "16px 8px" }}>
      {/* Bar chart */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 3,
          height: 140,
          padding: "0 8px",
          marginBottom: 8,
        }}
      >
        {data.map((val, i) => {
          const color = getColor(i);
          const heightPct = Math.max((Math.abs(val) / maxVal) * 100, 4);
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
              }}
            >
              {/* Value label on top of bar */}
              <div
                style={{
                  fontSize: data.length > 20 ? 8 : 11,
                  color:
                    highlighted.includes(i) || swapped.includes(i)
                      ? color
                      : T.textMuted,
                  marginBottom: 2,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                }}
              >
                {data.length <= 30 ? val : ""}
              </div>
              <div
                style={{
                  width: "100%",
                  height: `${heightPct}%`,
                  backgroundColor: color,
                  opacity: getBarOpacity(i),
                  borderRadius: "3px 3px 0 0",
                  transition: "height 0.15s ease, background-color 0.15s ease",
                  boxShadow:
                    highlighted.includes(i) || swapped.includes(i)
                      ? `0 0 8px ${color}88`
                      : "none",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Index cells */}
      <div
        style={{
          display: "flex",
          gap: 3,
          padding: "0 8px",
        }}
      >
        {data.map((val, i) => {
          const color = getColor(i);
          const isActive =
            highlighted.includes(i) ||
            swapped.includes(i) ||
            sorted.includes(i);
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <div
                style={{
                  width: "100%",
                  minHeight: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${isActive ? color : T.border}`,
                  borderRadius: 4,
                  backgroundColor: isActive ? `${color}18` : T.surface,
                  fontSize: data.length > 15 ? 9 : 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  color: isActive ? color : T.text,
                  transition: "all 0.15s ease",
                  boxShadow: isActive ? `0 0 6px ${color}44` : "none",
                }}
              >
                {val}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: T.textMuted,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {i}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 14,
          paddingLeft: 8,
          flexWrap: "wrap",
        }}
      >
        {highlighted.length > 0 && (
          <Legend
            color={T.accent}
            label={`Highlighted [${highlighted.join(", ")}]`}
          />
        )}
        {swapped.length > 0 && (
          <Legend color={T.red} label={`Swapped [${swapped.join(", ")}]`} />
        )}
        {sorted.length > 0 && (
          <Legend color={T.green} label={`Sorted [${sorted.join(", ")}]`} />
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
