// src/components/visualizer/VisualizerModal.jsx
import { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import VisualizerPlayer from "./VisualizerPlayer";
import ApiService from "../../services/ApiService";

const T = {
  bg: "#0f0f0f",
  surface: "#1a1a1a",
  border: "#2a2a2a",
  text: "#e8e8e8",
  textMuted: "#888",
  textDim: "#555",
  accent: "#ffa116",
  accentDim: "rgba(255,161,22,0.12)",
  green: "#2cbb5d",
  red: "#ef4743",
  blue: "#3b82f6",
  blueDim: "rgba(59,130,246,0.18)",
  yellow: "#f5c518",
  yellowDim: "rgba(245,197,24,0.15)",
  purple: "#a78bfa",
};

const LANG_DISPLAY = { cpp: "C++", java: "Java", python: "Python", c: "C" };
const LANG_BACKEND = { cpp: "CPP", java: "JAVA", python: "PYTHON", c: "C" };
const LANG_MONACO = { cpp: "cpp", java: "java", python: "python", c: "c" };

const SNAPSHOT_HINTS = {
  python: `# snapshot() with a dict:
snapshot({"type": "array", "data": arr[:], "highlighted": [i, j]})
snapshot({"type": "tree",  "nodes": [...], "current": node_id})`,
  cpp: `// snapshot() with initializer list or raw string:
snapshot({{"type","array"}, {"data", arr}, {"highlighted", std::vector<int>{i,j}}});
char buf[512]; sprintf(buf, "{...}"); snapshot(buf);`,
  java: `// Snapshot.snapshot() with JSON string:
Snapshot.snapshot(Snapshot.jsonObj(
    "type","array","data",Snapshot.jsonArr(arr),
    "highlighted",Snapshot.jsonIntArr(i,j)));`,
  c: `/* raw JSON string: */
char buf[256];
sprintf(buf,"{\"type\":\"array\",\"data\":[%d],\"highlighted\":[%d]}",arr[i],i);
snapshot(buf);`,
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
    background: #0f0f0f !important;
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
        range: {
          startLineNumber: cur,
          startColumn: 1,
          endLineNumber: cur,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: "viz-line-current",
          zIndex: 2,
        },
      });
    }
    if (nxt > 0 && nxt !== cur) {
      newDecorations.push({
        range: {
          startLineNumber: nxt,
          startColumn: 1,
          endLineNumber: nxt,
          endColumn: 1,
        },
        options: { isWholeLine: true, className: "viz-line-next", zIndex: 1 },
      });
    }
    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations,
    );
    if (cur > 0) editor.revealLineInCenterIfOutsideViewport(cur);
  };

  const handleMount = (editor) => {
    editorRef.current = editor;
    applyDecorations(editor, currentLine, nextLine);
  };

  useEffect(() => {
    if (editorRef.current)
      applyDecorations(editorRef.current, currentLine, nextLine);
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
  const [loading, setLoading] = useState(false);
  const [stdin, setStdin] = useState(testCases[0]?.input ?? "");
  const [selectedTc, setSelectedTc] = useState(testCases.length > 0 ? 0 : -1);
  const [ran, setRan] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [vizMode, setVizMode] = useState("AUTO");
  const [currentLine, setCurrentLine] = useState(0);
  const [nextLine, setNextLine] = useState(0);

  if (!isOpen) return null;

  const handleTcSelect = (idx) => {
    setSelectedTc(idx);
    if (idx >= 0 && testCases[idx]) setStdin(testCases[idx].input ?? "");
  };

  const handleModeChange = (key) => {
    setVizMode(key);
    setRan(false);
    setFrames([]);
    setError("");
    setStdout("");
    setCurrentLine(0);
    setNextLine(0);
  };

  const handleRun = async () => {
    setLoading(true);
    setFrames([]);
    setError("");
    setStdout("");
    setRan(false);
    setCurrentLine(0);
    setNextLine(0);
    try {
      const resp = await ApiService.visualize({
        sourceCode: defaultCode,
        language: LANG_BACKEND[defaultLang] ?? "CPP",
        stdin,
        mode: vizMode,
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
        background: "rgba(0,0,0,0.78)",
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

          {/* Mode toggle */}
          <div style={{ display: "flex", gap: 3, marginLeft: 4 }}>
            {[
              {
                key: "AUTO",
                label: "⚡ Auto",
                tooltip:
                  "Paste any code — variables are tracked automatically.\nBest for: ad-hoc problems where you just want to see what's happening.",
              },
              {
                key: "MANUAL",
                label: "🎯 Custom",
                tooltip:
                  "Add snapshot() calls for rich visuals (arrays, trees, graphs, colors).\nBest for: classic algorithms like sorting, BFS, DFS, binary search.",
              },
            ].map(({ key, label, tooltip }) => (
              <button
                key={key}
                onClick={() => handleModeChange(key)}
                title={tooltip}
                style={{
                  padding: "3px 10px",
                  borderRadius: 5,
                  fontSize: 11,
                  border: `1px solid ${vizMode === key ? T.accent : T.border}`,
                  background: vizMode === key ? T.accentDim : "transparent",
                  color: vizMode === key ? T.accent : T.textMuted,
                  cursor: "pointer",
                  fontWeight: 600,
                  transition: "all 0.12s",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {/* Legend */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginRight: 8,
            }}
          >
            <LegendDot color={T.blue} label="Current line" />
            <LegendDot color={T.yellow} label="Next line" />
          </div>

          {/* snapshot() hint — custom mode only */}
          {vizMode === "MANUAL" && (
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
          )}

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

        {/* ── Mode description bar ─────────────────────────────────────────── */}
        <div
          style={{
            padding: "7px 16px",
            borderBottom: `1px solid ${T.border}`,
            background:
              vizMode === "AUTO" ? "rgba(59,130,246,0.06)" : T.accentDim,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {vizMode === "AUTO" ? (
            <>
              <span
                style={{
                  fontSize: 11,
                  color: T.blue,
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  flexShrink: 0,
                }}
              >
                ⚡ Auto Trace
              </span>
              <span
                style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}
              >
                Paste any code and hit Run — variables are captured
                automatically, line by line. Best for{" "}
                <span style={{ color: T.blue }}>ad-hoc problem solving</span>{" "}
                where you just want to see what your code is doing.
              </span>
            </>
          ) : (
            <>
              <span
                style={{
                  fontSize: 11,
                  color: T.accent,
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  flexShrink: 0,
                }}
              >
                🎯 Custom Snapshot
              </span>
              <span
                style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}
              >
                Add{" "}
                <code
                  style={{
                    color: T.accent,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  snapshot()
                </code>{" "}
                calls to control exactly what gets visualized — arrays with
                colors, trees, graphs. Best for{" "}
                <span style={{ color: T.accent }}>classic algorithms</span> like
                sorting, binary search, BFS/DFS.
              </span>
            </>
          )}
        </div>

        {/* ── snapshot() hint panel ───────────────────────────────────────── */}
        {vizMode === "MANUAL" && showHint && (
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

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div
          style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}
        >
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
            {/* Code header */}
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

            {/* Monaco read-only */}
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
                          background:
                            selectedTc === i ? T.accentDim : "transparent",
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
                        background:
                          selectedTc === -1 ? T.accentDim : "transparent",
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
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: "8px 12px",
                  outline: "none",
                  lineHeight: 1.6,
                  minHeight: 52,
                }}
              />

              <div
                style={{
                  padding: "8px 12px",
                  borderTop: `1px solid ${T.border}`,
                }}
              >
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
                  {loading ? "Running..." : "▶  Run Visualizer"}
                </button>
              </div>
            </div>
          </div>

          {/* ── Right: player ──────────────────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Empty state */}
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

                {vizMode === "AUTO" ? (
                  <>
                    <div
                      style={{
                        fontSize: 13,
                        textAlign: "center",
                        maxWidth: 320,
                        lineHeight: 1.7,
                      }}
                    >
                      Paste your code and hit{" "}
                      <span style={{ color: T.accent }}>Run Visualizer</span>.
                      Variables are captured automatically — no changes to your
                      code needed.
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
                        maxWidth: 300,
                        lineHeight: 1.7,
                      }}
                    >
                      💡 Want colored arrays, trees, or graphs? Switch to{" "}
                      <span
                        style={{
                          color: T.accent,
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                        onClick={() => handleModeChange("MANUAL")}
                      >
                        🎯 Custom
                      </span>{" "}
                      mode and add{" "}
                      <code style={{ color: T.accent }}>snapshot()</code> calls.
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        fontSize: 13,
                        textAlign: "center",
                        maxWidth: 320,
                        lineHeight: 1.7,
                      }}
                    >
                      Add{" "}
                      <code
                        style={{
                          color: T.accent,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        snapshot()
                      </code>{" "}
                      calls to your code, then hit{" "}
                      <span style={{ color: T.accent }}>Run Visualizer</span>.
                    </div>

                    {/* Quick example */}
                    <div
                      style={{
                        padding: "10px 14px",
                        background: T.accentDim,
                        border: `1px solid ${T.accent}33`,
                        borderRadius: 6,
                        fontSize: 10,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: T.textMuted,
                        maxWidth: 300,
                        lineHeight: 1.8,
                      }}
                    >
                      <div
                        style={{
                          color: T.accent,
                          marginBottom: 4,
                          fontWeight: 700,
                        }}
                      >
                        Example (Python):
                      </div>
                      <div>snapshot(&#123;</div>
                      <div>
                        &nbsp;&nbsp;
                        <span style={{ color: "#a78bfa" }}>"type"</span>:{" "}
                        <span style={{ color: T.green }}>"array"</span>,
                      </div>
                      <div>
                        &nbsp;&nbsp;
                        <span style={{ color: "#a78bfa" }}>"data"</span>:
                        arr[:],
                      </div>
                      <div>
                        &nbsp;&nbsp;
                        <span style={{ color: "#a78bfa" }}>"highlighted"</span>:
                        [i]
                      </div>
                      <div>&#125;)</div>
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color: T.textDim,
                        textAlign: "center",
                        maxWidth: 280,
                        lineHeight: 1.7,
                      }}
                    >
                      💡 Don't want to modify your code? Switch to{" "}
                      <span
                        style={{
                          color: T.blue,
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                        onClick={() => handleModeChange("AUTO")}
                      >
                        ⚡ Auto
                      </span>{" "}
                      mode.
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Loading */}
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

            {/* Player */}
            {ran && !loading && (
              <VisualizerPlayer
                frames={frames}
                stdout={stdout}
                error={error}
                vizMode={vizMode}
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 10,
        color: T.textMuted,
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          background: color,
          opacity: 0.85,
        }}
      />
      {label}
    </div>
  );
}
