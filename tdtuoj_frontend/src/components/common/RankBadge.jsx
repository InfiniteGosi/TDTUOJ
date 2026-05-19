const MEDALS = {
  1: { icon: "🥇", color: "var(--rank-gold)",   glow: "rgba(255,215,0,0.25)" },
  2: { icon: "🥈", color: "var(--rank-silver)", glow: "rgba(192,200,216,0.20)" },
  3: { icon: "🥉", color: "var(--rank-bronze)", glow: "rgba(205,127,50,0.20)" },
};

export default function RankBadge({ rank, className = "" }) {
  const medal = MEDALS[rank];

  if (medal) {
    return (
      <span
        className={`rank-badge ${className}`}
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-base)",
          fontWeight: 700,
          color: medal.color,
          textShadow: `0 0 12px ${medal.glow}`,
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-1)",
        }}
      >
        {medal.icon} {rank}
      </span>
    );
  }

  return (
    <span
      className={`rank-badge ${className}`}
      style={{
        fontFamily: "var(--font-display)",
        fontSize: "var(--text-sm)",
        color: "var(--text-muted)",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {rank}
    </span>
  );
}
