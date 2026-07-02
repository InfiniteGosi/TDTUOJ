// src/components/visualizer/renderers/MemoryModelRenderer.jsx
// Universal fallback — Python-Tutor-style memory view: variables on the left,
// heap objects in BFS-depth columns, SVG pointer arrows between them.
// Renders ANYTHING the tracers capture; the visualizer never shows "nothing".
import { useLayoutEffect, useRef, useState } from "react";
import { isRef, refId } from "../inference/materialize";
import { V } from "./vizTheme";

// fixed palette on the dark canvas — readable in both site themes
const T = {
  bg: V.canvas,
  surface: "#1a2940",
  border: V.canvasBorder,
  text: V.text,
  textMuted: V.muted,
  textDim: V.faint,
  accent: V.current,
  purple: "#c39ae8",
};

const BOX_COLORS = {
  list: "#4fc3f7",
  tuple: "#4fc3f7",
  array: "#4fc3f7",
  set: "#c39ae8",
  dict: "#2fbf71",
  map: "#2fbf71",
  object: "#ff8f1f",
  opaque: "#90a6c0",
};

function fmt(v) {
  if (v === null || v === undefined) return "∅";
  if (typeof v === "string") return `"${v.length > 24 ? v.slice(0, 24) + "…" : v}"`;
  return String(v);
}

