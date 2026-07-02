const Toggle = ({ value, onChange, label, loading = false, disabled = false, color = "var(--primary)" }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <button
      type="button"
      aria-pressed={value}
      aria-busy={loading}
      aria-label={label || "toggle"}
      onClick={() => !loading && !disabled && onChange(!value)}
      disabled={disabled || loading}
      style={{
        position: "relative",
        width: 44, height: 24,
        borderRadius: 12,
        border: "none",
        padding: 0,
        flexShrink: 0,
        cursor: loading || disabled ? "not-allowed" : "pointer",
        background: value ? color : "var(--border-default)",
        opacity: loading || disabled ? 0.65 : 1,
        transition: "background 200ms ease",
        outline: "none",
      }}
    >
      {loading ? (
        <span style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            width: 12, height: 12,
            border: "2px solid rgba(255,255,255,0.3)",
            borderTopColor: "#fff",
            borderRadius: "50%",
            display: "inline-block",
            animation: "spin 0.6s linear infinite",
          }} />
        </span>
      ) : (
        <span style={{
          position: "absolute",
          top: 3,
          left: value ? 23 : 3,
          width: 18, height: 18,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
          transition: "left 200ms cubic-bezier(0.34,1.56,0.64,1)",
        }} />
      )}
    </button>
    {label && (
      <span style={{ fontSize: 13, color: "var(--text-primary)", userSelect: "none" }}>
        {label}
      </span>
    )}
  </div>
);

export default Toggle;
