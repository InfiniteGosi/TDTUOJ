export default function StatCard({ label, value, delta, icon, className = "" }) {
  const isPositive = delta && String(delta).startsWith("+");
  const isNegative = delta && String(delta).startsWith("-");

  return (
    <div
      className={`card stat-card ${className}`}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", minWidth: 0 }}
    >
      {icon && (
        <span style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>{icon}</span>
      )}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-3xl)",
          fontWeight: 700,
          color: "var(--text-primary)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <span
          style={{
            fontSize: "var(--text-xs)",
            textTransform: "uppercase",
            letterSpacing: "var(--tracking-wider)",
            color: "var(--text-muted)",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        {delta && (
          <span
            style={{
              fontSize: "var(--text-xs)",
              fontFamily: "var(--font-code)",
              color: isPositive
                ? "var(--green-ac)"
                : isNegative
                ? "var(--red-wa)"
                : "var(--text-muted)",
            }}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
