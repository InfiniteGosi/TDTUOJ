import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Trophy,
  Star,
  Mail,
  User,
  Award,
  CheckCircle,
  Target,
  TrendingUp,
  Zap,
  Code2,
  Activity,
  X,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Label,
} from "recharts";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (u) => (u ? u.substring(0, 2).toUpperCase() : "U");

const getRoleStyle = (name) => {
  switch (name) {
    case "ADMIN":
      return { bg: "rgba(239,68,68,0.12)", color: "#ef4444", border: "rgba(239,68,68,0.3)" };
    case "CREATOR":
      return { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "rgba(245,158,11,0.3)" };
    default:
      return { bg: "var(--primary-subtle)", color: "var(--primary)", border: "var(--border-accent)" };
  }
};

// ─── Heatmap helpers ──────────────────────────────────────────────────────────

const HEAT_COLORS = [
  "var(--bg-overlay)",
  "rgba(245,160,0,0.20)",
  "rgba(245,160,0,0.42)",
  "rgba(245,160,0,0.68)",
  "var(--primary)",
];

const buildHeatmapData = (activity) => {
  const map = {};
  (activity || []).forEach((a) => {
    map[a.activityDate] = a.submissionsCount;
  });
  const cells = [];
  const today = new Date();
  for (let week = 51; week >= 0; week--) {
    for (let day = 0; day < 7; day++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (week * 7 + (6 - day)));
      const key = d.toISOString().split("T")[0];
      const count = map[key] || 0;
      cells.push({
        date: key,
        count,
        level: count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 8 ? 3 : 4,
      });
    }
  }
  return cells;
};

const fmtDate = (dateStr) =>
  new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// ─── Language Donut Chart (Recharts) ─────────────────────────────────────────

const LANG_COLORS = {
  CPP:    "#4f46e5",
  C:      "#06b6d4",
  JAVA:   "#f59e0b",
  PYTHON: "#10b981",
};
const LANG_LABELS = { CPP: "C++", C: "C", JAVA: "Java", PYTHON: "Python" };

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background: "var(--bg-raised)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-md)",
      padding: "8px 12px",
      boxShadow: "var(--shadow-md)",
      fontSize: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div style={{ width: 10, height: 10, borderRadius: 2, background: d.payload.fill, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
          {LANG_LABELS[d.name] || d.name}
        </span>
      </div>
      <div style={{ color: "var(--text-secondary)" }}>
        {d.value} submissions · {Math.round(d.payload.pct * 100)}%
      </div>
    </div>
  );
};

