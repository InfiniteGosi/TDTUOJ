import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { LANGUAGE_IDS, LANGUAGE_NAMES } from "./constants";
import { ChevronDown } from "lucide-react";

const languages = Object.entries(LANGUAGE_IDS);
const names = LANGUAGE_NAMES;

const LanguageSelector = ({ language, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null); // {top, left, width}
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const place = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left, width: r.width });
  }, []);

  const toggle = () => {
    if (!open) place();
    setOpen((v) => !v);
  };

  // While open: reposition on scroll, close on resize (avoids clipping/overlap
  // when the surrounding resizable panels are dragged).
  useEffect(() => {
    if (!open) return;
    const onScroll = () => place();
    const onResize = () => setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, place]);

  // Click-outside (button + portal menu)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const menu = open && pos && createPortal(
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        role="listbox"
        initial={{ opacity: 0, y: -8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.96 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          minWidth: Math.max(pos.width, 140),
          zIndex: 9999,
          overflow: "hidden",
          borderRadius: "var(--radius-md)",
          background: "var(--bg-raised)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-lg)",
          transformOrigin: "top center",
        }}
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
        >
          {languages.map(([lang], i) => {
            const active = lang === language;
            return (
              <motion.button
                key={lang}
                variants={{ hidden: { opacity: 0, x: -12 }, visible: { opacity: 1, x: 0 } }}
                onClick={() => { onSelect(lang); setOpen(false); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "var(--space-2) var(--space-3)",
                  borderBottom: i === languages.length - 1 ? "none" : "1px solid var(--border-subtle)",
                  background: active ? "var(--primary-subtle)" : "transparent",
                  color: active ? "var(--primary)" : "var(--text-secondary)",
                  fontSize: "var(--text-sm)",
                  fontFamily: "var(--font-code)",
                  fontWeight: active ? 600 : 400,
                  borderLeft: "none", borderRight: "none", borderTopWidth: 0,
                  cursor: "pointer",
                  transition: "background var(--transition-fast), color var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "var(--bg-hover)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }
                }}
              >
                {names[lang] || lang}
              </motion.button>
            );
          })}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-code)" }}>
        Language:
      </span>
      <button
        ref={btnRef}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
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
          width: 120, flexShrink: 0,
        }}
      >
        <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {names[language] || language}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18, ease: "easeInOut" }}
          style={{ display: "flex", flexShrink: 0 }}
        >
          <ChevronDown size={12} color="var(--text-muted)" />
        </motion.span>
      </button>
      {menu}
    </div>
  );
};

export default LanguageSelector;
