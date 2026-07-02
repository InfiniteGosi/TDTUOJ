// src/components/visualizer/renderers/vizTheme.jsx
// Shared design system for all data-structure canvases — VisuAlgo-inspired:
// a FIXED dark canvas (immune to site light/dark mode), solid filled nodes,
// bold high-contrast labels, orange current / amber highlight / green sorted.
//
// Site chrome (cards, headers) keeps adapting via CSS vars — only the
// visualization canvas itself is pinned, like VisuAlgo's stage.

export const V = {
  // stage
  canvas: "#101b2d",
  canvasBorder: "#24344e",

  // text on canvas
  text: "#f2f6fc",
  muted: "#90a6c0",
  faint: "#566c87",

  // nodes (solid fills, VisuAlgo style)
  node: "#3c5878",        // default — white text
  nodeBorder: "#6f8cad",
  nodeText: "#ffffff",

  current: "#ff8f1f",     // orange — the element being processed (dark text)
  highlight: "#f6c10a",   // amber — marked/compared (dark text)
  visited: "#9b6dd6",     // violet — already seen (white text)
  sorted: "#2fbf71",      // green — done/sorted (dark text)
  swap: "#ff5252",        // red — swapped/removed (white text)
  darkText: "#15202e",

  // bars & edges
  bar: "#4fc3f7",
  edge: "#5d7ca0",
};
V.edgeActive = V.current;

export const MONO = "'JetBrains Mono', monospace";

/** Text color that stays readable on a given solid node fill. */
export function onColor(fill) {
  return fill === V.current || fill === V.highlight || fill === V.sorted || fill === V.bar
    ? V.darkText
    : "#ffffff";
}

/** Fixed dark stage every renderer draws on. */
export function Canvas({ children, style = {}, pad = 18 }) {
  return (
    <div
      style={{
        background: V.canvas,
        border: `1px solid ${V.canvasBorder}`,
        borderRadius: 10,
        padding: pad,
        margin: 10,
        overflow: "auto",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Legend({ items }) {
  const visible = items.filter(Boolean);
  if (visible.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
      {visible.map(({ color, label, round }) => (
        <div
          key={label}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: V.muted }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: round ? "50%" : 3,
              backgroundColor: color,
            }}
          />
          {label}
        </div>
      ))}
    </div>
  );
}

export function EmptyNote({ children }) {
  return (
    <Canvas>
      <div style={{ color: V.muted, fontSize: 14, textAlign: "center", padding: 8 }}>
        {children}
      </div>
    </Canvas>
  );
}
