import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  List,
  User,
  Send,
  Trophy,
  Building2,
  Tag,
  PieChart as PieChartIcon,
  TrendingUp,
  Activity,
  Award,
} from "lucide-react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Label,
} from "recharts";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";

// ── Chart colors (hex — CSS vars don't work as SVG fill) ──────────────────
const DIFFICULTY_COLORS = {
  EASY: "#22C55E",
  MEDIUM: "#F5A000",
  HARD: "#EF4444",
};

const VERDICT_CHART_COLORS = {
  AC: "#22C55E",
  WA: "#EF4444",
  TLE: "#F5A000",
  CE: "#60A5FA",
  MLE: "#A78BFA",
  RE: "#F472B6",
  SF: "#6B7A95",
  IE: "#EF4444",
};

const VERDICT_LABELS = {
  AC: "AC · Accepted",
  WA: "WA · Wrong Answer",
  TLE: "TLE · Time Limit Exceeded",
  MLE: "MLE · Memory Limit Exceeded",
  RE: "RE · Runtime Error",
  CE: "CE · Compile Error",
  SF: "SF · Segmentation Fault",
  IE: "IE · Judge Error",
};

// ── helpers ────────────────────────────────────────────────────────────────
const fmtDay = (period) => {
  // "2026-05-07" → "07 May"
  const d = new Date(period + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

const acRateHexOf = (rate) =>
  rate >= 60
    ? VERDICT_CHART_COLORS.AC
    : rate >= 30
      ? VERDICT_CHART_COLORS.TLE
      : VERDICT_CHART_COLORS.WA;

// ── Time-range selector ─────────────────────────────────────────────────────
const RANGES = [
  { key: "7D", days: 7 },
  { key: "30D", days: 30 },
  { key: "90D", days: 90 },
  { key: "180D", days: 180 },
  { key: "365D", days: 365 },
  { key: "All", days: null },
];

const sliceRange = (series, days) =>
  days == null || series.length <= days ? series : series.slice(-days);

const RangeToggle = ({ value, onChange }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {RANGES.map((r) => (
      <button
        key={r.key}
        type="button"
        onClick={() => onChange(r.key)}
        className={`range-btn${value === r.key ? " range-btn--active" : ""}`}
      >
        {r.key}
      </button>
    ))}
  </div>
);

// ── Shared tooltip for donuts ──────────────────────────────────────────────
const DonutTooltip = ({ active, payload, unit }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div
      style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        padding: "8px 12px",
        boxShadow: "var(--shadow-md)",
        fontSize: "var(--text-sm)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 2,
            background: d.payload.fill,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontWeight: 700,
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
          }}
        >
          {d.name}
        </span>
      </div>
      <div style={{ color: "var(--text-secondary)" }}>
        {d.value} {unit} · {Math.round(d.payload.pct * 100)}%
      </div>
    </div>
  );
};

// ── Tooltip for time-series charts ─────────────────────────────────────────
const SeriesTooltip = ({ active, payload, label, valueLabel }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div
      style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        padding: "10px 14px",
        boxShadow: "var(--shadow-md)",
        minWidth: 140,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-code)",
          fontSize: "var(--text-xs)",
          fontWeight: 700,
          color: "var(--primary)",
          letterSpacing: "0.06em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
        >
          {valueLabel}
        </span>
        <span
          className="font-display"
          style={{
            fontSize: "1.1rem",
            fontWeight: 800,
            color: "var(--primary)",
          }}
        >
          {payload[0].value}
        </span>
      </div>
      {d.count !== undefined &&
        d.cumulative !== undefined &&
        d.cumulative !== null && (
          <div
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 700,
              marginTop: 4,
              color: d.count > 0 ? "var(--green-ac)" : "var(--text-muted)",
            }}
          >
            +{d.count} new
          </div>
        )}
    </div>
  );
};

