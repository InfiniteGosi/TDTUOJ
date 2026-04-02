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
  SimpleGrid,
} from "@chakra-ui/react";
import {
  Trophy,
  Search,
  Calendar,
  Users,
  Lock,
  Globe,
  ChevronRight,
  Clock,
  Star,
  ChevronLeft,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (dt, opts = {}) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...opts,
  });
};

const statusOf = (contest) => {
  const now = Date.now();
  const start = new Date(contest.startTime).getTime();
  const end   = new Date(contest.endTime).getTime();
  if (now < start) return "UPCOMING";
  if (now > end)   return "ENDED";
  return "RUNNING";
};

const STATUS = {
  UPCOMING: { label: "Upcoming", color: "#3b82f6", bg: "#eff6ff", dot: "#93c5fd" },
  RUNNING:  { label: "Live",     color: "#16a34a", bg: "#f0fdf4", dot: "#4ade80" },
  ENDED:    { label: "Ended",    color: "#6b7280", bg: "#f9fafb", dot: "#d1d5db" },
};

const timeUntil = (dt) => {
  const diff = new Date(dt).getTime() - Date.now();
  if (diff <= 0) return null;
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `Starts in ${days}d ${hours}h`;
  if (hours > 0) return `Starts in ${hours}h ${mins}m`;
  return `Starts in ${mins}m`;
};

// ─── Contest Card ─────────────────────────────────────────────────────────────

const ContestCard = ({ contest, onEnter }) => {
  const status = statusOf(contest);
  const s = STATUS[status];
  const countdown = status === "UPCOMING" ? timeUntil(contest.startTime) : null;

  return (
    <Box
      bg="white"
      borderRadius="xl"
      border="1px solid"
      borderColor="gray.200"
      boxShadow="sm"
      overflow="hidden"
      transition="all 0.2s"
      _hover={{ boxShadow: "md", borderColor: "purple.200", transform: "translateY(-2px)" }}
      cursor="pointer"
      onClick={() => onEnter(contest.slug)}
      display="flex"
      flexDirection="column"
    >
      {/* Status bar */}
      <Box h="4px" bg={s.color} />

      <Box p={5} flex={1} display="flex" flexDirection="column" gap={3}>
        {/* Header */}
        <HStack justify="space-between" align="flex-start">
          <HStack gap={1}>
            {contest.isPublic ? (
              <Globe size={13} color="#9ca3af" />
            ) : (
              <Lock size={13} color="#9ca3af" />
            )}
            {contest.isRated && (
              <Star size={13} color="#f59e0b" fill="#f59e0b" />
            )}
          </HStack>
          <Box
            display="inline-flex"
            alignItems="center"
            gap={1}
            px={2}
            py="2px"
            borderRadius="full"
            fontSize="xs"
            fontWeight="600"
            bg={s.bg}
            color={s.color}
          >
            {status === "RUNNING" && (
              <Box
                as="span"
                w="6px"
                h="6px"
                borderRadius="full"
                bg={s.dot}
                display="inline-block"
                style={{ animation: "pulse 1.5s infinite" }}
              />
            )}
            {s.label}
          </Box>
        </HStack>

        {/* Title */}
        <Box>
          <Text fontSize="lg" fontWeight="800" color="gray.900" lineClamp={2}>
            {contest.name}
          </Text>
          {contest.description && (
            <Text fontSize="sm" color="gray.500" mt={1} lineClamp={2}>
              {contest.description}
            </Text>
          )}
        </Box>

        {/* Countdown */}
        {countdown && (
          <HStack gap={1}>
            <Clock size={13} color="#3b82f6" />
            <Text fontSize="xs" color="blue.500" fontWeight="600">
              {countdown}
            </Text>
          </HStack>
        )}

        {/* Meta */}
        <VStack align="stretch" gap={1} mt="auto">
          <HStack gap={1}>
            <Calendar size={13} color="#9ca3af" />
            <Text fontSize="xs" color="gray.500">
              {fmt(contest.startTime)} → {fmt(contest.endTime)}
            </Text>
          </HStack>
          <HStack justify="space-between">
            <HStack gap={1}>
              <Users size={13} color="#9ca3af" />
              <Text fontSize="xs" color="gray.500">
                {contest.totalParticipants ?? 0} registered
                {contest.maxParticipant ? ` / ${contest.maxParticipant}` : ""}
              </Text>
            </HStack>
            <HStack gap={1}>
              <Trophy size={13} color="#9ca3af" />
              <Text fontSize="xs" color="gray.500">
                {contest.totalProblems ?? 0} problems
              </Text>
            </HStack>
          </HStack>
        </VStack>
      </Box>

      {/* Footer */}
      <HStack
        px={5}
        py={3}
        bg="gray.50"
        borderTopWidth="1px"
        borderColor="gray.100"
        justify="space-between"
      >
        <Text fontSize="xs" color="gray.400">
          by {contest.creatorUsername ?? "—"}
        </Text>
        <HStack gap={1} color="purple.600" fontSize="xs" fontWeight="600">
          <Text>View</Text>
          <ChevronRight size={13} />
        </HStack>
      </HStack>
    </Box>
  );
};

