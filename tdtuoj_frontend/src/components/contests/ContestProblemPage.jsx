import { useState, useEffect, useRef } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useParams, useNavigate } from "react-router-dom";
import {
  CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight,
  Menu, X, Timer, HardDrive, Terminal, Zap, Trophy, ArrowLeft,
} from "lucide-react";
import { useToast } from "../common/ToastMessage";
import ApiService from "../../services/ApiService";
import ReactMarkdown from "react-markdown";
import CodeEditor from "../CodeEditor/CodeEditor";
import hljs from "highlight.js/lib/core";
import cpp from "highlight.js/lib/languages/cpp";
import java from "highlight.js/lib/languages/java";
import python from "highlight.js/lib/languages/python";
import c from "highlight.js/lib/languages/c";
import csharp from "highlight.js/lib/languages/csharp";
import javascript from "highlight.js/lib/languages/javascript";
import "highlight.js/styles/vs2015.css";

hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("java", java);
hljs.registerLanguage("python", python);
hljs.registerLanguage("c", c);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("javascript", javascript);

const getHljsLanguage = (lang) => {
  switch (lang) {
    case "CPP":    return "cpp";
    case "JAVA":   return "java";
    case "PYTHON": return "python";
    case "C":          return "c";
    case "CSHARP":     return "csharp";
    case "JAVASCRIPT": return "javascript";
    default:           return "cpp";
  }
};

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:           "var(--bg-void)",
  surface:      "var(--bg-base)",
  surfaceHover: "var(--bg-hover)",
  border:       "var(--border-default)",
  borderBright: "var(--border-strong)",
  text:         "var(--text-primary)",
  textMuted:    "var(--text-secondary)",
  textDim:      "var(--text-muted)",
  accent:       "var(--primary)",
  accentDim:    "var(--primary-subtle)",
  accentBorder: "var(--border-accent)",
  green:        "var(--green-ac)",
  greenDim:     "var(--green-subtle)",
  red:          "var(--red-wa)",
  redDim:       "var(--red-subtle)",
  blue:         "var(--blue-ce)",
  blueDim:      "var(--blue-subtle)",
};

const mapEditorLanguageToSubmissionLanguage = (language) => {
  switch (language) {
    case "cpp":    return "CPP";
    case "java":   return "JAVA";
    case "python": return "PYTHON";
    case "c":          return "C";
    case "csharp":     return "CSHARP";
    case "javascript": return "JAVASCRIPT";
    default:           return "CPP";
  }
};

const VERDICT_LABEL = {
  AC:  "Accepted",
  WA:  "Wrong Answer",
  CE:  "Compilation Error",
  TLE: "Time Limit Exceeded",
  MLE: "Memory Limit Exceeded",
  SF:  "Runtime Error",
};

const VERDICT_COLOR = {
  AC:  { c: "var(--green-ac)",  bg: "var(--green-subtle)"  },
  WA:  { c: "var(--red-wa)",    bg: "var(--red-subtle)"    },
  TLE: { c: "var(--amber-tle)", bg: "var(--amber-subtle)"  },
  CE:  { c: "var(--blue-ce)",   bg: "var(--blue-subtle)"   },
  MLE: { c: "var(--text-muted)","bg": "var(--bg-overlay)"  },
};

const DIFF_STYLE = {
  EASY:   { color: T.green,  bg: T.greenDim,  label: "Easy"   },
  MEDIUM: { color: T.accent, bg: T.accentDim, label: "Medium" },
  HARD:   { color: T.red,    bg: T.redDim,    label: "Hard"   },
};

// ─── Resize Handle ────────────────────────────────────────────────────────────
const ResizeHandle = ({ direction = "horizontal" }) => {
  const [active, setActive] = useState(false);
  const isH = direction === "horizontal";
  return (
    <PanelResizeHandle
      onDragging={setActive}
      style={{
        width: isH ? "5px" : "100%", height: !isH ? "5px" : "100%",
        background: active ? T.accent : T.border,
        cursor: isH ? "col-resize" : "row-resize",
        flexShrink: 0, transition: "background 0.15s",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", zIndex: 10,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = T.accent; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = T.border; }}
    >
      <div style={{
        width: isH ? "3px" : "28px", height: isH ? "28px" : "3px",
        borderRadius: "3px",
        background: active ? T.accent : T.textDim,
        opacity: active ? 1 : 0.4,
        transition: "background 0.15s, opacity 0.15s",
        pointerEvents: "none",
      }} />
    </PanelResizeHandle>
  );
};

// ─── Small components ─────────────────────────────────────────────────────────

const DifficultyBadge = ({ difficulty }) => {
  const s = DIFF_STYLE[difficulty] || DIFF_STYLE.EASY;
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "0.04em", color: s.color, background: s.bg, border: `1px solid ${s.color}44` }}>
      {s.label}
    </span>
  );
};

