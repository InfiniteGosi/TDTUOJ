import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Users,
  Globe,
  Lock,
  Calendar,
  Copy,
  Check,
  Shield,
  ShieldCheck,
  Crown,
  LogOut,
  UserMinus,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Settings,
  X,
  Save,
  KeyRound,
  LogIn,
  UserPlus,
  Search,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import { useConfirmDialog } from "../common/ConfirmDialog";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (dt) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const ROLE_STYLE = {
  OWNER: {
    label: "Owner",
    color: "#d97706",
    bg: "#fffbeb",
    icon: Crown,
  },
  ADMIN: {
    label: "Admin",
    color: "#3b82f6",
    bg: "#eff6ff",
    icon: ShieldCheck,
  },
  MEMBER: {
    label: "Member",
    color: "#16a34a",
    bg: "#f0fdf4",
    icon: Shield,
  },
};

const RoleBadge = ({ role }) => {
  const s = ROLE_STYLE[role] || ROLE_STYLE.MEMBER;
  const Icon = s.icon;
  return (
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
      border="1px solid"
      borderColor={s.color + "33"}
    >
      <Icon size={12} />
      {s.label}
    </Box>
  );
};

// ─── Join Code Modal ──────────────────────────────────────────────────────────

const JoinCodeModal = ({ isOpen, onClose, onJoin, orgName }) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    await onJoin(code.trim());
    setLoading(false);
    setCode("");
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
        w="400px"
        maxW="90vw"
      >
        <HStack justify="space-between" mb={4}>
          <HStack gap={2}>
            <KeyRound size={20} color="#7c3aed" />
            <Heading size="md" color="gray.800">
              Enter Code
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

        <Text fontSize="sm" color="gray.500" mb={4}>
          <Text as="span" fontWeight="600" color="gray.700">
            {orgName}
          </Text>{" "}
          is a private organization. Enter the invite code to join.
        </Text>

        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. ABC123"
          size="lg"
          textAlign="center"
          fontWeight="700"
          letterSpacing="0.15em"
          fontSize="xl"
          mb={4}
          maxLength={10}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        />

        <HStack gap={2}>
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
            onClick={handleJoin}
            disabled={!code.trim() || loading}
          >
            {loading ? <Spinner size="sm" /> : "Join"}
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
            <Settings size={20} color="#7c3aed" />
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
// ─── Add Member Modal ─────────────────────────────────────────────────────────

