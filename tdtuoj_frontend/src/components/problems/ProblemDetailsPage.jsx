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
import { CheckCircle, XCircle } from "lucide-react";
import { useMessage } from "../common/MessageDisplay";
import ApiService from "../../services/ApiService";
import ReactMarkdown from "react-markdown";
import CodeEditor from "../CodeEditor/CodeEditor";
import { LANGUAGE_IDS } from "../CodeEditor/constants";

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

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    if (direction === "horizontal") {
      const newSize = ((e.clientX - rect.left) / rect.width) * 100;
      if (newSize > 20 && newSize < 80) {
        setSizes([newSize, 100 - newSize]);
      }
    } else {
      const newSize = ((e.clientY - rect.top) / rect.height) * 100;
      if (newSize > 20 && newSize < 80) {
        setSizes([newSize, 100 - newSize]);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

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

  return (
    <Box
      ref={containerRef}
      display="flex"
      flexDirection={direction === "horizontal" ? "row" : "column"}
      height="100%"
      width="100%"
      userSelect={isDragging ? "none" : "auto"}
    >
      <Box
        width={direction === "horizontal" ? `${sizes[0]}%` : "100%"}
        height={direction === "vertical" ? `${sizes[0]}%` : "100%"}
        overflow="auto"
      >
        {children[0]}
      </Box>

      <Box
        width={direction === "horizontal" ? "4px" : "100%"}
        height={direction === "vertical" ? "4px" : "100%"}
        bg="gray.300"
        cursor={direction === "horizontal" ? "col-resize" : "row-resize"}
        onMouseDown={handleMouseDown}
        _hover={{ bg: "blue.500" }}
        transition="background 0.2s"
        position="relative"
        zIndex={10}
      />

      <Box
        width={direction === "horizontal" ? `${sizes[1]}%` : "100%"}
        height={direction === "vertical" ? `${sizes[1]}%` : "100%"}
        overflow="auto"
      >
        {children[1]}
      </Box>
    </Box>
  );
};

const ProblemDetailsPage = () => {
  const { slug } = useParams();
  const [problem, setProblem] = useState(null);
  const [statement, setStatement] = useState("");
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
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

        const testCasePromises = response.data.testCases.map(async (tc) => {
          const input = await ApiService.fetchFileContent(tc.inputFileUrl);
          const output = await ApiService.fetchFileContent(
            tc.expectedOutputFileUrl,
          );
          return {
            id: tc.id,
            input: input,
            output: output,
          };
        });

        const fetchedTestCases = await Promise.all(testCasePromises);
        setTestCases(fetchedTestCases);
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

    if (!code || !code.trim()) {
      showMessage("Please write some code before submitting", "warning");
      return;
    }

    setSubmitting(true);
    setResults(null);

    try {
      // Run code against all test cases
      const testResults = await Promise.all(
        testCases.map(async (testCase, index) => {
          try {
            const result = await ApiService.executeCode(
              languageId,
              code,
              testCase.input,
              testCase.output,
            );

            const passed = result.status?.id === 3; // Status 3 = Accepted

            return {
              testCaseNumber: index + 1,
              passed,
              input: testCase.input,
              expectedOutput: testCase.output,
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
              input: testCase.input,
              expectedOutput: testCase.output,
              actualOutput: "Execution error",
              status: "Error",
              error: error.message,
              time: null,
              memory: null,
            };
          }
        }),
      );

      const allPassed = testResults.every((result) => result.passed);
      const passedCount = testResults.filter((result) => result.passed).length;

      setResults({
        allPassed,
        passedCount,
        totalCount: testCases.length,
        testResults,
      });

      if (allPassed) {
        showMessage("All test cases passed! 🎉", "success");
      } else {
        showMessage(
          `${passedCount}/${testCases.length} test cases passed`,
          "warning",
        );
      }
    } catch (error) {
      console.error("Submission error:", error);
      showMessage(error.message || "Failed to submit code", "error");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchProblem();
  }, [slug]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box height="100vh" width="100vw" overflow="hidden">
      <MessageDisplay />
      <ResizablePane direction="horizontal">
        {/* Left side - Problem Statement */}
        <Box p={6} bg="gray.50" height="100%">
          {/* Problem Title and Metadata */}
          <Box mb={4}>
            <Text fontSize="3xl" fontWeight="bold" color="gray.800" mb={3}>
              {problem?.title}
            </Text>
            <HStack gap={3} flexWrap="wrap">
              <Box
                bg="green.50"
                px={3}
                py={1}
                borderRadius="md"
                borderWidth="1px"
                borderColor="green.200"
              >
                <Text fontSize="sm" fontWeight="semibold" color="green.700">
                  💎 {problem?.point} Points
                </Text>
              </Box>
              <Box
                bg="blue.50"
                px={3}
                py={1}
                borderRadius="md"
                borderWidth="1px"
                borderColor="blue.200"
              >
                <Text fontSize="sm" fontWeight="semibold" color="blue.700">
                  ⏱️ {problem?.timeLimit}ms
                </Text>
              </Box>
              <Box
                bg="purple.50"
                px={3}
                py={1}
                borderRadius="md"
                borderWidth="1px"
                borderColor="purple.200"
              >
                <Text fontSize="sm" fontWeight="semibold" color="purple.700">
                  💾 {problem?.memoryLimit}MB
                </Text>
              </Box>
            </HStack>
          </Box>

          {/* Problem Statement Content */}
          <Box
            bg="white"
            borderRadius="lg"
            p={6}
            borderWidth="1px"
            borderColor="gray.200"
            boxShadow="sm"
            height="calc(100% - 100px)"
            overflowY="auto"
            css={{
              "& h1": {
                fontSize: "2xl",
                fontWeight: "bold",
                marginTop: "1.5rem",
                marginBottom: "1rem",
                color: "#2D3748",
              },
              "& h2": {
                fontSize: "xl",
                fontWeight: "bold",
                marginTop: "1.25rem",
                marginBottom: "0.75rem",
                color: "#2D3748",
              },
              "& h3": {
                fontSize: "lg",
                fontWeight: "semibold",
                marginTop: "1rem",
                marginBottom: "0.5rem",
                color: "#4A5568",
              },
              "& p": {
                marginBottom: "1rem",
                lineHeight: "1.7",
                color: "#4A5568",
              },
              "& code": {
                backgroundColor: "#F7FAFC",
                padding: "0.15rem 0.4rem",
                borderRadius: "0.25rem",
                fontSize: "0.9em",
                fontFamily: "monospace",
                color: "#C53030",
                borderWidth: "1px",
                borderColor: "#E2E8F0",
              },
              "& pre": {
                backgroundColor: "#2D3748",
                padding: "1rem",
                borderRadius: "0.5rem",
                overflowX: "auto",
                marginBottom: "1rem",
                borderWidth: "1px",
                borderColor: "#4A5568",
              },
              "& pre code": {
                backgroundColor: "transparent",
                padding: "0",
                color: "#E2E8F0",
                border: "none",
              },
              "& ul": {
                marginLeft: "1.5rem",
                marginBottom: "1rem",
                listStyleType: "disc",
              },
              "& ol": {
                marginLeft: "1.5rem",
                marginBottom: "1rem",
                listStyleType: "decimal",
              },
              "& li": {
                marginBottom: "0.5rem",
                lineHeight: "1.6",
                color: "#4A5568",
              },
              "& blockquote": {
                borderLeftWidth: "4px",
                borderLeftColor: "#3182CE",
                paddingLeft: "1rem",
                marginLeft: "0",
                marginBottom: "1rem",
                fontStyle: "italic",
                color: "#4A5568",
                backgroundColor: "#EBF8FF",
                padding: "1rem",
                borderRadius: "0.25rem",
              },
              "& table": {
                width: "100%",
                marginBottom: "1rem",
                borderCollapse: "collapse",
              },
              "& th": {
                backgroundColor: "#EDF2F7",
                padding: "0.75rem",
                textAlign: "left",
                fontWeight: "semibold",
                borderWidth: "1px",
                borderColor: "#E2E8F0",
              },
              "& td": {
                padding: "0.75rem",
                borderWidth: "1px",
                borderColor: "#E2E8F0",
              },
              "& a": {
                color: "#3182CE",
                textDecoration: "underline",
              },
              "& strong": {
                fontWeight: "bold",
                color: "#2D3748",
              },
            }}
          >
            <ReactMarkdown>{statement}</ReactMarkdown>
          </Box>
        </Box>

        {/* Right side - Code Editor and Test Cases */}
        <ResizablePane direction="vertical" initialSizes={[70, 30]}>
          {/* Top - Code Editor Space */}
          <Box height="100%" display="flex" flexDirection="column">
            <Box flex="1" position="relative">
              <CodeEditor
                ref={codeEditorRef}
                rightHeaderContent={
                  <Button
                    colorScheme="green"
                    size="md"
                    onClick={handleSubmit}
                    isLoading={submitting}
                    loadingText="Submitting..."
                  >
                    Submit Solution
                  </Button>
                }
              />
            </Box>
          </Box>

          {/* Bottom - Test Cases and Results */}
          <Box
            p={4}
            bg="white"
            height="100%"
            borderTop="1px solid"
            borderColor="gray.200"
            overflowY="auto"
          >
            {!results ? (
              <>
                <Text fontSize="lg" fontWeight="semibold" mb={3}>
                  Test Cases
                </Text>
                <Box>
                  {testCases.map((tc, index) => (
                    <Box
                      key={tc.id}
                      mb={4}
                      p={3}
                      borderWidth="1px"
                      borderRadius="md"
                      borderColor="gray.200"
                      bg="gray.50"
                    >
                      <Text fontWeight="semibold" mb={2} color="gray.700">
                        Test Case {index + 1}
                      </Text>
                      <Box mb={2}>
                        <Text
                          fontSize="sm"
                          fontWeight="medium"
                          color="gray.600"
                          mb={1}
                        >
                          Input:
                        </Text>
                        <Box
                          bg="white"
                          p={2}
                          borderRadius="md"
                          fontFamily="monospace"
                          fontSize="sm"
                          whiteSpace="pre-wrap"
                          borderWidth="1px"
                          borderColor="gray.200"
                        >
                          {tc.input}
                        </Box>
                      </Box>
                      <Box>
                        <Text
                          fontSize="sm"
                          fontWeight="medium"
                          color="gray.600"
                          mb={1}
                        >
                          Expected Output:
                        </Text>
                        <Box
                          bg="white"
                          p={2}
                          borderRadius="md"
                          fontFamily="monospace"
                          fontSize="sm"
                          whiteSpace="pre-wrap"
                          borderWidth="1px"
                          borderColor="gray.200"
                        >
                          {tc.output}
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </>
            ) : (
              <>
                <HStack justify="space-between" mb={4}>
                  <Text fontSize="lg" fontWeight="semibold">
                    Submission Results
                  </Text>
                  <HStack gap={2}>
                    <Badge
                      colorScheme={results.allPassed ? "green" : "red"}
                      fontSize="md"
                      px={3}
                      py={1}
                    >
                      {results.passedCount}/{results.totalCount} Passed
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setResults(null)}
                    >
                      View Test Cases
                    </Button>
                  </HStack>
                </HStack>

                <VStack align="stretch" gap={3}>
                  {results.testResults?.map((result) => (
                    <Box
                      key={result.testCaseNumber}
                      p={3}
                      borderRadius="md"
                      borderWidth="2px"
                      borderColor={result.passed ? "green.300" : "red.300"}
                      bg={result.passed ? "green.50" : "red.50"}
                    >
                      <HStack justify="space-between" mb={2}>
                        <HStack>
                          {result.passed ? (
                            <CheckCircle size={20} color="green" />
                          ) : (
                            <XCircle size={20} color="red" />
                          )}
                          <Text fontWeight="semibold" color="gray.700">
                            Test Case {result.testCaseNumber}
                          </Text>
                          <Badge
                            colorScheme={result.passed ? "green" : "red"}
                            fontSize="xs"
                          >
                            {result.status}
                          </Badge>
                        </HStack>
                        {result.time && (
                          <Text fontSize="xs" color="gray.600">
                            ⏱️ {result.time}s | 💾 {result.memory} KB
                          </Text>
                        )}
                      </HStack>

                      {!result.passed && (
                        <VStack align="stretch" gap={2} mt={3}>
                          <Box>
                            <Text
                              fontSize="xs"
                              fontWeight="semibold"
                              color="gray.600"
                              mb={1}
                            >
                              Input:
                            </Text>
                            <Box
                              p={2}
                              bg="white"
                              borderRadius="sm"
                              fontFamily="monospace"
                              fontSize="xs"
                              whiteSpace="pre-wrap"
                              borderWidth="1px"
                              borderColor="gray.200"
                            >
                              {result.input}
                            </Box>
                          </Box>

                          <Box>
                            <Text
                              fontSize="xs"
                              fontWeight="semibold"
                              color="gray.600"
                              mb={1}
                            >
                              Expected Output:
                            </Text>
                            <Box
                              p={2}
                              bg="green.50"
                              borderRadius="sm"
                              fontFamily="monospace"
                              fontSize="xs"
                              whiteSpace="pre-wrap"
                              borderWidth="1px"
                              borderColor="green.200"
                            >
                              {result.expectedOutput}
                            </Box>
                          </Box>

                          <Box>
                            <Text
                              fontSize="xs"
                              fontWeight="semibold"
                              color="gray.600"
                              mb={1}
                            >
                              Your Output:
                            </Text>
                            <Box
                              p={2}
                              bg="red.50"
                              borderRadius="sm"
                              fontFamily="monospace"
                              fontSize="xs"
                              whiteSpace="pre-wrap"
                              borderWidth="1px"
                              borderColor="red.200"
                            >
                              {result.actualOutput}
                            </Box>
                          </Box>

                          {result.error && (
                            <Box>
                              <Text
                                fontSize="xs"
                                fontWeight="semibold"
                                color="red.600"
                                mb={1}
                              >
                                Error:
                              </Text>
                              <Box
                                p={2}
                                bg="red.100"
                                borderRadius="sm"
                                fontFamily="monospace"
                                fontSize="xs"
                                whiteSpace="pre-wrap"
                                color="red.700"
                                borderWidth="1px"
                                borderColor="red.300"
                              >
                                {result.error}
                              </Box>
                            </Box>
                          )}
                        </VStack>
                      )}
                    </Box>
                  ))}
                </VStack>
              </>
            )}
          </Box>
        </ResizablePane>
      </ResizablePane>
    </Box>
  );
};

export default ProblemDetailsPage;
