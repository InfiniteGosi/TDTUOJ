import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Trophy,
  ArrowLeft,
  Calendar,
  Users,
  Lock,
  Globe,
  Star,
  Clock,
  CheckCircle,
  Medal,
  RefreshCw,
  ListOrdered,
  BookOpen,
  XCircle,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (dt) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusOf = (contest) => {
  if (!contest?.startTime) return "UPCOMING";
  const now   = Date.now();
  const start = new Date(contest.startTime).getTime();
  const end   = new Date(contest.endTime).getTime();
  if (now < start) return "UPCOMING";
  if (now > end)   return "ENDED";
  return "RUNNING";
};

const STATUS = {
  UPCOMING: { label: "Upcoming", color: "var(--amber-tle)", bg: "var(--amber-subtle)" },
  RUNNING:  { label: "Live",     color: "var(--green-ac)",  bg: "var(--green-subtle)" },
  ENDED:    { label: "Ended",    color: "var(--text-muted)", bg: "var(--bg-hover)" },
};

const fmtMins = (mins) => {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// ─── Countdown hook ───────────────────────────────────────────────────────────

const useCountdown = (targetDateStr, onExpire) => {
  const getRemaining = () => {
    if (!targetDateStr) return null;
    const diff = new Date(targetDateStr).getTime() - Date.now();
    if (diff <= 0) return null;
    return {
      total: diff,
      days:    Math.floor(diff / 86400000),
      hours:   Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff %  3600000) /   60000),
      seconds: Math.floor((diff %    60000) /    1000),
    };
  };

  const [remaining, setRemaining] = useState(getRemaining);
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    setRemaining(getRemaining());
    const id = setInterval(() => {
      const r = getRemaining();
      setRemaining(r);
      if (!r && !firedRef.current) {
        firedRef.current = true;
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [targetDateStr]);

  return remaining;
};

// ─── Countdown banner ─────────────────────────────────────────────────────────

const CountdownUnit = ({ value, label }) => (
  <div style={{ textAlign: "center", minWidth: "56px" }}>
    <div
      style={{
        background: "rgba(255,255,255,0.2)",
        borderRadius: "var(--radius-md)",
        padding: "8px 12px",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "var(--text-2xl)",
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {String(value).padStart(2, "0")}
    </div>
    <p
      style={{
        fontSize: "10px",
        marginTop: "var(--space-1)",
        opacity: 0.7,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        margin: "var(--space-1) 0 0 0",
      }}
    >
      {label}
    </p>
  </div>
);

const ContestCountdown = ({ contest, onExpire }) => {
  const remaining = useCountdown(contest?.startTime, onExpire);
  const statusNow = statusOf(contest);

  if (!contest) return null;

  if (statusNow === "RUNNING") {
    return (
      <div
        style={{
          background: "#16a34a",
          color: "#fff",
          padding: "12px",
          textAlign: "center",
          fontSize: "var(--text-sm)",
          fontWeight: 700,
        }}
      >
        Contest is LIVE — Good luck!
      </div>
    );
  }

  if (statusNow === "ENDED") return null;
  if (!remaining) return null;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, var(--bg-void) 0%, var(--navy) 100%)",
        color: "#fff",
        padding: "var(--space-5) 0",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: "var(--text-xs)",
          fontWeight: 600,
          opacity: 0.7,
          marginBottom: "var(--space-2)",
          letterSpacing: "1px",
          textTransform: "uppercase",
          margin: "0 0 var(--space-2) 0",
        }}
      >
        Contest starts in
      </p>
      <div className="flex items-center justify-center gap-3">
        {remaining.days > 0 && <CountdownUnit value={remaining.days} label="Days" />}
        <CountdownUnit value={remaining.hours} label="Hours" />
        <span style={{ fontSize: "var(--text-2xl)", fontWeight: 800, opacity: 0.5 }}>:</span>
        <CountdownUnit value={remaining.minutes} label="Min" />
        <span style={{ fontSize: "var(--text-2xl)", fontWeight: 800, opacity: 0.5 }}>:</span>
        <CountdownUnit value={remaining.seconds} label="Sec" />
      </div>
    </div>
  );
};

