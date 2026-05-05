import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";

// ── helpers ────────────────────────────────────────────────────────────────
const VERDICT_COLORS = {
  AC:  { bg: "#dcfce7", color: "#16a34a", label: "AC"  },
  WA:  { bg: "#fee2e2", color: "#dc2626", label: "WA"  },
  TLE: { bg: "#fef3c7", color: "#d97706", label: "TLE" },
  CE:  { bg: "#e0e7ff", color: "#4f46e5", label: "CE"  },
  MLE: { bg: "#fce7f3", color: "#db2777", label: "MLE" },
  SF:  { bg: "#f3f4f6", color: "#6b7280", label: "SF"  },
};

const fmtTime = (dt) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
};

const fmtShort = (dt) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
};

const problemLabel = (order) =>
  order ? String.fromCharCode(64 + order) : "?";

const acRateColor = (rate) => {
  if (rate >= 70) return "#16a34a";
  if (rate >= 40) return "#d97706";
  return "#dc2626";
};

// ── DonutChart (pure SVG, no deps) ────────────────────────────────────────
const DONUT_SEGMENTS = [
  { key: "acCount",  color: "#16a34a", label: "AC"  },
  { key: "waCount",  color: "#dc2626", label: "WA"  },
  { key: "tleCount", color: "#d97706", label: "TLE" },
  { key: "ceCount",  color: "#4f46e5", label: "CE"  },
  { key: "mleCount", color: "#db2777", label: "MLE" },
  { key: "sfCount",  color: "#6b7280", label: "SF"  },
];

const DonutChart = ({ ps, size = 130 }) => {
  const r = 44;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = ps.totalSubmissions || 0;

  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={16} />
        <text x={cx} y={cy} textAnchor="middle" dy=".35em" fontSize={11} fill="#9ca3af">No data</text>
      </svg>
    );
  }

  let acc = 0;
  const arcs = DONUT_SEGMENTS
    .map((seg) => ({ ...seg, count: ps[seg.key] ?? 0 }))
    .filter((seg) => seg.count > 0)
    .map((seg) => {
      const len = (seg.count / total) * circ;
      const arc = {
        ...seg,
        dashArray: `${len} ${circ - len}`,
        // start at 12 o'clock: dashOffset = circ/4 - accumulated
        dashOffset: circ / 4 - acc,
      };
      acc += len;
      return arc;
    });

  const acCount = ps.acCount ?? 0;
  const acRate  = ps.acRate  ?? 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: "visible" }}>
      {/* background ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={16} />
      {arcs.map((arc, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={arc.color} strokeWidth={16}
          strokeDasharray={arc.dashArray}
          strokeDashoffset={arc.dashOffset}
          style={{ transition: "stroke-dasharray .5s ease" }}
        />
      ))}
      {/* centre label */}
      <text x={cx} y={cy - 7} textAnchor="middle" fontSize={15}
        fontWeight="800" fill={acRateColor(acRate)}>
        {acRate}%
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={10} fill="#9ca3af">
        AC rate
      </text>
    </svg>
  );
};

// ── VerdictBadge ───────────────────────────────────────────────────────────
const VerdictBadge = ({ verdict }) => {
  const cfg = VERDICT_COLORS[verdict] ?? { bg: "#f3f4f6", color: "#6b7280", label: verdict };
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      padding: "1px 8px", borderRadius: 9999,
      fontSize: 12, fontWeight: 700,
    }}>{cfg.label}</span>
  );
};

// ── StatCard ───────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color = "#7c3aed" }) => (
  <div style={{
    background: "#fff", borderRadius: 12, padding: "18px 22px",
    boxShadow: "0 1px 6px rgba(0,0,0,.08)", flex: 1, minWidth: 140,
    borderTop: `3px solid ${color}`,
  }}>
    <div style={{ fontSize: 28, fontWeight: 800, color }}>{value ?? "—"}</div>
    <div style={{ fontSize: 13, color: "#374151", fontWeight: 600, marginTop: 2 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
  </div>
);

// ── SubmissionRow ──────────────────────────────────────────────────────────
const SubmissionRow = ({ s, problems }) => {
  const prob = problems.find((p) => p.problemId === s.problemId);
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "48px 1fr 90px 90px 120px",
      gap: 8, alignItems: "center",
      padding: "8px 12px", borderBottom: "1px solid #f3f4f6", fontSize: 13,
    }}>
      <span style={{ fontWeight: 700, color: "#7c3aed" }}>
        {prob ? problemLabel(prob.problemOrder) : "?"}
      </span>
      <span style={{ color: "#374151", fontFamily: "monospace", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {s.submissionLanguage}
      </span>
      <VerdictBadge verdict={s.submissionVerdict ?? s.submissionStatus} />
      <span style={{ color: "#6b7280" }}>{s.executionTime != null ? `${s.executionTime}ms` : "—"}</span>
      <span style={{ color: "#9ca3af", fontSize: 11 }}>{fmtShort(s.submissionDate)}</span>
    </div>
  );
};

