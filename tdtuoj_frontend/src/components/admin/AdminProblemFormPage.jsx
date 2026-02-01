import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Input,
  Textarea,
  VStack,
  HStack,
  Text,
  Heading,
  Card,
  IconButton,
} from "@chakra-ui/react";
import {
  Plus,
  Trash2,
  FileText,
  Upload,
  Edit2,
  Eye,
  ArrowLeft,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useMessage } from "../common/MessageDisplay";
import ApiService from "../../services/ApiService";

const STATEMENT_PLACEHOLDER = `## Two sum
Find the sum of two given elements. Both the numbers will always be 0 or positive.

#### Sample test case 1
Input
\`\`\`
1, 2
\`\`\`
Output
\`\`\`
3
\`\`\`

#### Sample test case 2
Input
\`\`\`
1, 100
\`\`\`
Output
\`\`\`
101
\`\`\``;

const AdminProblemFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { MessageDisplay, showMessage } = useMessage();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [dataVersion, setDataVersion] = useState(0); // Track data refresh

  const [problemData, setProblemData] = useState({
    title: "",
    point: "",
    timeLimit: "",
    memoryLimit: "",
    statement: "",
  });

  const [testCases, setTestCases] = useState([
    { input: "", expectedOutput: "" },
  ]);

  // Fetch problem data if editing
  useEffect(() => {
    const fetchProblemData = async () => {
      if (!id) return;

      setLoadingData(true);
      try {
        const response = await ApiService.getProblemById(id);

        if (response.statusCode === 200 && response.data) {
          const problem = response.data;

          // Fetch statement file
          let statementContent = "";
          if (problem.statementFileUrl) {
            try {
              // Add timestamp to prevent caching
              const statementUrl = `${
                problem.statementFileUrl
              }?t=${Date.now()}`;
              const statementResponse = await fetch(statementUrl);
              statementContent = await statementResponse.text();
            } catch (err) {
              console.error("Error fetching statement:", err);
              showMessage("Failed to load problem statement", "warning");
            }
          }

          // Set problem data
          setProblemData({
            title: problem.title || "",
            point: problem.point || "",
            timeLimit: problem.timeLimit || "",
            memoryLimit: problem.memoryLimit || "",
            statement: statementContent,
          });

          // Fetch and populate test cases
          if (problem.testCases && problem.testCases.length > 0) {
            const loadedTestCases = await Promise.all(
              problem.testCases.map(async (tc, index) => {
                let input = "";
                let expectedOutput = "";

                try {
                  if (tc.inputFileUrl) {
                    // Add timestamp to prevent caching
                    const inputUrl = `${tc.inputFileUrl}?t=${Date.now()}`;
                    const inputResponse = await fetch(inputUrl);
                    input = await inputResponse.text();
                  }
                  if (tc.expectedOutputFileUrl) {
                    // Add timestamp to prevent caching
                    const outputUrl = `${
                      tc.expectedOutputFileUrl
                    }?t=${Date.now()}`;
                    const outputResponse = await fetch(outputUrl);
                    expectedOutput = await outputResponse.text();
                  }
                } catch (err) {
                  console.error(
                    `Error fetching test case ${index} files:`,
                    err,
                  );
                }

                return { id: tc.id, input, expectedOutput };
              }),
            );

            setTestCases(loadedTestCases);
          } else {
            setTestCases([{ input: "", expectedOutput: "" }]);
          }

          showMessage("Problem loaded successfully", "success");
        } else {
          showMessage("Failed to load problem", "error");
        }
      } catch (err) {
        console.error("Error fetching problem:", err);
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to load problem";
        showMessage(errorMessage, "error");
      } finally {
        setLoadingData(false);
      }
    };

    fetchProblemData();
  }, [id, dataVersion]); // Re-fetch when dataVersion changes

  const handleProblemChange = (field, value) => {
    setProblemData((prev) => ({ ...prev, [field]: value }));
  };

  const addTestCase = () => {
    setTestCases((prev) => [...prev, { input: "", expectedOutput: "" }]);
  };

  const removeTestCase = (index) => {
    if (testCases.length > 1) {
      setTestCases((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleTestCaseChange = (index, field, value) => {
    setTestCases((prev) =>
      prev.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc)),
    );
  };

  const stringToFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  };

  const validateForm = () => {
    if (!problemData.title.trim()) {
      showMessage("Problem title is required", "error");
      return false;
    }
    if (!problemData.point || problemData.point <= 0) {
      showMessage("Point must be greater than 0", "error");
      return false;
    }
    if (!problemData.timeLimit || problemData.timeLimit <= 0) {
      showMessage("Time limit must be greater than 0", "error");
      return false;
    }
    if (!problemData.memoryLimit || problemData.memoryLimit <= 0) {
      showMessage("Memory limit must be greater than 0", "error");
      return false;
    }
    if (!problemData.statement.trim()) {
      showMessage("Problem statement is required", "error");
      return false;
    }

    for (let i = 0; i < testCases.length; i++) {
      if (!testCases[i].input.trim()) {
        showMessage(`Input is required for test case ${i + 1}`, "error");
        return false;
      }
      if (!testCases[i].expectedOutput.trim()) {
        showMessage(
          `Expected output is required for test case ${i + 1}`,
          "error",
        );
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      // Add problem data
      formData.append("title", problemData.title);
      formData.append("point", problemData.point);
      formData.append("timeLimit", problemData.timeLimit);
      formData.append("memoryLimit", problemData.memoryLimit);

      // Convert statement to .md file
      const statementFile = stringToFile(
        problemData.statement,
        "statement.md",
        "text/markdown",
      );
      formData.append("statementFile", statementFile);

      // Convert test cases to .txt files
      testCases.forEach((testCase, index) => {
        // Include test case ID if it exists (for updates)
        if (testCase.id) {
          formData.append(`testCases[${index}].id`, testCase.id);
        }

        const inputFile = stringToFile(
          testCase.input,
          `input_${index}.txt`,
          "text/plain",
        );
        const outputFile = stringToFile(
          testCase.expectedOutput,
          `output_${index}.txt`,
          "text/plain",
        );

        formData.append(`testCases[${index}].inputFile`, inputFile);
        formData.append(`testCases[${index}].expectedOutputFile`, outputFile);
      });

      let response;

      if (id) {
        // Update existing problem - add id to formData
        formData.append("id", id);
        response = await ApiService.updateProblem(formData);
      } else {
        // Create new problem
        response = await ApiService.createProblem(formData);
      }

      if (response.statusCode === 201 || response.statusCode === 200) {
        showMessage(
          response.message ||
            `Problem ${id ? "updated" : "created"} successfully!`,
          "success",
        );

        if (id) {
          // If updating, refresh the data to show the latest changes
          // Wait a bit for S3 to propagate changes
          setTimeout(() => {
            setDataVersion((prev) => prev + 1);
          }, 1000);
        } else {
          // If creating, navigate to problems list or reset form
          setTimeout(() => {
            navigate("/admin/problems");
          }, 1500);
        }
      } else {
        showMessage(
          response.message || `Failed to ${id ? "update" : "create"} problem`,
          "error",
        );
      }
    } catch (err) {
      console.error(`Error ${id ? "updating" : "creating"} problem:`, err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        `Failed to ${id ? "update" : "create"} problem`;
      showMessage(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Box
        minH="100vh"
        bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Card.Root bg="white" borderRadius="xl" p={8}>
          <VStack gap={4}>
            <Text fontSize="xl" color="gray.700">
              Loading problem data...
            </Text>
            <Box
              w="40px"
              h="40px"
              border="4px solid"
              borderColor="purple.200"
              borderTopColor="purple.600"
              borderRadius="full"
              animation="spin 1s linear infinite"
            />
          </VStack>
        </Card.Root>
      </Box>
    );
  }

  return (
    <Box
      minH="100vh"
      bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      py={8}
      px={4}
    >
      <Box maxW="1200px" mx="auto">
        <Card.Root bg="white" borderRadius="xl" p={8} boxShadow="2xl">
          <HStack mb={6} gap={3} justify="space-between">
            <HStack gap={3}>
              <FileText size={32} color="#667eea" />
              <Heading size="2xl" color="gray.800">
                {id ? "Edit Problem" : "Create New Problem"}
              </Heading>
            </HStack>
            <Button
              leftIcon={<ArrowLeft size={20} />}
              variant="ghost"
              onClick={() => navigate("/admin/problems")}
            >
              Back to Problems
            </Button>
          </HStack>

          <MessageDisplay />

          <VStack gap={6} align="stretch">
            {/* Problem Details Section */}
            <Box borderBottomWidth="1px" pb={6}>
              <Heading size="xl" color="gray.700" mb={4}>
                Problem Details
              </Heading>

              <VStack gap={4} align="stretch">
                <Box>
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    color="gray.700"
                    mb={2}
                  >
                    Title *
                  </Text>
                  <Input
                    value={problemData.title}
                    onChange={(e) =>
                      handleProblemChange("title", e.target.value)
                    }
                    placeholder="Enter problem title"
                    size="lg"
                  />
                </Box>

                <HStack gap={4}>
                  <Box flex={1}>
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color="gray.700"
                      mb={2}
                    >
                      Points *
                    </Text>
                    <Input
                      type="number"
                      value={problemData.point}
                      onChange={(e) =>
                        handleProblemChange("point", e.target.value)
                      }
                      placeholder="100"
                      min={1}
                      size="lg"
                    />
                  </Box>

                  <Box flex={1}>
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color="gray.700"
                      mb={2}
                    >
                      Time Limit (ms) *
                    </Text>
                    <Input
                      type="number"
                      value={problemData.timeLimit}
                      onChange={(e) =>
                        handleProblemChange("timeLimit", e.target.value)
                      }
                      placeholder="1000"
                      min={1}
                      size="lg"
                    />
                  </Box>

                  <Box flex={1}>
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color="gray.700"
                      mb={2}
                    >
                      Memory Limit (MB) *
                    </Text>
                    <Input
                      type="number"
                      value={problemData.memoryLimit}
                      onChange={(e) =>
                        handleProblemChange("memoryLimit", e.target.value)
                      }
                      placeholder="256"
                      min={1}
                      size="lg"
                    />
                  </Box>
                </HStack>

                {/* Statement with Preview */}
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700">
                      Problem Statement (Markdown) *
                    </Text>
                    <HStack gap={2}>
                      <Button
                        size="sm"
                        variant={!previewMode ? "solid" : "ghost"}
                        colorScheme={!previewMode ? "purple" : "gray"}
                        onClick={() => setPreviewMode(false)}
                        leftIcon={<Edit2 size={16} />}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={previewMode ? "solid" : "ghost"}
                        colorScheme={previewMode ? "purple" : "gray"}
                        onClick={() => setPreviewMode(true)}
                        leftIcon={<Eye size={16} />}
                      >
                        Preview
                      </Button>
                    </HStack>
                  </HStack>

                  {!previewMode ? (
                    <>
                      <Textarea
                        value={problemData.statement}
                        onChange={(e) =>
                          handleProblemChange("statement", e.target.value)
                        }
                        placeholder={STATEMENT_PLACEHOLDER}
                        minH="300px"
                        fontFamily="monospace"
                        fontSize="sm"
                        bg="gray.50"
                        borderColor="gray.300"
                      />
                      <Text fontSize="xs" color="gray.600" mt={2}>
                        This will be converted to a .md file. Use Markdown
                        syntax for formatting.
                      </Text>
                    </>
                  ) : (
                    <Box
                      minH="300px"
                      p={4}
                      bg="white"
                      borderWidth="1px"
                      borderColor="gray.300"
                      borderRadius="md"
                      overflowY="auto"
                      maxH="500px"
                    >
                      {problemData.statement ? (
                        <Box
                          className="markdown-preview"
                          sx={{
                            "& h2": {
                              fontSize: "1.5rem",
                              fontWeight: "bold",
                              mt: 4,
                              mb: 2,
                            },
                            "& h3": {
                              fontSize: "1.25rem",
                              fontWeight: "bold",
                              mt: 3,
                              mb: 2,
                            },
                            "& h4": {
                              fontSize: "1.1rem",
                              fontWeight: "bold",
                              mt: 2,
                              mb: 1,
                            },
                            "& p": { mb: 2 },
                            "& code": {
                              bg: "gray.100",
                              px: 1,
                              py: 0.5,
                              borderRadius: "sm",
                              fontFamily: "monospace",
                              fontSize: "sm",
                            },
                            "& pre": {
                              bg: "gray.800",
                              color: "white",
                              p: 3,
                              borderRadius: "md",
                              overflowX: "auto",
                              my: 2,
                            },
                            "& pre code": {
                              bg: "transparent",
                              color: "white",
                              p: 0,
                            },
                          }}
                        >
                          <ReactMarkdown>{problemData.statement}</ReactMarkdown>
                        </Box>
                      ) : (
                        <Text color="gray.400" fontStyle="italic">
                          No content to preview. Start typing in the editor...
                        </Text>
                      )}
                    </Box>
                  )}
                </Box>
              </VStack>
            </Box>

            {/* Test Cases Section */}
            <Box>
              <Heading size="xl" color="gray.700" mb={4}>
                Test Cases
              </Heading>

              <VStack gap={4} align="stretch">
                {testCases.map((testCase, index) => (
                  <Card.Root key={index} bg="gray.50" p={4} borderRadius="lg">
                    <HStack justify="space-between" mb={3}>
                      <Heading size="md" color="gray.700">
                        Test Case {index + 1}
                      </Heading>
                      {testCases.length > 1 && (
                        <IconButton
                          onClick={() => removeTestCase(index)}
                          colorScheme="red"
                          variant="ghost"
                          size="sm"
                        >
                          <Trash2 size={20} />
                        </IconButton>
                      )}
                    </HStack>

                    <HStack gap={4} align="flex-start">
                      <Box flex={1}>
                        <Text
                          fontSize="sm"
                          fontWeight="medium"
                          color="gray.700"
                          mb={2}
                        >
                          Input *
                        </Text>
                        <Textarea
                          value={testCase.input}
                          onChange={(e) =>
                            handleTestCaseChange(index, "input", e.target.value)
                          }
                          placeholder="Enter test input..."
                          minH="120px"
                          fontFamily="monospace"
                          fontSize="sm"
                        />
                        <Text fontSize="xs" color="gray.600" mt={1}>
                          Will be saved as {index}.txt
                        </Text>
                      </Box>

                      <Box flex={1}>
                        <Text
                          fontSize="sm"
                          fontWeight="medium"
                          color="gray.700"
                          mb={2}
                        >
                          Expected Output *
                        </Text>
                        <Textarea
                          value={testCase.expectedOutput}
                          onChange={(e) =>
                            handleTestCaseChange(
                              index,
                              "expectedOutput",
                              e.target.value,
                            )
                          }
                          placeholder="Enter expected output..."
                          minH="120px"
                          fontFamily="monospace"
                          fontSize="sm"
                        />
                        <Text fontSize="xs" color="gray.600" mt={1}>
                          Will be saved as {index}.txt
                        </Text>
                      </Box>
                    </HStack>
                  </Card.Root>
                ))}

                <Button
                  onClick={addTestCase}
                  colorScheme="purple"
                  size="md"
                  variant="outline"
                  gap={2}
                  w="full"
                >
                  <Plus size={20} />
                  Add Test Case
                </Button>
              </VStack>
            </Box>

            {/* Submit Button */}
            <HStack justify="flex-end" pt={6} borderTopWidth="1px">
              <Button
                onClick={handleSubmit}
                colorScheme="purple"
                size="lg"
                isLoading={loading}
                loadingText={id ? "Updating..." : "Creating..."}
                gap={2}
              >
                <Upload size={20} />
                {id ? "Update Problem" : "Create Problem"}
              </Button>
            </HStack>
          </VStack>
        </Card.Root>
      </Box>
    </Box>
  );
};

export default AdminProblemFormPage;
