import { useEffect, useState } from "react";

function getSecondsLeft(endTime) {
  if (!endTime) return 0;
  return Math.max(0, Math.floor((new Date(endTime) - Date.now()) / 1000));
}

function formatTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export default function CountdownTimer({ endTime, onExpire, className = "" }) {
  const [secs, setSecs] = useState(() => getSecondsLeft(endTime));

  useEffect(() => {
    setSecs(getSecondsLeft(endTime));
    const id = setInterval(() => {
      setSecs((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [endTime, onExpire]);

  const isRed    = secs > 0 && secs <= 300;   // <5 min
  const isAmber  = secs > 300 && secs <= 1800; // <30 min

  const color = isRed
    ? "var(--red-wa)"
    : isAmber
    ? "var(--amber-tle)"
    : "var(--text-primary)";

  return (
    <span
      className={`countdown-timer ${className}`}
      style={{
        fontFamily: "var(--font-display)",
        fontSize: "var(--text-lg)",
        color,
        letterSpacing: "0.05em",
        transition: "color var(--transition-base)",
        animation: isRed ? "pulse 1s ease-in-out infinite" : "none",
      }}
      aria-live="polite"
      aria-label={`Time remaining: ${formatTime(secs)}`}
    >
      {secs === 0 ? "00:00:00" : formatTime(secs)}
    </span>
  );
}