// ── CodeModal ──────────────────────────────────────────────────────────────
const CodeModal = ({ submission, onClose }) => {
  if (!submission) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: "#1e1e2e", borderRadius: 14, width: "min(900px, 95vw)",
        maxHeight: "85vh", display: "flex", flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,.5)",
      }} onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 20px", borderBottom: "1px solid #313244",
        }}>
          <div>
            <span style={{ color: "#cdd6f4", fontWeight: 700, fontSize: 15 }}>
              Source Code
            </span>
            <span style={{ color: "#7c3aed", marginLeft: 10, fontSize: 13 }}>
              {submission.submissionLanguage}
            </span>
            <VerdictBadge verdict={submission.submissionVerdict ?? submission.submissionStatus} />
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#6c7086",
            fontSize: 22, cursor: "pointer", lineHeight: 1,
          }}>✕</button>
        </div>
        {/* code */}
        <pre style={{
          flex: 1, overflow: "auto", margin: 0,
          padding: "18px 20px", fontSize: 13,
          color: "#cdd6f4", fontFamily: "'Fira Code', 'Cascadia Code', monospace",
          lineHeight: 1.6, background: "transparent",
        }}>
          {submission.sourceCode ?? "(no source code)"}
        </pre>
        <div style={{
          padding: "10px 20px", borderTop: "1px solid #313244",
          fontSize: 11, color: "#6c7086", display: "flex", gap: 20,
        }}>
          <span>Submitted: {fmtTime(submission.submissionDate)}</span>
          {submission.executionTime != null && <span>Time: {submission.executionTime}ms</span>}
          {submission.memoryUsed != null && <span>Mem: {submission.memoryUsed}MB</span>}
          {submission.testCasesPassed != null && (
            <span>Tests: {submission.testCasesPassed}/{submission.totalTestCases}</span>
          )}
        </div>
      </div>
    </div>
  );
};

// ── AdminContestMonitorPage ────────────────────────────────────────────────
const POLL_OPTIONS = [
  { label: "5s",  value: 5000  },
  { label: "10s", value: 10000 },
  { label: "30s", value: 30000 },
  { label: "Off", value: 0     },
];

const AdminContestMonitorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showMessage } = useToast();

  const [monitor, setMonitor]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [pollInterval, setPollInterval] = useState(10000);
  const [lastTick, setLastTick]         = useState(null);

  const [selectedUser, setSelectedUser]   = useState(null);
  const [userSubs, setUserSubs]           = useState([]);
  const [subsLoading, setSubsLoading]     = useState(false);
  const [selectedProblemFilter, setSelectedProblemFilter] = useState(null);
  const [codeView, setCodeView]           = useState(null);

  // participant search + pagination
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantPage,   setParticipantPage]   = useState(0);
  const PAGE_SIZE = 10;

  const timerRef = useRef(null);

  const fetchMonitor = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const resp = await ApiService.getContestMonitor(id);
      if (resp.statusCode === 200) {
        setMonitor(resp.data);
        setLastTick(new Date());
      }
    } catch (err) {
      if (!silent) showMessage(err.response?.data?.message || err.message, "error");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  // initial load
  useEffect(() => { fetchMonitor(false); }, [fetchMonitor]);

  // polling
  useEffect(() => {
    clearInterval(timerRef.current);
    if (pollInterval > 0) {
      timerRef.current = setInterval(() => fetchMonitor(true), pollInterval);
    }
    return () => clearInterval(timerRef.current);
  }, [pollInterval, fetchMonitor]);

  // fetch participant submissions
  const openUserDrawer = async (participant) => {
    setSelectedUser(participant);
    setSelectedProblemFilter(null);
    setUserSubs([]);
    setSubsLoading(true);
    try {
      const resp = await ApiService.getContestMonitorSubmissions(
        id, participant.userId, null
      );
      if (resp.statusCode === 200) setUserSubs(resp.data ?? []);
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    } finally {
      setSubsLoading(false);
    }
  };

  const filteredSubs = selectedProblemFilter
    ? userSubs.filter((s) => s.problemId === selectedProblemFilter)
    : userSubs;

  // participant search + pagination (client-side)
  const allParticipants = monitor?.participantStats ?? [];
  const searchedParticipants = participantSearch.trim()
    ? allParticipants.filter((p) =>
        p.username.toLowerCase().includes(participantSearch.toLowerCase()) ||
        String(p.userId).includes(participantSearch.trim())
      )
    : allParticipants;
  const totalParticipantPages = Math.max(1, Math.ceil(searchedParticipants.length / PAGE_SIZE));
  const safeParticipantPage   = Math.min(participantPage, totalParticipantPages - 1);
  const pagedParticipants     = searchedParticipants.slice(
    safeParticipantPage * PAGE_SIZE,
    (safeParticipantPage + 1) * PAGE_SIZE
  );

  const handleSearchChange = (val) => {
    setParticipantSearch(val);
    setParticipantPage(0);  // reset to page 0 on new search
  };

  if (loading && !monitor) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f7ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: "4px solid #e9d5ff", borderTop: "4px solid #7c3aed", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#6b7280" }}>Loading monitor…</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const m = monitor;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7ff", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        body{margin:0}
        *{box-sizing:border-box}
      `}</style>

      {/* ── Top bar ── */}
      <div style={{
        background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
        padding: "0 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 60, position: "sticky", top: 0, zIndex: 10,
        boxShadow: "0 2px 12px rgba(124,58,237,.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => navigate("/admin/contests")} style={{
            background: "rgba(255,255,255,.15)", border: "none", color: "#fff",
            borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 13,
          }}>← Back</button>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>
            📊 {m?.contestName ?? "Contest Monitor"}
          </span>
          {/* live indicator */}
          {pollInterval > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", background: "#4ade80",
                animation: "pulse 1.5s infinite",
              }} />
              <span style={{ color: "#a7f3d0", fontSize: 12 }}>Live</span>
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#c4b5fd", fontSize: 12 }}>
            {lastTick ? `Updated ${fmtShort(lastTick)}` : ""}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            {POLL_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setPollInterval(o.value)} style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                fontWeight: 600, border: "none",
                background: pollInterval === o.value ? "#fff" : "rgba(255,255,255,.15)",
                color: pollInterval === o.value ? "#7c3aed" : "#e9d5ff",
              }}>{o.label}</button>
            ))}
          </div>
          <button onClick={() => fetchMonitor(false)} style={{
            background: "rgba(255,255,255,.2)", border: "none", color: "#fff",
            borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 13,
          }}>↻ Refresh</button>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 24px" }}>

        {/* ── Summary cards ── */}
        {m && (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
            <StatCard label="Registered"         value={m.totalRegistered}         color="#7c3aed" />
            <StatCard label="Active Participants" value={m.totalActiveParticipants}  color="#4f46e5" />
            <StatCard label="Total Submissions"   value={m.totalSubmissions}         color="#0891b2" />
            <StatCard label="Pending / Running"   value={m.pendingSubmissions}       color={m.pendingSubmissions > 0 ? "#d97706" : "#6b7280"} />
          </div>
        )}

        {/* ── Problem stats ── */}
        <section style={{
          background: "#fff", borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,.07)",
          marginBottom: 28, overflow: "hidden",
        }}>
          <div style={{ padding: "16px 22px", borderBottom: "1px solid #f3f4f6" }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>
              Problem Statistics
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9ca3af" }}>
              Verdict breakdown per problem — lower AC rate = harder problem
            </p>
          </div>

          {/* header row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "50px 1fr 70px 70px 70px 70px 70px 70px 80px 100px",
            gap: 6, padding: "8px 22px",
            background: "#faf5ff", fontSize: 12, fontWeight: 700, color: "#7c3aed",
          }}>
            <span>#</span><span>Problem</span>
            <span style={{ textAlign: "center" }}>Total</span>
            <span style={{ textAlign: "center", color: "#16a34a" }}>AC</span>
            <span style={{ textAlign: "center", color: "#dc2626" }}>WA</span>
            <span style={{ textAlign: "center", color: "#d97706" }}>TLE</span>
            <span style={{ textAlign: "center", color: "#4f46e5" }}>CE</span>
            <span style={{ textAlign: "center", color: "#db2777" }}>MLE</span>
            <span style={{ textAlign: "center", color: "#6b7280" }}>SF</span>
            <span style={{ textAlign: "center" }}>AC Rate</span>
          </div>

          {(m?.problemStats ?? []).length === 0 ? (
            <div style={{ padding: "40px 22px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
              No submissions yet
            </div>
          ) : (
            (m?.problemStats ?? []).map((ps) => (
              <div key={ps.problemId} style={{
                display: "grid",
                gridTemplateColumns: "50px 1fr 70px 70px 70px 70px 70px 70px 80px 100px",
                gap: 6, padding: "12px 22px", alignItems: "center",
                borderBottom: "1px solid #faf5ff", fontSize: 13,
                transition: "background .15s",
              }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#faf5ff"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ fontWeight: 800, color: "#7c3aed", fontSize: 15 }}>
                  {problemLabel(ps.problemOrder)}
                </span>
                <span style={{ fontWeight: 600, color: "#111827" }}>{ps.problemTitle}</span>
                <span style={{ textAlign: "center", color: "#374151" }}>{ps.totalSubmissions}</span>
                <span style={{ textAlign: "center", fontWeight: 700, color: "#16a34a" }}>{ps.acCount}</span>
                <span style={{ textAlign: "center", fontWeight: 700, color: "#dc2626" }}>{ps.waCount}</span>
                <span style={{ textAlign: "center", fontWeight: 700, color: "#d97706" }}>{ps.tleCount}</span>
                <span style={{ textAlign: "center", fontWeight: 700, color: "#4f46e5" }}>{ps.ceCount}</span>
                <span style={{ textAlign: "center", fontWeight: 700, color: "#db2777" }}>{ps.mleCount}</span>
                <span style={{ textAlign: "center", fontWeight: 700, color: "#6b7280" }}>{ps.sfCount}</span>
                <div style={{ textAlign: "center" }}>
                  <span style={{
                    fontWeight: 800, fontSize: 13,
                    color: acRateColor(ps.acRate ?? 0),
                  }}>{ps.acRate ?? 0}%</span>
                  {/* mini bar */}
                  <div style={{ height: 3, background: "#f3f4f6", borderRadius: 9, marginTop: 3 }}>
                    <div style={{
                      height: "100%", borderRadius: 9,
                      width: `${ps.acRate ?? 0}%`,
                      background: acRateColor(ps.acRate ?? 0),
                      transition: "width .4s",
                    }} />
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

        {/* ── Verdict Distribution Charts (after problem stats) ── */}
        {(m?.problemStats ?? []).length > 0 && (
          <section style={{
            background: "#fff", borderRadius: 14,
            boxShadow: "0 1px 8px rgba(0,0,0,.07)",
            marginBottom: 28, overflow: "hidden",
          }}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid #f3f4f6" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>
                Verdict Distribution
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9ca3af" }}>
                Per-problem donut charts
              </p>
            </div>
            <div style={{ display: "flex", gap: 0, overflowX: "auto", padding: "4px 0" }}>
              {(m?.problemStats ?? []).map((ps) => (
                <div key={ps.problemId} style={{
                  flex: "0 0 auto", minWidth: 200,
                  padding: "20px 18px", textAlign: "center",
                  borderRight: "1px solid #f3f4f6",
                }}>
                  <div style={{ marginBottom: 10 }}>
                    <span style={{
                      display: "inline-block", background: "#ede9fe", color: "#7c3aed",
                      fontWeight: 800, fontSize: 18,
                      width: 36, height: 36, lineHeight: "36px", borderRadius: "50%",
                    }}>{problemLabel(ps.problemOrder)}</span>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4, fontWeight: 500 }}>
                      {ps.problemTitle}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <DonutChart ps={ps} size={130} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", justifyContent: "center", fontSize: 11 }}>
                    {DONUT_SEGMENTS.map((seg) => {
                      const count = ps[seg.key] ?? 0;
                      if (count === 0) return null;
                      return (
                        <span key={seg.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: seg.color, display: "inline-block" }} />
                          <span style={{ fontWeight: 600, color: seg.color }}>{seg.label}</span>
                          <span style={{ color: "#374151" }}>{count}</span>
                        </span>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: "#9ca3af" }}>{ps.totalSubmissions} total</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Participant stats + side panel ── */}
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

          {/* Participant table */}
          <section style={{
            flex: 1, background: "#fff", borderRadius: 14,
            boxShadow: "0 1px 8px rgba(0,0,0,.07)", overflow: "hidden",
          }}>
            {/* header + search */}
            <div style={{ padding: "16px 22px", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>
                    Participants ({allParticipants.length})
                  </h2>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9ca3af" }}>
                    Click row to view submissions · Click name to open profile
                  </p>
                </div>
                {/* search box */}
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                    color: "#9ca3af", fontSize: 14, pointerEvents: "none",
                  }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search by name or ID…"
                    value={participantSearch}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    style={{
                      paddingLeft: 32, paddingRight: 12, paddingTop: 6, paddingBottom: 6,
                      border: "1.5px solid #e5e7eb", borderRadius: 8,
                      fontSize: 13, outline: "none", width: 220,
                      transition: "border-color .15s",
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#7c3aed"}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>
              </div>
            </div>

            {/* column header */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 70px 70px 160px",
              gap: 8, padding: "8px 22px",
              background: "#faf5ff", fontSize: 12, fontWeight: 700, color: "#7c3aed",
            }}>
              <span>Participant</span>
              <span style={{ textAlign: "center" }}>Subs</span>
              <span style={{ textAlign: "center" }}>Solved</span>
              <span>Last Submission</span>
            </div>

            {searchedParticipants.length === 0 ? (
              <div style={{ padding: "40px 22px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                {participantSearch ? `No results for "${participantSearch}"` : "No participants yet"}
              </div>
            ) : (
              pagedParticipants.map((p) => {
                const isSelected = selectedUser?.userId === p.userId;
                return (
                  <div key={p.userId}
                    onClick={() => openUserDrawer(p)}
                    style={{
                      display: "grid", gridTemplateColumns: "1fr 70px 70px 160px",
                      gap: 8, padding: "11px 22px", alignItems: "center",
                      borderBottom: "1px solid #faf5ff", fontSize: 13, cursor: "pointer",
                      background: isSelected ? "#ede9fe" : "transparent",
                      transition: "background .15s",
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#faf5ff"; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = isSelected ? "#ede9fe" : "transparent"; }}
                  >
                    {/* username → profile link */}
                    <span
                      onClick={(e) => { e.stopPropagation(); navigate(`/users/${p.username}`); }}
                      style={{
                        fontWeight: isSelected ? 700 : 500,
                        color: "#7c3aed",
                        textDecoration: "underline",
                        textDecorationColor: "transparent",
                        cursor: "pointer",
                        transition: "text-decoration-color .15s",
                      }}
                      onMouseEnter={(e) => e.target.style.textDecorationColor = "#7c3aed"}
                      onMouseLeave={(e) => e.target.style.textDecorationColor = "transparent"}
                      title={`Open ${p.username}'s profile`}
                    >
                      {p.username}
                    </span>
                    <span style={{ textAlign: "center", color: "#374151" }}>{p.totalSubmissions}</span>
                    <span style={{ textAlign: "center", fontWeight: 700, color: "#16a34a" }}>{p.problemsSolved}</span>
                    <span style={{ color: "#6b7280", fontSize: 12 }}>{fmtShort(p.lastSubmissionTime)}</span>
                  </div>
                );
              })
            )}

            {/* pagination */}
            {totalParticipantPages > 1 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 4, padding: "12px 22px", borderTop: "1px solid #f3f4f6", flexWrap: "wrap",
              }}>
                {/* Prev */}
                <button
                  disabled={safeParticipantPage === 0}
                  onClick={() => setParticipantPage(safeParticipantPage - 1)}
                  style={{
                    padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    border: "1px solid #e5e7eb", cursor: safeParticipantPage === 0 ? "not-allowed" : "pointer",
                    background: safeParticipantPage === 0 ? "#f9fafb" : "#fff",
                    color: safeParticipantPage === 0 ? "#9ca3af" : "#374151",
                  }}
                >← Prev</button>

                {/* page numbers */}
                {Array.from({ length: totalParticipantPages }, (_, i) => i).map((p) => (
                  <button key={p}
                    onClick={() => setParticipantPage(p)}
                    style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                      border: `1px solid ${p === safeParticipantPage ? "#7c3aed" : "#e5e7eb"}`,
                      background: p === safeParticipantPage ? "#7c3aed" : "#fff",
                      color: p === safeParticipantPage ? "#fff" : "#374151",
                      cursor: p === safeParticipantPage ? "default" : "pointer",
                    }}
                  >{p + 1}</button>
                ))}

                {/* Next */}
                <button
                  disabled={safeParticipantPage >= totalParticipantPages - 1}
                  onClick={() => setParticipantPage(safeParticipantPage + 1)}
                  style={{
                    padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    border: "1px solid #e5e7eb",
                    cursor: safeParticipantPage >= totalParticipantPages - 1 ? "not-allowed" : "pointer",
                    background: safeParticipantPage >= totalParticipantPages - 1 ? "#f9fafb" : "#fff",
                    color: safeParticipantPage >= totalParticipantPages - 1 ? "#9ca3af" : "#374151",
                  }}
                >Next →</button>

                <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 6 }}>
                  Page {safeParticipantPage + 1} of {totalParticipantPages}
                  {searchedParticipants.length > 0 && ` · ${searchedParticipants.length} results`}
                </span>
              </div>
            )}
          </section>

          {/* Submission side panel */}
          {selectedUser && (
            <section style={{
              width: 480, background: "#fff", borderRadius: 14,
              boxShadow: "0 1px 8px rgba(0,0,0,.07)", overflow: "hidden",
              position: "sticky", top: 72,
            }}>
              {/* panel header */}
              <div style={{
                padding: "14px 18px", borderBottom: "1px solid #f3f4f6",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "linear-gradient(135deg,#ede9fe,#e0e7ff)",
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#4f46e5", fontSize: 15 }}>
                    {selectedUser.username}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                    {userSubs.length} submission{userSubs.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <button onClick={() => setSelectedUser(null)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 18, color: "#6b7280",
                }}>✕</button>
              </div>

              {/* problem filter pills */}
              {m?.problemStats?.length > 0 && (
                <div style={{
                  display: "flex", gap: 6, padding: "10px 14px",
                  overflowX: "auto", borderBottom: "1px solid #f3f4f6",
                }}>
                  <button onClick={() => setSelectedProblemFilter(null)} style={{
                    padding: "3px 12px", borderRadius: 9999, fontSize: 12, cursor: "pointer",
                    fontWeight: 600, border: "1.5px solid",
                    borderColor: !selectedProblemFilter ? "#7c3aed" : "#e5e7eb",
                    background: !selectedProblemFilter ? "#ede9fe" : "#fff",
                    color: !selectedProblemFilter ? "#7c3aed" : "#6b7280",
                  }}>All</button>
                  {m.problemStats.map((ps) => (
                    <button key={ps.problemId}
                      onClick={() => setSelectedProblemFilter(ps.problemId)}
                      style={{
                        padding: "3px 12px", borderRadius: 9999, fontSize: 12, cursor: "pointer",
                        fontWeight: 600, border: "1.5px solid",
                        borderColor: selectedProblemFilter === ps.problemId ? "#7c3aed" : "#e5e7eb",
                        background: selectedProblemFilter === ps.problemId ? "#ede9fe" : "#fff",
                        color: selectedProblemFilter === ps.problemId ? "#7c3aed" : "#6b7280",
                        whiteSpace: "nowrap",
                      }}>
                      {problemLabel(ps.problemOrder)}
                    </button>
                  ))}
                </div>
              )}

              {/* submissions list */}
              <div style={{ maxHeight: "calc(100vh - 260px)", overflowY: "auto" }}>
                {/* column header */}
                <div style={{
                  display: "grid", gridTemplateColumns: "48px 1fr 90px 90px 120px",
                  gap: 8, padding: "6px 12px",
                  background: "#faf5ff", fontSize: 11, fontWeight: 700, color: "#7c3aed",
                }}>
                  <span>#</span><span>Lang</span><span>Verdict</span><span>Time</span><span>Submitted</span>
                </div>

                {subsLoading ? (
                  <div style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>
                    Loading…
                  </div>
                ) : filteredSubs.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                    No submissions
                  </div>
                ) : (
                  filteredSubs.map((s) => (
                    <div key={s.id}
                      onClick={() => setCodeView(s)}
                      style={{ cursor: "pointer" }}
                      title="Click to view source code"
                    >
                      <SubmissionRow s={s} problems={m?.problemStats ?? []} />
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* code view modal */}
      <CodeModal submission={codeView} onClose={() => setCodeView(null)} />
    </div>
  );
};

export default AdminContestMonitorPage;
