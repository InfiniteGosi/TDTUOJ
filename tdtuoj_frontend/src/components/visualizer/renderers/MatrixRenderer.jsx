// src/components/visualizer/renderers/MatrixRenderer.jsx
// Frame shape expected:
//   {
//     type: "matrix",
//     data: (number|string)[][],   // 2D array, row-major (data[row][col])
//     current?: [row, col],        // currently active cell (orange glow)
//     highlighted?: [row, col][],  // extra highlighted cells (yellow)
//     path?: [row, col][],         // cells in the current path (green) — backtracking
//     visited?: [row, col][],      // visited cells (dim blue) — BFS/DFS on grid
//     walls?: [row, col][],        // blocked/wall cells (dark red fill)
//     dp?: (number|string)[][],    // optional separate DP table overlay (same dims)
//     rowLabels?: string[],        // optional row labels (left side)
//     colLabels?: string[],        // optional column labels (top)
//     label?: string               // optional matrix name
//   }
//
// C++ snapshot example:
//   string matSnap(vector<vector<int>>& g, int cr, int cc,
//                  vector<pair<int,int>> path={}) {
//       int R=g.size(), C=g[0].size();
//       string data="[";
//       for(int r=0;r<R;r++){
//           if(r)data+=","; data+="[";
//           for(int c=0;c<C;c++){if(c)data+=",";data+=to_string(g[r][c]);}
//           data+="]";
//       }
//       data+="]";
//       string cur="["+to_string(cr)+","+to_string(cc)+"]";
//       string pathStr="[";
//       for(int i=0;i<path.size();i++){
//           if(i)pathStr+=",";
//           pathStr+="["+to_string(path[i].first)+","+to_string(path[i].second)+"]";
//       }
//       pathStr+="]";
//       return "{\"type\":\"matrix\",\"data\":"+data+
//              ",\"current\":"+cur+",\"path\":"+pathStr+"}";
//   }

import { useMemo } from "react";

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

// Cell size adapts to grid dimensions
function cellSize(rows, cols) {
  const maxDim = Math.max(rows, cols);
  if (maxDim <= 6) return 52;
  if (maxDim <= 10) return 40;
  if (maxDim <= 16) return 30;
  if (maxDim <= 24) return 22;
  return 16;
}

function eqCell(a, b) {
  if (!a || !b) return false;
  return a[0] === b[0] && a[1] === b[1];
}

function inList(list, r, c) {
  return list.some((p) => p[0] === r && p[1] === c);
}

