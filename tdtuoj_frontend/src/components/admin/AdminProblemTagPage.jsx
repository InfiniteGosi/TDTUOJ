import { useState, useEffect } from "react";
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
  IconButton,
  Tag,
  Switch,
} from "@chakra-ui/react";
import { Table } from "@chakra-ui/react";
import {
  Tag as TagIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useConfirmDialog } from "../common/ConfirmDialog";
import { useMessage } from "../common/MessageDisplay";

const AdminProblemTagPage = () => {
  const { ConfirmDialog, showConfirm } = useConfirmDialog();
  const { MessageDisplay, showMessage } = useMessage();
  const [tags, setTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [togglingIds, setTogglingIds] = useState(new Set());
  const [pagination, setPagination] = useState({
    limit: 10,
    offset: 0,
    totalElements: 0,
    totalPages: 0,
    currentPage: 0,
  });
  const [sortField, setSortField] = useState("id");
  const [direction, setDirection] = useState("asc");

  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getAllTags({
        limit: pagination.limit,
        offset: pagination.offset,
        sortField,
        direction,
        name: searchQuery,
      });

      if (response.statusCode === 200) {
        setTags(response.data.content);
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
    fetchTags();
  }, [pagination.limit, pagination.offset, sortField, direction]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      setPagination((prev) => ({ ...prev, offset: 0 }));
      fetchTags();
    }, 500);
    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const handleToggleActive = async (id) => {
    setTogglingIds((prev) => new Set(prev).add(id));
    try {
      const response = await ApiService.toggleTagActive(id);
      if (response.statusCode === 200) {
        setTags((prev) =>
          prev.map((tag) =>
            tag.id === id ? { ...tag, isActive: response.data.isActive } : tag,
          ),
        );
        showMessage("Tag status updated successfully", "success");
      }
    } catch (error) {
      showMessage(error.response?.data?.message || error.message, "error");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeleteTag = (id) => {
    showConfirm(
      "Delete Tag",
      "Are you sure you want to delete this tag? This action cannot be undone.",
      async () => {
        try {
          const response = await ApiService.deleteTag(id);
          if (response.statusCode === 200) {
            showMessage("Tag deleted successfully", "success");
            fetchTags();
          }
        } catch (error) {
          showMessage(error.response?.data?.message || error.message, "error");
        }
      },
    );
  };

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

  if (loading && tags.length === 0) {
    return (
      <Box minH="100vh" bg="gray.50" py={8}>
        <Container maxW="container.xl">
          <VStack gap={4} py={20}>
            <Spinner size="xl" color="purple.500" thickness="4px" />
            <Text color="gray.600">Loading tags...</Text>
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
            <HStack gap={3}>
              <Heading size="2xl" color="gray.800">
                Manage Tags
              </Heading>
              <Badge
                colorPalette="purple"
                fontSize="md"
                px={3}
                py={1}
                borderRadius="full"
              >
                {pagination.totalElements}{" "}
                {pagination.totalElements === 1 ? "tag" : "tags"}
              </Badge>
            </HStack>
            <Button colorPalette="purple" size="lg">
              <Plus size={20} />
              Add Tag
            </Button>
          </HStack>

          <MessageDisplay />
          <ConfirmDialog />

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
                  placeholder="Search by tag name..."
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
                  <option value="name">Name</option>
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
                  <Table.ColumnHeader textAlign="center" w="10%">
                    <Text fontWeight="bold" color="purple.700">
                      ID
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="50%">
                    <Text fontWeight="bold" color="purple.700">
                      Tag Name
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="center" w="20%">
                    <Text fontWeight="bold" color="purple.700">
                      Status
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="center" w="20%">
                    <Text fontWeight="bold" color="purple.700">
                      Actions
                    </Text>
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {tags.length > 0 ? (
                  tags.map((tag, index) => (
                    <Table.Row
                      key={tag.id}
                      _hover={{ bg: "purple.50" }}
                      transition="all 0.2s"
                      bg={index % 2 === 0 ? "white" : "gray.50"}
                    >
                      <Table.Cell textAlign="center">
                        <Badge
                          colorPalette="purple"
                          fontSize="md"
                          px={3}
                          py={1}
                          borderRadius="md"
                          fontWeight="bold"
                        >
                          #{tag.id}
                        </Badge>
                      </Table.Cell>

                      <Table.Cell>
                        <HStack gap={2}>
                          <TagIcon size={16} color="#805AD5" />
                          <Text
                            fontSize="lg"
                            fontWeight="semibold"
                            color="gray.800"
                          >
                            {tag.name}
                          </Text>
                        </HStack>
                      </Table.Cell>

                      <Table.Cell textAlign="center">
                        <HStack justify="center" gap={2}>
                          <Switch.Root
                            checked={tag.isActive}
                            onCheckedChange={() => handleToggleActive(tag.id)}
                            disabled={togglingIds.has(tag.id)}
                            colorPalette="green"
                          >
                            <Switch.HiddenInput />
                            <Switch.Control>
                              <Switch.Thumb />
                            </Switch.Control>
                          </Switch.Root>
                          {togglingIds.has(tag.id) ? (
                            <Spinner size="xs" color="purple.500" />
                          ) : (
                            <Tag.Root
                              colorPalette={tag.isActive ? "green" : "red"}
                              variant="subtle"
                            >
                              <Tag.Label>
                                {tag.isActive ? "Active" : "Inactive"}
                              </Tag.Label>
                            </Tag.Root>
                          )}
                        </HStack>
                      </Table.Cell>

                      <Table.Cell textAlign="center">
                        <HStack justify="center" gap={2}>
                          <IconButton
                            size="sm"
                            colorPalette="green"
                            variant="ghost"
                            title="Edit Tag"
                          >
                            <Edit size={18} />
                          </IconButton>
                          <IconButton
                            size="sm"
                            colorPalette="red"
                            variant="ghost"
                            onClick={() => handleDeleteTag(tag.id)}
                            title="Delete Tag"
                          >
                            <Trash2 size={18} />
                          </IconButton>
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  ))
                ) : (
                  <Table.Row>
                    <Table.Cell colSpan={4} textAlign="center" py={10}>
                      <VStack gap={3}>
                        <TagIcon size={48} color="#CBD5E0" />
                        <Text
                          fontSize="lg"
                          color="gray.500"
                          fontWeight="medium"
                        >
                          {searchQuery
                            ? "No tags match your search"
                            : "No tags found"}
                        </Text>
                        <Text fontSize="sm" color="gray.400">
                          {searchQuery
                            ? "Try adjusting your search terms"
                            : "Click 'Add Tag' to create your first tag!"}
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
                    Showing {pagination.offset + 1}-
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

export default AdminProblemTagPage;
