// src/components/visualizer/VisualizerModal.jsx
//
// Props:
//   isOpen        boolean
//   onClose       () => void
//   defaultCode   string   — prefilled from the editor
//   defaultLang   string   — e.g. "cpp", "python", "java", "c"
//   testCases     Array<{id, input, output}>  — problem's sample test cases
//
import { useState, useRef } from "react";
import VisualizerPlayer from "./VisualizerPlayer";
import ApiService from "../../services/ApiService";

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
  red: "#ef4743",
  redDim: "rgba(239,71,67,0.08)",
  blue: "#3b82f6",
  purple: "#a78bfa",
};

const LANG_DISPLAY = { cpp: "C++", java: "Java", python: "Python", c: "C" };
const LANG_BACKEND = { cpp: "CPP", java: "JAVA", python: "PYTHON", c: "C" };

// Per-language snapshot() usage hint shown in the modal
const SNAPSHOT_HINTS = {
  python: `# Call snapshot() with a dict describing your state:
snapshot({"type": "array", "data": arr[:], "highlighted": [i, j]})
snapshot({"type": "tree",  "nodes": [...], "current": node_id})`,

  cpp: `// Call snapshot() with an initializer list:
snapshot({{"type","array"}, {"data", arr}, {"highlighted", std::vector<int>{i,j}}});
snapshot({{"type","tree"},  {"nodes", nodeJsonStr}, {"current", nodeId}});`,

  java: `// Call Snapshot.snapshot() with a JSON string:
Snapshot.snapshot(Snapshot.jsonObj(
    "type", "array",
    "data", Snapshot.jsonArr(arr),
    "highlighted", Snapshot.jsonIntArr(i, j)
));`,

  c: `/* Build a JSON string and pass to snapshot(): */
char buf[256];
sprintf(buf, "{\"type\":\"array\",\"data\":[%d,%d],\"highlighted\":[%d]}", arr[0], arr[1], i);
snapshot(buf);`,
};

