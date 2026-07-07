// src/components/visualizer/renderers/ScatterRenderer.jsx
// Frame shape: { type: "scatter", points?: [[x,y],...], series?: [{points, color?}],
//   current?: number, label? }
// Ported from algorithm-visualizer's ScatterRenderer (multi-series X/Y plot),
// re-implemented as inline SVG with wheel-zoom / drag-pan.
import { V, MONO, Canvas, Legend, EmptyNote } from "./vizTheme";
import { fmt } from "./vizFormat";
import { useZoomPan, ZoomPanSvg } from "./useZoomPan";

const PALETTE = [V.bar, V.sorted, V.selected, V.swap, V.highlight, "#4dd0e1"];
const W = 460;
const H = 320;
const PAD = 40;

export default function ScatterRenderer({ frame }) {
  const zp = useZoomPan();

  const series =
    frame?.series?.length
      ? frame.series
      : Array.isArray(frame?.points)
        ? [{ points: frame.points }]
        : null;

  const all = series?.flatMap((s) => s.points ?? []).filter((p) => Array.isArray(p) && p.length >= 2) ?? [];
  if (!series || all.length === 0) {
    return <EmptyNote>No scatter data in this frame.</EmptyNote>;
  }

  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  let minX = Math.min(...xs), maxX = Math.max(...xs);
  let minY = Math.min(...ys), maxY = Math.max(...ys);
  if (minX === maxX) { minX -= 1; maxX += 1; }
  if (minY === maxY) { minY -= 1; maxY += 1; }

  const sx = (x) => PAD + ((x - minX) / (maxX - minX)) * (W - 2 * PAD);
  const sy = (y) => H - PAD - ((y - minY) / (maxY - minY)) * (H - 2 * PAD);

  const ticks = (lo, hi, n = 4) =>
    Array.from({ length: n + 1 }, (_, i) => lo + ((hi - lo) * i) / n);

  return (
    <Canvas>
      <ZoomPanSvg width={W} height={H} zp={zp} minHeight={H}>
        {/* axes */}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={V.edge} strokeWidth={1.5} />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke={V.edge} strokeWidth={1.5} />

        {/* grid + tick labels */}
        {ticks(minX, maxX).map((tx, i) => (
          <g key={`x${i}`}>
            <line x1={sx(tx)} y1={PAD} x2={sx(tx)} y2={H - PAD} stroke={V.canvasBorder} strokeWidth={0.5} />
            <text x={sx(tx)} y={H - PAD + 14} textAnchor="middle" fill={V.faint} fontSize={10} fontFamily={MONO}>
              {fmt(tx)}
            </text>
          </g>
        ))}
        {ticks(minY, maxY).map((ty, i) => (
          <g key={`y${i}`}>
            <line x1={PAD} y1={sy(ty)} x2={W - PAD} y2={sy(ty)} stroke={V.canvasBorder} strokeWidth={0.5} />
            <text x={PAD - 6} y={sy(ty) + 3} textAnchor="end" fill={V.faint} fontSize={10} fontFamily={MONO}>
              {fmt(ty)}
            </text>
          </g>
        ))}

        {/* points */}
        {series.map((s, si) =>
          (s.points ?? []).map((p, pi) => {
            if (!Array.isArray(p) || p.length < 2) return null;
            return (
              <circle
                key={`${si}-${pi}`}
                cx={sx(p[0])}
                cy={sy(p[1])}
                r={4 + si}
                fill={s.color ?? PALETTE[si % PALETTE.length]}
                opacity={0.85}
              />
            );
          }),
        )}
      </ZoomPanSvg>

      <Legend
        items={series.map((s, si) => ({
          color: s.color ?? PALETTE[si % PALETTE.length],
          label: s.label ?? (series.length > 1 ? `series ${si}` : `${all.length} points`),
          round: true,
        }))}
      />
    </Canvas>
  );
}