const CountdownWaiting = ({ contest, onExpire }) => {
  const remaining = useCountdown(contest?.startTime, onExpire);

  if (!remaining) {
    return (
      <div className="flex flex-col items-center justify-center gap-3" style={{ padding: "var(--space-16) 0" }}>
        <div className="spinner" />
        <span className="text-secondary font-semibold">Loading problems...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4" style={{ padding: "var(--space-16) 0" }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--primary-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Clock size={32} color="var(--primary)" />
      </div>
      <p className="text-primary font-bold text-lg" style={{ margin: 0 }}>
        Problems will be revealed soon
      </p>
      <p className="text-muted text-sm" style={{ margin: 0, textAlign: "center", maxWidth: 400 }}>
        You are registered! Problems will become available when the contest starts.
      </p>
      <div className="flex items-center gap-2" style={{ marginTop: "var(--space-2)" }}>
        {remaining.days > 0 && (
          <div style={{ textAlign: "center", background: "var(--primary-subtle)", borderRadius: "var(--radius-md)", padding: "8px 12px" }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--primary)", margin: 0 }}>
              {String(remaining.days).padStart(2, "0")}
            </p>
            <p style={{ fontSize: "9px", color: "var(--primary-bright)", fontWeight: 600, textTransform: "uppercase", margin: 0 }}>Days</p>
          </div>
        )}
        <div style={{ textAlign: "center", background: "var(--primary-subtle)", borderRadius: "var(--radius-md)", padding: "8px 12px" }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--primary)", margin: 0 }}>
            {String(remaining.hours).padStart(2, "0")}
          </p>
          <p style={{ fontSize: "9px", color: "var(--primary-bright)", fontWeight: 600, textTransform: "uppercase", margin: 0 }}>Hrs</p>
        </div>
        <span style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--text-secondary)" }}>:</span>
        <div style={{ textAlign: "center", background: "var(--primary-subtle)", borderRadius: "var(--radius-md)", padding: "8px 12px" }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--primary)", margin: 0 }}>
            {String(remaining.minutes).padStart(2, "0")}
          </p>
          <p style={{ fontSize: "9px", color: "var(--primary-bright)", fontWeight: 600, textTransform: "uppercase", margin: 0 }}>Min</p>
        </div>
        <span style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--text-secondary)" }}>:</span>
        <div style={{ textAlign: "center", background: "var(--primary-subtle)", borderRadius: "var(--radius-md)", padding: "8px 12px" }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--primary)", margin: 0 }}>
            {String(remaining.seconds).padStart(2, "0")}
          </p>
          <p style={{ fontSize: "9px", color: "var(--primary-bright)", fontWeight: 600, textTransform: "uppercase", margin: 0 }}>Sec</p>
        </div>
      </div>
    </div>
  );
};

// ─── Difficulty badge ──────────────────────────────────────────────────────────

const DiffBadge = ({ difficulty }) => {
  const styles = {
    EASY:   { color: "#16a34a", bg: "#f0fdf4" },
    MEDIUM: { color: "#d97706", bg: "#fffbeb" },
    HARD:   { color: "#dc2626", bg: "#fef2f2" },
  };
  const s = styles[difficulty] ?? styles.EASY;
  const label = difficulty ? difficulty.charAt(0) + difficulty.slice(1).toLowerCase() : "—";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "var(--radius-pill)",
        fontSize: "var(--text-xs)",
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}
    >
      {label}
    </span>
  );
};

// ─── Leaderboard table ─────────────────────────────────────────────────────────

