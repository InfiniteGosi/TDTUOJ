// src/components/visualizer/VisualizerPlayer.jsx
// Plays back the uniform frame stream. For every variable in the current
// frame: shape inference (heuristics + LLM labels + user override) picks a
// semantic renderer; anything unrecognized lands in the memory-model view.
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import RendererFactory from "./renderers/RendererFactory";
import MemoryModelRenderer from "./renderers/MemoryModelRenderer";
import {
  classifyVariables,
  buildRendererFrame,
  KINDS,
} from "./inference/inferShape";
import { visibleVariables, isRef } from "./inference/materialize";
import T from "./theme";

const MODES = { PLAY: "play", LOOP: "loop", SNAPSHOT: "snapshot" };

const MODE_META = {
  [MODES.PLAY]: { label: "▶  Play", desc: "Plays once start → end" },
  [MODES.LOOP]: { label: "↺  Loop", desc: "Loops continuously" },
  [MODES.SNAPSHOT]: { label: "⊞  Step", desc: "Step forward / backward manually" },
};

const KIND_LABEL = {
  array: "Array",
  matrix: "Matrix",
  scatter: "Scatter",
  stack: "Stack",
  queue: "Queue",
  linkedlist: "Linked List",
  tree: "Tree",
  graph: "Graph",
  memory: "Memory",
  scalar: "Scalar",
};

const SOURCE_BADGE = {
  llm: { label: "AI", color: "#a78bfa" },
  user: { label: "you", color: "#ffa116" },
};

