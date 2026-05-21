import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft, CheckCircle, AlertTriangle, Circle, BarChart3,
  Users, BookOpen, TrendingUp, Trophy, FileDown,
  Search, ChevronUp, ChevronDown, ChevronsUpDown, X,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const avatarColor = (username = "") => {
  const PALETTES = [
    { bg: "var(--primary-subtle)", color: "var(--primary)" },
    { bg: "var(--green-subtle)",   color: "var(--green-ac)" },
    { bg: "var(--amber-subtle)",   color: "var(--amber-tle)" },
    { bg: "var(--blue-subtle)",    color: "var(--blue-ce)" },
    { bg: "var(--red-subtle)",     color: "var(--red-wa)" },
  ];
  let h = 0;
  for (let i = 0; i < username.length; i++) h = (h * 31 + username.charCodeAt(i)) & 0xffffffff;
  return PALETTES[Math.abs(h) % PALETTES.length];
};

const pctColor = (pct) =>
  pct >= 80 ? "var(--green-ac)" : pct >= 40 ? "var(--amber-tle)" : "var(--red-wa)";
const pctBg = (pct) =>
  pct >= 80 ? "var(--green-subtle)" : pct >= 40 ? "var(--amber-subtle)" : "var(--red-subtle)";

// ─── StatusCell ───────────────────────────────────────────────────────────────

