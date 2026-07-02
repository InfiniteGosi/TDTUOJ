import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";

// "Big-O Complexity Chart" look: all reference curves drawn faintly, the submission's
// detected complexity class highlighted on top. A large math-style label names it.

const N = 20;     // elements along the x-axis
const YMAX = 50;  // cap so steep curves clip near-vertical at the left (reference look)

const factorial = (n) => {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
};

const CURVES = {
  "O(1)": () => 1,
  "O(log n)": (n) => Math.log2(n + 1),
  "O(n)": (n) => n,
  "O(n log n)": (n) => n * Math.log2(n + 1),
  "O(n^2)": (n) => n * n,
  "O(n^3)": (n) => n * n * n,
  "O(2^n)": (n) => Math.pow(2, n),
  "O(n!)": (n) => factorial(n),
};

const ORDER = Object.keys(CURVES);

const DATA = Array.from({ length: N }, (_, i) => {
  const n = i + 1;
  const row = { n };
  for (const key of ORDER) row[key] = Math.min(CURVES[key](n), YMAX);
  return row;
});

// "O(n^2)" → "O(N²)", "O(log n)" → "O(log N)" for a tidy math-style label.
const prettyLabel = (cc) => {
  if (!cc) return "";
  return cc
    .replace(/\^2/g, "²")
    .replace(/\^3/g, "³")
    .replace(/\^n/g, "ᴺ")
    .replace(/n/g, "N");
};

const BigOChart = ({ complexityClass }) => {
  const highlight = ORDER.includes(complexityClass) ? complexityClass : null;
  // Draw faint curves first, the highlighted one last so it sits on top.
  const drawOrder = highlight ? [...ORDER.filter((k) => k !== highlight), highlight] : ORDER;

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "var(--text-sm)",
          color: "var(--text-primary)",
          marginBottom: 4,
        }}
      >
        Time Complexity
      </div>
      <div
        style={{
          textAlign: "center",
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontStyle: "italic",
          fontSize: 26,
          color: "var(--primary)",
          margin: "2px 0 4px",
        }}
      >
        {prettyLabel(complexityClass)}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={DATA} margin={{ top: 10, right: 16, bottom: 10, left: 10 }}>
          <XAxis dataKey="n" tick={false} axisLine={{ stroke: "var(--border-strong, #888)" }} tickLine={false} height={1} />
          <YAxis tick={false} domain={[0, YMAX]} axisLine={{ stroke: "var(--border-strong, #888)" }} tickLine={false} width={1} />
          {drawOrder.map((key) => {
            const isHi = key === highlight;
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={isHi ? "var(--primary)" : "var(--text-muted)"}
                strokeWidth={isHi ? 3 : 1}
                strokeOpacity={isHi ? 1 : 0.25}
                dot={false}
                isAnimationActive={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BigOChart;
