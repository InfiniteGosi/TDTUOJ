import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Spinner,
  Table,
} from "@chakra-ui/react";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertTriangle,
  Circle,
  BookOpen,
  BarChart3,
  Eye,
  EyeOff,
  Trash2,
  FileText,
  Pencil,
  Code,
  X,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import { useConfirmDialog } from "../common/ConfirmDialog";

// State for solution viewer
const LANG_LABELS = { CPP: "C++", JAVA: "Java", PYTHON: "Python", C: "C" };

/* ── Status badge ──────────────────────────────────────────────────────────── */

const StatusBadge = ({ status }) => {
  const MAP = {
    SOLVED: { icon: CheckCircle, color: "green.600", bg: "green.50", label: "Solved" },
    ATTEMPTED: { icon: AlertTriangle, color: "orange.500", bg: "orange.50", label: "Attempted" },
    NOT_STARTED: { icon: Circle, color: "gray.400", bg: "gray.50", label: "Not started" },
  };
  const s = MAP[status] || MAP.NOT_STARTED;
  const Icon = s.icon;
  return (
    <HStack gap={1} px={2} py={1} borderRadius="md" bg={s.bg}>
      <Icon size={13} color="currentColor" style={{ color: "inherit" }} />
      <Text fontSize="xs" fontWeight="600" color={s.color}>{s.label}</Text>
    </HStack>
  );
};

/* ── Deadline countdown ────────────────────────────────────────────────────── */

const DeadlineBanner = ({ deadline }) => {
  if (!deadline) return null;
  const now = new Date();
  const dl = new Date(deadline);
  const diff = dl - now;
  const isPast = diff < 0;

  const fmt = dl.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  let timeLeft = "";
  if (!isPast) {
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    timeLeft = days > 0 ? `${days}d ${hours}h left` : `${hours}h ${mins}m left`;
  }

  return (
    <Box
      bg={isPast ? "red.50" : "orange.50"}
      border="1px solid"
      borderColor={isPast ? "red.200" : "orange.200"}
      borderRadius="lg"
      px={4}
      py={3}
    >
      <HStack gap={2}>
        <Clock size={16} color={isPast ? "#dc2626" : "#ea580c"} />
        <Text fontSize="sm" fontWeight="600" color={isPast ? "red.700" : "orange.700"}>
          {isPast ? "Deadline passed" : "Deadline"}: {fmt}
        </Text>
        {!isPast && (
          <Box
            px={2} py={0.5} borderRadius="md" bg="orange.100"
            fontSize="xs" fontWeight="700" color="orange.700"
          >
            {timeLeft}
          </Box>
        )}
      </HStack>
    </Box>
  );
};