const StatChip = ({ icon, value, color }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: "4px", background: T.surface, border: `1px solid ${T.border}`, fontSize: "var(--text-xs)", color: color || T.textMuted, fontWeight: 500, fontFamily: "var(--font-code)" }}>
    {icon} {value}
  </span>
);

const TagChip = ({ name }) => (
  <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: "var(--radius-pill)", fontSize: "var(--text-xs)", fontWeight: 500, fontFamily: "var(--font-body)", color: "var(--text-secondary)", background: "var(--bg-overlay)", border: "1px solid var(--border-default)", letterSpacing: "0.02em", whiteSpace: "nowrap", transition: "border-color 0.15s, color 0.15s", cursor: "default" }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
    {name}
  </span>
);

// ─── Countdown hook ───────────────────────────────────────────────────────────
const useCountdown = (targetDateStr) => {
  const get = () => {
    if (!targetDateStr) return null;
    const diff = new Date(targetDateStr).getTime() - Date.now();
    if (diff <= 0) return null;
    return {
      total: diff,
      hours:   Math.floor(diff / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  };
  const [r, setR] = useState(get);
  useEffect(() => {
    setR(get());
    const id = setInterval(() => setR(get()), 1000);
    return () => clearInterval(id);
  }, [targetDateStr]);
  return r;
};

// ─── Contest Timer ────────────────────────────────────────────────────────────
const ContestTimer = ({ endTime }) => {
  const r = useCountdown(endTime);
  const pad = (n) => String(n).padStart(2, "0");

  if (!r) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: "var(--radius-pill)", background: T.redDim, border: `1px solid ${T.red}33`, fontSize: "var(--text-xs)", fontWeight: 700, color: T.red }}>
        <Clock size={12} />Contest Ended
      </span>
    );
  }

  const isUrgent = r.total < 5 * 60 * 1000;
  const color = isUrgent ? T.red : T.green;
  const bg    = isUrgent ? T.redDim : T.greenDim;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: "var(--radius-pill)", background: bg, border: `1px solid ${color}33`, fontSize: "var(--text-xs)", fontWeight: 700, fontFamily: "var(--font-code)", color }}>
      <Clock size={12} />{pad(r.hours)}:{pad(r.minutes)}:{pad(r.seconds)}
    </span>
  );
};

