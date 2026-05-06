import React, { useState, useEffect, useRef } from "react";
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
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useToast } from "../common/ToastMessage";
import ApiService from "../../services/ApiService";
import Editor from "@monaco-editor/react";

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

const POINT_RANGES = {
  EASY: { min: 1, max: 10 },
  MEDIUM: { min: 11, max: 20 },
  HARD: { min: 21, max: 30 },
};

const getPointRange = (difficulty) => {
  return POINT_RANGES[difficulty] || { min: 1, max: 300 };
};

// ─── AI Loading Messages ─────────────────────────────────────────────────────

const PDF_MESSAGES = [
  { emoji: "📄", text: "Reading your PDF..." },
  { emoji: "🔍", text: "Scanning problem statement..." },
  { emoji: "🧠", text: "Analyzing constraints..." },
  { emoji: "⚙️", text: "Extracting test cases..." },
  { emoji: "🏷️", text: "Suggesting relevant tags..." },
  { emoji: "📊", text: "Assessing difficulty level..." },
  { emoji: "✨", text: "Polishing results..." },
  { emoji: "🚀", text: "Almost there..." },
];

const GEN_MESSAGES = [
  { emoji: "🤔", text: "Thinking about the problem..." },
  { emoji: "📐", text: "Designing edge cases..." },
  { emoji: "🔢", text: "Computing expected outputs..." },
  { emoji: "🧪", text: "Creating test scenarios..." },
  { emoji: "🎯", text: "Checking boundary conditions..." },
  { emoji: "📊", text: "Validating inputs..." },
  { emoji: "✅", text: "Verifying correctness..." },
  { emoji: "✨", text: "Finalizing test cases..." },
];

// Inject keyframe CSS once
if (typeof document !== "undefined" && !document.getElementById("ai-loading-styles")) {
  const style = document.createElement("style");
  style.id = "ai-loading-styles";
  style.textContent = `
    @keyframes ai-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes ai-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.95); }
    }
    @keyframes ai-fade-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes ai-dot {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }
    @keyframes ai-shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
  `;
  document.head.appendChild(style);
}

const AILoadingOverlay = ({ mode }) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const messages = mode === "pdf" ? PDF_MESSAGES : GEN_MESSAGES;

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % messages.length);
        setVisible(true);
      }, 300);
    }, 2200);
    return () => clearInterval(interval);
  }, [messages.length]);

  const msg = messages[msgIndex];
  const title = mode === "pdf" ? "AI Reading PDF" : "AI Generating Test Cases";

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={9999}
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="rgba(0,0,0,0.55)"
      style={{ backdropFilter: "blur(6px)" }}
    >
      <Box
        bg="white"
        borderRadius="2xl"
        p={10}
        maxW="420px"
        w="90%"
        boxShadow="0 25px 60px rgba(0,0,0,0.3)"
        textAlign="center"
        position="relative"
        overflow="hidden"
      >
        {/* Gradient shimmer top bar */}
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          h="4px"
          style={{
            background: "linear-gradient(90deg, #667eea, #a855f7, #ec4899, #667eea)",
            backgroundSize: "200% auto",
            animation: "ai-shimmer 2s linear infinite",
          }}
        />

        {/* Spinner ring */}
        <Box display="flex" justifyContent="center" mb={6}>
          <Box
            position="relative"
            w="72px"
            h="72px"
          >
            {/* Outer ring */}
            <Box
              position="absolute"
              inset={0}
              borderRadius="full"
              border="3px solid"
              borderColor="purple.100"
            />
            {/* Spinning arc */}
            <Box
              position="absolute"
              inset={0}
              borderRadius="full"
              border="3px solid transparent"
              style={{
                borderTopColor: "#667eea",
                borderRightColor: "#a855f7",
                animation: "ai-spin 1s linear infinite",
              }}
            />
            {/* Center emoji */}
            <Box
              position="absolute"
              inset={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="26px"
              style={{ animation: "ai-pulse 2s ease-in-out infinite" }}
            >
              ✨
            </Box>
          </Box>
        </Box>

        {/* Title */}
        <Text
          fontSize="lg"
          fontWeight="700"
          color="gray.800"
          mb={2}
          style={{
            background: "linear-gradient(90deg, #667eea, #a855f7)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {title}
        </Text>

        {/* Rotating message */}
        <Box minH="52px" display="flex" alignItems="center" justifyContent="center">
          <Text
            fontSize="md"
            color="gray.600"
            style={{
              animation: visible ? "ai-fade-in 0.3s ease-out" : "none",
              opacity: visible ? 1 : 0,
              transition: "opacity 0.3s",
            }}
          >
            {msg.emoji} {msg.text}
          </Text>
        </Box>

        {/* Bouncing dots */}
        <Box display="flex" justifyContent="center" gap={2} mt={4}>
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              w="8px"
              h="8px"
              borderRadius="full"
              bg="purple.400"
              style={{
                animation: `ai-dot 1.4s ease-in-out ${i * 0.16}s infinite`,
              }}
            />
          ))}
        </Box>

        <Text fontSize="xs" color="gray.400" mt={5}>
          This may take up to 30 seconds — Gemini is working hard!
        </Text>
      </Box>
    </Box>
  );
};

