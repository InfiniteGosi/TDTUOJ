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
  Building2,
  Plus,
  Eye,
  Trash2,
  Pencil,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Users,
  Globe,
  Lock,
  X,
  Copy,
  Check,
  Calendar,
  Save,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useConfirmDialog } from "../common/ConfirmDialog";
import { useToast } from "../common/ToastMessage";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (dt) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ─── Create Modal ─────────────────────────────────────────────────────────────

const CreateModal = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [code, setCode] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const data = { name: name.trim(), about: about.trim(), isPublic };
    if (code.trim()) data.code = code.trim();
    await onCreate(data);
    setLoading(false);
    setName("");
    setAbout("");
    setCode("");
    setIsPublic(true);
  };

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={1000}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Box
        position="absolute"
        inset={0}
        bg="blackAlpha.500"
        onClick={onClose}
      />

      <Box
        position="relative"
        bg="white"
        borderRadius="xl"
        boxShadow="2xl"
        p={6}
        w="480px"
        maxW="90vw"
      >
        <HStack justify="space-between" mb={4}>
          <HStack gap={2}>
            <Building2 size={20} color="#7c3aed" />
            <Heading size="md" color="gray.800">
              Create Organization
            </Heading>
          </HStack>
          <Box
            as="button"
            p={1}
            borderRadius="md"
            _hover={{ bg: "gray.100" }}
            onClick={onClose}
          >
            <X size={18} color="#9ca3af" />
          </Box>
        </HStack>

        <VStack gap={3} align="stretch">
          <Box>
            <Text fontSize="sm" fontWeight="600" color="gray.700" mb={1}>
              Name *
            </Text>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Organization name"
            />
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="600" color="gray.700" mb={1}>
              About
            </Text>
            <Input
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Short description (optional)"
            />
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="600" color="gray.700" mb={1}>
              Join Code
            </Text>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Auto-generated if empty"
              maxLength={10}
              fontFamily="mono"
              letterSpacing="0.1em"
            />
            <Text fontSize="xs" color="gray.400" mt={1}>
              Leave blank to auto-generate a 6-character code
            </Text>
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="600" color="gray.700" mb={1}>
              Visibility
            </Text>
            <HStack gap={2}>
              <Box
                as="button"
                flex={1}
                py={2}
                borderRadius="lg"
                border="2px solid"
                borderColor={isPublic ? "purple.500" : "gray.200"}
                bg={isPublic ? "purple.50" : "white"}
                color={isPublic ? "purple.700" : "gray.500"}
                fontSize="sm"
                fontWeight="600"
                onClick={() => setIsPublic(true)}
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap={1}
              >
                <Globe size={14} /> Public
              </Box>
              <Box
                as="button"
                flex={1}
                py={2}
                borderRadius="lg"
                border="2px solid"
                borderColor={!isPublic ? "purple.500" : "gray.200"}
                bg={!isPublic ? "purple.50" : "white"}
                color={!isPublic ? "purple.700" : "gray.500"}
                fontSize="sm"
                fontWeight="600"
                onClick={() => setIsPublic(false)}
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap={1}
              >
                <Lock size={14} /> Private
              </Box>
            </HStack>
          </Box>
        </VStack>

        <HStack gap={2} mt={5}>
          <Button
            flex={1}
            variant="outline"
            colorScheme="gray"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            flex={1}
            colorScheme="purple"
            onClick={handleCreate}
            disabled={!name.trim() || loading}
          >
            {loading ? <Spinner size="sm" /> : "Create"}
          </Button>
        </HStack>
      </Box>
    </Box>
  );
};

// ─── Edit Modal ───────────────────────────────────────────────────────────────