const LeaderboardTable = ({ contestId, problems }) => {
  const { showMessage } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(
    async (quiet = false) => {
      try {
        if (!quiet) setLoading(true);
        else setRefreshing(true);
        const resp = await ApiService.getContestLeaderboard(contestId);
        if (resp.statusCode === 200) setData(resp.data);
      } catch (err) {
        showMessage(err.response?.data?.message || err.message, "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [contestId],
  );

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3" style={{ padding: "var(--space-12) 0" }}>
        <div className="spinner" />
        <span className="text-muted text-sm">Loading leaderboard...</span>
      </div>
    );
  }

  const entries = data?.entries ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-secondary text-sm">
          {data?.totalParticipants ?? 0} participants ·{" "}
          <span className="text-muted text-xs">updates every 30s</span>
        </span>
        <button
          className="btn btn-ghost btn-sm flex items-center gap-1"
          onClick={() => fetchData(true)}
          disabled={refreshing}
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--border-default)" }}>
        <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "var(--primary-subtle)" }}>
            <tr>
              <th style={{ width: "6%", textAlign: "center", padding: "10px 8px", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)" }}>Rank</th>
              <th style={{ width: "24%", padding: "10px 8px", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)" }}>Participant</th>
              <th style={{ width: "10%", textAlign: "center", padding: "10px 8px", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)" }}>Solved</th>
              <th style={{ width: "12%", textAlign: "center", padding: "10px 8px", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)" }}>Penalty</th>
              {(problems ?? []).map((p) => (
                <th key={p.problemId} style={{ width: "8%", textAlign: "center", padding: "10px 8px", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)" }}>
                  {String.fromCharCode(64 + (p.problemOrder ?? 1))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4 + (problems?.length ?? 0)} style={{ textAlign: "center", padding: "var(--space-10) 0" }}>
                  <div className="flex flex-col items-center gap-2">
                    <Trophy size={28} color="var(--border-default)" />
                    <span className="text-muted text-sm">No submissions yet</span>
                  </div>
                </td>
              </tr>
            ) : (
              entries.map((entry, idx) => {
                const rankIcon =
                  entry.rank === 1 ? "🥇" :
                  entry.rank === 2 ? "🥈" :
                  entry.rank === 3 ? "🥉" : null;

                return (
                  <tr
                    key={entry.userId}
                    style={{
                      background: idx % 2 === 0 ? "var(--bg-base)" : "var(--bg-raised)",
                      transition: "background 0.1s",
                      cursor: "default",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-subtle)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? "var(--bg-base)" : "var(--bg-raised)"; }}
                  >
                    <td style={{ textAlign: "center", padding: "10px 8px" }}>
                      {rankIcon
                        ? <span style={{ fontSize: "var(--text-lg)" }}>{rankIcon}</span>
                        : <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-muted)" }}>{entry.rank}</span>
                      }
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>{entry.username}</span>
                    </td>
                    <td style={{ textAlign: "center", padding: "10px 8px" }}>
                      <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--green-ac)" }}>{entry.problemsSolved ?? 0}</span>
                    </td>
                    <td style={{ textAlign: "center", padding: "10px 8px" }}>
                      <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{fmtMins(entry.penaltyTime)}</span>
                    </td>
                    {(problems ?? []).map((p) => {
                      const ps = (entry.problemScores ?? []).find((s) => s.problemId === p.problemId);
                      return (
                        <td key={p.problemId} style={{ textAlign: "center", padding: "10px 8px" }}>
                          {ps ? (
                            ps.solved ? (
                              <div className="flex flex-col items-center" style={{ gap: 0 }}>
                                <CheckCircle size={14} color="var(--green-ac)" />
                                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                                  {ps.attempts > 0 ? `+${ps.attempts}` : ""}
                                  {" "}{fmtMins(ps.penaltyMinutes)}
                                </span>
                              </div>
                            ) : (
                              <span style={{ fontSize: "var(--text-xs)", color: "var(--red-wa)" }}>-{ps.attempts}</span>
                            )
                          ) : (
                            <span style={{ color: "var(--border-default)", fontSize: "var(--text-xs)" }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Main page ─────────────────────────────────────────────────────────────────

const ContestDetailPage = () => {
  const { slug } = useParams();
  const navigate  = useNavigate();
  const { showMessage } = useToast();

  const [contest, setContest]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [registering, setRegistering]   = useState(false);
  const [unregistering, setUnregistering] = useState(false);
  const [registered, setRegistered]     = useState(false);
  const [activeTab, setActiveTab]       = useState("leaderboard");

  const reload = useCallback(async () => {
    try {
      const resp = await ApiService.getContestBySlug(slug);
      if (resp.statusCode === 200) {
        setContest(resp.data);
        if (ApiService.isAuthenticated() && !ApiService.isAdmin() && !ApiService.isCreator()) {
          try {
            const regResp = await ApiService.isRegisteredForContest(resp.data.id);
            if (regResp.statusCode === 200) setRegistered(regResp.data === true);
          } catch (_) {}
        }
      }
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    }
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const resp = await ApiService.getContestBySlug(slug);
        if (cancelled) return;
        if (resp.statusCode === 200) {
          setContest(resp.data);
          if (ApiService.isAuthenticated() && !ApiService.isAdmin() && !ApiService.isCreator()) {
            try {
              const regResp = await ApiService.isRegisteredForContest(resp.data.id);
              if (!cancelled && regResp.statusCode === 200) setRegistered(regResp.data === true);
            } catch (_) {}
          }
        }
      } catch (err) {
        if (!cancelled) showMessage(err.response?.data?.message || err.message, "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [slug]);

  const handleRegister = async () => {
    if (!ApiService.isAuthenticated()) { navigate("/login"); return; }
    try {
      setRegistering(true);
      const resp = await ApiService.registerForContest(contest.id);
      if (resp.statusCode === 200) {
        setRegistered(true);
        showMessage("Successfully registered!", "success");
        setContest((c) => ({ ...c, totalParticipants: (c.totalParticipants ?? 0) + 1 }));
      }
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = async () => {
    try {
      setUnregistering(true);
      const resp = await ApiService.unregisterFromContest(contest.id);
      if (resp.statusCode === 200) {
        setRegistered(false);
        showMessage("Successfully unregistered!", "success");
        setContest((c) => ({ ...c, totalParticipants: Math.max(0, (c.totalParticipants ?? 1) - 1) }));
      }
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    } finally {
      setUnregistering(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="spinner" />
          <span className="text-secondary">Loading contest...</span>
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="flex flex-col items-center gap-3">
          <Trophy size={48} color="var(--border-default)" />
          <span className="text-secondary text-lg">Contest not found</span>
          <button className="btn btn-ghost" onClick={() => navigate("/contests")}>Back to contests</button>
        </div>
      </div>
    );
  }

  const status   = statusOf(contest);
  const s        = STATUS[status];
  const canEdit  = ApiService.isAdmin() || ApiService.isCreator();
  const problems = contest.problems ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", paddingBottom: "var(--space-12)" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-bright) 100%)",
          padding: "var(--space-12) var(--space-8)",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.08,
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="page-container" style={{ position: "relative" }}>
          <div className="flex flex-col gap-5">
            <button
              onClick={() => navigate("/contests")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-2)",
                color: "rgba(255,255,255,0.7)",
                fontSize: "var(--text-sm)",
                background: "none",
                border: "none",
                cursor: "pointer",
                outline: "none",
                padding: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
            >
              <ArrowLeft size={16} />
              All Contests
            </button>

            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="flex flex-col gap-2">
                {/* Status pill */}
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 12px",
                      borderRadius: "var(--radius-pill)",
                      fontSize: "var(--text-xs)",
                      fontWeight: 700,
                      background: "rgba(255,255,255,0.2)",
                      color: "#fff",
                    }}
                  >
                    {status === "RUNNING" && (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#4ade80",
                          display: "inline-block",
                          animation: "pulse 1.5s infinite",
                        }}
                      />
                    )}
                    {s.label}
                  </span>
                  {contest.isRated && (
                    <span style={{ background: "rgba(255,255,255,0.2)", color: "#fef08a", padding: "2px 8px", borderRadius: "var(--radius-pill)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
                      Rated
                    </span>
                  )}
                  <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", padding: "2px 8px", borderRadius: "var(--radius-pill)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
                    ICPC
                  </span>
                </div>

                <h1 style={{ fontSize: "var(--text-3xl)", fontWeight: 900, margin: 0 }}>{contest.name}</h1>

                {contest.description && (
                  <p style={{ fontSize: "var(--text-base)", opacity: 0.8, maxWidth: 600, margin: 0 }}>{contest.description}</p>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-5" style={{ marginTop: "var(--space-1)" }}>
                  <div className="flex items-center gap-1" style={{ opacity: 0.8 }}>
                    <Calendar size={14} />
                    <span style={{ fontSize: "var(--text-sm)" }}>{fmt(contest.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-1" style={{ opacity: 0.8 }}>
                    <Clock size={14} />
                    <span style={{ fontSize: "var(--text-sm)" }}>Until {fmt(contest.endTime)}</span>
                  </div>
                  <div className="flex items-center gap-1" style={{ opacity: 0.8 }}>
                    <Users size={14} />
                    <span style={{ fontSize: "var(--text-sm)" }}>
                      {contest.totalParticipants ?? 0}
                      {contest.maxParticipant ? ` / ${contest.maxParticipant}` : ""} registered
                    </span>
                  </div>
                  <div className="flex items-center gap-1" style={{ opacity: 0.8 }}>
                    {contest.isPublic ? <Globe size={14} /> : <Lock size={14} />}
                    <span style={{ fontSize: "var(--text-sm)" }}>{contest.isPublic ? "Public" : "Private"}</span>
                  </div>
                </div>
              </div>

              {/* Register / Unregister button */}
              {!canEdit && (
                <div>
                  {registered ? (
                    status === "UPCOMING" ? (
                      <div className="flex flex-col gap-2">
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "var(--space-2)",
                            padding: "12px 24px",
                            background: "#4ade80",
                            borderRadius: "var(--radius-lg)",
                            color: "#000",
                            fontWeight: 700,
                          }}
                        >
                          <CheckCircle size={18} />
                          Registered!
                        </div>
                        <button
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "var(--space-2)",
                            padding: "6px 16px",
                            background: "rgba(255,255,255,0.2)",
                            color: "#fff",
                            fontWeight: 600,
                            borderRadius: "var(--radius-md)",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "var(--text-sm)",
                          }}
                          disabled={unregistering}
                          onClick={handleUnregister}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#ef4444"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
                        >
                          <XCircle size={14} />
                          {unregistering ? "Unregistering..." : "Unregister"}
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                          padding: "12px 24px",
                          background: "#4ade80",
                          borderRadius: "var(--radius-lg)",
                          color: "#000",
                          fontWeight: 700,
                        }}
                      >
                        <CheckCircle size={18} />
                        Registered!
                      </div>
                    )
                  ) : status === "ENDED" ? (
                    <button
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        padding: "14px 32px",
                        background: "#fff",
                        color: "var(--primary)",
                        fontWeight: 800,
                        borderRadius: "var(--radius-lg)",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "var(--text-base)",
                      }}
                      onClick={() => setActiveTab("leaderboard")}
                    >
                      <Trophy size={18} />
                      View Results
                    </button>
                  ) : (
                    <button
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        padding: "14px 32px",
                        background: "#fff",
                        color: "var(--primary)",
                        fontWeight: 800,
                        borderRadius: "var(--radius-lg)",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "var(--text-base)",
                      }}
                      disabled={registering}
                      onClick={handleRegister}
                    >
                      <Medal size={18} />
                      {registering ? "Registering..." : "Register Now"}
                    </button>
                  )}
                </div>
              )}

              {canEdit && (
                <button
                  style={{
                    padding: "10px 20px",
                    background: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                  onClick={() => navigate(`/admin/contests/edit/${contest.id}`)}
                >
                  Edit Contest
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Countdown bar */}
      <ContestCountdown contest={contest} onExpire={reload} />

      {/* Body */}
      <div className="page-container" style={{ marginTop: "var(--space-8)" }}>

        {/* Contest is RUNNING + registered/admin */}
        {(registered || canEdit) && status === "RUNNING" && (
          <div
            style={{
              background: "var(--bg-raised)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--green-subtle)",
              padding: "var(--space-8)",
              marginBottom: "var(--space-6)",
              textAlign: "center",
            }}
          >
            <div className="flex flex-col items-center gap-4">
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "var(--green-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trophy size={32} color="var(--green-ac)" />
              </div>
              <p style={{ fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                Contest is Live!
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", maxWidth: 500, margin: 0 }}>
                Enter the contest to start solving problems, or check the leaderboard.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4" style={{ marginTop: "var(--space-2)" }}>
                <button
                  className="btn btn-primary btn-lg"
                  style={{ padding: "14px 32px", fontWeight: 800, borderRadius: "var(--radius-lg)", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
                  onClick={() => {
                    const fp = problems[0];
                    if (fp) navigate(`/contests/${slug}/problems/${fp.problemSlug}`);
                  }}
                  disabled={problems.length === 0}
                >
                  <BookOpen size={18} />
                  Enter Contest
                </button>
                <button
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    padding: "14px 32px",
                    background: "var(--bg-base)",
                    color: "var(--primary)",
                    fontWeight: 700,
                    borderRadius: "var(--radius-lg)",
                    border: "2px solid var(--border-accent)",
                    cursor: "pointer",
                    fontSize: "var(--text-base)",
                  }}
                  onClick={() => {
                    document.getElementById("leaderboard-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <ListOrdered size={18} />
                  View Leaderboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Waiting for start (registered + upcoming) */}
        {registered && status === "UPCOMING" && (
          <div
            style={{
              background: "var(--bg-raised)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--border-default)",
              overflow: "hidden",
              marginBottom: "var(--space-6)",
            }}
          >
            <CountdownWaiting contest={contest} onExpire={reload} />
          </div>
        )}

        {/* Not registered yet */}
        {!registered && !canEdit && status !== "ENDED" && (
          <div
            style={{
              background: "var(--bg-raised)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--border-default)",
              padding: "var(--space-8)",
              marginBottom: "var(--space-6)",
              textAlign: "center",
            }}
          >
            <div className="flex flex-col items-center gap-3">
              <Lock size={40} color="var(--border-default)" />
              <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "var(--text-lg)", margin: 0 }}>
                Register to participate
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", maxWidth: 400, margin: 0 }}>
                Register to access problems and compete on the leaderboard.
              </p>
              <button
                className="btn btn-primary btn-lg"
                style={{ marginTop: "var(--space-2)", padding: "14px 32px", fontWeight: 800, borderRadius: "var(--radius-lg)", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
                disabled={registering}
                onClick={handleRegister}
              >
                <Medal size={18} />
                {registering ? "Registering..." : "Register Now"}
              </button>
            </div>
          </div>
        )}

        {/* Contest ended */}
        {status === "ENDED" && (
          <div
            style={{
              background: "var(--bg-raised)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--border-default)",
              padding: "var(--space-8)",
              marginBottom: "var(--space-6)",
              textAlign: "center",
            }}
          >
            <div className="flex flex-col items-center gap-4">
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "var(--bg-hover)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trophy size={32} color="var(--text-muted)" />
              </div>
              <p style={{ fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                Contest has ended
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", margin: 0 }}>
                Check the final standings below.
              </p>
              {(registered || canEdit) && problems.length > 0 && (
                <button
                  className="btn btn-ghost"
                  style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
                  onClick={() => {
                    const fp = problems[0];
                    if (fp) navigate(`/contests/${slug}/problems/${fp.problemSlug}`);
                  }}
                >
                  <BookOpen size={16} />
                  Review Problems
                </button>
              )}
            </div>
          </div>
        )}

        {/* Problems list (admin/creator only) */}
        {canEdit && problems.length > 0 && (
          <div
            style={{
              background: "var(--bg-raised)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--border-default)",
              overflow: "hidden",
              marginBottom: "var(--space-6)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "12px 20px",
                background: "var(--primary-subtle)",
                borderBottom: "1px solid var(--border-default)",
              }}
            >
              <BookOpen size={15} color="var(--primary)" />
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--primary)" }}>
                Problems ({problems.length})
              </span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-overlay)" }}>
                  <th style={{ width: "8%", textAlign: "center", padding: "10px 8px", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-secondary)" }}>#</th>
                  <th style={{ padding: "10px 8px", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-secondary)", textAlign: "left" }}>Problem</th>
                  <th style={{ width: "15%", padding: "10px 8px", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-secondary)", textAlign: "left" }}>Difficulty</th>
                  <th style={{ width: "12%", textAlign: "center", padding: "10px 8px", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-secondary)" }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((p, idx) => (
                  <tr
                    key={p.problemId}
                    style={{
                      background: idx % 2 === 0 ? "var(--bg-base)" : "var(--bg-raised)",
                      cursor: "pointer",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-subtle)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? "var(--bg-base)" : "var(--bg-raised)"; }}
                    onClick={() => navigate(`/contests/${slug}/problems/${p.problemSlug}`)}
                  >
                    <td style={{ textAlign: "center", padding: "12px 8px" }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "var(--primary-glow)",
                          color: "var(--primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "var(--text-sm)",
                          margin: "0 auto",
                        }}
                      >
                        {String.fromCharCode(64 + (p.problemOrder ?? idx + 1))}
                      </div>
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>{p.problemTitle}</span>
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      {p.problemDifficulty
                        ? <DiffBadge difficulty={p.problemDifficulty} />
                        : <span className="text-muted text-sm">—</span>
                      }
                    </td>
                    <td style={{ textAlign: "center", padding: "12px 8px" }}>
                      <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>{p.points ?? "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Leaderboard (always visible) */}
        <div
          id="leaderboard-section"
          style={{
            background: "var(--bg-raised)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--border-default)",
            padding: "var(--space-5)",
          }}
        >
          <div className="flex items-center gap-2" style={{ paddingBottom: "var(--space-4)" }}>
            <ListOrdered size={15} color="var(--primary)" />
            <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--primary)" }}>Leaderboard</span>
          </div>
          <LeaderboardTable contestId={contest.id} problems={problems} />
        </div>

      </div>
    </div>
  );
};

export default ContestDetailPage;
