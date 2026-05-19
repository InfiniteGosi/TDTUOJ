// TDTU brand colors — hardcoded, never change with theme
const BLUE = "#0F67B1";
const RED  = "#C8281E";

export default function TDTULogo({ size = 28, showText = true }) {
  const markW = Math.round(size * (20 / 28));

  return (
    <div style={{ display: "flex", alignItems: "center", gap: Math.round(size * 0.3) }}>
      {/* Icon mark — T with Đ crossbar, inspired by TĐT letterform */}
      <svg
        width={markW}
        height={size}
        viewBox="0 0 20 28"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        {/* Blue badge background */}
        <rect x="0" y="0" width="20" height="28" rx="3" fill={BLUE} />

        {/* T crossbar — white */}
        <rect x="2" y="5" width="16" height="4.5" rx="1" fill="white" />
        {/* T vertical — white */}
        <rect x="8" y="5" width="4" height="18" rx="1" fill="white" />

        {/* Red horizontal bar crossing the T — references the Đ stroke */}
        <rect x="2" y="13.5" width="16" height="3" rx="1" fill={RED} />
      </svg>

      {showText && (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: Math.round(size * 0.75),
            fontWeight: 700,
            letterSpacing: "0.04em",
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          <span style={{ color: BLUE }}>TDTU</span>
          <span style={{ color: RED, fontWeight: 800 }}>OJ</span>
        </span>
      )}
    </div>
  );
}
