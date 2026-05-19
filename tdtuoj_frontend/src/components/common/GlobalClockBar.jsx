import { useState, useEffect } from "react";

const GlobalClockBar = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const vnTime = now.toLocaleString("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <div style={{
      background: "var(--bg-raised)",
      borderBottom: "1px solid var(--border-subtle)",
      padding: "3px 0",
      textAlign: "center",
      fontFamily: "var(--font-code)",
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)",
      letterSpacing: "var(--tracking-wide)",
    }}>
      🇻🇳 {vnTime} (GMT+7)
    </div>
  );
};

export default GlobalClockBar;
