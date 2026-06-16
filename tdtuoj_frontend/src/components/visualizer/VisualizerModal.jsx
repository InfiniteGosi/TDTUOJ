// src/components/visualizer/VisualizerModal.jsx
// One-click visualizer: user code runs unmodified — the backend instruments
// it, the frontend infers data-structure shapes and renders them.
import { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import VisualizerPlayer from "./VisualizerPlayer";
import ApiService from "../../services/ApiService";
import T from "./theme";

const LANG_DISPLAY = {
  cpp: "C++", java: "Java", python: "Python", c: "C",
  csharp: "C#", javascript: "JavaScript",
};
const LANG_BACKEND = {
  cpp: "CPP", java: "JAVA", python: "PYTHON", c: "C",
  csharp: "CSHARP", javascript: "JAVASCRIPT",
};
const LANG_MONACO = {
  cpp: "cpp", java: "java", python: "python", c: "c",
  csharp: "csharp", javascript: "javascript",
};

// ── CSS for Monaco line highlights ────────────────────────────────────────────
const HIGHLIGHT_CSS = `
  .viz-line-current {
    background: rgba(59, 130, 246, 0.18) !important;
    border-left: 3px solid #3b82f6 !important;
  }
  .viz-line-next {
    background: rgba(245, 197, 24, 0.13) !important;
    border-left: 3px solid #f5c518 !important;
  }
  .monaco-editor .margin {
    background: #0d1420 !important;
  }
`;

// ── CodeViewer ────────────────────────────────────────────────────────────────
function CodeViewer({ code, language, currentLine, nextLine }) {
  const editorRef = useRef(null);
  const decorationsRef = useRef([]);

  const applyDecorations = (editor, cur, nxt) => {
    if (!editor) return;
    const newDecorations = [];
    if (cur > 0) {
      newDecorations.push({
        range: { startLineNumber: cur, startColumn: 1, endLineNumber: cur, endColumn: 1 },
        options: { isWholeLine: true, className: "viz-line-current", zIndex: 2 },
      });
    }
    if (nxt > 0 && nxt !== cur) {
      newDecorations.push({
        range: { startLineNumber: nxt, startColumn: 1, endLineNumber: nxt, endColumn: 1 },
        options: { isWholeLine: true, className: "viz-line-next", zIndex: 1 },
      });
    }
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
    if (cur > 0) editor.revealLineInCenterIfOutsideViewport(cur);
  };

  const handleMount = (editor) => {
    editorRef.current = editor;
    applyDecorations(editor, currentLine, nextLine);
  };

  useEffect(() => {
    if (editorRef.current) applyDecorations(editorRef.current, currentLine, nextLine);
  }, [currentLine, nextLine]);

  return (
    <div style={{ height: "100%", position: "relative" }}>
      <style>{HIGHLIGHT_CSS}</style>
      <Editor
        height="100%"
        language={LANG_MONACO[language] ?? "cpp"}
        value={code}
        theme="vs-dark"
        onMount={handleMount}
        options={{
          readOnly: true,
          domReadOnly: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: "on",
          glyphMargin: false,
          folding: false,
          renderLineHighlight: "none",
          scrollbar: { vertical: "auto", horizontal: "auto" },
          fontSize: 12,
          wordWrap: "off",
          contextmenu: false,
          cursorStyle: "line",
          hideCursorInOverviewRuler: true,
          overviewRulerLanes: 0,
          occurrencesHighlight: false,
          selectionHighlight: false,
        }}
      />
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
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
  const [warning, setWarning] = useState("");
  const [classifications, setClassifications] = useState({});
  const [loading, setLoading] = useState(false);
  const [stdin, setStdin] = useState(testCases[0]?.input ?? "");
  const [selectedTc, setSelectedTc] = useState(testCases.length > 0 ? 0 : -1);
  const [ran, setRan] = useState(false);
  const [currentLine, setCurrentLine] = useState(0);
  const [nextLine, setNextLine] = useState(0);

  if (!isOpen) return null;

  const handleTcSelect = (idx) => {
    setSelectedTc(idx);
    if (idx >= 0 && testCases[idx]) setStdin(testCases[idx].input ?? "");
  };

  const handleRun = async () => {
    setLoading(true);
    setFrames([]);
    setError("");
    setWarning("");
    setStdout("");
    setClassifications({});
    setRan(false);
    setCurrentLine(0);
    setNextLine(0);
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
      setWarning(data.warning ?? "");
      setClassifications(data.classifications ?? {});
      setRan(true);
    } catch (e) {
      setError(e.response?.data?.message ?? e.message ?? "Unknown error");
      setRan(true);
    } finally {
      setLoading(false);
    }
  };

  const handleStepChange = ({ frame, nextFrame }) => {
    setCurrentLine(frame?.line ?? 0);
    setNextLine(nextFrame?.line ?? 0);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(3px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 1140,
          height: "92vh",
          maxHeight: 800,
          background: T.bg,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.85)",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
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

          <span style={{ fontSize: 12, color: T.textMuted, marginLeft: 6 }}>
            Your code runs unmodified — structures are detected automatically.
          </span>

          <div style={{ flex: 1 }} />

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 8 }}>
            <LegendDot color={T.blue} label="Current line" />
            <LegendDot color={T.yellow} label="Next line" />
          </div>

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
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
          {/* ── Left: code viewer + input ─────────────────────────────────── */}
          <div
            style={{
              width: 310,
              flexShrink: 0,
              borderRight: `1px solid ${T.border}`,
              display: "flex",
              flexDirection: "column",
              background: T.bg,
            }}
          >
            <div
              style={{
                padding: "6px 12px",
                borderBottom: `1px solid ${T.border}`,
                background: T.surface,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.textMuted,
                  letterSpacing: "0.07em",
                }}
              >
                CODE
              </span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {currentLine > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      color: T.blue,
                      fontFamily: "'JetBrains Mono', monospace",
                      background: T.blueDim,
                      border: `1px solid ${T.blue}44`,
                      borderRadius: 3,
                      padding: "1px 6px",
                    }}
                  >
                    ● {currentLine}
                  </span>
                )}
                {nextLine > 0 && nextLine !== currentLine && (
                  <span
                    style={{
                      fontSize: 10,
                      color: T.yellow,
                      fontFamily: "'JetBrains Mono', monospace",
                      background: T.yellowDim,
                      border: `1px solid ${T.yellow}44`,
                      borderRadius: 3,
                      padding: "1px 6px",
                    }}
                  >
                    ● {nextLine}
                  </span>
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
              <CodeViewer
                code={defaultCode}
                language={defaultLang}
                currentLine={currentLine}
                nextLine={nextLine}
              />
            </div>

            {/* Input section */}
            <div
              style={{
                flexShrink: 0,
                borderTop: `1px solid ${T.border}`,
                display: "flex",
                flexDirection: "column",
                maxHeight: 200,
              }}
            >
              <div
                style={{
                  padding: "5px 12px",
                  borderBottom: `1px solid ${T.border}`,
                  background: T.surface,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: T.textMuted,
                    letterSpacing: "0.07em",
                  }}
                >
                  INPUT
                </span>
                {testCases.length > 0 && (
                  <div style={{ display: "flex", gap: 3 }}>
                    {testCases.map((tc, i) => (
                      <button
                        key={tc.id}
                        onClick={() => handleTcSelect(i)}
                        style={{
                          padding: "1px 7px",
                          borderRadius: 3,
                          fontSize: 10,
                          border: `1px solid ${selectedTc === i ? T.accent : T.border}`,
                          background: selectedTc === i ? T.accentDim : "transparent",
                          color: selectedTc === i ? T.accent : T.textMuted,
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        #{i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setSelectedTc(-1);
                        setStdin("");
                      }}
                      style={{
                        padding: "1px 7px",
                        borderRadius: 3,
                        fontSize: 10,
                        border: `1px solid ${selectedTc === -1 ? T.accent : T.border}`,
                        background: selectedTc === -1 ? T.accentDim : "transparent",
                        color: selectedTc === -1 ? T.accent : T.textMuted,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      ✎
                    </button>
                  </div>
                )}
              </div>

              <textarea
                value={stdin}
                onChange={(e) => {
                  setStdin(e.target.value);
                  setSelectedTc(-1);
                }}
                placeholder="stdin..."
                style={{
                  flex: 1,
                  resize: "none",
                  background: T.bg,
                  border: "none",
                  color: T.text,
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: "8px 12px",
                  outline: "none",
                  lineHeight: 1.6,
                  minHeight: 52,
                }}
              />

              <div style={{ padding: "8px 12px", borderTop: `1px solid ${T.border}` }}>
                <button
                  onClick={handleRun}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "7px 0",
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
                  {loading ? "Running..." : "▶  Visualize"}
                </button>
              </div>
            </div>
          </div>

          {/* ── Right: player ──────────────────────────────────────────────── */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {!ran && !loading && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                  color: T.textMuted,
                  padding: 24,
                }}
              >
                <div style={{ fontSize: 28, opacity: 0.15 }}>◈</div>
                <div style={{ fontSize: 13, textAlign: "center", maxWidth: 340, lineHeight: 1.7 }}>
                  Hit <span style={{ color: T.accent }}>Visualize</span> to run your code step by
                  step. Arrays, matrices, trees, graphs, stacks and queues are detected from your
                  data automatically — no special code needed.
                </div>
                <div
                  style={{
                    padding: "8px 14px",
                    background: "rgba(59,130,246,0.08)",
                    border: `1px solid ${T.blue}33`,
                    borderRadius: 6,
                    fontSize: 11,
                    color: T.textMuted,
                    textAlign: "center",
                    maxWidth: 320,
                    lineHeight: 1.7,
                  }}
                >
                  💡 Wrong guess? Use the <span style={{ color: T.accent }}>view as</span> dropdown
                  on any variable to change how it's drawn — instantly, without re-running.
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
                  style={{ animation: "spin 1s linear infinite", display: "inline-block", fontSize: 18 }}
                >
                  ⟳
                </span>
                Running on Judge0...
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {ran && !loading && (
              <VisualizerPlayer
                frames={frames}
                stdout={stdout}
                error={error}
                warning={warning}
                classifications={classifications}
                onStepChange={handleStepChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: T.textMuted }}>
      <div style={{ width: 10, height: 10, borderRadius: 2, background: color, opacity: 0.85 }} />
      {label}
    </div>
  );
}
