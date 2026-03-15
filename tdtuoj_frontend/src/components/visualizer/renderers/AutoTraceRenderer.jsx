// src/components/visualizer/renderers/AutoTraceRenderer.jsx
//
// Used in AUTO mode. Frames look like:
//   { line, event, function, locals: { varName: value, ... } }
//
// C/C++ emit one frame per variable on the same line — we merge them here.
// Layout: variable table (left) + auto-detected visual (right)

import ArrayRenderer from "./ArrayRenderer";

const T = {
  bg: "#0f0f0f",
  surface: "#1a1a1a",
  border: "#2a2a2a",
  text: "#e8e8e8",
  textMuted: "#888",
  textDim: "#555",
  accent: "#ffa116",
  accentDim: "rgba(255,161,22,0.12)",
  green: "#2cbb5d",
  blue: "#3b82f6",
  purple: "#a78bfa",
  red: "#ef4743",
};

// Variable names commonly used as array indices
const INDEX_NAMES = new Set([
  "i",
  "j",
  "k",
  "l",
  "r",
  "m",
  "p",
  "q",
  "lo",
  "hi",
  "mid",
  "left",
  "right",
  "low",
  "high",
  "ptr",
  "cur",
  "idx",
  "index",
  "pos",
  "start",
  "end",
]);

