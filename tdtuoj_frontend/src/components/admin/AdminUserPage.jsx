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
  IconButton,
  Avatar,
} from "@chakra-ui/react";
import { Table } from "@chakra-ui/react";
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Edit,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useConfirmDialog } from "../common/ConfirmDialog";
import { useToast } from "../common/ToastMessage";

const AdminUserPage = () => {
  const { ConfirmDialog } = useConfirmDialog();
  const { showMessage } = useToast();
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
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

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getAllUsers({
        limit: pagination.limit,
        offset: pagination.offset,
        sortField,
        direction,
        username: searchQuery,
      });

      if (response.statusCode === 200) {
        setUsers(response.data.content);
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
    const init = async () => {
      try {
        const meResponse = await ApiService.getOwnProfile();
        if (meResponse.statusCode === 200) {
          setCurrentUser(meResponse.data);
        }
      } catch (error) {
        // non-critical, silently ignore
      }
    };
    init();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [pagination.limit, pagination.offset, sortField, direction]);

  // Debounced search
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      setPagination((prev) => ({ ...prev, offset: 0 }));
      fetchUsers();
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const handleAddUser = () => {
    navigate("/admin/users/register");
  };

  const handleEditUser = (userId) => {
    navigate(`/admin/users/edit/${userId}`);
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
        pagination.offset + pagination.limit,
      ),
    );

  const canGoPrevious = pagination.currentPage > 0;
  const canGoNext = pagination.currentPage < pagination.totalPages - 1;

  const getRoleBadgeColor = (roleName) => {
    switch (roleName) {
      case "ADMIN":
        return "red";
      case "CREATOR":
        return "orange";
      case "PARTICIPANT":
        return "blue";
      default:
        return "gray";
    }
  };

  if (loading && users.length === 0) {
    return (
      <Box minH="100vh" bg="gray.50" py={8}>
        <Container maxW="container.xl">
          <VStack gap={4} py={20}>
            <Spinner size="xl" color="purple.500" thickness="4px" />
            <Text color="gray.600">Loading users...</Text>
          </VStack>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50" py={8}>
      <Container maxW="container.xl">
        <VStack align="stretch" gap={6}>
          {/* Header with Add Button */}
          <HStack justify="space-between" align="center">
            <HStack gap={3}>
              <Heading size="2xl" color="gray.800">
                Manage Users
              </Heading>
              <Badge
                colorScheme="purple"
                fontSize="md"
                px={3}
                py={1}
                borderRadius="full"
              >
                {pagination.totalElements}{" "}
                {pagination.totalElements === 1 ? "user" : "users"}
              </Badge>
            </HStack>
            <Button
              onClick={handleAddUser}
              colorScheme="purple"
              size="lg"
              leftIcon={<Plus size={20} />}
            >
              Add User
            </Button>
          </HStack>

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
                  placeholder="Search by username..."
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
                  <option value="username">Username</option>
                  <option value="email">Email</option>
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
                  <Table.ColumnHeader w="35%">
                    <Text fontWeight="bold" color="purple.700">
                      User
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="25%">
                    <Text fontWeight="bold" color="purple.700">
                      Email
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="17%">
                    <Text fontWeight="bold" color="purple.700">
                      Roles
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="center" w="10%">
                    <Text fontWeight="bold" color="purple.700">
                      Status
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="center" w="10%">
                    <Text fontWeight="bold" color="purple.700">
                      Actions
                    </Text>
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {users.length > 0 ? (
                  users.map((user, index) => {
                    const isSelf = currentUser?.id === user.id;
                    return (
                      <Table.Row
                        key={user.id}
                        _hover={{ bg: "purple.50" }}
                        transition="all 0.2s"
                        bg={index % 2 === 0 ? "white" : "gray.50"}
                      >
                        {/* User ID */}
                        <Table.Cell textAlign="center">
                          <Badge
                            colorScheme="purple"
                            fontSize="md"
                            px={3}
                            py={1}
                            borderRadius="md"
                            fontWeight="bold"
                          >
                            #{user.id}
                          </Badge>
                        </Table.Cell>

                        {/* User Info with Avatar */}
                        <Table.Cell>
                          <HStack gap={3}>
                            <Avatar.Root
                              size="md"
                              bg="purple.400"
                              color="white"
                            >
                              {user.profileUrl && (
                                <Avatar.Image src={user.profileUrl} />
                              )}
                              <Avatar.Fallback>
                                {(user.name || user.username)
                                  .charAt(0)
                                  .toUpperCase()}
                              </Avatar.Fallback>
                            </Avatar.Root>
                            <VStack align="start" gap={0}>
                              <HStack gap={2}>
                                <Text
                                  fontSize="md"
                                  fontWeight="semibold"
                                  color="gray.800"
                                >
                                  {user.username}
                                </Text>
                                {isSelf && (
                                  <Badge
                                    colorScheme="orange"
                                    fontSize="xs"
                                    px={2}
                                    py={0.5}
                                    borderRadius="md"
                                  >
                                    It&apos;s you
                                  </Badge>
                                )}
                              </HStack>
                              {user.name && (
                                <Text fontSize="sm" color="gray.500">
                                  {user.name}
                                </Text>
                              )}
                            </VStack>
                          </HStack>
                        </Table.Cell>

                        {/* Email */}
                        <Table.Cell>
                          <Text fontSize="sm" color="gray.600">
                            {user.email}
                          </Text>
                        </Table.Cell>

                        {/* Roles */}
                        <Table.Cell>
                          <HStack gap={1} flexWrap="wrap">
                            {user.roles?.map((role) => (
                              <Badge
                                key={role.id}
                                colorScheme={getRoleBadgeColor(role.name)}
                                fontSize="xs"
                                px={2}
                                py={1}
                                borderRadius="md"
                              >
                                {role.name}
                              </Badge>
                            ))}
                          </HStack>
                        </Table.Cell>

                        {/* Active Status */}
                        <Table.Cell textAlign="center">
                          <Badge
                            colorScheme={user.isActive ? "green" : "red"}
                            fontSize="sm"
                            px={3}
                            py={1}
                            borderRadius="md"
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </Table.Cell>

                        {/* Action Buttons */}
                        <Table.Cell textAlign="center">
                          {isSelf ? (
                            <Badge
                              colorScheme="gray"
                              fontSize="xs"
                              px={3}
                              py={1.5}
                              borderRadius="md"
                              color="gray.500"
                            >
                              It&apos;s you
                            </Badge>
                          ) : (
                            <IconButton
                              size="sm"
                              colorScheme="blue"
                              variant="ghost"
                              onClick={() => handleEditUser(user.id)}
                              title="Edit User"
                            >
                              <Edit size={18} />
                            </IconButton>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    );
                  })
                ) : (
                  <Table.Row>
                    <Table.Cell colSpan={6} textAlign="center" py={10}>
                      <VStack gap={3}>
                        <Users size={48} color="#CBD5E0" />
                        <Text
                          fontSize="lg"
                          color="gray.500"
                          fontWeight="medium"
                        >
                          {searchQuery
                            ? "No users match your search"
                            : "No users found"}
                        </Text>
                        <Text fontSize="sm" color="gray.400">
                          {searchQuery
                            ? "Try adjusting your search terms"
                            : "Click 'Add User' to create your first user!"}
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
                      pagination.totalElements,
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

export default AdminUserPage;
