import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Text,
  Badge,
  HStack,
  VStack,
  Spinner,
  Button,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import {
  Trophy,
  Star,
  Mail,
  User,
  Award,
  CheckCircle,
  Target,
  TrendingUp,
  Zap,
  Code2,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (u) => (u ? u.substring(0, 2).toUpperCase() : "U");

const getRoleBadgeColor = (name) => {
  switch (name) {
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

// ─── Heatmap helpers ──────────────────────────────────────────────────────────

const HEAT_COLORS = ["#EDE9FE", "#C084FC", "#A855F7", "#7C3AED", "#4C1D95"];

const buildHeatmapData = (activity) => {
  const map = {};
  (activity || []).forEach((a) => {
    map[a.activityDate] = a.submissionsCount;
  });

  const cells = [];
  const today = new Date();
  for (let week = 51; week >= 0; week--) {
    for (let day = 0; day < 7; day++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (week * 7 + (6 - day)));
      const key = d.toISOString().split("T")[0];
      const count = map[key] || 0;
      cells.push({
        date: key,
        count,
        level:
          count === 0
            ? 0
            : count <= 2
              ? 1
              : count <= 5
                ? 2
                : count <= 8
                  ? 3
                  : 4,
      });
    }
  }
  return cells;
};

const fmtDate = (dateStr) =>
  new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// ─── StatTile ─────────────────────────────────────────────────────────────────

const StatTile = ({ icon: Icon, iconColor, label, value, sub }) => (
  <Box
    flex={1}
    minW="120px"
    bg="white"
    borderRadius="xl"
    p={4}
    border="1px solid"
    borderColor="gray.100"
    boxShadow="sm"
  >
    <HStack gap={3} align="flex-start">
      <Box
        p={2}
        borderRadius="lg"
        bg={iconColor + "22"}
        color={iconColor}
        flexShrink={0}
      >
        <Icon size={18} />
      </Box>
      <VStack align="flex-start" gap={0}>
        <Text fontSize="xs" color="gray.500" fontWeight="500">
          {label}
        </Text>
        <Text fontSize="xl" fontWeight="800" color="gray.800" lineHeight="1.2">
          {value ?? "—"}
        </Text>
        {sub && (
          <Text fontSize="xs" color="gray.400">
            {sub}
          </Text>
        )}
      </VStack>
    </HStack>
  </Box>
);

// ─── ProfilePage ──────────────────────────────────────────────────────────────

const ProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { showMessage } = useToast();

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!username) return;
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [userRes, statsRes, activityRes] = await Promise.all([
          ApiService.getUserByUsername(username),
          ApiService.getUserStatistics(username),
          ApiService.getUserActivity(username),
        ]);
        if (userRes.statusCode === 200) setUser(userRes.data);
        if (statsRes.statusCode === 200) setStats(statsRes.data);
        if (activityRes.statusCode === 200) setActivity(activityRes.data);
      } catch (err) {
        showMessage(err.response?.data?.message || err.message, "error");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [username]);

  if (loading) {
    return (
      <Box minH="100vh" bg="#F8F7FF" py={8}>
        <Container maxW="container.xl">
          <VStack gap={4} py={20}>
            <Spinner size="xl" color="purple.500" thickness="4px" />
            <Text color="gray.600">Loading profile...</Text>
          </VStack>
        </Container>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box minH="100vh" bg="#F8F7FF" py={8}>
        <Container maxW="container.xl">
          <VStack gap={4} py={20}>
            <Text fontSize="2xl" color="gray.600">
              User not found
            </Text>
            <Button colorScheme="purple" onClick={() => navigate("/users")}>
              Back to Users
            </Button>
          </VStack>
        </Container>
      </Box>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────────
  const solved = stats?.problemsSolved ?? 0;
  const total = stats?.totalSubmissions ?? 0;
  const accepted = stats?.acceptedSubmissions ?? 0;
  const accRate = stats?.acceptanceRate ?? 0;
  const practPts = stats?.practicePoints ?? 0;
  const contestPts = stats?.contestPoints ?? 0;
  const totalPts = stats?.totalPoints ?? user.point ?? 0;
  const rating = stats?.currentRating ?? user.rating ?? 0;
  const maxRating = stats?.maxRating ?? 0;
  const heatmap = buildHeatmapData(activity);
  const totalActivitySubmissions = heatmap.reduce((s, d) => s + d.count, 0);
  const activeDays = activity.filter((a) => a.submissionsCount > 0).length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Box minH="100vh" bg="#F8F7FF" py={8}>
      <Container maxW="container.xl">
        <Grid templateColumns={{ base: "1fr", lg: "300px 1fr" }} gap={6}>
          {/* ── LEFT SIDEBAR ───────────────────────────────────────────── */}
          <GridItem>
            <VStack align="stretch" gap={5}>
              {/* Identity card */}
              <Box
                bg="white"
                borderRadius="2xl"
                boxShadow="sm"
                overflow="hidden"
              >
                {/* Purple banner */}
                <Box
                  h="60px"
                  bg="linear-gradient(135deg, #6D28D9 0%, #A855F7 100%)"
                />
                <Box px={5} pb={5}>
                  {/* Avatar overlapping banner */}
                  <Box mt="-36px" mb={3}>
                    {user.profileUrl ? (
                      <Box
                        as="img"
                        src={user.profileUrl}
                        alt={user.username}
                        w="72px"
                        h="72px"
                        borderRadius="full"
                        objectFit="cover"
                        border="4px solid white"
                        boxShadow="md"
                        display="block"
                      />
                    ) : (
                      <Box
                        w="72px"
                        h="72px"
                        borderRadius="full"
                        bg="purple.500"
                        color="white"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        fontSize="xl"
                        fontWeight="800"
                        border="4px solid white"
                        boxShadow="md"
                      >
                        {getInitials(user.username)}
                      </Box>
                    )}
                  </Box>

                  <Text
                    fontSize="lg"
                    fontWeight="800"
                    color="gray.800"
                    mb={0.5}
                  >
                    {user.username}
                  </Text>
                  {user.name && (
                    <Text fontSize="sm" color="gray.500" mb={2}>
                      {user.name}
                    </Text>
                  )}

                  <HStack gap={1.5} flexWrap="wrap" mb={3}>
                    {(user.roles || []).map((role) => (
                      <Badge
                        key={role.id}
                        colorScheme={getRoleBadgeColor(role.name)}
                        fontSize="10px"
                        px={2}
                        py="2px"
                        borderRadius="full"
                        fontWeight="700"
                      >
                        {role.name}
                      </Badge>
                    ))}
                    <Badge
                      colorScheme={user.isActive ? "green" : "red"}
                      fontSize="10px"
                      px={2}
                      py="2px"
                      borderRadius="full"
                      fontWeight="700"
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </HStack>

                  <VStack align="stretch" gap={2}>
                    <HStack gap={2} color="gray.500">
                      <Mail size={13} />
                      <Text fontSize="xs" wordBreak="break-all">
                        {user.email}
                      </Text>
                    </HStack>
                    <HStack gap={2} color="gray.500">
                      <User size={13} />
                      <Text fontSize="xs">User #{user.id}</Text>
                    </HStack>
                  </VStack>

                  {user.about && (
                    <Box
                      mt={4}
                      pt={4}
                      borderTopWidth="1px"
                      borderColor="gray.100"
                    >
                      <Text fontSize="sm" color="gray.600" lineHeight="1.6">
                        {user.about}
                      </Text>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Rating card */}
              <Box
                bg="linear-gradient(135deg, #6D28D9 0%, #A855F7 100%)"
                borderRadius="2xl"
                boxShadow="sm"
                p={5}
                color="white"
              >
                <HStack gap={2} mb={3}>
                  <Star size={15} />
                  <Text fontSize="xs" fontWeight="700" letterSpacing="0.06em">
                    RATING
                  </Text>
                </HStack>
                <Text fontSize="3xl" fontWeight="900" lineHeight="1">
                  {rating}
                </Text>
                {maxRating > 0 && (
                  <Text fontSize="xs" opacity={0.65} mt={1}>
                    Peak: {maxRating}
                  </Text>
                )}
              </Box>

              {/* Points breakdown */}
              <Box bg="white" borderRadius="2xl" boxShadow="sm" p={5}>
                <HStack gap={2} mb={4}>
                  <Trophy size={15} color="#7C3AED" />
                  <Text
                    fontSize="xs"
                    fontWeight="700"
                    color="gray.600"
                    letterSpacing="0.06em"
                  >
                    POINTS BREAKDOWN
                  </Text>
                </HStack>
                <VStack align="stretch" gap={3}>
                  {[
                    { label: "Practice", value: practPts, color: "#7C3AED" },
                    { label: "Contest", value: contestPts, color: "#F59E0B" },
                  ].map(({ label, value, color }) => (
                    <HStack key={label} justify="space-between">
                      <Text fontSize="sm" color="gray.500">
                        {label}
                      </Text>
                      <Text fontSize="sm" fontWeight="700" color={color}>
                        {value}
                      </Text>
                    </HStack>
                  ))}
                  <Box borderTopWidth="1px" borderColor="gray.100" pt={3}>
                    <HStack justify="space-between">
                      <Text fontSize="sm" fontWeight="600" color="gray.700">
                        Total
                      </Text>
                      <Text fontSize="lg" fontWeight="800" color="#10B981">
                        {totalPts}
                      </Text>
                    </HStack>
                  </Box>
                </VStack>
              </Box>
            </VStack>
          </GridItem>

          {/* ── RIGHT MAIN ─────────────────────────────────────────────── */}
          <GridItem>
            <VStack align="stretch" gap={5}>
              {/* Top stat tiles */}
              <HStack gap={3} flexWrap="wrap">
                <StatTile
                  icon={CheckCircle}
                  iconColor="#10B981"
                  label="Problems Solved"
                  value={solved}
                />
                <StatTile
                  icon={Code2}
                  iconColor="#7C3AED"
                  label="Total Submissions"
                  value={total}
                  sub={`${accepted} accepted`}
                />
                <StatTile
                  icon={Target}
                  iconColor="#F59E0B"
                  label="Acceptance Rate"
                  value={`${accRate}%`}
                />
                <StatTile
                  icon={Zap}
                  iconColor="#EF4444"
                  label="Active Days"
                  value={activeDays}
                  sub="last 12 months"
                />
              </HStack>

              {/* Submission stats grid */}
              <Box bg="white" borderRadius="2xl" boxShadow="sm" p={5}>
                <HStack gap={2} mb={4}>
                  <Award size={15} color="#7C3AED" />
                  <Text
                    fontSize="xs"
                    fontWeight="700"
                    color="gray.600"
                    letterSpacing="0.06em"
                  >
                    SUBMISSION STATISTICS
                  </Text>
                </HStack>
                <Grid templateColumns="repeat(3, 1fr)" gap={3}>
                  {[
                    { label: "Total Submissions", value: total },
                    { label: "Accepted", value: accepted },
                    { label: "Acceptance Rate", value: `${accRate}%` },
                    { label: "Problems Solved", value: solved },
                    { label: "Practice Points", value: practPts },
                    { label: "Contest Points", value: contestPts },
                  ].map(({ label, value }) => (
                    <Box
                      key={label}
                      bg="purple.50"
                      borderRadius="xl"
                      p={3}
                      textAlign="center"
                    >
                      <Text
                        fontSize="xl"
                        fontWeight="800"
                        color="purple.700"
                        lineHeight="1.1"
                      >
                        {value}
                      </Text>
                      <Text fontSize="xs" color="gray.500" mt={0.5}>
                        {label}
                      </Text>
                    </Box>
                  ))}
                </Grid>
              </Box>

              {/* Activity heatmap */}
              <Box bg="white" borderRadius="2xl" boxShadow="sm" p={5}>
                <HStack justify="space-between" mb={4}>
                  <HStack gap={2}>
                    <TrendingUp size={15} color="#7C3AED" />
                    <Text
                      fontSize="xs"
                      fontWeight="700"
                      color="gray.600"
                      letterSpacing="0.06em"
                    >
                      SUBMISSION ACTIVITY
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color="gray.400">
                    {totalActivitySubmissions} submissions in the last year
                  </Text>
                </HStack>

                <Box overflowX="auto" pb={1}>
                  <HStack gap="3px" align="start" display="inline-flex">
                    {Array.from({ length: 52 }).map((_, wk) => (
                      <VStack key={wk} gap="3px">
                        {Array.from({ length: 7 }).map((_, dy) => {
                          const cell = heatmap[wk * 7 + dy];
                          if (!cell) return <Box key={dy} w="11px" h="11px" />;
                          return (
                            <Box
                              key={dy}
                              w="11px"
                              h="11px"
                              borderRadius="2px"
                              bg={HEAT_COLORS[cell.level]}
                              cursor={cell.count > 0 ? "pointer" : "default"}
                              _hover={{ opacity: 0.7 }}
                              onMouseEnter={(e) => {
                                if (cell.count > 0)
                                  setTooltip({
                                    text: `${cell.count} submission${cell.count !== 1 ? "s" : ""} · ${fmtDate(cell.date)}`,
                                    x: e.clientX,
                                    y: e.clientY,
                                  });
                              }}
                              onMouseLeave={() => setTooltip(null)}
                            />
                          );
                        })}
                      </VStack>
                    ))}
                  </HStack>
                </Box>

                {/* Legend */}
                <HStack justify="flex-end" gap={1} mt={3} align="center">
                  <Text fontSize="10px" color="gray.400">
                    Less
                  </Text>
                  {HEAT_COLORS.map((c) => (
                    <Box key={c} w="10px" h="10px" bg={c} borderRadius="2px" />
                  ))}
                  <Text fontSize="10px" color="gray.400">
                    More
                  </Text>
                </HStack>
              </Box>
            </VStack>
          </GridItem>
        </Grid>
      </Container>

      {/* Heatmap tooltip */}
      {tooltip && (
        <Box
          position="fixed"
          left={tooltip.x + 14}
          top={tooltip.y - 36}
          bg="gray.800"
          color="white"
          fontSize="xs"
          px={3}
          py={1.5}
          borderRadius="md"
          boxShadow="lg"
          pointerEvents="none"
          zIndex={9999}
          whiteSpace="nowrap"
        >
          {tooltip.text}
        </Box>
      )}
    </Box>
  );
};

export default ProfilePage;
