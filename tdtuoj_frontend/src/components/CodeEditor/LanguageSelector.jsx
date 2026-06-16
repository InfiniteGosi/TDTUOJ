import { useState, useEffect, useRef } from "react";
import { LANGUAGE_IDS, LANGUAGE_NAMES } from "./constants";
import { ChevronDown } from "lucide-react";

const languages = Object.entries(LANGUAGE_IDS);
const names = LANGUAGE_NAMES;

const LanguageSelector = ({ language, onSelect }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-code)" }}>
        Language:
      </span>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: "var(--space-1)",
          padding: "var(--space-1) var(--space-3)",
          background: "var(--bg-overlay)",
          border: `1px solid ${open ? "var(--border-accent)" : "var(--border-default)"}`,
          borderRadius: "var(--radius-md)",
          color: "var(--text-primary)",
          fontSize: "var(--text-sm)",
          fontFamily: "var(--font-code)",
          cursor: "pointer",
          transition: "border-color var(--transition-fast)",
          minWidth: 120,
        }}
      >
        <span style={{ flex: 1 }}>{names[language] || language}</span>
        <ChevronDown size={12} color="var(--text-muted)"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform var(--transition-fast)", flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 200,
          background: "var(--bg-overlay)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-lg)",
          minWidth: 160,
          overflow: "hidden",
        }}>
          {languages.map(([lang]) => (
            <button
              key={lang}
              onClick={() => { onSelect(lang); setOpen(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "var(--space-2) var(--space-3)",
                background: lang === language ? "var(--cyan-subtle)" : "transparent",
                color: lang === language ? "var(--cyan)" : "var(--text-secondary)",
                fontSize: "var(--text-sm)",
                fontFamily: "var(--font-code)",
                border: "none", cursor: "pointer",
                transition: "background var(--transition-fast), color var(--transition-fast)",
              }}
              onMouseEnter={(e) => {
                if (lang !== language) {
                  e.currentTarget.style.background = "var(--bg-hover)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (lang !== language) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
            >
              {names[lang] || lang}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
