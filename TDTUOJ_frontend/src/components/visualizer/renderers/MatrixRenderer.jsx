// src/components/visualizer/renderers/MatrixRenderer.jsx
// Frame shape: { type: "matrix", data: (number|string)[][], current?: [r,c],
//   highlighted?: [r,c][], path?: [r,c][], visited?: [r,c][], walls?: [r,c][],
//   selected?: [r,c][], patched?: [r,c][], rowLabels?, colLabels?, label? }
// VisuAlgo-style grid + wheel-zoom / drag-pan (CSS transform, ported from
// algorithm-visualizer's Array2DRenderer pan/zoom). selected=blue, patched=magenta.
import { V, MONO, Canvas, Legend, EmptyNote, onColor } from "./vizTheme";
import { fmt } from "./vizFormat";
import { useZoomPan, ZoomControls } from "./useZoomPan";

const key = (r, c) => `${r},${c}`;
const WALL = "#5b2733";

export default function MatrixRenderer({ frame }) {
  const zp = useZoomPan();

  if (
    !frame ||
    !Array.isArray(frame.data) ||
    frame.data.length === 0 ||
    !Array.isArray(frame.data[0])
  ) {
    return <EmptyNote>No matrix data in this frame.</EmptyNote>;
  }

  const {
    data,
    current = null,
    highlighted = [],
    path = [],
    visited = [],
    walls = [],
    selected = [],
    patched = [],
    rowLabels = null,
    colLabels = null,
  } = frame;

  const rows = data.length;
  const cols = Math.max(...data.map((r) => r.length));

  const pathSet = new Set(path.map(([r, c]) => key(r, c)));
  const visitedSet = new Set(visited.map(([r, c]) => key(r, c)));
  const wallSet = new Set(walls.map(([r, c]) => key(r, c)));
  const highlightedSet = new Set(highlighted.map(([r, c]) => key(r, c)));
  const selectedSet = new Set(selected.map(([r, c]) => key(r, c)));
  const patchedSet = new Set(patched.map(([r, c]) => key(r, c)));
  const currentKey = current ? key(current[0], current[1]) : null;

  const cell = cols > 16 || rows > 16 ? 30 : cols > 10 || rows > 10 ? 38 : 46;
  const font = cell >= 46 ? 15 : cell >= 38 ? 13 : 11;

  const fillOf = (r, c) => {
    const k = key(r, c);
    if (k === currentKey) return V.current;
    if (patchedSet.has(k)) return V.patched;
    if (selectedSet.has(k)) return V.selected;
    if (highlightedSet.has(k)) return V.highlight;
    if (pathSet.has(k)) return V.sorted;
    if (wallSet.has(k)) return WALL;
    if (visitedSet.has(k)) return V.visited;
    return V.node;
  };

  // viewport height: fit content but cap so large matrices pan instead of overflow
  const contentH = (rows + 1) * (cell + 3) + 12;
  const viewportH = Math.min(contentH, 480);

  return (
    <Canvas>
      <div style={{ position: "relative" }}>
        <ZoomControls reset={zp.reset} zoomBy={zp.zoomBy} />
        <div
          ref={zp.ref}
          {...zp.handlers}
          style={{
            ...zp.handlers.style,
            height: viewportH,
            overflow: "hidden",
            borderRadius: 8,
          }}
        >
          <div style={{ transform: zp.cssTransform, transformOrigin: "0 0", display: "inline-block" }}>
            {/* column labels / indexes */}
            <div style={{ display: "flex", marginLeft: rowLabels || rows > 1 ? 30 : 0 }}>
              {Array.from({ length: cols }, (_, c) => (
                <div
                  key={c}
                  style={{
                    width: cell,
                    marginRight: 3,
                    textAlign: "center",
                    fontSize: 11,
                    color: V.faint,
                    fontFamily: MONO,
                  }}
                >
                  {colLabels?.[c] ?? c}
                </div>
              ))}
            </div>

            {data.map((row, r) => (
              <div key={r} style={{ display: "flex", alignItems: "center", marginTop: 3 }}>
                <div
                  style={{
                    width: 26,
                    marginRight: 4,
                    textAlign: "right",
                    fontSize: 11,
                    color: V.faint,
                    fontFamily: MONO,
                  }}
                >
                  {rowLabels?.[r] ?? r}
                </div>
                {Array.from({ length: cols }, (_, c) => {
                  const val = row[c];
                  const fill = fillOf(r, c);
                  const active = fill !== V.node && fill !== WALL;
                  return (
                    <div
                      key={c}
                      style={{
                        width: cell,
                        height: cell,
                        marginRight: 3,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: fill,
                        border: `2px solid ${active ? "#ffffff55" : V.canvasBorder}`,
                        borderRadius: 5,
                        fontSize: font,
                        fontFamily: MONO,
                        fontWeight: 700,
                        color: fill === WALL ? "#e08a96" : onColor(fill),
                        transition: "background-color 0.15s ease, border-color 0.15s ease",
                        boxShadow: key(r, c) === currentKey ? `0 0 10px ${V.current}aa` : "none",
                        overflow: "hidden",
                      }}
                    >
                      {val === undefined ? "" : fmt(val)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Legend
        items={[
          current && { color: V.current, label: `Current (${current[0]}, ${current[1]})` },
          patched.length > 0 && { color: V.patched, label: "Changed" },
          selected.length > 0 && { color: V.selected, label: "Selected" },
          highlighted.length > 0 && { color: V.highlight, label: "Highlighted" },
          path.length > 0 && { color: V.sorted, label: "Path" },
          visited.length > 0 && { color: V.visited, label: "Visited" },
          walls.length > 0 && { color: WALL, label: "Wall" },
        ]}
      />
    </Canvas>
  );
}
