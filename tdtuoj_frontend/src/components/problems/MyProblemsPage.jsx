import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Input, Text, Heading, HStack, VStack, Badge, Card, Spinner,
} from "@chakra-ui/react";
import { Plus, Search, Trash2, Edit2, Eye, EyeOff, Globe, Lock } from "lucide-react";
import { useToast } from "../common/ToastMessage";
import ApiService from "../../services/ApiService";

const DIFF_COLORS = {
  EASY: { color: "#38a169", bg: "#f0fff4" },
  MEDIUM: { color: "#d69e2e", bg: "#fefcbf" },
  HARD: { color: "#e53e3e", bg: "#fff5f5" },
};

const MyProblemsPage = () => {
  const navigate = useNavigate();
  const { showMessage } = useToast();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const resp = await ApiService.getMyProblems({ page, size: 12, search });
      if (resp.statusCode === 200) {
        setProblems(resp.data.content || []);
        setTotalPages(resp.data.totalPages || 0);
      }
    } catch (e) {
      showMessage(e.response?.data?.message || e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProblems(); }, [page, search]);

  const handleTogglePublic = async (problem) => {
    try {
      const formData = new FormData();
      formData.append("id", problem.id);
      formData.append("isPublic", !problem.isPublic);
      await ApiService.updateProblem(formData);
      showMessage(
        problem.isPublic ? "Problem is now private" : "Problem is now public",
        "success"
      );
      fetchProblems();
    } catch (e) {
      showMessage(e.response?.data?.message || e.message, "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this problem permanently?")) return;
    try {
      await ApiService.deleteProblem(id);
      showMessage("Problem deleted", "success");
      fetchProblems();
    } catch (e) {
      showMessage(e.response?.data?.message || e.message, "error");
    }
  };

  return (
    <Box minH="100vh" bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" py={8} px={4}>
      <Box maxW="1100px" mx="auto">
        <Card.Root bg="white" borderRadius="xl" p={8} boxShadow="2xl">
          {/* Header */}
          <HStack justify="space-between" mb={6}>
            <VStack align="start" gap={1}>
              <Heading size="2xl" color="gray.800">My Problem Repository</Heading>
              <Text color="gray.500" fontSize="sm">
                Create and manage your private problems. Assign them to labs.
              </Text>
            </VStack>
            <Button
              bg="#667eea" color="white" _hover={{ bg: "#5a6fd6" }}
              onClick={() => navigate("/admin/my-problems/new")}
              gap={2}
            >
              <Plus size={18} /> New Problem
            </Button>
          </HStack>

          {/* Search */}
          <HStack mb={6} gap={3}>
            <Box position="relative" flex={1}>
              <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="gray.400">
                <Search size={16} />
              </Box>
              <Input
                pl={10}
                placeholder="Search your problems..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              />
            </Box>
          </HStack>

          {/* List */}
          {loading ? (
            <Box textAlign="center" py={10}>
              <Spinner size="xl" color="purple.500" />
            </Box>
          ) : problems.length === 0 ? (
            <Box textAlign="center" py={10}>
              <Text color="gray.500">No problems yet. Create your first one!</Text>
            </Box>
          ) : (
            <VStack gap={3} align="stretch">
              {problems.map((p) => {
                const dc = DIFF_COLORS[p.problemDifficulty] || { color: "gray", bg: "#f7f7f7" };
                return (
                  <Box
                    key={p.id}
                    p={4}
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="lg"
                    _hover={{ borderColor: "purple.300", bg: "purple.50" }}
                    transition="all 0.15s"
                  >
                    <HStack justify="space-between">
                      <VStack align="start" gap={1} flex={1}>
                        <HStack gap={2}>
                          <Text fontWeight="700" fontSize="md" color="gray.800">
                            {p.title}
                          </Text>
                          <Badge
                            bg={dc.bg}
                            color={dc.color}
                            fontSize="xs"
                            fontWeight="700"
                            px={2}
                            borderRadius="md"
                          >
                            {p.problemDifficulty || "—"}
                          </Badge>
                          <Badge
                            bg={p.isPublic ? "green.50" : "orange.50"}
                            color={p.isPublic ? "green.600" : "orange.600"}
                            fontSize="xs"
                            px={2}
                            borderRadius="md"
                          >
                            {p.isPublic ? "Public" : "Private"}
                          </Badge>
                          {p.solutionCode && (
                            <Badge bg="blue.50" color="blue.600" fontSize="xs" px={2} borderRadius="md">
                              Has Solution
                            </Badge>
                          )}
                        </HStack>
                        <Text fontSize="xs" color="gray.400">
                          {p.point} pts · {p.timeLimit}s · {p.memoryLimit}MB
                        </Text>
                      </VStack>

                      <HStack gap={2}>
                        <Button
                          size="sm" variant="outline"
                          onClick={() => handleTogglePublic(p)}
                          gap={1}
                          title={p.isPublic ? "Make Private" : "Make Public"}
                        >
                          {p.isPublic ? <EyeOff size={14} /> : <Globe size={14} />}
                          {p.isPublic ? "Hide" : "Publish"}
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          onClick={() => navigate(`/admin/my-problems/${p.id}/edit`)}
                          gap={1}
                        >
                          <Edit2 size={14} /> Edit
                        </Button>
                        <Button
                          size="sm" variant="outline" colorScheme="red"
                          onClick={() => handleDelete(p.id)}
                          gap={1}
                        >
                          <Trash2 size={14} /> Delete
                        </Button>
                      </HStack>
                    </HStack>
                  </Box>
                );
              })}
            </VStack>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <HStack justify="center" mt={6} gap={2}>
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
                ← Prev
              </Button>
              <Text fontSize="sm" color="gray.500">
                Page {page + 1} of {totalPages}
              </Text>
              <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                Next →
              </Button>
            </HStack>
          )}
        </Card.Root>
      </Box>
    </Box>
  );
};

export default MyProblemsPage;
