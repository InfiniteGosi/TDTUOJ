import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Trophy, ArrowLeft, Calendar, Users, Lock, Globe, Star,
  Clock, CheckCircle, Medal, RefreshCw, ListOrdered, BookOpen, XCircle,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (dt) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const statusOf = (c) => {
  if (!c?.startTime) return "UPCOMING";
  const now = Date.now();
  const s = new Date(c.startTime).getTime();
  const e = new Date(c.endTime).getTime();
  if (now < s) return "UPCOMING";
  if (now > e) return "ENDED";
  return "RUNNING";
};

const contestDuration = (start, end) => {
  if (!start || !end) return "—";
  const diff = new Date(end) - new Date(start);
  const h = Math.floor(diff / 3600000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const r = h % 24;
    return r > 0 ? `${d}d ${r}h` : `${d}d`;
  }
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
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
      days:    Math.floor(diff / 86400000),
      hours:   Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
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
      if (!r && !firedRef.current) { firedRef.current = true; onExpire?.(); }
    }, 1000);
    return () => clearInterval(id);
  }, [targetDateStr]);
  return remaining;
};

// ─── Difficulty badge (CSS vars only) ────────────────────────────────────────

const DiffBadge = ({ difficulty }) => {
  const cfg = {
    EASY:   { color: "var(--green-ac)",  bg: "var(--green-subtle)"  },
    MEDIUM: { color: "var(--amber-tle)", bg: "var(--amber-subtle)"  },
    HARD:   { color: "var(--red-wa)",    bg: "rgba(239,68,68,0.09)" },
  };
  const s = cfg[difficulty] ?? cfg.EASY;
  return (
    <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: "var(--radius-pill)", fontSize: "var(--text-xs)", fontWeight: 700, background: s.bg, color: s.color }}>
      {difficulty ? difficulty.charAt(0) + difficulty.slice(1).toLowerCase() : "—"}
    </span>
  );
};

// ─── Sidebar countdown clock ──────────────────────────────────────────────────

const ClockDigit = ({ val, unit }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
    <div style={{
      background: "var(--bg-void)", border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-sm)", padding: "5px 9px",
      fontFamily: "var(--font-code)", fontSize: "var(--text-xl)", fontWeight: 800,
      color: "var(--text-primary)", lineHeight: 1, minWidth: 40, textAlign: "center",
    }}>
      {String(val).padStart(2, "0")}
    </div>
    <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
      {unit}
    </span>
  </div>
);

const Sep = () => (
  <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--border-strong)", paddingBottom: 14, lineHeight: 1 }}>:</span>
);

const SidebarClock = ({ targetDate, label, onExpire }) => {
  const r = useCountdown(targetDate, onExpire);
  if (!r) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 5 }}>
        {r.days > 0 && <><ClockDigit val={r.days} unit="days" /><Sep /></>}
        <ClockDigit val={r.hours} unit="hrs" />
        <Sep />
        <ClockDigit val={r.minutes} unit="min" />
        <Sep />
        <ClockDigit val={r.seconds} unit="sec" />
      </div>
    </div>
  );
};

// ─── Leaderboard table ─────────────────────────────────────────────────────────

