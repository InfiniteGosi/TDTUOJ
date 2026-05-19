export default function TagPill({ label, onClick, active = false, className = "" }) {
  const Tag = onClick ? "button" : "span";

  return (
    <Tag
      className={`tag-pill ${active ? "tag-pill--active" : ""} ${className}`}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px var(--space-3)",
        borderRadius: "var(--radius-pill)",
        fontSize: "var(--text-xs)",
        fontWeight: 500,
        fontFamily: "var(--font-body)",
        background: active ? "var(--cyan-subtle)" : "var(--bg-overlay)",
        border: `1px solid ${active ? "var(--border-accent)" : "var(--border-default)"}`,
        color: active ? "var(--cyan)" : "var(--text-secondary)",
        cursor: onClick ? "pointer" : "default",
        transition: "all var(--transition-fast)",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!onClick) return;
        e.currentTarget.style.borderColor = "var(--border-accent)";
        e.currentTarget.style.color = "var(--cyan)";
      }}
      onMouseLeave={(e) => {
        if (!onClick || active) return;
        e.currentTarget.style.borderColor = "var(--border-default)";
        e.currentTarget.style.color = "var(--text-secondary)";
      }}
    >
      {label}
    </Tag>
  );
}
