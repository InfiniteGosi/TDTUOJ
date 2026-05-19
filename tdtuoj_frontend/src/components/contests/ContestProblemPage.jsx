import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Gem,
  Timer,
  HardDrive,
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
import "highlight.js/styles/vs2015.css";

hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("java", java);
hljs.registerLanguage("python", python);
hljs.registerLanguage("c", c);

const getHljsLanguage = (lang) => {
  switch (lang) {
    case "CPP":    return "cpp";
    case "JAVA":   return "java";
    case "PYTHON": return "python";
    case "C":      return "c";
    default:       return "cpp";
  }
};

// ─── Theme tokens ────────────────────────────────────────────────────────────
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
  greenBorder:  "var(--green-subtle)",
  red:          "var(--red-wa)",
  redDim:       "var(--red-subtle)",
  redBorder:    "var(--red-subtle)",
  blue:         "var(--blue-ce)",
  blueDim:      "var(--blue-subtle)",
  blueBorder:   "var(--blue-subtle)",
  purple:       "var(--primary)",
  purpleDim:    "var(--primary-subtle)",
  purpleBorder: "var(--primary-subtle)",
};

const mapEditorLanguageToSubmissionLanguage = (language) => {
  switch (language) {
    case "cpp":    return "CPP";
    case "java":   return "JAVA";
    case "python": return "PYTHON";
    case "c":      return "C";
    default:       return "CPP";
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

const DIFF_STYLE = {
  EASY:   { color: T.green,  bg: T.greenDim,  label: "Easy" },
  MEDIUM: { color: T.accent, bg: T.accentDim, label: "Medium" },
  HARD:   { color: T.red,    bg: T.redDim,    label: "Hard" },
};

// ─── Resizable Pane ──────────────────────────────────────────────────────────
const ResizablePane = ({ children, direction = "horizontal", initialSizes = [50, 50] }) => {
  const [sizes, setSizes] = useState(initialSizes);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (direction === "horizontal") {
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      if (pct > 25 && pct < 75) setSizes([pct, 100 - pct]);
    } else {
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      if (pct > 20 && pct < 80) setSizes([pct, 100 - pct]);
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging]);

  const isH = direction === "horizontal";

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: isH ? "row" : "column",
        height: "100%",
        width: "100%",
        userSelect: isDragging ? "none" : "auto",
      }}
    >
      <div
        style={{
          width: isH ? `${sizes[0]}%` : "100%",
          height: !isH ? `${sizes[0]}%` : "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children[0]}
      </div>

      <div
        onMouseDown={handleMouseDown}
        style={{
          width: isH ? "5px" : "100%",
          height: !isH ? "5px" : "100%",
          background: isDragging ? T.accent : T.border,
          cursor: isH ? "col-resize" : "row-resize",
          flexShrink: 0,
          transition: "background 0.15s",
          position: "relative",
          zIndex: 10,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = T.accent; }}
        onMouseLeave={(e) => { if (!isDragging) e.currentTarget.style.background = T.border; }}
      />

      <div
        style={{
          width: isH ? `${sizes[1]}%` : "100%",
          height: !isH ? `${sizes[1]}%` : "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children[1]}
      </div>
    </div>
  );
};

// ─── Small components ─────────────────────────────────────────────────────────

const DifficultyBadge = ({ difficulty }) => {
  const s = DIFF_STYLE[difficulty] || DIFF_STYLE.EASY;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "var(--text-xs)",
        fontWeight: 700,
        letterSpacing: "0.04em",
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.color}44`,
      }}
    >
      {s.label}
    </span>
  );
};

const StatChip = ({ icon, value, color }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "3px 8px",
      borderRadius: "4px",
      background: T.surface,
      border: `1px solid ${T.border}`,
      fontSize: "var(--text-xs)",
      color: color || T.textMuted,
      fontWeight: 500,
      fontFamily: "'JetBrains Mono', monospace",
    }}
  >
    {icon} {value}
  </span>
);

const TagChip = ({ name }) => (
  <span
    style={{
      display: "inline-block",
      padding: "3px 8px",
      borderRadius: "4px",
      fontSize: "var(--text-xs)",
      fontWeight: 500,
      color: T.purple,
      background: T.purpleDim,
      border: `1px solid ${T.purpleBorder}`,
      letterSpacing: "0.02em",
      whiteSpace: "nowrap",
    }}
  >
    {name}
  </span>
);

// ─── Countdown hook ───────────────────────────────────────────────────────────

const useCountdown = (targetDateStr) => {
  const getRemaining = () => {
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

  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    setRemaining(getRemaining());
    const id = setInterval(() => setRemaining(getRemaining()), 1000);
    return () => clearInterval(id);
  }, [targetDateStr]);

  return remaining;
};

// ─── Contest Timer ────────────────────────────────────────────────────────────

const ContestTimer = ({ endTime }) => {
  const remaining = useCountdown(endTime);

  if (!remaining) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 12px",
          borderRadius: "6px",
          background: T.redDim,
          border: `1px solid ${T.redBorder}`,
        }}
      >
        <Clock size={13} color={T.red} />
        <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: T.red }}>Contest Ended</span>
      </div>
    );
  }

  const isUrgent = remaining.total < 5 * 60 * 1000;
  const color = isUrgent ? T.red : T.green;
  const bg    = isUrgent ? T.redDim : T.greenDim;
  const pad   = (n) => String(n).padStart(2, "0");

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: "6px",
        background: bg,
        border: `1px solid ${color}44`,
      }}
    >
      <Clock size={13} color={color} />
      <span
        style={{
          fontSize: "var(--text-xs)",
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          color,
        }}
      >
        {pad(remaining.hours)}:{pad(remaining.minutes)}:{pad(remaining.seconds)}
      </span>
    </div>
  );
};

// ─── Problem Sidebar ──────────────────────────────────────────────────────────

const ProblemSidebar = ({ problems, currentSlug, contestSlug, onNavigate, onClose }) => (
  <div
    style={{
      width: "240px",
      height: "100%",
      background: T.surface,
      borderRight: `1px solid ${T.border}`,
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: T.text }}>Problems</span>
      <button
        onClick={onClose}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: T.textMuted,
          outline: "none",
          display: "flex",
          alignItems: "center",
        }}
      >
        <X size={16} />
      </button>
    </div>
    <div style={{ flex: 1, overflowY: "auto" }}>
      {problems.map((p, idx) => {
        const letter = String.fromCharCode(65 + (p.problemOrder ?? idx + 1) - 1);
        const isActive = p.problemSlug === currentSlug;
        return (
          <button
            key={p.problemId}
            onClick={() => onNavigate(`/contests/${contestSlug}/problems/${p.problemSlug}`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "10px 12px",
              background: isActive ? T.accentDim : "transparent",
              borderLeft: isActive ? `3px solid ${T.accent}` : "3px solid transparent",
              border: "none",
              borderRight: "none",
              borderTop: "none",
              borderBottom: "none",
              cursor: "pointer",
              outline: "none",
              textAlign: "left",
              transition: "all 0.12s",
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = T.surfaceHover;
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = "transparent";
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "6px",
                background: isActive ? T.accent : T.bg,
                color: isActive ? "#000" : T.textMuted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "var(--text-xs)",
                flexShrink: 0,
              }}
            >
              {letter}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  color: isActive ? T.text : T.textMuted,
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {p.problemTitle}
              </p>
              {p.problemDifficulty && (
                <p
                  style={{
                    fontSize: "10px",
                    color: (DIFF_STYLE[p.problemDifficulty] || DIFF_STYLE.EASY).color,
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  {(DIFF_STYLE[p.problemDifficulty] || DIFF_STYLE.EASY).label}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const ContestProblemPage = () => {
  const { contestSlug, problemSlug } = useParams();
  const navigate = useNavigate();
  const { showMessage } = useToast();
  const codeEditorRef = useRef(null);

  // Contest data
  const [contest, setContest]           = useState(null);
  const [contestEnded, setContestEnded] = useState(false);

  // Problem data
  const [problem, setProblem]   = useState(null);
  const [statement, setStatement] = useState("");
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading]   = useState(true);

  // Submission state
  const [submitting, setSubmitting]           = useState(false);
  const [results, setResults]                 = useState(null);
  const [pollingId, setPollingId]             = useState(null);
  const [queuePosition, setQueuePosition]     = useState(null);

  // Tabs & submissions
  const [activeTab, setActiveTab]                 = useState("description");
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [verdictFilter, setVerdictFilter]         = useState(null);
  const [submissions, setSubmissions]             = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionsLoaded, setSubmissionsLoaded]   = useState(false);

  // Sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Fetch contest ──
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const resp = await ApiService.getContestBySlug(contestSlug);
        if (!cancelled && resp.statusCode === 200) {
          setContest(resp.data);
          if (new Date(resp.data.endTime).getTime() <= Date.now()) {
            setContestEnded(true);
          }
        }
      } catch (err) {
        if (!cancelled) showMessage(err.response?.data?.message || err.message, "error");
      }
    };
    load();
    return () => { cancelled = true; };
  }, [contestSlug]);

  // ── Watch for contest end ──
  useEffect(() => {
    if (!contest?.endTime || contestEnded) return;
    const diff = new Date(contest.endTime).getTime() - Date.now();
    if (diff <= 0) { setContestEnded(true); return; }
    const timerId = setTimeout(() => {
      setContestEnded(true);
      showMessage("Contest has ended! Submissions are now disabled.", "warning");
      setTimeout(() => window.location.reload(), 3000);
    }, diff);
    return () => clearTimeout(timerId);
  }, [contest?.endTime, contestEnded]);

  // ── Fetch problem ──
  const fetchProblem = async () => {
    setLoading(true);
    try {
      const response = await ApiService.getProblemBySlug(problemSlug);
      if (response.statusCode === 200) {
        setProblem(response.data);
        const statementRes = await ApiService.fetchFileContent(response.data.statementFileUrl);
        setStatement(statementRes);
        const sampleTestCases = response.data.testCases.filter((tc) => tc.isSample === true);
        const fetched = await Promise.all(
          sampleTestCases.map(async (tc) => ({
            id: tc.id,
            input: await ApiService.fetchFileContent(tc.inputFileUrl),
            output: await ApiService.fetchFileContent(tc.expectedOutputFileUrl),
          })),
        );
        setTestCases(fetched);
      }
    } catch (error) {
      showMessage(error.response?.data?.message || error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setResults(null);
    setSubmitting(false);
    setActiveTab("description");
    setViewingSubmission(null);
    setVerdictFilter(null);
    setSubmissions([]);
    setSubmissionsLoaded(false);
    fetchProblem();
  }, [problemSlug]);

  useEffect(() => {
    return () => { if (pollingId) clearInterval(pollingId); };
  }, [pollingId]);

  // ── Submissions ──
  const fetchSubmissions = async () => {
    if (!problem?.id) return;
    setLoadingSubmissions(true);
    try {
      const resp = await ApiService.getMySubmissions({ limit: 20, offset: 0, problemId: problem.id });
      if (resp.statusCode === 200 && resp.data) {
        setSubmissions(resp.data.content || []);
        setSubmissionsLoaded(true);
      }
    } catch (error) {
      showMessage(error.response?.data?.message || error.message, "error");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (submitting || contestEnded) return;
    if (!codeEditorRef.current) return;
    const { code, language } = codeEditorRef.current.getCodeAndLanguage();
    if (!code?.trim()) {
      showMessage("Please write some code before submitting", "warning");
      return;
    }

    setSubmitting(true);
    setResults(null);
    setQueuePosition(null);

    try {
      const resp = await ApiService.createSubmission({
        sourceCode: code,
        submissionLanguage: mapEditorLanguageToSubmissionLanguage(language),
        problemId: problem.id,
        isPublic: true,
        contestId: contest?.id ?? null,
      });

      const sub = resp.data;
      setQueuePosition(sub.queuePosition ?? null);
      setActiveTab("results");

      const intervalId = setInterval(async () => {
        try {
          const statusResp = await ApiService.getSubmissionStatus(sub.id);
          const updated = statusResp.data;

          if (updated.submissionStatus === "PENDING") {
            setQueuePosition(updated.queuePosition ?? null);
          } else if (updated.submissionStatus === "RUNNING") {
            setQueuePosition(null);
          } else if (updated.submissionStatus === "COMPLETED") {
            clearInterval(intervalId);
            setPollingId(null);
            setSubmitting(false);
            setQueuePosition(null);

            const allPassed = updated.submissionVerdict === "AC";

            if (allPassed && !problem?.solved) {
              setProblem((prev) => ({ ...prev, solved: true, attempted: false }));
            } else if (!allPassed) {
              setProblem((prev) => ({ ...prev, attempted: true }));
            }

            setResults({
              allPassed,
              passedCount: updated.testCasesPassed ?? 0,
              totalCount:  updated.totalTestCases ?? testCases.length,
              verdict: updated.submissionVerdict,
              errorMessage: updated.errorMessage,
              executionTime: updated.executionTime,
              memoryUsed: updated.memoryUsed,
            });

            showMessage(
              allPassed
                ? "All test cases passed!"
                : `${updated.testCasesPassed}/${updated.totalTestCases} test cases passed — ${updated.submissionVerdict}`,
              allPassed ? "success" : "warning",
            );

            if (submissionsLoaded) await fetchSubmissions();
          }
        } catch (err) {
          clearInterval(intervalId);
          setPollingId(null);
          setSubmitting(false);
          showMessage(err.response?.data?.message || err.message, "error");
        }
      }, 2000);

      setPollingId(intervalId);
    } catch (error) {
      setSubmitting(false);
      if (error.response?.status === 429) {
        showMessage("Please wait 5 seconds before submitting again", "warning");
      } else {
        showMessage(error.response?.data?.message || error.message, "error");
      }
    }
  };

  // ── Navigation helpers ──
  const problems = contest?.problems ?? [];
  const currentIdx = problems.findIndex((p) => p.problemSlug === problemSlug);
  const prevProblem = currentIdx > 0 ? problems[currentIdx - 1] : null;
  const nextProblem = currentIdx < problems.length - 1 ? problems[currentIdx + 1] : null;
  const goTo = (p) => navigate(`/contests/${contestSlug}/problems/${p.problemSlug}`);
  const activeTags = (problem?.tags || []).filter((t) => t.isActive !== false);

  // ── Loading ──
  if (loading || !contest) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: T.bg,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
          <div className="spinner" style={{ borderColor: `${T.accent} transparent transparent transparent` }} />
          <span style={{ color: T.textMuted, fontSize: "var(--text-sm)" }}>Loading...</span>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "description", label: "Description" },
    { id: "testcases",   label: `Test Cases (${testCases.length})` },
    { id: "submissions", label: "Submissions" },
    ...(results || submitting
      ? [{
          id: "results",
          label: submitting
            ? "Judging..."
            : `Results ${results.passedCount}/${results.totalCount}`,
        }]
      : []),
  ];

  // ── Markdown styles ──
  const markdownStyle = `
    .md-content h1, .md-content h2, .md-content h3, .md-content h4 {
      font-weight: 700; color: ${T.text}; margin-bottom: 0.6rem; margin-top: 1.4rem;
    }
    .md-content h1 { font-size: 1.2rem; }
    .md-content h2 { font-size: 1.05rem; }
    .md-content h3 { font-size: 0.95rem; color: ${T.textMuted}; }
    .md-content p  { margin-bottom: 0.9rem; color: var(--text-secondary); }
    .md-content code {
      background: ${T.bg}; padding: 0.15rem 0.45rem;
      border-radius: 4px; font-size: 0.85em;
      font-family: 'JetBrains Mono', monospace;
      color: ${T.accent}; border: 1px solid ${T.border};
    }
    .md-content pre {
      background: ${T.bg}; padding: 1rem 1.2rem;
      border-radius: 8px; overflow-x: auto;
      margin-bottom: 1rem; border: 1px solid ${T.border};
    }
    .md-content pre code {
      background: transparent; padding: 0;
      color: #e2e8f0; border: none; font-size: 0.85rem;
    }
    .md-content ul, .md-content ol { padding-left: 1.4rem; margin-bottom: 0.9rem; }
    .md-content li { margin-bottom: 0.35rem; color: var(--text-secondary); }
    .md-content strong { font-weight: 700; color: ${T.text}; }
    .md-content blockquote {
      border-left: 3px solid ${T.accent}; padding-left: 1rem;
      margin-left: 0; color: ${T.textMuted}; font-style: italic;
    }
  `;

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: T.bg,
        color: T.text,
        fontFamily: "var(--font-body)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{markdownStyle}</style>

      {/* ── Top Nav Bar ── */}
      <div
        style={{
          height: "44px",
          background: T.surface,
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 8,
          flexShrink: 0,
        }}
      >
        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen((prev) => !prev)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: "6px",
            background: sidebarOpen ? T.accentDim : "transparent",
            border: `1px solid ${sidebarOpen ? T.accent : T.border}`,
            color: sidebarOpen ? T.accent : T.textMuted,
            cursor: "pointer",
            outline: "none",
            transition: "all 0.15s",
          }}
        >
          <Menu size={16} />
        </button>

        {/* Brand */}
        <span
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: 800,
            color: T.accent,
            letterSpacing: "-0.03em",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {"<OJ/>"}
        </span>

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: T.border, margin: "0 4px" }} />

        {/* Contest name */}
        <span
          style={{
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            color: T.textMuted,
            maxWidth: 200,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {contest.name}
        </span>

        {/* Arrow navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
          <button
            onClick={() => prevProblem && goTo(prevProblem)}
            disabled={!prevProblem}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: "6px",
              background: "transparent",
              border: `1px solid ${T.border}`,
              color: prevProblem ? T.textMuted : T.textDim,
              cursor: prevProblem ? "pointer" : "not-allowed",
              opacity: prevProblem ? 1 : 0.4,
              outline: "none",
              transition: "all 0.12s",
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <span
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              color: T.textMuted,
              minWidth: 30,
              textAlign: "center",
            }}
          >
            {currentIdx >= 0 ? `${currentIdx + 1}/${problems.length}` : "—"}
          </span>
          <button
            onClick={() => nextProblem && goTo(nextProblem)}
            disabled={!nextProblem}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: "6px",
              background: "transparent",
              border: `1px solid ${T.border}`,
              color: nextProblem ? T.textMuted : T.textDim,
              cursor: nextProblem ? "pointer" : "not-allowed",
              opacity: nextProblem ? 1 : 0.4,
              outline: "none",
              transition: "all 0.12s",
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div style={{ flex: 1 }} />

        {/* Contest timer */}
        <ContestTimer endTime={contest.endTime} />

        {/* Back to contest */}
        <button
          onClick={() => navigate(`/contests/${contestSlug}`)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 12px",
            borderRadius: "6px",
            background: "transparent",
            border: `1px solid ${T.border}`,
            color: T.textMuted,
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            cursor: "pointer",
            outline: "none",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = T.surfaceHover;
            e.currentTarget.style.color = T.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = T.textMuted;
          }}
        >
          ← Contest
        </button>
      </div>

      {/* ── Main body ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {/* Sidebar */}
        {sidebarOpen && (
          <ProblemSidebar
            problems={problems}
            currentSlug={problemSlug}
            contestSlug={contestSlug}
            onNavigate={(path) => { navigate(path); setSidebarOpen(false); }}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        {/* Resizable pane area */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <ResizablePane direction="horizontal" initialSizes={[42, 58]}>
            {/* ══ LEFT: Problem Panel ══ */}
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                background: T.surface,
                borderRight: `1px solid ${T.border}`,
              }}
            >
              {/* Problem header */}
              <div
                style={{
                  padding: "20px 20px 16px 20px",
                  borderBottom: `1px solid ${T.border}`,
                  flexShrink: 0,
                }}
              >
                <p
                  style={{
                    fontSize: "var(--text-xl)",
                    fontWeight: 700,
                    color: T.text,
                    marginBottom: "12px",
                    lineHeight: 1.3,
                    letterSpacing: "-0.02em",
                    margin: "0 0 12px 0",
                  }}
                >
                  {problem?.title}
                </p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  {problem?.problemDifficulty && (
                    <DifficultyBadge difficulty={problem.problemDifficulty} />
                  )}
                  {problem?.solved && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "var(--text-xs)",
                        fontWeight: 700,
                        color: T.green,
                        background: T.greenDim,
                        border: `1px solid ${T.greenBorder}`,
                      }}
                    >
                      <CheckCircle size={11} />
                      Solved
                    </span>
                  )}
                  {problem?.attempted && !problem?.solved && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "var(--text-xs)",
                        fontWeight: 700,
                        color: "#f97316",
                        background: "rgba(249,115,22,0.12)",
                        border: "1px solid rgba(249,115,22,0.3)",
                      }}
                    >
                      <Clock size={11} />
                      Attempted
                    </span>
                  )}
                  <StatChip icon={<Gem size={11} />} value={`${problem?.point} pts`} color={T.accent} />
                  <StatChip icon={<Timer size={11} />} value={`${problem?.timeLimit}s`} color={T.blue} />
                  <StatChip icon={<HardDrive size={11} />} value={`${problem?.memoryLimit}MB`} color={T.textMuted} />
                  {activeTags.length > 0 && (
                    <>
                      <div style={{ width: 1, height: 16, background: T.border, margin: "0 4px" }} />
                      {activeTags.map((tag) => <TagChip key={tag.id} name={tag.name} />)}
                    </>
                  )}
                </div>
              </div>

              {/* Tab bar */}
              <div
                style={{
                  display: "flex",
                  borderBottom: `1px solid ${T.border}`,
                  padding: "0 8px",
                  flexShrink: 0,
                }}
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={async () => {
                      setActiveTab(tab.id);
                      if (tab.id === "submissions" && !submissionsLoaded) {
                        await fetchSubmissions();
                      }
                    }}
                    style={{
                      padding: "12px 16px",
                      fontSize: "var(--text-sm)",
                      fontWeight: 500,
                      cursor: "pointer",
                      color: activeTab === tab.id ? T.text : T.textMuted,
                      background: "transparent",
                      border: "none",
                      borderBottom: `2px solid ${activeTab === tab.id ? T.accent : "transparent"}`,
                      transition: "all 0.15s",
                      outline: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {tab.label}
                    {tab.id === "results" && results && (
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: results.allPassed ? T.green : T.red,
                          verticalAlign: "middle",
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
                {/* ── Description ── */}
                {activeTab === "description" && (
                  <div
                    className="md-content"
                    style={{ fontSize: "var(--text-sm)", lineHeight: 1.8, color: T.text }}
                  >
                    <ReactMarkdown>{statement}</ReactMarkdown>
                  </div>
                )}

                {/* ── Test Cases ── */}
                {activeTab === "testcases" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {testCases.map((tc, index) => (
                      <div
                        key={tc.id}
                        style={{
                          borderRadius: "8px",
                          border: `1px solid ${T.border}`,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            padding: "8px 12px",
                            background: T.bg,
                            borderBottom: `1px solid ${T.border}`,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "var(--text-xs)",
                              fontWeight: 600,
                              color: T.textMuted,
                              letterSpacing: "0.05em",
                            }}
                          >
                            CASE {index + 1}
                          </span>
                        </div>
                        <div
                          style={{
                            padding: 12,
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 12,
                          }}
                        >
                          {[
                            { label: "INPUT",    val: tc.input,  color: "var(--text-secondary)" },
                            { label: "EXPECTED", val: tc.output, color: T.green },
                          ].map(({ label, val, color }) => (
                            <div key={label}>
                              <p
                                style={{
                                  fontSize: "var(--text-xs)",
                                  color: T.textDim,
                                  fontWeight: 600,
                                  margin: "0 0 4px 0",
                                  letterSpacing: "0.04em",
                                }}
                              >
                                {label}
                              </p>
                              <div
                                style={{
                                  background: T.bg,
                                  padding: 8,
                                  borderRadius: "6px",
                                  fontFamily: "'JetBrains Mono', monospace",
                                  fontSize: "var(--text-xs)",
                                  color,
                                  whiteSpace: "pre-wrap",
                                  border: `1px solid ${T.border}`,
                                  minHeight: 40,
                                  maxHeight: 200,
                                  overflowY: "auto",
                                }}
                              >
                                {val}
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
                  <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    {viewingSubmission ? (
                      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                        <button
                          onClick={() => setViewingSubmission(null)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 16,
                            color: T.textMuted,
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "var(--text-sm)",
                            outline: "none",
                            flexShrink: 0,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = T.text; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; }}
                        >
                          ← All Submissions
                        </button>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            marginBottom: 12,
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: T.textMuted }}>Code</span>
                          <div style={{ width: 1, height: 14, background: T.border }} />
                          <span
                            style={{
                              fontSize: "var(--text-sm)",
                              fontWeight: 600,
                              color: T.textMuted,
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            {viewingSubmission.submissionLanguage}
                          </span>
                          <div style={{ flex: 1 }} />
                          <span
                            style={{
                              fontSize: "var(--text-xs)",
                              fontWeight: 600,
                              color: viewingSubmission.submissionVerdict === "AC" ? T.green : T.red,
                            }}
                          >
                            {VERDICT_LABEL[viewingSubmission.submissionVerdict] ?? viewingSubmission.submissionVerdict}
                          </span>
                          {viewingSubmission.executionTime != null && (
                            <span style={{ fontSize: "var(--text-xs)", color: T.textMuted }}>
                              {viewingSubmission.executionTime} s
                            </span>
                          )}
                          {viewingSubmission.memoryUsed != null && (
                            <span style={{ fontSize: "var(--text-xs)", color: T.textMuted }}>
                              {viewingSubmission.memoryUsed} KB
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            overflowY: "auto",
                            borderRadius: "8px",
                            border: `1px solid ${T.border}`,
                            background: "#1E1E1E",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                              fontSize: "var(--text-xs)",
                              lineHeight: 1.8,
                            }}
                          >
                            <div
                              style={{
                                padding: "16px 12px",
                                borderRight: `1px solid ${T.border}`,
                                color: T.textDim,
                                userSelect: "none",
                                textAlign: "right",
                                flexShrink: 0,
                                background: "#1a1a1a",
                                minWidth: 50,
                              }}
                            >
                              {(viewingSubmission.sourceCode || "").split("\n").map((_, i) => (
                                <div key={i} style={{ lineHeight: 1.8, fontSize: "var(--text-xs)" }}>
                                  {i + 1}
                                </div>
                              ))}
                            </div>

                            <pre
                              style={{ margin: 0, padding: 16, flex: 1, overflow: "auto" }}
                              dangerouslySetInnerHTML={{
                                __html: `<code class="hljs language-${getHljsLanguage(viewingSubmission.submissionLanguage)}" style="background:transparent;padding:0;font-size:0.75rem;font-family:'JetBrains Mono','Fira Code',monospace;line-height:1.8">${
                                  hljs.highlight(
                                    viewingSubmission.sourceCode || "// No source code available",
                                    { language: getHljsLanguage(viewingSubmission.submissionLanguage) },
                                  ).value
                                }</code>`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {/* Filter chips */}
                        {submissions.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            <button
                              onClick={() => setVerdictFilter(null)}
                              style={{
                                padding: "4px 12px",
                                borderRadius: "20px",
                                fontSize: "var(--text-xs)",
                                fontWeight: 600,
                                cursor: "pointer",
                                background: "transparent",
                                border: "none",
                                color: verdictFilter === null ? T.text : T.textMuted,
                                borderBottom: `2px solid ${verdictFilter === null ? T.accent : "transparent"}`,
                                outline: "none",
                              }}
                            >
                              All
                            </button>

                            {[...new Set(submissions.map((s) => s.submissionVerdict))]
                              .filter(Boolean)
                              .map((v) => (
                                <button
                                  key={v}
                                  onClick={() => setVerdictFilter((prev) => (prev === v ? null : v))}
                                  style={{
                                    padding: "4px 12px",
                                    borderRadius: "20px",
                                    fontSize: "var(--text-xs)",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    border: "none",
                                    outline: "none",
                                    color: v === "AC" ? T.green : T.red,
                                    background: verdictFilter === v ? (v === "AC" ? T.greenDim : T.redDim) : "transparent",
                                    borderBottom: `2px solid ${verdictFilter === v ? (v === "AC" ? T.green : T.red) : "transparent"}`,
                                    transition: "all 0.15s",
                                  }}
                                >
                                  {VERDICT_LABEL[v] ?? v}
                                </button>
                              ))}
                          </div>
                        )}

                        {loadingSubmissions && (
                          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: "16px 0" }}>
                            <div className="spinner" style={{ width: 16, height: 16 }} />
                            <span style={{ fontSize: "var(--text-sm)", color: T.textMuted }}>Loading submissions...</span>
                          </div>
                        )}

                        {!loadingSubmissions && submissions.length === 0 && (
                          <span style={{ fontSize: "var(--text-sm)", color: T.textMuted }}>
                            You have no submissions for this problem yet.
                          </span>
                        )}

                        {/* Table header */}
                        {!loadingSubmissions && submissions.length > 0 && (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 100px 100px 60px",
                              padding: "8px 12px",
                              borderBottom: `1px solid ${T.border}`,
                            }}
                          >
                            {["Submission", "Language", "Time / Mem", "Code"].map((h) => (
                              <span
                                key={h}
                                style={{
                                  fontSize: "var(--text-xs)",
                                  fontWeight: 700,
                                  color: T.textMuted,
                                  letterSpacing: "0.05em",
                                }}
                              >
                                {h}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Rows */}
                        {!loadingSubmissions &&
                          submissions
                            .filter((s) => (verdictFilter ? s.submissionVerdict === verdictFilter : true))
                            .map((sub) => (
                              <div
                                key={sub.id}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr 100px 100px 60px",
                                  alignItems: "center",
                                  padding: "12px",
                                  borderRadius: "8px",
                                  border: `1px solid ${T.border}`,
                                  background: T.bg,
                                  transition: "border-color 0.15s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.borderBright; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; }}
                              >
                                <div>
                                  <span
                                    style={{
                                      fontSize: "var(--text-sm)",
                                      fontWeight: 600,
                                      color: sub.submissionVerdict === "AC" ? T.green : T.red,
                                    }}
                                  >
                                    {VERDICT_LABEL[sub.submissionVerdict] ?? sub.submissionVerdict}
                                  </span>
                                  <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                                    {sub.submissionDate && (
                                      <span style={{ fontSize: "var(--text-xs)", color: T.textMuted }}>
                                        {new Date(sub.submissionDate).toLocaleDateString()}
                                      </span>
                                    )}
                                    {sub.testCasesPassed != null && sub.totalTestCases != null && (
                                      <span style={{ fontSize: "var(--text-xs)", color: T.textMuted }}>
                                        · {sub.testCasesPassed}/{sub.totalTestCases} tests
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <span
                                  style={{
                                    fontSize: "var(--text-xs)",
                                    color: T.textMuted,
                                    fontFamily: "'JetBrains Mono', monospace",
                                  }}
                                >
                                  {sub.submissionLanguage}
                                </span>

                                <div>
                                  {sub.executionTime != null && (
                                    <p style={{ fontSize: "var(--text-xs)", color: T.textMuted, margin: 0 }}>{sub.executionTime} s</p>
                                  )}
                                  {sub.memoryUsed != null && (
                                    <p style={{ fontSize: "var(--text-xs)", color: T.textMuted, margin: 0 }}>{sub.memoryUsed} KB</p>
                                  )}
                                </div>

                                <button
                                  onClick={() => setViewingSubmission(sub)}
                                  style={{
                                    fontSize: "var(--text-xs)",
                                    fontWeight: 600,
                                    color: T.accent,
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    outline: "none",
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                                >
                                  View
                                </button>
                              </div>
                            ))}

                        {/* Empty state after filtering */}
                        {!loadingSubmissions &&
                          submissions.length > 0 &&
                          submissions.filter((s) => (verdictFilter ? s.submissionVerdict === verdictFilter : true)).length === 0 && (
                            <span style={{ fontSize: "var(--text-sm)", color: T.textMuted }}>
                              No {VERDICT_LABEL[verdictFilter]?.label ?? verdictFilter} submissions.
                            </span>
                          )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Results ── */}
                {activeTab === "results" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {submitting && queuePosition != null && (
                      <div
                        style={{
                          padding: 16,
                          borderRadius: "8px",
                          background: T.blueDim,
                          border: `1px solid ${T.blueBorder}`,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div className="spinner" style={{ width: 16, height: 16, borderColor: `${T.blue} transparent transparent transparent` }} />
                        <div>
                          <p style={{ fontWeight: 700, fontSize: "var(--text-sm)", color: T.blue, margin: 0 }}>Waiting in queue</p>
                          <p style={{ fontSize: "var(--text-xs)", color: T.textMuted, margin: 0 }}>Position: {queuePosition}</p>
                        </div>
                      </div>
                    )}

                    {submitting && queuePosition == null && (
                      <div
                        style={{
                          padding: 16,
                          borderRadius: "8px",
                          background: T.accentDim,
                          border: `1px solid ${T.accentBorder}`,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div className="spinner" style={{ width: 16, height: 16, borderColor: `${T.accent} transparent transparent transparent` }} />
                        <div>
                          <p style={{ fontWeight: 700, fontSize: "var(--text-sm)", color: T.accent, margin: 0 }}>Judging...</p>
                          <p style={{ fontSize: "var(--text-xs)", color: T.textMuted, margin: 0 }}>Running against test cases</p>
                        </div>
                      </div>
                    )}

                    {results && (
                      <>
                        <div
                          style={{
                            padding: 16,
                            borderRadius: "8px",
                            background: results.allPassed ? T.greenDim : T.redDim,
                            border: `1px solid ${results.allPassed ? T.green + "44" : T.red + "44"}`,
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          {results.allPassed
                            ? <CheckCircle size={22} color={T.green} />
                            : <XCircle size={22} color={T.red} />
                          }
                          <div>
                            <p
                              style={{
                                fontWeight: 700,
                                fontSize: "var(--text-sm)",
                                color: results.allPassed ? T.green : T.red,
                                margin: 0,
                              }}
                            >
                              {VERDICT_LABEL[results.verdict] ?? results.verdict}
                            </p>
                            <p style={{ fontSize: "var(--text-xs)", color: T.textMuted, margin: 0 }}>
                              {results.passedCount} / {results.totalCount} test cases passed
                            </p>
                            {(results.executionTime != null || results.memoryUsed != null) && (
                              <p style={{ fontSize: "var(--text-xs)", color: T.textMuted, margin: 0 }}>
                                {results.executionTime != null && `${results.executionTime} ms`}
                                {results.executionTime != null && results.memoryUsed != null && " · "}
                                {results.memoryUsed != null && `${results.memoryUsed} KB`}
                              </p>
                            )}
                          </div>
                        </div>

                        {results.errorMessage && (
                          <div>
                            <p
                              style={{
                                fontSize: "var(--text-xs)",
                                color: T.red,
                                fontWeight: 600,
                                margin: "0 0 4px 0",
                              }}
                            >
                              {results.verdict === "CE" ? "COMPILATION ERROR" : "ERROR"}
                            </p>
                            <div
                              style={{
                                background: T.redDim,
                                padding: 12,
                                borderRadius: "6px",
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: "var(--text-xs)",
                                color: T.red,
                                whiteSpace: "pre-wrap",
                                border: `1px solid ${T.redBorder}`,
                                maxHeight: 260,
                                overflowY: "auto",
                              }}
                            >
                              {results.errorMessage}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ══ RIGHT: Code Editor Panel ══ */}
            <div style={{ height: "100%", display: "flex", flexDirection: "column", background: T.bg }}>
              <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
                <CodeEditor
                  ref={codeEditorRef}
                  rightHeaderContent={
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || contestEnded}
                      style={{
                        padding: "6px 20px",
                        background: contestEnded ? T.textDim : T.accent,
                        color: contestEnded ? T.textMuted : "#000",
                        fontWeight: 700,
                        fontSize: "var(--text-sm)",
                        borderRadius: "6px",
                        border: "none",
                        cursor: contestEnded ? "not-allowed" : "pointer",
                        outline: "none",
                        transition: "all 0.15s",
                        opacity: submitting ? 0.7 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!contestEnded && !submitting) {
                          e.currentTarget.style.background = "var(--primary-bright)";
                          e.currentTarget.style.transform = "translateY(-1px)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = contestEnded ? T.textDim : T.accent;
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      {submitting ? "Running..." : contestEnded ? "Contest Ended" : "Run & Submit"}
                    </button>
                  }
                />
              </div>
            </div>
          </ResizablePane>
        </div>
      </div>
    </div>
  );
};

export default ContestProblemPage;