// ── Merge frames with the same line + function into one locals snapshot ───────
// C/C++ transformers emit one _Ti()/_Td()/_Tv() per variable per line.
// This merges them so the renderer sees all variables at once.
function mergeLocalsAtStep(frames, step) {
  if (!frames || frames.length === 0) return {};

  const current = frames[step];
  if (!current) return {};

  const targetLine = current.line;
  const targetFn = current.function;

  // For C (which still emits one var per frame), merge adjacent same-line frames
  // For C++/Java/Python (one combined frame per line), this just returns that frame's locals

  // Scan backwards — stop after MAX_BURST to avoid collapsing loop iterations
  const MAX_BURST = 8; // max vars a single line could track
  let blockStart = step;
  let back = 0;
  while (
    blockStart > 0 &&
    back < MAX_BURST &&
    frames[blockStart - 1].line === targetLine &&
    frames[blockStart - 1].function === targetFn
  ) {
    blockStart--;
    back++;
  }

  // Scan forwards — same limit
  let blockEnd = step;
  let fwd = 0;
  while (
    blockEnd < frames.length - 1 &&
    fwd < MAX_BURST &&
    frames[blockEnd + 1].line === targetLine &&
    frames[blockEnd + 1].function === targetFn
  ) {
    blockEnd++;
    fwd++;
  }

  const merged = {};
  for (let i = blockStart; i <= blockEnd; i++) {
    Object.assign(merged, frames[i].locals || {});
  }
  return merged;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AutoTraceRenderer({ frame, frames = [], step = 0 }) {
  if (!frame) {
    return (
      <div
        style={{
          padding: 24,
          color: T.textMuted,
          fontSize: 13,
          textAlign: "center",
        }}
      >
        No frame data.
      </div>
    );
  }

  const { line, function: fn, event } = frame;

  // Merge same-line frames for C/C++ which emit one var per frame
  const locals = mergeLocalsAtStep(frames, step);

  // ── Detect arrays ──────────────────────────────────────────────────────────
  const arrayEntries = Object.entries(locals)
    .filter(
      ([, v]) =>
        Array.isArray(v) &&
        v.length > 0 &&
        v.every((x) => typeof x === "number"),
    )
    .sort(([, a], [, b]) => b.length - a.length);

  const mainArray = arrayEntries[0] ?? null;
  const secondaryArrays = arrayEntries.slice(1);
  const arrayLen = mainArray ? mainArray[1].length : 0;

  // ── Detect index variables pointing into main array ────────────────────────
  const highlighted = Object.entries(locals)
    .filter(
      ([k, v]) =>
        INDEX_NAMES.has(k) &&
        typeof v === "number" &&
        Number.isInteger(v) &&
        v >= 0 &&
        v < arrayLen,
    )
    .map(([, v]) => v);

  // ── Compute arr[i] current value for display in variable table ────────────
  const currentElements = highlighted
    .filter((idx) => mainArray && idx >= 0 && idx < mainArray[1].length)
    .map((idx) => {
      const indexVar =
        Object.entries(locals).find(
          ([k, v]) => INDEX_NAMES.has(k) && v === idx,
        )?.[0] ?? "i";
      return {
        indexVar,
        index: idx,
        value: mainArray[1][idx],
      };
    });

  // ── Separate scalars from arrays for the variable table ───────────────────
  const scalarEntries = Object.entries(locals).filter(
    ([, v]) => !Array.isArray(v) && typeof v !== "object" && v !== null,
  );

  // ── Track which variables changed from previous frame ─────────────────────
  const prevLocals = step > 0 ? mergeLocalsAtStep(frames, step - 1) : {};
  const changedKeys = new Set(
    Object.entries(locals)
      .filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(prevLocals[k]))
      .map(([k]) => k),
  );

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* ── Left: variable table ────────────────────────────────────────────── */}
      <div
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: `1px solid ${T.border}`,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Line + function + event header */}
        <div
          style={{
            padding: "8px 12px",
            borderBottom: `1px solid ${T.border}`,
            flexShrink: 0,
            background: T.surface,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: T.accent,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
              }}
            >
              line {line}
            </div>

            {fn && fn !== "<module>" && fn !== "main" && (
              <div
                style={{
                  fontSize: 10,
                  color: T.blue,
                  fontFamily: "'JetBrains Mono', monospace",
                  background: "rgba(59,130,246,0.1)",
                  border: "1px solid rgba(59,130,246,0.2)",
                  borderRadius: 3,
                  padding: "1px 6px",
                }}
              >
                {fn}()
              </div>
            )}

            {event === "call" && (
              <div
                style={{
                  fontSize: 9,
                  color: T.green,
                  fontFamily: "'JetBrains Mono', monospace",
                  background: "rgba(44,187,93,0.1)",
                  border: "1px solid rgba(44,187,93,0.2)",
                  borderRadius: 3,
                  padding: "1px 5px",
                }}
              >
                → call
              </div>
            )}

            {event === "return" && (
              <div
                style={{
                  fontSize: 9,
                  color: T.purple,
                  fontFamily: "'JetBrains Mono', monospace",
                  background: "rgba(167,139,250,0.1)",
                  border: "1px solid rgba(167,139,250,0.2)",
                  borderRadius: 3,
                  padding: "1px 5px",
                }}
              >
                ← return
              </div>
            )}
          </div>
        </div>

        {/* Scalar variables */}
        {scalarEntries.length === 0 && (
          <div
            style={{
              padding: "12px",
              fontSize: 11,
              color: T.textDim,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            No variables yet
          </div>
        )}

        {scalarEntries.map(([k, v]) => {
          const isIndex = INDEX_NAMES.has(k);
          const isHighlight =
            isIndex && typeof v === "number" && highlighted.includes(v);
          const isChanged = changedKeys.has(k);

          return (
            <div
              key={k}
              style={{
                display: "flex",
                alignItems: "baseline",
                padding: "4px 12px",
                gap: 8,
                borderBottom: `1px solid ${T.border}`,
                background: isHighlight
                  ? T.accentDim
                  : isChanged
                    ? "rgba(255,255,255,0.03)"
                    : "transparent",
                transition: "background 0.15s",
              }}
            >
              {/* Changed indicator dot */}
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: isChanged ? T.accent : "transparent",
                  marginTop: 1,
                }}
              />

              <span
                style={{
                  fontSize: 11,
                  minWidth: 56,
                  flexShrink: 0,
                  color: isHighlight ? T.accent : isIndex ? T.blue : T.purple,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                }}
              >
                {k}
              </span>

              <span
                style={{
                  fontSize: 11,
                  color: isChanged ? T.text : T.textMuted,
                  fontFamily: "'JetBrains Mono', monospace",
                  wordBreak: "break-all",
                  fontWeight: isChanged ? 600 : 400,
                  transition: "color 0.15s",
                }}
              >
                {JSON.stringify(v)}
              </span>
            </div>
          );
        })}

        {/* arr[i] current value — shown when an index variable points into the array */}
        {currentElements.map(({ indexVar, index, value }) => (
          <div
            key={`elem_${index}`}
            style={{
              display: "flex",
              alignItems: "baseline",
              padding: "4px 12px",
              gap: 8,
              borderBottom: `1px solid ${T.border}`,
              background: T.accentDim,
            }}
          >
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                flexShrink: 0,
                background: T.accent,
                marginTop: 1,
              }}
            />
            <span
              style={{
                fontSize: 11,
                minWidth: 56,
                flexShrink: 0,
                color: T.accent,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
              }}
            >
              {mainArray[0]}[{indexVar}]
            </span>
            <span
              style={{
                fontSize: 11,
                color: T.text,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
              }}
            >
              {JSON.stringify(value)}
            </span>
          </div>
        ))}

        {/* Array name badges */}
        {arrayEntries.map(([k, v]) => (
          <div
            key={k}
            style={{
              padding: "4px 12px",
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                flexShrink: 0,
                background: changedKeys.has(k) ? T.green : "transparent",
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: T.green,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
              }}
            >
              {k}
            </span>
            <span
              style={{
                fontSize: 10,
                color: T.textMuted,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              [{v.length}]
            </span>
          </div>
        ))}
      </div>

      {/* ── Right: visual panel ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {mainArray ? (
          <div>
            {/* Main array label */}
            <div
              style={{
                fontSize: 10,
                color: T.textMuted,
                marginBottom: 4,
                fontFamily: "'JetBrains Mono', monospace",
                paddingLeft: 8,
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={{ color: T.green, fontWeight: 700 }}>
                {mainArray[0]}
              </span>
              <span>[ {mainArray[1].length} ]</span>
              {highlighted.length > 0 && (
                <span
                  style={{
                    color: T.accent,
                    background: T.accentDim,
                    padding: "1px 6px",
                    borderRadius: 3,
                    border: `1px solid ${T.accent}44`,
                  }}
                >
                  index → [{highlighted.join(", ")}]
                </span>
              )}
            </div>

            <ArrayRenderer
              frame={{
                type: "array",
                data: mainArray[1],
                highlighted: highlighted,
              }}
            />

            {/* Secondary arrays */}
            {secondaryArrays.map(([k, v]) => (
              <div key={k} style={{ marginTop: 20 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: T.textMuted,
                    marginBottom: 4,
                    fontFamily: "'JetBrains Mono', monospace",
                    paddingLeft: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ color: T.green, fontWeight: 700 }}>{k}</span>
                  <span>[ {v.length} ]</span>
                </div>
                <ArrayRenderer
                  frame={{ type: "array", data: v, highlighted: [] }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              minHeight: 180,
              color: T.textMuted,
              gap: 10,
            }}
          >
            <div style={{ fontSize: 32, opacity: 0.12 }}>[ ]</div>
            <div
              style={{
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                color: T.textMuted,
              }}
            >
              No numeric array detected
            </div>
            <div
              style={{
                fontSize: 10,
                opacity: 0.5,
                textAlign: "center",
                maxWidth: 240,
                lineHeight: 1.7,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Variables are shown in the left panel. Arrays appear here
              automatically once your code declares one.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
