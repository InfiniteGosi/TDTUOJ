import { useState, useEffect, useRef } from "react";
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
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { Table } from "@chakra-ui/react";
import {
  Book,
  Trophy,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  X,
  ChevronDown,
  RotateCcw,
  CheckCircle,
  Clock,
  Star,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];

const DIFF_STYLE = {
  EASY: { label: "Easy", colorScheme: "green", hex: "#22c55e", bg: "#f0fdf4" },
  MEDIUM: {
    label: "Medium",
    colorScheme: "orange",
    hex: "#f97316",
    bg: "#fff7ed",
  },
  HARD: { label: "Hard", colorScheme: "red", hex: "#ef4444", bg: "#fef2f2" },
};

// ─── Difficulty badge ─────────────────────────────────────────────────────────

const DiffBadge = ({ difficulty }) => {
  const s = DIFF_STYLE[difficulty];
  if (!s) return null;
  return (
    <Badge
      colorScheme={s.colorScheme}
      variant="subtle"
      fontSize="xs"
      px={2}
      py="2px"
      borderRadius="full"
      fontWeight="600"
    >
      {s.label}
    </Badge>
  );
};

// ─── Filter panel ─────────────────────────────────────────────────────────────

const FilterPanel = ({
  availableTags,
  selectedDifficulty,
  onDifficultyChange,
  selectedTagNames,
  toggleTag,
  onReset,
  hasActiveFilters,
}) => {
  const [tagSearch, setTagSearch] = useState("");
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setTagDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredTags = availableTags.filter(
    (t) =>
      !selectedTagNames.includes(t.name) &&
      t.name.toLowerCase().includes(tagSearch.toLowerCase()),
  );

  return (
    <Box
      bg="white"
      borderRadius="xl"
      border="1px solid"
      borderColor="gray.200"
      boxShadow="sm"
      overflow="visible"
    >
      {/* Panel header */}
      <HStack
        px={5}
        py={3}
        borderBottomWidth="1px"
        borderColor="gray.100"
        justify="space-between"
      >
        <HStack gap={2}>
          <SlidersHorizontal size={14} color="#9CA3AF" />
          <Text
            fontSize="xs"
            fontWeight="700"
            color="gray.500"
            letterSpacing="0.08em"
          >
            FILTERS
          </Text>
          {hasActiveFilters && (
            <Badge
              colorScheme="purple"
              borderRadius="full"
              fontSize="10px"
              px={2}
              py="1px"
            >
              {(selectedDifficulty ? 1 : 0) + selectedTagNames.length} active
            </Badge>
          )}
        </HStack>
        {hasActiveFilters && (
          <Button
            size="xs"
            variant="ghost"
            color="gray.400"
            _hover={{ color: "red.500", bg: "red.50" }}
            onClick={onReset}
            gap={1}
          >
            <RotateCcw size={11} />
            Reset
          </Button>
        )}
      </HStack>

      {/* Filter rows */}
      <VStack align="stretch" gap={0} divideColor="gray.100">
        {/* ── Difficulty row ── */}
        <HStack
          px={5}
          py={4}
          gap={6}
          align="center"
          borderBottomWidth="1px"
          borderColor="gray.100"
        >
          <HStack gap={2} minW="90px">
            <Text fontSize="sm" fontWeight="500" color="gray.500">
              Difficulty
            </Text>
          </HStack>
          <HStack gap={2}>
            {DIFFICULTIES.map((d) => {
              const s = DIFF_STYLE[d];
              const active = selectedDifficulty === d;
              return (
                <Box
                  key={d}
                  as="button"
                  px={3}
                  py="5px"
                  borderRadius="full"
                  fontSize="xs"
                  fontWeight="600"
                  border="1.5px solid"
                  borderColor={active ? s.hex : "gray.200"}
                  bg={active ? s.bg : "white"}
                  color={active ? s.hex : "gray.500"}
                  cursor="pointer"
                  transition="all 0.15s"
                  _hover={{ borderColor: s.hex, color: s.hex, bg: s.bg }}
                  onClick={() => onDifficultyChange(active ? "" : d)}
                  style={{ outline: "none" }}
                >
                  {s.label}
                  {active && (
                    <Box as="span" ml={1} fontWeight="400">
                      ×
                    </Box>
                  )}
                </Box>
              );
            })}
          </HStack>
        </HStack>

        {/* ── Topics row ── */}
        <HStack px={5} py={4} gap={6} align="flex-start">
          <HStack gap={2} minW="90px" mt="2px">
            <Text fontSize="sm" fontWeight="500" color="gray.500">
              Topics
            </Text>
          </HStack>

          <Box flex={1}>
            {/* Selected topic chips */}
            {selectedTagNames.length > 0 && (
              <Wrap gap={2} mb={3}>
                {selectedTagNames.map((name) => (
                  <WrapItem key={name}>
                    <HStack
                      gap={1}
                      px={2}
                      py="3px"
                      borderRadius="full"
                      bg="purple.100"
                      color="purple.700"
                      fontSize="xs"
                      fontWeight="500"
                      cursor="pointer"
                      userSelect="none"
                      onClick={() => toggleTag(name)}
                      _hover={{ bg: "purple.200" }}
                    >
                      <Text>{name}</Text>
                      <X size={10} />
                    </HStack>
                  </WrapItem>
                ))}
              </Wrap>
            )}

            {/* Dropdown trigger */}
            <Box position="relative" display="inline-block" ref={dropdownRef}>
              <Box
                as="button"
                display="inline-flex"
                alignItems="center"
                gap={1}
                px={3}
                py="5px"
                borderRadius="full"
                border="1.5px dashed"
                borderColor={tagDropdownOpen ? "purple.400" : "gray.300"}
                bg="white"
                color={tagDropdownOpen ? "purple.600" : "gray.500"}
                fontSize="xs"
                fontWeight="500"
                cursor="pointer"
                transition="all 0.15s"
                _hover={{ borderColor: "purple.400", color: "purple.600" }}
                onClick={() => setTagDropdownOpen((v) => !v)}
                style={{ outline: "none" }}
              >
                + Add topic
                <ChevronDown
                  size={11}
                  style={{
                    transform: tagDropdownOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.15s",
                  }}
                />
              </Box>

              {tagDropdownOpen && (
                <Box
                  position="absolute"
                  top="calc(100% + 6px)"
                  left={0}
                  zIndex={50}
                  bg="white"
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="lg"
                  boxShadow="xl"
                  w="230px"
                  maxH="260px"
                  overflowY="auto"
                >
                  <Box
                    p={2}
                    borderBottomWidth="1px"
                    borderColor="gray.100"
                    position="sticky"
                    top={0}
                    bg="white"
                  >
                    <Input
                      size="sm"
                      placeholder="Search topics..."
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      autoFocus
                    />
                  </Box>
                  {filteredTags.length === 0 ? (
                    <Box px={4} py={3}>
                      <Text fontSize="xs" color="gray.400">
                        No topics found
                      </Text>
                    </Box>
                  ) : (
                    filteredTags.map((tag) => (
                      <Box
                        key={tag.id}
                        px={3}
                        py={2}
                        cursor="pointer"
                        _hover={{ bg: "purple.50" }}
                        onClick={() => {
                          toggleTag(tag.name);
                          setTagSearch("");
                          setTagDropdownOpen(false);
                        }}
                      >
                        <Text fontSize="sm" color="gray.700">
                          {tag.name}
                        </Text>
                      </Box>
                    ))
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </HStack>
      </VStack>
    </Box>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const ProblemPage = () => {
  const { showMessage } = useToast();
  const navigate = useNavigate();

  const [problems, setProblems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);
  const [favoritesMode, setFavoritesMode] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [favLoading, setFavLoading] = useState(false);
  const [pagination, setPagination] = useState({
    limit: 10,
    offset: 0,
    totalElements: 0,
    totalPages: 0,
    currentPage: 0,
  });
  const [sortField, setSortField] = useState("id");
  const [direction, setDirection] = useState("asc");
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTagNames, setSelectedTagNames] = useState([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState("");

  const hasActiveFilters =
    selectedTagNames.length > 0 || selectedDifficulty !== "";
  const activeFilterCount =
    (selectedDifficulty ? 1 : 0) + selectedTagNames.length;

  // Load active tags once
  useEffect(() => {
    ApiService.getAllTags({ limit: 200, offset: 0 })
      .then((res) => {
        if (res.statusCode === 200)
          setAvailableTags(
            (res.data.content || []).filter((t) => t.isActive === true),
          );
      })
      .catch(console.error);
  }, []);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getAllProblems({
        limit: pagination.limit,
        offset: pagination.offset,
        sortField,
        direction,
        title: searchQuery,
        tags: selectedTagNames,
        difficulty: selectedDifficulty,
      });
      if (response.statusCode === 200) {
        setProblems(response.data.content);
        setPagination((prev) => ({
          ...prev,
          totalElements: response.data.page.totalElements,
          totalPages: response.data.page.totalPages,
          currentPage: response.data.page.number,
        }));
      }
    } catch (error) {
      showMessage(error.response?.data?.message || error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    if (!ApiService.isAuthenticated()) {
      showMessage("Please log in to view favorites", "warning");
      setFavoritesMode(false);
      return;
    }
    setFavLoading(true);
    try {
      const resp = await ApiService.getFavoriteProblems();
      if (resp.statusCode === 200) setFavorites(resp.data || []);
    } catch (error) {
      showMessage(error.response?.data?.message || error.message, "error");
    } finally {
      setFavLoading(false);
    }
  };

  const toggleFavoritesMode = () => {
    const next = !favoritesMode;
    setFavoritesMode(next);
    if (next) fetchFavorites();
  };

  useEffect(() => {
    fetchProblems();
  }, [
    pagination.limit,
    pagination.offset,
    sortField,
    direction,
    selectedTagNames,
    selectedDifficulty,
  ]);

  useEffect(() => {
    const delay = setTimeout(() => {
      setPagination((prev) => ({ ...prev, offset: 0 }));
      fetchProblems();
    }, 500);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const toggleTag = (name) => {
    setSelectedTagNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
    setPagination((prev) => ({ ...prev, offset: 0 }));
  };

  const handleDifficultyChange = (d) => {
    setSelectedDifficulty(d);
    setPagination((prev) => ({ ...prev, offset: 0 }));
  };

  const resetFilters = () => {
    setSelectedTagNames([]);
    setSelectedDifficulty("");
    setPagination((prev) => ({ ...prev, offset: 0 }));
  };

  const handlePageChange = (o) => setPagination((p) => ({ ...p, offset: o }));
  const handleLimitChange = (l) =>
    setPagination((p) => ({ ...p, limit: parseInt(l), offset: 0 }));
  const goToFirstPage = () => handlePageChange(0);
  const goToLastPage = () =>
    handlePageChange((pagination.totalPages - 1) * pagination.limit);
  const goToPreviousPage = () =>
    handlePageChange(Math.max(0, pagination.offset - pagination.limit));
  const goToNextPage = () =>
    handlePageChange(
      Math.min(
        (pagination.totalPages - 1) * pagination.limit,
        pagination.offset + pagination.limit,
      ),
    );
  const canGoPrevious = pagination.currentPage > 0;
  const canGoNext = pagination.currentPage < pagination.totalPages - 1;

  if (loading && problems.length === 0) {
    return (
      <Box minH="100vh" bg="gray.50" py={8}>
        <Container maxW="container.xl">
          <VStack gap={4} py={20}>
            <Spinner size="xl" color="purple.500" thickness="4px" />
            <Text color="gray.600">Loading problems...</Text>
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
            <Heading size="2xl" color="gray.800">
              Problems
            </Heading>
            <HStack gap={3}>
              {/* Favorites toggle */}
              {ApiService.isAuthenticated() && (
                <Box
                  as="button"
                  display="flex"
                  alignItems="center"
                  gap={2}
                  px={4}
                  py={2}
                  borderRadius="lg"
                  boxShadow="sm"
                  border="1px solid"
                  bg={favoritesMode ? "yellow.400" : "white"}
                  borderColor={favoritesMode ? "yellow.400" : "gray.200"}
                  color={favoritesMode ? "white" : "gray.600"}
                  cursor="pointer"
                  transition="all 0.15s"
                  _hover={{
                    borderColor: "yellow.400",
                    color: favoritesMode ? "white" : "yellow.500",
                  }}
                  onClick={toggleFavoritesMode}
                  style={{ outline: "none", whiteSpace: "nowrap" }}
                >
                  <Star size={15} fill={favoritesMode ? "white" : "none"} />
                  <Text fontSize="sm" fontWeight="500">
                    {favoritesMode ? "All Problems" : "Favorites"}
                    {!favoritesMode && favorites.length > 0 && (
                      <Box
                        as="span"
                        ml={2}
                        bg="yellow.400"
                        color="white"
                        borderRadius="full"
                        px={2}
                        py="1px"
                        fontSize="xs"
                        fontWeight="bold"
                      >
                        {favorites.length}
                      </Box>
                    )}
                  </Text>
                </Box>
              )}
              <Badge
                colorScheme="purple"
                fontSize="md"
                px={3}
                py={1}
                borderRadius="full"
              >
                {favoritesMode ? favorites.length : pagination.totalElements}{" "}
                {(favoritesMode ? favorites.length : pagination.totalElements) === 1 ? "problem" : "problems"}
              </Badge>
            </HStack>
          </HStack>

          {/* Search + Sort + Filters toggle */}
          <HStack gap={3} align="stretch">
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by problem title..."
                  pl={8}
                  border="none"
                  _focus={{ boxShadow: "none" }}
                  fontSize="sm"
                />
              </Box>
            </Box>

            {/* Sort */}
            <HStack
              bg="white"
              px={4}
              py={3}
              borderRadius="lg"
              boxShadow="sm"
              border="1px solid"
              borderColor="gray.200"
              gap={2}
            >
              <Text fontSize="sm" color="gray.500" whiteSpace="nowrap">
                Sort by
              </Text>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid #E2E8F0",
                  fontSize: "13px",
                  background: "white",
                }}
              >
                <option value="id">ID</option>
                <option value="title">Title</option>
                <option value="point">Points</option>
              </select>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid #E2E8F0",
                  fontSize: "13px",
                  background: "white",
                }}
              >
                <option value="asc">↑ Asc</option>
                <option value="desc">↓ Desc</option>
              </select>
            </HStack>

            {/* Filter toggle */}
            <Box
              as="button"
              display="flex"
              alignItems="center"
              gap={2}
              px={4}
              bg={showFilters ? "purple.600" : "white"}
              color={showFilters ? "white" : "gray.600"}
              borderRadius="lg"
              boxShadow="sm"
              border="1px solid"
              borderColor={showFilters ? "purple.600" : "gray.200"}
              cursor="pointer"
              position="relative"
              transition="all 0.15s"
              _hover={{
                borderColor: "purple.500",
                color: showFilters ? "white" : "purple.600",
              }}
              onClick={() => setShowFilters((v) => !v)}
              style={{ outline: "none", whiteSpace: "nowrap" }}
            >
              <SlidersHorizontal size={15} />
              <Text fontSize="sm" fontWeight="500">
                Filters
              </Text>
              {activeFilterCount > 0 && (
                <Box
                  bg={showFilters ? "white" : "purple.500"}
                  color={showFilters ? "purple.600" : "white"}
                  borderRadius="full"
                  w="18px"
                  h="18px"
                  fontSize="10px"
                  fontWeight="bold"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  ml={1}
                >
                  {activeFilterCount}
                </Box>
              )}
            </Box>
          </HStack>

          {/* Filter panel — hidden in favorites mode */}
          {showFilters && !favoritesMode && (
            <FilterPanel
              availableTags={availableTags}
              selectedDifficulty={selectedDifficulty}
              onDifficultyChange={handleDifficultyChange}
              selectedTagNames={selectedTagNames}
              toggleTag={toggleTag}
              onReset={resetFilters}
              hasActiveFilters={hasActiveFilters}
            />
          )}

          {/* ── Favorites grid ── */}
          {favoritesMode ? (
            <Box
              bg="white"
              borderRadius="xl"
              boxShadow="md"
              overflow="hidden"
              position="relative"
            >
              {favLoading ? (
                <Box py={20} display="flex" justifyContent="center">
                  <Spinner size="lg" color="yellow.400" thickness="3px" />
                </Box>
              ) : favorites.length === 0 ? (
                <Box py={16} textAlign="center">
                  <VStack gap={3}>
                    <Star size={44} color="#CBD5E0" />
                    <Text fontSize="lg" color="gray.500" fontWeight="medium">
                      No favorites yet
                    </Text>
                    <Text fontSize="sm" color="gray.400">
                      Open a problem and click Save to bookmark it
                    </Text>
                  </VStack>
                </Box>
              ) : (
                <Table.Root variant="line" size="md">
                  <Table.Header bg="yellow.50">
                    <Table.Row>
                      <Table.ColumnHeader textAlign="center" w="7%">
                        <Text fontWeight="bold" color="yellow.700" fontSize="sm">#</Text>
                      </Table.ColumnHeader>
                      <Table.ColumnHeader w="30%">
                        <Text fontWeight="bold" color="yellow.700" fontSize="sm">Problem</Text>
                      </Table.ColumnHeader>
                      <Table.ColumnHeader w="12%">
                        <Text fontWeight="bold" color="yellow.700" fontSize="sm">Difficulty</Text>
                      </Table.ColumnHeader>
                      <Table.ColumnHeader w="30%">
                        <Text fontWeight="bold" color="yellow.700" fontSize="sm">Topics</Text>
                      </Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="center" w="12%">
                        <Text fontWeight="bold" color="yellow.700" fontSize="sm">Points</Text>
                      </Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="center" w="9%">
                        <Text fontWeight="bold" color="yellow.700" fontSize="sm">Status</Text>
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {favorites.map((problem, index) => {
                      const activeTags = (problem.tags || []).filter((t) => t.isActive !== false);
                      return (
                        <Table.Row
                          key={problem.id}
                          _hover={{ bg: "yellow.50", cursor: "pointer" }}
                          transition="background 0.15s"
                          bg={index % 2 === 0 ? "white" : "gray.50"}
                          onClick={() => navigate(`/problems/${problem.slug}`)}
                        >
                          <Table.Cell textAlign="center">
                            <Text fontSize="sm" fontWeight="600" color="gray.500">{problem.id}</Text>
                          </Table.Cell>
                          <Table.Cell>
                            <HStack gap={2}>
                              <Star size={12} color="#F6C90E" fill="#F6C90E" />
                              <Text fontSize="sm" fontWeight="600" color="gray.800">
                                {problem.title}
                              </Text>
                            </HStack>
                          </Table.Cell>
                          <Table.Cell>
                            <DiffBadge difficulty={problem.problemDifficulty} />
                          </Table.Cell>
                          <Table.Cell onClick={(e) => e.stopPropagation()}>
                            <Wrap gap={1}>
                              {activeTags.length > 0 ? (
                                activeTags.map((tag) => (
                                  <WrapItem key={tag.id}>
                                    <Badge colorScheme="gray" variant="subtle" fontSize="xs" px={2} py="1px" borderRadius="full">
                                      {tag.name}
                                    </Badge>
                                  </WrapItem>
                                ))
                              ) : (
                                <Text fontSize="xs" color="gray.400" fontStyle="italic">—</Text>
                              )}
                            </Wrap>
                          </Table.Cell>
                          <Table.Cell textAlign="center">
                            <HStack justify="center" gap={1}>
                              <Trophy size={14} color="#805AD5" />
                              <Text fontSize="sm" fontWeight="700" color="purple.600">{problem.point}</Text>
                            </HStack>
                          </Table.Cell>
                          <Table.Cell textAlign="center">
                            {problem.solved ? (
                              <Box display="inline-flex" p={2} borderRadius="md" bg="green.100" color="green.600">
                                <CheckCircle size={18} />
                              </Box>
                            ) : problem.attempted ? (
                              <Box display="inline-flex" p={2} borderRadius="md" bg="orange.100" color="orange.500">
                                <Clock size={18} />
                              </Box>
                            ) : (
                              <Box display="inline-flex" p={2} borderRadius="md" bg="purple.100" color="purple.600">
                                <Book size={18} />
                              </Box>
                            )}
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Root>
              )}
            </Box>
          ) : (
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
                  <Table.ColumnHeader textAlign="center" w="7%">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">
                      #
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="30%">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">
                      Problem
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="12%">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">
                      Difficulty
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="30%">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">
                      Topics
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="center" w="12%">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">
                      Points
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="center" w="9%">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">
                      Solve
                    </Text>
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {problems.length > 0 ? (
                  problems.map((problem, index) => {
                    const activeTags = (problem.tags || []).filter(
                      (t) => t.isActive !== false,
                    );
                    return (
                      <Table.Row
                        key={problem.id}
                        _hover={{ bg: "purple.50", cursor: "pointer" }}
                        transition="background 0.15s"
                        bg={index % 2 === 0 ? "white" : "gray.50"}
                        onClick={() => navigate(`/problems/${problem.slug}`)}
                      >
                        {/* ID */}
                        <Table.Cell textAlign="center">
                          <Text fontSize="sm" fontWeight="600" color="gray.500">
                            {problem.id}
                          </Text>
                        </Table.Cell>

                        {/* Title */}
                        <Table.Cell>
                          <Text
                            fontSize="sm"
                            fontWeight="600"
                            color="gray.800"
                            _hover={{ color: "purple.600" }}
                          >
                            {problem.title}
                          </Text>
                        </Table.Cell>

                        {/* Difficulty */}
                        <Table.Cell>
                          <DiffBadge difficulty={problem.problemDifficulty} />
                        </Table.Cell>

                        {/* Active tags — clicking a tag adds it as a filter */}
                        <Table.Cell onClick={(e) => e.stopPropagation()}>
                          <Wrap gap={1}>
                            {activeTags.length > 0 ? (
                              activeTags.map((tag) => (
                                <WrapItem key={tag.id}>
                                  <Badge
                                    colorScheme={
                                      selectedTagNames.includes(tag.name)
                                        ? "purple"
                                        : "gray"
                                    }
                                    variant={
                                      selectedTagNames.includes(tag.name)
                                        ? "solid"
                                        : "subtle"
                                    }
                                    fontSize="xs"
                                    px={2}
                                    py="1px"
                                    borderRadius="full"
                                    cursor="pointer"
                                    userSelect="none"
                                    _hover={{ opacity: 0.75 }}
                                    onClick={() => {
                                      toggleTag(tag.name);
                                      if (!showFilters) setShowFilters(true);
                                    }}
                                  >
                                    {tag.name}
                                  </Badge>
                                </WrapItem>
                              ))
                            ) : (
                              <Text
                                fontSize="xs"
                                color="gray.400"
                                fontStyle="italic"
                              >
                                —
                              </Text>
                            )}
                          </Wrap>
                        </Table.Cell>

                        {/* Points */}
                        <Table.Cell textAlign="center">
                          <HStack justify="center" gap={1}>
                            <Trophy size={14} color="#805AD5" />
                            <Text
                              fontSize="sm"
                              fontWeight="700"
                              color="purple.600"
                            >
                              {problem.point}
                            </Text>
                          </HStack>
                        </Table.Cell>

                        {/* Solve */}
                        <Table.Cell textAlign="center">
                          {problem.solved ? (
                            <Box
                              display="inline-flex"
                              p={2}
                              borderRadius="md"
                              bg="green.100"
                              color="green.600"
                              transition="all 0.15s"
                            >
                              <CheckCircle size={18} />
                            </Box>
                          ) : problem.attempted ? (
                            <Box
                              display="inline-flex"
                              p={2}
                              borderRadius="md"
                              bg="orange.100"
                              color="orange.500"
                              transition="all 0.15s"
                            >
                              <Clock size={18} />
                            </Box>
                          ) : (
                            <Box
                              display="inline-flex"
                              p={2}
                              borderRadius="md"
                              bg="purple.100"
                              color="purple.600"
                              _hover={{ bg: "purple.200" }}
                              transition="all 0.15s"
                            >
                              <Book size={18} />
                            </Box>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    );
                  })
                ) : (
                  <Table.Row>
                    <Table.Cell colSpan={6} textAlign="center" py={12}>
                      <VStack gap={3}>
                        <Book size={44} color="#CBD5E0" />
                        <Text
                          fontSize="lg"
                          color="gray.500"
                          fontWeight="medium"
                        >
                          {hasActiveFilters || searchQuery
                            ? "No problems match your filters"
                            : "No problems yet"}
                        </Text>
                        <Text fontSize="sm" color="gray.400">
                          {hasActiveFilters || searchQuery
                            ? "Try adjusting your search or filters"
                            : "Check back later!"}
                        </Text>
                        {hasActiveFilters && (
                          <Button
                            size="sm"
                            colorScheme="purple"
                            variant="outline"
                            onClick={resetFilters}
                          >
                            Clear all filters
                          </Button>
                        )}
                      </VStack>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Root>

            {/* Pagination */}
            {pagination.totalPages > 0 && (
              <Box borderTopWidth="1px" p={4} bg="gray.50">
                <HStack justify="space-between">
                  <HStack gap={2}>
                    <Text fontSize="sm" color="gray.500">
                      Rows:
                    </Text>
                    <select
                      value={pagination.limit}
                      onChange={(e) => handleLimitChange(e.target.value)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "6px",
                        border: "1px solid #E2E8F0",
                        fontSize: "13px",
                      }}
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </HStack>

                  <Text fontSize="sm" color="gray.500">
                    {pagination.offset + 1}–
                    {Math.min(
                      pagination.offset + pagination.limit,
                      pagination.totalElements,
                    )}{" "}
                    of {pagination.totalElements}
                  </Text>

                  <HStack gap={1}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={goToFirstPage}
                      disabled={!canGoPrevious}
                      _disabled={{ opacity: 0.3, cursor: "not-allowed" }}
                    >
                      <ChevronsLeft size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={goToPreviousPage}
                      disabled={!canGoPrevious}
                      _disabled={{ opacity: 0.3, cursor: "not-allowed" }}
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <Text
                      fontSize="sm"
                      px={2}
                      color="gray.600"
                      fontWeight="500"
                    >
                      {pagination.currentPage + 1} / {pagination.totalPages}
                    </Text>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={goToNextPage}
                      disabled={!canGoNext}
                      _disabled={{ opacity: 0.3, cursor: "not-allowed" }}
                    >
                      <ChevronRight size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={goToLastPage}
                      disabled={!canGoNext}
                      _disabled={{ opacity: 0.3, cursor: "not-allowed" }}
                    >
                      <ChevronsRight size={16} />
                    </Button>
                  </HStack>
                </HStack>
              </Box>
            )}
          </Box>
          )}
        </VStack>
      </Container>
    </Box>
  );
};

export default ProblemPage;