const DIFF_COLORS = {
  EASY: { color: "green.600", bg: "green.50" },
  MEDIUM: { color: "orange.500", bg: "orange.50" },
  HARD: { color: "red.600", bg: "red.50" },
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  LabDetailPage                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

const LabDetailPage = () => {
  const { orgSlug, labSlug } = useParams();
  const navigate = useNavigate();
  const { showMessage } = useToast();
  const { ConfirmDialog, showConfirm } = useConfirmDialog();

  const [org, setOrg] = useState(null);
  const [lab, setLab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewingSolution, setViewingSolution] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const orgResp = await ApiService.getOrganizationBySlug(orgSlug);
      if (orgResp.statusCode === 200) {
        setOrg(orgResp.data);
        const labResp = await ApiService.getOrgLab(orgResp.data.id, labSlug);
        if (labResp.statusCode === 200) setLab(labResp.data);
      }
    } catch (e) {
      showMessage("Failed to load lab", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [orgSlug, labSlug]);

  const canManage = org && org.myRole === "OWNER";

  /* ── Actions ─────────────────────────────────────────────────────────────── */

  const handleDelete = () => {
    showConfirm(
      "Delete Lab",
      `Are you sure you want to delete "${lab.title}"? This cannot be undone.`,
      async () => {
        try {
          await ApiService.deleteLab(org.id, lab.id);
          showMessage("Lab deleted", "success");
          navigate(`/organizations/${orgSlug}`);
        } catch (e) {
          showMessage(e.response?.data?.message || e.message, "error");
        }
      }
    );
  };

  const handlePublishSolutions = async () => {
    try {
      const resp = await ApiService.publishSolutions(org.id, lab.id);
      if (resp.statusCode === 200) {
        setLab(resp.data);
        showMessage(
          resp.data.solutionsPublished ? "Solutions published!" : "Solutions unpublished",
          "success"
        );
      }
    } catch (e) {
      showMessage(e.response?.data?.message || e.message, "error");
    }
  };

  /* ── Render ──────────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" color="purple.500" thickness="3px" />
      </Box>
    );
  }

  if (!lab) {
    return (
      <Box minH="100vh" bg="gray.50" py={20} textAlign="center">
        <Text color="gray.500" fontSize="lg">Lab not found</Text>
      </Box>
    );
  }

  const exercises = lab.exercises || [];

  return (
    <Box minH="100vh" bg="gray.50" py={8}>
      <Container maxW="container.xl">
        <VStack align="stretch" gap={6}>
          {/* Back */}
          <HStack
            gap={2}
            cursor="pointer"
            onClick={() => navigate(`/organizations/${orgSlug}`)}
            _hover={{ color: "purple.600" }}
            color="gray.500"
            transition="color 0.15s"
          >
            <ArrowLeft size={18} />
            <Text fontSize="sm" fontWeight="500">Back to {org?.name}</Text>
          </HStack>

          {/* Header */}
          <Box bg="white" borderRadius="xl" boxShadow="md" p={6}>
            <HStack justify="space-between" align="start">
              <VStack align="start" gap={2}>
                <HStack gap={2}>
                  <BookOpen size={22} color="#7c3aed" />
                  <Heading size="lg" color="gray.800">{lab.title}</Heading>
                </HStack>
                {lab.description && (
                  <Text color="gray.500" fontSize="sm">{lab.description}</Text>
                )}
                <HStack gap={3}>
                  <Text fontSize="xs" color="gray.400">
                    {exercises.length} exercise{exercises.length !== 1 ? "s" : ""} ·{" "}
                    {lab.totalPoints} pts total
                  </Text>
                  {lab.solutionsPublished && (
                    <Box px={2} py={0.5} borderRadius="md" fontSize="xs" fontWeight="600" bg="blue.50" color="blue.600">
                      Solutions published
                    </Box>
                  )}
                </HStack>
              </VStack>

              {/* Admin actions */}
              {canManage && (
                <HStack gap={2}>
                  <Button
                    size="sm" variant="outline" gap={1}
                    onClick={() => navigate(`/organizations/${orgSlug}/labs/${labSlug}/edit`)}
                  >
                    <Pencil size={14} /> Edit
                  </Button>
                  <Button
                    size="sm" variant="outline" gap={1}
                    onClick={() => navigate(`/organizations/${orgSlug}/labs/${labSlug}/progress`)}
                  >
                    <BarChart3 size={14} /> Progress
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    gap={1}
                    onClick={handlePublishSolutions}
                    colorScheme={lab.solutionsPublished ? "orange" : "blue"}
                  >
                    {lab.solutionsPublished ? <EyeOff size={14} /> : <Eye size={14} />}
                    {lab.solutionsPublished ? "Unpublish" : "Publish"} Solutions
                  </Button>
                  <Button
                    size="sm" variant="outline" colorScheme="red" gap={1}
                    onClick={handleDelete}
                  >
                    <Trash2 size={14} /> Delete
                  </Button>
                </HStack>
              )}
            </HStack>
          </Box>

          {/* Deadline */}
          <DeadlineBanner deadline={lab.deadline} />

          {/* Exercises table */}
          <Box bg="white" borderRadius="xl" boxShadow="md" overflow="hidden">
            <Table.Root variant="line" size="md">
              <Table.Header bg="purple.50">
                <Table.Row>
                  <Table.ColumnHeader w="5%">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">#</Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader>
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">Problem</Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="12%">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">Difficulty</Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="10%">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">Points</Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="12%">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">Status</Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="8%">
                    <Text fontWeight="bold" color="purple.700" fontSize="sm">Subs</Text>
                  </Table.ColumnHeader>
                  {lab.solutionsPublished && (
                    <Table.ColumnHeader w="10%">
                      <Text fontWeight="bold" color="purple.700" fontSize="sm">Solution</Text>
                    </Table.ColumnHeader>
                  )}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {exercises.map((ex) => {
                  const dc = DIFF_COLORS[ex.problemDifficulty] || { color: "gray.600", bg: "gray.50" };
                  return (
                    <Table.Row
                      key={ex.id}
                      _hover={{ bg: "purple.50" }}
                      cursor="pointer"
                      onClick={() => navigate(`/organizations/${orgSlug}/labs/${labSlug}/problems/${ex.problemSlug}`)}
                    >
                      <Table.Cell>
                        <Box
                          w="28px" h="28px" borderRadius="md" bg="purple.100"
                          display="flex" alignItems="center" justifyContent="center"
                        >
                          <Text fontSize="sm" fontWeight="700" color="purple.700">
                            {String.fromCharCode(64 + ex.exerciseOrder)}
                          </Text>
                        </Box>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontWeight="600" color="gray.800" fontSize="sm">
                          {ex.problemTitle}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Box
                          display="inline-block" px={2} py={0.5} borderRadius="md"
                          fontSize="xs" fontWeight="700" bg={dc.bg} color={dc.color}
                        >
                          {ex.problemDifficulty || "—"}
                        </Box>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm" fontWeight="600" color="gray.700">{ex.points}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <StatusBadge status={ex.status || "NOT_STARTED"} />
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm" color="gray.500">{ex.submissionCount ?? 0}</Text>
                      </Table.Cell>
                      {lab.solutionsPublished && (
                        <Table.Cell>
                          {ex.solutionCode ? (
                            <Box
                              as="button"
                              onClick={(e) => { e.stopPropagation(); setViewingSolution(ex); }}
                              bg="transparent" border="none" cursor="pointer"
                            >
                              <HStack gap={1} color="purple.500" _hover={{ color: "purple.700" }}>
                                <Code size={14} />
                                <Text fontSize="xs" fontWeight="500">View</Text>
                              </HStack>
                            </Box>
                          ) : ex.solutionFileUrl ? (
                            <Box
                              as="a"
                              href={ex.solutionFileUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <HStack gap={1} color="blue.500" _hover={{ color: "blue.700" }}>
                                <FileText size={14} />
                                <Text fontSize="xs" fontWeight="500">File</Text>
                              </HStack>
                            </Box>
                          ) : (
                            <Text fontSize="xs" color="gray.400">—</Text>
                          )}
                        </Table.Cell>
                      )}
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </Box>
        </VStack>
      </Container>
      <ConfirmDialog />

      {/* Solution Code Modal */}
      {viewingSolution && (
        <Box
          position="fixed" top={0} left={0} right={0} bottom={0}
          bg="blackAlpha.700" zIndex={1000}
          display="flex" alignItems="center" justifyContent="center"
          onClick={() => setViewingSolution(null)}
        >
          <Box
            bg="gray.900" borderRadius="xl" p={6} maxW="700px" w="90%"
            maxH="80vh" overflow="auto" position="relative"
            onClick={(e) => e.stopPropagation()}
          >
            <HStack justify="space-between" mb={4}>
              <VStack align="start" gap={0}>
                <Text color="white" fontWeight="700" fontSize="lg">
                  {viewingSolution.problemTitle}
                </Text>
                <Text color="gray.400" fontSize="xs">
                  Solution · {LANG_LABELS[viewingSolution.solutionLanguage] || "C++"}
                </Text>
              </VStack>
              <Box
                as="button" bg="transparent" border="none" cursor="pointer"
                color="gray.400" _hover={{ color: "white" }}
                onClick={() => setViewingSolution(null)}
              >
                <X size={20} />
              </Box>
            </HStack>
            <Box
              borderRadius="md"
              overflow="hidden"
              h="400px"
              border="1px solid" borderColor="gray.700"
            >
              <Editor
                height="100%"
                theme="vs-dark"
                language="cpp"
                value={viewingSolution.solutionCode}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  domReadOnly: true,
                }}
              />
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default LabDetailPage;