// ─── Main page ─────────────────────────────────────────────────────────────────

const ContestPage = () => {
  const navigate = useNavigate();
  const { showMessage } = useToast();

  const [contests, setContests] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const SIZE = 12;

  useEffect(() => {
    const fetchContests = async () => {
      try {
        setLoading(true);
        const resp = await ApiService.getPublicContests({ page, size: SIZE });
        if (resp.statusCode === 200) {
          const data = resp.data;
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
    fetchContests();
  }, [page]);

  const filtered = contests.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "ALL" || statusOf(c) === statusFilter;
    return matchSearch && matchStatus;
  });

  const STATUS_TABS = ["ALL", "UPCOMING", "RUNNING", "ENDED"];

  return (
    <Box minH="100vh" bg="gray.50" py={8}>
      {/* Pulse animation */}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>

      <Container maxW="container.xl">
        <VStack align="stretch" gap={6}>
          {/* Hero Header */}
          <Box
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #6366f1 100%)" }}
            borderRadius="2xl"
            p={10}
            color="white"
            position="relative"
            overflow="hidden"
          >
            <Box
              position="absolute"
              inset={0}
              opacity={0.1}
              backgroundImage="radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)"
              backgroundSize="60px 60px"
            />
            <VStack align="flex-start" gap={2} position="relative">
              <HStack gap={3}>
                <Trophy size={36} />
                <Heading size="3xl" fontWeight="900">
                  Contests
                </Heading>
              </HStack>
              <Text fontSize="lg" opacity={0.85}>
                Compete in ICPC-style programming contests and climb the leaderboard
              </Text>
              <Badge
                bg="whiteAlpha.200"
                color="white"
                px={3}
                py={1}
                borderRadius="full"
                fontSize="sm"
                mt={1}
              >
                {totalElements} contests available
              </Badge>
            </VStack>
          </Box>

          {/* Search + Status Filter */}
          <HStack gap={3} align="stretch">
            <Box
              flex={1}
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
                  placeholder="Search contests..."
                  pl={8}
                  border="none"
                  _focus={{ boxShadow: "none" }}
                  fontSize="sm"
                />
              </Box>
            </Box>

            {/* Status tabs */}
            <HStack
              bg="white"
              px={3}
              py={2}
              borderRadius="lg"
              boxShadow="sm"
              border="1px solid"
              borderColor="gray.200"
              gap={1}
            >
              {STATUS_TABS.map((tab) => (
                <Box
                  key={tab}
                  as="button"
                  px={3}
                  py={1}
                  borderRadius="md"
                  fontSize="sm"
                  fontWeight="600"
                  bg={statusFilter === tab ? "purple.600" : "transparent"}
                  color={statusFilter === tab ? "white" : "gray.500"}
                  transition="all 0.15s"
                  _hover={
                    statusFilter !== tab
                      ? { bg: "purple.50", color: "purple.600" }
                      : {}
                  }
                  onClick={() => setStatusFilter(tab)}
                  style={{ outline: "none" }}
                >
                  {tab.charAt(0) + tab.slice(1).toLowerCase()}
                </Box>
              ))}
            </HStack>
          </HStack>

          {/* Content */}
          {loading ? (
            <VStack gap={4} py={20}>
              <Spinner size="xl" color="purple.500" thickness="4px" />
              <Text color="gray.500">Loading contests...</Text>
            </VStack>
          ) : filtered.length === 0 ? (
            <VStack gap={3} py={16}>
              <Trophy size={48} color="#D1D5DB" />
              <Text color="gray.400" fontSize="lg" fontWeight="600">
                No contests found
              </Text>
              <Text color="gray.400" fontSize="sm">
                Try adjusting your search or filter
              </Text>
            </VStack>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={5}>
              {filtered.map((contest) => (
                <ContestCard
                  key={contest.id}
                  contest={contest}
                  onEnter={(slug) => navigate(`/contests/${slug}`)}
                />
              ))}
            </SimpleGrid>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <HStack justify="center" gap={2}>
              <Button
                size="sm"
                variant="ghost"
                colorScheme="purple"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft size={16} />
                Previous
              </Button>
              <Text fontSize="sm" color="gray.500" px={2}>
                Page {page + 1} of {totalPages}
              </Text>
              <Button
                size="sm"
                variant="ghost"
                colorScheme="purple"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
                <ChevronRight size={16} />
              </Button>
            </HStack>
          )}
        </VStack>
      </Container>
    </Box>
  );
};

export default ContestPage;
