import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Spinner,
  Text,
  Button,
  HStack,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import {
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
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
    case "CPP":
      return "cpp";
    case "JAVA":
      return "java";
    case "PYTHON":
      return "python";
    case "C":
      return "c";
    default:
      return "cpp";
  }
};

// ─── Theme tokens ────────────────────────────────────────────────────────────
const T = {
  bg: "#0f0f0f",
  surface: "#1a1a1a",
  surfaceHover: "#222222",
  border: "#2a2a2a",
  borderBright: "#3a3a3a",
  text: "#e8e8e8",
  textMuted: "#888",
  textDim: "#555",
  accent: "#ffa116",
  accentDim: "rgba(255,161,22,0.12)",
  green: "#2cbb5d",
  greenDim: "rgba(44,187,93,0.12)",
  red: "#ef4743",
  redDim: "rgba(239,71,67,0.12)",
  blue: "#3b82f6",
  blueDim: "rgba(59,130,246,0.1)",
  purple: "#a78bfa",
  purpleDim: "rgba(167,139,250,0.12)",
};

const mapEditorLanguageToSubmissionLanguage = (language) => {
  switch (language) {
    case "cpp":
      return "CPP";
    case "java":
      return "JAVA";
    case "python":
      return "PYTHON";
    case "c":
      return "C";
    default:
      return "CPP";
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
const ResizablePane = ({
  children,
  direction = "horizontal",
  initialSizes = [50, 50],
}) => {
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
    <Box
      ref={containerRef}
      display="flex"
      flexDirection={isH ? "row" : "column"}
      height="100%"
      width="100%"
      userSelect={isDragging ? "none" : "auto"}
    >
      <Box
        width={isH ? `${sizes[0]}%` : "100%"}
        height={!isH ? `${sizes[0]}%` : "100%"}
        overflow="hidden"
        display="flex"
        flexDirection="column"
      >
        {children[0]}
      </Box>

      <Box
        width={isH ? "5px" : "100%"}
        height={!isH ? "5px" : "100%"}
        bg={isDragging ? T.accent : T.border}
        cursor={isH ? "col-resize" : "row-resize"}
        onMouseDown={handleMouseDown}
        flexShrink={0}
        transition="background 0.15s"
        _hover={{ bg: T.accent }}
        position="relative"
        zIndex={10}
      />

      <Box
        width={isH ? `${sizes[1]}%` : "100%"}
        height={!isH ? `${sizes[1]}%` : "100%"}
        overflow="hidden"
        display="flex"
        flexDirection="column"
      >
        {children[1]}
      </Box>
    </Box>
  );
};

// ─── Small components ─────────────────────────────────────────────────────────

const DifficultyBadge = ({ difficulty }) => {
  const s = DIFF_STYLE[difficulty] || DIFF_STYLE.EASY;
  return (
    <Box
      as="span"
      display="inline-block"
      px={2}
      py="2px"
      borderRadius="4px"
      fontSize="xs"
      fontWeight="700"
      letterSpacing="0.04em"
      color={s.color}
      bg={s.bg}
      border={`1px solid ${s.color}44`}
    >
      {s.label}
    </Box>
  );
};

const StatChip = ({ icon, value, color }) => (
  <Box
    display="inline-flex"
    alignItems="center"
    gap={1}
    px={2}
    py="3px"
    borderRadius="4px"
    bg={T.surface}
    border={`1px solid ${T.border}`}
    fontSize="xs"
    color={color || T.textMuted}
    fontWeight="500"
    fontFamily="'JetBrains Mono', monospace"
  >
    <Text>{icon}</Text>
    <Text>{value}</Text>
  </Box>
);

const TagChip = ({ name }) => (
  <Box
    as="span"
    display="inline-block"
    px={2}
    py="3px"
    borderRadius="4px"
    fontSize="xs"
    fontWeight="500"
    color={T.purple}
    bg={T.purpleDim}
    border={`1px solid ${T.purple}33`}
    letterSpacing="0.02em"
    whiteSpace="nowrap"
  >
    {name}
  </Box>
);

// ─── Countdown hook ───────────────────────────────────────────────────────────

const useCountdown = (targetDateStr) => {
  const getRemaining = () => {
    if (!targetDateStr) return null;
    const diff = new Date(targetDateStr).getTime() - Date.now();
    if (diff <= 0) return null;
    return {
      total: diff,
      hours: Math.floor(diff / 3600000),
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
      <HStack
        gap={1}
        px={3}
        py={1}
        borderRadius="6px"
        bg={T.redDim}
        border={`1px solid ${T.red}44`}
      >
        <Clock size={13} />
        <Text fontSize="xs" fontWeight="700" color={T.red}>
          Contest Ended
        </Text>
      </HStack>
    );
  }

  const isUrgent = remaining.total < 5 * 60 * 1000;
  const color = isUrgent ? T.red : T.green;
  const bg = isUrgent ? T.redDim : T.greenDim;
  const pad = (n) => String(n).padStart(2, "0");

  return (
    <HStack
      gap={1.5}
      px={3}
      py={1}
      borderRadius="6px"
      bg={bg}
      border={`1px solid ${color}44`}
    >
      <Clock size={13} color={color} />
      <Text
        fontSize="xs"
        fontWeight="700"
        fontFamily="'JetBrains Mono', monospace"
        color={color}
      >
        {pad(remaining.hours)}:{pad(remaining.minutes)}:
        {pad(remaining.seconds)}
      </Text>
    </HStack>
  );
};

// ─── Problem Sidebar ──────────────────────────────────────────────────────────

const ProblemSidebar = ({
  problems,
  currentSlug,
  contestSlug,
  onNavigate,
  onClose,
}) => (
  <Box
    width="240px"
    height="100%"
    bg={T.surface}
    borderRight={`1px solid ${T.border}`}
    display="flex"
    flexDirection="column"
    flexShrink={0}
  >
    <HStack
      px={3}
      py={2}
      borderBottom={`1px solid ${T.border}`}
      justify="space-between"
    >
      <Text fontSize="sm" fontWeight="700" color={T.text}>
        Problems
      </Text>
      <Box
        as="button"
        bg="transparent"
        border="none"
        cursor="pointer"
        color={T.textMuted}
        _hover={{ color: T.text }}
        onClick={onClose}
        style={{ outline: "none" }}
      >
        <X size={16} />
      </Box>
    </HStack>
    <Box flex={1} overflowY="auto">
      {problems.map((p, idx) => {
        const letter = String.fromCharCode(65 + (p.problemOrder ?? idx + 1) - 1);
        const isActive = p.problemSlug === currentSlug;
        return (
          <Box
            key={p.problemId}
            as="button"
            display="flex"
            alignItems="center"
            gap={2}
            w="100%"
            px={3}
            py={2.5}
            bg={isActive ? T.accentDim : "transparent"}
            borderLeft={isActive ? `3px solid ${T.accent}` : "3px solid transparent"}
            cursor="pointer"
            border="none"
            transition="all 0.12s"
            _hover={{ bg: isActive ? T.accentDim : T.surfaceHover }}
            onClick={() => onNavigate(`/contests/${contestSlug}/problems/${p.problemSlug}`)}
            style={{ outline: "none", textAlign: "left" }}
          >
            <Box
              w="26px"
              h="26px"
              borderRadius="6px"
              bg={isActive ? T.accent : T.bg}
              color={isActive ? "#000" : T.textMuted}
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontWeight="800"
              fontSize="xs"
              flexShrink={0}
            >
              {letter}
            </Box>
            <Box flex={1} minW={0}>
              <Text
                fontSize="xs"
                fontWeight="600"
                color={isActive ? T.text : T.textMuted}
                isTruncated
              >
                {p.problemTitle}
              </Text>
              {p.problemDifficulty && (
                <Text
                  fontSize="10px"
                  color={
                    (DIFF_STYLE[p.problemDifficulty] || DIFF_STYLE.EASY).color
                  }
                  fontWeight="600"
                >
                  {(DIFF_STYLE[p.problemDifficulty] || DIFF_STYLE.EASY).label}
                </Text>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  </Box>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const ContestProblemPage = () => {
  const { contestSlug, problemSlug } = useParams();
  const navigate = useNavigate();
  const { showMessage } = useToast();
  const codeEditorRef = useRef(null);

  // Contest data
  const [contest, setContest] = useState(null);
  const [contestEnded, setContestEnded] = useState(false);

  // Problem data
  const [problem, setProblem] = useState(null);
  const [statement, setStatement] = useState("");
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [pollingId, setPollingId] = useState(null);
  const [queuePosition, setQueuePosition] = useState(null);

  // Tabs & submissions
  const [activeTab, setActiveTab] = useState("description");
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [verdictFilter, setVerdictFilter] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionsLoaded, setSubmissionsLoaded] = useState(false);

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
          // Check if already ended
          if (new Date(resp.data.endTime).getTime() <= Date.now()) {
            setContestEnded(true);
          }
        }
      } catch (err) {
        if (!cancelled)
          showMessage(err.response?.data?.message || err.message, "error");
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [contestSlug]);

  // ── Watch for contest end ──
  useEffect(() => {
    if (!contest?.endTime || contestEnded) return;
    const diff = new Date(contest.endTime).getTime() - Date.now();
    if (diff <= 0) {
      setContestEnded(true);
      return;
    }
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
        const statementRes = await ApiService.fetchFileContent(
          response.data.statementFileUrl,
        );
        setStatement(statementRes);
        const sampleTestCases = response.data.testCases.filter(
          (tc) => tc.isSample === true,
        );
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
    // Reset state when switching problems
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
    return () => {
      if (pollingId) clearInterval(pollingId);
    };
  }, [pollingId]);

  // ── Submissions ──
  const fetchSubmissions = async () => {
    if (!problem?.id) return;
    setLoadingSubmissions(true);
    try {
      const resp = await ApiService.getMySubmissions({
        limit: 20,
        offset: 0,
        problemId: problem.id,
      });
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
              setProblem((prev) => ({
                ...prev,
                solved: true,
                attempted: false,
              }));
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
              allPassed
                ? "All test cases passed! 🎉"
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
  const currentIdx = problems.findIndex(
    (p) => p.problemSlug === problemSlug,
  );
  const prevProblem = currentIdx > 0 ? problems[currentIdx - 1] : null;
  const nextProblem =
    currentIdx < problems.length - 1 ? problems[currentIdx + 1] : null;

  const goTo = (p) => navigate(`/contests/${contestSlug}/problems/${p.problemSlug}`);

  const activeTags = (problem?.tags || []).filter((t) => t.isActive !== false);

  // ── Loading ──
  if (loading || !contest) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
        bg={T.bg}
      >
        <VStack gap={3}>
          <Spinner size="xl" color={T.accent} />
          <Text color={T.textMuted} fontSize="sm">
            Loading...
          </Text>
        </VStack>
      </Box>
    );
  }

  const tabs = [
    { id: "description", label: "Description" },
    { id: "testcases", label: `Test Cases (${testCases.length})` },
    { id: "submissions", label: "Submissions" },
    ...(results || submitting
      ? [
          {
            id: "results",
            label: submitting
              ? "Judging..."
              : `Results ${results.passedCount}/${results.totalCount}`,
          },
        ]
      : []),
  ];

  // ── Markdown styling (same as ProblemDetailsPage) ──
  const markdownCss = {
    "& h1,& h2,& h3,& h4": {
      fontWeight: "700",
      color: T.text,
      marginBottom: "0.6rem",
      marginTop: "1.4rem",
    },
    "& h1": { fontSize: "1.2rem" },
    "& h2": { fontSize: "1.05rem" },
    "& h3": { fontSize: "0.95rem", color: T.textMuted },
    "& p": { marginBottom: "0.9rem", color: "#c8c8c8" },
    "& code": {
      backgroundColor: T.bg,
      padding: "0.15rem 0.45rem",
      borderRadius: "4px",
      fontSize: "0.85em",
      fontFamily: "'JetBrains Mono', monospace",
      color: T.accent,
      border: `1px solid ${T.border}`,
    },
    "& pre": {
      backgroundColor: T.bg,
      padding: "1rem 1.2rem",
      borderRadius: "8px",
      overflowX: "auto",
      marginBottom: "1rem",
      border: `1px solid ${T.border}`,
    },
    "& pre code": {
      backgroundColor: "transparent",
      padding: "0",
      color: "#e2e8f0",
      border: "none",
      fontSize: "0.85rem",
    },
    "& ul,& ol": { paddingLeft: "1.4rem", marginBottom: "0.9rem" },
    "& li": { marginBottom: "0.35rem", color: "#c8c8c8" },
    "& strong": { fontWeight: "700", color: T.text },
    "& blockquote": {
      borderLeft: `3px solid ${T.accent}`,
      paddingLeft: "1rem",
      marginLeft: "0",
      color: T.textMuted,
      fontStyle: "italic",
    },
  };

  return (
    <Box
      height="100vh"
      width="100vw"
      overflow="hidden"
      bg={T.bg}
      color={T.text}
      fontFamily="'Inter', system-ui, sans-serif"
      display="flex"
      flexDirection="column"
    >
      {/* ── Top Nav Bar ── */}
      <Box
        height="44px"
        bg={T.surface}
        borderBottom={`1px solid ${T.border}`}
        display="flex"
        alignItems="center"
        px={3}
        gap={2}
        flexShrink={0}
      >
        {/* Sidebar toggle */}
        <Box
          as="button"
          onClick={() => setSidebarOpen((prev) => !prev)}
          display="flex"
          alignItems="center"
          justifyContent="center"
          w="32px"
          h="32px"
          borderRadius="6px"
          bg={sidebarOpen ? T.accentDim : "transparent"}
          border={`1px solid ${sidebarOpen ? T.accent : T.border}`}
          color={sidebarOpen ? T.accent : T.textMuted}
          cursor="pointer"
          transition="all 0.15s"
          _hover={{ bg: T.accentDim, borderColor: T.accent, color: T.accent }}
          style={{ outline: "none" }}
        >
          <Menu size={16} />
        </Box>

        {/* Brand */}
        <Text
          fontSize="lg"
          fontWeight="800"
          color={T.accent}
          letterSpacing="-0.03em"
          fontFamily="'JetBrains Mono', monospace"
        >
          {"<OJ/>"}
        </Text>

        {/* Contest name */}
        <Box
          w="1px"
          h="18px"
          bg={T.border}
          mx={1}
        />
        <Text
          fontSize="xs"
          fontWeight="600"
          color={T.textMuted}
          maxW="200px"
          isTruncated
        >
          {contest.name}
        </Text>

        {/* Arrow navigation */}
        <HStack gap={1} ml={2}>
          <Box
            as="button"
            onClick={() => prevProblem && goTo(prevProblem)}
            disabled={!prevProblem}
            display="flex"
            alignItems="center"
            justifyContent="center"
            w="28px"
            h="28px"
            borderRadius="6px"
            bg="transparent"
            border={`1px solid ${T.border}`}
            color={prevProblem ? T.textMuted : T.textDim}
            cursor={prevProblem ? "pointer" : "not-allowed"}
            opacity={prevProblem ? 1 : 0.4}
            transition="all 0.12s"
            _hover={prevProblem ? { bg: T.surfaceHover, color: T.text } : {}}
            style={{ outline: "none" }}
          >
            <ChevronLeft size={16} />
          </Box>
          <Text
            fontSize="xs"
            fontWeight="600"
            color={T.textMuted}
            minW="30px"
            textAlign="center"
          >
            {currentIdx >= 0
              ? `${currentIdx + 1}/${problems.length}`
              : "—"}
          </Text>
          <Box
            as="button"
            onClick={() => nextProblem && goTo(nextProblem)}
            disabled={!nextProblem}
            display="flex"
            alignItems="center"
            justifyContent="center"
            w="28px"
            h="28px"
            borderRadius="6px"
            bg="transparent"
            border={`1px solid ${T.border}`}
            color={nextProblem ? T.textMuted : T.textDim}
            cursor={nextProblem ? "pointer" : "not-allowed"}
            opacity={nextProblem ? 1 : 0.4}
            transition="all 0.12s"
            _hover={nextProblem ? { bg: T.surfaceHover, color: T.text } : {}}
            style={{ outline: "none" }}
          >
            <ChevronRight size={16} />
          </Box>
        </HStack>

        <Box flex={1} />

        {/* Contest timer */}
        <ContestTimer endTime={contest.endTime} />

        {/* Back to contest */}
        <Box
          as="button"
          onClick={() => navigate(`/contests/${contestSlug}`)}
          display="flex"
          alignItems="center"
          gap={1}
          px={3}
          py={1}
          borderRadius="6px"
          bg="transparent"
          border={`1px solid ${T.border}`}
          color={T.textMuted}
          fontSize="xs"
          fontWeight="600"
          cursor="pointer"
          transition="all 0.15s"
          _hover={{ bg: T.surfaceHover, color: T.text }}
          style={{ outline: "none" }}
        >
          ← Contest
        </Box>
      </Box>

      {/* ── Main body ── */}
      <Box flex={1} overflow="hidden" display="flex">
        {/* Sidebar */}
        {sidebarOpen && (
          <ProblemSidebar
            problems={problems}
            currentSlug={problemSlug}
            contestSlug={contestSlug}
            onNavigate={(path) => {
              navigate(path);
              setSidebarOpen(false);
            }}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        {/* Resizable pane area */}
        <Box flex={1} overflow="hidden">
          <ResizablePane direction="horizontal" initialSizes={[42, 58]}>
            {/* ══ LEFT: Problem Panel ══ */}
            <Box
              height="100%"
              display="flex"
              flexDirection="column"
              bg={T.surface}
              borderRight={`1px solid ${T.border}`}
            >
              {/* Problem header */}
              <Box
                px={5}
                pt={5}
                pb={4}
                borderBottom={`1px solid ${T.border}`}
                flexShrink={0}
              >
                <Text
                  fontSize="xl"
                  fontWeight="700"
                  color={T.text}
                  mb={3}
                  lineHeight="1.3"
                  letterSpacing="-0.02em"
                >
                  {problem?.title}
                </Text>

                <Wrap gap={2} align="center">
                  {problem?.problemDifficulty && (
                    <WrapItem>
                      <DifficultyBadge difficulty={problem.problemDifficulty} />
                    </WrapItem>
                  )}
                  {problem?.solved && (
                    <WrapItem>
                      <Box
                        display="inline-flex"
                        alignItems="center"
                        gap={1}
                        px={2}
                        py="2px"
                        borderRadius="4px"
                        fontSize="xs"
                        fontWeight="700"
                        color={T.green}
                        bg={T.greenDim}
                        border={`1px solid ${T.green}44`}
                      >
                        <CheckCircle size={11} />
                        <Text>Solved</Text>
                      </Box>
                    </WrapItem>
                  )}
                  {problem?.attempted && !problem?.solved && (
                    <WrapItem>
                      <Box
                        display="inline-flex"
                        alignItems="center"
                        gap={1}
                        px={2}
                        py="2px"
                        borderRadius="4px"
                        fontSize="xs"
                        fontWeight="700"
                        color="#f97316"
                        bg="rgba(249,115,22,0.12)"
                        border="1px solid rgba(249,115,22,0.3)"
                      >
                        <Clock size={11} />
                        <Text>Attempted</Text>
                      </Box>
                    </WrapItem>
                  )}
                  <WrapItem>
                    <StatChip
                      icon="💎"
                      value={`${problem?.point} pts`}
                      color={T.accent}
                    />
                  </WrapItem>
                  <WrapItem>
                    <StatChip
                      icon="⏱"
                      value={`${problem?.timeLimit}s`}
                      color={T.blue}
                    />
                  </WrapItem>
                  <WrapItem>
                    <StatChip
                      icon="💾"
                      value={`${problem?.memoryLimit}MB`}
                      color={T.textMuted}
                    />
                  </WrapItem>
                  {activeTags.length > 0 && (
                    <>
                      <WrapItem>
                        <Box
                          w="1px"
                          h="16px"
                          bg={T.border}
                          mx={1}
                          display={{ base: "none", sm: "block" }}
                        />
                      </WrapItem>
                      {activeTags.map((tag) => (
                        <WrapItem key={tag.id}>
                          <TagChip name={tag.name} />
                        </WrapItem>
                      ))}
                    </>
                  )}
                </Wrap>
              </Box>

              {/* Tab bar */}
              <Box
                display="flex"
                borderBottom={`1px solid ${T.border}`}
                px={2}
                flexShrink={0}
              >
                {tabs.map((tab) => (
                  <Box
                    key={tab.id}
                    as="button"
                    px={4}
                    py={3}
                    fontSize="sm"
                    fontWeight="500"
                    cursor="pointer"
                    color={activeTab === tab.id ? T.text : T.textMuted}
                    bg="transparent"
                    border="none"
                    borderBottomStyle="solid"
                    borderBottomWidth="2px"
                    borderBottomColor={
                      activeTab === tab.id ? T.accent : "transparent"
                    }
                    transition="all 0.15s"
                    _hover={{ color: T.text }}
                    onClick={async () => {
                      setActiveTab(tab.id);
                      if (tab.id === "submissions" && !submissionsLoaded) {
                        await fetchSubmissions();
                      }
                    }}
                    style={{ outline: "none" }}
                  >
                    {tab.label}
                    {tab.id === "results" && results && (
                      <Box
                        as="span"
                        ml={1.5}
                        display="inline-block"
                        w={2}
                        h={2}
                        borderRadius="full"
                        bg={results.allPassed ? T.green : T.red}
                        verticalAlign="middle"
                      />
                    )}
                  </Box>
                ))}
              </Box>

              {/* Tab content */}
              <Box flex={1} overflowY="auto" px={5} py={5}>
                {/* ── Description ── */}
                {activeTab === "description" && (
                  <Box
                    fontSize="sm"
                    lineHeight="1.8"
                    color={T.text}
                    css={markdownCss}
                  >
                    <ReactMarkdown>{statement}</ReactMarkdown>
                  </Box>
                )}

                {/* ── Test Cases ── */}
                {activeTab === "testcases" && (
                  <VStack align="stretch" gap={3}>
                    {testCases.map((tc, index) => (
                      <Box
                        key={tc.id}
                        borderRadius="8px"
                        border={`1px solid ${T.border}`}
                        overflow="hidden"
                      >
                        <Box
                          px={3}
                          py={2}
                          bg={T.bg}
                          borderBottom={`1px solid ${T.border}`}
                        >
                          <Text
                            fontSize="xs"
                            fontWeight="600"
                            color={T.textMuted}
                            letterSpacing="0.05em"
                          >
                            CASE {index + 1}
                          </Text>
                        </Box>
                        <Box
                          p={3}
                          display="grid"
                          gridTemplateColumns="1fr 1fr"
                          gap={3}
                        >
                          {[
                            { label: "INPUT", val: tc.input, color: "#c8c8c8" },
                            {
                              label: "EXPECTED",
                              val: tc.output,
                              color: T.green,
                            },
                          ].map(({ label, val, color }) => (
                            <Box key={label}>
                              <Text
                                fontSize="xs"
                                color={T.textDim}
                                fontWeight="600"
                                mb={1}
                                letterSpacing="0.04em"
                              >
                                {label}
                              </Text>
                              <Box
                                bg={T.bg}
                                p={2}
                                borderRadius="6px"
                                fontFamily="'JetBrains Mono', monospace"
                                fontSize="xs"
                                color={color}
                                whiteSpace="pre-wrap"
                                border={`1px solid ${T.border}`}
                                minH="40px"
                              >
                                {val}
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </VStack>
                )}

                {/* ── Submissions ── */}
                {activeTab === "submissions" && (
                  <Box height="100%" display="flex" flexDirection="column">
                    {viewingSubmission ? (
                      <Box display="flex" flexDirection="column" height="100%">
                        <Box
                          as="button"
                          onClick={() => setViewingSubmission(null)}
                          display="flex"
                          alignItems="center"
                          gap={2}
                          mb={4}
                          color={T.textMuted}
                          bg="transparent"
                          border="none"
                          cursor="pointer"
                          fontSize="sm"
                          _hover={{ color: T.text }}
                          style={{ outline: "none" }}
                          flexShrink={0}
                        >
                          <Text>←</Text>
                          <Text>All Submissions</Text>
                        </Box>

                        <HStack gap={3} mb={3} flexShrink={0}>
                          <Text
                            fontSize="sm"
                            fontWeight="600"
                            color={T.textMuted}
                          >
                            Code
                          </Text>
                          <Box w="1px" h="14px" bg={T.border} />
                          <Text
                            fontSize="sm"
                            fontWeight="600"
                            color={T.textMuted}
                            fontFamily="'JetBrains Mono', monospace"
                          >
                            {viewingSubmission.submissionLanguage}
                          </Text>
                          <Box flex={1} />
                          <Text
                            fontSize="xs"
                            fontWeight="600"
                            color={
                              viewingSubmission.submissionVerdict === "AC"
                                ? T.green
                                : T.red
                            }
                          >
                            {VERDICT_LABEL[
                              viewingSubmission.submissionVerdict
                            ] ?? viewingSubmission.submissionVerdict}
                          </Text>
                          {viewingSubmission.executionTime != null && (
                            <Text fontSize="xs" color={T.textMuted}>
                              {viewingSubmission.executionTime} s
                            </Text>
                          )}
                          {viewingSubmission.memoryUsed != null && (
                            <Text fontSize="xs" color={T.textMuted}>
                              {viewingSubmission.memoryUsed} KB
                            </Text>
                          )}
                        </HStack>

                        <Box
                          overflowY="auto"
                          borderRadius="8px"
                          border={`1px solid ${T.border}`}
                          bg="#1E1E1E"
                        >
                          <Box
                            display="flex"
                            fontFamily="'JetBrains Mono', 'Fira Code', monospace"
                            fontSize="xs"
                            lineHeight="1.8"
                          >
                            <Box
                              px={3}
                              py={4}
                              borderRight={`1px solid ${T.border}`}
                              color={T.textDim}
                              userSelect="none"
                              textAlign="right"
                              flexShrink={0}
                              bg="#1a1a1a"
                              minW="50px"
                            >
                              {(viewingSubmission.sourceCode || "")
                                .split("\n")
                                .map((_, i) => (
                                  <Box key={i} lineHeight="1.8" fontSize="xs">
                                    {i + 1}
                                  </Box>
                                ))}
                            </Box>

                            <Box
                              as="pre"
                              m={0}
                              p={4}
                              flex={1}
                              overflow="auto"
                              css={{
                                "& code.hljs": {
                                  background: "transparent",
                                  padding: 0,
                                  fontSize: "0.75rem",
                                  fontFamily:
                                    "'JetBrains Mono', 'Fira Code', monospace",
                                  lineHeight: "1.8",
                                },
                              }}
                              dangerouslySetInnerHTML={{
                                __html: `<code class="hljs language-${getHljsLanguage(viewingSubmission.submissionLanguage)}">${
                                  hljs.highlight(
                                    viewingSubmission.sourceCode ||
                                      "// No source code available",
                                    {
                                      language: getHljsLanguage(
                                        viewingSubmission.submissionLanguage,
                                      ),
                                    },
                                  ).value
                                }</code>`,
                              }}
                            />
                          </Box>
                        </Box>
                      </Box>
                    ) : (
                      <VStack align="stretch" gap={3}>
                        {/* Filter chips */}
                        {submissions.length > 0 && (
                          <HStack gap={2} flexWrap="wrap">
                            <Box
                              as="button"
                              onClick={() => setVerdictFilter(null)}
                              px={3}
                              py="4px"
                              borderRadius="20px"
                              fontSize="xs"
                              fontWeight="600"
                              cursor="pointer"
                              bg="transparent"
                              border="none"
                              color={
                                verdictFilter === null ? T.text : T.textMuted
                              }
                              borderBottom={`2px solid ${verdictFilter === null ? T.accent : "transparent"}`}
                              style={{ outline: "none" }}
                            >
                              All
                            </Box>

                            {[
                              ...new Set(
                                submissions.map((s) => s.submissionVerdict),
                              ),
                            ]
                              .filter(Boolean)
                              .map((v) => (
                                <Box
                                  key={v}
                                  as="button"
                                  onClick={() =>
                                    setVerdictFilter((prev) =>
                                      prev === v ? null : v,
                                    )
                                  }
                                  px={3}
                                  py="4px"
                                  borderRadius="20px"
                                  fontSize="xs"
                                  fontWeight="600"
                                  cursor="pointer"
                                  border="none"
                                  style={{ outline: "none" }}
                                  color={v === "AC" ? T.green : T.red}
                                  bg={
                                    verdictFilter === v
                                      ? v === "AC"
                                        ? T.greenDim
                                        : T.redDim
                                      : "transparent"
                                  }
                                  borderBottom={`2px solid ${
                                    verdictFilter === v
                                      ? v === "AC"
                                        ? T.green
                                        : T.red
                                      : "transparent"
                                  }`}
                                  transition="all 0.15s"
                                >
                                  {VERDICT_LABEL[v] ?? v}
                                </Box>
                              ))}
                          </HStack>
                        )}

                        {loadingSubmissions && (
                          <HStack justify="center" py={4}>
                            <Spinner size="sm" color={T.accent} />
                            <Text fontSize="sm" color={T.textMuted}>
                              Loading submissions...
                            </Text>
                          </HStack>
                        )}

                        {!loadingSubmissions && submissions.length === 0 && (
                          <Text fontSize="sm" color={T.textMuted}>
                            You have no submissions for this problem yet.
                          </Text>
                        )}

                        {/* Table header */}
                        {!loadingSubmissions && submissions.length > 0 && (
                          <Box
                            display="grid"
                            gridTemplateColumns="1fr 100px 100px 60px"
                            px={3}
                            py={2}
                            borderBottom={`1px solid ${T.border}`}
                          >
                            {[
                              "Submission",
                              "Language",
                              "Time / Mem",
                              "Code",
                            ].map((h) => (
                              <Text
                                key={h}
                                fontSize="xs"
                                fontWeight="700"
                                color={T.textMuted}
                                letterSpacing="0.05em"
                              >
                                {h}
                              </Text>
                            ))}
                          </Box>
                        )}

                        {/* Rows — filtered */}
                        {!loadingSubmissions &&
                          submissions
                            .filter((s) =>
                              verdictFilter
                                ? s.submissionVerdict === verdictFilter
                                : true,
                            )
                            .map((sub) => (
                              <Box
                                key={sub.id}
                                display="grid"
                                gridTemplateColumns="1fr 100px 100px 60px"
                                alignItems="center"
                                px={3}
                                py={3}
                                borderRadius="8px"
                                border={`1px solid ${T.border}`}
                                bg={T.bg}
                                _hover={{ borderColor: T.borderBright }}
                                transition="border-color 0.15s"
                              >
                                <Box>
                                  <Text
                                    fontSize="sm"
                                    fontWeight="600"
                                    color={
                                      sub.submissionVerdict === "AC"
                                        ? T.green
                                        : T.red
                                    }
                                  >
                                    {VERDICT_LABEL[sub.submissionVerdict] ??
                                      sub.submissionVerdict}
                                  </Text>
                                  <HStack gap={2} mt="2px">
                                    {sub.submissionDate && (
                                      <Text fontSize="xs" color={T.textMuted}>
                                        {new Date(
                                          sub.submissionDate,
                                        ).toLocaleDateString()}
                                      </Text>
                                    )}
                                    {sub.testCasesPassed != null &&
                                      sub.totalTestCases != null && (
                                        <Text fontSize="xs" color={T.textMuted}>
                                          · {sub.testCasesPassed}/
                                          {sub.totalTestCases} tests
                                        </Text>
                                      )}
                                  </HStack>
                                </Box>

                                <Text
                                  fontSize="xs"
                                  color={T.textMuted}
                                  fontFamily="'JetBrains Mono', monospace"
                                >
                                  {sub.submissionLanguage}
                                </Text>

                                <Box>
                                  {sub.executionTime != null && (
                                    <Text fontSize="xs" color={T.textMuted}>
                                      {sub.executionTime} s
                                    </Text>
                                  )}
                                  {sub.memoryUsed != null && (
                                    <Text fontSize="xs" color={T.textMuted}>
                                      {sub.memoryUsed} KB
                                    </Text>
                                  )}
                                </Box>

                                <Box
                                  as="button"
                                  onClick={() => setViewingSubmission(sub)}
                                  fontSize="xs"
                                  fontWeight="600"
                                  color={T.accent}
                                  bg="transparent"
                                  border="none"
                                  cursor="pointer"
                                  textAlign="left"
                                  _hover={{ textDecoration: "underline" }}
                                  style={{ outline: "none" }}
                                >
                                  View
                                </Box>
                              </Box>
                            ))}

                        {/* Empty state after filtering */}
                        {!loadingSubmissions &&
                          submissions.length > 0 &&
                          submissions.filter((s) =>
                            verdictFilter
                              ? s.submissionVerdict === verdictFilter
                              : true,
                          ).length === 0 && (
                            <Text fontSize="sm" color={T.textMuted}>
                              No{" "}
                              {VERDICT_LABEL[verdictFilter]?.label ??
                                verdictFilter}{" "}
                              submissions.
                            </Text>
                          )}
                      </VStack>
                    )}
                  </Box>
                )}

                {/* ── Results ── */}
                {activeTab === "results" && (
                  <VStack align="stretch" gap={3}>
                    {submitting && queuePosition != null && (
                      <Box
                        p={4}
                        borderRadius="8px"
                        bg={T.blueDim}
                        border={`1px solid ${T.blue}44`}
                        display="flex"
                        alignItems="center"
                        gap={3}
                      >
                        <Spinner size="sm" color={T.blue} />
                        <Box>
                          <Text fontWeight="700" fontSize="sm" color={T.blue}>
                            Waiting in queue
                          </Text>
                          <Text fontSize="xs" color={T.textMuted}>
                            Position: {queuePosition}
                          </Text>
                        </Box>
                      </Box>
                    )}

                    {submitting && queuePosition == null && (
                      <Box
                        p={4}
                        borderRadius="8px"
                        bg={T.accentDim}
                        border={`1px solid ${T.accent}44`}
                        display="flex"
                        alignItems="center"
                        gap={3}
                      >
                        <Spinner size="sm" color={T.accent} />
                        <Box>
                          <Text
                            fontWeight="700"
                            fontSize="sm"
                            color={T.accent}
                          >
                            Judging...
                          </Text>
                          <Text fontSize="xs" color={T.textMuted}>
                            Running against test cases
                          </Text>
                        </Box>
                      </Box>
                    )}

                    {results && (
                      <>
                        <Box
                          p={4}
                          borderRadius="8px"
                          bg={results.allPassed ? T.greenDim : T.redDim}
                          border={`1px solid ${results.allPassed ? T.green + "44" : T.red + "44"}`}
                          display="flex"
                          alignItems="center"
                          gap={3}
                        >
                          {results.allPassed ? (
                            <CheckCircle size={22} color={T.green} />
                          ) : (
                            <XCircle size={22} color={T.red} />
                          )}
                          <Box>
                            <Text
                              fontWeight="700"
                              fontSize="sm"
                              color={results.allPassed ? T.green : T.red}
                            >
                              {VERDICT_LABEL[results.verdict] ??
                                results.verdict}
                            </Text>
                            <Text fontSize="xs" color={T.textMuted}>
                              {results.passedCount} / {results.totalCount} test
                              cases passed
                            </Text>
                            {(results.executionTime != null ||
                              results.memoryUsed != null) && (
                              <Text fontSize="xs" color={T.textMuted}>
                                {results.executionTime != null &&
                                  `${results.executionTime} ms`}
                                {results.executionTime != null &&
                                  results.memoryUsed != null &&
                                  " · "}
                                {results.memoryUsed != null &&
                                  `${results.memoryUsed} KB`}
                              </Text>
                            )}
                          </Box>
                        </Box>

                        {results.errorMessage && (
                          <Box>
                            <Text
                              fontSize="xs"
                              color={T.red}
                              fontWeight="600"
                              mb={1}
                            >
                              {results.verdict === "CE"
                                ? "COMPILATION ERROR"
                                : "ERROR"}
                            </Text>
                            <Box
                              bg={T.redDim}
                              p={3}
                              borderRadius="6px"
                              fontFamily="'JetBrains Mono', monospace"
                              fontSize="xs"
                              color={T.red}
                              whiteSpace="pre-wrap"
                              border={`1px solid ${T.red}33`}
                            >
                              {results.errorMessage}
                            </Box>
                          </Box>
                        )}
                      </>
                    )}
                  </VStack>
                )}
              </Box>
            </Box>

            {/* ══ RIGHT: Code Editor Panel ══ */}
            <Box height="100%" display="flex" flexDirection="column" bg={T.bg}>
              <Box flex={1} overflow="hidden" position="relative">
                <CodeEditor
                  ref={codeEditorRef}
                  rightHeaderContent={
                    <Button
                      size="sm"
                      bg={contestEnded ? T.textDim : T.accent}
                      color={contestEnded ? T.textMuted : "#000"}
                      fontWeight="700"
                      fontSize="sm"
                      px={5}
                      borderRadius="6px"
                      onClick={handleSubmit}
                      isLoading={submitting}
                      isDisabled={submitting || contestEnded}
                      loadingText="Running..."
                      cursor={contestEnded ? "not-allowed" : "pointer"}
                      _hover={
                        contestEnded
                          ? {}
                          : {
                              bg: "#ffb833",
                              transform: "translateY(-1px)",
                            }
                      }
                      _active={contestEnded ? {} : { bg: "#e08e00" }}
                      transition="all 0.15s"
                    >
                      {contestEnded ? "Contest Ended" : "Run & Submit"}
                    </Button>
                  }
                />
              </Box>
            </Box>
          </ResizablePane>
        </Box>
      </Box>
    </Box>
  );
};

export default ContestProblemPage;