const AddMemberModal = ({ isOpen, onClose, orgId, onAdd }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      return;
    }
    if (query.trim().length < 1) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const resp = await ApiService.searchNonMembers(orgId, query.trim());
        if (resp.statusCode === 200) {
          const data = resp.data;
          setResults(data.content ?? data);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, isOpen, orgId]);

  if (!isOpen) return null;

  const handleAdd = async (userId) => {
    setAddingId(userId);
    await onAdd(userId);
    setResults((prev) => prev.filter((u) => u.userId !== userId));
    setAddingId(null);
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
        maxH="80vh"
        display="flex"
        flexDirection="column"
      >
        <HStack justify="space-between" mb={4}>
          <HStack gap={2}>
            <UserPlus size={20} color="#7c3aed" />
            <Heading size="md" color="gray.800">
              Add Member
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

        <Box position="relative" mb={3}>
          <Box
            position="absolute"
            left={2}
            top="50%"
            transform="translateY(-50%)"
          >
            <Search size={16} color="#9CA3AF" />
          </Box>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username..."
            pl={8}
            size="md"
          />
        </Box>

        <Box flex={1} overflow="auto" minH="200px">
          {loading ? (
            <VStack py={6}>
              <Spinner size="md" color="purple.500" />
            </VStack>
          ) : results.length > 0 ? (
            <VStack align="stretch" gap={1}>
              {results.map((user) => (
                <HStack
                  key={user.userId}
                  px={3}
                  py={2}
                  borderRadius="lg"
                  _hover={{ bg: "purple.50" }}
                  justify="space-between"
                >
                  <HStack gap={2}>
                    <Box
                      w="32px"
                      h="32px"
                      borderRadius="full"
                      bg="purple.100"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      fontSize="sm"
                      fontWeight="700"
                      color="purple.700"
                      overflow="hidden"
                      flexShrink={0}
                    >
                      {user.profileUrl ? (
                        <img
                          src={user.profileUrl}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        (user.username || "U").charAt(0).toUpperCase()
                      )}
                    </Box>
                    <VStack align="start" gap={0}>
                      <Text fontSize="sm" fontWeight="600" color="gray.800">
                        {user.name || user.username}
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        @{user.username}
                      </Text>
                    </VStack>
                  </HStack>
                  <Button
                    size="xs"
                    colorScheme="purple"
                    onClick={() => handleAdd(user.userId)}
                    disabled={addingId === user.userId}
                  >
                    {addingId === user.userId ? (
                      <Spinner size="xs" />
                    ) : (
                      "Add"
                    )}
                  </Button>
                </HStack>
              ))}
            </VStack>
          ) : query.trim().length > 0 ? (
            <VStack py={6}>
              <Text fontSize="sm" color="gray.400">
                No users found
              </Text>
            </VStack>
          ) : (
            <VStack py={6}>
              <Text fontSize="sm" color="gray.400">
                Type a username to search
              </Text>
            </VStack>
          )}
        </Box>
      </Box>
    </Box>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const OrganizationDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { showMessage } = useToast();
  const { ConfirmDialog, showConfirm } = useConfirmDialog();

  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [memberPage, setMemberPage] = useState(0);
  const [memberTotalPages, setMemberTotalPages] = useState(0);
  const [codeCopied, setCodeCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [joinCodeOpen, setJoinCodeOpen] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("MEMBERS");
  const [memberSearch, setMemberSearch] = useState("");
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const isAuthenticated = ApiService.isAuthenticated();

  const fetchOrg = async () => {
    try {
      setLoading(true);
      const resp = await ApiService.getOrganizationBySlug(slug);
      if (resp.statusCode === 200) {
        setOrg(resp.data);
      }
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
      navigate("/organizations");
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (p = memberPage) => {
    if (!org) return;
    try {
      setMembersLoading(true);
      const resp = await ApiService.getOrganizationMembers(org.id, {
        page: p,
        size: 20,
        search: memberSearch,
      });
      if (resp.statusCode === 200) {
        const data = resp.data;
        setMembers(data.content ?? data);
        const pageInfo = data.page ?? {};
        setMemberTotalPages(pageInfo.totalPages ?? 1);
      }
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    fetchOrg();
  }, [slug]);

  useEffect(() => {
    if (org) fetchMembers(memberPage);
  }, [org, memberPage]);

  // Debounced member search
  useEffect(() => {
    if (org) {
      const timer = setTimeout(() => {
        setMemberPage(0);
        fetchMembers(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [memberSearch]);

  const handleCopyCode = () => {
    if (org?.code) {
      navigator.clipboard.writeText(org.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  // ─── Join handler ───────────────────────────────────────────────────────
  const handleJoinClick = async () => {
    if (!isAuthenticated) {
      showMessage("Please log in to join an organization", "error");
      return;
    }

    if (org.isPublic) {
      // Public org — join directly, no code needed
      setJoinLoading(true);
      try {
        const resp = await ApiService.joinOrganization(org.id);
        if (resp.statusCode === 200) {
          showMessage("Joined organization successfully!", "success");
          fetchOrg();
        }
      } catch (err) {
        showMessage(err.response?.data?.message || err.message, "error");
      } finally {
        setJoinLoading(false);
      }
    } else {
      // Private org — show code prompt
      setJoinCodeOpen(true);
    }
  };

  const handleJoinWithCode = async (code) => {
    try {
      const resp = await ApiService.joinOrganization(org.id, code);
      if (resp.statusCode === 200) {
        showMessage("Joined organization successfully!", "success");
        setJoinCodeOpen(false);
        fetchOrg();
      }
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    }
  };

  const handleLeave = () =>
    showConfirm(
      "Leave Organization",
      `Are you sure you want to leave "${org.name}"?`,
      async () => {
        try {
          const resp = await ApiService.leaveOrganization(org.id);
          if (resp.statusCode === 200) {
            showMessage("Left organization", "success");
            fetchOrg();
          }
        } catch (err) {
          showMessage(err.response?.data?.message || err.message, "error");
        }
      },
    );

  const handleUpdateOrg = async (data) => {
    try {
      const resp = await ApiService.updateOrganization(org.id, data);
      if (resp.statusCode === 200) {
        showMessage("Organization updated!", "success");
        setEditOpen(false);
        fetchOrg();
      }
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    }
  };

  const handleAddMember = async (userId) => {
    try {
      const resp = await ApiService.addMember(org.id, userId);
      if (resp.statusCode === 201) {
        showMessage("Member added!", "success");
        fetchMembers(memberPage);
        fetchOrg();
      }
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    }
  };

  const handleToggleRole = (member) => {
    const newRole = member.role === "ADMIN" ? "MEMBER" : "ADMIN";
    const action =
      newRole === "ADMIN" ? "promote to Admin" : "demote to Member";
    showConfirm(
      "Change Role",
      `Are you sure you want to ${action} "${member.username}"?`,
      async () => {
        try {
          const resp = await ApiService.updateMemberRole(
            org.id,
            member.userId,
            newRole,
          );
          if (resp.statusCode === 200) {
            showMessage(`Role updated to ${newRole}`, "success");
            fetchMembers(memberPage);
          }
        } catch (err) {
          showMessage(err.response?.data?.message || err.message, "error");
        }
      },
    );
  };

  const handleRemoveMember = (member) =>
    showConfirm(
      "Remove Member",
      `Remove "${member.username}" from the organization?`,
      async () => {
        try {
          const resp = await ApiService.removeMember(org.id, member.userId);
          if (resp.statusCode === 200) {
            showMessage("Member removed", "success");
            fetchMembers(memberPage);
            fetchOrg();
          }
        } catch (err) {
          showMessage(err.response?.data?.message || err.message, "error");
        }
      },
    );

  const handleDeleteOrg = () =>
    showConfirm(
      "Delete Organization",
      `This will permanently delete "${org.name}" and remove all members. This cannot be undone.`,
      async () => {
        try {
          const resp = await ApiService.deleteOrganization(org.id);
          if (resp.statusCode === 200) {
            showMessage("Organization deleted", "success");
            navigate("/organizations");
          }
        } catch (err) {
          showMessage(err.response?.data?.message || err.message, "error");
        }
      },
    );

  if (loading) {
    return (
      <Box minH="100vh" bg="gray.50" py={8}>
        <Container maxW="container.xl">
          <VStack gap={4} py={20}>
            <Spinner size="xl" color="purple.500" thickness="4px" />
            <Text color="gray.600">Loading organization...</Text>
          </VStack>
        </Container>
      </Box>
    );
  }

  if (!org) return null;

  const isOwner = org.myRole === "OWNER";
  const isOrgAdmin = org.myRole === "ADMIN";
  const isMember = !!org.myRole;
  const canManage = isOwner || isOrgAdmin;

  const TABS = [isMember ? "MEMBERS" : "ADMINS"];
  // Future tabs: CONTESTS, LABS

  return (
    <Box minH="100vh" bg="gray.50" py={8}>
      <Container maxW="container.xl">
        <VStack align="stretch" gap={6}>
          {/* Back */}
          <Box>
            <Button
              variant="ghost"
              size="sm"
              color="gray.500"
              onClick={() => navigate("/organizations")}
              gap={1}
            >
              <ArrowLeft size={16} /> Back to Organizations
            </Button>
          </Box>

          {/* Hero */}
          <Box
            style={{
              background:
                "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #6366f1 100%)",
            }}
            borderRadius="2xl"
            p={8}
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
            <VStack align="flex-start" gap={3} position="relative">
              <HStack gap={3} align="center">
                <Building2 size={32} />
                <Heading size="2xl" fontWeight="900">
                  {org.name}
                </Heading>
                {org.isPublic ? (
                  <Globe size={18} opacity={0.7} />
                ) : (
                  <Lock size={18} opacity={0.7} />
                )}
              </HStack>

              {org.about && (
                <Text fontSize="md" opacity={0.85} maxW="600px">
                  {org.about}
                </Text>
              )}

              <HStack gap={3} flexWrap="wrap">
                <Badge
                  bg="whiteAlpha.200"
                  color="white"
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontSize="sm"
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  <Users size={14} /> {org.totalMembers} members
                </Badge>
                <Badge
                  bg="whiteAlpha.200"
                  color="white"
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontSize="sm"
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  <Calendar size={14} /> Created {fmt(org.createdAt)}
                </Badge>
                {isMember ? (
                  <Badge
                    bg={
                      org.myRole === "OWNER"
                        ? "yellow.400"
                        : org.myRole === "ADMIN"
                          ? "blue.400"
                          : "green.400"
                    }
                    color="white"
                    px={3}
                    py={1}
                    borderRadius="full"
                    fontSize="sm"
                  >
                    You are{" "}
                    {org.myRole.charAt(0) + org.myRole.slice(1).toLowerCase()}
                  </Badge>
                ) : (
                  <Badge
                    bg="whiteAlpha.300"
                    color="white"
                    px={3}
                    py={1}
                    borderRadius="full"
                    fontSize="sm"
                  >
                    You are not a member
                  </Badge>
                )}
              </HStack>
            </VStack>
          </Box>

          {/* Action bar */}
          <HStack gap={3} flexWrap="wrap">
            {/* Join code (visible to OWNER/ADMIN) */}
            {org.code && (
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
                <Text fontSize="sm" color="gray.500" fontWeight="600">
                  Join Code:
                </Text>
                <Text
                  fontSize="lg"
                  fontWeight="800"
                  color="purple.600"
                  letterSpacing="0.1em"
                  fontFamily="mono"
                >
                  {org.code}
                </Text>
                <Box
                  as="button"
                  p={1}
                  borderRadius="md"
                  _hover={{ bg: "purple.50" }}
                  onClick={handleCopyCode}
                  title="Copy code"
                >
                  {codeCopied ? (
                    <Check size={16} color="#16a34a" />
                  ) : (
                    <Copy size={16} color="#7c3aed" />
                  )}
                </Box>
              </HStack>
            )}

            <Box flex={1} />

            {/* Join button for non-members */}
            {!isMember && isAuthenticated && (
              <Button
                colorScheme="purple"
                size="sm"
                gap={1}
                onClick={handleJoinClick}
                disabled={joinLoading}
              >
                {joinLoading ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    {org.isPublic ? (
                      <LogIn size={14} />
                    ) : (
                      <Lock size={14} />
                    )}
                    Join{org.isPublic ? "" : " 🔒"}
                  </>
                )}
              </Button>
            )}

            {/* Member actions */}
            {isMember && !isOwner && (
              <Button
                variant="outline"
                colorScheme="red"
                size="sm"
                gap={1}
                onClick={handleLeave}
              >
                <LogOut size={14} /> Leave
              </Button>
            )}
            {canManage && (
              <Button
                variant="outline"
                colorScheme="purple"
                size="sm"
                gap={1}
                onClick={() => setEditOpen(true)}
              >
                <Settings size={14} /> Edit
              </Button>
            )}
            {isOwner && (
              <Button
                variant="outline"
                colorScheme="red"
                size="sm"
                gap={1}
                onClick={handleDeleteOrg}
              >
                Delete
              </Button>
            )}
          </HStack>

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
                px={4}
                py={2}
                borderRadius="md"
                fontSize="sm"
                fontWeight="600"
                bg={activeTab === t ? "purple.600" : "transparent"}
                color={activeTab === t ? "white" : "gray.500"}
                transition="all 0.15s"
                _hover={
                  activeTab !== t
                    ? { bg: "purple.50", color: "purple.600" }
                    : {}
                }
                onClick={() => setActiveTab(t)}
                style={{ outline: "none" }}
              >
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </Box>
            ))}
          </HStack>

          {/* Members Table */}
          {(activeTab === "MEMBERS" || activeTab === "ADMINS") && (
            <>
              {/* Search + Add Member bar */}
              {isMember && (
                <HStack gap={3}>
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
                        <Search size={16} color="#9CA3AF" />
                      </Box>
                      <Input
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="Search members by username..."
                        pl={8}
                        border="none"
                        _focus={{ boxShadow: "none" }}
                        fontSize="sm"
                      />
                    </Box>
                  </Box>
                  {canManage && (
                    <Button
                      colorScheme="purple"
                      size="md"
                      gap={1}
                      onClick={() => setAddMemberOpen(true)}
                      flexShrink={0}
                    >
                      <UserPlus size={16} /> Add Member
                    </Button>
                  )}
                </HStack>
              )}

            <Box
              bg="white"
              borderRadius="xl"
              boxShadow="md"
              overflow="hidden"
              position="relative"
            >
              {membersLoading && (
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
                    <Table.ColumnHeader w="35%">
                      <Text fontWeight="bold" color="purple.700" fontSize="sm">
                        User
                      </Text>
                    </Table.ColumnHeader>
                    <Table.ColumnHeader w="15%">
                      <Text fontWeight="bold" color="purple.700" fontSize="sm">
                        Role
                      </Text>
                    </Table.ColumnHeader>
                    <Table.ColumnHeader w="20%">
                      <Text fontWeight="bold" color="purple.700" fontSize="sm">
                        Joined
                      </Text>
                    </Table.ColumnHeader>
                    {canManage && (
                      <Table.ColumnHeader w="15%" textAlign="center">
                        <Text
                          fontWeight="bold"
                          color="purple.700"
                          fontSize="sm"
                        >
                          Actions
                        </Text>
                      </Table.ColumnHeader>
                    )}
                  </Table.Row>
                </Table.Header>

                <Table.Body>
                  {members.length > 0 ? (
                    members.map((member, idx) => (
                      <Table.Row
                        key={member.id}
                        _hover={{ bg: "purple.50" }}
                        transition="background 0.15s"
                        bg={idx % 2 === 0 ? "white" : "gray.50"}
                      >
                        <Table.Cell>
                          <Text
                            fontSize="sm"
                            fontWeight="600"
                            color="gray.500"
                          >
                            {memberPage * 20 + idx + 1}
                          </Text>
                        </Table.Cell>

                        <Table.Cell>
                          <HStack gap={2}>
                            <Box
                              w="32px"
                              h="32px"
                              borderRadius="full"
                              bg="purple.100"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              fontSize="sm"
                              fontWeight="700"
                              color="purple.700"
                              overflow="hidden"
                              flexShrink={0}
                            >
                              {member.profileUrl ? (
                                <img
                                  src={member.profileUrl}
                                  alt=""
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                (member.username || "U")
                                  .charAt(0)
                                  .toUpperCase()
                              )}
                            </Box>
                            <VStack align="start" gap={0}>
                              <Text
                                fontSize="sm"
                                fontWeight="700"
                                color="gray.800"
                                cursor="pointer"
                                _hover={{ color: "purple.600" }}
                                onClick={() =>
                                  navigate(`/users/${member.username}`)
                                }
                              >
                                {member.name || member.username}
                              </Text>
                              <Text fontSize="xs" color="gray.400">
                                @{member.username}
                              </Text>
                            </VStack>
                          </HStack>
                        </Table.Cell>

                        <Table.Cell>
                          <RoleBadge role={member.role} />
                        </Table.Cell>

                        <Table.Cell>
                          <Text fontSize="xs" color="gray.600">
                            {fmt(member.joinedAt)}
                          </Text>
                        </Table.Cell>

                        {canManage && (
                          <Table.Cell>
                            <HStack justify="center" gap={1}>
                              {member.role !== "OWNER" && (
                                <>
                                  {isOwner && (
                                    <Box
                                      as="button"
                                      px={2}
                                      py={1}
                                      borderRadius="md"
                                      fontSize="xs"
                                      fontWeight="600"
                                      color={
                                        member.role === "ADMIN"
                                          ? "orange.600"
                                          : "blue.600"
                                      }
                                      _hover={{
                                        bg:
                                          member.role === "ADMIN"
                                            ? "orange.50"
                                            : "blue.50",
                                      }}
                                      onClick={() => handleToggleRole(member)}
                                      title={
                                        member.role === "ADMIN"
                                          ? "Demote to Member"
                                          : "Promote to Admin"
                                      }
                                    >
                                      {member.role === "ADMIN"
                                        ? "Demote"
                                        : "Promote"}
                                    </Box>
                                  )}
                                  <Box
                                    as="button"
                                    p={1}
                                    borderRadius="md"
                                    color="red.400"
                                    _hover={{ bg: "red.50" }}
                                    onClick={() => handleRemoveMember(member)}
                                    title="Remove member"
                                  >
                                    <UserMinus size={14} />
                                  </Box>
                                </>
                              )}
                            </HStack>
                          </Table.Cell>
                        )}
                      </Table.Row>
                    ))
                  ) : (
                    <Table.Row>
                      <Table.Cell
                        colSpan={canManage ? 5 : 4}
                        textAlign="center"
                        py={10}
                      >
                        <VStack gap={2}>
                          <Users size={32} color="#D1D5DB" />
                          <Text color="gray.400" fontSize="sm">
                            No members yet
                          </Text>
                        </VStack>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Root>

              {/* Pagination */}
              {memberTotalPages > 1 && (
                <HStack
                  justify="space-between"
                  px={5}
                  py={4}
                  borderTopWidth="1px"
                  borderColor="gray.100"
                >
                  <Text fontSize="sm" color="gray.500">
                    Page {memberPage + 1} of {memberTotalPages}
                  </Text>
                  <HStack gap={1}>
                    <Box
                      as="button"
                      p={1}
                      borderRadius="md"
                      color={memberPage === 0 ? "gray.300" : "gray.600"}
                      _hover={
                        memberPage > 0
                          ? { bg: "purple.50", color: "purple.600" }
                          : {}
                      }
                      onClick={() =>
                        memberPage > 0 && setMemberPage((p) => p - 1)
                      }
                      disabled={memberPage === 0}
                    >
                      <ChevronLeft size={18} />
                    </Box>
                    <Box
                      as="button"
                      p={1}
                      borderRadius="md"
                      color={
                        memberPage >= memberTotalPages - 1
                          ? "gray.300"
                          : "gray.600"
                      }
                      _hover={
                        memberPage < memberTotalPages - 1
                          ? { bg: "purple.50", color: "purple.600" }
                          : {}
                      }
                      onClick={() =>
                        memberPage < memberTotalPages - 1 &&
                        setMemberPage((p) => p + 1)
                      }
                      disabled={memberPage >= memberTotalPages - 1}
                    >
                      <ChevronRight size={18} />
                    </Box>
                  </HStack>
                </HStack>
              )}
            </Box>
          </>
          )}
        </VStack>
      </Container>

      <ConfirmDialog />
      <EditModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        org={org}
        onSave={handleUpdateOrg}
      />
      <JoinCodeModal
        isOpen={joinCodeOpen}
        onClose={() => setJoinCodeOpen(false)}
        onJoin={handleJoinWithCode}
        orgName={org.name}
      />
      <AddMemberModal
        isOpen={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        orgId={org.id}
        onAdd={handleAddMember}
      />
    </Box>
  );
};

export default OrganizationDetailPage;
