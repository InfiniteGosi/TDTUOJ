// src/components/visualizer/renderers/useZoomPan.jsx
// Wheel-zoom + drag-pan for canvas renderers — ported from algorithm-visualizer's
// base Renderer (handleWheel / handleMouseDown-Move-Up). Works for both SVG (apply
// the returned transform to a root <g>) and HTML (apply it as a CSS transform with
// transformOrigin "0 0").
//
// Optional node-grab: pass onGrab(ux, uy) → return true to start a custom drag
// (e.g. dragging a graph node) instead of panning; onDrag(ux, uy) fires while
// dragging; onDrop() at release. (ux, uy) are content-space coordinates.
import { useCallback, useRef, useState } from "react";
import { V, MONO } from "./vizTheme";

const ZMIN = 0.2;
const ZMAX = 8;
const clampZ = (z) => Math.max(ZMIN, Math.min(ZMAX, z));

export function useZoomPan({ onGrab, onDrag, onDrop } = {}) {
  const [t, setT] = useState({ z: 1, x: 0, y: 0 });
  const ref = useRef(null);
  const drag = useRef(null);

  const rel = (e) => {
    const r = ref.current?.getBoundingClientRect();
    return { cx: e.clientX - (r?.left ?? 0), cy: e.clientY - (r?.top ?? 0) };
  };

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const { cx, cy } = rel(e);
    setT((p) => {
      const nz = clampZ(p.z * Math.pow(1.0018, -e.deltaY));
      const k = nz / p.z;
      // keep the point under the cursor fixed
      return { z: nz, x: cx - (cx - p.x) * k, y: cy - (cy - p.y) * k };
    });
  }, []);

  const onPointerDown = useCallback(
    (e) => {
      const { cx, cy } = rel(e);
      setT((p) => {
        const ux = (cx - p.x) / p.z;
        const uy = (cy - p.y) / p.z;
        if (onGrab && onGrab(ux, uy)) {
          drag.current = { mode: "grab" };
        } else {
          drag.current = { mode: "pan", sx: cx, sy: cy, ox: p.x, oy: p.y };
        }
        return p;
      });
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [onGrab],
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!drag.current) return;
      const { cx, cy } = rel(e);
      if (drag.current.mode === "pan") {
        const d = drag.current;
        setT((p) => ({ ...p, x: d.ox + (cx - d.sx), y: d.oy + (cy - d.sy) }));
      } else if (onDrag) {
        setT((p) => {
          onDrag((cx - p.x) / p.z, (cy - p.y) / p.z);
          return p;
        });
      }
    },
    [onDrag],
  );

  const end = useCallback(() => {
    if (drag.current?.mode === "grab" && onDrop) onDrop();
    drag.current = null;
  }, [onDrop]);

  const reset = useCallback(() => setT({ z: 1, x: 0, y: 0 }), []);
  const zoomBy = useCallback((f) => setT((p) => ({ ...p, z: clampZ(p.z * f) })), []);

  const transform = `translate(${t.x} ${t.y}) scale(${t.z})`;
  const cssTransform = `translate(${t.x}px, ${t.y}px) scale(${t.z})`;
  const handlers = {
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp: end,
    onPointerLeave: end,
    style: { touchAction: "none", cursor: "grab" },
  };

  return { t, ref, handlers, transform, cssTransform, reset, zoomBy };
}

/** Floating +/−/reset toolbar for a zoom/pan canvas. `extra` slots in extra controls. */
export function ZoomControls({ reset, zoomBy, extra = null }) {
  const btn = {
    width: 26,
    height: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    border: `1px solid ${V.canvasBorder}`,
    background: "#1b2942",
    color: V.text,
    fontSize: 15,
    fontFamily: MONO,
    fontWeight: 700,
    cursor: "pointer",
    lineHeight: 1,
  };
  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        display: "flex",
        alignItems: "center",
        gap: 5,
        zIndex: 3,
      }}
    >
      {extra}
      <button style={btn} onClick={() => zoomBy(1.25)} title="Zoom in">
        +
      </button>
      <button style={btn} onClick={() => zoomBy(0.8)} title="Zoom out">
        −
      </button>
      <button style={{ ...btn, fontSize: 13 }} onClick={reset} title="Reset view">
        ⟲
      </button>
    </div>
  );
}

/**
 * SVG canvas with zoom/pan wired in. Content (a <g> tree) is rendered inside the
 * pan/zoom transform group. `hint` shows a small scroll-to-zoom note.
 */
export function ZoomPanSvg({ width, height, zp, children, minHeight = 120 }) {
  return (
    <div style={{ position: "relative" }}>
      <ZoomControls reset={zp.reset} zoomBy={zp.zoomBy} />
      <svg
        ref={zp.ref}
        width="100%"
        height={Math.max(height, minHeight)}
        viewBox={`0 0 ${Math.max(width, 1)} ${Math.max(height, minHeight)}`}
        preserveAspectRatio="xMidYMid meet"
        {...zp.handlers}
      >
        <g transform={zp.transform}>{children}</g>
      </svg>
    </div>
  );
}