const EditModal = ({ isOpen, onClose, org, onSave }) => {
  const [name, setName] = useState(org?.name || "");
  const [about, setAbout] = useState(org?.about || "");
  const [code, setCode] = useState(org?.code || "");
  const [isPublic, setIsPublic] = useState(org?.isPublic ?? true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (org) {
      setName(org.name || "");
      setAbout(org.about || "");
      setCode(org.code || "");
      setIsPublic(org.isPublic ?? true);
    }
  }, [org]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const data = { name: name.trim(), about: about.trim(), isPublic };
    if (code.trim()) data.code = code.trim();
    await onSave(data);
    setLoading(false);
  };

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={1000}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Box
        position="absolute"
        inset={0}
        bg="blackAlpha.500"
        onClick={onClose}
      />
      <Box
        position="relative"
        bg="white"
        borderRadius="xl"
        boxShadow="2xl"
        p={6}
        w="480px"
        maxW="90vw"
      >
        <HStack justify="space-between" mb={4}>
          <HStack gap={2}>
            <Pencil size={20} color="#7c3aed" />
            <Heading size="md" color="gray.800">
              Edit Organization
            </Heading>
          </HStack>
          <Box
            as="button"
            p={1}
            borderRadius="md"
            _hover={{ bg: "gray.100" }}
            onClick={onClose}
          >
            <X size={18} color="#9ca3af" />
          </Box>
        </HStack>

        <VStack gap={3} align="stretch">
          <Box>
            <Text fontSize="sm" fontWeight="600" color="gray.700" mb={1}>
              Name *
            </Text>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Organization name"
            />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="600" color="gray.700" mb={1}>
              About
            </Text>
            <Input
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Short description"
            />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="600" color="gray.700" mb={1}>
              Join Code
            </Text>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Current code"
              maxLength={10}
              fontFamily="mono"
              letterSpacing="0.1em"
            />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="600" color="gray.700" mb={1}>
              Visibility
            </Text>
            <HStack gap={2}>
              <Box
                as="button"
                flex={1}
                py={2}
                borderRadius="lg"
                border="2px solid"
                borderColor={isPublic ? "purple.500" : "gray.200"}
                bg={isPublic ? "purple.50" : "white"}
                color={isPublic ? "purple.700" : "gray.500"}
                fontSize="sm"
                fontWeight="600"
                onClick={() => setIsPublic(true)}
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap={1}
              >
                <Globe size={14} /> Public
              </Box>
              <Box
                as="button"
                flex={1}
                py={2}
                borderRadius="lg"
                border="2px solid"
                borderColor={!isPublic ? "purple.500" : "gray.200"}
                bg={!isPublic ? "purple.50" : "white"}
                color={!isPublic ? "purple.700" : "gray.500"}
                fontSize="sm"
                fontWeight="600"
                onClick={() => setIsPublic(false)}
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap={1}
              >
                <Lock size={14} /> Private
              </Box>
            </HStack>
          </Box>
        </VStack>

        <HStack gap={2} mt={5}>
          <Button
            flex={1}
            variant="outline"
            colorScheme="gray"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            flex={1}
            colorScheme="purple"
            onClick={handleSave}
            disabled={!name.trim() || loading}
            gap={1}
          >
            {loading ? <Spinner size="sm" /> : <><Save size={14} /> Save</>}
          </Button>
        </HStack>
      </Box>
    </Box>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const AdminOrganizationPage = () => {
  const { ConfirmDialog, showConfirm } = useConfirmDialog();
  const { showMessage } = useToast();
  const navigate = useNavigate();

  const [organizations, setOrganizations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const SIZE = 10;

  const isAdmin = ApiService.isAdmin();

  const fetchOrgs = async (p = page) => {
    try {
      setLoading(true);
      const resp = await ApiService.getOrganizations({
        page: p,
        size: SIZE,
        search,
      });
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
    fetchOrgs(page);
  }, [page]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      fetchOrgs(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = (id, name) =>
    showConfirm(
      "Delete Organization",
      `Are you sure you want to delete "${name}"? This cannot be undone.`,
      async () => {
        try {
          const resp = await ApiService.deleteOrganization(id);
          if (resp.statusCode === 200) {
            showMessage("Organization deleted successfully", "success");
            fetchOrgs(page);
          }
        } catch (err) {
          showMessage(err.response?.data?.message || err.message, "error");
        }
      },
    );

  const handleCreate = async (data) => {
    try {
      const resp = await ApiService.createOrganization(data);
      if (resp.statusCode === 201) {
        showMessage("Organization created!", "success");
        setCreateOpen(false);
        fetchOrgs(page);
      }
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    }
  };

  const handleCopyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEdit = async (data) => {
    try {
      const resp = await ApiService.updateOrganization(editingOrg.id, data);
      if (resp.statusCode === 200) {
        showMessage("Organization updated!", "success");
        setEditingOrg(null);
        fetchOrgs(page);
      }
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    }
  };

  const filtered = organizations.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading && organizations.length === 0) {
    return (
      <Box minH="100vh" bg="gray.50" py={8}>
        <Container maxW="container.xl">
          <VStack gap={4} py={20}>
            <Spinner size="xl" color="purple.500" thickness="4px" />
            <Text color="gray.600">Loading organizations...</Text>
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
                <Building2 size={28} color="#7c3aed" />
                <Heading size="2xl" color="gray.800">
                  Manage Organizations
                </Heading>
              </HStack>
              <Badge
                colorScheme="purple"
                fontSize="md"
                px={3}
                py={1}
                borderRadius="full"
              >
                {totalElements}{" "}
                {totalElements === 1 ? "organization" : "organizations"}
              </Badge>
            </HStack>
            <Button
              onClick={() => setCreateOpen(true)}
              colorScheme="purple"
              size="md"
              gap={2}
            >
              <Plus size={18} />
              New Organization
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
                placeholder="Filter by organization name..."
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
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">
                      #
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="28%">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">
                      Organization
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="15%">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">
                      Code
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="10%">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">
                      Visibility
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="10%" textAlign="center">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">
                      Members
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="15%">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">
                      Created
                    </Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="10%" textAlign="center">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">
                      Actions
                    </Text>
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {filtered.length > 0 ? (
                  filtered.map((org, idx) => (
                    <Table.Row
                      key={org.id}
                      _hover={{ bg: "purple.50" }}
                      transition="background 0.15s"
                      bg={idx % 2 === 0 ? "white" : "gray.50"}
                    >
                      <Table.Cell>
                        <Text fontSize="sm" fontWeight="600" color="gray.500">
                          {org.id}
                        </Text>
                      </Table.Cell>

                      <Table.Cell>
                        <VStack align="start" gap={0}>
                          <Text
                            fontSize="sm"
                            fontWeight="700"
                            color="gray.800"
                          >
                            {org.name}
                          </Text>
                          <Text fontSize="xs" color="gray.400">
                            by {org.creatorUsername ?? "—"}
                          </Text>
                        </VStack>
                      </Table.Cell>

                      <Table.Cell>
                        {org.code ? (
                          <HStack gap={1}>
                            <Text
                              fontSize="sm"
                              fontWeight="700"
                              color="purple.600"
                              fontFamily="mono"
                              letterSpacing="0.05em"
                            >
                              {org.code}
                            </Text>
                            <Box
                              as="button"
                              p={0.5}
                              borderRadius="sm"
                              _hover={{ bg: "purple.50" }}
                              onClick={() => handleCopyCode(org.code, org.id)}
                            >
                              {copiedId === org.id ? (
                                <Check size={12} color="#16a34a" />
                              ) : (
                                <Copy size={12} color="#9ca3af" />
                              )}
                            </Box>
                          </HStack>
                        ) : (
                          <Text fontSize="xs" color="gray.400">
                            —
                          </Text>
                        )}
                      </Table.Cell>

                      <Table.Cell>
                        <HStack gap={1}>
                          {org.isPublic ? (
                            <>
                              <Globe size={12} color="#9ca3af" />
                              <Text fontSize="xs" color="gray.500">
                                Public
                              </Text>
                            </>
                          ) : (
                            <>
                              <Lock size={12} color="#9ca3af" />
                              <Text fontSize="xs" color="gray.500">
                                Private
                              </Text>
                            </>
                          )}
                        </HStack>
                      </Table.Cell>

                      <Table.Cell textAlign="center">
                        <HStack justify="center" gap={1}>
                          <Users size={12} color="#9ca3af" />
                          <Text fontSize="sm" color="gray.700">
                            {org.totalMembers ?? 0}
                          </Text>
                        </HStack>
                      </Table.Cell>

                      <Table.Cell>
                        <HStack gap={1}>
                          <Calendar size={12} color="#9ca3af" />
                          <Text fontSize="xs" color="gray.600">
                            {fmt(org.createdAt)}
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
                              navigate(`/organizations/${org.slug}`)
                            }
                          >
                            <Eye size={16} />
                          </Box>
                          <Box
                            as="button"
                            p={1}
                            borderRadius="md"
                            color="purple.500"
                            _hover={{ bg: "purple.50" }}
                            title="Edit"
                            onClick={() => setEditingOrg(org)}
                          >
                            <Pencil size={16} />
                          </Box>
                          {isAdmin && (
                            <Box
                              as="button"
                              p={1}
                              borderRadius="md"
                              color="red.400"
                              _hover={{ bg: "red.50" }}
                              title="Delete"
                              onClick={() => handleDelete(org.id, org.name)}
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
                        <Building2 size={32} color="#D1D5DB" />
                        <Text color="gray.400" fontSize="sm">
                          No organizations found
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
                    _hover={
                      page > 0
                        ? { bg: "purple.50", color: "purple.600" }
                        : {}
                    }
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
                    _hover={
                      page > 0
                        ? { bg: "purple.50", color: "purple.600" }
                        : {}
                    }
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
                    _hover={
                      page < totalPages - 1
                        ? { bg: "purple.50", color: "purple.600" }
                        : {}
                    }
                    onClick={() =>
                      page < totalPages - 1 && setPage((p) => p + 1)
                    }
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight size={18} />
                  </Box>
                  <Box
                    as="button"
                    p={1}
                    borderRadius="md"
                    color={page >= totalPages - 1 ? "gray.300" : "gray.600"}
                    _hover={
                      page < totalPages - 1
                        ? { bg: "purple.50", color: "purple.600" }
                        : {}
                    }
                    onClick={() =>
                      page < totalPages - 1 && setPage(totalPages - 1)
                    }
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

      <CreateModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
      <EditModal
        isOpen={!!editingOrg}
        onClose={() => setEditingOrg(null)}
        org={editingOrg}
        onSave={handleEdit}
      />
    </Box>
  );
};

export default AdminOrganizationPage;