export default function MatrixRenderer({ frame }) {
  if (
    !frame ||
    !Array.isArray(frame.data) ||
    frame.data.length === 0 ||
    !Array.isArray(frame.data[0])
  ) {
    return (
      <div style={{ color: T.textMuted, fontSize: 13, padding: 16 }}>
        No matrix data in this frame.
      </div>
    );
  }

  const {
    data,
    current = null,
    highlighted = [],
    path = [],
    visited = [],
    walls = [],
    dp = null,
    rowLabels = [],
    colLabels = [],
    label = "matrix",
  } = frame;

  const rows = data.length;
  const cols = data[0].length;
  const cs = cellSize(rows, cols); // cell size in px
  const fontSize = cs <= 22 ? 8 : cs <= 30 ? 10 : cs <= 40 ? 11 : 13;

  // Build flat value range for heatmap coloring (when all values are numbers)
  const { allNums, minVal, maxVal } = useMemo(() => {
    const flat = data.flat();
    const allNums = flat.every((v) => typeof v === "number" && !isNaN(v));
    const minVal = allNums ? Math.min(...flat) : 0;
    const maxVal = allNums ? Math.max(...flat) : 1;
    return { allNums, minVal, maxVal };
  }, [data]);

  const getCellStyle = (r, c, val) => {
    const isWall = inList(walls, r, c);
    const isCurrent = eqCell(current, [r, c]);
    const isHighlighted = inList(highlighted, r, c);
    const isPath = inList(path, r, c);
    const isVisited = inList(visited, r, c);

    if (isWall) {
      return {
        bg: "rgba(239,71,67,0.25)",
        border: T.red,
        color: T.red,
        shadow: "none",
        bold: false,
      };
    }
    if (isCurrent) {
      return {
        bg: `rgba(255,161,22,0.22)`,
        border: T.accent,
        color: T.accent,
        shadow: `0 0 10px ${T.accent}66`,
        bold: true,
      };
    }
    if (isHighlighted) {
      return {
        bg: `rgba(255,161,22,0.12)`,
        border: T.accent,
        color: T.accent,
        shadow: "none",
        bold: true,
      };
    }
    if (isPath) {
      return {
        bg: `rgba(44,187,93,0.2)`,
        border: T.green,
        color: T.green,
        shadow: "none",
        bold: true,
      };
    }
    if (isVisited) {
      return {
        bg: `rgba(59,130,246,0.12)`,
        border: `${T.blue}66`,
        color: T.blue,
        shadow: "none",
        bold: false,
      };
    }

    // Default: subtle heatmap tint when all values are numbers
    if (allNums && maxVal !== minVal && typeof val === "number") {
      const t = (val - minVal) / (maxVal - minVal); // 0..1
      const alpha = Math.round(t * 0.35 * 255)
        .toString(16)
        .padStart(2, "0");
      return {
        bg: `#3b82f6${alpha}`,
        border: T.border,
        color: T.text,
        shadow: "none",
        bold: false,
      };
    }

    return {
      bg: T.surface,
      border: T.border,
      color: T.text,
      shadow: "none",
      bold: false,
    };
  };

  const hasColLabels = colLabels.length === cols;
  const hasRowLabels = rowLabels.length === rows;
  const labelPad = cs; // width of the row-label column

  return (
    <div
      style={{ padding: "12px 16px", userSelect: "none", overflowX: "auto" }}
    >
      {/* Header row: matrix name + stats */}
      <div
        style={{
          fontSize: 10,
          color: T.textMuted,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.08em",
          marginBottom: 10,
          textTransform: "uppercase",
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <span>{label}</span>
        <span style={{ color: T.accent }}>
          {rows}×{cols}
        </span>
        {path.length > 0 && (
          <span style={{ color: T.green }}>path: {path.length} cells</span>
        )}
        {visited.length > 0 && (
          <span style={{ color: T.blue }}>visited: {visited.length}</span>
        )}
      </div>

      <div style={{ display: "inline-block" }}>
        {/* Column labels */}
        {hasColLabels && (
          <div
            style={{
              display: "flex",
              marginBottom: 2,
              paddingLeft: hasRowLabels ? labelPad : 0,
            }}
          >
            {colLabels.map((lbl, c) => (
              <div
                key={c}
                style={{
                  width: cs,
                  textAlign: "center",
                  fontSize: 9,
                  color: T.textMuted,
                  fontFamily: "'JetBrains Mono', monospace",
                  flexShrink: 0,
                }}
              >
                {lbl}
              </div>
            ))}
          </div>
        )}

        {/* Auto column indices */}
        {!hasColLabels && cols <= 24 && (
          <div
            style={{
              display: "flex",
              marginBottom: 2,
              paddingLeft: hasRowLabels ? labelPad : 0,
            }}
          >
            {Array.from({ length: cols }, (_, c) => (
              <div
                key={c}
                style={{
                  width: cs,
                  textAlign: "center",
                  fontSize: cs <= 22 ? 7 : 9,
                  color: T.textMuted,
                  fontFamily: "'JetBrains Mono', monospace",
                  flexShrink: 0,
                }}
              >
                {c}
              </div>
            ))}
          </div>
        )}

        {/* Rows */}
        {data.map((row, r) => (
          <div key={r} style={{ display: "flex", alignItems: "center" }}>
            {/* Row label */}
            {hasRowLabels ? (
              <div
                style={{
                  width: labelPad,
                  textAlign: "right",
                  paddingRight: 6,
                  fontSize: 9,
                  color: T.textMuted,
                  fontFamily: "'JetBrains Mono', monospace",
                  flexShrink: 0,
                }}
              >
                {rowLabels[r]}
              </div>
            ) : (
              cols <= 24 && (
                <div
                  style={{
                    width: cs <= 22 ? 14 : 20,
                    textAlign: "right",
                    paddingRight: 4,
                    fontSize: cs <= 22 ? 7 : 9,
                    color: T.textMuted,
                    fontFamily: "'JetBrains Mono', monospace",
                    flexShrink: 0,
                  }}
                >
                  {r}
                </div>
              )
            )}

            {/* Cells */}
            {row.map((val, c) => {
              const s = getCellStyle(r, c, val);
              const isCurrent = eqCell(current, [r, c]);

              return (
                <div
                  key={c}
                  title={`[${r}][${c}] = ${val}`}
                  style={{
                    width: cs,
                    height: cs,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    backgroundColor: s.bg,
                    border: `1px solid ${s.border}`,
                    marginRight: -1,
                    marginBottom: -1,
                    boxShadow: s.shadow,
                    zIndex: isCurrent ? 2 : 1,
                    position: "relative",
                    transition: "background-color 0.15s, box-shadow 0.15s",
                    cursor: "default",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: s.bold ? 700 : 400,
                      color: s.color,
                      lineHeight: 1,
                    }}
                  >
                    {String(val)}
                  </span>

                  {/* DP overlay value */}
                  {dp && dp[r] && dp[r][c] != null && (
                    <span
                      style={{
                        fontSize: Math.max(fontSize - 2, 7),
                        fontFamily: "'JetBrains Mono', monospace",
                        color: T.purple,
                        lineHeight: 1,
                        marginTop: 1,
                        opacity: 0.85,
                      }}
                    >
                      {String(dp[r][c])}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 14,
          flexWrap: "wrap",
        }}
      >
        {current && (
          <Legend
            color={T.accent}
            label={`Current [${current[0]}][${current[1]}] = ${data[current[0]]?.[current[1]]}`}
          />
        )}
        {path.length > 0 && (
          <Legend color={T.green} label={`Path (${path.length} cells)`} />
        )}
        {visited.length > 0 && (
          <Legend color={T.blue} label={`Visited (${visited.length})`} />
        )}
        {walls.length > 0 && (
          <Legend color={T.red} label={`Walls (${walls.length})`} />
        )}
        {highlighted.length > 0 && (
          <Legend color={T.accent} label="Highlighted" />
        )}
        {dp && <Legend color={T.purple} label="DP value (subscript)" />}
        {allNums &&
          maxVal !== minVal &&
          path.length === 0 &&
          visited.length === 0 && (
            <Legend color={T.blue} label={`Heatmap [${minVal}…${maxVal}]`} />
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
