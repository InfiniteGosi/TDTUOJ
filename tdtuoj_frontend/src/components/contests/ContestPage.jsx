import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trophy, Calendar, Users, Lock, Globe, ChevronRight, Clock, Star,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import SuggestiveSearch from "../common/SuggestiveSearch";
import FilterPills from "../common/FilterPills";
import Pagination from "../common/Pagination";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (dt) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const statusOf = (c) => {
  const now = Date.now();
  const s = new Date(c.startTime).getTime();
  const e = new Date(c.endTime).getTime();
  if (now < s) return "UPCOMING";
  if (now > e) return "ENDED";
  return "RUNNING";
};

const timeUntil = (dt) => {
  const diff = new Date(dt).getTime() - Date.now();
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `in ${d}d ${h}h`;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
};

const STATUS_STYLE = {
  RUNNING:  { label: "Live",     color: "var(--green-ac)",   bg: "var(--green-subtle)",  dot: true  },
  UPCOMING: { label: "Upcoming", color: "var(--amber-tle)",  bg: "var(--amber-subtle)",  dot: false },
  ENDED:    { label: "Ended",    color: "var(--text-muted)", bg: "var(--bg-hover)",       dot: false },
};

// ─── Status badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLE[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: "var(--radius-pill)",
      fontSize: "var(--text-xs)", fontWeight: 600,
      background: s.bg, color: s.color,
    }}>
      {s.dot && (
        <span style={{
          width: 5, height: 5, borderRadius: "50%",
          background: s.color, display: "inline-block",
          animation: "pulse 1.5s infinite",
        }} />
      )}
      {s.label}
    </span>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const ContestPage = () => {
  const navigate = useNavigate();
  const { showMessage } = useToast();

  const [contests, setContests]           = useState([]);
  const [search, setSearch]               = useState("");
  const [loading, setLoading]             = useState(true);
  const [page, setPage]                   = useState(0);
  const [size, setSize]                   = useState(10);
  const [totalPages, setTotalPages]       = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [statusFilter, setStatusFilter]   = useState("ALL");

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const resp = await ApiService.getPublicContests({ page, size });
        if (resp.statusCode === 200) {
          const data     = resp.data;
          const content  = data.content ?? data;
          const pageInfo = data.page ?? {};
          setContests(content);
          setTotalPages(pageInfo.totalPages ?? 1);
          setTotalElements(pageInfo.totalElements ?? content.length);
        }
      } catch (err) {
        showMessage(err.response?.data?.message || err.message, "error");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [page, size]);

  // client-side search + status filter
  const filtered = contests.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || statusOf(c) === statusFilter;
    return matchSearch && matchStatus;
  });

  const handlePageChange    = (p) => setPage(p);
  const handleLimitChange   = (l) => { setSize(l); setPage(0); };
  const handleSearchChange  = (v) => { setSearch(v); };
  const handleStatusChange  = (v) => { setStatusFilter(v); };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "var(--space-8) 0" }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>

      <div className="page-container">
        <div className="flex flex-col gap-6">

          {/* ── Hero ── */}
          <div style={{
            background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-bright) 100%)",
            borderRadius: "var(--radius-xl)", padding: "var(--space-10)",
            color: "#fff", position: "relative", overflow: "hidden", minHeight: 160,
          }}>
            <div style={{ position: "absolute", inset: 0, opacity: 0.1, backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
            <div style={{ position: "absolute", right: "15%", top: "50%", transform: "translateY(-50%)", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <div className="flex flex-col gap-2" style={{ flex: 1 }}>
                <div className="flex items-center gap-3">
                  <Trophy size={36} />
                  <h1 style={{ fontSize: "var(--text-3xl)", fontWeight: 900, margin: 0 }}>Contests</h1>
                </div>
                <p style={{ fontSize: "var(--text-lg)", opacity: 0.85, margin: 0 }}>
                  Compete in ICPC-style programming contests and climb the leaderboard
                </p>
                <span style={{ display: "inline-block", background: "rgba(255,255,255,0.2)", color: "#fff", padding: "4px 12px", borderRadius: "var(--radius-pill)", fontSize: "var(--text-sm)", marginTop: "var(--space-1)", alignSelf: "flex-start" }}>
                  {totalElements} contests available
                </span>
              </div>
            </div>
          </div>

          {/* ── Toolbar ── */}
          <div className="flex items-center gap-3">
            <SuggestiveSearch
              value={search}
              onChange={handleSearchChange}
              suggestions={["Search contests…", "Find 'Spring Round'", "Explore upcoming contests", "Look up ICPC-style rounds"]}
              style={{ flex: 1, minWidth: 180, maxWidth: 320 }}
            />
            <FilterPills
              value={statusFilter}
              onChange={handleStatusChange}
              options={[
                { value: "ALL",      label: "All" },
                { value: "RUNNING",  label: "Live",     accent: "var(--green-ac)" },
                { value: "UPCOMING", label: "Upcoming", accent: "var(--amber-tle)" },
                { value: "ENDED",    label: "Ended",    accent: "var(--text-muted)" },
              ]}
            />
          </div>

          {/* ── Table ── */}
          <div style={{ background: "var(--bg-raised)", borderRadius: "var(--radius-lg)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)", overflow: "hidden", position: "relative" }}>

            {loading && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(15,15,15,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                <div className="spinner" />
              </div>
            )}

            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: "4%",  textAlign: "center", fontSize: 13, fontWeight: 700 }}>#</th>
                  <th style={{ width: "34%", fontSize: 13, fontWeight: 700 }}>Contest</th>
                  <th style={{ width: "11%", fontSize: 13, fontWeight: 700 }}>Status</th>
                  <th style={{ width: "8%",  fontSize: 13, fontWeight: 700 }}>Style</th>
                  <th style={{ width: "22%", fontSize: 13, fontWeight: 700 }}>Schedule</th>
                  <th style={{ width: "10%", textAlign: "center", fontSize: 13, fontWeight: 700 }}>Registered</th>
                  <th style={{ width: "7%",  textAlign: "center", fontSize: 13, fontWeight: 700 }}>Problems</th>
                  <th style={{ width: "4%"  }} />
                </tr>
              </thead>

              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((contest, index) => {
                    const status    = statusOf(contest);
                    const countdown = status === "UPCOMING" ? timeUntil(contest.startTime) : null;
                    const rowBg     = index % 2 === 0 ? "var(--bg-raised)" : "var(--bg-overlay)";
                    return (
                      <tr
                        key={contest.id}
                        style={{ background: rowBg, cursor: "pointer", transition: "background 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-subtle)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = rowBg; }}
                        onClick={() => navigate(`/contests/${contest.slug}`)}
                      >
                        {/* # */}
                        <td style={{ textAlign: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>
                            {page * size + index + 1}
                          </span>
                        </td>

                        {/* Contest name */}
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {contest.isPublic
                                ? <Globe size={12} color="var(--text-muted)" />
                                : <Lock  size={12} color="var(--text-muted)" />
                              }
                              {contest.isRated && <Star size={12} color="var(--amber-tle)" fill="var(--amber-tle)" />}
                              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                                {contest.name}
                              </span>
                            </div>
                            {contest.creatorUsername && (
                              <span style={{ fontSize: 12, color: "var(--text-muted)", paddingLeft: 18 }}>
                                by {contest.creatorUsername}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <StatusBadge status={status} />
                            {countdown && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--amber-tle)", fontWeight: 600 }}>
                                <Clock size={10} />
                                {countdown}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Style */}
                        <td>
                          {contest.contestStyle ? (
                            <span style={{
                              padding: "2px 8px", borderRadius: "var(--radius-pill)",
                              fontSize: 11, fontWeight: 700,
                              background: "var(--bg-overlay)",
                              border: "1px solid var(--border-default)",
                              color: "var(--text-secondary)",
                            }}>
                              {contest.contestStyle}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>—</span>
                          )}
                        </td>

                        {/* Schedule */}
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)" }}>
                              <Calendar size={11} color="var(--text-muted)" />
                              {fmt(contest.startTime)}
                            </span>
                            <span style={{ fontSize: 12, color: "var(--text-muted)", paddingLeft: 15 }}>
                              → {fmt(contest.endTime)}
                            </span>
                          </div>
                        </td>

                        {/* Registered */}
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>
                            <Users size={13} color="var(--text-muted)" />
                            <span>
                              {contest.totalParticipants ?? 0}
                              {contest.maxParticipant ? ` / ${contest.maxParticipant}` : ""}
                            </span>
                          </div>
                        </td>

                        {/* Problems */}
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--cyan)", fontWeight: 700 }}>
                            <Trophy size={13} color="var(--cyan)" />
                            {contest.totalProblems ?? 0}
                          </div>
                        </td>

                        {/* Arrow */}
                        <td style={{ textAlign: "center" }}>
                          <ChevronRight size={15} color="var(--text-muted)" />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "48px 0" }}>
                      <div className="flex flex-col items-center gap-3">
                        <Trophy size={44} color="var(--border-default)" />
                        <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-muted)" }}>No contests found</span>
                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Try adjusting search or filter</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              totalElements={totalElements}
              limit={size}
              onLimitChange={handleLimitChange}
              offset={page * size}
            />
          </div>

        </div>
      </div>
    </div>
  );
};

export default ContestPage;
