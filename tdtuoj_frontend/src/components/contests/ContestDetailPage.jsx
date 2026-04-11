import { useState, useEffect, useCallback, useRef } from "react";
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
  Button,
  Table,
} from "@chakra-ui/react";
import {
  Trophy,
  ArrowLeft,
  Calendar,
  Users,
  Lock,
  Globe,
  Star,
  Clock,
  CheckCircle,
  Medal,
  RefreshCw,
  ListOrdered,
  BookOpen,
  XCircle,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (dt) => {
  if (!dt) return "—";
  // Backend stores LocalDateTime as-is (local time, no timezone).
  // Parsing without a suffix correctly treats it as local time.
  return new Date(dt).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusOf = (contest) => {
  if (!contest?.startTime) return "UPCOMING";
  const now   = Date.now();
  const start = new Date(contest.startTime).getTime();
  const end   = new Date(contest.endTime).getTime();
  if (now < start) return "UPCOMING";
  if (now > end)   return "ENDED";
  return "RUNNING";
};

const STATUS = {
  UPCOMING: { label: "Upcoming", color: "#3b82f6", bg: "#eff6ff" },
  RUNNING:  { label: "Live",     color: "#16a34a", bg: "#f0fdf4" },
  ENDED:    { label: "Ended",    color: "#6b7280", bg: "#f9fafb" },
};

const fmtMins = (mins) => {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// ─── Countdown hook ───────────────────────────────────────────────────────────

const useCountdown = (targetDateStr, onExpire) => {
  const getRemaining = () => {
    if (!targetDateStr) return null;
    const diff = new Date(targetDateStr).getTime() - Date.now();
    if (diff <= 0) return null;
    return {
      total: diff,
      days:    Math.floor(diff / 86400000),
      hours:   Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff %  3600000) /   60000),
      seconds: Math.floor((diff %    60000) /    1000),
    };
  };

  const [remaining, setRemaining] = useState(getRemaining);
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    setRemaining(getRemaining());
    const id = setInterval(() => {
      const r = getRemaining();
      setRemaining(r);
      if (!r && !firedRef.current) {
        firedRef.current = true;
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [targetDateStr]);

  return remaining;
};

// ─── Countdown banner (LeetCode-style) ────────────────────────────────────────

const CountdownUnit = ({ value, label }) => (
  <Box textAlign="center" minW="56px">
    <Box
      bg="whiteAlpha.200"
      borderRadius="lg"
      px={3}
      py={2}
      fontFamily="'JetBrains Mono', monospace"
      fontSize="2xl"
      fontWeight="800"
      lineHeight="1"
    >
      {String(value).padStart(2, "0")}
    </Box>
    <Text fontSize="10px" mt={1} opacity={0.7} fontWeight="600" textTransform="uppercase" letterSpacing="0.5px">
      {label}
    </Text>
  </Box>
);

const ContestCountdown = ({ contest, onExpire }) => {
  const remaining = useCountdown(contest?.startTime, onExpire);
  const statusNow = statusOf(contest);

  if (!contest) return null;

  // Show a running timer when contest is live
  if (statusNow === "RUNNING") {
    return (
      <Box
        bg="green.600"
        color="white"
        py={3}
        textAlign="center"
        fontSize="sm"
        fontWeight="700"
      >
        🟢 Contest is LIVE — Good luck!
      </Box>
    );
  }

  if (statusNow === "ENDED") return null;
  if (!remaining) return null;

  return (
    <Box
      style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)" }}
      color="white"
      py={5}
      textAlign="center"
    >
      <Text fontSize="xs" fontWeight="600" opacity={0.7} mb={2} letterSpacing="1px" textTransform="uppercase">
        Contest starts in
      </Text>
      <HStack justify="center" gap={3}>
        {remaining.days > 0 && <CountdownUnit value={remaining.days} label="Days" />}
        <CountdownUnit value={remaining.hours} label="Hours" />
        <Box fontSize="2xl" fontWeight="800" opacity={0.5} pt={0}>:</Box>
        <CountdownUnit value={remaining.minutes} label="Min" />
        <Box fontSize="2xl" fontWeight="800" opacity={0.5} pt={0}>:</Box>
        <CountdownUnit value={remaining.seconds} label="Sec" />
      </HStack>
    </Box>
  );
};

const CountdownWaiting = ({ contest, onExpire }) => {
  const remaining = useCountdown(contest?.startTime, onExpire);

  if (!remaining) {
    return (
      <VStack py={16} gap={3}>
        <Spinner size="lg" color="purple.500" />
        <Text color="gray.500" fontWeight="600">Loading problems...</Text>
      </VStack>
    );
  }

  return (
    <VStack py={16} gap={4}>
      <Box
        w={16}
        h={16}
        borderRadius="full"
        bg="purple.50"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Clock size={32} color="#7c3aed" />
      </Box>
      <Text color="gray.700" fontWeight="700" fontSize="lg">
        Problems will be revealed soon
      </Text>
      <Text color="gray.400" fontSize="sm" textAlign="center" maxW="400px">
        You are registered! Problems will become available when the contest starts.
      </Text>
      <HStack gap={2} mt={2}>
        {remaining.days > 0 && (
          <Box textAlign="center" bg="purple.50" borderRadius="lg" px={3} py={2}>
            <Text fontFamily="'JetBrains Mono', monospace" fontSize="xl" fontWeight="800" color="purple.700">
              {String(remaining.days).padStart(2, "0")}
            </Text>
            <Text fontSize="9px" color="purple.400" fontWeight="600" textTransform="uppercase">Days</Text>
          </Box>
        )}
        <Box textAlign="center" bg="purple.50" borderRadius="lg" px={3} py={2}>
          <Text fontFamily="'JetBrains Mono', monospace" fontSize="xl" fontWeight="800" color="purple.700">
            {String(remaining.hours).padStart(2, "0")}
          </Text>
          <Text fontSize="9px" color="purple.400" fontWeight="600" textTransform="uppercase">Hrs</Text>
        </Box>
        <Text fontSize="xl" fontWeight="800" color="purple.300">:</Text>
        <Box textAlign="center" bg="purple.50" borderRadius="lg" px={3} py={2}>
          <Text fontFamily="'JetBrains Mono', monospace" fontSize="xl" fontWeight="800" color="purple.700">
            {String(remaining.minutes).padStart(2, "0")}
          </Text>
          <Text fontSize="9px" color="purple.400" fontWeight="600" textTransform="uppercase">Min</Text>
        </Box>
        <Text fontSize="xl" fontWeight="800" color="purple.300">:</Text>
        <Box textAlign="center" bg="purple.50" borderRadius="lg" px={3} py={2}>
          <Text fontFamily="'JetBrains Mono', monospace" fontSize="xl" fontWeight="800" color="purple.700">
            {String(remaining.seconds).padStart(2, "0")}
          </Text>
          <Text fontSize="9px" color="purple.400" fontWeight="600" textTransform="uppercase">Sec</Text>
        </Box>
      </HStack>
    </VStack>
  );
};

// ─── Section tabs ──────────────────────────────────────────────────────────────

const TABS = ["Problems", "Leaderboard"];

// ─── Leaderboard table ─────────────────────────────────────────────────────────

const LeaderboardTable = ({ contestId, problems }) => {
  const { showMessage } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(
    async (quiet = false) => {
      try {
        if (!quiet) setLoading(true);
        else setRefreshing(true);
        const resp = await ApiService.getContestLeaderboard(contestId);
        if (resp.statusCode === 200) setData(resp.data);
      } catch (err) {
        showMessage(err.response?.data?.message || err.message, "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [contestId],
  );

  useEffect(() => {
    fetch();
    const interval = setInterval(() => fetch(true), 30000);
    return () => clearInterval(interval);
  }, [fetch]);

  if (loading)
    return (
      <VStack py={12} gap={3}>
        <Spinner color="purple.500" size="lg" />
        <Text color="gray.400" fontSize="sm">Loading leaderboard...</Text>
      </VStack>
    );

  const entries = data?.entries ?? [];

  return (
    <VStack align="stretch" gap={3}>
      <HStack justify="space-between">
        <Text fontSize="sm" color="gray.500">
          {data?.totalParticipants ?? 0} participants ·{" "}
          <Box as="span" fontSize="xs" color="gray.400">
            updates every 30s
          </Box>
        </Text>
        <Button
          size="xs"
          variant="ghost"
          colorScheme="purple"
          onClick={() => fetch(true)}
          loading={refreshing}
          gap={1}
        >
          <RefreshCw size={12} />
          Refresh
        </Button>
      </HStack>

      <Box borderRadius="xl" overflow="hidden" border="1px solid" borderColor="gray.200">
        <Table.Root variant="line" size="sm">
          <Table.Header bg="purple.50">
            <Table.Row>
              <Table.ColumnHeader w="6%" textAlign="center">
                <Text fontWeight="bold" color="purple.700" fontSize="xs">Rank</Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="24%">
                <Text fontWeight="bold" color="purple.700" fontSize="xs">Participant</Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="10%" textAlign="center">
                <Text fontWeight="bold" color="purple.700" fontSize="xs">Solved</Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="12%" textAlign="center">
                <Text fontWeight="bold" color="purple.700" fontSize="xs">Penalty</Text>
              </Table.ColumnHeader>
              {(problems ?? []).map((p) => (
                <Table.ColumnHeader key={p.problemId} textAlign="center" w="8%">
                  <Text fontWeight="bold" color="purple.700" fontSize="xs">
                    {String.fromCharCode(64 + (p.problemOrder ?? 1))}
                  </Text>
                </Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {entries.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={4 + (problems?.length ?? 0)} textAlign="center" py={10}>
                  <VStack gap={2}>
                    <Trophy size={28} color="#D1D5DB" />
                    <Text color="gray.400" fontSize="sm">No submissions yet</Text>
                  </VStack>
                </Table.Cell>
              </Table.Row>
            ) : (
              entries.map((entry, idx) => {
                const rankIcon =
                  entry.rank === 1 ? "🥇" :
                  entry.rank === 2 ? "🥈" :
                  entry.rank === 3 ? "🥉" : null;

                return (
                  <Table.Row
                    key={entry.userId}
                    bg={idx % 2 === 0 ? "white" : "gray.50"}
                    _hover={{ bg: "purple.50" }}
                    transition="background 0.1s"
                  >
                    <Table.Cell textAlign="center">
                      {rankIcon ? (
                        <Text fontSize="lg">{rankIcon}</Text>
                      ) : (
                        <Text fontSize="sm" fontWeight="700" color="gray.500">
                          {entry.rank}
                        </Text>
                      )}
                    </Table.Cell>

                    <Table.Cell>
                      <Text fontSize="sm" fontWeight="600" color="gray.800">
                        {entry.username}
                      </Text>
                    </Table.Cell>

                    <Table.Cell textAlign="center">
                      <Text fontSize="sm" fontWeight="700" color="green.600">
                        {entry.problemsSolved ?? 0}
                      </Text>
                    </Table.Cell>

                    <Table.Cell textAlign="center">
                      <Text fontSize="sm" color="gray.600">
                        {fmtMins(entry.penaltyTime)}
                      </Text>
                    </Table.Cell>

                    {(problems ?? []).map((p) => {
                      const ps = (entry.problemScores ?? []).find(
                        (s) => s.problemId === p.problemId,
                      );
                      return (
                        <Table.Cell key={p.problemId} textAlign="center">
                          {ps ? (
                            ps.solved ? (
                              <VStack gap={0}>
                                <CheckCircle size={14} color="#16a34a" />
                                <Text fontSize="10px" color="gray.500">
                                  {ps.attempts > 0 ? `+${ps.attempts}` : ""}
                                  {" "}{fmtMins(ps.penaltyMinutes)}
                                </Text>
                              </VStack>
                            ) : (
                              <Text fontSize="xs" color="red.400">
                                -{ps.attempts}
                              </Text>
                            )
                          ) : (
                            <Text color="gray.300" fontSize="xs">—</Text>
                          )}
                        </Table.Cell>
                      );
                    })}
                  </Table.Row>
                );
              })
            )}
          </Table.Body>
        </Table.Root>
      </Box>
    </VStack>
  );
};

// ─── Main page ─────────────────────────────────────────────────────────────────

const ContestDetailPage = () => {
  const { slug } = useParams();
  const navigate  = useNavigate();
  const { showMessage } = useToast();

  const [contest, setContest]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [registering, setRegistering] = useState(false);
  const [unregistering, setUnregistering] = useState(false);
  const [registered, setRegistered]  = useState(false);
  const [activeTab, setActiveTab]   = useState("Problems");

  // Extracted so we can re-call it when countdown expires
  const reload = useCallback(async () => {
    try {
      const resp = await ApiService.getContestBySlug(slug);
      if (resp.statusCode === 200) {
        setContest(resp.data);

        if (ApiService.isAuthenticated() && !ApiService.isAdmin() && !ApiService.isCreator()) {
          try {
            const regResp = await ApiService.isRegisteredForContest(resp.data.id);
            if (regResp.statusCode === 200) {
              setRegistered(regResp.data === true);
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    }
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const resp = await ApiService.getContestBySlug(slug);
        if (cancelled) return;
        if (resp.statusCode === 200) {
          setContest(resp.data);

          // Check registration status for authenticated non-admin/creator users
          if (ApiService.isAuthenticated() && !ApiService.isAdmin() && !ApiService.isCreator()) {
            try {
              const regResp = await ApiService.isRegisteredForContest(resp.data.id);
              if (!cancelled && regResp.statusCode === 200) {
                setRegistered(regResp.data === true);
              }
            } catch (_) {
              // silently ignore — user might not be logged in with a valid token
            }
          }
        }
      } catch (err) {
        if (!cancelled)
          showMessage(err.response?.data?.message || err.message, "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [slug]);

  const handleRegister = async () => {
    if (!ApiService.isAuthenticated()) {
      navigate("/login");
      return;
    }
    try {
      setRegistering(true);
      const resp = await ApiService.registerForContest(contest.id);
      if (resp.statusCode === 200) {
        setRegistered(true);
        showMessage("Successfully registered!", "success");
        setContest((c) => ({
          ...c,
          totalParticipants: (c.totalParticipants ?? 0) + 1,
        }));
      }
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = async () => {
    try {
      setUnregistering(true);
      const resp = await ApiService.unregisterFromContest(contest.id);
      if (resp.statusCode === 200) {
        setRegistered(false);
        showMessage("Successfully unregistered!", "success");
        setContest((c) => ({
          ...c,
          totalParticipants: Math.max(0, (c.totalParticipants ?? 1) - 1),
        }));
      }
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    } finally {
      setUnregistering(false);
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

  if (!contest) {
    return (
      <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
        <VStack gap={3}>
          <Trophy size={48} color="#D1D5DB" />
          <Text color="gray.500" fontSize="lg">Contest not found</Text>
          <Button variant="ghost" colorScheme="purple" onClick={() => navigate("/contests")}>
            Back to contests
          </Button>
        </VStack>
      </Box>
    );
  }

  const status  = statusOf(contest);
  const s       = STATUS[status];
  const canEdit = ApiService.isAdmin() || ApiService.isCreator();
  const problems = contest.problems ?? [];

  return (
    <Box minH="100vh" bg="gray.50" pb={12}>
      {/* Pulse keyframe */}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* Banner */}
      <Box
        style={{ background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #6366f1 100%)" }}
        py={12}
        px={8}
        color="white"
        position="relative"
        overflow="hidden"
      >
        <Box
          position="absolute"
          inset={0}
          opacity={0.08}
          backgroundImage="radial-gradient(circle, white 1px, transparent 1px)"
          backgroundSize="40px 40px"
        />
        <Container maxW="container.xl" position="relative">
          <VStack align="stretch" gap={5}>
            <Box
              as="button"
              display="inline-flex"
              alignItems="center"
              gap={2}
              color="whiteAlpha.700"
              fontSize="sm"
              _hover={{ color: "white" }}
              onClick={() => navigate("/contests")}
              style={{ outline: "none", width: "fit-content" }}
            >
              <ArrowLeft size={16} />
              All Contests
            </Box>

            <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={4}>
              <VStack align="start" gap={2}>
                {/* Status pill */}
                <HStack gap={2}>
                  <Box
                    display="inline-flex"
                    alignItems="center"
                    gap={1}
                    px={3}
                    py="3px"
                    borderRadius="full"
                    fontSize="xs"
                    fontWeight="700"
                    bg="whiteAlpha.200"
                    color="white"
                  >
                    {status === "RUNNING" && (
                      <Box
                        as="span"
                        w="6px"
                        h="6px"
                        borderRadius="full"
                        bg="#4ade80"
                        display="inline-block"
                        style={{ animation: "pulse 1.5s infinite" }}
                      />
                    )}
                    {s.label}
                  </Box>
                  {contest.isRated && (
                    <Badge bg="whiteAlpha.200" color="yellow.200" px={2} py="2px" borderRadius="full" fontSize="xs">
                      ⭐ Rated
                    </Badge>
                  )}
                  <Badge bg="whiteAlpha.200" color="white" px={2} py="2px" borderRadius="full" fontSize="xs">
                    ICPC
                  </Badge>
                </HStack>

                <Heading size="3xl" fontWeight="900">
                  {contest.name}
                </Heading>

                {contest.description && (
                  <Text fontSize="md" opacity={0.8} maxW="600px">
                    {contest.description}
                  </Text>
                )}

                {/* Meta row */}
                <HStack gap={5} flexWrap="wrap" mt={1}>
                  <HStack gap={1} opacity={0.8}>
                    <Calendar size={14} />
                    <Text fontSize="sm">{fmt(contest.startTime)}</Text>
                  </HStack>
                  <HStack gap={1} opacity={0.8}>
                    <Clock size={14} />
                    <Text fontSize="sm">Until {fmt(contest.endTime)}</Text>
                  </HStack>
                  <HStack gap={1} opacity={0.8}>
                    <Users size={14} />
                    <Text fontSize="sm">
                      {contest.totalParticipants ?? 0}
                      {contest.maxParticipant ? ` / ${contest.maxParticipant}` : ""} registered
                    </Text>
                  </HStack>
                  <HStack gap={1} opacity={0.8}>
                    {contest.isPublic ? <Globe size={14} /> : <Lock size={14} />}
                    <Text fontSize="sm">{contest.isPublic ? "Public" : "Private"}</Text>
                  </HStack>
                </HStack>
              </VStack>

              {/* Register / Unregister button */}
              {!canEdit && (
                <Box>
                  {registered ? (
                    status === "UPCOMING" ? (
                      <VStack gap={2}>
                        <HStack
                          px={6}
                          py={3}
                          bg="green.400"
                          borderRadius="xl"
                          gap={2}
                        >
                          <CheckCircle size={18} />
                          <Text fontWeight="700">Registered!</Text>
                        </HStack>
                        <Button
                          size="sm"
                          bg="whiteAlpha.200"
                          color="white"
                          fontWeight="600"
                          borderRadius="lg"
                          _hover={{ bg: "red.500" }}
                          loading={unregistering}
                          loadingText="Unregistering..."
                          onClick={handleUnregister}
                          gap={2}
                        >
                          <XCircle size={14} />
                          Unregister
                        </Button>
                      </VStack>
                    ) : (
                      <HStack
                        px={6}
                        py={3}
                        bg="green.400"
                        borderRadius="xl"
                        gap={2}
                      >
                        <CheckCircle size={18} />
                        <Text fontWeight="700">Registered!</Text>
                      </HStack>
                    )
                  ) : status === "ENDED" ? (
                    <Button
                      size="lg"
                      bg="white"
                      color="purple.700"
                      fontWeight="800"
                      borderRadius="xl"
                      px={8}
                      _hover={{ bg: "purple.50" }}
                      onClick={() => setActiveTab("Leaderboard")}
                      gap={2}
                    >
                      <Trophy size={18} />
                      View Results
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      bg="white"
                      color="purple.700"
                      fontWeight="800"
                      borderRadius="xl"
                      px={8}
                      _hover={{ bg: "purple.50" }}
                      loading={registering}
                      loadingText="Registering..."
                      onClick={handleRegister}
                      gap={2}
                    >
                      <Medal size={18} />
                      Register Now
                    </Button>
                  )}
                </Box>
              )}

              {canEdit && (
                <Button
                  size="md"
                  bg="whiteAlpha.200"
                  color="white"
                  _hover={{ bg: "whiteAlpha.300" }}
                  onClick={() => navigate(`/admin/contests/edit/${contest.id}`)}
                >
                  Edit Contest
                </Button>
              )}
            </HStack>
          </VStack>
        </Container>
      </Box>

      {/* Countdown bar */}
      <ContestCountdown contest={contest} onExpire={reload} />

      {/* Body */}
      <Container maxW="container.xl" mt={8}>
        {/* Tab bar */}
        <HStack
          gap={0}
          bg="white"
          borderRadius="xl"
          boxShadow="sm"
          border="1px solid"
          borderColor="gray.200"
          p={1}
          mb={6}
          display="inline-flex"
        >
          {TABS.map((tab) => (
            <Box
              key={tab}
              as="button"
              px={5}
              py={2}
              borderRadius="lg"
              fontSize="sm"
              fontWeight="600"
              bg={activeTab === tab ? "purple.600" : "transparent"}
              color={activeTab === tab ? "white" : "gray.500"}
              transition="all 0.15s"
              _hover={activeTab !== tab ? { bg: "purple.50", color: "purple.600" } : {}}
              onClick={() => setActiveTab(tab)}
              style={{ outline: "none" }}
              gap={2}
              display="flex"
              alignItems="center"
            >
              {tab === "Problems" ? <BookOpen size={14} /> : <ListOrdered size={14} />}
              {tab}
              {tab === "Problems" && (
                <Badge
                  ml={1}
                  bg={activeTab === tab ? "whiteAlpha.300" : "purple.100"}
                  color={activeTab === tab ? "white" : "purple.700"}
                  borderRadius="full"
                  px={2}
                  fontSize="xs"
                >
                  {problems.length}
                </Badge>
              )}
            </Box>
          ))}
        </HStack>

        {/* Tab content */}
        {activeTab === "Problems" && (
          <Box bg="white" borderRadius="xl" boxShadow="sm" border="1px solid" borderColor="gray.200" overflow="hidden">
            {problems.length === 0 ? (
              canEdit ? (
                <VStack py={16} gap={3}>
                  <BookOpen size={40} color="#D1D5DB" />
                  <Text color="gray.400">No problems added yet</Text>
                </VStack>
              ) : !registered ? (
                <VStack py={16} gap={3}>
                  <Lock size={40} color="#D1D5DB" />
                  <Text color="gray.500" fontWeight="600" fontSize="lg">
                    Problems are locked
                  </Text>
                  <Text color="gray.400" fontSize="sm" textAlign="center" maxW="400px">
                    Register for this contest to view the problems once the contest starts.
                  </Text>
                  {status !== "ENDED" && (
                    <Button
                      mt={2}
                      colorScheme="purple"
                      onClick={handleRegister}
                      loading={registering}
                      loadingText="Registering..."
                      gap={2}
                    >
                      <Medal size={16} />
                      Register Now
                    </Button>
                  )}
                </VStack>
              ) : status === "UPCOMING" ? (
                <CountdownWaiting contest={contest} onExpire={reload} />
              ) : (
                <VStack py={16} gap={3}>
                  <BookOpen size={40} color="#D1D5DB" />
                  <Text color="gray.400">No problems added yet</Text>
                </VStack>
              )
            ) : (
              <Table.Root variant="line" size="md">
                <Table.Header bg="purple.50">
                  <Table.Row>
                    <Table.ColumnHeader w="8%" textAlign="center">
                      <Text fontWeight="bold" color="purple.700" fontSize="sm">#</Text>
                    </Table.ColumnHeader>
                    <Table.ColumnHeader>
                      <Text fontWeight="bold" color="purple.700" fontSize="sm">Problem</Text>
                    </Table.ColumnHeader>
                    <Table.ColumnHeader w="15%">
                      <Text fontWeight="bold" color="purple.700" fontSize="sm">Difficulty</Text>
                    </Table.ColumnHeader>
                    <Table.ColumnHeader w="12%" textAlign="center">
                      <Text fontWeight="bold" color="purple.700" fontSize="sm">Points</Text>
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {problems.map((p, idx) => (
                    <Table.Row
                      key={p.problemId}
                      _hover={{ bg: "purple.50", cursor: "pointer" }}
                      transition="background 0.1s"
                      bg={idx % 2 === 0 ? "white" : "gray.50"}
                      onClick={() => navigate(`/problems/${p.problemSlug}?contestId=${contest.id}`)}
                    >
                      <Table.Cell textAlign="center">
                        <Box
                          w={8}
                          h={8}
                          borderRadius="full"
                          bg="purple.100"
                          color="purple.700"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          fontWeight="800"
                          fontSize="sm"
                          mx="auto"
                        >
                          {String.fromCharCode(64 + (p.problemOrder ?? idx + 1))}
                        </Box>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm" fontWeight="600" color="gray.800">
                          {p.problemTitle}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        {p.problemDifficulty ? (
                          <Badge
                            colorScheme={
                              p.problemDifficulty === "EASY"
                                ? "green"
                                : p.problemDifficulty === "MEDIUM"
                                ? "orange"
                                : "red"
                            }
                            variant="subtle"
                            fontSize="xs"
                            borderRadius="full"
                            px={2}
                          >
                            {p.problemDifficulty.charAt(0) +
                              p.problemDifficulty.slice(1).toLowerCase()}
                          </Badge>
                        ) : (
                          <Text color="gray.300" fontSize="sm">—</Text>
                        )}
                      </Table.Cell>
                      <Table.Cell textAlign="center">
                        <Text fontSize="sm" fontWeight="600" color="gray.700">
                          {p.points ?? "—"}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Box>
        )}

        {activeTab === "Leaderboard" && (
          <LeaderboardTable contestId={contest.id} problems={problems} />
        )}
      </Container>
    </Box>
  );
};

export default ContestDetailPage;
