import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Input,
  Spinner,
} from "@chakra-ui/react";
import {
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  Circle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";

/* ── Deadline helpers ──────────────────────────────────────────────────────── */

const deadlineLabel = (deadline) => {
  if (!deadline) return { text: "No deadline", color: "gray.500", bg: "gray.50" };
  const now = new Date();
  const dl = new Date(deadline);
  const diff = dl - now;
  if (diff < 0) return { text: "Past due", color: "red.600", bg: "red.50" };
  const days = Math.ceil(diff / 86400000);
  if (days <= 1) return { text: "Due today", color: "orange.600", bg: "orange.50" };
  if (days <= 3) return { text: `${days}d left`, color: "orange.500", bg: "orange.50" };
  return {
    text: dl.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    color: "green.600",
    bg: "green.50",
  };
};

/* ── Progress bar ──────────────────────────────────────────────────────────── */

const MiniProgress = ({ solved, total }) => {
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
  return (
    <HStack gap={2} minW="120px">
      <Box flex={1} h="6px" bg="gray.200" borderRadius="full" overflow="hidden">
        <Box
          h="100%"
          w={`${pct}%`}
          bg={pct === 100 ? "green.400" : "purple.400"}
          borderRadius="full"
          transition="width 0.3s"
        />
      </Box>
      <Text fontSize="xs" fontWeight="600" color="gray.600" minW="40px" textAlign="right">
        {solved}/{total}
      </Text>
    </HStack>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  LabListSection — rendered inside OrgDetailPage when LABS tab active       */
/* ═══════════════════════════════════════════════════════════════════════════ */

const LabListSection = ({ org, canManage, onNavigateToLab, onCreateLab }) => {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchLabs = useCallback(async (p = 0) => {
    try {
      setLoading(true);
      const resp = await ApiService.getOrgLabs(org.id, { page: p, size: 10 });
      if (resp.statusCode === 200) {
        const data = resp.data;
        setLabs(data.content ?? []);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [org.id]);

  useEffect(() => { fetchLabs(page); }, [page, fetchLabs]);

  return (
    <VStack align="stretch" gap={4}>
      {/* Header bar */}
      <HStack justify="space-between">
        <HStack gap={2}>
          <BookOpen size={18} color="#7c3aed" />
          <Heading size="sm" color="gray.700">Labs</Heading>
        </HStack>
        {canManage && (
          <Button
            size="sm"
            colorScheme="purple"
            gap={1}
            onClick={onCreateLab}
          >
            <Plus size={14} /> Create Lab
          </Button>
        )}
      </HStack>

      {/* Loading */}
      {loading && (
        <Box py={10} textAlign="center">
          <Spinner size="lg" color="purple.500" thickness="3px" />
        </Box>
      )}

      {/* Empty */}
      {!loading && labs.length === 0 && (
        <Box
          bg="white"
          borderRadius="xl"
          boxShadow="sm"
          py={12}
          textAlign="center"
        >
          <BookOpen size={40} color="#d1d5db" style={{ margin: "0 auto 12px" }} />
          <Text color="gray.400" fontWeight="500">No labs yet</Text>
          {canManage && (
            <Text color="gray.400" fontSize="sm" mt={1}>
              Create a lab to assign exercises to your students.
            </Text>
          )}
        </Box>
      )}

      {/* Lab cards */}
      {!loading && labs.map((lab) => {
        const dl = deadlineLabel(lab.deadline);
        return (
          <Box
            key={lab.id}
            bg="white"
            borderRadius="xl"
            boxShadow="sm"
            border="1px solid"
            borderColor="gray.200"
            p={5}
            cursor="pointer"
            transition="all 0.15s"
            _hover={{ boxShadow: "md", borderColor: "purple.200" }}
            onClick={() => onNavigateToLab(lab.slug)}
          >
            <HStack justify="space-between" align="start">
              <VStack align="start" gap={1} flex={1}>
                <Heading size="sm" color="gray.800">{lab.title}</Heading>
                {lab.description && (
                  <Text fontSize="sm" color="gray.500" noOfLines={2}>
                    {lab.description}
                  </Text>
                )}
                <HStack gap={3} mt={1}>
                  <HStack gap={1}>
                    <BookOpen size={13} color="#9ca3af" />
                    <Text fontSize="xs" color="gray.500">
                      {lab.exerciseCount} exercise{lab.exerciseCount !== 1 ? "s" : ""}
                    </Text>
                  </HStack>
                  <Box
                    px={2}
                    py={0.5}
                    borderRadius="md"
                    fontSize="xs"
                    fontWeight="600"
                    bg={dl.bg}
                    color={dl.color}
                  >
                    <HStack gap={1}>
                      <Clock size={11} />
                      <Text>{dl.text}</Text>
                    </HStack>
                  </Box>
                  {lab.solutionsPublished && (
                    <Box
                      px={2} py={0.5} borderRadius="md" fontSize="xs"
                      fontWeight="600" bg="blue.50" color="blue.600"
                    >
                      Solutions published
                    </Box>
                  )}
                </HStack>
              </VStack>

              {/* Student progress */}
              {lab.solvedCount != null && (
                <MiniProgress solved={lab.solvedCount} total={lab.exerciseCount} />
              )}
            </HStack>
          </Box>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <HStack justify="center" gap={3} pt={2}>
          <Box
            as="button"
            p={2}
            borderRadius="md"
            bg={page > 0 ? "white" : "gray.100"}
            boxShadow="sm"
            onClick={() => page > 0 && setPage((p) => p - 1)}
            disabled={page <= 0}
          >
            <ChevronLeft size={16} />
          </Box>
          <Text fontSize="sm" color="gray.600">
            {page + 1} / {totalPages}
          </Text>
          <Box
            as="button"
            p={2}
            borderRadius="md"
            bg={page < totalPages - 1 ? "white" : "gray.100"}
            boxShadow="sm"
            onClick={() => page < totalPages - 1 && setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight size={16} />
          </Box>
        </HStack>
      )}
    </VStack>
  );
};

export default LabListSection;