const AdminProblemFormPage = ({ mode = "admin", backPath }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showMessage } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [authorInfo, setAuthorInfo] = useState({ id: null, username: null });
  const [aiExtracting, setAiExtracting] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState(5);
  const pdfInputRef = useRef(null);

  const [problemData, setProblemData] = useState({
    title: "",
    point: "",
    timeLimit: "",
    memoryLimit: "",
    statement: "",
    problemDifficulty: "",
    solutionCode: "",
  });

  const [testCases, setTestCases] = useState([
    { input: "", expectedOutput: "", isSample: false },
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

      // Reset all state before loading new problem
      setProblemData({
        title: "",
        point: "",
        timeLimit: "",
        memoryLimit: "",
        statement: "",
        problemDifficulty: "",
        solutionCode: "",
      });
      setTestCases([{ input: "", expectedOutput: "" }]);
      setSelectedTags([]);
      setAuthorInfo({ id: null, username: null });
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
            solutionCode: problem.solutionCode || "",
          });

          if (problem.testCases && problem.testCases.length > 0) {
            const loaded = await Promise.all(
              problem.testCases.map(async (tc, index) => {
                let input = "";
                let expectedOutput = "";
                try {
                  if (tc.inputFileUrl) {
                    const resp = await fetch(
                      `${tc.inputFileUrl}?t=${Date.now()}`,
                    );
                    const text = await resp.text();
                    input =
                      text.startsWith("<?xml") || text.startsWith("<Error")
                        ? ""
                        : text;
                  }
                  if (tc.expectedOutputFileUrl) {
                    const resp = await fetch(
                      `${tc.expectedOutputFileUrl}?t=${Date.now()}`,
                    );
                    const text = await resp.text();
                    expectedOutput =
                      text.startsWith("<?xml") || text.startsWith("<Error")
                        ? ""
                        : text;
                  }
                } catch (err) {
                  console.error(
                    `Error fetching test case ${index} files:`,
                    err,
                  );
                }
                return {
                  id: tc.id,
                  input,
                  expectedOutput,
                  isSample: tc.isSample ?? false,
                  dirty: false,
                };
              }),
            );
            setTestCases(loaded);
          } else {
            setTestCases([{ input: "", expectedOutput: "" }]);
          }
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
    setProblemData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "problemDifficulty" ? { point: "" } : {}),
    }));

  const addTestCase = () =>
    setTestCases((prev) => [
      ...prev,
      { input: "", expectedOutput: "", isSample: false, dirty: true },
    ]);

  const removeTestCase = (index) => {
    if (testCases.length > 1)
      setTestCases((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTestCaseChange = (index, field, value) =>
    setTestCases((prev) =>
      prev.map((tc, i) =>
        i === index ? { ...tc, [field]: value, dirty: true } : tc,
      ),
    );

  const stringToFile = (content, filename, mimeType) =>
    new File([new Blob([content], { type: mimeType })], filename, {
      type: mimeType,
    });

  // ─── AI PDF Import ────────────────────────────────────────────────────────

  const handlePdfImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      showMessage("PDF must be under 4MB", "error");
      e.target.value = "";
      return;
    }
    setAiExtracting(true);
    try {
      const response = await ApiService.extractProblemFromPdf(file);
      if (response.statusCode === 200 && response.data) {
        const d = response.data;
        setProblemData((prev) => ({
          title: d.title || "",
          point: d.point || "",
          timeLimit: d.timeLimit || "",
          memoryLimit: d.memoryLimit || "",
          statement: d.statement || "",
          problemDifficulty: d.difficulty || "",
          solutionCode: prev.solutionCode, // keep existing solution
        }));
        if (d.testCases && d.testCases.length > 0) {
          setTestCases(
            d.testCases.map((tc) => ({
              input: tc.input || "",
              expectedOutput: tc.expectedOutput || "",
              isSample: tc.isSample ?? false,
              dirty: true,
            }))
          );
        }
        // Auto-add AI-suggested tags that exist in available tags
        if (d.suggestedTags && d.suggestedTags.length > 0) {
          const matched = availableTags.filter((t) =>
            d.suggestedTags.includes(t.name)
          );
          if (matched.length > 0) {
            setSelectedTags((prev) => {
              const existingIds = new Set(prev.map((t) => t.id));
              const newTags = matched.filter((t) => !existingIds.has(t.id));
              return [...prev, ...newTags];
            });
          }
        }
        const msg = d.testCasesGenerated
          ? `Extracted! ${d.testCases?.length || 0} test cases generated by AI — please review before saving.`
          : `Problem extracted from PDF — please review all fields before saving.`;
        showMessage(msg, "success");
      } else {
        showMessage(response.message || "Failed to extract from PDF", "error");
      }
    } catch (err) {
      showMessage(
        err.response?.data?.message || err.message || "Failed to extract from PDF",
        "error"
      );
    } finally {
      setAiExtracting(false);
      e.target.value = ""; // reset so same file can be re-selected
    }
  };

  // ─── AI Test Case Generation ──────────────────────────────────────────────

  const handleGenerateTestCases = async () => {
    if (!problemData.statement.trim()) {
      showMessage("Write problem statement first", "error");
      return;
    }
    setAiGenerating(true);
    try {
      const response = await ApiService.generateTestCases(
        problemData.statement,
        generateCount
      );
      if (response.statusCode === 200 && response.data?.testCases) {
        const generated = response.data.testCases.map((tc) => ({
          input: tc.input || "",
          expectedOutput: tc.expectedOutput || "",
          isSample: tc.isSample ?? false,
          dirty: true,
        }));
        setTestCases((prev) => {
          // Replace if only one empty placeholder exists
          const hasOnlyEmpty =
            prev.length === 1 &&
            !prev[0].input.trim() &&
            !prev[0].expectedOutput.trim();
          return hasOnlyEmpty ? generated : [...prev, ...generated];
        });
        showMessage(
          `${generated.length} test cases generated by AI — please review!`,
          "success"
        );
      } else {
        showMessage(response.message || "Failed to generate test cases", "error");
      }
    } catch (err) {
      showMessage(
        err.response?.data?.message || err.message || "Failed to generate test cases",
        "error"
      );
    } finally {
      setAiGenerating(false);
    }
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
    if (problemData.problemDifficulty) {
      const range = getPointRange(problemData.problemDifficulty);
      if (problemData.point < range.min || problemData.point > range.max) {
        showMessage(
          `Points for ${problemData.problemDifficulty.toLowerCase()} problems must be between ${range.min} and ${range.max}`,
          "error",
        );
        return false;
      }
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

      // Solution code (for My Problems flow)
      if (problemData.solutionCode) {
        formData.append("solutionCode", problemData.solutionCode);
        formData.append("solutionLanguage", "CPP");
      }

      // Private by default for "my" mode, public for admin
      if (mode === "my" && !id) {
        formData.append("isPublic", false);
      }

      // Pass active tag IDs via tagNames field (names used server-side for lookup)
      const activeSelectedTags = selectedTags.filter(
        (t) => t.isActive !== false,
      );
      activeSelectedTags.forEach((tag) => {
        formData.append("tagNames", tag.name);
      });

      testCases.forEach((tc, index) => {
        if (tc.id) formData.append(`testCases[${index}].id`, tc.id);
        formData.append(`testCases[${index}].isSample`, tc.isSample ?? false);
        // Only send files for new test cases (no id) or dirty (edited) ones
        if (!tc.id || tc.dirty) {
          formData.append(
            `testCases[${index}].inputFile`,
            stringToFile(tc.input, `input_${index}.txt`, "text/plain"),
          );
          formData.append(
            `testCases[${index}].expectedOutputFile`,
            stringToFile(tc.expectedOutput, `output_${index}.txt`, "text/plain"),
          );
        }
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
          const dest = backPath || (mode === "my" ? "/admin/my-problems" : "/admin/problems");
          setTimeout(() => navigate(dest), 1500);
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
      {/* AI Loading Overlay */}
      {(aiExtracting || aiGenerating) && (
        <AILoadingOverlay mode={aiExtracting ? "pdf" : "gen"} />
      )}
      <Box maxW="1200px" mx="auto">
        <Card.Root bg="white" borderRadius="xl" p={8} boxShadow="2xl">
          <HStack mb={6} gap={3} justify="space-between">
            <HStack gap={3}>
              <FileText size={32} color="#667eea" />
              <Heading size="2xl" color="gray.800">
                {id ? "Edit Problem" : "Create New Problem"}
              </Heading>
            </HStack>
            <HStack gap={2}>
              {/* Hidden file input for PDF */}
              <input
                type="file"
                accept=".pdf"
                ref={pdfInputRef}
                style={{ display: "none" }}
                onChange={handlePdfImport}
              />
              <Button
                size="sm"
                colorScheme="purple"
                variant="outline"
                leftIcon={<Sparkles size={16} />}
                onClick={() => pdfInputRef.current?.click()}
                isLoading={aiExtracting}
                loadingText="AI Reading PDF..."
                title="Import problem data from a PDF file"
              >
                Import from PDF
              </Button>
              <Button
                leftIcon={<ArrowLeft size={20} />}
                variant="ghost"
                onClick={() => navigate(backPath || (mode === "my" ? "/admin/my-problems" : "/admin/problems"))}
              >
                Back to Problems
              </Button>
            </HStack>
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
                      Points *{" "}
                      {problemData.problemDifficulty && (
                        <Box as="span" fontSize="xs" color="gray.400">
                          ({getPointRange(problemData.problemDifficulty).min}–
                          {getPointRange(problemData.problemDifficulty).max} for{" "}
                          {problemData.problemDifficulty.toLowerCase()})
                        </Box>
                      )}
                    </Text>
                    <Input
                      type="number"
                      value={problemData.point}
                      onChange={(e) =>
                        handleProblemChange("point", e.target.value)
                      }
                      onBlur={() => {
                        if (
                          problemData.point &&
                          problemData.problemDifficulty
                        ) {
                          const range = getPointRange(
                            problemData.problemDifficulty,
                          );
                          if (
                            problemData.point < range.min ||
                            problemData.point > range.max
                          ) {
                            showMessage(
                              `Points for ${problemData.problemDifficulty.toLowerCase()} problems must be between ${range.min} and ${range.max}`,
                              "error",
                            );
                          }
                        }
                      }}
                      placeholder={
                        problemData.problemDifficulty
                          ? `${getPointRange(problemData.problemDifficulty).min}–${getPointRange(problemData.problemDifficulty).max}`
                          : "Select difficulty first"
                      }
                      min={getPointRange(problemData.problemDifficulty).min}
                      max={getPointRange(problemData.problemDifficulty).max}
                      isDisabled={!problemData.problemDifficulty}
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
                      <Box
                        border="1px solid"
                        borderColor="gray.300"
                        borderRadius="md"
                        overflow="hidden"
                        h="350px"
                      >
                        <Editor
                          height="100%"
                          theme="vs-dark"
                          language="markdown"
                          value={problemData.statement}
                          onChange={(val) => handleProblemChange("statement", val || "")}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            lineNumbers: "on",
                            wordWrap: "on",
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                          }}
                        />
                      </Box>
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

            {/* Solution Code (My Problems mode only) */}
            {mode === "my" && (
              <Box borderBottomWidth="1px" pb={6}>
                <Heading size="xl" color="gray.700" mb={4}>
                  Solution Code (C++)
                </Heading>
                <Text fontSize="sm" color="gray.500" mb={3}>
                  Optional. This code will be shown to students when you publish solutions in a lab.
                </Text>
                <Box
                  border="1px solid"
                  borderColor="gray.300"
                  borderRadius="md"
                  overflow="hidden"
                  h="350px"
                >
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    language="cpp"
                    value={problemData.solutionCode}
                    onChange={(val) => handleProblemChange("solutionCode", val || "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </Box>
              </Box>
            )}

            {/* Test Cases */}
            <Box>
              <HStack justify="space-between" align="center" mb={4}>
                <Heading size="xl" color="gray.700">
                  Test Cases
                </Heading>
                <HStack gap={2}>
                  <Input
                    type="number"
                    size="sm"
                    w="70px"
                    min={1}
                    max={50}
                    value={generateCount}
                    onChange={(e) =>
                      setGenerateCount(
                        Math.min(50, Math.max(1, parseInt(e.target.value) || 1))
                      )
                    }
                    title="Number of test cases to generate (max 50)"
                  />
                  <Button
                    size="sm"
                    colorScheme="purple"
                    variant="outline"
                    leftIcon={<Sparkles size={14} />}
                    onClick={handleGenerateTestCases}
                    isLoading={aiGenerating}
                    loadingText="Generating..."
                    isDisabled={!problemData.statement.trim()}
                    title={
                      !problemData.statement.trim()
                        ? "Write problem statement first"
                        : `Generate ${generateCount} test case(s) using AI`
                    }
                  >
                    AI Generate
                  </Button>
                </HStack>
              </HStack>
              <VStack gap={4} align="stretch">
                {testCases.map((testCase, index) => (
                  <Card.Root key={index} bg="gray.50" p={4} borderRadius="lg">
                    <HStack justify="space-between" mb={3}>
                      <HStack gap={3}>
                        <Heading size="md" color="gray.700">
                          Test Case {index + 1}
                        </Heading>
                        {/* Sample toggle */}
                        <HStack
                          gap={2}
                          px={3}
                          py={1}
                          borderRadius="full"
                          bg={testCase.isSample ? "green.50" : "gray.100"}
                          border="1px solid"
                          borderColor={
                            testCase.isSample ? "green.300" : "gray.300"
                          }
                          cursor="pointer"
                          onClick={() =>
                            handleTestCaseChange(
                              index,
                              "isSample",
                              !testCase.isSample,
                            )
                          }
                          userSelect="none"
                          title="Sample test cases are visible to users solving the problem"
                        >
                          <Box
                            w="10px"
                            h="10px"
                            borderRadius="full"
                            bg={testCase.isSample ? "green.400" : "gray.400"}
                            flexShrink={0}
                          />
                          <Text
                            fontSize="xs"
                            fontWeight="medium"
                            color={testCase.isSample ? "green.700" : "gray.500"}
                          >
                            {testCase.isSample ? "Sample (visible)" : "Hidden"}
                          </Text>
                        </HStack>
                      </HStack>
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
