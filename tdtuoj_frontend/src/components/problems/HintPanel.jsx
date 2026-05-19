import { useEffect, useRef } from "react";
import { Lightbulb, ArrowUp, X } from "lucide-react";

const T = {
  bg:          "var(--bg-void)",
  surface:     "var(--bg-raised)",
  border:      "var(--border-default)",
  borderBright:"var(--border-strong)",
  text:        "var(--text-primary)",
  textMuted:   "var(--text-secondary)",
  textDim:     "var(--text-muted)",
  accent:      "var(--primary)",
  accentDim:   "var(--primary-subtle)",
  green:       "var(--green-ac)",
  blue:        "var(--blue-ce)",
};

const MODELS = [
  { key: "gemini", label: "Gemini" },
  { key: "claude", label: "Claude" },
  { key: "openai", label: "GPT-4o" },
];

const SUGGESTIONS = [
  { label: "Explain this problem", color: "var(--blue-ce)" },
  { label: "Suggest an approach", color: "var(--primary)" },
  { label: "Time & space complexity", color: "var(--green-ac)" },
  { label: "Give me a hint", color: "var(--amber-tle)" },
];

const HintPanel = ({
  width = 340,
  messages,
  hintInput,
  setHintInput,
  hintLoading,
  selectedModel,
  setSelectedModel,
  onSubmit,
  onClose,
}) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, hintLoading]);

  return (
    <div style={{
      width, height: "100%",
      background: T.surface,
      borderLeft: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column", flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: "11px 16px",
        borderBottom: `1px solid ${T.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: "var(--radius-sm)",
            background: "var(--primary-subtle)", border: "1px solid var(--border-accent)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Lightbulb size={13} color="var(--primary)" />
          </div>
          <span style={{
            fontSize: "var(--text-sm)", fontWeight: 700, color: T.text,
            fontFamily: "var(--font-display)", letterSpacing: "0.04em",
          }}>
            HINTS
          </span>
        </div>
        <button onClick={onClose} style={{
          background: "transparent", border: "none", color: T.textMuted,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          width: 24, height: 24, borderRadius: "var(--radius-sm)", padding: 0,
          transition: "color 0.12s",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.color = T.text; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {messages.length === 0 && !hintLoading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingTop: 20 }}>
            {/* Icon mark */}
            <div style={{
              width: 56, height: 56, borderRadius: "var(--radius-lg)",
              background: "var(--primary-subtle)",
              border: "1px solid var(--border-accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Lightbulb size={26} color="var(--primary)" />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: "var(--text-base)", fontWeight: 700, color: T.text,
                fontFamily: "var(--font-display)", letterSpacing: "0.03em",
              }}>
                PROBLEM HINTS
              </div>
              <div style={{ fontSize: "var(--text-xs)", color: T.textMuted, marginTop: 4, fontFamily: "var(--font-body)" }}>
                Get guided — not spoiled
              </div>
            </div>

            {/* Quick prompts */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7, width: "100%", marginTop: 4 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s.label} onClick={() => onSubmit(s.label)}
                  style={{
                    textAlign: "left", padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    background: T.bg,
                    border: `1px solid var(--border-default)`,
                    borderLeft: `3px solid ${s.color}`,
                    color: T.text, fontSize: "var(--text-sm)",
                    cursor: "pointer", transition: "background 0.12s, border-color 0.12s",
                    fontFamily: "var(--font-body)", lineHeight: 1.4,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.borderRightColor = "var(--border-strong)"; e.currentTarget.style.borderTopColor = "var(--border-strong)"; e.currentTarget.style.borderBottomColor = "var(--border-strong)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = T.bg; e.currentTarget.style.borderRightColor = "var(--border-default)"; e.currentTarget.style.borderTopColor = "var(--border-default)"; e.currentTarget.style.borderBottomColor = "var(--border-default)"; }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {messages.map((msg, i) => (
              <div key={i}>
                {/* User bubble */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 7 }}>
                  <div style={{
                    padding: "8px 12px",
                    borderRadius: "10px 10px 2px 10px",
                    background: "var(--primary-subtle)",
                    border: "1px solid var(--border-accent)",
                    maxWidth: "85%", fontSize: "var(--text-sm)", color: T.text,
                    fontFamily: "var(--font-body)", lineHeight: 1.6,
                  }}>
                    {msg.user}
                  </div>
                </div>
                {/* Assistant bubble */}
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{
                    padding: "8px 12px",
                    borderRadius: "10px 10px 10px 2px",
                    background: T.bg,
                    border: `1px solid ${T.border}`,
                    maxWidth: "95%", fontSize: "var(--text-sm)", color: T.text,
                    whiteSpace: "pre-wrap", lineHeight: 1.75,
                    fontFamily: "var(--font-body)",
                  }}>
                    {msg.assistant}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {hintLoading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 10 }}>
            <div style={{
              padding: "8px 12px", borderRadius: "10px 10px 10px 2px",
              background: T.bg, border: `1px solid ${T.border}`,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div className="spinner" style={{ width: 11, height: 11, borderWidth: 2, borderTopColor: "var(--primary)" }} />
              <span style={{ fontSize: "var(--text-xs)", color: T.textMuted, fontFamily: "var(--font-body)" }}>Thinking…</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom input */}
      <div style={{ padding: "12px 16px 14px", borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <textarea
            value={hintInput}
            onChange={(e) => setHintInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); }
            }}
            placeholder="Ask about this problem…"
            rows={2}
            style={{
              flex: 1, padding: "8px 11px",
              borderRadius: "var(--radius-md)",
              border: `1px solid ${T.border}`,
              background: T.bg,
              color: T.text,
              fontSize: "var(--text-sm)",
              resize: "none",
              outline: "none",
              fontFamily: "var(--font-body)",
              lineHeight: 1.55,
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; }}
            onBlur={(e) => { e.target.style.borderColor = T.border; }}
          />
          <button
            onClick={() => onSubmit()}
            disabled={hintLoading || !hintInput.trim()}
            style={{
              width: 34, height: 34, borderRadius: "var(--radius-md)",
              alignSelf: "flex-end",
              background: "var(--primary)",
              color: "var(--text-inverse)",
              fontWeight: 700,
              cursor: (hintLoading || !hintInput.trim()) ? "not-allowed" : "pointer",
              border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              opacity: (hintLoading || !hintInput.trim()) ? 0.4 : 1,
              transition: "opacity 0.15s, transform 0.1s",
            }}
            onMouseEnter={(e) => { if (!hintLoading && hintInput.trim()) e.currentTarget.style.transform = "scale(1.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <ArrowUp size={15} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {MODELS.map(({ key, label }) => (
            <button key={key} onClick={() => setSelectedModel(key)} style={{
              padding: "3px 10px",
              borderRadius: "var(--radius-pill)",
              fontSize: "var(--text-xs)", fontWeight: 600,
              cursor: "pointer",
              border: `1px solid ${selectedModel === key ? "var(--primary)" : T.border}`,
              background: selectedModel === key ? "var(--primary-subtle)" : "transparent",
              color: selectedModel === key ? "var(--primary)" : T.textMuted,
              transition: "all 0.12s",
              fontFamily: "var(--font-body)",
            }}>
              {label}
            </button>
          ))}
          <span style={{ fontSize: 10, color: T.textDim, marginLeft: "auto", fontFamily: "var(--font-code)" }}>
            ⇧↵ newline
          </span>
        </div>
      </div>
    </div>
  );
};

export default HintPanel;
