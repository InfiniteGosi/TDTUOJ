import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

// ── Shared admin form chrome ──────────────────────────────────────────────────
// One visual language for all admin form pages (contest, problem, ...):
// dotted bg-void page, sticky top bar with save action, numbered section cards.

const injectStyles = () => {
  if (document.getElementById("form-section-styles")) return;
  const s = document.createElement("style");
  s.id = "form-section-styles";
  s.textContent = `
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(s);
};

/** Full-page wrapper: dark void background with the dotted accent pattern. */
export const FormPageShell = ({ children }) => {
  useEffect(() => { injectStyles(); }, []);
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-void)",
      backgroundImage: "radial-gradient(circle, rgba(245,160,0,0.04) 1px, transparent 1px)",
      backgroundSize: "24px 24px",
    }}>
      {children}
    </div>
  );
};

/** Sticky top bar: back arrow + icon + title on the left, actions on the right. */
export const StickyFormBar = ({ onBack, icon: Icon, title, children }) => (
  <div style={{
    position: "sticky", top: 0, zIndex: 20,
    height: 56,
    background: "var(--bg-raised)",
    borderBottom: "1px solid var(--border-subtle)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 24px",
  }}>
    <div className="flex items-center gap-3">
      <button type="button" className="btn btn-ghost btn-sm" onClick={onBack} style={{ padding: "6px 8px" }}>
        <ArrowLeft size={18} />
      </button>
      {Icon && <Icon size={20} color="var(--primary)" />}
      <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
        {title}
      </span>
    </div>
    <div className="flex items-center gap-3">
      {children}
    </div>
  </div>
);

/** Spinner used inside save buttons. */
export const ButtonSpinner = ({ size = 14 }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff",
    animation: "spin 0.8s linear infinite",
  }} />
);

/** Numbered section card with entrance animation. */
export const SectionCard = ({ number, title, children, delay = 0, right = null }) => {
  useEffect(() => { injectStyles(); }, []);
  return (
    <div style={{
      background: "var(--bg-base)",
      border: "1px solid var(--border-default)",
      borderRadius: 12,
      padding: "28px 28px 28px",
      position: "relative",
      marginTop: 32,
      // Each card is a stacking context (animation transform) — give earlier
      // cards higher z-index so their dropdowns render above later cards.
      zIndex: 10 - number,
      animation: `fadeUp 350ms cubic-bezier(0.16,1,0.3,1) ${delay}ms both`,
      transition: "border-color 200ms ease",
    }}>
      <div style={{
        position: "absolute", top: -14, left: 20,
        width: 28, height: 28, borderRadius: "50%",
        background: "var(--primary)", color: "var(--bg-void)",
        fontFamily: "var(--font-display)", fontSize: "var(--text-base)", fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 0 3px var(--bg-void), 0 0 16px rgba(245,160,0,0.4)",
      }}>{number}</div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20,
      }}>
        <div style={{
          fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)",
          letterSpacing: "0.14em",
          fontFamily: "var(--font-display)",
        }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
};

/** Labelled field with optional required mark and hint line. */
export const Field = ({ label, required, children, hint }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-1">
      <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>{label}</span>
      {required && <span style={{ fontSize: "var(--text-sm)", color: "var(--red-wa)" }}>*</span>}
    </div>
    {children}
    {hint && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{hint}</span>}
  </div>
);
