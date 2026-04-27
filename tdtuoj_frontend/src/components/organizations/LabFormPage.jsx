import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Input,
  Spinner,
} from "@chakra-ui/react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Search,
  BookOpen,
  Save,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import DateTimePicker from "../common/DateTimePicker";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  LabFormPage — Create / Edit a lab                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

const LabFormPage = () => {
  const { orgSlug, labSlug } = useParams();
  const isEdit = !!labSlug;
  const navigate = useNavigate();
  const { showMessage } = useToast();

  const [org, setOrg] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [exercises, setExercises] = useState([]); // [{problemId, problemTitle, points}]
  const [labId, setLabId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Problem search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const resp = await ApiService.getOrganizationBySlug(orgSlug);
        if (resp.statusCode === 200) {
          setOrg(resp.data);

          // If editing, load existing lab
          if (isEdit) {
            const labResp = await ApiService.getOrgLab(resp.data.id, labSlug);
            if (labResp.statusCode === 200) {
              const lab = labResp.data;
              setLabId(lab.id);
              setTitle(lab.title);
              setDescription(lab.description || "");
              setDeadline(lab.deadline || "");
              setExercises(
                (lab.exercises || []).map((ex) => ({
                  problemId: ex.problemId,
                  problemTitle: ex.problemTitle,
                  problemSlug: ex.problemSlug,
                  problemDifficulty: ex.problemDifficulty,
                  points: ex.points,
                }))
              );
            }
          }
        }
      } catch (e) {
        showMessage("Failed to load", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [orgSlug, labSlug]);

  /* ── Problem search ─────────────────────────────────────────────────────── */

  const searchProblems = useCallback(async () => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const resp = await ApiService.getMyProblems({ page: 0, size: 20, search: searchQuery.trim() });
      if (resp.statusCode === 200) {
        const existing = new Set(exercises.map((e) => e.problemId));
        setSearchResults(
          (resp.data.content ?? []).filter((p) => !existing.has(p.id))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, exercises]);

  useEffect(() => {
    const t = setTimeout(searchProblems, 300);
    return () => clearTimeout(t);
  }, [searchProblems]);

  /* ── Exercise management ────────────────────────────────────────────────── */

  const addExercise = (problem) => {
    setExercises((prev) => [
      ...prev,
      {
        problemId: problem.id,
        problemTitle: problem.title,
        problemSlug: problem.slug,
        problemDifficulty: problem.problemDifficulty,
        points: problem.point || 100,
      },
    ]);
    setSearchResults((prev) => prev.filter((p) => p.id !== problem.id));
  };

  const removeExercise = (idx) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePoints = (idx, pts) => {
    setExercises((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, points: parseInt(pts) || 0 } : e))
    );
  };

  /* ── Save ────────────────────────────────────────────────────────────────── */

  const handleSave = async () => {
    if (!title.trim()) { showMessage("Title is required", "error"); return; }
    if (exercises.length === 0) { showMessage("Add at least one exercise", "error"); return; }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        deadline: deadline || null,
        exercises: exercises.map((e) => ({
          problemId: e.problemId,
          points: e.points,
        })),
      };

      let resp;
      if (isEdit) {
        resp = await ApiService.updateLab(org.id, labId, payload);
      } else {
        resp = await ApiService.createLab(org.id, payload);
      }

      if (resp.statusCode === 201 || resp.statusCode === 200) {
        showMessage(isEdit ? "Lab updated!" : "Lab created!", "success");
        if (isEdit) {
          navigate(`/organizations/${orgSlug}/labs/${resp.data.slug || labSlug}`);
        } else {
          navigate(`/organizations/${orgSlug}`);
        }
      }
    } catch (e) {
      showMessage(e.response?.data?.message || e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ──────────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" color="purple.500" thickness="3px" />
      </Box>
    );
  }

  const DIFF_COLORS = {
    EASY: { color: "green.600", bg: "green.50" },
    MEDIUM: { color: "orange.500", bg: "orange.50" },
    HARD: { color: "red.600", bg: "red.50" },
  };

  return (
    <Box minH="100vh" bg="gray.50" py={8}>
      <Container maxW="container.lg">
        <VStack align="stretch" gap={6}>
          {/* Back */}
          <HStack
            gap={2}
            cursor="pointer"
            onClick={() => navigate(`/organizations/${orgSlug}`)}
            _hover={{ color: "purple.600" }}
            color="gray.500"
            transition="color 0.15s"
          >
            <ArrowLeft size={18} />
            <Text fontSize="sm" fontWeight="500">Back to {org?.name}</Text>
          </HStack>

          {/* Title */}
          <Box bg="white" borderRadius="xl" boxShadow="md" p={6}>
            <VStack align="stretch" gap={4}>
              <HStack gap={2}>
                <BookOpen size={22} color="#7c3aed" />
                <Heading size="lg" color="gray.800">{isEdit ? "Edit Lab" : "Create Lab"}</Heading>
              </HStack>

              <VStack align="stretch" gap={3}>
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="gray.600" mb={1}>Title *</Text>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Lab 1 — Arrays & Strings"
                    size="md"
                  />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="gray.600" mb={1}>Description</Text>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description..."
                    size="md"
                  />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="gray.600" mb={1}>Deadline</Text>
                  <DateTimePicker
                    value={deadline}
                    onChange={setDeadline}
                    placeholder="Pick deadline date & time"
                  />
                </Box>
              </VStack>
            </VStack>
          </Box>

          {/* Exercises */}
          <Box bg="white" borderRadius="xl" boxShadow="md" p={6}>
            <VStack align="stretch" gap={4}>
              <Heading size="md" color="gray.800">
                Exercises ({exercises.length})
              </Heading>

              {/* Exercise list */}
              {exercises.map((ex, idx) => {
                const dc = DIFF_COLORS[ex.problemDifficulty] || { color: "gray.600", bg: "gray.50" };
                return (
                  <HStack
                    key={ex.problemId}
                    bg="gray.50"
                    borderRadius="lg"
                    p={3}
                    gap={3}
                    border="1px solid"
                    borderColor="gray.200"
                  >
                    <Box
                      w="28px" h="28px" borderRadius="md" bg="purple.100"
                      display="flex" alignItems="center" justifyContent="center"
                    >
                      <Text fontSize="sm" fontWeight="700" color="purple.700">
                        {String.fromCharCode(65 + idx)}
                      </Text>
                    </Box>
                    <VStack align="start" gap={0} flex={1}>
                      <Text fontSize="sm" fontWeight="600" color="gray.800">
                        {ex.problemTitle}
                      </Text>
                      <Box
                        px={1.5} py={0.5} borderRadius="sm" fontSize="10px"
                        fontWeight="700" bg={dc.bg} color={dc.color}
                      >
                        {ex.problemDifficulty || "—"}
                      </Box>
                    </VStack>
                    <HStack gap={1}>
                      <Text fontSize="xs" color="gray.500">pts:</Text>
                      <Input
                        value={ex.points}
                        onChange={(e) => updatePoints(idx, e.target.value)}
                        size="sm"
                        w="60px"
                        textAlign="center"
                        type="number"
                      />
                    </HStack>
                    <Box
                      as="button"
                      p={1.5}
                      borderRadius="md"
                      _hover={{ bg: "red.50" }}
                      onClick={() => removeExercise(idx)}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </Box>
                  </HStack>
                );
              })}

              {/* Search problems */}
              <Box>
                <Text fontSize="sm" fontWeight="600" color="gray.600" mb={2}>
                  Search your problems to add
                </Text>
                <Box position="relative">
                  <Box position="absolute" left={3} top="50%" transform="translateY(-50%)">
                    <Search size={14} color="#9ca3af" />
                  </Box>
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title..."
                    pl={9}
                    size="sm"
                  />
                </Box>

                {searching && (
                  <Box py={3} textAlign="center">
                    <Spinner size="sm" color="purple.400" />
                  </Box>
                )}

                {!searching && searchResults.length > 0 && (
                  <VStack align="stretch" gap={1} mt={2} maxH="250px" overflowY="auto">
                    {searchResults.map((p) => {
                      const dc = DIFF_COLORS[p.problemDifficulty] || { color: "gray.600", bg: "gray.50" };
                      return (
                        <HStack
                          key={p.id}
                          bg="white"
                          border="1px solid"
                          borderColor="gray.200"
                          borderRadius="md"
                          p={2}
                          cursor="pointer"
                          _hover={{ bg: "purple.50", borderColor: "purple.300" }}
                          transition="all 0.1s"
                          onClick={() => addExercise(p)}
                        >
                          <Plus size={14} color="#7c3aed" />
                          <Text fontSize="sm" fontWeight="500" flex={1}>{p.title}</Text>
                          <Box
                            px={1.5} py={0.5} borderRadius="sm" fontSize="10px"
                            fontWeight="700" bg={dc.bg} color={dc.color}
                          >
                            {p.problemDifficulty || "—"}
                          </Box>
                          <Text fontSize="xs" color="gray.400">{p.point}pts</Text>
                        </HStack>
                      );
                    })}
                  </VStack>
                )}
              </Box>
            </VStack>
          </Box>

          {/* Save */}
          <HStack justify="flex-end" gap={3}>
            <Button
              variant="outline"
              onClick={() => navigate(`/organizations/${orgSlug}`)}
            >
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              gap={1}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Spinner size="sm" /> : <Save size={16} />}
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Lab"}
            </Button>
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
};

export default LabFormPage;