export default function VisualizerModal({
  isOpen,
  onClose,
  defaultCode = "",
  defaultLang = "cpp",
  testCases = [],
}) {
  const [frames, setFrames] = useState([]);
  const [stdout, setStdout] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [stdin, setStdin] = useState(testCases[0]?.input ?? "");
  const [selectedTc, setSelectedTc] = useState(testCases.length > 0 ? 0 : -1); // -1 = custom
  const [ran, setRan] = useState(false);
  const [showHint, setShowHint] = useState(false);

  if (!isOpen) return null;

  const handleTcSelect = (idx) => {
    setSelectedTc(idx);
    if (idx >= 0 && testCases[idx]) setStdin(testCases[idx].input ?? "");
  };

  const handleRun = async () => {
    setLoading(true);
    setFrames([]);
    setError("");
    setStdout("");
    setRan(false);
    try {
      const resp = await ApiService.visualize({
        sourceCode: defaultCode,
        language: LANG_BACKEND[defaultLang] ?? "CPP",
        stdin,
      });
      const data = resp.data;
      setFrames(data.frames ?? []);
      setStdout(data.stdout ?? "");
      setError(data.error ?? "");
      setRan(true);
    } catch (e) {
      setError(e.response?.data?.message ?? e.message ?? "Unknown error");
      setRan(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    // ── Backdrop ──────────────────────────────────────────────────────────────
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(3px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 860,
          height: "90vh",
          maxHeight: 700,
          background: T.bg,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderBottom: `1px solid ${T.border}`,
            background: T.surface,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: T.accent,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            ◈ Visualizer
          </div>
          <div
            style={{
              fontSize: 11,
              color: T.textMuted,
              background: T.bg,
              border: `1px solid ${T.border}`,
              borderRadius: 4,
              padding: "2px 8px",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {LANG_DISPLAY[defaultLang] ?? defaultLang}
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setShowHint((h) => !h)}
            style={{
              padding: "3px 10px",
              borderRadius: 5,
              fontSize: 11,
              border: `1px solid ${showHint ? T.accent : T.border}`,
              background: showHint ? T.accentDim : "transparent",
              color: showHint ? T.accent : T.textMuted,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ? snapshot() usage
          </button>
          <button
            onClick={onClose}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              border: `1px solid ${T.border}`,
              background: "transparent",
              color: T.textMuted,
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.12s",
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Hint panel (collapsible) ────────────────────────────────────── */}
        {showHint && (
          <div
            style={{
              padding: "10px 16px",
              borderBottom: `1px solid ${T.border}`,
              background: T.accentDim,
              flexShrink: 0,
            }}
          >
            <pre
              style={{
                margin: 0,
                fontSize: 11,
                color: "#c8c8c8",
                fontFamily: "'JetBrains Mono', monospace",
                whiteSpace: "pre-wrap",
                lineHeight: 1.7,
              }}
            >
              {SNAPSHOT_HINTS[defaultLang] ?? SNAPSHOT_HINTS.cpp}
            </pre>
          </div>
        )}

        {/* ── Body: input left | visualization right ─────────────────────── */}
        <div
          style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}
        >
          {/* ── Left: test case input ──────────────────────────────────── */}
          <div
            style={{
              width: 240,
              flexShrink: 0,
              borderRight: `1px solid ${T.border}`,
              display: "flex",
              flexDirection: "column",
              background: T.surface,
            }}
          >
            <div
              style={{
                padding: "10px 12px 6px",
                fontSize: 10,
                fontWeight: 700,
                color: T.textMuted,
                letterSpacing: "0.07em",
                flexShrink: 0,
              }}
            >
              INPUT
            </div>

            {/* Test case selector tabs */}
            {testCases.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  padding: "0 12px 8px",
                  flexWrap: "wrap",
                  flexShrink: 0,
                }}
              >
                {testCases.map((tc, i) => (
                  <button
                    key={tc.id}
                    onClick={() => handleTcSelect(i)}
                    style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 10,
                      border: `1px solid ${selectedTc === i ? T.accent : T.border}`,
                      background:
                        selectedTc === i ? T.accentDim : "transparent",
                      color: selectedTc === i ? T.accent : T.textMuted,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Case {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setSelectedTc(-1);
                    setStdin("");
                  }}
                  style={{
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 10,
                    border: `1px solid ${selectedTc === -1 ? T.accent : T.border}`,
                    background: selectedTc === -1 ? T.accentDim : "transparent",
                    color: selectedTc === -1 ? T.accent : T.textMuted,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Custom
                </button>
              </div>
            )}

            {/* Stdin textarea */}
            <textarea
              value={stdin}
              onChange={(e) => {
                setStdin(e.target.value);
                setSelectedTc(-1);
              }}
              placeholder="Paste or type stdin here..."
              style={{
                flex: 1,
                resize: "none",
                background: T.bg,
                border: "none",
                borderTop: `1px solid ${T.border}`,
                borderBottom: `1px solid ${T.border}`,
                color: T.text,
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                padding: "10px 12px",
                outline: "none",
                lineHeight: 1.6,
              }}
            />

            {/* Run button */}
            <div style={{ padding: 12, flexShrink: 0 }}>
              <button
                onClick={handleRun}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "8px 0",
                  borderRadius: 6,
                  background: loading ? T.accentDim : T.accent,
                  color: loading ? T.accent : "#000",
                  border: loading ? `1px solid ${T.accent}` : "none",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {loading ? "Running..." : "▶  Run Visualizer"}
              </button>
            </div>

            {/* Mini code preview */}
            <div
              style={{
                padding: "0 12px 12px",
                fontSize: 10,
                color: T.textDim,
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1.5,
                flexShrink: 0,
              }}
            >
              {defaultCode
                ? `${defaultCode.split("\n").length} lines · ${(defaultCode.length / 1024).toFixed(1)} KB`
                : "No code loaded from editor"}
            </div>
          </div>

          {/* ── Right: player ─────────────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {!ran && !loading && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  color: T.textMuted,
                }}
              >
                <div style={{ fontSize: 32, opacity: 0.3 }}>◈</div>
                <div style={{ fontSize: 13 }}>
                  Add{" "}
                  <code
                    style={{
                      color: T.accent,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    snapshot()
                  </code>{" "}
                  calls to your code, then hit Run.
                </div>
              </div>
            )}
            {loading && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: T.textMuted,
                  gap: 10,
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    animation: "spin 1s linear infinite",
                    display: "inline-block",
                    fontSize: 18,
                  }}
                >
                  ⟳
                </span>
                Running on Judge0...
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
            {ran && !loading && (
              <VisualizerPlayer frames={frames} stdout={stdout} error={error} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
