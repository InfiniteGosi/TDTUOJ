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
  Book,
  Trophy,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
  const navigate = useNavigate();

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getAllProblems({
        limit: pagination.limit,
        offset: pagination.offset,
        sortField,
        direction,
        title: searchQuery,
      });

      if (response.statusCode === 200) {
        console.log(response.data);
        setProblems(response.data.content);
        setPagination((prev) => ({
          ...prev,
          totalElements: response.data.totalElements,
          totalPages: response.data.totalPages,
          currentPage: response.data.number,
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
  }, [pagination.limit, pagination.offset, sortField, direction]);

  // Debounced search
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      setPagination((prev) => ({ ...prev, offset: 0 }));
      fetchProblems();
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const handleOnClick = (id) => {
    navigate(`/problems/${id}`);
  };

  const handlePageChange = (newOffset) => {
    setPagination((prev) => ({ ...prev, offset: newOffset }));
  };

  const handleLimitChange = (newLimit) => {
    setPagination((prev) => ({
      ...prev,
      limit: parseInt(newLimit),
      offset: 0,
    }));
  };

  const goToFirstPage = () => handlePageChange(0);
  const goToLastPage = () =>
    handlePageChange((pagination.totalPages - 1) * pagination.limit);
  const goToPreviousPage = () =>
    handlePageChange(Math.max(0, pagination.offset - pagination.limit));
  const goToNextPage = () =>
    handlePageChange(
      Math.min(
        (pagination.totalPages - 1) * pagination.limit,
        pagination.offset + pagination.limit
      )
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

          {/* Search and Filters */}
          <HStack gap={4}>
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

          {/* Table Card */}
          <Box bg="white" borderRadius="xl" boxShadow="md" overflow="hidden">
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
                  <Table.ColumnHeader textAlign="center" w="15%">
                    <Text fontWeight="bold" color="purple.700">
                      ID
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="55%">
                    <Text fontWeight="bold" color="purple.700">
                      Problem
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="center" w="20%">
                    <Text fontWeight="bold" color="purple.700">
                      Points
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="center" w="10%">
                    <Text fontWeight="bold" color="purple.700">
                      Action
                    </Text>
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {problems.length > 0 ? (
                  problems.map((problem, index) => (
                    <Table.Row
                      key={problem.id}
                      _hover={{ bg: "purple.50", cursor: "pointer" }}
                      transition="all 0.2s"
                      bg={index % 2 === 0 ? "white" : "gray.50"}
                      onClick={() => handleOnClick(problem.id)}
                    >
                      {/* Problem ID */}
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

                      {/* Problem Title */}
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

                      {/* Action Icon */}
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
                  ))
                ) : (
                  <Table.Row>
                    <Table.Cell colSpan={4} textAlign="center" py={10}>
                      <VStack gap={3}>
                        <Book size={48} color="#CBD5E0" />
                        <Text
                          fontSize="lg"
                          color="gray.500"
                          fontWeight="medium"
                        >
                          {searchQuery
                            ? "No problems match your search"
                            : "No problems found"}
                        </Text>
                        <Text fontSize="sm" color="gray.400">
                          {searchQuery
                            ? "Try adjusting your search terms"
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
                  {/* Items per page */}
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

                  {/* Page info */}
                  <Text fontSize="sm" color="gray.600">
                    Showing {pagination.offset + 1}-
                    {Math.min(
                      pagination.offset + pagination.limit,
                      pagination.totalElements
                    )}{" "}
                    of {pagination.totalElements}
                  </Text>

                  {/* Pagination controls */}
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