const LanguageDonutChart = ({ langStats }) => {
  const entries = Object.entries(langStats).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + Number(v), 0);
  if (total === 0) return null;

  const data = entries.map(([lang, count]) => ({
    name: lang,
    value: Number(count),
    pct: Number(count) / total,
    fill: LANG_COLORS[lang] || "#6b7280",
  }));

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
                      <text x={cx} y={cy - 5} textAnchor="middle" fontSize={22} fontWeight={900}
                        fill="var(--text-primary)" fontFamily="var(--font-display)">
                        {total}
                      </text>
                      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10}
                        fill="var(--text-muted)" fontFamily="var(--font-body)">
                        AC subs
                      </text>
                    </g>
                  );
                }}
              />
            </Pie>
            <Tooltip content={<PieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Compact legend grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "6px 20px",
        padding: "4px 8px 8px",
      }}>
        {data.map((d) => (
          <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 9, height: 9, borderRadius: 2, background: d.fill, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", flex: 1 }}>
              {LANG_LABELS[d.name] || d.name}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {Math.round(d.pct * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── StatTile ─────────────────────────────────────────────────────────────────

const StatTile = ({ icon: Icon, iconColor, label, value, sub }) => (
  <div
    className="card"
    style={{ flex: "1 1 130px", minWidth: "120px", padding: "16px" }}
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
        {sub && (
          <span className="text-xs text-muted">{sub}</span>
        )}
      </div>
    </div>
  </div>
);

// ─── RatingChart (Recharts) ───────────────────────────────────────────────────

const RatingTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{
      background: "var(--bg-raised)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-md)",
      padding: "10px 14px",
      boxShadow: "var(--shadow-md)",
      minWidth: 160,
    }}>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontFamily: "var(--font-code)", fontSize: 10, fontWeight: 700, color: "var(--primary)", letterSpacing: "0.06em" }}>
          {d.name}
        </div>
        {d.contest && (
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
            {d.contest.length > 24 ? d.contest.slice(0, 24) + "…" : d.contest}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Rating</span>
        <span className="font-display" style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--primary)" }}>
          {d.rating}
        </span>
      </div>
      {d.change !== undefined && (
        <div style={{
          fontSize: 12, fontWeight: 700, marginTop: 4,
          color: d.change >= 0 ? "var(--green-ac)" : "var(--red-wa)",
        }}>
          {d.change >= 0 ? "+" : ""}{d.change}
          {d.rank && (
            <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)", marginLeft: 6 }}>
              Rank #{d.rank}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const RatingChart = ({ data }) => {
  const points = [...data].sort((a, b) => {
    const ta = new Date(a.contestEndTime ?? a.createdAt).getTime();
    const tb = new Date(b.contestEndTime ?? b.createdAt).getTime();
    return ta - tb;
  });
  if (points.length === 0) return null;

  const fmtAxis = (dt) => {
    if (!dt) return "";
    const d = new Date(dt);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
  };

  // Render rating as a running fold of ratingChange so the line is always
  // self-consistent even if a stored newRating row ever drifts. Seed from the
  // first row's oldRating (or 1500 if missing).
  let running = points[0]?.oldRating ?? 1500;
  if (import.meta.env.DEV) {
    for (let i = 1; i < points.length; i++) {
      if (points[i].oldRating !== points[i - 1].newRating) {
        console.warn(
          `[RatingChart] chain drift at index ${i}: oldRating=${points[i].oldRating} prev.newRating=${points[i - 1].newRating}`
        );
      }
    }
  }
  const chartData = points.map((p) => {
    const delta = typeof p.ratingChange === "number" ? p.ratingChange : 0;
    running = Math.max(1, running + delta);
    return {
      name: fmtAxis(p.contestEndTime ?? p.createdAt) || p.contestName,
      rating: running,
      change: delta,
      rank: p.rank,
      contest: p.contestName,
    };
  });

  const allRatings = chartData.map((d) => d.rating);
  const minY = Math.min(...allRatings) - 40;
  const maxY = Math.max(...allRatings) + 40;

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="ratingAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
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
            tick={{ fontSize: 10, fill: "var(--text-muted)", fontFamily: "var(--font-body)" }}
            tickMargin={8}
            interval={0}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "var(--text-muted)", fontFamily: "var(--font-body)" }}
            tickMargin={8}
            domain={[minY, maxY]}
            width={40}
          />

          <Tooltip
            content={<RatingTooltip />}
            cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
          />

          <Area
            type="linear"
            dataKey="rating"
            stroke="none"
            fill="url(#ratingAreaGrad)"
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          />

          <Line
            type="linear"
            dataKey="rating"
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

// ─── Section card wrapper ─────────────────────────────────────────────────────

const SectionCard = ({ children, style: extra }) => (
  <div className="card" style={{ ...extra }}>
    {children}
  </div>
);

const SectionHeader = ({ icon: Icon, label, right }) => (
  <div
    className="flex items-center justify-between"
    style={{ marginBottom: "16px" }}
  >
    <div className="flex items-center gap-2">
      {Icon && <Icon size={14} style={{ color: "var(--cyan)" }} />}
      <span
        className="font-code text-xs uppercase tracking-wider"
        style={{ color: "var(--text-muted)", fontWeight: 700 }}
      >
        {label}
      </span>
    </div>
    {right && (
      <span className="text-xs text-muted">{right}</span>
    )}
  </div>
);

// ─── ProfilePage ──────────────────────────────────────────────────────────────

const ProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { showMessage } = useToast();

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [ratingHistory, setRatingHistory] = useState([]);
  const [langStats, setLangStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const [ownSubmissions, setOwnSubmissions] = useState([]);
  const [ownOrgs, setOwnOrgs] = useState([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("contests");
  const [codeModal, setCodeModal] = useState(null);
  const [problemMap, setProblemMap] = useState({});     // { [problemId]: { title, slug } }
  const LANG_MAP = { PYTHON: "python", JAVA: "java", C: "c", CPP: "cpp" };

  // Self-consistent rating chain: running fold over ratingChange in
  // chronological order. Used by the Contests table so the displayed Rating
  // column always equals (prior rating + Change), even if a stored newRating
  // row drifts. Keyed by row id.
  const ratingChain = useMemo(() => {
    const asc = [...ratingHistory].sort((a, b) => {
      const ta = new Date(a.contestEndTime ?? a.createdAt).getTime();
      const tb = new Date(b.contestEndTime ?? b.createdAt).getTime();
      return ta - tb;
    });
    let r = asc[0]?.oldRating ?? 1500;
    const map = new Map();
    for (const row of asc) {
      const d = typeof row.ratingChange === "number" ? row.ratingChange : 0;
      r = Math.max(1, r + d);
      map.set(row.id, r);
    }
    return map;
  }, [ratingHistory]);

  const openCode = async (s) => {
    setCodeModal({ submission: s, code: s.sourceCode || null, loading: !s.sourceCode });
    if (!s.sourceCode) {
      try {
        const r = await ApiService.getSubmissionStatus(s.id);
        if (r.statusCode === 200) setCodeModal({ submission: r.data, code: r.data.sourceCode, loading: false });
      } catch {
        setCodeModal((prev) => prev ? { ...prev, loading: false, error: true } : null);
      }
    }
  };

  useEffect(() => {
    if (!username) return;
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [userRes, statsRes, activityRes, ratingRes, langRes] =
          await Promise.all([
            ApiService.getUserByUsername(username),
            ApiService.getUserStatistics(username),
            ApiService.getUserActivity(username),
            ApiService.getRatingHistory(username).catch(() => ({
              statusCode: 200,
              data: [],
            })),
            ApiService.getUserLanguageStats(username).catch(() => ({
              statusCode: 200,
              data: {},
            })),
          ]);
        if (userRes.statusCode === 200) setUser(userRes.data);
        if (statsRes.statusCode === 200) setStats(statsRes.data);
        if (activityRes.statusCode === 200) setActivity(activityRes.data);
        if (ratingRes.statusCode === 200) setRatingHistory(ratingRes.data || []);
        if (langRes.statusCode === 200) setLangStats(langRes.data || {});

        // check own profile
        if (ApiService.isAuthenticated()) {
          try {
            const meRes = await ApiService.getOwnProfile();
            if (meRes.statusCode === 200 && meRes.data.username === username) setIsOwnProfile(true);
          } catch { /* non-critical */ }
        }

        // fetch public submissions + orgs for any user
        try {
          const [subsRes, orgsRes] = await Promise.all([
            ApiService.getUserSubmissions(username, { limit: 20, offset: 0 }).catch(() => null),
            ApiService.getUserOrganizations(username, { page: 0, size: 12 }).catch(() => null),
          ]);
          const subs = subsRes?.statusCode === 200 ? (subsRes.data?.content || []) : [];
          if (subs.length > 0) {
            setOwnSubmissions(subs);
            const uniqueIds = [...new Set(subs.map((s) => s.problemId).filter(Boolean))];
            const results = await Promise.allSettled(uniqueIds.map((id) => ApiService.getProblemById(id)));
            const map = {};
            results.forEach((r, i) => {
              if (r.status === "fulfilled") {
                const dto = r.value?.data ?? r.value;
                if (dto?.title) map[uniqueIds[i]] = { title: dto.title, slug: dto.slug };
              }
            });
            setProblemMap(map);
          }
          if (orgsRes?.statusCode === 200) setOwnOrgs(orgsRes.data?.content || []);
        } catch { /* non-critical */ }
      } catch (err) {
        showMessage(err.response?.data?.message || err.message, "error");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [username]);

  if (loading) {
    return (
      <div
        className="page-container flex flex-col items-center justify-center"
        style={{ minHeight: "60vh" }}
      >
        <div className="spinner spinner-lg" />
        <p className="text-muted text-sm" style={{ marginTop: "16px" }}>
          Loading profile…
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="page-container flex flex-col items-center justify-center gap-4"
        style={{ minHeight: "60vh" }}
      >
        <p className="text-secondary text-2xl">User not found</p>
        <button className="btn btn-primary" onClick={() => navigate("/users")}>
          Back to Users
        </button>
      </div>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────────
  const solved = stats?.problemsSolved ?? 0;
  const total = stats?.totalSubmissions ?? 0;
  const accepted = stats?.acceptedSubmissions ?? 0;
  const accRate = stats?.acceptanceRate ?? 0;
  const totalPts = stats?.totalPoints ?? user.point ?? 0;
  const rating = stats?.currentRating ?? user.rating ?? 0;
  const maxRating = stats?.maxRating ?? 0;
  const heatmap = buildHeatmapData(activity);
  const totalActivitySubmissions = heatmap.reduce((s, d) => s + d.count, 0);
  const activeDays = activity.filter((a) => a.submissionsCount > 0).length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="page-container">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "clamp(260px, 25%, 300px) 1fr",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Identity card */}
          <div className="card">
            <div>
              <div style={{ marginBottom: "12px" }}>
                {user.profileUrl ? (
                  <img
                    src={user.profileUrl}
                    alt={user.username}
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "4px solid var(--bg-void)",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.45)",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    className="font-display"
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      background: "var(--bg-overlay)",
                      border: "4px solid var(--bg-void)",
                      boxShadow: "var(--glow-primary)",
                      color: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                      fontWeight: 800,
                    }}
                  >
                    {getInitials(user.username)}
                  </div>
                )}
              </div>

              <p
                className="font-display text-lg"
                style={{
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  margin: "0 0 2px",
                }}
              >
                {user.username}
              </p>
              {user.name && (
                <p className="text-sm text-muted" style={{ margin: "0 0 12px" }}>
                  {user.name}
                </p>
              )}

              {/* Role + status badges */}
              <div className="flex flex-wrap gap-1" style={{ marginBottom: "12px" }}>
                {(user.roles || []).map((role) => {
                  const s = getRoleStyle(role.name);
                  return (
                    <span
                      key={role.id}
                      className="font-code text-xs uppercase tracking-wider"
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-pill)",
                        background: s.bg,
                        color: s.color,
                        border: `1px solid ${s.border}`,
                        fontWeight: 700,
                      }}
                    >
                      {role.name}
                    </span>
                  );
                })}
                <span
                  className="font-code text-xs uppercase tracking-wider"
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-pill)",
                    background: user.isActive
                      ? "rgba(16,185,129,0.12)"
                      : "rgba(239,68,68,0.12)",
                    color: user.isActive ? "var(--green-ac)" : "var(--red-wa)",
                    border: `1px solid ${user.isActive ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                    fontWeight: 700,
                  }}
                >
                  {user.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Meta */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div className="flex items-center gap-2 text-muted">
                  <Mail size={12} />
                  <span className="text-xs" style={{ wordBreak: "break-all" }}>
                    {user.email}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted">
                  <User size={12} />
                  <span className="text-xs">User #{user.id}</span>
                </div>
              </div>

              {user.about && (
                <div
                  style={{
                    marginTop: "16px",
                    paddingTop: "16px",
                    borderTop: "1px solid var(--border-subtle)",
                  }}
                >
                  <p className="text-sm text-secondary" style={{ lineHeight: 1.6, margin: 0 }}>
                    {user.about}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Compact stats — Rating · Points · Solved */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {[
              {
                icon: Star,
                label: "Rating",
                value: rating,
                sub: maxRating > 0 ? `Peak ${maxRating}` : null,
                extra: ratingHistory.length > 0 ? (() => {
                  const ch = ratingHistory[0].ratingChange;
                  return (
                    <span style={{ fontSize: 11, fontWeight: 700, color: ch >= 0 ? "var(--green-ac)" : "var(--red-wa)" }}>
                      {ch >= 0 ? "+" : ""}{ch} last
                    </span>
                  );
                })() : null,
                accent: "var(--primary)",
              },
              {
                icon: Trophy,
                label: "Total Points",
                value: totalPts,
                sub: `${solved} solved`,
                accent: "var(--green-ac)",
              },
              {
                icon: Target,
                label: "Acceptance",
                value: `${accRate}%`,
                sub: `${accepted} / ${total} AC`,
                accent: "var(--blue-ce)",
              },
            ].map(({ icon: Icon, label, value, sub, extra, accent }, i, arr) => (
              <div
                key={label}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 16px",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--border-subtle)" : "none",
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: "var(--radius-md)",
                  background: accent + "18",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Icon size={16} color={accent} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
                    {label}
                  </div>
                  <div className="font-display" style={{ fontSize: "1.35rem", fontWeight: 900, color: accent, lineHeight: 1 }}>
                    {value}
                  </div>
                  {sub && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
                  {extra && <div style={{ marginTop: 3 }}>{extra}</div>}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* ── RIGHT MAIN ───────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Rating Chart — shown first */}
          {ratingHistory.length > 0 && (
            <SectionCard>
              <SectionHeader icon={TrendingUp} label="Rating History" />
              <RatingChart data={ratingHistory} />
            </SectionCard>
          )}

          {/* Pie + stat tiles row */}
          <SectionCard>
            <div style={{ display: "flex", gap: 20, alignItems: "stretch" }}>
              {/* Language pie — left */}
              {Object.keys(langStats).length > 0 && (
                <div style={{
                  width: 240, flexShrink: 0,
                  borderRight: "1px solid var(--border-subtle)",
                  paddingRight: 20,
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: "var(--primary)",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    marginBottom: 4,
                    fontFamily: "var(--font-code)",
                  }}>
                    Languages
                  </div>
                  <LanguageDonutChart langStats={langStats} />
                </div>
              )}

              {/* 2×2 stat grid — right */}
              <div style={{
                flex: 1,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                alignContent: "center",
              }}>
                <StatTile icon={CheckCircle} iconColor="var(--green-ac)"  label="Problems Solved"    value={solved} />
                <StatTile icon={Code2}       iconColor="var(--primary)"   label="Total Submissions"  value={total}      sub={`${accepted} accepted`} />
                <StatTile icon={Award}       iconColor="var(--amber-tle)" label="Total Points"       value={totalPts} />
                <StatTile icon={Zap}         iconColor="var(--blue-ce)"   label="Active Days"        value={activeDays} sub="last 12 months" />
              </div>
            </div>
          </SectionCard>

          {/* Activity heatmap */}
          <SectionCard>
            <SectionHeader
              icon={Activity}
              label="Submission Activity"
              right={`${totalActivitySubmissions} submissions in the last year`}
            />

            <div style={{ overflowX: "auto", paddingBottom: "4px" }}>
              <div
                style={{
                  display: "inline-flex",
                  gap: "3px",
                  alignItems: "flex-start",
                }}
              >
                {Array.from({ length: 52 }).map((_, wk) => (
                  <div
                    key={wk}
                    style={{ display: "flex", flexDirection: "column", gap: "3px" }}
                  >
                    {Array.from({ length: 7 }).map((_, dy) => {
                      const cell = heatmap[wk * 7 + dy];
                      if (!cell)
                        return (
                          <div key={dy} style={{ width: "11px", height: "11px" }} />
                        );
                      return (
                        <div
                          key={dy}
                          style={{
                            width: "11px",
                            height: "11px",
                            borderRadius: "2px",
                            background: HEAT_COLORS[cell.level],
                            cursor: cell.count > 0 ? "pointer" : "default",
                            transition: "opacity 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            if (cell.count > 0)
                              setTooltip({
                                text: `${cell.count} submission${cell.count !== 1 ? "s" : ""} · ${fmtDate(cell.date)}`,
                                x: e.clientX,
                                y: e.clientY,
                              });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div
              className="flex items-center gap-1"
              style={{ justifyContent: "flex-end", marginTop: "10px" }}
            >
              <span className="text-xs text-muted" style={{ marginRight: "4px" }}>
                Less
              </span>
              {HEAT_COLORS.map((c, i) => (
                <div
                  key={i}
                  style={{
                    width: "10px",
                    height: "10px",
                    background: c,
                    borderRadius: "2px",
                    border: "1px solid var(--border-subtle)",
                  }}
                />
              ))}
              <span className="text-xs text-muted" style={{ marginLeft: "4px" }}>
                More
              </span>
            </div>
          </SectionCard>

          {/* Tabbed activity panel */}
          <SectionCard style={{ padding: 0, overflow: "hidden" }}>
            {/* Tab bar */}
            <div style={{
              display: "flex", borderBottom: "1px solid var(--border-subtle)",
              background: "var(--bg-raised)",
            }}>
              {[
                { key: "contests",      label: "Contests",      count: ratingHistory.length },
                { key: "submissions",   label: "Submissions",   count: ownSubmissions.length },
                { key: "organizations", label: "Organizations", count: ownOrgs.length },
              ].map(({ key, label, count }) => {
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "10px 20px",
                      background: "none", border: "none",
                      borderBottom: active ? `2px solid var(--primary)` : "2px solid transparent",
                      color: active ? "var(--primary)" : "var(--text-secondary)",
                      fontFamily: "var(--font-body)",
                      fontSize: "var(--text-sm)", fontWeight: active ? 700 : 500,
                      cursor: "pointer",
                      marginBottom: -1,
                      transition: "color var(--transition-fast)",
                    }}
                  >
                    {label}
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      padding: "1px 6px", borderRadius: 9999,
                      background: active ? "var(--primary-subtle)" : "var(--bg-overlay)",
                      color: active ? "var(--primary)" : "var(--text-muted)",
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div style={{ overflowX: "auto" }}>

              {/* ── Contests tab ── */}
              {activeTab === "contests" && (
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: "40%" }}>Contest</th>
                      <th style={{ textAlign: "center", width: "12%" }}>Rank</th>
                      <th style={{ textAlign: "center", width: "15%" }}>Rating</th>
                      <th style={{ textAlign: "center", width: "15%" }}>Change</th>
                      <th style={{ width: "18%" }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...ratingHistory].reverse().length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: 13 }}>No contests participated yet</td></tr>
                    ) : (
                      [...ratingHistory].reverse().map((c, i) => (
                        <tr key={c.id}
                          style={{ background: i % 2 === 0 ? "var(--bg-base)" : "var(--bg-raised)", cursor: "pointer" }}
                          onClick={async () => {
                            try {
                              const r = await ApiService.getContestById(c.contestId);
                              if (r.statusCode === 200) navigate(`/contests/${r.data.slug}`);
                            } catch { navigate("/contests"); }
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? "var(--bg-base)" : "var(--bg-raised)"; }}
                        >
                          <td style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{c.contestName}</td>
                          <td style={{ textAlign: "center", fontSize: 13, color: "var(--text-secondary)" }}>#{c.rank}</td>
                          <td style={{ textAlign: "center", fontWeight: 700, color: "var(--primary)", fontSize: 13 }}>{ratingChain.get(c.id) ?? c.newRating}</td>
                          <td style={{ textAlign: "center" }}>
                            <span style={{
                              fontSize: 12, fontWeight: 700,
                              color: c.ratingChange >= 0 ? "var(--green-ac)" : "var(--red-wa)",
                            }}>
                              {c.ratingChange >= 0 ? "+" : ""}{c.ratingChange}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* ── Submissions tab ── */}
              {activeTab === "submissions" && (
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: "8%", textAlign: "center" }}>#</th>
                      <th style={{ width: "20%" }}>Problem</th>
                      <th style={{ width: "12%", textAlign: "center" }}>Verdict</th>
                      <th style={{ width: "12%", textAlign: "center" }}>Language</th>
                      <th style={{ width: "12%", textAlign: "center" }}>Time</th>
                      <th style={{ width: "12%", textAlign: "center" }}>Memory</th>
                      <th style={{ width: "12%", textAlign: "center" }}>Passed</th>
                      <th style={{ width: "12%" }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownSubmissions.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: 13 }}>
                        No submissions yet
                      </td></tr>
                    ) : (
                      ownSubmissions.map((s, i) => {
                        const VERDICT = {
                          AC:  { color: "var(--green-ac)",   bg: "var(--green-subtle)"  },
                          WA:  { color: "var(--red-wa)",     bg: "var(--red-subtle)"    },
                          TLE: { color: "var(--amber-tle)",  bg: "var(--amber-subtle)"  },
                          CE:  { color: "var(--blue-ce)",    bg: "var(--blue-subtle)"   },
                          MLE: { color: "var(--purple-mle)", bg: "var(--purple-subtle)" },
                        };
                        const vs = VERDICT[s.submissionVerdict] || { color: "var(--text-muted)", bg: "var(--bg-overlay)" };
                        const prob = problemMap[s.problemId];
                        return (
                          <tr key={s.id} style={{ background: i % 2 === 0 ? "var(--bg-base)" : "var(--bg-raised)" }}>
                            <td style={{ textAlign: "center" }}>
                              <button
                                onClick={() => openCode(s)}
                                title="View source code"
                                style={{
                                  background: "var(--primary-subtle)",
                                  border: "1px solid var(--border-accent)",
                                  color: "var(--primary)",
                                  borderRadius: "var(--radius-sm)",
                                  padding: "2px 8px",
                                  fontSize: 11, fontWeight: 700,
                                  cursor: "pointer",
                                  fontFamily: "var(--font-code)",
                                  transition: "background var(--transition-fast)",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.color = "var(--bg-void)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--primary-subtle)"; e.currentTarget.style.color = "var(--primary)"; }}
                              >
                                #{s.id}
                              </button>
                            </td>
                            <td>
                              {prob ? (
                                <button
                                  onClick={() => navigate(`/problems/${prob.slug}`)}
                                  style={{
                                    background: "none", border: "none", cursor: "pointer",
                                    fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
                                    padding: 0, textAlign: "left",
                                    textDecoration: "underline", textDecorationColor: "transparent",
                                    transition: "color var(--transition-fast), text-decoration-color var(--transition-fast)",
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--primary)"; e.currentTarget.style.textDecorationColor = "var(--primary)"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.textDecorationColor = "transparent"; }}
                                >
                                  {prob.title}
                                </button>
                              ) : (
                                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Problem #{s.problemId}</span>
                              )}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: vs.bg, color: vs.color }}>
                                {s.submissionVerdict ?? "—"}
                              </span>
                            </td>
                            <td style={{ textAlign: "center", fontSize: 12, color: "var(--text-secondary)" }}>{s.submissionLanguage}</td>
                            <td style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>{s.executionTime != null ? `${s.executionTime}ms` : "—"}</td>
                            <td style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>{s.memoryUsed != null ? `${Math.round(s.memoryUsed)}KB` : "—"}</td>
                            <td style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
                              {s.testCasesPassed != null ? `${s.testCasesPassed}/${s.totalTestCases}` : "—"}
                            </td>
                            <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                              {s.submissionDate ? new Date(s.submissionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {/* ── Organizations tab ── */}
              {activeTab === "organizations" && (
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: "40%" }}>Organization</th>
                      <th style={{ width: "15%", textAlign: "center" }}>Role</th>
                      <th style={{ width: "15%", textAlign: "center" }}>Members</th>
                      <th style={{ width: "15%" }}>Visibility</th>
                      <th style={{ width: "15%" }}>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownOrgs.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: 13 }}>
                        No organizations yet
                      </td></tr>
                    ) : (
                      ownOrgs.map((org, i) => (
                        <tr key={org.id}
                          style={{ background: i % 2 === 0 ? "var(--bg-base)" : "var(--bg-raised)", cursor: "pointer" }}
                          onClick={() => navigate(`/organizations/${org.slug}`)}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? "var(--bg-base)" : "var(--bg-raised)"; }}
                        >
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{
                                width: 30, height: 30, borderRadius: "var(--radius-md)",
                                background: "var(--primary-subtle)", color: "var(--primary)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 12, fontWeight: 800, flexShrink: 0,
                              }}>
                                {org.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{org.name}</div>
                                {org.about && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{org.about.slice(0, 40)}{org.about.length > 40 ? "…" : ""}</div>}
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                              background: org.myRole === "OWNER" ? "var(--amber-subtle)" : "var(--primary-subtle)",
                              color: org.myRole === "OWNER" ? "var(--amber-tle)" : "var(--primary)",
                            }}>
                              {org.myRole || "Member"}
                            </span>
                          </td>
                          <td style={{ textAlign: "center", fontSize: 13, color: "var(--text-secondary)" }}>{org.totalMembers ?? "—"}</td>
                          <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{org.isPublic ? "Public" : "Private"}</td>
                          <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {org.createdAt ? new Date(org.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Code view modal */}
      {codeModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9000,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
        }} onClick={(e) => e.target === e.currentTarget && setCodeModal(null)}>
          <div style={{
            background: "var(--bg-base)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)",
            width: "100%", maxWidth: 900,
            maxHeight: "85vh",
            display: "flex", flexDirection: "column",
            boxShadow: "var(--shadow-lg)",
            overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 20px",
              background: "var(--bg-raised)",
              borderBottom: "1px solid var(--border-subtle)",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Code2 size={16} color="var(--primary)" />
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                  Submission #{codeModal.submission.id}
                </span>
                {(() => {
                  const VERDICT = {
                    AC:  { color: "var(--green-ac)",   bg: "var(--green-subtle)"  },
                    WA:  { color: "var(--red-wa)",     bg: "var(--red-subtle)"    },
                    TLE: { color: "var(--amber-tle)",  bg: "var(--amber-subtle)"  },
                    CE:  { color: "var(--blue-ce)",    bg: "var(--blue-subtle)"   },
                    MLE: { color: "var(--purple-mle)", bg: "var(--purple-subtle)" },
                  };
                  const vs = VERDICT[codeModal.submission.submissionVerdict] || { color: "var(--text-muted)", bg: "var(--bg-overlay)" };
                  return (
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: vs.bg, color: vs.color }}>
                      {codeModal.submission.submissionVerdict ?? "—"}
                    </span>
                  );
                })()}
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {codeModal.submission.submissionLanguage}
                  {codeModal.submission.executionTime != null && ` · ${codeModal.submission.executionTime}ms`}
                  {codeModal.submission.memoryUsed != null && ` · ${Math.round(codeModal.submission.memoryUsed)}KB`}
                </span>
              </div>
              <button
                onClick={() => setCodeModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: "var(--radius-md)", color: "var(--text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Editor */}
            <div style={{ flex: 1, minHeight: 0 }}>
              {codeModal.loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400 }}>
                  <div className="spinner" />
                </div>
              ) : codeModal.error ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, color: "var(--text-muted)", fontSize: 14 }}>
                  Failed to load source code
                </div>
              ) : (
                <Editor
                  height="500px"
                  language={LANG_MAP[codeModal.submission.submissionLanguage] || "plaintext"}
                  value={codeModal.code || "// No source code available"}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    fontSize: 13,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: "on",
                    folding: true,
                    wordWrap: "on",
                    automaticLayout: true,
                    renderLineHighlight: "all",
                    contextmenu: false,
                    padding: { top: 12, bottom: 12 },
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Heatmap tooltip */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x + 14,
            top: tooltip.y - 36,
            background: "var(--bg-void)",
            color: "var(--text-primary)",
            fontSize: "var(--text-xs)",
            padding: "6px 12px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            pointerEvents: "none",
            zIndex: 9999,
            whiteSpace: "nowrap",
            fontFamily: "var(--font-code)",
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
