import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Container,
  Heading,
  Text,
  HStack,
  VStack,
  Input,
  Button,
  Spinner,
  Textarea,
  Badge,
} from "@chakra-ui/react";
import {
  Trophy,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Search,
  ChevronDown,
  AlertTriangle,
  Clock,
  CalendarClock,
  User,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import DateTimePicker from "../common/DateTimePicker";

// ─── Reusable field ────────────────────────────────────────────────────────────

const Field = ({ label, required, children, hint }) => (
  <VStack align="stretch" gap={1}>
    <HStack gap={1}>
      <Text fontSize="sm" fontWeight="600" color="gray.700">
        {label}
      </Text>
      {required && (
        <Text fontSize="sm" color="red.400">
          *
        </Text>
      )}
    </HStack>
    {children}
    {hint && (
      <Text fontSize="xs" color="gray.400">
        {hint}
      </Text>
    )}
  </VStack>
);

// ─── Problem picker dropdown ───────────────────────────────────────────────────

const ProblemPicker = ({ selectedProblems, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [allProblems, setAllProblems] = useState([]);

  useEffect(() => {
    ApiService.getAllProblems({ limit: 200, offset: 0 })
      .then((r) => {
        if (r.statusCode === 200) setAllProblems(r.data.content ?? []);
      })
      .catch(console.error);
  }, []);

  const selectedIds = selectedProblems.map((p) => p.problemId);
  const available = allProblems.filter(
    (p) =>
      !selectedIds.includes(p.id) &&
      p.title.toLowerCase().includes(search.toLowerCase()),
  );

  const add = (problem) => {
    onChange([
      ...selectedProblems,
      {
        problemId: problem.id,
        problemTitle: problem.title,
        problemOrder: selectedProblems.length + 1,
        points: problem.point ?? 100,
      },
    ]);
    setSearch("");
    setOpen(false);
  };

  const remove = (problemId) =>
    onChange(
      selectedProblems
        .filter((p) => p.problemId !== problemId)
        .map((p, i) => ({ ...p, problemOrder: i + 1 })),
    );

  const updatePoints = (problemId, points) =>
    onChange(
      selectedProblems.map((p) =>
        p.problemId === problemId
          ? { ...p, points: parseInt(points) || 0 }
          : p,
      ),
    );

  return (
    <VStack align="stretch" gap={3}>
      {/* Selected problems list */}
      {selectedProblems.length > 0 && (
        <Box
          border="1px solid"
          borderColor="gray.200"
          borderRadius="lg"
          overflow="hidden"
        >
          {selectedProblems.map((p, idx) => (
            <HStack
              key={p.problemId}
              px={4}
              py={3}
              justify="space-between"
              borderBottomWidth={idx < selectedProblems.length - 1 ? "1px" : 0}
              borderColor="gray.100"
              bg={idx % 2 === 0 ? "white" : "gray.50"}
            >
              <HStack gap={3}>
                <Box
                  w={6}
                  h={6}
                  borderRadius="full"
                  bg="purple.100"
                  color="purple.700"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="xs"
                  fontWeight="700"
                >
                  {String.fromCharCode(64 + p.problemOrder)}
                </Box>
                <Text fontSize="sm" fontWeight="600" color="gray.800">
                  {p.problemTitle}
                </Text>
              </HStack>
              <HStack gap={3}>
                <HStack gap={1}>
                  <Text fontSize="xs" color="gray.500">
                    pts:
                  </Text>
                  <Input
                    type="number"
                    size="xs"
                    w="70px"
                    value={p.points}
                    onChange={(e) => updatePoints(p.problemId, e.target.value)}
                    min={0}
                    textAlign="center"
                  />
                </HStack>
                <Box
                  as="button"
                  type="button"
                  p={1}
                  borderRadius="md"
                  color="red.400"
                  _hover={{ bg: "red.50" }}
                  onClick={() => remove(p.problemId)}
                >
                  <Trash2 size={14} />
                </Box>
              </HStack>
            </HStack>
          ))}
        </Box>
      )}

      {/* Add problem dropdown */}
      <Box position="relative" display="inline-block">
        <Box
          as="button"
          type="button"
          display="inline-flex"
          alignItems="center"
          gap={2}
          px={4}
          py={2}
          borderRadius="lg"
          border="1.5px dashed"
          borderColor={open ? "purple.400" : "gray.300"}
          bg="white"
          color={open ? "purple.600" : "gray.500"}
          fontSize="sm"
          fontWeight="500"
          cursor="pointer"
          _hover={{ borderColor: "purple.400", color: "purple.600" }}
          onClick={() => setOpen((v) => !v)}
          style={{ outline: "none" }}
        >
          <Plus size={14} />
          Add Problem
          <ChevronDown
            size={14}
            style={{
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.15s",
            }}
          />
        </Box>

        {open && (
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
            w="320px"
            maxH="280px"
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
              <HStack gap={2}>
                <Search size={14} color="#9CA3AF" />
                <Input
                  size="sm"
                  placeholder="Search problems..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  border="none"
                  _focus={{ boxShadow: "none" }}
                />
              </HStack>
            </Box>
            {available.length === 0 ? (
              <Box px={4} py={3}>
                <Text fontSize="xs" color="gray.400">
                  No problems available
                </Text>
              </Box>
            ) : (
              available.slice(0, 30).map((problem) => (
                <Box
                  key={problem.id}
                  px={4}
                  py={2}
                  cursor="pointer"
                  _hover={{ bg: "purple.50" }}
                  onClick={() => add(problem)}
                >
                  <Text fontSize="sm" color="gray.700" fontWeight="500">
                    {problem.title}
                  </Text>
                  <Text fontSize="xs" color="gray.400">
                    {problem.point ?? 0} pts · {problem.problemDifficulty ?? "—"}
                  </Text>
                </Box>
              ))
            )}
          </Box>
        )}
      </Box>
    </VStack>
  );
};

// ─── Main form ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: "",
  description: "",
  startTime: "",
  endTime: "",
  registrationStart: "",
  maxParticipant: "20",
  isPublic: true,
  isRated: true,
  contestStyle: "ICPC",
  problems: [],
};

// Format a LocalDateTime string from Java into the DateTimePicker format (YYYY-MM-DDTHH:mm:ss)
const toPickerDate = (isoStr) => {
  if (!isoStr) return "";
  // Ensure seconds are present
  const base = isoStr.slice(0, 19);
  return base.length === 16 ? base + ":00" : base;
};

// Format DateTimePicker value into ISO string for the API
const toIsoString = (val) => {
  if (!val) return null;
  return val.length === 16 ? val + ":00" : val;
};

// ─── Schedule helpers ──────────────────────────────────────────────────────────

const fmtShort = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const getScheduleWarnings = (form) => {
  const w = [];
  const s = form.startTime ? new Date(form.startTime).getTime() : null;
  const e = form.endTime   ? new Date(form.endTime).getTime()   : null;
  const ro = form.registrationStart ? new Date(form.registrationStart).getTime() : null;

  if (s && e && e <= s)
    w.push({ type: "error", msg: "End time must be after start time" });
  if (s && e && e > s) {
    const mins = (e - s) / 60000;
    if (mins < 5) w.push({ type: "warn", msg: "Contest duration is under 5 minutes" });
  }
  if (ro && s && ro >= s)
    w.push({ type: "warn", msg: "Registration opens after contest starts" });
  if (s && s < Date.now())
    w.push({ type: "warn", msg: "Start time is in the past" });

  return w;
};

// ─── Visual timeline (vertical) ────────────────────────────────────────────────

const EVENTS = [
  { key: "registrationStart", label: "Registration Opens", color: "#3b82f6", bg: "#eff6ff" },
  { key: "startTime",         label: "Registration Closes / Contest Starts", color: "#16a34a", bg: "#f0fdf4" },
  { key: "endTime",           label: "Contest Ends",       color: "#ef4444", bg: "#fef2f2" },
];

const ScheduleTimeline = ({ form }) => {
  const events = useMemo(() => {
    const list = EVENTS
      .filter((ev) => form[ev.key])
      .map((ev) => ({ ...ev, time: new Date(form[ev.key]).getTime() }));
    list.sort((a, b) => a.time - b.time);
    return list;
  }, [form.startTime, form.endTime, form.registrationStart]);

  const warnings = useMemo(() => getScheduleWarnings(form), [
    form.startTime, form.endTime, form.registrationStart,
  ]);

  const hasStart = Boolean(form.startTime);
  const hasEnd   = Boolean(form.endTime);

  if (events.length === 0) {
    return (
      <Box bg="gray.50" borderRadius="lg" border="1px dashed" borderColor="gray.200" p={4} textAlign="center">
        <CalendarClock size={24} color="#d1d5db" style={{ margin: "0 auto 8px" }} />
        <Text fontSize="xs" color="gray.400" fontWeight="500">
          Set times to see the schedule
        </Text>
      </Box>
    );
  }

  return (
    <VStack align="stretch" gap={3}>
      {/* Vertical timeline */}
      <Box bg="gray.50" borderRadius="lg" p={4} border="1px solid" borderColor="gray.100">
        <Text fontSize="10px" fontWeight="700" color="gray.400" letterSpacing="0.05em" mb={3}>
          SCHEDULE ORDER
        </Text>
        <VStack align="stretch" gap={0}>
          {events.map((ev, i) => (
            <HStack key={ev.key} gap={3} position="relative">
              {/* Vertical line + dot */}
              <VStack gap={0} align="center" w="16px" flexShrink={0}>
                {i > 0 && (
                  <Box w="2px" h="8px" bg="gray.200" />
                )}
                <Box
                  w="10px"
                  h="10px"
                  borderRadius="full"
                  bg={ev.color}
                  border="2px solid white"
                  boxShadow="0 0 0 1px " 
                  flexShrink={0}
                />
                {i < events.length - 1 && (
                  <Box w="2px" flex={1} minH="8px" bg="gray.200" />
                )}
              </VStack>
              {/* Label + time */}
              <Box
                flex={1}
                bg={ev.bg}
                borderRadius="md"
                px={3}
                py={1.5}
                mb={1}
              >
                <Text fontSize="10px" fontWeight="700" color={ev.color}>
                  {ev.label}
                </Text>
                <Text fontSize="10px" color="gray.500">
                  {fmtShort(new Date(ev.time).toISOString())}
                </Text>
              </Box>
            </HStack>
          ))}
        </VStack>
      </Box>

      {/* Duration badge */}
      {hasStart && hasEnd && (() => {
        const s = new Date(form.startTime).getTime();
        const e = new Date(form.endTime).getTime();
        const diff = e - s;
        if (diff <= 0) return null;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        return (
          <HStack gap={1} justify="center">
            <Clock size={12} color="#9ca3af" />
            <Text fontSize="xs" color="gray.500" fontWeight="600">
              Duration: {h > 0 ? `${h}h ` : ""}{m}m
            </Text>
          </HStack>
        );
      })()}

      {/* Warnings */}
      {warnings.length > 0 && (
        <VStack align="stretch" gap={1}>
          {warnings.map((w, i) => (
            <HStack
              key={i}
              gap={2}
              px={3}
              py={2}
              bg={w.type === "error" ? "red.50" : "orange.50"}
              borderRadius="md"
              border="1px solid"
              borderColor={w.type === "error" ? "red.200" : "orange.200"}
            >
              <AlertTriangle size={14} color={w.type === "error" ? "#ef4444" : "#f59e0b"} />
              <Text fontSize="xs" fontWeight="600" color={w.type === "error" ? "red.600" : "orange.600"}>
                {w.msg}
              </Text>
            </HStack>
          ))}
        </VStack>
      )}
    </VStack>
  );
};

const AdminContestFormPage = () => {
  const { id } = useParams(); // defined on /admin/contests/edit/:id
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { showMessage } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatorInfo, setCreatorInfo] = useState({ id: null, username: null });

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    ApiService.getContestById(id)
      .then((resp) => {
        if (resp.statusCode === 200) {
          const c = resp.data;
          setForm({
            name: c.name ?? "",
            description: c.description ?? "",
            startTime: toPickerDate(c.startTime),
            endTime: toPickerDate(c.endTime),
            registrationStart: toPickerDate(c.registrationStart),
            maxParticipant: c.maxParticipant ?? "",
            isPublic: c.isPublic ?? true,
            isRated: c.isRated ?? false,
            contestStyle: c.contestStyle ?? "ICPC",
            problems: (c.problems ?? []).map((p) => ({
              problemId: p.problemId,
              problemTitle: p.problemTitle,
              problemOrder: p.problemOrder,
              points: p.points ?? 100,
            })),
          });
          setCreatorInfo({
            id: c.creatorId || null,
            username: c.creatorUsername || null,
          });
        }
      })
      .catch((err) =>
        showMessage(err.response?.data?.message || err.message, "error"),
      )
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return showMessage("Contest name is required", "error");
    if (!form.startTime)   return showMessage("Start time is required", "error");
    if (!form.endTime)     return showMessage("End time is required", "error");

    // Validate time ordering
    const sMs = new Date(form.startTime).getTime();
    const eMs = new Date(form.endTime).getTime();
    if (eMs <= sMs) return showMessage("End time must be after start time", "error");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      startTime: toIsoString(form.startTime),
      endTime: toIsoString(form.endTime),
      registrationStart: toIsoString(form.registrationStart),
      registrationEnd: toIsoString(form.startTime),  // auto-close registration at contest start
      maxParticipant: form.maxParticipant ? parseInt(form.maxParticipant) : null,
      isPublic: form.isPublic,
      isRated: form.isRated,
      contestStyle: "ICPC",
      problems: form.problems.map((p) => ({
        problemId: p.problemId,
        problemOrder: p.problemOrder,
        points: p.points,
      })),
    };

    try {
      setSaving(true);
      const resp = isEdit
        ? await ApiService.updateContest(id, payload)
        : await ApiService.createContest(payload);

      if (resp.statusCode === 200 || resp.statusCode === 201) {
        showMessage(
          isEdit ? "Contest updated successfully" : "Contest created successfully",
          "success",
        );
        navigate("/admin/contests");
      }
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
        <VStack gap={3}>
          <Spinner size="xl" color="purple.500" thickness="4px" />
          <Text color="gray.500">Loading contest...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50" py={8}>
      <Container maxW="container.md">
        <VStack align="stretch" gap={6}>
          {/* Header */}
          <HStack justify="space-between">
            <HStack gap={3}>
              <Box
                as="button"
                p={2}
                borderRadius="lg"
                color="gray.500"
                _hover={{ bg: "gray.100", color: "gray.800" }}
                onClick={() => navigate("/admin/contests")}
              >
                <ArrowLeft size={20} />
              </Box>
              <HStack gap={2}>
                <Trophy size={24} color="#7c3aed" />
                <Heading size="xl" color="gray.800">
                  {isEdit ? "Edit Contest" : "Create Contest"}
                </Heading>
              </HStack>
            </HStack>
            <Badge colorScheme="purple" px={3} py={1} borderRadius="full" fontSize="sm">
              ICPC Style
            </Badge>
          </HStack>

          {/* Creator info badge (edit mode only) */}
          {isEdit && creatorInfo.id && (
            <HStack
              gap={2}
              bg="purple.50"
              border="1px solid"
              borderColor="purple.200"
              borderRadius="lg"
              px={4}
              py={2}
              alignSelf="flex-start"
            >
              <User size={16} color="#7c3aed" />
              <Text fontSize="sm" color="gray.600">
                Creator:
              </Text>
              <Badge
                colorScheme="purple"
                variant="subtle"
                fontSize="sm"
                px={2}
                py={0.5}
                borderRadius="md"
              >
                {creatorInfo.username}
              </Badge>
              <Text fontSize="xs" color="gray.400">
                (ID: {creatorInfo.id})
              </Text>
            </HStack>
          )}

          {/* Form */}
          <Box
            as="form"
            onSubmit={handleSubmit}
            bg="white"
            borderRadius="xl"
            boxShadow="md"
            p={8}
          >
            <VStack align="stretch" gap={6}>
              {/* Basic Info Section */}
              <Box>
                <Text
                  fontSize="xs"
                  fontWeight="700"
                  color="gray.400"
                  letterSpacing="0.1em"
                  mb={4}
                >
                  BASIC INFO
                </Text>
                <VStack align="stretch" gap={4}>
                  <Field label="Contest Name" required>
                    <Input
                      placeholder="e.g. TDTU Spring Cup 2025"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      focusBorderColor="purple.400"
                    />
                  </Field>

                  <Field label="Description">
                    <Textarea
                      placeholder="Describe the contest, rules, prizes..."
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                      rows={4}
                      focusBorderColor="purple.400"
                      resize="vertical"
                    />
                  </Field>
                </VStack>
              </Box>

              <Box borderTopWidth="1px" borderColor="gray.100" />

               {/* Schedule Section */}
              <Box>
                <Text
                  fontSize="xs"
                  fontWeight="700"
                  color="gray.400"
                  letterSpacing="0.1em"
                  mb={4}
                >
                  SCHEDULE
                </Text>
                <HStack align="flex-start" gap={6}>
                  {/* Left: time pickers */}
                  <VStack align="stretch" gap={4} flex={1}>
                    <Field
                      label="Registration Opens"
                      hint="Leave blank to allow registration any time. Registration closes automatically when the contest starts."
                    >
                      <DateTimePicker
                        value={form.registrationStart}
                        onChange={(v) => set("registrationStart", v)}
                        placeholder="Pick opening date & time"
                      />
                    </Field>

                    <HStack gap={4} align="flex-start">
                      <Field label="Start Time" required>
                        <DateTimePicker
                          value={form.startTime}
                          onChange={(v) => set("startTime", v)}
                          placeholder="Pick start date & time"
                        />
                      </Field>
                      <Field label="End Time" required>
                        <DateTimePicker
                          value={form.endTime}
                          onChange={(v) => set("endTime", v)}
                          placeholder="Pick end date & time"
                        />
                      </Field>
                    </HStack>
                  </VStack>

                  {/* Right: visual timeline */}
                  <Box w="280px" minW="240px" flexShrink={0} pt={6}>
                    <ScheduleTimeline form={form} />
                  </Box>
                </HStack>
              </Box>

              <Box borderTopWidth="1px" borderColor="gray.100" />

              {/* Settings Section */}
              <Box>
                <Text
                  fontSize="xs"
                  fontWeight="700"
                  color="gray.400"
                  letterSpacing="0.1em"
                  mb={4}
                >
                  SETTINGS
                </Text>
                <VStack align="stretch" gap={4}>
                  <Field
                    label="Max Participants"
                    hint="Leave blank for unlimited"
                  >
                    <Input
                      type="number"
                      placeholder="e.g. 500"
                      value={form.maxParticipant}
                      onChange={(e) => set("maxParticipant", e.target.value)}
                      min={1}
                      focusBorderColor="purple.400"
                      w="200px"
                    />
                  </Field>

                  <HStack gap={6}>
                    {/* Public toggle */}
                    <HStack gap={3}>
                      <Box
                        as="button"
                        type="button"
                        w={10}
                        h={6}
                        borderRadius="full"
                        bg={form.isPublic ? "purple.500" : "gray.300"}
                        position="relative"
                        transition="background 0.2s"
                        onClick={() => set("isPublic", !form.isPublic)}
                        style={{ outline: "none" }}
                      >
                        <Box
                          position="absolute"
                          top="2px"
                          left={form.isPublic ? "18px" : "2px"}
                          w="20px"
                          h="20px"
                          borderRadius="full"
                          bg="white"
                          boxShadow="sm"
                          transition="left 0.2s"
                        />
                      </Box>
                      <Text fontSize="sm" color="gray.700">
                        Public contest
                      </Text>
                    </HStack>

                    {/* Rated toggle */}
                    <HStack gap={3}>
                      <Box
                        as="button"
                        type="button"
                        w={10}
                        h={6}
                        borderRadius="full"
                        bg={form.isRated ? "purple.500" : "gray.300"}
                        position="relative"
                        transition="background 0.2s"
                        onClick={() => set("isRated", !form.isRated)}
                        style={{ outline: "none" }}
                      >
                        <Box
                          position="absolute"
                          top="2px"
                          left={form.isRated ? "18px" : "2px"}
                          w="20px"
                          h="20px"
                          borderRadius="full"
                          bg="white"
                          boxShadow="sm"
                          transition="left 0.2s"
                        />
                      </Box>
                      <Text fontSize="sm" color="gray.700">
                        Rated contest
                      </Text>
                    </HStack>
                  </HStack>
                </VStack>
              </Box>

              <Box borderTopWidth="1px" borderColor="gray.100" />

              {/* Problems Section */}
              <Box>
                <HStack justify="space-between" mb={4}>
                  <Text
                    fontSize="xs"
                    fontWeight="700"
                    color="gray.400"
                    letterSpacing="0.1em"
                  >
                    PROBLEMS ({form.problems.length})
                  </Text>
                </HStack>
                <ProblemPicker
                  selectedProblems={form.problems}
                  onChange={(p) => set("problems", p)}
                />
              </Box>

              {/* Actions */}
              <HStack justify="flex-end" gap={3} pt={2}>
                <Button
                  variant="ghost"
                  colorScheme="gray"
                  onClick={() => navigate("/admin/contests")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  colorScheme="purple"
                  loading={saving}
                  loadingText="Saving..."
                  gap={2}
                >
                  <Save size={16} />
                  {isEdit ? "Save Changes" : "Create Contest"}
                </Button>
              </HStack>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default AdminContestFormPage;