// ─── Problem Sidebar ──────────────────────────────────────────────────────────
const ProblemSidebar = ({ problems, currentSlug, contestSlug, onNavigate, onClose }) => (
  <div style={{ width: 232, height: "100%", background: T.surface, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: T.textDim, letterSpacing: "0.06em", textTransform: "uppercase" }}>Problems</span>
      <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: T.textMuted, outline: "none", display: "flex", alignItems: "center", padding: 2, borderRadius: "var(--radius-sm)", transition: "color 0.12s" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = T.text; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; }}>
        <X size={14} />
      </button>
    </div>
    <div style={{ flex: 1, overflowY: "auto" }}>
      {problems.map((p, idx) => {
        const letter   = String.fromCharCode(65 + (p.problemOrder ?? idx + 1) - 1);
        const isActive = p.problemSlug === currentSlug;
        const diff     = DIFF_STYLE[p.problemDifficulty];
        return (
          <button key={p.problemId}
            onClick={() => onNavigate(`/contests/${contestSlug}/problems/${p.problemSlug}`)}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", background: isActive ? T.accentDim : "transparent", borderLeft: isActive ? `3px solid ${T.accent}` : "3px solid transparent", border: "none", borderRight: "none", borderTop: "none", borderBottom: "none", cursor: "pointer", outline: "none", textAlign: "left", transition: "background 0.1s" }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = T.surfaceHover; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
            <span style={{ width: 26, height: 26, borderRadius: "var(--radius-sm)", background: isActive ? T.accent : T.bg, color: isActive ? "#000" : T.textMuted, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "var(--text-xs)", fontFamily: "var(--font-code)", flexShrink: 0 }}>
              {letter}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: isActive ? T.text : T.textMuted, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.problemTitle}
              </p>
              {diff && <p style={{ fontSize: 10, color: diff.color, fontWeight: 600, margin: 0 }}>{diff.label}</p>}
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

// ─── Markdown styles ──────────────────────────────────────────────────────────
const MD_STYLE = `
  .cpmd h1,.cpmd h2,.cpmd h3,.cpmd h4 { font-weight:700; color:var(--text-primary); margin-bottom:.6rem; margin-top:1.4rem; }
  .cpmd h1{font-size:1.2rem} .cpmd h2{font-size:1.05rem} .cpmd h3{font-size:.95rem;color:var(--text-secondary)}
  .cpmd p{margin-bottom:.9rem;color:var(--text-secondary)}
  .cpmd code{background:var(--bg-void);padding:.15rem .45rem;border-radius:4px;font-size:.85em;font-family:var(--font-code);color:var(--primary);border:1px solid var(--border-default)}
  .cpmd pre{background:var(--bg-void);padding:1rem 1.2rem;border-radius:8px;overflow-x:auto;margin-bottom:1rem;border:1px solid var(--border-default)}
  .cpmd pre code{background:transparent;padding:0;color:#e2e8f0;border:none;font-size:.85rem}
  .cpmd ul,.cpmd ol{padding-left:1.4rem;margin-bottom:.9rem}
  .cpmd li{margin-bottom:.35rem;color:var(--text-secondary)}
  .cpmd strong{font-weight:700;color:var(--text-primary)}
  .cpmd blockquote{border-left:3px solid var(--primary);padding-left:1rem;margin-left:0;color:var(--text-secondary);font-style:italic}
`;

// ─── Main Page ────────────────────────────────────────────────────────────────
const ContestProblemPage = () => {
  const { contestSlug, problemSlug } = useParams();
  const navigate = useNavigate();
  const { showMessage } = useToast();
  const codeEditorRef = useRef(null);

  const [contest, setContest]           = useState(null);
  const [contestEnded, setContestEnded] = useState(false);
  const [problem, setProblem]           = useState(null);
  const [statement, setStatement]       = useState("");
  const [testCases, setTestCases]       = useState([]);
  const [loading, setLoading]           = useState(true);

  const [submitting, setSubmitting]         = useState(false);
  const [results, setResults]               = useState(null);
  const [pollingId, setPollingId]           = useState(null);
  const [queuePosition, setQueuePosition]   = useState(null);

  const [activeTab, setActiveTab]                   = useState("description");
  const [viewingSubmission, setViewingSubmission]   = useState(null);
  const [verdictFilter, setVerdictFilter]           = useState(null);
  const [submissions, setSubmissions]               = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionsLoaded, setSubmissionsLoaded]   = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Fetch contest ──
  useEffect(() => {
    let cancelled = false;
    ApiService.getContestBySlug(contestSlug).then((resp) => {
      if (!cancelled && resp.statusCode === 200) {
        setContest(resp.data);
        if (new Date(resp.data.endTime).getTime() <= Date.now()) setContestEnded(true);
      }
    }).catch((err) => { if (!cancelled) showMessage(err.response?.data?.message || err.message, "error"); });
    return () => { cancelled = true; };
  }, [contestSlug]);

  // ── Watch for contest end ──
  useEffect(() => {
    if (!contest?.endTime || contestEnded) return;
    const diff = new Date(contest.endTime).getTime() - Date.now();
    if (diff <= 0) { setContestEnded(true); return; }
    const id = setTimeout(() => {
      setContestEnded(true);
      showMessage("Contest has ended! Submissions are now disabled.", "warning");
      setTimeout(() => window.location.reload(), 3000);
    }, diff);
    return () => clearTimeout(id);
  }, [contest?.endTime, contestEnded]);

  // ── Fetch problem ──
  const fetchProblem = async () => {
    setLoading(true);
    try {
      const resp = await ApiService.getProblemBySlug(problemSlug);
      if (resp.statusCode === 200) {
        setProblem(resp.data);
        const statementRes = await ApiService.fetchFileContent(resp.data.statementFileUrl);
        setStatement(statementRes);
        const samples = resp.data.testCases.filter((tc) => tc.isSample === true);
        const fetched = await Promise.all(samples.map(async (tc) => ({
          id: tc.id,
          input:  await ApiService.fetchFileContent(tc.inputFileUrl),
          output: await ApiService.fetchFileContent(tc.expectedOutputFileUrl),
        })));
        setTestCases(fetched);
      }
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    setResults(null); setSubmitting(false); setActiveTab("description");
    setViewingSubmission(null); setVerdictFilter(null);
    setSubmissions([]); setSubmissionsLoaded(false);
    fetchProblem();
  }, [problemSlug]);

  useEffect(() => { return () => { if (pollingId) clearInterval(pollingId); }; }, [pollingId]);

  // ── Submissions ──
  const fetchSubmissions = async () => {
    if (!problem?.id) return;
    setLoadingSubmissions(true);
    try {
      const resp = await ApiService.getMySubmissions({ limit: 20, offset: 0, problemId: problem.id });
      if (resp.statusCode === 200 && resp.data) { setSubmissions(resp.data.content || []); setSubmissionsLoaded(true); }
    } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); }
    finally { setLoadingSubmissions(false); }
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (submitting || contestEnded || !codeEditorRef.current) return;
    const { code, language } = codeEditorRef.current.getCodeAndLanguage();
    if (!code?.trim()) { showMessage("Please write some code before submitting", "warning"); return; }

    setSubmitting(true); setResults(null); setQueuePosition(null);
    try {
      const resp = await ApiService.createSubmission({
        sourceCode: code, submissionLanguage: mapEditorLanguageToSubmissionLanguage(language),
        problemId: problem.id, isPublic: true, contestId: contest?.id ?? null,
      });
      const sub = resp.data;
      setQueuePosition(sub.queuePosition ?? null);
      setActiveTab("results");

      const intervalId = setInterval(async () => {
        try {
          const sr = await ApiService.getSubmissionStatus(sub.id);
          const up = sr.data;
          if (up.submissionStatus === "PENDING")   { setQueuePosition(up.queuePosition ?? null); }
          else if (up.submissionStatus === "RUNNING") { setQueuePosition(null); }
          else if (up.submissionStatus === "COMPLETED") {
            clearInterval(intervalId); setPollingId(null); setSubmitting(false); setQueuePosition(null);
            const allPassed = up.submissionVerdict === "AC";
            if (allPassed && !problem?.solved) setProblem((p) => ({ ...p, solved: true, attempted: false }));
            else if (!allPassed) setProblem((p) => ({ ...p, attempted: true }));
            setResults({ allPassed, passedCount: up.testCasesPassed ?? 0, totalCount: up.totalTestCases ?? testCases.length, verdict: up.submissionVerdict, errorMessage: up.errorMessage, executionTime: up.executionTime, memoryUsed: up.memoryUsed });
            showMessage(allPassed ? "All test cases passed!" : `${up.testCasesPassed}/${up.totalTestCases} passed — ${up.submissionVerdict}`, allPassed ? "success" : "warning");
            if (submissionsLoaded) await fetchSubmissions();
          }
        } catch (err) { clearInterval(intervalId); setPollingId(null); setSubmitting(false); showMessage(err.response?.data?.message || err.message, "error"); }
      }, 2000);
      setPollingId(intervalId);
    } catch (err) {
      setSubmitting(false);
      if (err.response?.status === 429) showMessage("Please wait 5 seconds before submitting again", "warning");
      else showMessage(err.response?.data?.message || err.message, "error");
    }
  };

  const problems    = contest?.problems ?? [];
  const currentIdx  = problems.findIndex((p) => p.problemSlug === problemSlug);
  const prevProblem = currentIdx > 0 ? problems[currentIdx - 1] : null;
  const nextProblem = currentIdx < problems.length - 1 ? problems[currentIdx + 1] : null;
  const goTo        = (p) => navigate(`/contests/${contestSlug}/problems/${p.problemSlug}`);
  const activeTags  = (problem?.tags || []).filter((t) => t.isActive !== false);

  if (loading || !contest) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: T.bg }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div className="spinner" style={{ borderTopColor: T.accent }} />
          <span style={{ color: T.textDim, fontSize: "var(--text-sm)" }}>Loading...</span>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "description", label: "Description" },
    { id: "testcases",   label: `Test Cases (${testCases.length})` },
    { id: "submissions", label: "Submissions" },
    ...(results || submitting ? [{ id: "results", label: submitting ? "Judging…" : `Results ${results.passedCount}/${results.totalCount}` }] : []),
  ];

  return (
    <div style={{ height: "100vh", width: "100vw", overflow: "hidden", background: T.bg, color: T.text, fontFamily: "var(--font-body)", display: "flex", flexDirection: "column" }}>
      <style>{MD_STYLE}</style>

      {/* ── Top Nav Bar ── */}
      <div style={{ height: 48, background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", padding: "0 12px", gap: 8, flexShrink: 0 }}>

        {/* Sidebar toggle */}
        <button onClick={() => setSidebarOpen((v) => !v)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "var(--radius-sm)", background: sidebarOpen ? T.accentDim : "transparent", border: `1px solid ${sidebarOpen ? T.accent : T.border}`, color: sidebarOpen ? T.accent : T.textMuted, cursor: "pointer", outline: "none", transition: "all 0.15s" }}>
          <Menu size={15} />
        </button>

        {/* Contest name */}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "var(--text-xs)", fontWeight: 600, color: T.text, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <Trophy size={13} style={{ color: T.accent, flexShrink: 0 }} />
          {contest.name}
        </span>

        {/* Prev / next problem */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 4 }}>
          <button onClick={() => prevProblem && goTo(prevProblem)} disabled={!prevProblem}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "var(--radius-sm)", background: "transparent", border: `1px solid ${T.border}`, color: prevProblem ? T.textMuted : T.textDim, cursor: prevProblem ? "pointer" : "not-allowed", opacity: prevProblem ? 1 : 0.35, outline: "none", transition: "all 0.12s" }}
            onMouseEnter={(e) => { if (prevProblem) e.currentTarget.style.borderColor = T.borderBright; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "var(--text-xs)", fontFamily: "var(--font-code)", color: T.textMuted, minWidth: 32, textAlign: "center" }}>
            {currentIdx >= 0 ? `${currentIdx + 1}/${problems.length}` : "—"}
            {currentIdx >= 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "var(--radius-sm)", background: T.accentDim, color: T.accent, fontFamily: "var(--font-code)", fontWeight: 700, fontSize: "var(--text-xs)" }}>
                {String.fromCharCode(65 + currentIdx)}
              </span>
            )}
          </span>
          <button onClick={() => nextProblem && goTo(nextProblem)} disabled={!nextProblem}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "var(--radius-sm)", background: "transparent", border: `1px solid ${T.border}`, color: nextProblem ? T.textMuted : T.textDim, cursor: nextProblem ? "pointer" : "not-allowed", opacity: nextProblem ? 1 : 0.35, outline: "none", transition: "all 0.12s" }}
            onMouseEnter={(e) => { if (nextProblem) e.currentTarget.style.borderColor = T.borderBright; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; }}>
            <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ flex: 1 }} />

        <ContestTimer endTime={contest.endTime} />

        <button onClick={() => navigate(`/contests/${contestSlug}`)}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: "var(--radius-pill)", background: "transparent", border: `1px solid ${T.border}`, color: T.textMuted, fontSize: "var(--text-xs)", fontWeight: 600, cursor: "pointer", outline: "none", transition: "all 0.15s", fontFamily: "var(--font-body)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.surfaceHover; e.currentTarget.style.color = T.text; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMuted; }}>
          <ArrowLeft size={13} />Contest
        </button>
      </div>

      {/* ── Main body ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>

        {/* Sidebar */}
        {sidebarOpen && (
          <ProblemSidebar
            problems={problems} currentSlug={problemSlug} contestSlug={contestSlug}
            onNavigate={(path) => { navigate(path); setSidebarOpen(false); }}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        <div style={{ flex: 1, overflow: "hidden" }}>
          <PanelGroup direction="horizontal" style={{ height: "100%" }}>

            {/* ══ LEFT: Problem Panel ══ */}
            <Panel defaultSize={42} minSize={28}>
              <div style={{ height: "100%", display: "flex", flexDirection: "column", background: T.surface, borderRight: `1px solid ${T.border}` }}>

                {/* Problem header */}
                <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
                  <p style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: T.text, margin: "0 0 10px 0", lineHeight: 1.3, letterSpacing: "-0.02em" }}>
                    {problem?.title}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    {problem?.problemDifficulty && <DifficultyBadge difficulty={problem.problemDifficulty} />}
                    {problem?.solved && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: "4px", fontSize: "var(--text-xs)", fontWeight: 700, color: T.green, background: T.greenDim, border: `1px solid ${T.green}44` }}>
                        <CheckCircle size={11} />Solved
                      </span>
                    )}
                    {problem?.attempted && !problem?.solved && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: "4px", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--amber-tle)", background: "var(--amber-subtle)", border: "1px solid rgba(251,191,36,0.3)" }}>
                        <Clock size={11} />Attempted
                      </span>
                    )}
                    <StatChip icon={<Zap size={11} />}      value={`${problem?.point} pts`}    color={T.accent}   />
                    <StatChip icon={<Timer size={11} />}     value={`${problem?.timeLimit}s`}    color={T.blue}     />
                    <StatChip icon={<HardDrive size={11} />} value={`${problem?.memoryLimit}MB`} color={T.textMuted}/>
                    {activeTags.length > 0 && (
                      <>
                        <div style={{ width: 1, height: 14, background: T.border, margin: "0 2px" }} />
                        {activeTags.map((tag) => <TagChip key={tag.id} name={tag.name} />)}
                      </>
                    )}
                  </div>
                </div>

                {/* Tab bar */}
                <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, padding: "0 4px", flexShrink: 0, overflowX: "auto" }}>
                  {tabs.map((tab) => (
                    <button key={tab.id}
                      onClick={async () => {
                        setActiveTab(tab.id);
                        if (tab.id === "submissions" && !submissionsLoaded) await fetchSubmissions();
                      }}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "10px 14px", fontSize: "var(--text-sm)", fontWeight: 500, cursor: "pointer", color: activeTab === tab.id ? T.text : T.textMuted, background: "transparent", border: "none", borderBottom: `2px solid ${activeTab === tab.id ? T.accent : "transparent"}`, transition: "color 0.12s", outline: "none", whiteSpace: "nowrap", fontFamily: "var(--font-body)" }}>
                      {tab.label}
                      {tab.id === "results" && results && (
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: results.allPassed ? T.green : T.red }} />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

                  {/* ── Description ── */}
                  {activeTab === "description" && (
                    <div className="cpmd" style={{ fontSize: "var(--text-sm)", lineHeight: 1.8 }}>
                      <ReactMarkdown>{statement}</ReactMarkdown>
                    </div>
                  )}

                  {/* ── Test Cases ── */}
                  {activeTab === "testcases" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {testCases.length === 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingTop: 40 }}>
                          <Terminal size={26} style={{ color: T.textDim, opacity: 0.4 }} />
                          <span style={{ fontSize: "var(--text-sm)", color: T.textDim }}>No sample test cases</span>
                        </div>
                      ) : testCases.map((tc, i) => (
                        <div key={tc.id} style={{ borderRadius: "var(--radius-md)", border: `1px solid ${T.border}`, overflow: "hidden", background: T.surface }}>
                          <div style={{ padding: "6px 14px", background: T.bg, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, fontFamily: "var(--font-code)", color: T.accent, background: T.accentDim, border: `1px solid ${T.accentBorder}`, padding: "1px 7px", borderRadius: "var(--radius-sm)", letterSpacing: "0.06em" }}>
                              CASE {i + 1}
                            </span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                            {[{ label: "INPUT", val: tc.input, accent: false }, { label: "EXPECTED OUTPUT", val: tc.output, accent: true }].map(({ label, val, accent }, idx) => (
                              <div key={label} style={{ borderRight: idx === 0 ? `1px solid ${T.border}` : "none" }}>
                                <div style={{ padding: "5px 12px", borderBottom: `1px solid ${T.border}`, background: accent ? T.greenDim : "transparent" }}>
                                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: accent ? T.green : T.textDim, letterSpacing: "0.06em", fontFamily: "var(--font-code)" }}>{label}</span>
                                </div>
                                <div style={{ padding: "10px 12px", fontFamily: "var(--font-code)", fontSize: "var(--text-xs)", color: accent ? T.green : T.text, whiteSpace: "pre-wrap", lineHeight: 1.7, minHeight: 40, maxHeight: 180, overflowY: "auto", background: accent ? T.greenDim : "transparent" }}>
                                  {val || <span style={{ color: T.textDim, fontStyle: "italic", fontFamily: "var(--font-body)" }}>empty</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Submissions ── */}
                  {activeTab === "submissions" && (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {viewingSubmission ? (
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <button onClick={() => setViewingSubmission(null)}
                            style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, color: T.textMuted, background: "transparent", border: "none", cursor: "pointer", fontSize: "var(--text-sm)", outline: "none", fontFamily: "var(--font-body)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = T.text; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; }}>
                            ← All Submissions
                          </button>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                            <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: (VERDICT_COLOR[viewingSubmission.submissionVerdict] || {}).c ?? T.textMuted, fontFamily: "var(--font-code)" }}>
                              {VERDICT_LABEL[viewingSubmission.submissionVerdict] ?? viewingSubmission.submissionVerdict}
                            </span>
                            <span style={{ fontSize: "var(--text-xs)", color: T.textMuted, fontFamily: "var(--font-code)" }}>{viewingSubmission.submissionLanguage}</span>
                            {viewingSubmission.executionTime != null && <span style={{ fontSize: "var(--text-xs)", color: T.textMuted }}>{viewingSubmission.executionTime}s</span>}
                            {viewingSubmission.memoryUsed != null && <span style={{ fontSize: "var(--text-xs)", color: T.textMuted }}>{viewingSubmission.memoryUsed}KB</span>}
                          </div>
                          <div style={{ borderRadius: "var(--radius-md)", border: `1px solid ${T.border}`, background: "#1E1E1E", overflow: "hidden" }}>
                            <div style={{ display: "flex", fontFamily: "var(--font-code)", fontSize: "var(--text-xs)", lineHeight: 1.8 }}>
                              <div style={{ padding: "14px 10px", borderRight: `1px solid ${T.border}`, color: T.textDim, userSelect: "none", textAlign: "right", flexShrink: 0, background: "#1a1a1a", minWidth: 46 }}>
                                {(viewingSubmission.sourceCode || "").split("\n").map((_, i) => <div key={i}>{i + 1}</div>)}
                              </div>
                              <pre style={{ margin: 0, padding: 14, flex: 1, overflow: "auto" }}
                                dangerouslySetInnerHTML={{ __html: `<code class="hljs language-${getHljsLanguage(viewingSubmission.submissionLanguage)}" style="background:transparent;padding:0;font-size:0.75rem;font-family:var(--font-code);line-height:1.8">${hljs.highlight(viewingSubmission.sourceCode || "// No source code", { language: getHljsLanguage(viewingSubmission.submissionLanguage) }).value}</code>` }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {submissions.length > 0 && (
                            <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${T.border}`, paddingBottom: 4 }}>
                              {[null, ...[...new Set(submissions.map((s) => s.submissionVerdict))].filter(Boolean)].map((v) => (
                                <button key={v ?? "all"} onClick={() => setVerdictFilter(v)}
                                  style={{ padding: "3px 10px", borderRadius: "var(--radius-pill)", fontSize: "var(--text-xs)", fontWeight: 600, cursor: "pointer", border: "none", outline: "none", background: verdictFilter === v ? (v ? (VERDICT_COLOR[v] || {}).bg ?? T.accentDim : T.accentDim) : "transparent", color: verdictFilter === v ? (v ? (VERDICT_COLOR[v] || {}).c ?? T.accent : T.accent) : T.textMuted, fontFamily: "var(--font-body)", transition: "all 0.12s" }}>
                                  {v ? (VERDICT_LABEL[v] ?? v) : "All"}
                                </button>
                              ))}
                            </div>
                          )}
                          {loadingSubmissions ? (
                            <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
                              <div className="spinner" style={{ borderTopColor: T.accent }} />
                            </div>
                          ) : submissions.length === 0 ? (
                            <span style={{ fontSize: "var(--text-sm)", color: T.textDim, padding: "24px 0", textAlign: "center", display: "block" }}>No submissions yet.</span>
                          ) : (
                            submissions
                              .filter((s) => verdictFilter ? s.submissionVerdict === verdictFilter : true)
                              .map((sub) => {
                                const vc = VERDICT_COLOR[sub.submissionVerdict] || { c: T.textMuted, bg: T.bg };
                                return (
                                  <div key={sub.id}
                                    style={{ borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderLeft: `3px solid ${vc.c}`, transition: "background 0.12s", cursor: sub.sourceCode ? "pointer" : "default" }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = T.surfaceHover; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                                    onClick={() => sub.sourceCode && setViewingSubmission(sub)}>
                                    <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--text-xs)", fontWeight: 700, color: vc.c, background: vc.bg, padding: "2px 7px", borderRadius: "var(--radius-sm)", flexShrink: 0 }}>
                                      {sub.submissionVerdict ?? "—"}
                                    </span>
                                    <span style={{ fontSize: "var(--text-xs)", color: T.textMuted, fontFamily: "var(--font-code)" }}>{sub.submissionLanguage}</span>
                                    <span style={{ fontSize: "var(--text-xs)", color: T.textDim, marginLeft: "auto", fontFamily: "var(--font-code)" }}>
                                      {sub.testCasesPassed != null ? `${sub.testCasesPassed}/${sub.totalTestCases}` : ""}
                                      {sub.executionTime != null ? ` · ${sub.executionTime}ms` : ""}
                                    </span>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Results ── */}
                  {activeTab === "results" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {submitting && queuePosition != null && (
                        <div style={{ padding: "16px 18px", borderRadius: "var(--radius-md)", background: T.blueDim, border: `1px solid ${T.blue}33`, borderLeft: `4px solid ${T.blue}`, display: "flex", alignItems: "center", gap: 14 }}>
                          <div className="spinner" style={{ borderTopColor: T.blue, width: 16, height: 16, flexShrink: 0 }} />
                          <div>
                            <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-xl)", color: T.blue, margin: "0 0 2px", letterSpacing: "0.02em" }}>IN QUEUE</p>
                            <p style={{ fontSize: "var(--text-xs)", color: T.textMuted, margin: 0, fontFamily: "var(--font-code)" }}>Position #{queuePosition}</p>
                          </div>
                        </div>
                      )}
                      {submitting && queuePosition == null && (
                        <div style={{ padding: "16px 18px", borderRadius: "var(--radius-md)", background: T.accentDim, border: `1px solid ${T.accentBorder}`, borderLeft: `4px solid ${T.accent}`, display: "flex", alignItems: "center", gap: 14 }}>
                          <div className="spinner" style={{ borderTopColor: T.accent, width: 16, height: 16, flexShrink: 0 }} />
                          <div>
                            <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-xl)", color: T.accent, margin: "0 0 2px", letterSpacing: "0.02em" }}>JUDGING</p>
                            <p style={{ fontSize: "var(--text-xs)", color: T.textMuted, margin: 0, fontFamily: "var(--font-code)" }}>Running against test cases…</p>
                          </div>
                        </div>
                      )}
                      {results && (
                        <>
                          <div style={{ padding: "16px 18px", borderRadius: "var(--radius-md)", background: results.allPassed ? T.greenDim : T.redDim, border: `1px solid ${results.allPassed ? T.green : T.red}33`, borderLeft: `4px solid ${results.allPassed ? T.green : T.red}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                              {results.allPassed ? <CheckCircle size={20} color={T.green} strokeWidth={2.5} /> : <XCircle size={20} color={T.red} strokeWidth={2.5} />}
                              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "var(--text-2xl)", letterSpacing: "0.01em", color: results.allPassed ? T.green : T.red }}>
                                {VERDICT_LABEL[results.verdict] ?? results.verdict}
                              </span>
                            </div>
                            {/* Progress bar */}
                            <div style={{ height: 3, borderRadius: 2, background: "var(--bg-overlay)", overflow: "hidden", marginBottom: 6 }}>
                              <div style={{ height: "100%", width: `${(results.passedCount / results.totalCount) * 100}%`, background: results.allPassed ? T.green : T.red, borderRadius: 2, transition: "width 0.5s ease" }} />
                            </div>
                            <span style={{ fontSize: "var(--text-xs)", color: T.textMuted, fontFamily: "var(--font-code)" }}>
                              {results.passedCount} / {results.totalCount} test cases passed
                            </span>
                            {(results.executionTime != null || results.memoryUsed != null) && (
                              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                                {results.executionTime != null && (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--text-xs)", fontFamily: "var(--font-code)", fontWeight: 600, color: T.textMuted, background: "var(--bg-overlay)", padding: "2px 7px", borderRadius: "var(--radius-sm)", border: `1px solid ${T.border}` }}>
                                    <Clock size={10} />{results.executionTime} ms
                                  </span>
                                )}
                                {results.memoryUsed != null && (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--text-xs)", fontFamily: "var(--font-code)", fontWeight: 600, color: T.textMuted, background: "var(--bg-overlay)", padding: "2px 7px", borderRadius: "var(--radius-sm)", border: `1px solid ${T.border}` }}>
                                    <HardDrive size={10} />{results.memoryUsed} KB
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {results.errorMessage && (
                            <div style={{ borderRadius: "var(--radius-md)", border: `1px solid ${T.red}33`, overflow: "hidden" }}>
                              <div style={{ padding: "6px 14px", background: T.redDim, borderBottom: `1px solid ${T.red}33` }}>
                                <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: T.red, fontFamily: "var(--font-code)", letterSpacing: "0.06em" }}>
                                  {results.verdict === "CE" ? "COMPILATION ERROR" : "RUNTIME ERROR"}
                                </span>
                              </div>
                              <pre style={{ margin: 0, padding: "12px 14px", fontFamily: "var(--font-code)", fontSize: "var(--text-xs)", color: T.red, whiteSpace: "pre-wrap", background: T.bg, lineHeight: 1.7, maxHeight: 220, overflowY: "auto" }}>
                                {results.errorMessage}
                              </pre>
                            </div>
                          )}
                        </>
                      )}
                      {!submitting && !results && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingTop: 40 }}>
                          <Terminal size={26} style={{ color: T.textDim, opacity: 0.35 }} />
                          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: T.textDim }}>Submit your code to see results</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Panel>

            <ResizeHandle direction="horizontal" />

            {/* ══ RIGHT: Code Editor Panel ══ */}
            <Panel defaultSize={58} minSize={30}>
              <div style={{ height: "100%", display: "flex", flexDirection: "column", background: T.bg }}>
                <CodeEditor
                  ref={codeEditorRef}
                  rightHeaderContent={
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || contestEnded}
                      style={{ padding: "5px 18px", background: contestEnded ? T.borderBright : T.accent, color: contestEnded ? T.textMuted : "#000", fontWeight: 700, fontSize: "var(--text-sm)", borderRadius: "var(--radius-sm)", border: "none", cursor: contestEnded ? "not-allowed" : "pointer", outline: "none", transition: "all 0.15s", opacity: submitting ? 0.7 : 1, fontFamily: "var(--font-body)" }}
                      onMouseEnter={(e) => { if (!contestEnded && !submitting) { e.currentTarget.style.background = "var(--primary-bright)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = contestEnded ? T.borderBright : T.accent; e.currentTarget.style.transform = "translateY(0)"; }}>
                      {submitting ? "Running…" : contestEnded ? "Contest Ended" : "Run & Submit"}
                    </button>
                  }
                />
              </div>
            </Panel>

          </PanelGroup>
        </div>
      </div>
    </div>
  );
};

export default ContestProblemPage;
