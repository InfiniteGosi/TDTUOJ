import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trophy,
  Calendar,
  Users,
  Lock,
  Globe,
  ChevronRight,
  Clock,
  Star,
  ChevronLeft,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import SuggestiveSearch from "../common/SuggestiveSearch";
import FilterPills from "../common/FilterPills";
import MacbookAnimation from "../common/MacbookAnimation";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (dt, opts = {}) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...opts,
  });
};

const statusOf = (contest) => {
  const now = Date.now();
  const start = new Date(contest.startTime).getTime();
  const end   = new Date(contest.endTime).getTime();
  if (now < start) return "UPCOMING";
  if (now > end)   return "ENDED";
  return "RUNNING";
};

const timeUntil = (dt) => {
  const diff = new Date(dt).getTime() - Date.now();
  if (diff <= 0) return null;
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `Starts in ${days}d ${hours}h`;
  if (hours > 0) return `Starts in ${hours}h ${mins}m`;
  return `Starts in ${mins}m`;
};

// ─── Contest Card ─────────────────────────────────────────────────────────────

const ContestCard = ({ contest, onEnter }) => {
  const status = statusOf(contest);
  const countdown = status === "UPCOMING" ? timeUntil(contest.startTime) : null;

  const statusStyle = {
    RUNNING:  { label: "Live",     color: "var(--green-ac)",  bg: "var(--green-subtle)",  dot: true },
    UPCOMING: { label: "Upcoming", color: "var(--amber-tle)", bg: "var(--amber-subtle)",  dot: false },
    ENDED:    { label: "Ended",    color: "var(--text-muted)", bg: "var(--bg-hover)",      dot: false },
  }[status];

  const barColor = {
    RUNNING: "var(--green-ac)",
    UPCOMING: "var(--amber-tle)",
    ENDED: "var(--text-muted)",
  }[status];

  return (
    <div
      onClick={() => onEnter(contest.slug)}
      style={{
        background: "var(--bg-raised)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-default)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        transition: "var(--transition-base)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.4)";
        e.currentTarget.style.borderColor = "var(--border-accent)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)";
        e.currentTarget.style.borderColor = "var(--border-default)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Status bar */}
      <div style={{ height: "4px", background: barColor }} />

      <div style={{ padding: "var(--space-5)", flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {contest.isPublic
              ? <Globe size={13} color="var(--text-muted)" />
              : <Lock size={13} color="var(--text-muted)" />
            }
            {contest.isRated && <Star size={13} color="var(--amber-tle)" fill="var(--amber-tle)" />}
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              borderRadius: "var(--radius-pill)",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              background: statusStyle.bg,
              color: statusStyle.color,
            }}
          >
            {statusStyle.dot && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: statusStyle.color,
                  display: "inline-block",
                  animation: "pulse 1.5s infinite",
                }}
              />
            )}
            {statusStyle.label}
          </span>
        </div>

        {/* Title */}
        <div>
          <p
            className="font-bold text-primary"
            style={{
              fontSize: "var(--text-lg)",
              fontWeight: 800,
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {contest.name}
          </p>
          {contest.description && (
            <p
              className="text-secondary"
              style={{
                fontSize: "var(--text-sm)",
                marginTop: "var(--space-1)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {contest.description}
            </p>
          )}
        </div>

        {/* Countdown */}
        {countdown && (
          <div className="flex items-center gap-1">
            <Clock size={13} color="var(--cyan)" />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--cyan)", fontWeight: 600 }}>
              {countdown}
            </span>
          </div>
        )}

        {/* Meta */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", marginTop: "auto" }}>
          <div className="flex items-center gap-1">
            <Calendar size={13} color="var(--text-muted)" />
            <span style={{ fontSize: "var(--text-xs)" }} className="text-secondary">
              {fmt(contest.startTime)} → {fmt(contest.endTime)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Users size={13} color="var(--text-muted)" />
              <span style={{ fontSize: "var(--text-xs)" }} className="text-secondary">
                {contest.totalParticipants ?? 0} registered
                {contest.maxParticipant ? ` / ${contest.maxParticipant}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Trophy size={13} color="var(--text-muted)" />
              <span style={{ fontSize: "var(--text-xs)" }} className="text-secondary">
                {contest.totalProblems ?? 0} problems
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "var(--space-3) var(--space-5)",
          background: "var(--bg-overlay)",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: "var(--text-xs)" }} className="text-muted">
          by {contest.creatorUsername ?? "—"}
        </span>
        <div className="flex items-center gap-1" style={{ color: "var(--cyan)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
          <span>View</span>
          <ChevronRight size={13} />
        </div>
      </div>
    </div>
  );
};

// ─── Main page ─────────────────────────────────────────────────────────────────

const ContestPage = () => {
  const navigate = useNavigate();
  const { showMessage } = useToast();

  const [contests, setContests] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const SIZE = 12;

  useEffect(() => {
    const fetchContests = async () => {
      try {
        setLoading(true);
        const resp = await ApiService.getPublicContests({ page, size: SIZE });
        if (resp.statusCode === 200) {
          const data = resp.data;
          const content = data.content ?? data;
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
    fetchContests();
  }, [page]);

  const filtered = contests.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "ALL" || statusOf(c) === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "var(--space-8) 0" }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>

      <div className="page-container">
        <div className="flex flex-col gap-6">

          {/* Hero Header */}
          <div
            style={{
              background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-bright) 100%)",
              borderRadius: "var(--radius-xl)",
              padding: "var(--space-10)",
              color: "#fff",
              position: "relative",
              overflow: "hidden",
              minHeight: 160,
            }}
          >
            {/* Dot grid */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.1,
                backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            />
            {/* Radial glow behind MacBook */}
            <div
              style={{
                position: "absolute",
                right: "15%",
                top: "50%",
                transform: "translateY(-50%)",
                width: 220,
                height: 220,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />

            {/* Layout: text left, MacBook right */}
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {/* Left: text */}
              <div className="flex flex-col gap-2" style={{ flex: 1, maxWidth: "60%" }}>
                <div className="flex items-center gap-3">
                  <Trophy size={36} />
                  <h1 style={{ fontSize: "var(--text-3xl)", fontWeight: 900, margin: 0 }}>Contests</h1>
                </div>
                <p style={{ fontSize: "var(--text-lg)", opacity: 0.85, margin: 0 }}>
                  Compete in ICPC-style programming contests and climb the leaderboard
                </p>
                <span
                  style={{
                    display: "inline-block",
                    background: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    padding: "4px 12px",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "var(--text-sm)",
                    marginTop: "var(--space-1)",
                    alignSelf: "flex-start",
                  }}
                >
                  {totalElements} contests available
                </span>
              </div>

              {/* Right: 3D MacBook */}
              <div
                style={{
                  width: 220,
                  height: 160,
                  position: "relative",
                  flexShrink: 0,
                  opacity: 0.92,
                }}
              >
                <MacbookAnimation />
              </div>
            </div>
          </div>

          {/* Search + Status Filter */}
          <div className="flex items-center gap-3">
            <SuggestiveSearch
              value={search}
              onChange={(val) => setSearch(val)}
              suggestions={[
                "Search contests...",
                "Find 'Spring Round'",
                "Explore upcoming contests",
                "Look up ICPC-style rounds",
              ]}
              style={{ width: "100%", maxWidth: 320 }}
            />

            <FilterPills
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "ALL",      label: "All" },
                { value: "RUNNING",  label: "Running",  accent: "var(--green-ac)" },
                { value: "UPCOMING", label: "Upcoming", accent: "var(--blue-ce)" },
                { value: "ENDED",    label: "Ended",    accent: "var(--text-muted)" },
              ]}
            />
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4" style={{ padding: "var(--space-16) 0" }}>
              <div className="spinner" />
              <span className="text-secondary">Loading contests...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3" style={{ padding: "var(--space-16) 0" }}>
              <Trophy size={48} color="var(--border-default)" />
              <p className="text-muted font-semibold text-lg" style={{ margin: 0 }}>No contests found</p>
              <p className="text-muted text-sm" style={{ margin: 0 }}>Try adjusting your search or filter</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--space-5)" }}>
              {filtered.map((contest) => (
                <ContestCard
                  key={contest.id}
                  contest={contest}
                  onEnter={(slug) => navigate(`/contests/${slug}`)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <span className="text-secondary text-sm" style={{ padding: "0 var(--space-2)" }}>
                Page {page + 1} of {totalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ContestPage;
