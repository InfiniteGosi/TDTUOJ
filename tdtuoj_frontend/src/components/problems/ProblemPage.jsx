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
  Tag,
  X,
  Plus,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useMessage } from "../common/MessageDisplay";

const ProblemPage = () => {
  const { MessageDisplay, showMessage } = useMessage();
  const [problems, setProblems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    limit: 10,
    offset: 0,
    totalElements: 0,
    totalPages: 0,
    currentPage: 0,
  });
  const [sortField, setSortField] = useState("id");
  const [direction, setDirection] = useState("asc");

  // Tag filter state
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTagNames, setSelectedTagNames] = useState([]);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  const navigate = useNavigate();

  // Fetch active tags once on mount for the filter picker
  useEffect(() => {
    const fetchActiveTags = async () => {
      try {
        const response = await ApiService.getAllTags({ limit: 200, offset: 0 });
        if (response.statusCode === 200) {
          setAvailableTags(
            (response.data.content || []).filter((t) => t.isActive === true),
          );
        }
      } catch (err) {
        console.error("Failed to fetch tags:", err);
      }
    };
    fetchActiveTags();
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

  useEffect(() => {
    fetchProblems();
  }, [
    pagination.limit,
    pagination.offset,
    sortField,
    direction,
    selectedTagNames,
  ]);

  // Debounced title search
  useEffect(() => {
    const delay = setTimeout(() => {
      setPagination((prev) => ({ ...prev, offset: 0 }));
      fetchProblems();
    }, 500);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  // ─── Tag filter helpers ────────────────────────────────────────────────────

  const toggleTag = (tagName) => {
    setSelectedTagNames((prev) =>
      prev.includes(tagName)
        ? prev.filter((n) => n !== tagName)
        : [...prev, tagName],
    );
    setPagination((prev) => ({ ...prev, offset: 0 }));
  };

  const clearTagFilters = () => {
    setSelectedTagNames([]);
    setPagination((prev) => ({ ...prev, offset: 0 }));
  };

  const filteredDropdownTags = availableTags.filter(
    (t) =>
      !selectedTagNames.includes(t.name) &&
      t.name.toLowerCase().includes(tagSearchQuery.toLowerCase()),
  );

  // ─── Navigation ───────────────────────────────────────────────────────────

  const handleOnClick = (slug) => navigate(`/problems/${slug}`);

  // ─── Pagination ───────────────────────────────────────────────────────────

  const handlePageChange = (newOffset) =>
    setPagination((prev) => ({ ...prev, offset: newOffset }));
  const handleLimitChange = (newLimit) =>
    setPagination((prev) => ({
      ...prev,
      limit: parseInt(newLimit),
      offset: 0,
    }));

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
    <Box
      minH="100vh"
      bg="gray.50"
      py={8}
      onClick={() => showTagDropdown && setShowTagDropdown(false)}
    >
      <Container maxW="container.xl">
        <VStack align="stretch" gap={6}>
          {/* Header */}
          <HStack justify="space-between" align="center">
            <Heading size="2xl" color="gray.800">
              Problems
            </Heading>
            <Badge
              colorScheme="purple"
              fontSize="md"
              px={3}
              py={1}
              borderRadius="full"
            >
              {pagination.totalElements}{" "}
              {pagination.totalElements === 1 ? "problem" : "problems"}
            </Badge>
          </HStack>

          <MessageDisplay />

          {/* Search, Sort, Tag Filter */}
          <VStack align="stretch" gap={3}>
            <HStack gap={4}>
              {/* Title search */}
              <Box flex={1} bg="white" p={4} borderRadius="lg" boxShadow="sm">
                <Box position="relative" w="full">
                  <Box
                    position="absolute"
                    left={3}
                    top="50%"
                    transform="translateY(-50%)"
                    zIndex={2}
                  >
                    <Search size={20} color="#9CA3AF" />
                  </Box>
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by problem title..."
                    size="lg"
                    pl={10}
                    borderColor="gray.300"
                    _hover={{ borderColor: "purple.400" }}
                    _focus={{
                      borderColor: "purple.500",
                      boxShadow: "0 0 0 1px #805AD5",
                    }}
                  />
                </Box>
              </Box>

              {/* Sort */}
              <Box bg="white" p={4} borderRadius="lg" boxShadow="sm">
                <HStack gap={2}>
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    Sort:
                  </Text>
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #E2E8F0",
                      fontSize: "14px",
                      width: "120px",
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
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #E2E8F0",
                      fontSize: "14px",
                      width: "100px",
                    }}
                  >
                    <option value="asc">Asc</option>
                    <option value="desc">Desc</option>
                  </select>
                </HStack>
              </Box>
            </HStack>

            {/* Tag filter row — only shows if there are active tags */}
            {availableTags.length > 0 && (
              <Box bg="white" p={4} borderRadius="lg" boxShadow="sm">
                <HStack gap={3} align="flex-start" flexWrap="wrap">
                  <HStack gap={1} minW="fit-content" mt={1}>
                    <Tag size={15} color="#805AD5" />
                    <Text fontSize="sm" fontWeight="medium" color="gray.600">
                      Topics:
                    </Text>
                  </HStack>

                  <Wrap flex={1} gap={2}>
                    {/* Selected chips */}
                    {selectedTagNames.map((name) => (
                      <WrapItem key={name}>
                        <Badge
                          colorScheme="purple"
                          px={2}
                          py={1}
                          borderRadius="full"
                          fontSize="xs"
                          display="flex"
                          alignItems="center"
                          gap={1}
                          cursor="pointer"
                          userSelect="none"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTag(name);
                          }}
                        >
                          {name}
                          <X size={10} />
                        </Badge>
                      </WrapItem>
                    ))}

                    {/* Unselected tag pills (show first 12 directly for quick access) */}
                    {availableTags
                      .filter((t) => !selectedTagNames.includes(t.name))
                      .slice(0, 12)
                      .map((tag) => (
                        <WrapItem key={tag.id}>
                          <Badge
                            variant="outline"
                            colorScheme="gray"
                            px={2}
                            py={1}
                            borderRadius="full"
                            fontSize="xs"
                            cursor="pointer"
                            userSelect="none"
                            _hover={{
                              colorScheme: "purple",
                              bg: "purple.50",
                              borderColor: "purple.300",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTag(tag.name);
                            }}
                          >
                            {tag.name}
                          </Badge>
                        </WrapItem>
                      ))}

                    {/* Overflow picker for remaining tags */}
                    {availableTags.filter(
                      (t) => !selectedTagNames.includes(t.name),
                    ).length > 12 && (
                      <WrapItem position="relative">
                        <Button
                          size="xs"
                          variant="ghost"
                          colorScheme="purple"
                          rightIcon={<Plus size={11} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTagDropdown((v) => !v);
                          }}
                        >
                          +
                          {availableTags.filter(
                            (t) => !selectedTagNames.includes(t.name),
                          ).length - 12}{" "}
                          more
                        </Button>

                        {showTagDropdown && (
                          <Box
                            position="absolute"
                            top="110%"
                            left={0}
                            zIndex={20}
                            bg="white"
                            border="1px solid"
                            borderColor="gray.200"
                            borderRadius="lg"
                            boxShadow="lg"
                            w="220px"
                            maxH="280px"
                            overflowY="auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Box p={2} borderBottomWidth="1px">
                              <Input
                                size="sm"
                                placeholder="Search tags..."
                                value={tagSearchQuery}
                                onChange={(e) =>
                                  setTagSearchQuery(e.target.value)
                                }
                                autoFocus
                              />
                            </Box>
                            {filteredDropdownTags.slice(12).map((tag) => (
                              <Box
                                key={tag.id}
                                px={3}
                                py={2}
                                cursor="pointer"
                                _hover={{ bg: "purple.50" }}
                                onClick={() => {
                                  toggleTag(tag.name);
                                  setTagSearchQuery("");
                                  setShowTagDropdown(false);
                                }}
                              >
                                <Text fontSize="sm" color="gray.700">
                                  {tag.name}
                                </Text>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </WrapItem>
                    )}

                    {selectedTagNames.length > 0 && (
                      <WrapItem>
                        <Button
                          size="xs"
                          variant="ghost"
                          colorScheme="gray"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearTagFilters();
                          }}
                        >
                          Clear
                        </Button>
                      </WrapItem>
                    )}
                  </Wrap>
                </HStack>
              </Box>
            )}
          </VStack>

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
                top={0}
                left={0}
                right={0}
                bottom={0}
                bg="whiteAlpha.800"
                display="flex"
                alignItems="center"
                justifyContent="center"
                zIndex={10}
              >
                <Spinner size="lg" color="purple.500" thickness="3px" />
              </Box>
            )}

            <Table.Root variant="line" size="lg">
              <Table.Header bg="purple.50">
                <Table.Row>
                  <Table.ColumnHeader textAlign="center" w="8%">
                    <Text fontWeight="bold" color="purple.700">
                      ID
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="37%">
                    <Text fontWeight="bold" color="purple.700">
                      Problem
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="30%">
                    <Text fontWeight="bold" color="purple.700">
                      Topics
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="center" w="15%">
                    <Text fontWeight="bold" color="purple.700">
                      Points
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="center" w="10%">
                    <Text fontWeight="bold" color="purple.700">
                      Solve
                    </Text>
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {problems.length > 0 ? (
                  problems.map((problem, index) => {
                    // Only show active tags to end users
                    const activeTags = (problem.tags || []).filter(
                      (t) => t.isActive !== false,
                    );

                    return (
                      <Table.Row
                        key={problem.id}
                        _hover={{ bg: "purple.50", cursor: "pointer" }}
                        transition="all 0.2s"
                        bg={index % 2 === 0 ? "white" : "gray.50"}
                        onClick={() => handleOnClick(problem.slug)}
                      >
                        {/* ID */}
                        <Table.Cell textAlign="center">
                          <Badge
                            colorScheme="purple"
                            fontSize="md"
                            px={3}
                            py={1}
                            borderRadius="md"
                            fontWeight="bold"
                          >
                            #{problem.id}
                          </Badge>
                        </Table.Cell>

                        {/* Title */}
                        <Table.Cell>
                          <Text
                            fontSize="lg"
                            fontWeight="semibold"
                            color="gray.800"
                            _hover={{ color: "purple.600" }}
                          >
                            {problem.title}
                          </Text>
                        </Table.Cell>

                        {/* Active tags */}
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
                                    py="2px"
                                    borderRadius="full"
                                    cursor="pointer"
                                    userSelect="none"
                                    _hover={{ opacity: 0.8 }}
                                    onClick={() => toggleTag(tag.name)}
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
                          <HStack justify="center" gap={2}>
                            <Trophy size={18} color="#805AD5" />
                            <Text
                              fontSize="md"
                              fontWeight="bold"
                              color="purple.600"
                            >
                              {problem.point}
                            </Text>
                          </HStack>
                        </Table.Cell>

                        {/* Action */}
                        <Table.Cell textAlign="center">
                          <Box
                            display="inline-flex"
                            p={2}
                            borderRadius="md"
                            bg="purple.100"
                            color="purple.600"
                            _hover={{ bg: "purple.200" }}
                            transition="all 0.2s"
                          >
                            <Book size={20} />
                          </Box>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })
                ) : (
                  <Table.Row>
                    <Table.Cell colSpan={5} textAlign="center" py={10}>
                      <VStack gap={3}>
                        <Book size={48} color="#CBD5E0" />
                        <Text
                          fontSize="lg"
                          color="gray.500"
                          fontWeight="medium"
                        >
                          {searchQuery || selectedTagNames.length > 0
                            ? "No problems match your filters"
                            : "No problems found"}
                        </Text>
                        <Text fontSize="sm" color="gray.400">
                          {searchQuery || selectedTagNames.length > 0
                            ? "Try adjusting your search or topic filters"
                            : "Check back later for new challenges!"}
                        </Text>
                      </VStack>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Root>

            {/* Pagination */}
            {pagination.totalPages > 0 && (
              <Box borderTopWidth="1px" p={4} bg="gray.50">
                <HStack justify="space-between" align="center">
                  <HStack gap={2}>
                    <Text fontSize="sm" color="gray.600">
                      Items per page:
                    </Text>
                    <select
                      value={pagination.limit}
                      onChange={(e) => handleLimitChange(e.target.value)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "6px",
                        border: "1px solid #E2E8F0",
                        fontSize: "14px",
                        width: "80px",
                      }}
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </HStack>

                  <Text fontSize="sm" color="gray.600">
                    Showing {pagination.offset + 1}–
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
                      _disabled={{ opacity: 0.4, cursor: "not-allowed" }}
                    >
                      <ChevronsLeft size={18} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={goToPreviousPage}
                      disabled={!canGoPrevious}
                      _disabled={{ opacity: 0.4, cursor: "not-allowed" }}
                    >
                      <ChevronLeft size={18} />
                    </Button>
                    <Text
                      fontSize="sm"
                      px={3}
                      color="gray.700"
                      fontWeight="medium"
                    >
                      Page {pagination.currentPage + 1} of{" "}
                      {pagination.totalPages}
                    </Text>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={goToNextPage}
                      disabled={!canGoNext}
                      _disabled={{ opacity: 0.4, cursor: "not-allowed" }}
                    >
                      <ChevronRight size={18} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={goToLastPage}
                      disabled={!canGoNext}
                      _disabled={{ opacity: 0.4, cursor: "not-allowed" }}
                    >
                      <ChevronsRight size={18} />
                    </Button>
                  </HStack>
                </HStack>
              </Box>
            )}
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default ProblemPage;
