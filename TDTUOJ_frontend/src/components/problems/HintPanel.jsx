import { useEffect, useRef, useState } from "react";
import { Lightbulb, X } from "lucide-react";

const T = {
  bg:          "var(--bg-void)",
  surface:     "var(--bg-raised)",
  border:      "var(--border-default)",
  text:        "var(--text-primary)",
  textMuted:   "var(--text-secondary)",
  textDim:     "var(--text-muted)",
};

const MODELS = [
  { key: "gemini", label: "Gemini" },
  { key: "claude", label: "Claude" },
  { key: "openai", label: "GPT-4o" },
];

const SUGGESTIONS = [
  { label: "Explain this problem", color: "var(--blue-ce)" },
  { label: "Suggest an approach",  color: "var(--primary)" },
  { label: "Time & space complexity", color: "var(--green-ac)" },
  { label: "Give me a hint",       color: "var(--amber-tle)" },
];

const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

const TypingDots = () => (
  <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
    {[0, 1, 2].map((d) => (
      <span key={d} style={{
        width: 5, height: 5, borderRadius: "50%",
        background: T.textDim, display: "inline-block",
        animation: `hintDot 1.2s ease-in-out ${d * 0.2}s infinite`,
      }} />
    ))}
  </div>
);

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
  const textareaRef    = useRef(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, hintLoading]);

  // auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0";
    const next = Math.min(el.scrollHeight, 120);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > 120 ? "auto" : "hidden";
  }, [hintInput]);

  const canSend = hintInput.trim().length > 0 && !hintLoading;

  return (
    <div style={{ width, height: "100%", background: T.surface, borderLeft: `1px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>

      {/* keyframe injection */}
      <style>{`@keyframes hintDot { 0%,80%,100%{opacity:.2;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }`}</style>

      {/* ── Header ── */}
      <div style={{ padding: "11px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: "var(--radius-sm)", background: "var(--primary-subtle)", border: "1px solid var(--border-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Lightbulb size={13} color="var(--primary)" />
          </div>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: T.text, fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}>
            HINTS
          </span>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: T.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "var(--radius-sm)", padding: 0, transition: "color 0.12s" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = T.text; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; }}>
          <X size={14} />
        </button>
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>

        {/* empty state */}
        {messages.length === 0 && !hintLoading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingTop: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: "var(--radius-lg)", background: "var(--primary-subtle)", border: "1px solid var(--border-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Lightbulb size={24} color="var(--primary)" />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "var(--text-base)", fontWeight: 700, color: T.text, fontFamily: "var(--font-display)", letterSpacing: "0.03em" }}>PROBLEM HINTS</div>
              <div style={{ fontSize: "var(--text-xs)", color: T.textMuted, marginTop: 4, fontFamily: "var(--font-body)" }}>Get guided — not spoiled</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, width: "100%", marginTop: 4 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s.label} onClick={() => onSubmit(s.label)} style={{ textAlign: "left", padding: "10px 14px", borderRadius: "var(--radius-md)", background: T.bg, border: `1px solid var(--border-default)`, borderLeft: `3px solid ${s.color}`, color: T.text, fontSize: "var(--text-sm)", cursor: "pointer", transition: "background 0.12s", fontFamily: "var(--font-body)", lineHeight: 1.4 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = T.bg; }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* conversation */}
        {messages.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* user bubble */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ padding: "8px 13px", borderRadius: "18px 18px 4px 18px", background: "var(--primary-subtle)", border: "1px solid var(--border-accent)", maxWidth: "82%", fontSize: "var(--text-sm)", color: T.text, fontFamily: "var(--font-body)", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {msg.user}
                  </div>
                </div>
                {/* assistant text — clean, no bubble */}
                <div style={{ fontSize: "var(--text-sm)", color: T.text, fontFamily: "var(--font-body)", lineHeight: 1.8, whiteSpace: "pre-wrap", wordBreak: "break-word", paddingRight: 4 }}>
                  {msg.assistant}
                </div>
              </div>
            ))}

            {hintLoading && <TypingDots />}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* loading before first message */}
        {messages.length === 0 && hintLoading && <TypingDots />}
      </div>

      {/* ── Input container ── */}
      <div style={{ padding: "10px 12px 14px", borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div
          style={{ borderRadius: 16, background: T.bg, border: `1px solid ${focused ? "var(--primary)" : T.border}`, boxShadow: focused ? "0 0 0 3px var(--primary-subtle)" : "none", transition: "border-color 0.15s, box-shadow 0.15s", cursor: "text" }}
          onClick={(e) => { if (!e.target.closest?.("button, textarea")) textareaRef.current?.focus(); }}
        >
          {/* textarea */}
          <div style={{ padding: "10px 12px 0" }}>
            <textarea
              ref={textareaRef}
              value={hintInput}
              onChange={(e) => setHintInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (canSend) onSubmit(); } }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Ask about this problem…"
              rows={1}
              style={{ width: "100%", background: "transparent", border: "none", outline: "none", resize: "none", color: T.text, fontSize: "var(--text-sm)", fontFamily: "var(--font-body)", lineHeight: 1.6, overflowY: "hidden", boxSizing: "border-box" }}
            />
          </div>

          {/* bottom row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 6px 6px 8px" }}>
            {/* model chips */}
            <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
              {MODELS.map(({ key, label }) => (
                <button key={key}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setSelectedModel(key)}
                  style={{ padding: "2px 9px", borderRadius: "var(--radius-pill)", fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${selectedModel === key ? "var(--primary)" : T.border}`, background: selectedModel === key ? "var(--primary-subtle)" : "transparent", color: selectedModel === key ? "var(--primary)" : T.textMuted, transition: "all 0.12s", fontFamily: "var(--font-body)" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* send button */}
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { if (canSend) onSubmit(); }}
              disabled={!canSend}
              style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: canSend ? "var(--primary)" : T.border, color: canSend ? "var(--text-inverse)" : T.textMuted, cursor: canSend ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s, color 0.15s, transform 0.1s" }}
              onMouseEnter={(e) => { if (canSend) e.currentTarget.style.transform = "scale(1.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}>
              <SendIcon />
            </button>
          </div>
        </div>

        <div style={{ marginTop: 6, textAlign: "right" }}>
          <span style={{ fontSize: 10, color: T.textDim, fontFamily: "var(--font-code)" }}>⇧↵ newline</span>
        </div>
      </div>
    </div>
  );
};

export default HintPanel;
