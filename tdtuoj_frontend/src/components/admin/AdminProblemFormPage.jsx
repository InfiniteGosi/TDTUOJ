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
  NativeSelect,
  Badge,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import {
  Plus,
  Trash2,
  FileText,
  Upload,
  Edit2,
  Eye,
  ArrowLeft,
  User,
  Tag as TagIcon,
  X,
  AlertTriangle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useToast } from "../common/ToastMessage";
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

const DIFFICULTY_OPTIONS = [
  { value: "", label: "Select difficulty..." },
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

const DIFFICULTY_COLORS = {
  EASY: "#38a169",
  MEDIUM: "#d69e2e",
  HARD: "#e53e3e",
};

const AdminProblemFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showMessage } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [authorInfo, setAuthorInfo] = useState({ id: null, username: null });

  const [problemData, setProblemData] = useState({
    title: "",
    point: "",
    timeLimit: "",
    memoryLimit: "",
    statement: "",
    problemDifficulty: "",
  });

  const [testCases, setTestCases] = useState([
    { input: "", expectedOutput: "" },
  ]);

  // Tag state
  const [availableTags, setAvailableTags] = useState([]); // all active tags from server
  const [selectedTags, setSelectedTags] = useState([]); // {id, name, isActive} objects currently on the problem
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  // Fetch active tags for picker
  const fetchActiveTags = async () => {
    try {
      const response = await ApiService.getAllTags({ limit: 200, offset: 0 });
      if (response.statusCode === 200) {
        const active = (response.data.content || []).filter(
          (t) => t.isActive === true,
        );
        setAvailableTags(active);
      }
    } catch (err) {
      console.error("Failed to fetch tags:", err);
    }
  };

  // Fetch current logged-in user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const profile = await ApiService.getOwnProfile();
        if (profile?.data?.id) setCurrentUserId(profile.data.id);
      } catch (err) {
        showMessage("Failed to fetch user profile", "error");
      }
    };
    fetchCurrentUser();
    fetchActiveTags();
  }, []);

  // Fetch problem data when editing
  useEffect(() => {
    const fetchProblemData = async () => {
      if (!id) return;
      setLoadingData(true);
      try {
        const response = await ApiService.getProblemById(id);
        if (response.statusCode === 200 && response.data) {
          const problem = response.data;

          setAuthorInfo({
            id: problem.authorId || null,
            username: problem.authorUserName || null,
          });

          // Load existing tags (may include inactive ones that were assigned before being disabled)
          if (problem.tags && problem.tags.length > 0) {
            setSelectedTags(problem.tags);
          }

          let statementContent = "";
          if (problem.statementFileUrl) {
            try {
              const statementResponse = await fetch(
                `${problem.statementFileUrl}?t=${Date.now()}`,
              );
              statementContent = await statementResponse.text();
            } catch (err) {
              showMessage("Failed to load problem statement", "warning");
            }
          }

          setProblemData({
            title: problem.title || "",
            point: problem.point || "",
            timeLimit: problem.timeLimit || "",
            memoryLimit: problem.memoryLimit || "",
            statement: statementContent,
            problemDifficulty: problem.problemDifficulty || "",
          });

          if (problem.testCases && problem.testCases.length > 0) {
            const loaded = await Promise.all(
              problem.testCases.map(async (tc, index) => {
                let input = "";
                let expectedOutput = "";
                try {
                  if (tc.inputFileUrl) {
                    input = await (
                      await fetch(`${tc.inputFileUrl}?t=${Date.now()}`)
                    ).text();
                  }
                  if (tc.expectedOutputFileUrl) {
                    expectedOutput = await (
                      await fetch(`${tc.expectedOutputFileUrl}?t=${Date.now()}`)
                    ).text();
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
            setTestCases(loaded);
          } else {
            setTestCases([{ input: "", expectedOutput: "" }]);
          }

          showMessage("Problem loaded successfully", "success");
        } else {
          showMessage("Failed to load problem", "error");
        }
      } catch (err) {
        showMessage(
          err.response?.data?.message ||
            err.message ||
            "Failed to load problem",
          "error",
        );
      } finally {
        setLoadingData(false);
      }
    };

    fetchProblemData();
  }, [id, dataVersion]);

  // ─── Tag helpers ────────────────────────────────────────────────────────────

  const inactiveTags = selectedTags.filter((t) => t.isActive === false);
  const hasInactiveTags = inactiveTags.length > 0;

  const addTag = (tag) => {
    if (!selectedTags.find((t) => t.id === tag.id)) {
      setSelectedTags((prev) => [...prev, tag]);
    }
    setTagSearchQuery("");
    setShowTagDropdown(false);
  };

  const removeTag = (tagId) => {
    setSelectedTags((prev) => prev.filter((t) => t.id !== tagId));
  };

  const removeAllInactiveTags = () => {
    setSelectedTags((prev) => prev.filter((t) => t.isActive !== false));
  };

  // Tags available in the dropdown = active tags not yet selected
  const filteredDropdownTags = availableTags.filter(
    (t) =>
      !selectedTags.find((s) => s.id === t.id) &&
      t.name.toLowerCase().includes(tagSearchQuery.toLowerCase()),
  );

  // ─── Form helpers ────────────────────────────────────────────────────────────

  const handleProblemChange = (field, value) =>
    setProblemData((prev) => ({ ...prev, [field]: value }));

  const addTestCase = () =>
    setTestCases((prev) => [...prev, { input: "", expectedOutput: "" }]);

  const removeTestCase = (index) => {
    if (testCases.length > 1)
      setTestCases((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTestCaseChange = (index, field, value) =>
    setTestCases((prev) =>
      prev.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc)),
    );

  const stringToFile = (content, filename, mimeType) =>
    new File([new Blob([content], { type: mimeType })], filename, {
      type: mimeType,
    });

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
    if (problemData.timeLimit > 10) {
      showMessage("Time limit cannot exceed 10 seconds", "error");
      return false;
    }
    if (problemData.memoryLimit < 16) {
      showMessage("Memory limit must be at least 16MB", "error");
      return false;
    }
    if (problemData.memoryLimit > 1024) {
      showMessage("Memory limit cannot exceed 1024MB", "error");
      return false;
    }
    if (!problemData.statement.trim()) {
      showMessage("Problem statement is required", "error");
      return false;
    }
    if (!problemData.problemDifficulty) {
      showMessage("Problem difficulty is required", "error");
      return false;
    }
    if (hasInactiveTags) {
      showMessage(
        "Please remove disabled tags before saving. Disabled tags cannot be assigned to problems.",
        "error",
      );
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
    if (!currentUserId) {
      showMessage("User profile not loaded. Please try again.", "error");
      return;
    }
    if (!validateForm()) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", problemData.title);
      formData.append("point", problemData.point);
      formData.append("timeLimit", problemData.timeLimit);
      formData.append("memoryLimit", problemData.memoryLimit);
      formData.append("authorId", currentUserId);
      formData.append("problemDifficulty", problemData.problemDifficulty);
      formData.append(
        "statementFile",
        stringToFile(problemData.statement, "statement.md", "text/markdown"),
      );

      // Pass active tag IDs via tagNames field (names used server-side for lookup)
      const activeSelectedTags = selectedTags.filter(
        (t) => t.isActive !== false,
      );
      activeSelectedTags.forEach((tag) => {
        formData.append("tagNames", tag.name);
      });

      testCases.forEach((tc, index) => {
        if (tc.id) formData.append(`testCases[${index}].id`, tc.id);
        formData.append(
          `testCases[${index}].inputFile`,
          stringToFile(tc.input, `input_${index}.txt`, "text/plain"),
        );
        formData.append(
          `testCases[${index}].expectedOutputFile`,
          stringToFile(tc.expectedOutput, `output_${index}.txt`, "text/plain"),
        );
      });

      let response;
      if (id) {
        formData.append("id", id);
        response = await ApiService.updateProblem(formData);
      } else {
        response = await ApiService.createProblem(formData);
      }

      if (response.statusCode === 201 || response.statusCode === 200) {
        showMessage(
          response.message ||
            `Problem ${id ? "updated" : "created"} successfully!`,
          "success",
        );
        if (id) {
          setTimeout(() => setDataVersion((v) => v + 1), 1000);
        } else {
          setTimeout(() => navigate("/admin/problems"), 1500);
        }
      } else {
        showMessage(
          response.message || `Failed to ${id ? "update" : "create"} problem`,
          "error",
        );
      }
    } catch (err) {
      showMessage(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          `Failed to ${id ? "update" : "create"} problem`,
        "error",
      );
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
      onClick={() => showTagDropdown && setShowTagDropdown(false)}
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

          <VStack gap={6} align="stretch">
            {/* Problem Details */}
            <Box borderBottomWidth="1px" pb={6}>
              <HStack justify="space-between" align="center" mb={4}>
                <Heading size="xl" color="gray.700">
                  Problem Details
                </Heading>
                {id && authorInfo.id && (
                  <HStack
                    gap={2}
                    bg="purple.50"
                    border="1px solid"
                    borderColor="purple.200"
                    borderRadius="lg"
                    px={4}
                    py={2}
                  >
                    <User size={16} color="#667eea" />
                    <Text fontSize="sm" color="gray.600">
                      Author:
                    </Text>
                    <Badge
                      colorScheme="purple"
                      variant="subtle"
                      fontSize="sm"
                      px={2}
                      py={0.5}
                      borderRadius="md"
                    >
                      {authorInfo.username}
                    </Badge>
                    <Text fontSize="xs" color="gray.400">
                      (ID: {authorInfo.id})
                    </Text>
                  </HStack>
                )}
              </HStack>

              <VStack gap={4} align="stretch">
                {/* Title */}
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

                {/* Numeric fields + difficulty */}
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
                      Time Limit (s) *{" "}
                      <Box as="span" fontSize="xs" color="gray.400">
                        (max 10s)
                      </Box>
                    </Text>
                    <Input
                      type="number"
                      value={problemData.timeLimit}
                      onChange={(e) =>
                        handleProblemChange("timeLimit", e.target.value)
                      }
                      placeholder="2"
                      min={1}
                      max={10}
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
                      Memory Limit (MB) *{" "}
                      <Box as="span" fontSize="xs" color="gray.400">
                        (max 1024MB)
                      </Box>
                    </Text>
                    <Input
                      type="number"
                      value={problemData.memoryLimit}
                      onChange={(e) =>
                        handleProblemChange("memoryLimit", e.target.value)
                      }
                      placeholder="256"
                      min={16}
                      max={1024}
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
                      Difficulty *
                    </Text>
                    <NativeSelect.Root size="lg">
                      <NativeSelect.Field
                        value={problemData.problemDifficulty}
                        onChange={(e) =>
                          handleProblemChange(
                            "problemDifficulty",
                            e.target.value,
                          )
                        }
                        color={
                          problemData.problemDifficulty
                            ? DIFFICULTY_COLORS[problemData.problemDifficulty]
                            : "gray.500"
                        }
                        fontWeight={
                          problemData.problemDifficulty ? "semibold" : "normal"
                        }
                      >
                        {DIFFICULTY_OPTIONS.map((opt) => (
                          <option
                            key={opt.value}
                            value={opt.value}
                            style={{
                              color: opt.value
                                ? DIFFICULTY_COLORS[opt.value]
                                : "inherit",
                              fontWeight: opt.value ? "600" : "normal",
                            }}
                          >
                            {opt.label}
                          </option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Box>
                </HStack>

                {/* ── Tags section ─────────────────────────────────────────────── */}
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <HStack gap={1}>
                      <TagIcon size={16} color="#805AD5" />
                      <Text fontSize="sm" fontWeight="medium" color="gray.700">
                        Tags
                      </Text>
                    </HStack>
                    {hasInactiveTags && (
                      <Button
                        size="xs"
                        colorScheme="orange"
                        variant="ghost"
                        leftIcon={<Trash2 size={12} />}
                        onClick={removeAllInactiveTags}
                      >
                        Remove all disabled tags
                      </Button>
                    )}
                  </HStack>

                  {/* Inactive tag warning banner */}
                  {hasInactiveTags && (
                    <Box
                      mb={3}
                      p={3}
                      bg="orange.50"
                      border="1px solid"
                      borderColor="orange.200"
                      borderRadius="md"
                    >
                      <HStack gap={2} align="flex-start">
                        <Box color="orange.500" mt={0.5} flexShrink={0}>
                          <AlertTriangle size={16} />
                        </Box>
                        <VStack align="flex-start" gap={0}>
                          <Text
                            fontSize="sm"
                            fontWeight="semibold"
                            color="orange.700"
                          >
                            {inactiveTags.length} disabled tag
                            {inactiveTags.length > 1 ? "s" : ""} detected
                          </Text>
                          <Text fontSize="xs" color="orange.600">
                            The following tag
                            {inactiveTags.length > 1 ? "s have" : " has"} been
                            disabled:{" "}
                            <strong>
                              {inactiveTags.map((t) => t.name).join(", ")}
                            </strong>
                            . Disabled tags won't appear in filters and cannot
                            be saved. Please remove or replace them.
                          </Text>
                        </VStack>
                      </HStack>
                    </Box>
                  )}

                  <Box
                    p={3}
                    border="1px solid"
                    borderColor={hasInactiveTags ? "orange.300" : "gray.300"}
                    borderRadius="md"
                    bg="gray.50"
                    minH="52px"
                    position="relative"
                  >
                    <Wrap gap={2}>
                      {selectedTags.map((tag) => (
                        <WrapItem key={tag.id}>
                          <Badge
                            colorScheme={
                              tag.isActive === false ? "orange" : "purple"
                            }
                            variant={
                              tag.isActive === false ? "outline" : "subtle"
                            }
                            px={2}
                            py={1}
                            borderRadius="full"
                            display="flex"
                            alignItems="center"
                            gap={1}
                            fontSize="sm"
                            opacity={tag.isActive === false ? 0.8 : 1}
                            title={
                              tag.isActive === false
                                ? "This tag is disabled — remove it before saving"
                                : tag.name
                            }
                          >
                            {tag.isActive === false && (
                              <Box as="span" mr={1}>
                                <AlertTriangle size={11} />
                              </Box>
                            )}
                            <span
                              style={{
                                textDecoration:
                                  tag.isActive === false
                                    ? "line-through"
                                    : "none",
                              }}
                            >
                              {tag.name}
                            </span>
                            <Box
                              as="span"
                              cursor="pointer"
                              ml={1}
                              onClick={() => removeTag(tag.id)}
                              _hover={{ opacity: 0.7 }}
                            >
                              <X size={12} />
                            </Box>
                          </Badge>
                        </WrapItem>
                      ))}

                      {/* Add tag button + dropdown */}
                      <WrapItem position="relative">
                        <Button
                          size="xs"
                          variant="dashed"
                          colorScheme="purple"
                          leftIcon={<Plus size={12} />}
                          border="1px dashed"
                          borderColor="purple.300"
                          color="purple.600"
                          bg="white"
                          _hover={{ bg: "purple.50" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTagDropdown((v) => !v);
                          }}
                        >
                          Add tag
                        </Button>

                        {showTagDropdown && (
                          <Box
                            position="absolute"
                            top="110%"
                            left={0}
                            zIndex={30}
                            bg="white"
                            border="1px solid"
                            borderColor="gray.200"
                            borderRadius="lg"
                            boxShadow="lg"
                            w="220px"
                            maxH="260px"
                            overflowY="auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Box p={2} borderBottomWidth="1px">
                              <Input
                                size="sm"
                                placeholder="Search active tags..."
                                value={tagSearchQuery}
                                onChange={(e) =>
                                  setTagSearchQuery(e.target.value)
                                }
                                autoFocus
                              />
                            </Box>
                            {filteredDropdownTags.length === 0 ? (
                              <Box p={3}>
                                <Text
                                  fontSize="sm"
                                  color="gray.400"
                                  textAlign="center"
                                >
                                  {availableTags.length === 0
                                    ? "No active tags available"
                                    : "All active tags already added"}
                                </Text>
                              </Box>
                            ) : (
                              filteredDropdownTags.map((tag) => (
                                <Box
                                  key={tag.id}
                                  px={3}
                                  py={2}
                                  cursor="pointer"
                                  _hover={{ bg: "purple.50" }}
                                  onClick={() => addTag(tag)}
                                >
                                  <Text fontSize="sm" color="gray.700">
                                    {tag.name}
                                  </Text>
                                </Box>
                              ))
                            )}
                          </Box>
                        )}
                      </WrapItem>
                    </Wrap>
                  </Box>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Only active tags can be assigned. Inactive tags are shown
                    with a warning and must be removed before saving.
                  </Text>
                </Box>

                {/* Statement */}
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

            {/* Test Cases */}
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
                        <Button
                          onClick={() => removeTestCase(index)}
                          colorScheme="red"
                          variant="ghost"
                          size="sm"
                          px={2}
                        >
                          <Trash2 size={20} />
                        </Button>
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

            {/* Submit */}
            <HStack justify="flex-end" pt={6} borderTopWidth="1px">
              {hasInactiveTags && (
                <Text fontSize="sm" color="orange.500">
                  <AlertTriangle
                    size={14}
                    style={{ display: "inline", marginRight: 4 }}
                  />
                  Remove disabled tags before saving
                </Text>
              )}
              <Button
                onClick={handleSubmit}
                colorScheme="purple"
                size="lg"
                isLoading={loading}
                loadingText={id ? "Updating..." : "Creating..."}
                isDisabled={hasInactiveTags}
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
