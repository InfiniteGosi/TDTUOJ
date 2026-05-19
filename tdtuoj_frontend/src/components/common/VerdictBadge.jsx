const VERDICT_CONFIG = {
  AC:       { label: "AC",      icon: "✓", color: "var(--green-ac)",    bg: "var(--green-subtle)" },
  WA:       { label: "WA",      icon: "✗", color: "var(--red-wa)",      bg: "var(--red-subtle)" },
  TLE:      { label: "TLE",     icon: "⏱", color: "var(--amber-tle)",   bg: "var(--amber-subtle)" },
  MLE:      { label: "MLE",     icon: "⚡", color: "var(--purple-mle)",  bg: "rgba(176,110,255,0.10)" },
  RE:       { label: "RE",      icon: "⚠", color: "var(--red-wa)",      bg: "var(--red-subtle)" },
  CE:       { label: "CE",      icon: "⚙", color: "var(--blue-ce)",     bg: "rgba(77,159,255,0.10)" },
  PENDING:  { label: "PENDING", icon: "·", color: "var(--gray-pending)", bg: "rgba(107,122,149,0.10)" },
  JUDGING:  { label: "JUDGING", icon: "·", color: "var(--cyan)",         bg: "var(--cyan-subtle)" },
};

export default function VerdictBadge({ verdict, showIcon = true, className = "" }) {
  const cfg = VERDICT_CONFIG[verdict] ?? VERDICT_CONFIG["PENDING"];
  const isJudging = verdict === "JUDGING";

  return (
    <span
      className={`badge verdict-badge ${isJudging ? "animate-pulse" : ""} ${className}`}
      style={{
        color: cfg.color,
        backgroundColor: cfg.bg,
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: "var(--radius-sm)",
        paddingLeft: "var(--space-2)",
      }}
    >
      {showIcon && <span aria-hidden="true">{cfg.icon}</span>}
      {cfg.label}
    </span>
  );
}
