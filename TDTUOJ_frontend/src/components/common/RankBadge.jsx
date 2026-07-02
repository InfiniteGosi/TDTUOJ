import { Crown, Medal, Award } from "lucide-react";

const MEDALS = {
  1: { Icon: Crown, color: "var(--rank-gold)",   glow: "rgba(255,215,0,0.35)" },
  2: { Icon: Medal, color: "var(--rank-silver)", glow: "rgba(192,200,216,0.30)" },
  3: { Icon: Award, color: "var(--rank-bronze)", glow: "rgba(205,127,50,0.30)" },
};

export default function RankBadge({ rank, className = "" }) {
  const medal = MEDALS[rank];

  if (medal) {
    const { Icon, color, glow } = medal;
    return (
      <span
        className={`rank-badge ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            // Deep shade of the rank tone → strong contrast on the light metallic face.
            color: `color-mix(in srgb, ${color} 25%, #000)`,
            // Metallic sheen: bright highlight top-left fading into the base tone.
            background: `radial-gradient(circle at 32% 26%, color-mix(in srgb, ${color} 35%, #fff), ${color})`,
            border: `1px solid color-mix(in srgb, ${color} 70%, #000)`,
            boxShadow: `0 2px 8px ${glow}, inset 0 1px 1px rgba(255,255,255,0.45), inset 0 -1px 2px rgba(0,0,0,0.25)`,
          }}
        >
          <Icon size={15} strokeWidth={2.5} />
        </span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-base)",
            fontWeight: 700,
            color,
            textShadow: `0 0 10px ${glow}`,
          }}
        >
          {rank}
        </span>
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
      {rank ?? "—"}
    </span>
  );
}
