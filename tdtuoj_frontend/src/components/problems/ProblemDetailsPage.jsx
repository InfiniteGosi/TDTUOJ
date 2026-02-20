import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Spinner,
  Text,
  Button,
  HStack,
  VStack,
  Badge,
} from "@chakra-ui/react";
import { CheckCircle, XCircle, ChevronUp, ChevronDown } from "lucide-react";
import { useMessage } from "../common/MessageDisplay";
import ApiService from "../../services/ApiService";
import ReactMarkdown from "react-markdown";
import CodeEditor from "../CodeEditor/CodeEditor";
import { LANGUAGE_IDS } from "../CodeEditor/constants";

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
  accent: "#ffa116", // LeetCode orange
  accentDim: "rgba(255,161,22,0.12)",
  green: "#2cbb5d",
  greenDim: "rgba(44,187,93,0.12)",
  red: "#ef4743",
  redDim: "rgba(239,71,67,0.12)",
  blue: "#3b82f6",
  blueDim: "rgba(59,130,246,0.1)",
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

      {/* Divider */}
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

// ─── Difficulty Badge ─────────────────────────────────────────────────────────
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

// ─── Stat Chip ────────────────────────────────────────────────────────────────
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

// ─── Main Page ────────────────────────────────────────────────────────────────
const ProblemDetailsPage = () => {
  const { slug } = useParams();
  const [problem, setProblem] = useState(null);
  const [statement, setStatement] = useState("");
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState("description"); // "description" | "testcases" | "results"
  const { MessageDisplay, showMessage } = useMessage();
  const codeEditorRef = useRef(null);

  const fetchProblem = async () => {
    try {
      const response = await ApiService.getProblemBySlug(slug);
      if (response.statusCode === 200) {
        setProblem(response.data);
        const statementRes = await ApiService.fetchFileContent(
          response.data.statementFileUrl,
        );
        setStatement(statementRes);
        const fetched = await Promise.all(
          response.data.testCases.map(async (tc) => ({
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

  const handleSubmit = async () => {
    if (!codeEditorRef.current) return;
    const { code, language } = codeEditorRef.current.getCodeAndLanguage();
    const languageId = LANGUAGE_IDS[language];
    if (!code?.trim()) {
      showMessage("Please write some code before submitting", "warning");
      return;
    }

    setSubmitting(true);
    setResults(null);

    try {
      const testResults = await Promise.all(
        testCases.map(async (tc, index) => {
          try {
            const result = await ApiService.executeCode(
              languageId,
              code,
              tc.input,
              tc.output,
            );
            const passed = result.status?.id === 3;
            return {
              testCaseNumber: index + 1,
              passed,
              input: tc.input,
              expectedOutput: tc.output,
              actualOutput: result.stdout || result.stderr || "No output",
              status: result.status?.description || "Unknown",
              error: result.stderr || result.compile_output || null,
              time: result.time,
              memory: result.memory,
            };
          } catch (error) {
            return {
              testCaseNumber: index + 1,
              passed: false,
              input: tc.input,
              expectedOutput: tc.output,
              actualOutput: "Execution error",
              status: "Error",
              error: error.message,
              time: null,
              memory: null,
            };
          }
        }),
      );

      const allPassed = testResults.every((r) => r.passed);
      const passedCount = testResults.filter((r) => r.passed).length;
      setResults({
        allPassed,
        passedCount,
        totalCount: testCases.length,
        testResults,
      });
      setActiveTab("results");
      showMessage(
        allPassed
          ? "All test cases passed! 🎉"
          : `${passedCount}/${testCases.length} test cases passed`,
        allPassed ? "success" : "warning",
      );
    } catch (error) {
      showMessage(error.message || "Failed to submit code", "error");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchProblem();
  }, [slug]);

  // ── Loading ──
  if (loading) {
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
            Loading problem...
          </Text>
        </VStack>
      </Box>
    );
  }

  // ── Tab definitions ──
  const tabs = [
    { id: "description", label: "Description" },
    { id: "testcases", label: `Test Cases (${testCases.length})` },
    ...(results
      ? [
          {
            id: "results",
            label: `Results ${results.passedCount}/${results.totalCount}`,
          },
        ]
      : []),
  ];

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
        px={4}
        gap={4}
        flexShrink={0}
      >
        {/* Logo area */}
        <Text
          fontSize="lg"
          fontWeight="800"
          color={T.accent}
          letterSpacing="-0.03em"
          fontFamily="'JetBrains Mono', monospace"
        >
          {"<OJ/>"}
        </Text>

        <Box flex={1} />

        <MessageDisplay />
      </Box>

      {/* ── Main 3-column split ── */}
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

              <HStack gap={2} flexWrap="wrap">
                {problem?.problemDifficulty && (
                  <DifficultyBadge difficulty={problem.problemDifficulty} />
                )}
                <StatChip
                  icon="💎"
                  value={`${problem?.point} pts`}
                  color={T.accent}
                />
                <StatChip
                  icon="⏱"
                  value={`${problem?.timeLimit}ms`}
                  color={T.blue}
                />
                <StatChip
                  icon="💾"
                  value={`${problem?.memoryLimit}MB`}
                  color={T.textMuted}
                />
              </HStack>
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
                  borderBottom={
                    activeTab === tab.id
                      ? `2px solid ${T.accent}`
                      : "2px solid transparent"
                  }
                  bg="transparent"
                  border="none"
                  borderBottomStyle="solid"
                  borderBottomWidth="2px"
                  borderBottomColor={
                    activeTab === tab.id ? T.accent : "transparent"
                  }
                  transition="all 0.15s"
                  _hover={{ color: T.text }}
                  onClick={() => setActiveTab(tab.id)}
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
              {/* Description tab */}
              {activeTab === "description" && (
                <Box
                  fontSize="sm"
                  lineHeight="1.8"
                  color={T.text}
                  css={{
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
                    "& ul,& ol": {
                      paddingLeft: "1.4rem",
                      marginBottom: "0.9rem",
                    },
                    "& li": { marginBottom: "0.35rem", color: "#c8c8c8" },
                    "& strong": { fontWeight: "700", color: T.text },
                    "& blockquote": {
                      borderLeft: `3px solid ${T.accent}`,
                      paddingLeft: "1rem",
                      marginLeft: "0",
                      color: T.textMuted,
                      fontStyle: "italic",
                    },
                  }}
                >
                  <ReactMarkdown>{statement}</ReactMarkdown>
                </Box>
              )}

              {/* Test cases tab */}
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
                        <Box>
                          <Text
                            fontSize="xs"
                            color={T.textDim}
                            fontWeight="600"
                            mb={1}
                            letterSpacing="0.04em"
                          >
                            INPUT
                          </Text>
                          <Box
                            bg={T.bg}
                            p={2}
                            borderRadius="6px"
                            fontFamily="'JetBrains Mono', monospace"
                            fontSize="xs"
                            color="#c8c8c8"
                            whiteSpace="pre-wrap"
                            border={`1px solid ${T.border}`}
                            minH="40px"
                          >
                            {tc.input}
                          </Box>
                        </Box>
                        <Box>
                          <Text
                            fontSize="xs"
                            color={T.textDim}
                            fontWeight="600"
                            mb={1}
                            letterSpacing="0.04em"
                          >
                            EXPECTED
                          </Text>
                          <Box
                            bg={T.bg}
                            p={2}
                            borderRadius="6px"
                            fontFamily="'JetBrains Mono', monospace"
                            fontSize="xs"
                            color={T.green}
                            whiteSpace="pre-wrap"
                            border={`1px solid ${T.border}`}
                            minH="40px"
                          >
                            {tc.output}
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </VStack>
              )}

              {/* Results tab */}
              {activeTab === "results" && results && (
                <VStack align="stretch" gap={3}>
                  {/* Summary bar */}
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
                        {results.allPassed ? "Accepted" : "Wrong Answer"}
                      </Text>
                      <Text fontSize="xs" color={T.textMuted}>
                        {results.passedCount} / {results.totalCount} test cases
                        passed
                      </Text>
                    </Box>
                  </Box>

                  {results.testResults.map((result) => (
                    <Box
                      key={result.testCaseNumber}
                      borderRadius="8px"
                      border={`1px solid ${result.passed ? T.green + "44" : T.red + "44"}`}
                      overflow="hidden"
                    >
                      {/* Case header */}
                      <Box
                        px={3}
                        py={2}
                        bg={result.passed ? T.greenDim : T.redDim}
                        display="flex"
                        alignItems="center"
                        gap={2}
                      >
                        {result.passed ? (
                          <CheckCircle size={14} color={T.green} />
                        ) : (
                          <XCircle size={14} color={T.red} />
                        )}
                        <Text
                          fontSize="xs"
                          fontWeight="600"
                          color={result.passed ? T.green : T.red}
                        >
                          Case {result.testCaseNumber}
                        </Text>
                        <Box
                          ml="auto"
                          fontSize="xs"
                          color={T.textMuted}
                          fontFamily="'JetBrains Mono', monospace"
                        >
                          {result.time &&
                            `${result.time}s · ${result.memory}KB`}
                        </Box>
                      </Box>

                      {/* Expanded detail for failed cases */}
                      {!result.passed && (
                        <Box
                          p={3}
                          display="grid"
                          gridTemplateColumns="1fr 1fr 1fr"
                          gap={2}
                        >
                          {[
                            {
                              label: "INPUT",
                              val: result.input,
                              color: "#c8c8c8",
                            },
                            {
                              label: "EXPECTED",
                              val: result.expectedOutput,
                              color: T.green,
                            },
                            {
                              label: "YOUR OUTPUT",
                              val: result.actualOutput,
                              color: T.red,
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
                                minH="36px"
                              >
                                {val}
                              </Box>
                            </Box>
                          ))}
                          {result.error && (
                            <Box gridColumn="1 / -1">
                              <Text
                                fontSize="xs"
                                color={T.red}
                                fontWeight="600"
                                mb={1}
                              >
                                ERROR
                              </Text>
                              <Box
                                bg={T.redDim}
                                p={2}
                                borderRadius="6px"
                                fontFamily="'JetBrains Mono', monospace"
                                fontSize="xs"
                                color={T.red}
                                whiteSpace="pre-wrap"
                                border={`1px solid ${T.red}33`}
                              >
                                {result.error}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  ))}
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
                    bg={T.accent}
                    color="#000"
                    fontWeight="700"
                    fontSize="sm"
                    px={5}
                    borderRadius="6px"
                    onClick={handleSubmit}
                    isLoading={submitting}
                    loadingText="Running..."
                    _hover={{ bg: "#ffb833", transform: "translateY(-1px)" }}
                    _active={{ bg: "#e08e00" }}
                    transition="all 0.15s"
                  >
                    Run & Submit
                  </Button>
                }
              />
            </Box>
          </Box>
        </ResizablePane>
      </Box>
    </Box>
  );
};

export default ProblemDetailsPage;
