// src/components/visualizer/VisualizerPlayer.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import RendererFactory from "./renderers/RendererFactory";

const T = {
  bg: "#0f0f0f",
  surface: "#1a1a1a",
  surfaceHover: "#222",
  border: "#2a2a2a",
  borderBright: "#3a3a3a",
  text: "#e8e8e8",
  textMuted: "#888",
  textDim: "#555",
  accent: "#ffa116",
  accentDim: "rgba(255,161,22,0.12)",
  green: "#2cbb5d",
  greenDim: "rgba(44,187,93,0.1)",
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

export default function VisualizerPlayer({
  frames = [],
  stdout = "",
  error = "",
}) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState(MODES.SNAPSHOT);
  const [playing, setPlaying] = useState(false);
  const [delay, setDelay] = useState(600);
  const timerRef = useRef(null);
  const total = frames.length;

  // ── Tick logic ─────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    setStep((prev) => {
      if (mode === MODES.LOOP) {
        return (prev + 1) % total;
      }
      // PLAY mode: stop at last frame
      if (prev >= total - 1) {
        setPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, [mode, total]);

  // ── Start / stop timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (playing && mode !== MODES.SNAPSHOT) {
      timerRef.current = setInterval(tick, delay);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, delay, tick, mode]);

  // ── Reset on new frames ────────────────────────────────────────────────────
  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [frames]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;
      if (e.key === "ArrowRight" || e.key === "d") stepForward();
      if (e.key === "ArrowLeft" || e.key === "a") stepBack();
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step, playing, total, mode]);

  const stepForward = () => setStep((s) => Math.min(s + 1, total - 1));
  const stepBack = () => setStep((s) => Math.max(s - 1, 0));
  const goToStart = () => {
    setStep(0);
    setPlaying(false);
  };
  const goToEnd = () => {
    setStep(total - 1);
    setPlaying(false);
  };

  const togglePlay = () => {
    if (mode === MODES.SNAPSHOT) return;
    if (!playing && step >= total - 1 && mode === MODES.PLAY) setStep(0);
    setPlaying((p) => !p);
  };

  const handleModeChange = (m) => {
    setMode(m);
    setPlaying(false);
    setStep(0);
  };

  const currentFrame = frames[step] ?? null;
  const progress = total > 1 ? step / (total - 1) : 0;

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
      {/* ── Mode selector ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "10px 12px",
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
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
        {/* Frame counter */}
        <div
          style={{
            fontSize: 11,
            color: T.textMuted,
            alignSelf: "center",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Frame{" "}
          <span style={{ color: T.text, fontWeight: 700 }}>{step + 1}</span> /{" "}
          {total}
        </div>
      </div>

      {/* ── Renderer area ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        <RendererFactory frame={currentFrame} />

        {/* Extra frame metadata (user can put any extra keys in snapshot) */}
        {currentFrame &&
          Object.keys(currentFrame).filter(
            (k) =>
              k !== "type" &&
              k !== "data" &&
              k !== "nodes" &&
              k !== "edges" &&
              k !== "highlighted" &&
              k !== "sorted" &&
              k !== "swapped" &&
              k !== "visited" &&
              k !== "current" &&
              k !== "activeEdge",
          ).length > 0 && (
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
              {Object.entries(currentFrame)
                .filter(
                  ([k]) =>
                    ![
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
                    ].includes(k),
                )
                .map(([k, v]) => (
                  <div key={k} style={{ marginBottom: 2 }}>
                    <span style={{ color: T.accent }}>{k}</span>
                    {": "}
                    <span style={{ color: T.text }}>{JSON.stringify(v)}</span>
                  </div>
                ))}
            </div>
          )}

        {/* stdout panel */}
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
        <div style={{ marginBottom: 10, position: "relative" }}>
          <input
            type="range"
            min={0}
            max={total - 1}
            value={step}
            onChange={(e) => {
              setPlaying(false);
              setStep(Number(e.target.value));
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
          <CtrlBtn onClick={goToStart} title="Go to start (Home)">
            ⏮
          </CtrlBtn>
          <CtrlBtn onClick={stepBack} title="Previous (← / A)">
            ◀
          </CtrlBtn>

          {mode !== MODES.SNAPSHOT ? (
            <CtrlBtn
              onClick={togglePlay}
              title="Play / Pause (Space)"
              active={playing}
              style={{ minWidth: 64, justifyContent: "center" }}
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
                minWidth: 64,
                textAlign: "center",
              }}
            >
              ← → to step
            </div>
          )}

          <CtrlBtn onClick={stepForward} title="Next (→ / D)">
            ▶
          </CtrlBtn>
          <CtrlBtn onClick={goToEnd} title="Go to end (End)">
            ⏭
          </CtrlBtn>

          <div style={{ flex: 1 }} />

          {/* Speed control — only relevant in Play/Loop */}
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
                value={2050 - delay} // invert: right = faster
                onChange={(e) => setDelay(2050 - Number(e.target.value))}
                style={{
                  width: 72,
                  cursor: "pointer",
                  accentColor: T.accent,
                  height: 3,
                  appearance: "none",
                  outline: "none",
                }}
                title={`${delay}ms per frame`}
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
