/**
 * FilterPills — unified pill button group for filter options.
 *
 * Two visual modes determined by whether `accent` is supplied per option:
 *   - tinted  (accent provided): colored border + subtle bg + accent text
 *   - solid   (no accent):       solid var(--primary) fill + var(--text-inverse) text
 *
 * Props:
 *   value        — current selected value (string)
 *   onChange     — (value: string) => void
 *   options      — [{ value, label, accent? }]
 *   clearable    — if true, clicking the active pill resets value to ""
 *   style        — passed to wrapper div
 */
export default function FilterPills({
  value,
  onChange,
  options = [],
  clearable = false,
  style,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-1)",
        flexWrap: "wrap",
        ...style,
      }}
    >
      {options.map((opt) => {
        const active  = value === opt.value;
        const accent  = opt.accent;           // undefined → solid mode
        const isTinted = !!accent;

        // Active styles
        const activeBg     = isTinted
          ? `color-mix(in srgb, ${accent} 13%, transparent)`
          : "var(--primary)";
        const activeBorder = isTinted ? `1.5px solid ${accent}` : "1.5px solid transparent";
        const activeColor  = isTinted ? accent : "var(--text-inverse)";

        // Inactive styles
        const inactiveBg     = "transparent";
        const inactiveBorder = isTinted
          ? "1.5px solid var(--border-default)"
          : "1.5px solid transparent";
        const inactiveColor  = "var(--text-muted)";

        return (
          <button
            key={opt.value}
            onClick={() => onChange(clearable && active ? "" : opt.value)}
            style={{
              padding: "4px 12px",
              borderRadius: "var(--radius-pill)",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              border:     active ? activeBorder     : inactiveBorder,
              background: active ? activeBg         : inactiveBg,
              color:      active ? activeColor      : inactiveColor,
              cursor: "pointer",
              transition: "all var(--transition-fast)",
              outline: "none",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (active) return;
              if (isTinted) {
                e.currentTarget.style.borderColor = accent;
                e.currentTarget.style.color = accent;
                e.currentTarget.style.background = `color-mix(in srgb, ${accent} 8%, transparent)`;
              } else {
                e.currentTarget.style.background = "var(--primary-subtle)";
                e.currentTarget.style.color = "var(--primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (active) return;
              e.currentTarget.style.borderColor = isTinted ? "var(--border-default)" : "transparent";
              e.currentTarget.style.color = inactiveColor;
              e.currentTarget.style.background = inactiveBg;
            }}
          >
            {opt.label}
            {clearable && (
              <span style={{
                marginLeft: 4,
                fontWeight: 400,
                display: "inline-block",
                width: "0.6em",
                visibility: active ? "visible" : "hidden",
              }}>×</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
