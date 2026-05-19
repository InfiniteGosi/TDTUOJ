/**
 * SortBar — unified sort field + direction selector.
 *
 * Props:
 *   field            — current sort field value (string)
 *   direction        — "asc" | "desc"
 *   onFieldChange    — (value: string) => void
 *   onDirectionChange— (value: string) => void
 *   fields           — [{ value: string, label: string }]
 *   label            — prefix label (default "Sort", set to null to hide)
 *   style            — passed to wrapper div
 */
export default function SortBar({
  field,
  direction,
  onFieldChange,
  onDirectionChange,
  fields = [],
  label = "Sort",
  style,
}) {
  const selectStyle = {
    padding: "5px 26px 5px 10px",
    background: "var(--bg-raised)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--text-sm)",
    fontFamily: "var(--font-body)",
    outline: "none",
    cursor: "pointer",
    appearance: "none",
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238896B0' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 8px center",
    transition: "border-color var(--transition-fast)",
    minHeight: "unset",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        ...style,
      }}
    >
      {label && (
        <span
          style={{
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      )}

      <select
        value={field}
        onChange={(e) => onFieldChange(e.target.value)}
        style={selectStyle}
        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = "var(--border-default)"; }}
      >
        {fields.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        value={direction}
        onChange={(e) => onDirectionChange(e.target.value)}
        style={{ ...selectStyle, minWidth: 86 }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = "var(--border-default)"; }}
      >
        <option value="asc">↑ Asc</option>
        <option value="desc">↓ Desc</option>
      </select>
    </div>
  );
}