function RefChip({ to, registerRef }) {
  return (
    <span
      ref={(el) => registerRef && registerRef(`src-${to}`, el)}
      style={{
        display: "inline-block",
        padding: "0 5px",
        borderRadius: 3,
        fontSize: 10,
        background: "rgba(255,161,22,0.14)",
        color: T.accent,
        border: `1px solid ${T.accent}33`,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      ●→
    </span>
  );
}

function Cell({ v, registerRef }) {
  if (isRef(v)) return <RefChip to={refId(v)} registerRef={registerRef} />;
  return <span style={{ color: T.text }}>{fmt(v)}</span>;
}

function HeapBox({ id, entry, registerRef, highlight }) {
  const color = BOX_COLORS[entry.type] ?? BOX_COLORS.opaque;
  const title =
    entry.type === "object" ? entry.class : entry.type + (entry.truncated ? " (truncated)" : "");

  let body;
  if (entry.type === "object") {
    body = Object.entries(entry.fields ?? {}).map(([k, v]) => (
      <div key={k} style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ color: T.textMuted, fontSize: 12 }}>{k}</span>
        <Cell v={v} registerRef={registerRef} />
      </div>
    ));
  } else if (entry.type === "dict" || entry.type === "map") {
    body = (entry.entries ?? []).slice(0, 30).map(([k, v], i) => (
      <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <Cell v={k} registerRef={registerRef} />
        <span style={{ color: T.textDim }}>→</span>
        <Cell v={v} registerRef={registerRef} />
      </div>
    ));
  } else if (entry.type === "opaque") {
    body = <div style={{ color: T.textMuted, fontStyle: "italic" }}>{entry.repr}</div>;
  } else {
    body = (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, maxWidth: 220 }}>
        {(entry.values ?? []).slice(0, 40).map((v, i) => (
          <span
            key={i}
            style={{
              padding: "2px 6px",
              borderRadius: 4,
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${T.border}`,
              fontSize: 12,
            }}
          >
            <Cell v={v} registerRef={registerRef} />
          </span>
        ))}
        {(entry.values?.length ?? 0) > 40 && (
          <span style={{ color: T.textDim, fontSize: 10 }}>…{entry.values.length - 40} more</span>
        )}
      </div>
    );
  }

  return (
    <div
      ref={(el) => registerRef && registerRef(`box-${id}`, el)}
      style={{
        border: `1px solid ${highlight ? color : T.border}`,
        borderRadius: 6,
        background: T.surface,
        minWidth: 70,
        maxWidth: 260,
        overflow: "hidden",
        boxShadow: highlight ? `0 0 0 1px ${color}` : "none",
      }}
    >
      <div
        style={{
          padding: "3px 9px",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.06em",
          color,
          background: `${color}14`,
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <span>{title}</span>
        <span style={{ opacity: 0.5 }}>@{id}</span>
      </div>
      <div
        style={{
          padding: "8px 10px",
          fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {body}
      </div>
    </div>
  );
}

/**
 * @param frame raw schema frame ({stack, heap})
 * @param roots [{name, value}] — variables to start from. Omit to show
 *              every visible variable in the frame.
 */
export default function MemoryModelRenderer({ frame, roots }) {
  const containerRef = useRef(null);
  const nodeRefs = useRef(new Map());
  const [arrows, setArrows] = useState([]);

  const heap = frame?.heap ?? {};

  // BFS from roots → depth-layered columns
  const rootList =
    roots ??
    (frame?.stack ?? []).flatMap((s) =>
      Object.entries(s.locals ?? {}).map(([name, value]) => ({ name, value }))
    );

  const depth = new Map();
  const queue = [];
  for (const r of rootList) {
    if (isRef(r.value) && heap[refId(r.value)] && !depth.has(refId(r.value))) {
      depth.set(refId(r.value), 0);
      queue.push(refId(r.value));
    }
  }
  while (queue.length) {
    const id = queue.shift();
    const d = depth.get(id);
    const entry = heap[id];
    const children = [];
    if (entry?.type === "object") children.push(...Object.values(entry.fields ?? {}));
    else if (entry?.type === "dict" || entry?.type === "map")
      (entry.entries ?? []).forEach(([k, v]) => children.push(k, v));
    else children.push(...(entry?.values ?? []));
    for (const c of children) {
      if (isRef(c) && heap[refId(c)] && !depth.has(refId(c))) {
        depth.set(refId(c), d + 1);
        queue.push(refId(c));
      }
    }
  }

  const maxDepth = Math.max(0, ...depth.values());
  const columns = Array.from({ length: maxDepth + 1 }, () => []);
  for (const [id, d] of depth) columns[d].push(id);

  const registerRef = (key, el) => {
    if (el) nodeRefs.current.set(key, el);
    else nodeRefs.current.delete(key);
  };

  // edges: (source chip OR root var) → target box
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const out = [];
    const center = (el) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left - cRect.left + container.scrollLeft + r.width / 2,
        y: r.top - cRect.top + container.scrollTop + r.height / 2,
        left: r.left - cRect.left + container.scrollLeft,
        right: r.right - cRect.left + container.scrollLeft,
      };
    };
    // var rows → boxes
    for (const r of rootList) {
      if (!isRef(r.value)) continue;
      const from = nodeRefs.current.get(`var-${r.name}`);
      const to = nodeRefs.current.get(`box-${refId(r.value)}`);
      if (from && to) {
        const a = center(from), b = center(to);
        out.push({ x1: a.right, y1: a.y, x2: b.left, y2: b.y });
      }
    }
    // chip → box (chips registered under src-<targetId>; may collide — best effort)
    for (const [key, el] of nodeRefs.current) {
      if (!key.startsWith("src-")) continue;
      const target = nodeRefs.current.get(`box-${key.slice(4)}`);
      if (el && target) {
        const a = center(el), b = center(target);
        out.push({ x1: a.right, y1: a.y, x2: b.left, y2: b.y });
      }
    }
    setArrows(out);
    // re-measure only when the frame changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, roots]);

  if (rootList.length === 0) {
    return (
      <div style={{ padding: 16, color: T.textMuted, fontSize: 12 }}>Nothing to display.</div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        display: "flex",
        gap: 32,
        padding: 18,
        margin: 10,
        overflow: "auto",
        background: V.canvas,
        border: `1px solid ${V.canvasBorder}`,
        borderRadius: 10,
      }}
    >
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        <defs>
          <marker id="viz-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 z" fill={T.accent} opacity="0.55" />
          </marker>
        </defs>
        {arrows.map((a, i) => (
          <path
            key={i}
            d={`M ${a.x1} ${a.y1} C ${a.x1 + 24} ${a.y1}, ${a.x2 - 24} ${a.y2}, ${a.x2} ${a.y2}`}
            stroke={T.accent}
            strokeWidth="1.2"
            fill="none"
            opacity="0.55"
            markerEnd="url(#viz-arrow)"
          />
        ))}
      </svg>

      {/* Variables column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: T.textMuted,
            letterSpacing: "0.08em",
          }}
        >
          VARIABLES
        </div>
        {rootList.map((r) => (
          <div
            key={r.name}
            ref={(el) => registerRef(`var-${r.name}`, el)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "5px 10px",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              background: T.surface,
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <span style={{ color: T.purple }}>{r.name}</span>
            {isRef(r.value) ? (
              <span style={{ color: T.accent, fontSize: 10 }}>●→</span>
            ) : (
              <span style={{ color: T.text }}>{fmt(r.value)}</span>
            )}
          </div>
        ))}
      </div>

      {/* Heap columns by ref depth */}
      {columns.map((ids, d) => (
        <div key={d} style={{ display: "flex", flexDirection: "column", gap: 12, flexShrink: 0 }}>
          {ids.map((id) => (
            <HeapBox key={id} id={id} entry={heap[id]} registerRef={registerRef} />
          ))}
        </div>
      ))}
    </div>
  );
}
