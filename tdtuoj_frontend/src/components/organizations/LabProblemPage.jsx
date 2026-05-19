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
import Editor from "@monaco-editor/react";
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
    case "CPP": return "cpp";
    case "JAVA": return "java";
    case "PYTHON": return "python";
    case "C": return "c";
    default: return "cpp";
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
    case "cpp": return "CPP";
    case "java": return "JAVA";
    case "python": return "PYTHON";
    case "c": return "C";
    default: return "CPP";
  }
};

const VERDICT_LABEL = {
  AC: "Accepted",
  WA: "Wrong Answer",
  CE: "Compilation Error",
  TLE: "Time Limit Exceeded",
  MLE: "Memory Limit Exceeded",
  SF: "Runtime Error",
};

const DIFF_STYLE = {
  EASY: { color: T.green, bg: T.greenDim, label: "Easy" },
  MEDIUM: { color: T.accent, bg: T.accentDim, label: "Medium" },
  HARD: { color: T.red, bg: T.redDim, label: "Hard" },
};

// ─── Resizable Pane ──────────────────────────────────────────────────────────
const ResizablePane = ({ children, direction = "horizontal", initialSizes = [50, 50] }) => {
  const [sizes, setSizes] = useState(initialSizes);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMouseDown = (e) => { e.preventDefault(); setIsDragging(true); };
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
    <div ref={containerRef} style={{ display: "flex", flexDirection: isH ? "row" : "column", height: "100%", width: "100%", userSelect: isDragging ? "none" : "auto" }}>
      <div style={{ width: isH ? `${sizes[0]}%` : "100%", height: !isH ? `${sizes[0]}%` : "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {children[0]}
      </div>
      <div
        style={{ width: isH ? "5px" : "100%", height: !isH ? "5px" : "100%", background: isDragging ? T.accent : T.border, cursor: isH ? "col-resize" : "row-resize", flexShrink: 0, transition: "background 0.15s", position: "relative", zIndex: 10 }}
        onMouseDown={handleMouseDown}
      />
      <div style={{ width: isH ? `${sizes[1]}%` : "100%", height: !isH ? `${sizes[1]}%` : "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {children[1]}
      </div>
    </div>
  );
};

// ─── Small components ─────────────────────────────────────────────────────────

const DifficultyBadge = ({ difficulty }) => {
  const s = DIFF_STYLE[difficulty] || DIFF_STYLE.EASY;
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: s.color, background: s.bg, border: `1px solid ${s.color}44` }}>
      {s.label}
    </span>
  );
};

const StatChip = ({ icon, value, color }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 4, background: T.surface, border: `1px solid ${T.border}`, fontSize: 11, color: color || T.textMuted, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>
    <span>{icon}</span>
    <span>{value}</span>
  </span>
);

const TagChip = ({ name }) => (
  <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, color: T.purple, background: T.purpleDim, border: `1px solid ${T.purpleBorder}`, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
    {name}
  </span>
);

// ─── Countdown hook ───────────────────────────────────────────────────────────
const useCountdown = (targetDateStr) => {
  const getRemaining = () => {
    if (!targetDateStr) return null;
    const diff = new Date(targetDateStr).getTime() - Date.now();
    if (diff <= 0) return null;
    return { total: diff, hours: Math.floor(diff / 3600000), minutes: Math.floor((diff % 3600000) / 60000), seconds: Math.floor((diff % 60000) / 1000) };
  };
  const [remaining, setRemaining] = useState(getRemaining);
  useEffect(() => {
    setRemaining(getRemaining());
    const id = setInterval(() => setRemaining(getRemaining()), 1000);
    return () => clearInterval(id);
  }, [targetDateStr]);
  return remaining;
};

// ─── Lab Deadline Timer ───────────────────────────────────────────────────────
const LabTimer = ({ deadline }) => {
  const remaining = useCountdown(deadline);
  if (!deadline) return null;
  if (!remaining) {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 6, background: T.redDim, border: `1px solid ${T.redBorder}` }}>
        <Clock size={13} />
        <span style={{ fontSize: 11, fontWeight: 700, color: T.red }}>Deadline Passed</span>
      </div>
    );
  }
  const isUrgent = remaining.total < 5 * 60 * 1000;
  const color = isUrgent ? T.red : T.green;
  const bg = isUrgent ? T.redDim : T.greenDim;
  const pad = (n) => String(n).padStart(2, "0");
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 6, background: bg, border: `1px solid ${color}44` }}>
      <Clock size={13} color={color} />
      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color }}>
        {pad(remaining.hours)}:{pad(remaining.minutes)}:{pad(remaining.seconds)}
      </span>
    </div>
  );
};

