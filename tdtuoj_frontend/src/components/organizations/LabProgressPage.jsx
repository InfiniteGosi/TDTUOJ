import { useState, useEffect } from "react";
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
  Download,
  CheckCircle,
  AlertTriangle,
  Circle,
  BarChart3,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";

/* ── Status cell ───────────────────────────────────────────────────────────── */

const StatusCell = ({ status }) => {
  const MAP = {
    SOLVED: { icon: CheckCircle, color: "#16a34a", bg: "#dcfce7" },
    ATTEMPTED: { icon: AlertTriangle, color: "#ea580c", bg: "#fff7ed" },
    NOT_STARTED: { icon: Circle, color: "#9ca3af", bg: "#f9fafb" },
  };
  const s = MAP[status] || MAP.NOT_STARTED;
  const Icon = s.icon;
  return (
    <Box
      display="flex" alignItems="center" justifyContent="center"
      w="32px" h="32px" borderRadius="md" bg={s.bg} mx="auto"
    >
      <Icon size={16} color={s.color} />
    </Box>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  LabProgressPage — student × exercise progress grid                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

const LabProgressPage = () => {
  const { orgSlug, labSlug } = useParams();
  const navigate = useNavigate();
  const { showMessage } = useToast();

  const [org, setOrg] = useState(null);
  const [lab, setLab] = useState(null);
  const [progress, setProgress] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const orgResp = await ApiService.getOrganizationBySlug(orgSlug);
        if (orgResp.statusCode !== 200) return;
        setOrg(orgResp.data);

        const labResp = await ApiService.getOrgLab(orgResp.data.id, labSlug);
        if (labResp.statusCode !== 200) return;
        setLab(labResp.data);
        setExercises(labResp.data.exercises || []);

        const progResp = await ApiService.getLabProgress(orgResp.data.id, labResp.data.id);
        if (progResp.statusCode === 200) setProgress(progResp.data || []);
      } catch (e) {
        showMessage("Failed to load progress", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [orgSlug, labSlug]);

  /* ── Export ──────────────────────────────────────────────────────────────── */

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const blob = await ApiService.exportLabProgress(org.id, lab.id, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lab-progress.${format === "xlsx" ? "xlsx" : "csv"}`;
      a.click();
      window.URL.revokeObjectURL(url);
      showMessage(`Exported as ${format.toUpperCase()}`, "success");
    } catch (e) {
      showMessage("Export failed", "error");
    } finally {
      setExporting(null);
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
        <Text color="gray.500">Lab not found</Text>
      </Box>
    );
  }

  // Completion stats per exercise
  const exCompletionPct = exercises.map((_, exIdx) => {
    if (progress.length === 0) return 0;
    const solved = progress.filter(
      (s) => s.exerciseStatuses?.[exIdx]?.status === "SOLVED"
    ).length;
    return Math.round((solved / progress.length) * 100);
  });

  return (
    <Box minH="100vh" bg="gray.50" py={8}>
      <Container maxW="container.xl">
        <VStack align="stretch" gap={6}>
          {/* Back */}
          <HStack
            gap={2}
            cursor="pointer"
            onClick={() => navigate(`/organizations/${orgSlug}/labs/${labSlug}`)}
            _hover={{ color: "purple.600" }}
            color="gray.500"
            transition="color 0.15s"
          >
            <ArrowLeft size={18} />
            <Text fontSize="sm" fontWeight="500">Back to {lab.title}</Text>
          </HStack>

          {/* Header + export */}
          <HStack justify="space-between" align="center">
            <HStack gap={2}>
              <BarChart3 size={22} color="#7c3aed" />
              <Heading size="lg" color="gray.800">
                Progress — {lab.title}
              </Heading>
              <Box px={2} py={0.5} borderRadius="md" bg="purple.50" fontSize="xs" fontWeight="600" color="purple.700">
                {progress.length} student{progress.length !== 1 ? "s" : ""}
              </Box>
            </HStack>
            <HStack gap={2}>
              <Button
                size="sm" variant="outline" gap={1}
                onClick={() => handleExport("csv")}
                disabled={!!exporting}
              >
                {exporting === "csv" ? <Spinner size="xs" /> : <Download size={14} />}
                CSV
              </Button>
              <Button
                size="sm" variant="outline" gap={1}
                onClick={() => handleExport("xlsx")}
                disabled={!!exporting}
              >
                {exporting === "xlsx" ? <Spinner size="xs" /> : <Download size={14} />}
                XLSX
              </Button>
            </HStack>
          </HStack>

          {/* Progress grid */}
          <Box bg="white" borderRadius="xl" boxShadow="md" overflow="auto">
            <Table.Root variant="line" size="sm">
              <Table.Header bg="purple.50">
                <Table.Row>
                  <Table.ColumnHeader position="sticky" left={0} bg="purple.50" zIndex={1} minW="150px">
                    <Text fontWeight="bold" color="purple.700" fontSize="xs">Student</Text>
                  </Table.ColumnHeader>
                  {exercises.map((ex, idx) => (
                    <Table.ColumnHeader key={ex.id} textAlign="center" minW="60px">
                      <VStack gap={0}>
                        <Text fontWeight="bold" color="purple.700" fontSize="xs">
                          {String.fromCharCode(65 + idx)}
                        </Text>
                      </VStack>
                    </Table.ColumnHeader>
                  ))}
                  <Table.ColumnHeader textAlign="center" minW="70px">
                    <Text fontWeight="bold" color="purple.700" fontSize="xs">Solved</Text>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="center" minW="80px">
                    <Text fontWeight="bold" color="purple.700" fontSize="xs">Score</Text>
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {progress.map((student) => (
                  <Table.Row key={student.userId} _hover={{ bg: "gray.50" }}>
                    <Table.Cell position="sticky" left={0} bg="white" zIndex={1}>
                      <VStack align="start" gap={0}>
                        <Text fontSize="sm" fontWeight="600" color="gray.800">
                          {student.name || student.username}
                        </Text>
                        {student.name && (
                          <Text fontSize="xs" color="gray.400">@{student.username}</Text>
                        )}
                      </VStack>
                    </Table.Cell>
                    {(student.exerciseStatuses || []).map((es, idx) => (
                      <Table.Cell key={idx} textAlign="center">
                        <StatusCell status={es.status} />
                      </Table.Cell>
                    ))}
                    <Table.Cell textAlign="center">
                      <Text fontSize="sm" fontWeight="600" color="gray.700">
                        {student.solvedCount}/{exercises.length}
                      </Text>
                    </Table.Cell>
                    <Table.Cell textAlign="center">
                      <Text fontSize="sm" fontWeight="600" color="purple.600">
                        {student.earnedPoints}/{student.totalPoints}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ))}

                {/* Summary row */}
                {progress.length > 0 && (
                  <Table.Row bg="gray.50">
                    <Table.Cell position="sticky" left={0} bg="gray.50" zIndex={1}>
                      <Text fontSize="xs" fontWeight="700" color="gray.600">COMPLETION %</Text>
                    </Table.Cell>
                    {exCompletionPct.map((pct, idx) => (
                      <Table.Cell key={idx} textAlign="center">
                        <Text
                          fontSize="xs" fontWeight="700"
                          color={pct === 100 ? "green.600" : pct > 50 ? "orange.500" : "red.500"}
                        >
                          {pct}%
                        </Text>
                      </Table.Cell>
                    ))}
                    <Table.Cell />
                    <Table.Cell />
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Root>

            {progress.length === 0 && (
              <Box py={12} textAlign="center">
                <Text color="gray.400">No students have submitted yet.</Text>
              </Box>
            )}
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default LabProgressPage;
