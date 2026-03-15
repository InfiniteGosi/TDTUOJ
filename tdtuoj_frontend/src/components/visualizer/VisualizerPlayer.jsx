// src/components/visualizer/VisualizerPlayer.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import RendererFactory from "./renderers/RendererFactory";
import AutoTraceRenderer from "./renderers/AutoTraceRenderer";

const T = {
  bg: "#0f0f0f",
  surface: "#1a1a1a",
  border: "#2a2a2a",
  text: "#e8e8e8",
  textMuted: "#888",
  accent: "#ffa116",
  accentDim: "rgba(255,161,22,0.12)",
  red: "#ef4743",
};

const MODES = { PLAY: "play", LOOP: "loop", SNAPSHOT: "snapshot" };

const MODE_META = {
  [MODES.PLAY]: { label: "▶  Play", desc: "Plays once start → end" },
  [MODES.LOOP]: { label: "↺  Loop", desc: "Loops continuously" },
  [MODES.SNAPSHOT]: {
    label: "⊞  Snapshot",
    desc: "Step forward / backward manually",
  },
};

const RENDERER_KEYS = new Set([
  "type",
  "data",
  "nodes",
  "edges",
  "highlighted",
  "sorted",
  "swapped",
  "visited",
  "current",
  "activeEdge",
  "line",
  "event",
  "function",
  "locals",
]);

export default function VisualizerPlayer({
  frames = [],
  stdout = "",
  error = "",
  vizMode = "MANUAL",
  onStepChange = null,
}) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState(MODES.SNAPSHOT);
  const [playing, setPlaying] = useState(false);
  const [delay, setDelay] = useState(600);
  const timerRef = useRef(null);
  const total = frames.length;

  // ── Synchronous step updater — notifies parent immediately ────────────────
  // Using a ref for frames so the callback always sees the latest frames
  // without needing to be recreated on every frame change
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
      cb({
        frame: f[newStep] ?? null,
        nextFrame: f[newStep + 1] ?? null,
      });
    }
  }, []); // stable — no deps needed because we use refs

  // ── Tick ───────────────────────────────────────────────────────────────────
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
    const total = framesRef.current.length;
    const m = modeRef.current;

    if (m === MODES.LOOP) {
      updateStep((cur + 1) % total);
      return;
    }
    if (cur >= total - 1) {
      setPlaying(false);
      return;
    }
    updateStep(cur + 1);
  }, [updateStep]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (playing && mode !== MODES.SNAPSHOT) {
      timerRef.current = setInterval(tick, delay);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, delay, tick, mode]);

  // ── Reset when frames change ───────────────────────────────────────────────
  useEffect(() => {
    setPlaying(false);
    // Use setTimeout to ensure framesRef is updated before we call updateStep
    setTimeout(() => updateStep(0), 0);
  }, [frames, updateStep]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;
      const cur = stepRef.current;
      const total = framesRef.current.length;
      if (e.key === "ArrowRight" || e.key === "d")
        updateStep(Math.min(cur + 1, total - 1));
      if (e.key === "ArrowLeft" || e.key === "a")
        updateStep(Math.max(cur - 1, 0));
      if (e.key === " ") {
        e.preventDefault();
        handleTogglePlay();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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

  const currentFrame = frames[step] ?? null;
  const nextFrame = frames[step + 1] ?? null;
  const progress = total > 1 ? step / (total - 1) : 0;
  const extraKeys = currentFrame
    ? Object.keys(currentFrame).filter((k) => !RENDERER_KEYS.has(k))
    : [];

  // ── Empty / error ──────────────────────────────────────────────────────────
  if (total === 0) {
    return (
      <div
        style={{
          padding: 24,
          color: T.textMuted,
          fontSize: 13,
          textAlign: "center",
        }}
      >
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
        ) : vizMode === "AUTO" ? (
          "No frames captured. Make sure your code reads input and has variables to trace."
        ) : (
          "No frames to visualize. Make sure your code calls snapshot()."
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
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

        {/* Next line preview */}
        {nextFrame?.line && (
          <div
            style={{
              fontSize: 10,
              color: "#f5c518",
              fontFamily: "'JetBrains Mono', monospace",
              marginRight: 8,
              opacity: 0.8,
            }}
          >
            next → line {nextFrame.line}
          </div>
        )}

        <div
          style={{
            fontSize: 11,
            color: T.textMuted,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Frame{" "}
          <span style={{ color: T.text, fontWeight: 700 }}>{step + 1}</span> /{" "}
          {total}
        </div>
      </div>

      {/* ── Renderer ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        {vizMode === "AUTO" && (
          <AutoTraceRenderer frame={currentFrame} frames={frames} step={step} />
        )}
        {vizMode === "MANUAL" && <RendererFactory frame={currentFrame} />}

        {/* Extra metadata — manual mode */}
        {vizMode === "MANUAL" && extraKeys.length > 0 && (
          <div
            style={{
              margin: "0 12px 12px",
              padding: "8px 12px",
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              color: T.textMuted,
            }}
          >
            {extraKeys.map((k) => (
              <div key={k} style={{ marginBottom: 2 }}>
                <span style={{ color: T.accent }}>{k}</span>
                {": "}
                <span style={{ color: T.text }}>
                  {JSON.stringify(currentFrame[k])}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* stdout */}
        {stdout && (
          <div style={{ margin: "0 12px 12px" }}>
            <div
              style={{
                fontSize: 10,
                color: T.textMuted,
                marginBottom: 4,
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              STDOUT
            </div>
            <pre
              style={{
                fontSize: 11,
                color: "#c8c8c8",
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                padding: "8px 12px",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                margin: 0,
              }}
            >
              {stdout}
            </pre>
          </div>
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
        {/* Progress slider */}
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

        {/* Buttons */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <CtrlBtn
            onClick={() => {
              updateStep(0);
              setPlaying(false);
            }}
            title="Start"
          >
            ⏮
          </CtrlBtn>
          <CtrlBtn
            onClick={() => updateStep(Math.max(step - 1, 0))}
            title="Previous (←)"
          >
            ◀
          </CtrlBtn>

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

          <CtrlBtn
            onClick={() => updateStep(Math.min(step + 1, total - 1))}
            title="Next (→)"
          >
            ▶
          </CtrlBtn>
          <CtrlBtn
            onClick={() => {
              updateStep(total - 1);
              setPlaying(false);
            }}
            title="End"
          >
            ⏭
          </CtrlBtn>

          <div style={{ flex: 1 }} />

          {mode !== MODES.SNAPSHOT && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontSize: 10,
                  color: T.textMuted,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                Speed
              </span>
              <input
                type="range"
                min={50}
                max={2000}
                step={50}
                value={2050 - delay}
                onChange={(e) => setDelay(2050 - Number(e.target.value))}
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
                {delay < 200 ? "Fast" : delay < 700 ? "Med" : "Slow"}
              </span>
            </div>
          )}
        </div>
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
        background: active
          ? T.accentDim
          : hover
            ? "rgba(255,161,22,0.06)"
            : "transparent",
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