const StatusCell = ({ status }) => {
  const MAP = {
    SOLVED:      { icon: CheckCircle,   color: "var(--green-ac)",  bg: "var(--green-subtle)"  },
    ATTEMPTED:   { icon: AlertTriangle, color: "var(--amber-tle)", bg: "var(--amber-subtle)"  },
    NOT_STARTED: { icon: Circle,        color: "var(--text-muted)", bg: "var(--bg-overlay)"   },
  };
  const s = MAP[status] || MAP.NOT_STARTED;
  const Icon = s.icon;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      width: 32, height: 32, borderRadius: 8, background: s.bg, margin: "0 auto",
    }}>
      <Icon size={15} color={s.color} />
    </div>
  );
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, iconColor, iconBg, label, value, sub }) => (
  <div style={{
    flex: "1 1 160px", background: "var(--bg-surface)", border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-lg)", padding: "18px 20px",
    display: "flex", alignItems: "flex-start", gap: 14,
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: "var(--radius-md)",
      background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <Icon size={18} color={iconColor} />
    </div>
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", marginTop: 1 }}>{sub}</div>}
    </div>
  </div>
);

// ─── MiniBar ──────────────────────────────────────────────────────────────────

const MiniBar = ({ pct, height = 4 }) => (
  <div style={{ width: "100%", height, borderRadius: 999, background: "var(--bg-overlay)", overflow: "hidden" }}>
    <div style={{
      height: "100%", width: `${pct}%`, borderRadius: 999,
      background: pctColor(pct), transition: "width 0.4s ease",
    }} />
  </div>
);

// ─── SortIcon ─────────────────────────────────────────────────────────────────

const SortIcon = ({ active, dir }) => {
  if (!active) return <ChevronsUpDown size={13} style={{ opacity: 0.35 }} />;
  return dir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
};

// ─── LabProgressPage ──────────────────────────────────────────────────────────

const LabProgressPage = () => {
  const { orgSlug, labSlug } = useParams();
  const navigate = useNavigate();
  const { showMessage } = useToast();

  const [org, setOrg]             = useState(null);
  const [lab, setLab]             = useState(null);
  const [progress, setProgress]   = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [exporting, setExporting] = useState(null);

  // search + sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey]         = useState("name");     // "name" | "solved" | "score" | "completion"
  const [sortDir, setSortDir]         = useState("asc");

  useEffect(() => {
    (async () => {
      try {
        const orgResp = await ApiService.getOrganizationBySlug(orgSlug);
        if (orgResp.statusCode !== 200) return;
        setOrg(orgResp.data);

        const labResp = await ApiService.getOrgLab(orgResp.data.id, labSlug);
        if (labResp.statusCode !== 200) return;
        setLab(labResp.data);
        setExercises(labResp.data.exercises || []);

        const progResp = await ApiService.getLabProgress(orgResp.data.id, labResp.data.id);
        if (progResp.statusCode === 200) setProgress(progResp.data || []);
      } catch {
        showMessage("Failed to load progress", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [orgSlug, labSlug]);

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const blob = await ApiService.exportLabProgress(org.id, lab.id, format);
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `lab-progress.${format === "xlsx" ? "xlsx" : "csv"}`;
      a.click();
      window.URL.revokeObjectURL(url);
      showMessage(`Exported as ${format.toUpperCase()}`, "success");
    } catch {
      showMessage("Export failed", "error");
    } finally {
      setExporting(null);
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  // Must be before early returns — Rules of Hooks
  const displayedProgress = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let rows = q
      ? progress.filter((s) =>
          (s.name || "").toLowerCase().includes(q) ||
          (s.username || "").toLowerCase().includes(q)
        )
      : [...progress];

    rows.sort((a, b) => {
      let valA, valB;
      switch (sortKey) {
        case "solved":
          valA = a.solvedCount ?? 0; valB = b.solvedCount ?? 0; break;
        case "score":
          valA = a.earnedPoints ?? 0; valB = b.earnedPoints ?? 0; break;
        case "completion":
          valA = exercises.length > 0 ? (a.solvedCount / exercises.length) : 0;
          valB = exercises.length > 0 ? (b.solvedCount / exercises.length) : 0;
          break;
        default:
          valA = (a.name || a.username || "").toLowerCase();
          valB = (b.name || b.username || "").toLowerCase();
      }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }, [progress, searchQuery, sortKey, sortDir, exercises.length]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!lab) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "80px 0", textAlign: "center" }}>
        <span className="text-muted">Lab not found</span>
      </div>
    );
  }

  // ── Derived stats (over full progress, not filtered) ──────────────────────
  const exCompletionPct = exercises.map((_, exIdx) => {
    if (progress.length === 0) return 0;
    const solved = progress.filter((s) => s.exerciseStatuses?.[exIdx]?.status === "SOLVED").length;
    return Math.round((solved / progress.length) * 100);
  });

  const avgCompletion = progress.length === 0 ? 0 : Math.round(
    progress.reduce((sum, s) => sum + (exercises.length > 0 ? (s.solvedCount / exercises.length) * 100 : 0), 0)
    / progress.length
  );

  const topScorer = progress.length === 0 ? null : progress.reduce((best, s) =>
    (s.earnedPoints ?? 0) > (best.earnedPoints ?? 0) ? s : best, progress[0]
  );

  const SORT_COLS = [
    { key: "name",       label: "Student",  minWidth: 200, sticky: true },
    { key: "solved",     label: "Solved",   minWidth: 72  },
    { key: "score",      label: "Score",    minWidth: 110 },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0 64px" }}>
      <div className="page-container">
        <div className="flex flex-col gap-6">

          {/* ── Back ── */}
          <button
            className="btn btn-ghost btn-sm"
            style={{ alignSelf: "flex-start", gap: 6 }}
            onClick={() => navigate(`/organizations/${orgSlug}/labs/${labSlug}`)}
          >
            <ArrowLeft size={16} /> Back to {lab.title}
          </button>

          {/* ── Page header ── */}
          <div style={{
            borderLeft: "4px solid var(--primary)", paddingLeft: 16,
            display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {org?.name} / {lab.title}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <BarChart3 size={20} color="var(--primary)" />
                <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--text-primary)" }}>
                  Student Progress
                </h2>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 10px", borderRadius: "var(--radius-pill)",
                  background: "var(--primary-subtle)", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)",
                }}>
                  <Users size={11} /> {progress.length} student{progress.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Export button group */}
            <div style={{
              display: "flex", alignItems: "center",
              border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
              overflow: "hidden", flexShrink: 0,
            }}>
              {["csv", "xlsx"].map((fmt, i) => (
                <button
                  key={fmt}
                  onClick={() => handleExport(fmt)}
                  disabled={!!exporting}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "7px 14px", background: "var(--bg-surface)",
                    border: "none", borderLeft: i > 0 ? "1px solid var(--border-default)" : "none",
                    cursor: exporting ? "not-allowed" : "pointer",
                    fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)",
                    transition: "background 0.12s, color 0.12s",
                    opacity: exporting && exporting !== fmt ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => { if (!exporting) { e.currentTarget.style.background = "var(--bg-overlay)"; e.currentTarget.style.color = "var(--text-primary)"; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-surface)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                >
                  {exporting === fmt
                    ? <div className="spinner" style={{ width: 13, height: 13 }} />
                    : <FileDown size={13} />
                  }
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* ── Stat cards + exercise completion row ── */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "stretch" }}>
            <StatCard
              icon={Users} iconColor="var(--primary)" iconBg="var(--primary-subtle)"
              label="Total Students" value={progress.length}
            />
            <StatCard
              icon={BookOpen} iconColor="var(--blue-ce)" iconBg="var(--blue-subtle)"
              label="Exercises" value={exercises.length}
            />
            <StatCard
              icon={TrendingUp}
              iconColor={avgCompletion >= 80 ? "var(--green-ac)" : avgCompletion >= 40 ? "var(--amber-tle)" : "var(--red-wa)"}
              iconBg={avgCompletion >= 80 ? "var(--green-subtle)" : avgCompletion >= 40 ? "var(--amber-subtle)" : "var(--red-subtle)"}
              label="Avg Completion" value={`${avgCompletion}%`}
              sub={progress.length > 0 ? "across all students" : "no data yet"}
            />
            <StatCard
              icon={Trophy} iconColor="var(--amber-tle)" iconBg="var(--amber-subtle)"
              label="Top Scorer"
              value={topScorer ? `${topScorer.earnedPoints ?? 0} pts` : "—"}
              sub={topScorer ? (topScorer.name || topScorer.username) : "no submissions"}
            />

            {/* Exercise completion — same row, grows to fill remaining space */}
            {exercises.length > 0 && (
              <div style={{
                flex: "2 1 220px", background: "var(--bg-surface)", border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-lg)", padding: "14px 16px", display: "flex", flexDirection: "column", justifyContent: "center",
              }}>
                <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
                  Exercise Completion
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {exercises.map((ex, idx) => {
                    const pct = exCompletionPct[idx] ?? 0;
                    return (
                      <div key={ex.id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: "var(--radius-sm)", flexShrink: 0,
                          background: "var(--primary-subtle)", color: "var(--primary)",
                          fontSize: 10, fontWeight: 800,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <div style={{ flex: 1, height: 5, borderRadius: 999, background: "var(--bg-overlay)", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", width: `${pct}%`, borderRadius: 999,
                            background: pctColor(pct), transition: "width 0.5s ease",
                          }} />
                        </div>
                        <span style={{ width: 32, textAlign: "right", fontSize: 10, fontWeight: 700, color: pctColor(pct), flexShrink: 0 }}>
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Search + sort toolbar ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Search */}
            <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              <input
                type="text"
                className="input"
                placeholder="Search students…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 32, paddingRight: searchQuery ? 30 : 10, width: "100%" }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--text-muted)", display: "flex" }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Sort chips */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600 }}>Sort:</span>
              {[
                { key: "name",       label: "Name"       },
                { key: "solved",     label: "Solved"     },
                { key: "score",      label: "Score"      },
                { key: "completion", label: "Completion" },
              ].map(({ key, label }) => {
                const active = sortKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleSort(key)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", borderRadius: "var(--radius-pill)",
                      border: `1px solid ${active ? "var(--primary)" : "var(--border-default)"}`,
                      background: active ? "var(--primary-subtle)" : "var(--bg-surface)",
                      color: active ? "var(--primary)" : "var(--text-secondary)",
                      fontSize: "var(--text-xs)", fontWeight: active ? 700 : 500,
                      cursor: "pointer", transition: "all 0.12s",
                    }}
                  >
                    {label}
                    <SortIcon active={active} dir={sortDir} />
                  </button>
                );
              })}
            </div>

            {/* Result count when filtered */}
            {searchQuery && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", flexShrink: 0 }}>
                {displayedProgress.length} of {progress.length}
              </span>
            )}
          </div>

          {/* ── Progress table ── */}
          <div className="card" style={{ overflowX: "auto", padding: 0 }}>
            <table className="table" style={{ minWidth: "max-content" }}>
              <thead>
                <tr style={{ background: "var(--primary-subtle)" }}>
                  {/* Sortable Student column */}
                  <th
                    onClick={() => handleSort("name")}
                    style={{
                      position: "sticky", left: 0, background: "var(--primary-subtle)",
                      minWidth: 200, zIndex: 1, cursor: "pointer",
                      fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)",
                      textTransform: "uppercase", letterSpacing: "0.06em",
                      userSelect: "none",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      Student <SortIcon active={sortKey === "name"} dir={sortDir} />
                    </span>
                  </th>
                  {exercises.map((ex, idx) => (
                    <th key={ex.id} style={{ textAlign: "center", minWidth: 52 }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 24, height: 24, borderRadius: "var(--radius-sm)",
                        background: "var(--primary-subtle)", fontSize: "var(--text-xs)", fontWeight: 800, color: "var(--primary)",
                      }}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                    </th>
                  ))}
                  {/* Sortable Solved column */}
                  <th
                    onClick={() => handleSort("solved")}
                    style={{
                      textAlign: "center", minWidth: 72, cursor: "pointer",
                      fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)",
                      textTransform: "uppercase", letterSpacing: "0.06em", userSelect: "none",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                      Solved <SortIcon active={sortKey === "solved"} dir={sortDir} />
                    </span>
                  </th>
                  {/* Sortable Score column */}
                  <th
                    onClick={() => handleSort("score")}
                    style={{
                      textAlign: "center", minWidth: 110, cursor: "pointer",
                      fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)",
                      textTransform: "uppercase", letterSpacing: "0.06em", userSelect: "none",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                      Score <SortIcon active={sortKey === "score"} dir={sortDir} />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedProgress.map((student) => {
                  const ac = avatarColor(student.username);
                  const scorePct = student.totalPoints > 0 ? Math.round((student.earnedPoints / student.totalPoints) * 100) : 0;
                  const initial = (student.name || student.username || "?")[0].toUpperCase();
                  return (
                    <tr key={student.userId}>
                      <td style={{ position: "sticky", left: 0, background: "var(--bg-raised)", zIndex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                            background: ac.bg, color: ac.color,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "var(--text-xs)", fontWeight: 800,
                          }}>
                            {initial}
                          </div>
                          <div>
                            <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.2 }}>
                              {student.name || student.username}
                            </div>
                            {student.name && (
                              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>@{student.username}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      {(student.exerciseStatuses || []).map((es, idx) => (
                        <td key={idx} style={{ textAlign: "center", verticalAlign: "middle" }}>
                          <StatusCell status={es.status} />
                        </td>
                      ))}
                      <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                        <span style={{
                          fontSize: "var(--text-sm)", fontWeight: 700,
                          color: student.solvedCount === exercises.length && exercises.length > 0 ? "var(--green-ac)" : "var(--text-secondary)",
                        }}>
                          {student.solvedCount}<span style={{ color: "var(--text-muted)", fontWeight: 400 }}>/{exercises.length}</span>
                        </span>
                      </td>
                      <td style={{ textAlign: "center", verticalAlign: "middle", padding: "8px 12px" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--primary)" }}>
                            {student.earnedPoints}<span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "var(--text-xs)" }}>/{student.totalPoints}</span>
                          </span>
                          <div style={{ width: 72 }}>
                            <MiniBar pct={scorePct} height={3} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Completion footer row — only when no active search filter */}
                {!searchQuery && progress.length > 0 && (
                  <tr style={{ background: "var(--bg-overlay)" }}>
                    <td style={{
                      position: "sticky", left: 0, background: "var(--bg-overlay)", zIndex: 1,
                      fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)",
                      textTransform: "uppercase", letterSpacing: "0.06em",
                    }}>
                      Completion
                    </td>
                    {exCompletionPct.map((pct, idx) => (
                      <td key={idx} style={{ textAlign: "center", verticalAlign: "middle", padding: "8px 6px" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                          <span style={{ fontSize: "var(--text-xs)", fontWeight: 800, color: pctColor(pct) }}>{pct}%</span>
                          <div style={{ width: 28, height: 3, borderRadius: 999, background: pctBg(pct), overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: pctColor(pct), borderRadius: 999 }} />
                          </div>
                        </div>
                      </td>
                    ))}
                    <td /><td />
                  </tr>
                )}
              </tbody>
            </table>

            {/* No results from search */}
            {displayedProgress.length === 0 && progress.length > 0 && (
              <div style={{ padding: "40px 24px", textAlign: "center" }}>
                <Search size={20} style={{ margin: "0 auto 10px", display: "block", color: "var(--text-muted)" }} />
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>
                  No students match "{searchQuery}"
                </div>
              </div>
            )}

            {/* Empty state — no students at all */}
            {progress.length === 0 && (
              <div style={{ padding: "60px 24px", textAlign: "center" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%",
                  background: "var(--bg-overlay)", display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px",
                }}>
                  <Users size={22} color="var(--text-muted)" />
                </div>
                <div style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
                  No students enrolled yet
                </div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                  Progress will appear here once students submit solutions.
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default LabProgressPage;