const LeaderboardTable = ({ contestId, problems }) => {
  const { showMessage } = useToast();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true); else setRefreshing(true);
      const resp = await ApiService.getContestLeaderboard(contestId);
      if (resp.statusCode === 200) setData(resp.data);
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    } finally { setLoading(false); setRefreshing(false); }
  }, [contestId]);

  useEffect(() => {
    fetchData();
    const id = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(id);
  }, [fetchData]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 0" }}>
        <div className="spinner" />
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Loading leaderboard...</span>
      </div>
    );
  }

  const entries = data?.entries ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          {data?.totalParticipants ?? 0} participants
          <span style={{ marginLeft: 8, fontSize: "var(--text-xs)" }}>· auto-refresh 30s</span>
        </span>
        <button className="btn btn-ghost btn-sm"
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          onClick={() => fetchData(true)} disabled={refreshing}>
          <RefreshCw size={11} style={refreshing ? { animation: "spin 0.8s linear infinite" } : {}} />
          Refresh
        </button>
      </div>

      <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border-default)" }}>
        <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-overlay)" }}>
              <th style={{ width: "6%", textAlign: "center", padding: "10px 8px", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em" }}>RANK</th>
              <th style={{ padding: "10px 8px", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em" }}>PARTICIPANT</th>
              <th style={{ width: "10%", textAlign: "center", padding: "10px 8px", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--green-ac)", letterSpacing: "0.05em" }}>SOLVED</th>
              <th style={{ width: "12%", textAlign: "center", padding: "10px 8px", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em" }}>PENALTY</th>
              {(problems ?? []).map((p) => (
                <th key={p.problemId} style={{ width: "7%", textAlign: "center", padding: "10px 8px", fontSize: "var(--text-xs)", fontWeight: 800, color: "var(--cyan)", letterSpacing: "0.05em" }}>
                  {String.fromCharCode(64 + (p.problemOrder ?? 1))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4 + (problems?.length ?? 0)} style={{ textAlign: "center", padding: "40px 0" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <Trophy size={32} color="var(--border-default)" />
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No submissions yet</span>
                  </div>
                </td>
              </tr>
            ) : (
              entries.map((entry, idx) => {
                const rowBg = idx % 2 === 0 ? "var(--bg-raised)" : "var(--bg-overlay)";
                return (
                  <tr key={entry.userId}
                    style={{ background: rowBg, transition: "background 0.1s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-subtle)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = rowBg; }}>
                    <td style={{ textAlign: "center", padding: "10px 8px" }}>
                      {entry.rank <= 3
                        ? <span style={{ fontSize: 16 }}>{entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}</span>
                        : <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-muted)" }}>{entry.rank}</span>
                      }
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>{entry.username}</span>
                    </td>
                    <td style={{ textAlign: "center", padding: "10px 8px" }}>
                      <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--text-sm)", fontWeight: 800, color: "var(--green-ac)" }}>{entry.problemsSolved ?? 0}</span>
                    </td>
                    <td style={{ textAlign: "center", padding: "10px 8px" }}>
                      <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{fmtMins(entry.penaltyTime)}</span>
                    </td>
                    {(problems ?? []).map((p) => {
                      const ps = (entry.problemScores ?? []).find((s) => s.problemId === p.problemId);
                      return (
                        <td key={p.problemId} style={{ textAlign: "center", padding: "10px 8px" }}>
                          {ps ? (
                            ps.solved ? (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                                <CheckCircle size={14} color="var(--green-ac)" />
                                <span style={{ fontFamily: "var(--font-code)", fontSize: 10, color: "var(--text-muted)" }}>
                                  {ps.attempts > 0 ? `+${ps.attempts} ` : ""}{fmtMins(ps.penaltyMinutes)}
                                </span>
                              </div>
                            ) : (
                              <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--text-xs)", color: "var(--red-wa)", fontWeight: 700 }}>-{ps.attempts}</span>
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

// ─── Main page ────────────────────────────────────────────────────────────────

const ContestDetailPage = () => {
  const { slug }        = useParams();
  const navigate        = useNavigate();
  const { showMessage } = useToast();

  const [contest, setContest]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [registering, setRegistering]   = useState(false);
  const [unregistering, setUnregistering] = useState(false);
  const [registered, setRegistered]     = useState(false);
  const [activeTab, setActiveTab]       = useState("problems");

  const reload = useCallback(async () => {
    try {
      const resp = await ApiService.getContestBySlug(slug);
      if (resp.statusCode === 200) {
        setContest(resp.data);
        if (ApiService.isAuthenticated() && !ApiService.isAdmin() && !ApiService.isCreator()) {
          try {
            const r = await ApiService.isRegisteredForContest(resp.data.id);
            if (r.statusCode === 200) setRegistered(r.data === true);
          } catch (_) {}
        }
      }
    } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); }
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await ApiService.getContestBySlug(slug);
        if (cancelled) return;
        if (resp.statusCode === 200) {
          setContest(resp.data);
          if (ApiService.isAuthenticated() && !ApiService.isAdmin() && !ApiService.isCreator()) {
            try {
              const r = await ApiService.isRegisteredForContest(resp.data.id);
              if (!cancelled && r.statusCode === 200) setRegistered(r.data === true);
            } catch (_) {}
          }
        }
      } catch (err) { if (!cancelled) showMessage(err.response?.data?.message || err.message, "error"); }
      finally { if (!cancelled) setLoading(false); }
    })();
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
    } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); }
    finally { setRegistering(false); }
  };

  const handleUnregister = async () => {
    try {
      setUnregistering(true);
      const resp = await ApiService.unregisterFromContest(contest.id);
      if (resp.statusCode === 200) {
        setRegistered(false);
        showMessage("Successfully unregistered.", "success");
        setContest((c) => ({ ...c, totalParticipants: Math.max(0, (c.totalParticipants ?? 1) - 1) }));
      }
    } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); }
    finally { setUnregistering(false); }
  };

  // ── Loading / error states ──
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div className="spinner" />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Loading contest...</span>
        </div>
      </div>
    );
  }
  if (!contest) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Trophy size={40} color="var(--border-default)" />
          <span style={{ fontSize: "var(--text-lg)", color: "var(--text-muted)", fontWeight: 600 }}>Contest not found</span>
          <button className="btn btn-ghost" onClick={() => navigate("/contests")}>← Back to contests</button>
        </div>
      </div>
    );
  }

  const status   = statusOf(contest);
  const canEdit  = ApiService.isAdmin() || ApiService.isCreator();
  const problems = contest.problems ?? [];

  const clockTarget = status === "UPCOMING" ? contest.startTime : status === "RUNNING" ? contest.endTime : null;
  const clockLabel  = status === "UPCOMING" ? "Starts in" : "Ends in";

  const TABS = [
    { key: "problems",     label: "Problems",    icon: <BookOpen size={13} />    },
    { key: "leaderboard",  label: "Leaderboard", icon: <ListOrdered size={13} /> },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", paddingBottom: "var(--space-16)" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes spin   { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Banner ── */}
      {(() => {
        const accent     = status === "RUNNING" ? "var(--green-ac)" : status === "UPCOMING" ? "var(--amber-tle)" : "var(--border-strong)";
        const glowHex    = status === "RUNNING" ? "#4ade80"         : status === "UPCOMING" ? "#fbbf24"          : "#6b7280";
        return (
          <div style={{ background: "var(--bg-void)", borderBottom: "1px solid var(--border-default)", position: "relative", overflow: "hidden" }}>

            {/* ── Trophy graphic ── */}
            <div aria-hidden="true" style={{ position: "absolute", right: "7%", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", userSelect: "none", opacity: 0.65 }}>
              {/* Status glow halo */}
              <div style={{ position: "absolute", left: "50%", top: "42%", transform: "translate(-50%,-50%)", width: 240, height: 240, borderRadius: "50%", background: `radial-gradient(circle, ${glowHex} 0%, transparent 68%)`, opacity: 0.22, filter: "blur(32px)" }} />
              <svg width="190" height="218" viewBox="0 0 200 230" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="tgCup" x1="38" y1="12" x2="162" y2="145" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FFD97D" />
                    <stop offset="48%" stopColor="#F5A000" />
                    <stop offset="100%" stopColor="#A36A00" />
                  </linearGradient>
                  <linearGradient id="tgHandleL" x1="10" y1="42" x2="38" y2="114" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#F5A000" />
                    <stop offset="100%" stopColor="#A36A00" />
                  </linearGradient>
                  <linearGradient id="tgHandleR" x1="190" y1="42" x2="162" y2="114" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#F5A000" />
                    <stop offset="100%" stopColor="#A36A00" />
                  </linearGradient>
                  <linearGradient id="tgBase1" x1="56" y1="181" x2="144" y2="193" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#D4A017" />
                    <stop offset="100%" stopColor="#9A7012" />
                  </linearGradient>
                  <linearGradient id="tgBase2" x1="46" y1="191" x2="154" y2="205" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#B8860B" />
                    <stop offset="100%" stopColor="#7A5800" />
                  </linearGradient>
                </defs>

                {/* Cup body */}
                <path d="M40 13 L160 13 Q167 76 150 112 Q136 137 100 143 Q64 137 50 112 Q33 76 40 13 Z" fill="url(#tgCup)" />

                {/* Cup rim highlight */}
                <path d="M40 13 L160 13" stroke="#FFE566" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />

                {/* Cup left-edge shine */}
                <path d="M54 24 Q47 72 54 110" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.18" fill="none" />

                {/* Inner shadow on right */}
                <path d="M152 24 Q158 68 150 108" stroke="#7A5800" strokeWidth="6" strokeLinecap="round" opacity="0.25" fill="none" />

                {/* 5-pointed star emblem */}
                <path d="M100 46 L108.5 71 L135 71 L114 86 L122 111 L100 96 L78 111 L86 86 L65 71 L91.5 71 Z" fill="white" opacity="0.2" />
                <path d="M100 46 L108.5 71 L135 71 L114 86 L122 111 L100 96 L78 111 L86 86 L65 71 L91.5 71 Z" stroke="white" strokeWidth="1" fill="none" opacity="0.35" />

                {/* Left handle outer stroke */}
                <path d="M40 44 C13 44 8 64 8 79 C8 94 13 115 40 115" stroke="url(#tgHandleL)" strokeWidth="12" fill="none" strokeLinecap="round" />
                {/* Left handle inner highlight */}
                <path d="M40 44 C13 44 8 64 8 79 C8 94 13 115 40 115" stroke="#FFD97D" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.25" />

                {/* Right handle outer stroke */}
                <path d="M160 44 C187 44 192 64 192 79 C192 94 187 115 160 115" stroke="url(#tgHandleR)" strokeWidth="12" fill="none" strokeLinecap="round" />
                {/* Right handle inner highlight */}
                <path d="M160 44 C187 44 192 64 192 79 C192 94 187 115 160 115" stroke="#FFD97D" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.25" />

                {/* Stem */}
                <rect x="88" y="143" width="24" height="32" rx="2" fill="#A36A00" />
                <rect x="90" y="143" width="7" height="32" rx="1" fill="#D4A017" opacity="0.4" />

                {/* Connector bar */}
                <rect x="64" y="173" width="72" height="10" rx="3" fill="#C49020" />
                <rect x="64" y="173" width="72" height="3" rx="1.5" fill="#FFD97D" opacity="0.3" />

                {/* Base tier 1 */}
                <rect x="56" y="181" width="88" height="12" rx="3" fill="url(#tgBase1)" />
                <rect x="56" y="181" width="88" height="3.5" rx="1.5" fill="#FFE580" opacity="0.25" />

                {/* Base tier 2 */}
                <rect x="46" y="191" width="108" height="13" rx="3" fill="url(#tgBase2)" />
                <rect x="46" y="191" width="108" height="3.5" rx="1.5" fill="#D4A017" opacity="0.3" />

                {/* Bottom edge */}
                <rect x="44" y="201" width="112" height="5" rx="2" fill="#5A3E00" opacity="0.6" />

                {/* Ground shadow ellipse */}
                <ellipse cx="100" cy="220" rx="58" ry="7" fill={glowHex} opacity="0.12" />
              </svg>
            </div>

            <div className="page-container" style={{ paddingTop: "var(--space-7)", paddingBottom: "var(--space-8)", position: "relative", zIndex: 1 }}>
              {/* Back */}
              <button onClick={() => navigate("/contests")}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--text-muted)", fontSize: "var(--text-sm)", cursor: "pointer", outline: "none", padding: 0, marginBottom: "var(--space-6)", transition: "color 0.12s", fontFamily: "var(--font-body)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}>
                <ArrowLeft size={14} />All Contests
              </button>

              {/* Accented content block */}
              <div style={{ borderLeft: `4px solid ${accent}`, paddingLeft: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>

                {/* Badges */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "3px 10px", borderRadius: "var(--radius-pill)",
                    fontSize: "var(--text-xs)", fontWeight: 700,
                    background: status === "RUNNING"  ? "var(--green-subtle)"
                              : status === "UPCOMING" ? "var(--amber-subtle)"
                              : "var(--bg-overlay)",
                    color: status === "RUNNING"  ? "var(--green-ac)"
                         : status === "UPCOMING" ? "var(--amber-tle)"
                         : "var(--text-muted)",
                    border: `1px solid ${status === "RUNNING" ? "rgba(74,222,128,0.25)" : status === "UPCOMING" ? "rgba(251,191,36,0.25)" : "var(--border-default)"}`,
                  }}>
                    {status === "RUNNING" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green-ac)", display: "inline-block", animation: "pulse 1.5s infinite" }} />}
                    {status === "RUNNING" ? "LIVE" : status === "UPCOMING" ? "UPCOMING" : "ENDED"}
                  </span>
                  {contest.contestStyle && (
                    <span style={{ padding: "3px 10px", borderRadius: "var(--radius-pill)", fontSize: "var(--text-xs)", fontWeight: 700, background: "var(--bg-overlay)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}>
                      {contest.contestStyle}
                    </span>
                  )}
                  {contest.isRated && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: "var(--radius-pill)", fontSize: "var(--text-xs)", fontWeight: 700, background: "var(--amber-subtle)", color: "var(--amber-tle)", border: "1px solid rgba(251,191,36,0.2)" }}>
                      <Star size={10} fill="var(--amber-tle)" />Rated
                    </span>
                  )}
                  {!contest.isPublic && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: "var(--radius-pill)", fontSize: "var(--text-xs)", fontWeight: 600, background: "var(--bg-overlay)", color: "var(--text-muted)", border: "1px solid var(--border-default)" }}>
                      <Lock size={10} />Private
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-3xl)", fontWeight: 900, margin: 0, lineHeight: 1.1, color: "var(--text-primary)", maxWidth: 720 }}>
                  {contest.name}
                </h1>

                {/* Description */}
                {contest.description && (
                  <p style={{ fontSize: "var(--text-base)", color: "var(--text-secondary)", margin: 0, maxWidth: 620, lineHeight: 1.65 }}>
                    {contest.description}
                  </p>
                )}

                {/* Meta */}
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 18 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                    <Calendar size={13} color="var(--text-muted)" />{fmt(contest.startTime)} → {fmt(contest.endTime)}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                    <Users size={13} color="var(--text-muted)" />
                    {contest.totalParticipants ?? 0}{contest.maxParticipant ? ` / ${contest.maxParticipant}` : ""} registered
                  </span>
                  {contest.creatorUsername && (
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>by {contest.creatorUsername}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Body ── */}
      <div className="page-container" style={{ marginTop: "var(--space-8)" }}>
        <div style={{ display: "flex", gap: "var(--space-6)", alignItems: "flex-start" }}>

          {/* ── Left: tabbed main content ── */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border-default)", marginBottom: "var(--space-4)" }}>
              {TABS.map(({ key, label, icon }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "10px 18px", background: "none", border: "none",
                    cursor: "pointer", fontFamily: "var(--font-body)",
                    fontSize: "var(--text-sm)", fontWeight: 600, outline: "none",
                    color: activeTab === key ? "var(--text-primary)" : "var(--text-muted)",
                    borderBottom: `2px solid ${activeTab === key ? "var(--primary)" : "transparent"}`,
                    marginBottom: -1, transition: "color 0.12s",
                  }}>
                  {icon}{label}
                </button>
              ))}
            </div>

            {/* ── Problems tab ── */}
            {activeTab === "problems" && (
              <div style={{ background: "var(--bg-raised)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", overflow: "hidden" }}>
                {/* Gate: not registered, contest not ended */}
                {!registered && !canEdit && status !== "ENDED" ? (
                  <div style={{ padding: "var(--space-6)", borderLeft: "3px solid var(--border-accent)" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <Lock size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <p style={{ fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px 0", fontSize: "var(--text-sm)" }}>Register to access problems</p>
                        <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", margin: 0 }}>Problems are visible only to registered participants.</p>
                      </div>
                    </div>
                  </div>

                /* Gate: registered but contest hasn't started */
                ) : registered && status === "UPCOMING" ? (
                  <div style={{ padding: "var(--space-6)", borderLeft: "3px solid var(--amber-tle)" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <Clock size={16} color="var(--amber-tle)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <p style={{ fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px 0", fontSize: "var(--text-sm)" }}>You're registered — problems unlock at start</p>
                        <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", margin: 0 }}>Problems become available the moment the contest goes live.</p>
                      </div>
                    </div>
                  </div>

                /* No problems yet */
                ) : problems.length === 0 ? (
                  <div style={{ padding: "var(--space-6)" }}>
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No problems added yet.</span>
                  </div>

                /* Problems table */
                ) : (
                  <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--bg-overlay)" }}>
                        <th style={{ width: "7%", textAlign: "center", padding: "10px 8px", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em" }}>#</th>
                        <th style={{ padding: "10px 8px", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em" }}>PROBLEM</th>
                        <th style={{ width: "14%", padding: "10px 8px", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em" }}>DIFFICULTY</th>
                        <th style={{ width: "10%", textAlign: "center", padding: "10px 8px", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--cyan)", letterSpacing: "0.05em" }}>PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {problems.map((p, idx) => {
                        const letter = String.fromCharCode(64 + (p.problemOrder ?? idx + 1));
                        const rowBg  = idx % 2 === 0 ? "var(--bg-raised)" : "var(--bg-overlay)";
                        return (
                          <tr key={p.problemId}
                            style={{ background: rowBg, cursor: "pointer", transition: "background 0.12s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--cyan-subtle)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = rowBg; }}
                            onClick={() => navigate(`/contests/${slug}/problems/${p.problemSlug}`)}>
                            <td style={{ textAlign: "center", padding: "12px 8px" }}>
                              <span style={{
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                width: 28, height: 28, borderRadius: "var(--radius-sm)",
                                background: "var(--primary-subtle)", border: "1px solid var(--border-accent)",
                                fontFamily: "var(--font-code)", fontSize: "var(--text-sm)", fontWeight: 800, color: "var(--primary)",
                              }}>
                                {letter}
                              </span>
                            </td>
                            <td style={{ padding: "12px 8px" }}>
                              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>{p.problemTitle}</span>
                            </td>
                            <td style={{ padding: "12px 8px" }}>
                              {p.problemDifficulty ? <DiffBadge difficulty={p.problemDifficulty} /> : <span style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>—</span>}
                            </td>
                            <td style={{ textAlign: "center", padding: "12px 8px" }}>
                              <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--cyan)" }}>{p.points ?? "—"}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── Leaderboard tab ── */}
            {activeTab === "leaderboard" && (
              <div style={{ background: "var(--bg-raised)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", padding: "var(--space-5)" }}>
                <LeaderboardTable contestId={contest.id} problems={problems} />
              </div>
            )}
          </div>

          {/* ── Right: sidebar ── */}
          <div style={{ width: 272, flexShrink: 0, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

            {/* ── CTA ── */}
            {canEdit ? (
              <button
                style={{ width: "100%", padding: "12px 0", borderRadius: "var(--radius-md)", background: "var(--bg-raised)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontWeight: 700, fontSize: "var(--text-sm)", cursor: "pointer", fontFamily: "var(--font-body)", transition: "border-color 0.12s" }}
                onClick={() => navigate(`/admin/contests/edit/${contest.id}`)}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; }}>
                Edit Contest
              </button>
            ) : registered ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(status === "RUNNING" || status === "ENDED") && problems.length > 0 && (
                  <button className="btn btn-primary"
                    style={{ width: "100%", padding: "13px 0", fontWeight: 800, fontSize: "var(--text-base)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: "var(--radius-md)" }}
                    onClick={() => { const fp = problems[0]; if (fp) navigate(`/contests/${slug}/problems/${fp.problemSlug}`); }}>
                    <BookOpen size={15} />
                    {status === "ENDED" ? "Review Problems" : "Enter Contest"}
                  </button>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 12px", borderRadius: "var(--radius-md)", background: "var(--green-subtle)", border: "1px solid rgba(74,222,128,0.2)" }}>
                  <CheckCircle size={13} color="var(--green-ac)" />
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--green-ac)" }}>You're registered</span>
                </div>
                {status === "UPCOMING" && (
                  <button
                    style={{ width: "100%", padding: "8px 0", borderRadius: "var(--radius-md)", background: "transparent", border: "1px solid var(--border-default)", color: "var(--text-muted)", fontSize: "var(--text-sm)", fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.12s", fontFamily: "var(--font-body)" }}
                    disabled={unregistering} onClick={handleUnregister}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--red-wa)"; e.currentTarget.style.color = "var(--red-wa)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                    <XCircle size={13} />
                    {unregistering ? "Unregistering..." : "Unregister"}
                  </button>
                )}
              </div>
            ) : status === "ENDED" ? (
              <button className="btn btn-primary"
                style={{ width: "100%", padding: "13px 0", fontWeight: 800, fontSize: "var(--text-base)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: "var(--radius-md)" }}
                onClick={() => setActiveTab("leaderboard")}>
                <Trophy size={15} />View Results
              </button>
            ) : (
              <button className="btn btn-primary"
                style={{ width: "100%", padding: "13px 0", fontWeight: 800, fontSize: "var(--text-base)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: "var(--radius-md)" }}
                disabled={registering} onClick={handleRegister}>
                <Medal size={15} />
                {registering ? "Registering..." : "Register Now"}
              </button>
            )}

            {/* ── Countdown ── */}
            {clockTarget && (
              <div style={{ background: "var(--bg-raised)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", padding: "var(--space-4)" }}>
                <SidebarClock targetDate={clockTarget} label={clockLabel} onExpire={reload} />
              </div>
            )}

            {/* ── Contest info ── */}
            <div style={{ background: "var(--bg-raised)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", overflow: "hidden" }}>
              <div style={{ padding: "9px 14px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-overlay)" }}>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Contest Info</span>
              </div>
              <div style={{ padding: "0 var(--space-4)" }}>
                {[
                  ["Style",      contest.contestStyle ?? "—",     false],
                  ["Duration",   contestDuration(contest.startTime, contest.endTime), true],
                  ["Problems",   String(problems.length),          true],
                  ["Max size",   contest.maxParticipant ? String(contest.maxParticipant) : "Unlimited", false],
                  ["Visibility", contest.isPublic ? "Public" : "Private", false],
                  ["Rated",      contest.isRated ? "Yes" : "No",  false],
                  ["Host",       contest.creatorUsername ?? "—",   false],
                ].map(([label, value, mono], i, arr) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)", fontWeight: 600, fontFamily: mono ? "var(--font-code)" : "var(--font-body)" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ContestDetailPage;
