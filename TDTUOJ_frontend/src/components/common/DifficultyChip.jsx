const DIFFICULTY_COLOR = {
  EASY:   "var(--diff-easy)",
  MEDIUM: "var(--diff-medium)",
  HARD:   "var(--diff-hard)",
};

export default function DifficultyChip({ difficulty, className = "" }) {
  const color = DIFFICULTY_COLOR[difficulty] ?? "var(--text-muted)";

  return (
    <span
      className={`badge ${className}`}
      style={{
        color,
        background: "transparent",
        border: `1px solid ${color}`,
        borderRadius: "var(--radius-pill)",
        letterSpacing: "var(--tracking-wider)",
      }}
    >
      {difficulty}
    </span>
  );
}