// ── StatTile (mirrors ProfilePage stat tiles) ──────────────────────────────
const StatTile = ({ icon: Icon, iconColor, label, value }) => (
  <div
    className="card"
    style={{ flex: "1 1 150px", minWidth: "140px", padding: "16px" }}
  >
    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
      <div
        style={{
          padding: "8px",
          borderRadius: "var(--radius-md)",
          background: iconColor + "22",
          color: iconColor,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={18} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <span className="text-xs text-muted" style={{ fontWeight: 500 }}>
          {label}
        </span>
        <span
          className="font-display"
          style={{
            fontSize: "var(--text-2xl)",
            fontWeight: 800,
            color: "var(--text-primary)",
            lineHeight: 1.1,
          }}
        >
          {value ?? "—"}
        </span>
      </div>
    </div>
  </div>
);

// ── Section card + header (mirrors ProfilePage sections) ───────────────────
const SectionHeader = ({ icon: Icon, label, right }) => (
  <div
    className="flex items-center justify-between"
    style={{ marginBottom: "16px" }}
  >
    <div className="flex items-center gap-2">
      {Icon && <Icon size={14} style={{ color: "var(--cyan)" }} />}
      <span
        style={{
          fontFamily: "var(--font-code)",
          fontSize: "var(--text-xs)",
          fontWeight: 700,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        {label}
      </span>
    </div>
    {right}
  </div>
);

// ── Donut chart (mirrors LanguageDonutChart / contest monitor DonutChart) ──
const BreakdownDonut = ({
  data,
  total,
  centerValue,
  centerLabel,
  centerColor,
  unit,
  legendLabels,
}) => {
  if (!data.length || total === 0) {
    return (
      <div
        style={{
          height: 210,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}
        >
          No data yet
        </span>
      </div>
    );
  }
  return (
    <div>
      <div style={{ width: "100%", height: 210 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={56}
              outerRadius={88}
              cornerRadius={6}
              paddingAngle={3}
              startAngle={90}
              endAngle={-270}
              animationBegin={0}
              animationDuration={700}
              animationEasing="ease-out"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
              <Label
                content={({ viewBox }) => {
                  const { cx, cy } = viewBox;
                  return (
                    <g>
                      <text
                        x={cx}
                        y={cy - 5}
                        textAnchor="middle"
                        fontSize={22}
                        fontWeight={900}
                        fill={centerColor || "var(--text-primary)"}
                        fontFamily="var(--font-display)"
                      >
                        {centerValue}
                      </text>
                      <text
                        x={cx}
                        y={cy + 14}
                        textAnchor="middle"
                        fontSize={10}
                        fill="var(--text-muted)"
                        fontFamily="var(--font-body)"
                      >
                        {centerLabel}
                      </text>
                    </g>
                  );
                }}
              />
            </Pie>
            <Tooltip content={<DonutTooltip unit={unit} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Compact legend grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px 20px",
          padding: "4px 8px 8px",
        }}
      >
        {data.map((d) => (
          <div
            key={d.name}
            style={{ display: "flex", alignItems: "center", gap: 7 }}
          >
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: 2,
                background: d.fill,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                color: "var(--text-secondary)",
                flex: 1,
              }}
            >
              {legendLabels?.[d.name] || d.name}
            </span>
            <span
              style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
            >
              {Math.round(d.pct * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Time-series chart (mirrors ProfilePage RatingChart) ────────────────────
const TimeSeriesChart = ({ data, dataKey, gradientId, valueLabel }) => {
  if (!data.length) {
    return (
      <div
        style={{
          height: 220,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}
        >
          No data yet
        </span>
      </div>
    );
  }
  const values = data.map((d) => d[dataKey]);
  const maxY = Math.max(...values, 1);
  // Keep ~8 X-axis labels regardless of how many points the range holds.
  const tickInterval = Math.max(0, Math.floor(data.length / 8));

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
              <stop
                offset="100%"
                stopColor="var(--primary)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="4 4"
            stroke="var(--border-subtle)"
            horizontal={true}
            vertical={false}
          />

          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: "var(--text-xs)",
              fill: "var(--text-muted)",
              fontFamily: "var(--font-body)",
            }}
            tickMargin={8}
            interval={tickInterval ?? "preserveStartEnd"}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: "var(--text-xs)",
              fill: "var(--text-muted)",
              fontFamily: "var(--font-body)",
            }}
            tickMargin={8}
            domain={[0, Math.ceil(maxY * 1.15)]}
            allowDecimals={false}
            width={40}
          />

          <Tooltip
            content={<SeriesTooltip valueLabel={valueLabel} />}
            cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
          />

          <Area
            type="linear"
            dataKey={dataKey}
            stroke="none"
            fill={`url(#${gradientId})`}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          />

          <Line
            type="linear"
            dataKey={dataKey}
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 5,
              fill: "var(--bg-raised)",
              stroke: "var(--primary)",
              strokeWidth: 2,
            }}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Tag bars ────────────────────────────────────────────────────────────────
const TagBars = ({ tags }) => {
  if (!tags.length) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center" }}>
        <span
          style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}
        >
          No tagged problems yet
        </span>
      </div>
    );
  }
  const max = Math.max(...tags.map((t) => t.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {tags.map((t) => (
        <div
          key={t.name}
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <span
            style={{
              width: 110,
              flexShrink: 0,
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              color: "var(--text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={t.name}
          >
            {t.name}
          </span>
          <div
            style={{
              flex: 1,
              height: 8,
              background: "var(--bg-overlay)",
              borderRadius: "var(--radius-pill)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.max((t.value / max) * 100, 2)}%`,
                height: "100%",
                background: "var(--primary)",
                borderRadius: "var(--radius-pill)",
                transition: "width 0.6s ease-out",
              }}
            />
          </div>
          <span
            style={{
              width: 32,
              flexShrink: 0,
              textAlign: "right",
              fontSize: "var(--text-sm)",
              fontWeight: 700,
              color: "var(--text-primary)",
              fontFamily: "var(--font-code)",
            }}
          >
            {t.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Top solvers table ───────────────────────────────────────────────────────
const RANK_COLORS = ["#F5A000", "#94A3B8", "#B45309"]; // gold / silver / bronze

const TopSolversTable = ({ solvers }) => {
  if (!solvers.length) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center" }}>
        <span
          style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}
        >
          No solvers yet
        </span>
      </div>
    );
  }
  const thStyle = {}; // header styling now comes from .admin-table
  return (
    <table className="table admin-table">
      <thead>
        <tr>
          <th style={{ ...thStyle, textAlign: "center", width: "10%" }}>#</th>
          <th style={{ ...thStyle, width: "44%" }}>User</th>
          <th style={{ ...thStyle, textAlign: "center", width: "16%" }}>
            Solved
          </th>
          <th style={{ ...thStyle, textAlign: "center", width: "15%" }}>
            AC Rate
          </th>
          <th style={{ ...thStyle, textAlign: "center", width: "15%" }}>
            Rating
          </th>
        </tr>
      </thead>
      <tbody>
        {solvers.map((s, i) => (
          <tr key={s.userId}>
            <td style={{ textAlign: "center" }}>
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: 800,
                  fontFamily: "var(--font-display)",
                  color: i < 3 ? RANK_COLORS[i] : "var(--text-muted)",
                }}
              >
                {i + 1}
              </span>
            </td>
            <td>
              <Link
                to={`/users/${s.username}`}
                style={{ textDecoration: "none" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: "var(--primary-subtle)",
                      color: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "var(--text-sm)",
                      fontWeight: 800,
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {s.profileUrl ? (
                      <img
                        src={s.profileUrl}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      (s.name || s.username || "?").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "var(--text-sm)",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {s.username}
                    </div>
                    {s.name && (
                      <div
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--text-muted)",
                          marginTop: 1,
                        }}
                      >
                        {s.name}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </td>
            <td style={{ textAlign: "center" }}>
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: 700,
                  color: "var(--green-ac)",
                  fontFamily: "var(--font-code)",
                }}
              >
                {s.problemsSolved ?? 0}
              </span>
            </td>
            <td style={{ textAlign: "center" }}>
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-code)",
                }}
              >
                {Math.round(s.acceptanceRate ?? 0)}%
              </span>
            </td>
            <td style={{ textAlign: "center" }}>
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: 700,
                  color: "var(--primary)",
                  fontFamily: "var(--font-code)",
                }}
              >
                {s.currentRating ?? 0}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────
const AdminDashboardPage = () => {
  const { showMessage } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usersRange, setUsersRange] = useState("All");
  const [subsRange, setSubsRange] = useState("90D");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await ApiService.getAdminDashboardStats();
        if (response.statusCode === 200) setStats(response.data);
      } catch (error) {
        showMessage(error.response?.data?.message || error.message, "error");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-base)",
          padding: "32px 0",
        }}
      >
        <div className="page-container">
          <div
            className="flex flex-col items-center gap-4"
            style={{ padding: "80px 0" }}
          >
            <div className="spinner" />
            <span className="text-muted">Loading dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-base)",
          padding: "32px 0",
        }}
      >
        <div className="page-container">
          <div
            style={{
              padding: "80px 0",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            Failed to load dashboard statistics.
          </div>
        </div>
      </div>
    );
  }

  const totals = stats.totals ?? {};

  // Difficulty donut data
  const difficultyData = (stats.problemsByDifficulty ?? [])
    .filter((d) => d.value > 0)
    .map((d) => ({
      name: d.name,
      value: d.value,
      pct: totals.problems ? d.value / totals.problems : 0,
      fill: DIFFICULTY_COLORS[d.name] || "#6B7A95",
    }));

  // Verdict donut data
  const verdictTotal = (stats.verdictDistribution ?? []).reduce(
    (s, v) => s + v.value,
    0,
  );
  const verdictData = (stats.verdictDistribution ?? [])
    .filter((v) => v.value > 0)
    .map((v) => ({
      name: v.name,
      value: v.value,
      pct: verdictTotal ? v.value / verdictTotal : 0,
      fill: VERDICT_CHART_COLORS[v.name] || "#6B7A95",
    }));
  const acCount =
    (stats.verdictDistribution ?? []).find((v) => v.name === "AC")?.value ?? 0;
  const acRate = verdictTotal ? Math.round((acCount / verdictTotal) * 100) : 0;

  // Time-series data (full daily series — sliced by the active range below)
  const usersDaily = (stats.usersOverTime ?? []).map((p) => ({
    name: fmtDay(p.period),
    cumulative: p.cumulative ?? 0,
    count: p.count,
  }));
  const submissionsDaily = (stats.submissionsOverTime ?? []).map((p) => ({
    name: fmtDay(p.period),
    count: p.count,
  }));
  const usersSeries = sliceRange(
    usersDaily,
    RANGES.find((r) => r.key === usersRange).days,
  );
  const submissionsSeries = sliceRange(
    submissionsDaily,
    RANGES.find((r) => r.key === subsRange).days,
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        padding: "32px 0",
      }}
    >
      <div className="page-container">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                Analytics Dashboard
              </h2>
              <span
                style={{
                  display: "inline-block",
                  padding: "3px 12px",
                  borderRadius: 9999,
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  background: "var(--primary-subtle)",
                  color: "var(--primary)",
                }}
              >
                platform-wide
              </span>
            </div>
          </div>

          {/* Stat tiles */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <StatTile
              icon={List}
              iconColor="#4f46e5"
              label="Problems"
              value={totals.problems}
            />
            <StatTile
              icon={User}
              iconColor="#06b6d4"
              label="Users"
              value={totals.users}
            />
            <StatTile
              icon={Send}
              iconColor="#10b981"
              label="Submissions"
              value={totals.submissions}
            />
            <StatTile
              icon={Trophy}
              iconColor="#f59e0b"
              label="Contests"
              value={totals.contests}
            />
            <StatTile
              icon={Building2}
              iconColor="#9333ea"
              label="Organizations"
              value={totals.organizations}
            />
          </div>

          {/* Donuts row */}
          <div className="dashboard-grid-2">
            <div className="card" style={{ padding: 20 }}>
              <SectionHeader
                icon={PieChartIcon}
                label="Problems by Difficulty"
              />
              <BreakdownDonut
                data={difficultyData}
                total={totals.problems}
                centerValue={totals.problems}
                centerLabel="problems"
                unit="problems"
                legendLabels={{ EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" }}
              />
            </div>
            <div className="card" style={{ padding: 20 }}>
              <SectionHeader icon={Activity} label="Verdict Distribution" />
              <BreakdownDonut
                data={verdictData}
                total={verdictTotal}
                centerValue={`${acRate}%`}
                centerLabel="AC rate"
                centerColor={acRateHexOf(acRate)}
                unit="submissions"
                legendLabels={VERDICT_LABELS}
              />
            </div>
          </div>

          {/* Time series row */}
          <div className="dashboard-grid-2">
            <div className="card" style={{ padding: 20 }}>
              <SectionHeader
                icon={TrendingUp}
                label="Users Over Time"
                right={
                  <RangeToggle value={usersRange} onChange={setUsersRange} />
                }
              />
              <TimeSeriesChart
                data={usersSeries}
                dataKey="cumulative"
                gradientId="usersAreaGrad"
                valueLabel="Total users"
              />
            </div>
            <div className="card" style={{ padding: 20 }}>
              <SectionHeader
                icon={Activity}
                label="Submissions Over Time"
                right={
                  <RangeToggle value={subsRange} onChange={setSubsRange} />
                }
              />
              <TimeSeriesChart
                data={submissionsSeries}
                dataKey="count"
                gradientId="subsAreaGrad"
                valueLabel="Submissions"
              />
            </div>
          </div>

          {/* Tags + top solvers row */}
          <div className="dashboard-grid-2">
            <div className="card" style={{ padding: 20 }}>
              <SectionHeader
                icon={Tag}
                label="Problems by Tag"
                right={
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-muted)",
                    }}
                  >
                    top 10
                  </span>
                }
              />
              <TagBars tags={stats.problemsByTag ?? []} />
            </div>
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "20px 20px 0" }}>
                <SectionHeader icon={Award} label="Top Solvers" />
              </div>
              <TopSolversTable solvers={stats.topSolvers ?? []} />
            </div>
          </div>
        </div>
      </div>

      {/* responsive 2-col grid */}
      <style>{`
        .dashboard-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 900px) {
          .dashboard-grid-2 { grid-template-columns: 1fr; }
        }
        .range-btn {
          padding: 3px 9px;
          font-size: var(--text-xs);
          font-weight: 700;
          font-family: var(--font-code);
          letter-spacing: 0.02em;
          color: var(--text-muted);
          background: var(--bg-overlay);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .range-btn:hover {
          color: var(--text-secondary);
          border-color: var(--border-default);
        }
        .range-btn--active {
          color: #fff;
          background: var(--primary);
          border-color: var(--primary);
        }
      `}</style>
    </div>
  );
};

export default AdminDashboardPage;
