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
    <div
      style={{
        background: "linear-gradient(90deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)",
        color: "#c4b5fd",
        fontSize: "12px",
        fontWeight: 600,
        textAlign: "center",
        padding: "4px 0",
        letterSpacing: "0.5px",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        borderBottom: "1px solid rgba(139, 92, 246, 0.2)",
      }}
    >
      🇻🇳 {vnTime} (GMT+7)
    </div>
  );
};

export default GlobalClockBar;
