// src/components/visualizer/theme.js
// Shared design tokens for all visualizer components.
// Values match the CSS variable system in index.css.
// Import: import T from "../theme";  (adjust path as needed)

const T = {
  // Backgrounds — mapped to CSS design system
  bg:         "var(--bg-base)",       // #0D1420 — base surface
  surface:    "var(--bg-raised)",     // #131B2A — raised surfaces
  border:     "var(--border-default)",// rgba(255,255,255,0.09)

  // Text
  text:       "var(--text-primary)",  // #E8EDF5
  textMuted:  "var(--text-secondary)",// #8896B0
  textDim:    "var(--text-muted)",    // #4A5568

  // Brand accent — orange kept as-is (visualizer-specific, not in design system)
  accent:     "#ffa116",
  accentDim:  "rgba(255,161,22,0.12)",

  // Status colors — mapped to CSS vars
  green:      "var(--green-ac)",      // #00E676
  red:        "var(--red-wa)",        // #FF3B3B

  // Semantic colors — kept as literals for Monaco decoration compatibility
  blue:       "#3b82f6",
  blueDim:    "rgba(59,130,246,0.18)",
  yellow:     "#f5c518",
  yellowDim:  "rgba(245,197,24,0.15)",
  purple:     "#a78bfa",
};

export default T;
