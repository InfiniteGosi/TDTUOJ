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
  Building2,
  Search,
  Users,
  Globe,
  Lock,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";

// ─── Organization Card ────────────────────────────────────────────────────────

const OrgCard = ({ org, onEnter }) => {
  return (
    <Box
      bg="white"
      borderRadius="xl"
      border="1px solid"
      borderColor="gray.200"
      boxShadow="sm"
      overflow="hidden"
      transition="all 0.2s"
      _hover={{
        boxShadow: "md",
        borderColor: "purple.200",
        transform: "translateY(-2px)",
      }}
      cursor="pointer"
      onClick={() => onEnter(org.slug)}
      display="flex"
      flexDirection="column"
    >
      {/* Accent bar */}
      <Box
        h="4px"
        bg={
          org.myRole === "OWNER"
            ? "#f59e0b"
            : org.myRole
              ? "#22c55e"
              : "#7c3aed"
        }
      />

      <Box p={5} flex={1} display="flex" flexDirection="column" gap={3}>
        {/* Header row */}
        <HStack justify="space-between" align="flex-start">
          <HStack gap={1}>
            {org.isPublic ? (
              <Globe size={13} color="#9ca3af" />
            ) : (
              <Lock size={13} color="#9ca3af" />
            )}
            <Text fontSize="xs" color="gray.400">
              {org.isPublic ? "Public" : "Private"}
            </Text>
          </HStack>
          {org.myRole && (
            <Box
              display="inline-flex"
              alignItems="center"
              px={2}
              py="2px"
              borderRadius="full"
              fontSize="xs"
              fontWeight="600"
              bg={
                org.myRole === "OWNER"
                  ? "#fffbeb"
                  : org.myRole === "ADMIN"
                    ? "#eff6ff"
                    : "#f0fdf4"
              }
              color={
                org.myRole === "OWNER"
                  ? "#d97706"
                  : org.myRole === "ADMIN"
                    ? "#3b82f6"
                    : "#16a34a"
              }
            >
              {org.myRole.charAt(0) + org.myRole.slice(1).toLowerCase()}
            </Box>
          )}
        </HStack>

        {/* Name */}
        <Box>
          <Text fontSize="lg" fontWeight="800" color="gray.900" lineClamp={2}>
            {org.name}
          </Text>
          {org.about && (
            <Text fontSize="sm" color="gray.500" mt={1} lineClamp={2}>
              {org.about}
            </Text>
          )}
        </Box>

        {/* Meta */}
        <HStack gap={1} mt="auto">
          <Users size={13} color="#9ca3af" />
          <Text fontSize="xs" color="gray.500">
            {org.totalMembers ?? 0}{" "}
            {(org.totalMembers ?? 0) === 1 ? "member" : "members"}
          </Text>
        </HStack>
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
          by {org.creatorUsername ?? "—"}
        </Text>
        <HStack gap={1} color="purple.600" fontSize="xs" fontWeight="600">
          <Text>Detail</Text>
          <ChevronRight size={13} />
        </HStack>
      </HStack>
    </Box>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const OrganizationPage = () => {
  const navigate = useNavigate();
  const { showMessage } = useToast();

  const [organizations, setOrganizations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [tab, setTab] = useState("ALL"); // ALL | MY
  const SIZE = 12;

  const isAuthenticated = ApiService.isAuthenticated();

  const fetchOrgs = async () => {
    try {
      setLoading(true);
      let resp;
      if (tab === "MY" && isAuthenticated) {
        resp = await ApiService.getMyOrganizations({ page, size: SIZE });
      } else {
        resp = await ApiService.getOrganizations({
          page,
          size: SIZE,
          search,
        });
      }
      if (resp.statusCode === 200) {
        const data = resp.data;
        const content = data.content ?? data;
        const pageInfo = data.page ?? {};
        setOrganizations(content);
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
    fetchOrgs();
  }, [page, tab]);

  // Debounced search
  useEffect(() => {
    if (tab === "ALL") {
      const timer = setTimeout(() => {
        setPage(0);
        fetchOrgs();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [search]);

  const TABS = isAuthenticated ? ["ALL", "MY"] : ["ALL"];

  return (
    <Box minH="100vh" bg="gray.50" py={8}>
      <Container maxW="container.xl">
        <VStack align="stretch" gap={6}>
          {/* Hero Header */}
          <Box
            style={{
              background:
                "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #6366f1 100%)",
            }}
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
                <Building2 size={36} />
                <Heading size="3xl" fontWeight="900">
                  Organizations
                </Heading>
              </HStack>
              <Text fontSize="lg" opacity={0.85}>
                Browse and join study groups, teams, and communities
              </Text>
              <HStack gap={2} mt={1}>
                <Badge
                  bg="whiteAlpha.200"
                  color="white"
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontSize="sm"
                >
                  {totalElements} organizations
                </Badge>
              </HStack>
            </VStack>
          </Box>

          {/* Action Bar */}
          <HStack gap={3} align="stretch" flexWrap="wrap">
            {/* Search */}
            <Box
              flex={1}
              bg="white"
              px={4}
              py={3}
              borderRadius="lg"
              boxShadow="sm"
              border="1px solid"
              borderColor="gray.200"
              minW="200px"
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
                  placeholder="Search organizations..."
                  pl={8}
                  border="none"
                  _focus={{ boxShadow: "none" }}
                  fontSize="sm"
                />
              </Box>
            </Box>

            {/* Tabs */}
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
              {TABS.map((t) => (
                <Box
                  key={t}
                  as="button"
                  px={3}
                  py={1}
                  borderRadius="md"
                  fontSize="sm"
                  fontWeight="600"
                  bg={tab === t ? "purple.600" : "transparent"}
                  color={tab === t ? "white" : "gray.500"}
                  transition="all 0.15s"
                  _hover={
                    tab !== t
                      ? { bg: "purple.50", color: "purple.600" }
                      : {}
                  }
                  onClick={() => {
                    setTab(t);
                    setPage(0);
                  }}
                  style={{ outline: "none" }}
                >
                  {t === "ALL" ? "All" : "My Orgs"}
                </Box>
              ))}
            </HStack>
          </HStack>

          {/* Content */}
          {loading ? (
            <VStack gap={4} py={20}>
              <Spinner size="xl" color="purple.500" thickness="4px" />
              <Text color="gray.500">Loading organizations...</Text>
            </VStack>
          ) : organizations.length === 0 ? (
            <VStack gap={3} py={16}>
              <Building2 size={48} color="#D1D5DB" />
              <Text color="gray.400" fontSize="lg" fontWeight="600">
                {tab === "MY"
                  ? "You haven't joined any organizations yet"
                  : "No organizations found"}
              </Text>
              <Text color="gray.400" fontSize="sm">
                {tab === "MY"
                  ? "Browse organizations and join one"
                  : "Try adjusting your search"}
              </Text>
            </VStack>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={5}>
              {organizations.map((org) => (
                <OrgCard
                  key={org.id}
                  org={org}
                  onEnter={(slug) => navigate(`/organizations/${slug}`)}
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
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
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

export default OrganizationPage;