// ─── Problem Sidebar ──────────────────────────────────────────────────────────
const ProblemSidebar = ({ problems, currentSlug, basePath, onNavigate, onClose }) => (
  <div style={{ width: 240, height: "100%", background: T.surface, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Problems</span>
      <button style={{ background: "transparent", border: "none", cursor: "pointer", color: T.textMuted }} onClick={onClose}>
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
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "8px 12px", background: isActive ? T.accentDim : "transparent",
              borderLeft: isActive ? `3px solid ${T.accent}` : "3px solid transparent",
              cursor: "pointer", border: "none", transition: "all 0.12s", textAlign: "left",
            }}
            onClick={() => onNavigate(`${basePath}/${p.problemSlug}`)}
          >
            <div style={{ width: 26, height: 26, borderRadius: 6, background: isActive ? T.accent : T.bg, color: isActive ? "#000" : T.textMuted, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
              {letter}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: isActive ? T.text : T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.problemTitle}
              </p>
              {p.problemDifficulty && (
                <p style={{ margin: 0, fontSize: 10, color: (DIFF_STYLE[p.problemDifficulty] || DIFF_STYLE.EASY).color, fontWeight: 600 }}>
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
const LabProblemPage = () => {
  const { orgSlug, labSlug, problemSlug } = useParams();
  const navigate = useNavigate();
  const { showMessage } = useToast();
  const codeEditorRef = useRef(null);

  const [lab, setLab] = useState(null);
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [problem, setProblem] = useState(null);
  const [statement, setStatement] = useState("");
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [pollingId, setPollingId] = useState(null);
  const [queuePosition, setQueuePosition] = useState(null);

  const [activeTab, setActiveTab] = useState("description");
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [verdictFilter, setVerdictFilter] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionsLoaded, setSubmissionsLoaded] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const orgResp = await ApiService.getOrganizationBySlug(orgSlug);
        if (cancelled || orgResp.statusCode !== 200) return;
        const labResp = await ApiService.getOrgLab(orgResp.data.id, labSlug);
        if (!cancelled && labResp.statusCode === 200) {
          setLab(labResp.data);
          if (labResp.data.deadline && new Date(labResp.data.deadline).getTime() <= Date.now()) {
            setDeadlinePassed(true);
          }
        }
      } catch (err) {
        if (!cancelled) showMessage(err.response?.data?.message || err.message, "error");
      }
    };
    load();
    return () => { cancelled = true; };
  }, [orgSlug, labSlug]);

  useEffect(() => {
    if (!lab?.deadline || deadlinePassed) return;
    const diff = new Date(lab.deadline).getTime() - Date.now();
    if (diff <= 0) { setDeadlinePassed(true); return; }
    const timerId = setTimeout(() => {
      setDeadlinePassed(true);
      showMessage("Lab deadline has passed! Submissions are now disabled.", "warning");
    }, diff);
    return () => clearTimeout(timerId);
  }, [lab?.deadline, deadlinePassed]);

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
          }))
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

  useEffect(() => { return () => { if (pollingId) clearInterval(pollingId); }; }, [pollingId]);

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

  const handleSubmit = async () => {
    if (submitting || deadlinePassed) return;
    if (!codeEditorRef.current) return;
    const { code, language } = codeEditorRef.current.getCodeAndLanguage();
    if (!code?.trim()) { showMessage("Please write some code before submitting", "warning"); return; }

    setSubmitting(true);
    setResults(null);
    setQueuePosition(null);

    try {
      const resp = await ApiService.createSubmission({
        sourceCode: code,
        submissionLanguage: mapEditorLanguageToSubmissionLanguage(language),
        problemId: problem.id,
        isPublic: true,
        labId: lab?.id ?? null,
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
              totalCount: updated.totalTestCases ?? testCases.length,
              verdict: updated.submissionVerdict,
              errorMessage: updated.errorMessage,
              executionTime: updated.executionTime,
              memoryUsed: updated.memoryUsed,
            });
            showMessage(
              allPassed ? "All test cases passed! 🎉" : `${updated.testCasesPassed}/${updated.totalTestCases} test cases passed — ${updated.submissionVerdict}`,
              allPassed ? "success" : "warning"
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

  const exercises = lab?.exercises ?? [];
  const problems = exercises.map((ex) => ({
    problemId: ex.problemId,
    problemSlug: ex.problemSlug,
    problemTitle: ex.problemTitle,
    problemDifficulty: ex.problemDifficulty,
    problemOrder: ex.exerciseOrder,
  }));
  const currentIdx = problems.findIndex((p) => p.problemSlug === problemSlug);
  const prevProblem = currentIdx > 0 ? problems[currentIdx - 1] : null;
  const nextProblem = currentIdx < problems.length - 1 ? problems[currentIdx + 1] : null;
  const basePath = `/organizations/${orgSlug}/labs/${labSlug}/problems`;
  const goTo = (p) => navigate(`${basePath}/${p.problemSlug}`);
  const currentExercise = exercises.find((ex) => ex.problemSlug === problemSlug);
  const activeTags = (problem?.tags || []).filter((t) => t.isActive !== false);

  if (loading || !lab) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: T.bg }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${T.accentBorder}`, borderTop: `3px solid ${T.accent}`, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
          <span style={{ color: T.textMuted, fontSize: 13 }}>Loading...</span>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "description", label: "Description" },
    { id: "testcases", label: `Test Cases (${testCases.length})` },
    { id: "submissions", label: "Submissions" },
    ...(currentExercise?.solutionCode ? [{ id: "solution", label: "Solution" }] : []),
    ...(results || submitting ? [{ id: "results", label: submitting ? "Judging..." : `Results ${results.passedCount}/${results.totalCount}` }] : []),
  ];

  const markdownCss = {
    "& h1,& h2,& h3,& h4": { fontWeight: "700", color: T.text, marginBottom: "0.6rem", marginTop: "1.4rem" },
    "& h1": { fontSize: "1.2rem" },
    "& h2": { fontSize: "1.05rem" },
    "& h3": { fontSize: "0.95rem", color: T.textMuted },
    "& p": { marginBottom: "0.9rem", color: "var(--text-secondary)" },
    "& code": { backgroundColor: T.bg, padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.85em", fontFamily: "'JetBrains Mono', monospace", color: T.accent, border: `1px solid ${T.border}` },
    "& pre": { backgroundColor: T.bg, padding: "1rem 1.2rem", borderRadius: "8px", overflowX: "auto", marginBottom: "1rem", border: `1px solid ${T.border}` },
    "& pre code": { backgroundColor: "transparent", padding: "0", color: "#e2e8f0", border: "none", fontSize: "0.85rem" },
    "& ul,& ol": { paddingLeft: "1.4rem", marginBottom: "0.9rem" },
    "& li": { marginBottom: "0.35rem", color: "var(--text-secondary)" },
    "& strong": { fontWeight: "700", color: T.text },
    "& blockquote": { borderLeft: `3px solid ${T.accent}`, paddingLeft: "1rem", marginLeft: "0", color: T.textMuted, fontStyle: "italic" },
  };

  return (
    <div style={{ height: "100vh", width: "100vw", overflow: "hidden", background: T.bg, color: T.text, fontFamily: "var(--font-body)", display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Top Nav Bar ── */}
      <div style={{ height: 44, background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", padding: "0 12px", gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => setSidebarOpen((prev) => !prev)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 6, background: sidebarOpen ? T.accentDim : "transparent", border: `1px solid ${sidebarOpen ? T.accent : T.border}`, color: sidebarOpen ? T.accent : T.textMuted, cursor: "pointer", transition: "all 0.15s" }}
        >
          <Menu size={16} />
        </button>

        <span style={{ fontSize: 16, fontWeight: 800, color: T.accent, letterSpacing: "-0.03em", fontFamily: "'JetBrains Mono', monospace" }}>{"<OJ/>"}</span>

        <div style={{ width: 1, height: 18, background: T.border, margin: "0 4px" }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lab.title}</span>

        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
          <button
            onClick={() => prevProblem && goTo(prevProblem)}
            disabled={!prevProblem}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, background: "transparent", border: `1px solid ${T.border}`, color: prevProblem ? T.textMuted : T.textDim, cursor: prevProblem ? "pointer" : "not-allowed", opacity: prevProblem ? 1 : 0.4, transition: "all 0.12s" }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, minWidth: 30, textAlign: "center" }}>
            {currentIdx >= 0 ? `${currentIdx + 1}/${problems.length}` : "—"}
          </span>
          <button
            onClick={() => nextProblem && goTo(nextProblem)}
            disabled={!nextProblem}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, background: "transparent", border: `1px solid ${T.border}`, color: nextProblem ? T.textMuted : T.textDim, cursor: nextProblem ? "pointer" : "not-allowed", opacity: nextProblem ? 1 : 0.4, transition: "all 0.12s" }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div style={{ flex: 1 }} />

        <LabTimer deadline={lab.deadline} />

        <button
          onClick={() => navigate(`/organizations/${orgSlug}/labs/${labSlug}`)}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 6, background: "transparent", border: `1px solid ${T.border}`, color: T.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
        >
          ← Lab
        </button>
      </div>

      {/* ── Main body ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {sidebarOpen && (
          <ProblemSidebar
            problems={problems}
            currentSlug={problemSlug}
            basePath={basePath}
            onNavigate={(path) => { navigate(path); setSidebarOpen(false); }}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        <div style={{ flex: 1, overflow: "hidden" }}>
          <ResizablePane direction="horizontal" initialSizes={[42, 58]}>
            {/* ══ LEFT: Problem Panel ══ */}
            <div style={{ height: "100%", display: "flex", flexDirection: "column", background: T.surface, borderRight: `1px solid ${T.border}` }}>
              {/* Problem header */}
              <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
                <p style={{ fontSize: 19, fontWeight: 700, color: T.text, marginBottom: 12, lineHeight: 1.3, letterSpacing: "-0.02em" }}>{problem?.title}</p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  {problem?.problemDifficulty && <DifficultyBadge difficulty={problem.problemDifficulty} />}
                  {problem?.solved && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, color: T.green, background: T.greenDim, border: `1px solid ${T.greenBorder}` }}>
                      <CheckCircle size={11} /> Solved
                    </span>
                  )}
                  {problem?.attempted && !problem?.solved && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, color: "#f97316", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)" }}>
                      <Clock size={11} /> Attempted
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
              <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, padding: "0 8px", flexShrink: 0 }}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    style={{
                      padding: "10px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer",
                      color: activeTab === tab.id ? T.text : T.textMuted, background: "transparent", border: "none",
                      borderBottom: `2px solid ${activeTab === tab.id ? T.accent : "transparent"}`, transition: "all 0.15s",
                    }}
                    onClick={async () => {
                      setActiveTab(tab.id);
                      if (tab.id === "submissions" && !submissionsLoaded) await fetchSubmissions();
                    }}
                  >
                    {tab.label}
                    {tab.id === "results" && results && (
                      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: results.allPassed ? T.green : T.red, verticalAlign: "middle", marginLeft: 6 }} />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
                {/* Description */}
                {activeTab === "description" && (
                  <div style={{ fontSize: 13, lineHeight: 1.8, color: T.text }}>
                    <ReactMarkdown>{statement}</ReactMarkdown>
                  </div>
                )}

                {/* Test Cases */}
                {activeTab === "testcases" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {testCases.map((tc, index) => (
                      <div key={tc.id} style={{ borderRadius: 8, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                        <div style={{ padding: "6px 12px", background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: "0.05em" }}>CASE {index + 1}</span>
                        </div>
                        <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          {[{ label: "INPUT", val: tc.input, color: "var(--text-secondary)" }, { label: "EXPECTED", val: tc.output, color: T.green }].map(({ label, val, color }) => (
                            <div key={label}>
                              <p style={{ margin: "0 0 4px", fontSize: 11, color: T.textDim, fontWeight: 600, letterSpacing: "0.04em" }}>{label}</p>
                              <div style={{ background: T.bg, padding: 8, borderRadius: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color, whiteSpace: "pre-wrap", border: `1px solid ${T.border}`, minHeight: 40 }}>
                                {val}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Submissions */}
                {activeTab === "submissions" && (
                  <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    {viewingSubmission ? (
                      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                        <button
                          onClick={() => setViewingSubmission(null)}
                          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: T.textMuted, background: "transparent", border: "none", cursor: "pointer", fontSize: 13, flexShrink: 0 }}
                        >
                          <span>←</span><span>All Submissions</span>
                        </button>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexShrink: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.textMuted }}>Code</span>
                          <div style={{ width: 1, height: 14, background: T.border }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{viewingSubmission.submissionLanguage}</span>
                          <div style={{ flex: 1 }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: viewingSubmission.submissionVerdict === "AC" ? T.green : T.red }}>
                            {VERDICT_LABEL[viewingSubmission.submissionVerdict] ?? viewingSubmission.submissionVerdict}
                          </span>
                          {viewingSubmission.executionTime != null && <span style={{ fontSize: 11, color: T.textMuted }}>{viewingSubmission.executionTime} s</span>}
                          {viewingSubmission.memoryUsed != null && <span style={{ fontSize: 11, color: T.textMuted }}>{viewingSubmission.memoryUsed} KB</span>}
                        </div>
                        <div style={{ overflowY: "auto", borderRadius: 8, border: `1px solid ${T.border}`, background: "#1E1E1E" }}>
                          <div style={{ display: "flex", fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 11, lineHeight: 1.8 }}>
                            <div style={{ padding: "16px 12px", borderRight: `1px solid ${T.border}`, color: T.textDim, userSelect: "none", textAlign: "right", flexShrink: 0, background: "#1a1a1a", minWidth: 50 }}>
                              {(viewingSubmission.sourceCode || "").split("\n").map((_, i) => (
                                <div key={i} style={{ lineHeight: 1.8, fontSize: 11 }}>{i + 1}</div>
                              ))}
                            </div>
                            <pre
                              style={{ margin: 0, padding: 16, flex: 1, overflow: "auto" }}
                              dangerouslySetInnerHTML={{
                                __html: `<code class="hljs language-${getHljsLanguage(viewingSubmission.submissionLanguage)}" style="background:transparent;padding:0;font-size:0.75rem;font-family:'JetBrains Mono','Fira Code',monospace;line-height:1.8">${hljs.highlight(viewingSubmission.sourceCode || "// No source code available", { language: getHljsLanguage(viewingSubmission.submissionLanguage) }).value}</code>`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {submissions.length > 0 && (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button onClick={() => setVerdictFilter(null)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", border: "none", color: verdictFilter === null ? T.text : T.textMuted, borderBottom: `2px solid ${verdictFilter === null ? T.accent : "transparent"}` }}>All</button>
                            {[...new Set(submissions.map((s) => s.submissionVerdict))].filter(Boolean).map((v) => (
                              <button
                                key={v}
                                onClick={() => setVerdictFilter((prev) => prev === v ? null : v)}
                                style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "none", color: v === "AC" ? T.green : T.red, background: verdictFilter === v ? (v === "AC" ? T.greenDim : T.redDim) : "transparent", borderBottom: `2px solid ${verdictFilter === v ? (v === "AC" ? T.green : T.red) : "transparent"}`, transition: "all 0.15s" }}
                              >
                                {VERDICT_LABEL[v] ?? v}
                              </button>
                            ))}
                          </div>
                        )}

                        {loadingSubmissions && (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px 0" }}>
                            <div style={{ width: 16, height: 16, border: `2px solid ${T.accentBorder}`, borderTop: `2px solid ${T.accent}`, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                            <span style={{ fontSize: 13, color: T.textMuted }}>Loading submissions...</span>
                          </div>
                        )}

                        {!loadingSubmissions && submissions.length === 0 && (
                          <p style={{ fontSize: 13, color: T.textMuted }}>You have no submissions for this problem yet.</p>
                        )}

                        {!loadingSubmissions && submissions.length > 0 && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 60px", padding: "6px 12px", borderBottom: `1px solid ${T.border}` }}>
                            {["Submission", "Language", "Time / Mem", "Code"].map((h) => (
                              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: "0.05em" }}>{h}</span>
                            ))}
                          </div>
                        )}

                        {!loadingSubmissions && submissions
                          .filter((s) => verdictFilter ? s.submissionVerdict === verdictFilter : true)
                          .map((sub) => (
                            <div
                              key={sub.id}
                              style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 60px", alignItems: "center", padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, transition: "border-color 0.15s" }}
                            >
                              <div>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: sub.submissionVerdict === "AC" ? T.green : T.red }}>
                                  {VERDICT_LABEL[sub.submissionVerdict] ?? sub.submissionVerdict}
                                </p>
                                <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                                  {sub.submissionDate && <span style={{ fontSize: 11, color: T.textMuted }}>{new Date(sub.submissionDate).toLocaleDateString()}</span>}
                                  {sub.testCasesPassed != null && sub.totalTestCases != null && <span style={{ fontSize: 11, color: T.textMuted }}>· {sub.testCasesPassed}/{sub.totalTestCases} tests</span>}
                                </div>
                              </div>
                              <span style={{ fontSize: 11, color: T.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{sub.submissionLanguage}</span>
                              <div>
                                {sub.executionTime != null && <p style={{ margin: 0, fontSize: 11, color: T.textMuted }}>{sub.executionTime} s</p>}
                                {sub.memoryUsed != null && <p style={{ margin: 0, fontSize: 11, color: T.textMuted }}>{sub.memoryUsed} KB</p>}
                              </div>
                              <button onClick={() => setViewingSubmission(sub)} style={{ fontSize: 11, fontWeight: 600, color: T.accent, background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>View</button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Solution */}
                {activeTab === "solution" && currentExercise?.solutionCode && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ padding: 12, borderRadius: 8, background: `${T.green}15`, border: `1px solid ${T.greenBorder}` }}>
                      <span style={{ fontSize: 13, color: T.green, fontWeight: 500 }}>✅ Solution published by the instructor</span>
                    </div>
                    <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${T.border}`, height: 450 }}>
                      <Editor height="100%" theme="vs-dark" language="cpp" value={currentExercise.solutionCode} options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14, lineNumbers: "on", scrollBeyondLastLine: false, domReadOnly: true }} />
                    </div>
                  </div>
                )}

                {/* Results */}
                {activeTab === "results" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {submitting && queuePosition != null && (
                      <div style={{ padding: 16, borderRadius: 8, background: T.blueDim, border: `1px solid ${T.blueBorder}`, display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 20, height: 20, border: `2px solid ${T.blueBorder}`, borderTop: `2px solid ${T.blue}`, borderRadius: "50%", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: T.blue }}>Waiting in queue</p>
                          <p style={{ margin: 0, fontSize: 11, color: T.textMuted }}>Position: {queuePosition}</p>
                        </div>
                      </div>
                    )}

                    {submitting && queuePosition == null && (
                      <div style={{ padding: 16, borderRadius: 8, background: T.accentDim, border: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 20, height: 20, border: `2px solid ${T.accentBorder}`, borderTop: `2px solid ${T.accent}`, borderRadius: "50%", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: T.accent }}>Judging...</p>
                          <p style={{ margin: 0, fontSize: 11, color: T.textMuted }}>Running against test cases</p>
                        </div>
                      </div>
                    )}

                    {results && (
                      <>
                        <div style={{ padding: 16, borderRadius: 8, background: results.allPassed ? T.greenDim : T.redDim, border: `1px solid ${results.allPassed ? T.greenBorder : T.redBorder}`, display: "flex", alignItems: "center", gap: 12 }}>
                          {results.allPassed ? <CheckCircle size={22} color={T.green} /> : <XCircle size={22} color={T.red} />}
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: results.allPassed ? T.green : T.red }}>{VERDICT_LABEL[results.verdict] ?? results.verdict}</p>
                            <p style={{ margin: 0, fontSize: 11, color: T.textMuted }}>{results.passedCount} / {results.totalCount} test cases passed</p>
                            {(results.executionTime != null || results.memoryUsed != null) && (
                              <p style={{ margin: 0, fontSize: 11, color: T.textMuted }}>
                                {results.executionTime != null && `${results.executionTime} ms`}
                                {results.executionTime != null && results.memoryUsed != null && " · "}
                                {results.memoryUsed != null && `${results.memoryUsed} KB`}
                              </p>
                            )}
                          </div>
                        </div>
                        {results.errorMessage && (
                          <div>
                            <p style={{ margin: "0 0 4px", fontSize: 11, color: T.red, fontWeight: 600 }}>{results.verdict === "CE" ? "COMPILATION ERROR" : "ERROR"}</p>
                            <div style={{ background: T.redDim, padding: 12, borderRadius: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: T.red, whiteSpace: "pre-wrap", border: `1px solid ${T.redBorder}` }}>
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
                      style={{
                        padding: "4px 20px", borderRadius: 6, fontWeight: 700, fontSize: 13,
                        background: deadlinePassed ? T.textDim : T.accent,
                        color: deadlinePassed ? T.textMuted : "#000",
                        border: "none", cursor: deadlinePassed ? "not-allowed" : "pointer", transition: "all 0.15s",
                      }}
                      onClick={handleSubmit}
                      disabled={submitting || deadlinePassed}
                    >
                      {submitting ? "Running..." : deadlinePassed ? "Deadline Passed" : "Run & Submit"}
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

export default LabProblemPage;