export default function VisualizerPlayer({
  frames = [],
  stdout = "",
  error = "",
  warning = "",
  classifications = {},
  onStepChange = null,
}) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState(MODES.SNAPSHOT);
  const [playing, setPlaying] = useState(false);
  // exponential speed curve (ported from algorithm-visualizer Player): 0 = slow, 4 = fast
  const [speed, setSpeed] = useState(2.4);
  const delay = Math.max(40, Math.round(4000 / Math.exp(speed)));
  const [overrides, setOverrides] = useState({}); // name -> kind ("auto" = clear)
  const timerRef = useRef(null);
  const total = frames.length;

  const framesRef = useRef(frames);
  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  const onStepChangeRef = useRef(onStepChange);
  useEffect(() => {
    onStepChangeRef.current = onStepChange;
  }, [onStepChange]);

  const updateStep = useCallback((newStep) => {
    const f = framesRef.current;
    const cb = onStepChangeRef.current;
    setStep(newStep);
    if (cb) {
      cb({ frame: f[newStep] ?? null, nextFrame: f[newStep + 1] ?? null });
    }
  }, []);

  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const tick = useCallback(() => {
    const cur = stepRef.current;
    const tot = framesRef.current.length;
    if (modeRef.current === MODES.LOOP) {
      updateStep((cur + 1) % tot);
      return;
    }
    if (cur >= tot - 1) {
      setPlaying(false);
      return;
    }
    updateStep(cur + 1);
  }, [updateStep]);

  useEffect(() => {
    if (playing && mode !== MODES.SNAPSHOT) {
      timerRef.current = setInterval(tick, delay);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, delay, tick, mode]);

  useEffect(() => {
    setPlaying(false);
    setOverrides({});
    setTimeout(() => updateStep(0), 0);
  }, [frames, updateStep]);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT")
        return;
      const cur = stepRef.current;
      const tot = framesRef.current.length;
      if (e.key === "ArrowRight" || e.key === "d") updateStep(Math.min(cur + 1, tot - 1));
      if (e.key === "ArrowLeft" || e.key === "a") updateStep(Math.max(cur - 1, 0));
      if (e.key === " ") {
        e.preventDefault();
        handleTogglePlay();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateStep]);

  const handleTogglePlay = useCallback(() => {
    const m = modeRef.current;
    const cur = stepRef.current;
    const tot = framesRef.current.length;
    if (m === MODES.SNAPSHOT) return;
    if (!playing && cur >= tot - 1 && m === MODES.PLAY) updateStep(0);
    setPlaying((p) => !p);
  }, [playing, updateStep]);

  const handleModeChange = (m) => {
    setMode(m);
    setPlaying(false);
    updateStep(0);
  };

  // ── Inference (classification is playback-stable; recompute on override) ───
  const kinds = useMemo(
    () => classifyVariables(frames, classifications, overrides),
    [frames, classifications, overrides]
  );

  const currentFrame = frames[step] ?? null;
  const prevFrame = frames[step - 1] ?? null;
  const nextFrame = frames[step + 1] ?? null;
  const progress = total > 1 ? step / (total - 1) : 0;

  // Variables visible in the current frame, partitioned by presentation
  const view = useMemo(() => {
    if (!currentFrame) return { cards: [], scalars: [], memoryRoots: [] };
    const vars = visibleVariables(currentFrame);
    const cards = [];
    const scalars = [];
    const memoryRoots = [];
    for (const [name, value] of Object.entries(vars)) {
      const cls = kinds.get(name);
      const kind = cls?.kind ?? "scalar";
      if (kind === "scalar" && !isRef(value)) {
        scalars.push({ name, value });
        continue;
      }
      if (kind === "memory" || kind === "scalar") {
        memoryRoots.push({ name, value });
        continue;
      }
      const rf = buildRendererFrame(name, kind, currentFrame, prevFrame, frames);
      if (rf) cards.push({ name, kind, source: cls?.source, frame: rf });
      else memoryRoots.push({ name, value });
    }
    return { cards, scalars, memoryRoots };
  }, [currentFrame, prevFrame, frames, kinds]);

  const callStack = currentFrame?.stack ?? [];
  const syncedStdout =
    currentFrame?.out_len != null ? stdout.slice(0, currentFrame.out_len) : stdout;

  // ── Empty / error ───────────────────────────────────────────────────────────
  if (total === 0) {
    return (
      <div style={{ padding: 24, color: T.textMuted, fontSize: 13, textAlign: "center" }}>
        {error ? (
          <pre
            style={{
              color: T.red,
              whiteSpace: "pre-wrap",
              textAlign: "left",
              background: "rgba(239,71,67,0.08)",
              padding: 12,
              borderRadius: 6,
              border: "1px solid rgba(239,71,67,0.2)",
              fontSize: 12,
            }}
          >
            {error}
          </pre>
        ) : (
          "No trace captured — the program may not have executed any lines."
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* ── Playback mode selector ────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "8px 12px",
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
          alignItems: "center",
        }}
      >
        {Object.entries(MODE_META).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => handleModeChange(key)}
            title={meta.desc}
            style={{
              padding: "4px 12px",
              borderRadius: 5,
              border: `1px solid ${mode === key ? T.accent : T.border}`,
              background: mode === key ? T.accentDim : "transparent",
              color: mode === key ? T.accent : T.textMuted,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
              transition: "all 0.15s",
            }}
          >
            {meta.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {nextFrame?.line && (
          <div
            style={{
              fontSize: 10,
              color: T.yellow,
              fontFamily: "'JetBrains Mono', monospace",
              marginRight: 8,
              opacity: 0.8,
            }}
          >
            next → line {nextFrame.line}
          </div>
        )}

        <div style={{ fontSize: 12, color: T.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
          Step <span style={{ color: T.text, fontWeight: 700 }}>{step + 1}</span> / {total}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "auto", minHeight: 0, padding: "10px 12px" }}>
        {warning && (
          <div
            style={{
              marginBottom: 10,
              padding: "6px 10px",
              borderRadius: 6,
              fontSize: 11,
              background: T.yellowDim,
              border: `1px solid ${T.yellow}44`,
              color: T.yellow,
            }}
          >
            ⚠ {warning}
          </div>
        )}

        {/* Call stack strip */}
        {callStack.length > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginBottom: 10,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: T.textMuted,
                letterSpacing: "0.08em",
                marginRight: 4,
              }}
            >
              CALL STACK
            </span>
            {callStack.map((f, i) => (
              <span
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {i > 0 && <span style={{ color: T.textDim }}>›</span>}
                <span
                  style={{
                    padding: "1px 7px",
                    borderRadius: 4,
                    border: `1px solid ${i === callStack.length - 1 ? T.accent : T.border}`,
                    background: i === callStack.length - 1 ? T.accentDim : "transparent",
                    color: i === callStack.length - 1 ? T.accent : T.textMuted,
                  }}
                >
                  {f.function}
                  <span style={{ opacity: 0.55 }}>:{f.line}</span>
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Scalar strip */}
        {view.scalars.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 10,
            }}
          >
            {view.scalars.map(({ name, value }) => (
              <div
                key={name}
                style={{
                  padding: "4px 11px",
                  borderRadius: 6,
                  border: `1px solid ${T.border}`,
                  background: T.surface,
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <span style={{ color: T.purple }}>{name}</span>
                <span style={{ color: T.textDim }}> = </span>
                <span style={{ color: T.text }}>
                  {value === null ? "∅" : typeof value === "string" ? `"${value}"` : String(value)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Structure cards */}
        {view.cards.map(({ name, kind, source, frame: rf }) => (
          <VariableCard
            key={name}
            name={name}
            kind={kind}
            source={source}
            overrideValue={overrides[name] ?? "auto"}
            onKindChange={(k) => setOverrides((o) => ({ ...o, [name]: k }))}
          >
            <RendererFactory frame={rf} />
          </VariableCard>
        ))}

        {/* Memory-model fallback for everything unrecognized */}
        {view.memoryRoots.length > 0 && (
          <div
            style={{
              marginBottom: 12,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              overflow: "hidden",
              background: T.bg,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 10px",
                background: T.surface,
                borderBottom: `1px solid ${T.border}`,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: T.textMuted,
                }}
              >
                MEMORY
              </span>
              {view.memoryRoots.map(({ name }) => (
                <label
                  key={name}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: T.textMuted }}
                >
                  <span style={{ color: T.purple, fontFamily: "'JetBrains Mono', monospace" }}>{name}</span>
                  <select
                    value={overrides[name] ?? "auto"}
                    onChange={(e) => setOverrides((o) => ({ ...o, [name]: e.target.value }))}
                    style={{
                      background: T.bg,
                      color: T.text,
                      border: `1px solid ${T.border}`,
                      borderRadius: 5,
                      fontSize: 12,
                      padding: "2px 6px",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    {KINDS.map((k) => (
                      <option key={k} value={k}>
                        {k === "auto" ? "auto" : (KIND_LABEL[k] ?? k).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <MemoryModelRenderer frame={currentFrame} roots={view.memoryRoots} />
          </div>
        )}

        {/* stdout — synced to the current step when out_len is available */}
        {stdout && (
          <div style={{ marginTop: 4 }}>
            <div
              style={{
                fontSize: 10,
                color: T.textMuted,
                marginBottom: 4,
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              STDOUT{currentFrame?.out_len != null ? " (so far)" : ""}
            </div>
            <pre
              style={{
                fontSize: 13,
                color: T.text,
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                padding: "10px 14px",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                margin: 0,
                minHeight: 22,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {syncedStdout || <span style={{ color: T.textDim }}>(no output yet)</span>}
            </pre>
          </div>
        )}

        {error && (
          <pre
            style={{
              marginTop: 10,
              color: T.red,
              whiteSpace: "pre-wrap",
              background: "rgba(239,71,67,0.08)",
              padding: 10,
              borderRadius: 6,
              border: "1px solid rgba(239,71,67,0.2)",
              fontSize: 11,
            }}
          >
            {error}
          </pre>
        )}
      </div>

      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "10px 12px",
          borderTop: `1px solid ${T.border}`,
          background: T.surface,
          flexShrink: 0,
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <input
            type="range"
            min={0}
            max={total - 1}
            value={step}
            onChange={(e) => {
              setPlaying(false);
              updateStep(Number(e.target.value));
            }}
            style={{
              width: "100%",
              height: 4,
              cursor: "pointer",
              accentColor: T.accent,
              background: `linear-gradient(to right, ${T.accent} ${progress * 100}%, ${T.border} ${progress * 100}%)`,
              borderRadius: 2,
              appearance: "none",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <CtrlBtn onClick={() => { updateStep(0); setPlaying(false); }} title="Start">⏮</CtrlBtn>
          <CtrlBtn onClick={() => updateStep(Math.max(step - 1, 0))} title="Previous (←)">◀</CtrlBtn>

          {mode !== MODES.SNAPSHOT ? (
            <CtrlBtn
              onClick={handleTogglePlay}
              title="Play / Pause (Space)"
              active={playing}
              style={{ minWidth: 72, justifyContent: "center" }}
            >
              {playing ? "⏸ Pause" : "▶ Play"}
            </CtrlBtn>
          ) : (
            <div
              style={{
                padding: "4px 10px",
                borderRadius: 5,
                fontSize: 11,
                background: T.accentDim,
                border: `1px solid ${T.accent}33`,
                color: T.accent,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                minWidth: 72,
                textAlign: "center",
              }}
            >
              ← → to step
            </div>
          )}

          <CtrlBtn onClick={() => updateStep(Math.min(step + 1, total - 1))} title="Next (→)">▶</CtrlBtn>
          <CtrlBtn onClick={() => { updateStep(total - 1); setPlaying(false); }} title="End">⏭</CtrlBtn>

          <div style={{ flex: 1 }} />

          {mode !== MODES.SNAPSHOT && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: T.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                Speed
              </span>
              <input
                type="range"
                min={0}
                max={4}
                step={0.25}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                style={{
                  width: 72,
                  cursor: "pointer",
                  accentColor: T.accent,
                  height: 3,
                  appearance: "none",
                  outline: "none",
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: T.textMuted,
                  fontFamily: "'JetBrains Mono', monospace",
                  minWidth: 32,
                }}
              >
                {speed >= 3 ? "Fast" : speed >= 1.5 ? "Med" : "Slow"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Variable card with "view as" override + resizable body ───────────────────
function VariableCard({ name, kind, source, overrideValue = "auto", onKindChange, children }) {
  const badge = SOURCE_BADGE[source];
  const bodyRef = useRef(null);
  const [height, setHeight] = useState(null); // null = auto (fit content)
  const drag = useRef(null);

  const onHandleDown = (e) => {
    const h = bodyRef.current?.getBoundingClientRect().height ?? 200;
    drag.current = { startY: e.clientY, startH: h };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };
  const onHandleMove = (e) => {
    if (!drag.current) return;
    const next = Math.max(80, drag.current.startH + (e.clientY - drag.current.startY));
    setHeight(next);
  };
  const onHandleUp = () => {
    drag.current = null;
  };

  return (
    <div
      style={{
        marginBottom: 12,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        overflow: "hidden",
        background: T.bg,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 10px",
          background: T.surface,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: T.purple,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {name}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 9px",
            borderRadius: 9,
            background: T.accentDim,
            color: T.accent,
            letterSpacing: "0.05em",
          }}
        >
          {KIND_LABEL[kind] ?? kind}
        </span>
        {badge && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: 8,
              background: `${badge.color}22`,
              color: badge.color,
            }}
            title={source === "llm" ? "Classified by AI" : "Your override"}
          >
            {badge.label}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {onKindChange && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.textMuted }}>
            view as
            <select
              value={overrideValue}
              onChange={(e) => onKindChange(e.target.value)}
              style={{
                background: T.bg,
                color: T.text,
                border: `1px solid ${T.border}`,
                borderRadius: 5,
                fontSize: 12,
                padding: "2px 6px",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k === "auto" ? "auto" : (KIND_LABEL[k] ?? k).toLowerCase()}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div
        ref={bodyRef}
        style={{ overflow: "auto", height: height ?? "auto", maxHeight: height ? undefined : "70vh" }}
      >
        {children}
      </div>
      {/* drag to resize this card's height (ported from reference Divider) */}
      <div
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onPointerLeave={onHandleUp}
        title="Drag to resize"
        style={{
          height: 8,
          cursor: "ns-resize",
          background: T.surface,
          borderTop: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          touchAction: "none",
        }}
      >
        <div style={{ width: 34, height: 3, borderRadius: 2, background: T.border }} />
      </div>
    </div>
  );
}

function CtrlBtn({ onClick, title, children, active, style = {} }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "4px 10px",
        borderRadius: 5,
        border: `1px solid ${active || hover ? T.accent : T.border}`,
        background: active ? T.accentDim : hover ? "rgba(255,161,22,0.06)" : "transparent",
        color: active || hover ? T.accent : T.textMuted,
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "'JetBrains Mono', monospace",
        transition: "all 0.12s",
        display: "flex",
        alignItems: "center",
        gap: 4,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
