import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Heading,
  Text,
  Badge,
  HStack,
  VStack,
  Spinner,
  Input,
  Button,
} from "@chakra-ui/react";
import { Table } from "@chakra-ui/react";
import {
  Trophy,
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Lock,
  Globe,
  Calendar,
  Users,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useConfirmDialog } from "../common/ConfirmDialog";
import { useToast } from "../common/ToastMessage";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (dt) => {
  if (!dt) return "—";
  const d = new Date(dt);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusOf = (contest) => {
  const now = Date.now();
  const start = new Date(contest.startTime).getTime();
  const end = new Date(contest.endTime).getTime();
  if (now < start) return "UPCOMING";
  if (now > end)   return "ENDED";
  return "RUNNING";
};

const STATUS_STYLE = {
  UPCOMING: { label: "Upcoming", color: "#3b82f6", bg: "#eff6ff" },
  RUNNING:  { label: "Running",  color: "#22c55e", bg: "#f0fdf4" },
  ENDED:    { label: "Ended",    color: "#9ca3af", bg: "#f9fafb" },
};

const StatusBadge = ({ contest }) => {
  const s = STATUS_STYLE[statusOf(contest)];
  return (
    <Box
      display="inline-flex"
      alignItems="center"
      px={2}
      py="2px"
      borderRadius="full"
      fontSize="xs"
      fontWeight="600"
      bg={s.bg}
      color={s.color}
      border="1px solid"
      borderColor={s.color + "33"}
    >
      {s.label}
    </Box>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const AdminContestPage = () => {
  const { ConfirmDialog, showConfirm } = useConfirmDialog();
  const { showMessage } = useToast();
  const navigate = useNavigate();

  const [contests, setContests] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const SIZE = 10;

  const isAdmin = ApiService.isAdmin();

  const fetchContests = async (p = page) => {
    try {
      setLoading(true);
      const resp = await ApiService.getPublicContests({ page: p, size: SIZE });
      if (resp.statusCode === 200) {
        const data = resp.data;
        // Spring Page response: content, page.totalPages, page.totalElements
        const content = data.content ?? data;
        const pageInfo = data.page ?? {};
        setContests(content);
        setTotalPages(pageInfo.totalPages ?? 1);
        setTotalElements(pageInfo.totalElements ?? content.length);
      }
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContests(page);
  }, [page]);

  const handleDelete = (id, name) =>
    showConfirm(
      "Delete Contest",
      `Are you sure you want to delete "${name}"? This cannot be undone.`,
      async () => {
        try {
          const resp = await ApiService.deleteContest(id);
          if (resp.statusCode === 200) {
            showMessage("Contest deleted successfully", "success");
            fetchContests(page);
          }
        } catch (err) {
          showMessage(err.response?.data?.message || err.message, "error");
        }
      },
    );

  const filtered = contests.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading && contests.length === 0) {
    return (
      <Box minH="100vh" bg="gray.50" py={8}>
        <Container maxW="container.xl">
          <VStack gap={4} py={20}>
            <Spinner size="xl" color="purple.500" thickness="4px" />
            <Text color="gray.600">Loading contests...</Text>
          </VStack>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50" py={8}>
      <Container maxW="container.xl">
        <VStack align="stretch" gap={5}>
          {/* Header */}
          <HStack justify="space-between">
            <HStack gap={3}>
              <HStack gap={2}>
                <Trophy size={28} color="#7c3aed" />
                <Heading size="2xl" color="gray.800">
                  Manage Contests
                </Heading>
              </HStack>
              <Badge
                colorScheme="purple"
                fontSize="md"
                px={3}
                py={1}
                borderRadius="full"
              >
                {totalElements} {totalElements === 1 ? "contest" : "contests"}
              </Badge>
            </HStack>
            <Button
              onClick={() => navigate("/admin/contests/new")}
              colorScheme="purple"
              size="md"
              gap={2}
            >
              <Plus size={18} />
              New Contest
            </Button>
          </HStack>

          <ConfirmDialog />

          {/* Search */}
          <Box
            bg="white"
            px={4}
            py={3}
            borderRadius="lg"
            boxShadow="sm"
            border="1px solid"
            borderColor="gray.200"
          >
            <Box position="relative">
              <Box
                position="absolute"
                left={2}
                top="50%"
                transform="translateY(-50%)"
              >
                <Search size={18} color="#9CA3AF" />
              </Box>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by contest name..."
                pl={8}
                border="none"
                _focus={{ boxShadow: "none" }}
                fontSize="sm"
              />
            </Box>
          </Box>

          {/* Table */}
          <Box
            bg="white"
            borderRadius="xl"
            boxShadow="md"
            overflow="hidden"
            position="relative"
          >
            {loading && (
              <Box
                position="absolute"
                inset={0}
                bg="whiteAlpha.700"
                display="flex"
                alignItems="center"
                justifyContent="center"
                zIndex={10}
              >
                <Spinner size="lg" color="purple.500" thickness="3px" />
              </Box>
            )}

            <Table.Root variant="line" size="md">
              <Table.Header bg="purple.50">
                <Table.Row>
                  <Table.ColumnHeader w="5%">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">#</Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="28%">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">Contest</Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="12%">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">Status</Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="20%">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">Start</Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="20%">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">End</Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="7%" textAlign="center">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">Problems</Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="8%" textAlign="center">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">Actions</Text>
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {filtered.length > 0 ? (
                  filtered.map((contest, idx) => (
                    <Table.Row
                      key={contest.id}
                      _hover={{ bg: "purple.50" }}
                      transition="background 0.15s"
                      bg={idx % 2 === 0 ? "white" : "gray.50"}
                    >
                      <Table.Cell>
                        <Text fontSize="sm" fontWeight="600" color="gray.500">
                          {contest.id}
                        </Text>
                      </Table.Cell>

                      <Table.Cell>
                        <VStack align="start" gap={0}>
                          <HStack gap={1}>
                            {contest.isPublic ? (
                              <Globe size={12} color="#9ca3af" />
                            ) : (
                              <Lock size={12} color="#9ca3af" />
                            )}
                            <Text fontSize="sm" fontWeight="700" color="gray.800">
                              {contest.name}
                            </Text>
                          </HStack>
                          <Text fontSize="xs" color="gray.400">
                            by {contest.creatorUsername ?? "—"}
                          </Text>
                        </VStack>
                      </Table.Cell>

                      <Table.Cell>
                        <StatusBadge contest={contest} />
                      </Table.Cell>

                      <Table.Cell>
                        <HStack gap={1}>
                          <Calendar size={12} color="#9ca3af" />
                          <Text fontSize="xs" color="gray.600">
                            {fmt(contest.startTime)}
                          </Text>
                        </HStack>
                      </Table.Cell>

                      <Table.Cell>
                        <HStack gap={1}>
                          <Calendar size={12} color="#9ca3af" />
                          <Text fontSize="xs" color="gray.600">
                            {fmt(contest.endTime)}
                          </Text>
                        </HStack>
                      </Table.Cell>

                      <Table.Cell textAlign="center">
                        <HStack justify="center" gap={1}>
                          <Users size={12} color="#9ca3af" />
                          <Text fontSize="sm" color="gray.700">
                            {contest.totalProblems ?? 0}
                          </Text>
                        </HStack>
                      </Table.Cell>

                      <Table.Cell>
                        <HStack justify="center" gap={1}>
                          <Box
                            as="button"
                            p={1}
                            borderRadius="md"
                            color="blue.500"
                            _hover={{ bg: "blue.50" }}
                            title="View"
                            onClick={() =>
                              navigate(`/contests/${contest.slug}`)
                            }
                          >
                            <Eye size={16} />
                          </Box>
                          <Box
                            as="button"
                            p={1}
                            borderRadius="md"
                            color="green.500"
                            _hover={{ bg: "green.50" }}
                            title="Edit"
                            onClick={() =>
                              navigate(`/admin/contests/edit/${contest.id}`)
                            }
                          >
                            <Edit size={16} />
                          </Box>
                          {isAdmin && (
                            <Box
                              as="button"
                              p={1}
                              borderRadius="md"
                              color="red.400"
                              _hover={{ bg: "red.50" }}
                              title="Delete"
                              onClick={() =>
                                handleDelete(contest.id, contest.name)
                              }
                            >
                              <Trash2 size={16} />
                            </Box>
                          )}
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  ))
                ) : (
                  <Table.Row>
                    <Table.Cell colSpan={7} textAlign="center" py={10}>
                      <VStack gap={2}>
                        <Trophy size={32} color="#D1D5DB" />
                        <Text color="gray.400" fontSize="sm">
                          No contests found
                        </Text>
                      </VStack>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Root>

            {/* Pagination */}
            {totalPages > 1 && (
              <HStack
                justify="space-between"
                px={5}
                py={4}
                borderTopWidth="1px"
                borderColor="gray.100"
              >
                <Text fontSize="sm" color="gray.500">
                  Page {page + 1} of {totalPages}
                </Text>
                <HStack gap={1}>
                  <Box
                    as="button"
                    p={1}
                    borderRadius="md"
                    color={page === 0 ? "gray.300" : "gray.600"}
                    _hover={page > 0 ? { bg: "purple.50", color: "purple.600" } : {}}
                    onClick={() => page > 0 && setPage(0)}
                    disabled={page === 0}
                  >
                    <ChevronsLeft size={18} />
                  </Box>
                  <Box
                    as="button"
                    p={1}
                    borderRadius="md"
                    color={page === 0 ? "gray.300" : "gray.600"}
                    _hover={page > 0 ? { bg: "purple.50", color: "purple.600" } : {}}
                    onClick={() => page > 0 && setPage((p) => p - 1)}
                    disabled={page === 0}
                  >
                    <ChevronLeft size={18} />
                  </Box>
                  <Box
                    as="button"
                    p={1}
                    borderRadius="md"
                    color={page >= totalPages - 1 ? "gray.300" : "gray.600"}
                    _hover={page < totalPages - 1 ? { bg: "purple.50", color: "purple.600" } : {}}
                    onClick={() => page < totalPages - 1 && setPage((p) => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight size={18} />
                  </Box>
                  <Box
                    as="button"
                    p={1}
                    borderRadius="md"
                    color={page >= totalPages - 1 ? "gray.300" : "gray.600"}
                    _hover={page < totalPages - 1 ? { bg: "purple.50", color: "purple.600" } : {}}
                    onClick={() => page < totalPages - 1 && setPage(totalPages - 1)}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronsRight size={18} />
                  </Box>
                </HStack>
              </HStack>
            )}
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default AdminContestPage;
