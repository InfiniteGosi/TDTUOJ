export default function LiveDot({ size = 8, color = "var(--green-ac)", className = "" }) {
  return (
    <span
      className={`live-dot ${className}`}
      aria-label="Live"
      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
    >
      <span
        className="animate-pulse"
        style={{
          display: "inline-block",
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: color,
          boxShadow: `0 0 6px ${color}`,
          flexShrink: 0,
        }}
      />
    </span>
  );
}
