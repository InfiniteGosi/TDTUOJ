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

// ─── Language Donut Chart (pure SVG) ────────────────────────────────────────

const LANG_COLORS = {
  CPP:    "#4f46e5",
  C:      "#06b6d4",
  JAVA:   "#f59e0b",
  PYTHON: "#10b981",
};
const LANG_LABELS = { CPP: "C++", C: "C", JAVA: "Java", PYTHON: "Python" };

const LanguageDonutChart = ({ langStats }) => {
  const [hovered, setHovered] = useState(null);
  const entries = Object.entries(langStats).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + Number(v), 0);
  if (total === 0) return null;

  const R = 70, cx = 90, cy = 90, strokeW = 26;
  const circumference = 2 * Math.PI * R;
  let offset = 0;

  const segments = entries.map(([lang, count]) => {
    const pct = Number(count) / total;
    const dash = pct * circumference;
    const seg = { lang, count: Number(count), pct, dash, offset, color: LANG_COLORS[lang] || "#6b7280" };
    offset += dash;
    return seg;
  });

  return (
    <Box display="flex" alignItems="center" gap={6} flexWrap="wrap">
      {/* Donut */}
      <Box flexShrink={0}>
        <svg width={180} height={180} viewBox="0 0 180 180">
          {/* Background ring */}
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f3f4f6" strokeWidth={strokeW} />
          {segments.map((seg) => (
            <circle
              key={seg.lang}
              cx={cx} cy={cy} r={R}
              fill="none"
              stroke={seg.color}
              strokeWidth={hovered === seg.lang ? strokeW + 4 : strokeW}
              strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
              strokeDashoffset={-seg.offset + circumference / 4}
              style={{ cursor: "pointer", transition: "stroke-width 0.15s", transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
              onMouseEnter={() => setHovered(seg.lang)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          {/* Center label */}
          {hovered ? (
            <>
              <text x={cx} y={cy - 8} textAnchor="middle" fontSize="11" fill="#374151" fontWeight="700">
                {LANG_LABELS[hovered] || hovered}
              </text>
              <text x={cx} y={cy + 8} textAnchor="middle" fontSize="18" fill="#111827" fontWeight="900">
                {segments.find(s => s.lang === hovered)?.count}
              </text>
              <text x={cx} y={cy + 22} textAnchor="middle" fontSize="10" fill="#9ca3af">
                {Math.round((segments.find(s => s.lang === hovered)?.pct ?? 0) * 100)}%
              </text>
            </>
          ) : (
            <>
              <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fill="#111827" fontWeight="900">{total}</text>
              <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="#9ca3af">AC subs</text>
            </>
          )}
        </svg>
      </Box>

      {/* Legend */}
      <Box>
        {segments.map((seg) => (
          <Box key={seg.lang}
            display="flex" alignItems="center" gap={3} mb={2}
            opacity={hovered && hovered !== seg.lang ? 0.35 : 1}
            style={{ transition: "opacity 0.15s", cursor: "default" }}
            onMouseEnter={() => setHovered(seg.lang)}
            onMouseLeave={() => setHovered(null)}
          >
            <Box w="12px" h="12px" borderRadius="3px" bg={seg.color} flexShrink={0} />
            <Text fontSize="sm" fontWeight="600" color="gray.700" minW="52px">
              {LANG_LABELS[seg.lang] || seg.lang}
            </Text>
            <Text fontSize="sm" color="gray.500">
              {seg.count} ({Math.round(seg.pct * 100)}%)
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

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
// ─── RatingChart (pure SVG) ───────────────────────────────────────────────────

const RatingChart = ({ data }) => {
  const [hovered, setHovered] = useState(null);

  // Data comes newest-first from API; reverse for chronological left→right
  const points = [...data].reverse();
  if (points.length === 0) return null;

  const W = 600, H = 220, PX = 40, PY = 30;
  const chartW = W - PX * 2, chartH = H - PY * 2;

  const ratings = points.map((p) => p.newRating);
  // Include oldRating of first entry for the "starting" point
  const allRatings = [points[0].oldRating, ...ratings];
  const minR = Math.min(...allRatings) - 50;
  const maxR = Math.max(...allRatings) + 50;
  const rangeR = maxR - minR || 1;

  // Build coordinate list: first point = oldRating before first contest
  const coords = [];
  // Starting point
  coords.push({
    x: PX,
    y: PY + chartH - ((points[0].oldRating - minR) / rangeR) * chartH,
    rating: points[0].oldRating,
    label: "Start",
    idx: -1,
  });
  // Each contest result
  points.forEach((p, i) => {
    coords.push({
      x: PX + ((i + 1) / points.length) * chartW,
      y: PY + chartH - ((p.newRating - minR) / rangeR) * chartH,
      rating: p.newRating,
      change: p.ratingChange,
      label: p.contestName,
      rank: p.rank,
      idx: i,
    });
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const areaPath = linePath + ` L${coords[coords.length - 1].x},${PY + chartH} L${PX},${PY + chartH} Z`;

  // Y-axis ticks
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const val = minR + (rangeR * i) / (tickCount - 1);
    return { val: Math.round(val), y: PY + chartH - (i / (tickCount - 1)) * chartH };
  });

  return (
    <Box position="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="ratingFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines + Y labels */}
        {ticks.map((t) => (
          <g key={t.val}>
            <line x1={PX} y1={t.y} x2={W - PX} y2={t.y} stroke="#E5E7EB" strokeWidth={0.5} />
            <text x={PX - 6} y={t.y + 4} textAnchor="end" fontSize="9" fill="#9CA3AF">{t.val}</text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#ratingFill)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#7C3AED" strokeWidth={2} strokeLinejoin="round" />

        {/* Dots */}
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={hovered === i ? 5 : 3.5}
            fill={i === 0 ? "#A855F7" : (c.change >= 0 ? "#10B981" : "#EF4444")}
            stroke="white"
            strokeWidth={2}
            style={{ cursor: "pointer", transition: "r 0.15s" }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}

        {/* Tooltip */}
        {hovered !== null && (() => {
          const c = coords[hovered];
          const ttW = 130, ttH = 50;
          let tx = c.x - ttW / 2;
          if (tx < 5) tx = 5;
          if (tx + ttW > W - 5) tx = W - ttW - 5;
          const ty = c.y - ttH - 12;
          return (
            <g>
              <rect x={tx} y={ty} width={ttW} height={ttH} rx={6} fill="#1F2937" opacity={0.95} />
              <text x={tx + ttW / 2} y={ty + 16} textAnchor="middle" fontSize="10" fill="white" fontWeight="600">
                {c.label?.length > 18 ? c.label.slice(0, 18) + "…" : c.label}
              </text>
              <text x={tx + ttW / 2} y={ty + 30} textAnchor="middle" fontSize="10" fill="#D1D5DB">
                Rating: {c.rating}
              </text>
              {c.change !== undefined && (
                <text x={tx + ttW / 2} y={ty + 43} textAnchor="middle" fontSize="10"
                  fill={c.change >= 0 ? "#86EFAC" : "#FCA5A5"} fontWeight="600">
                  {c.change >= 0 ? "+" : ""}{c.change} (Rank #{c.rank})
                </text>
              )}
            </g>
          );
        })()}
      </svg>
    </Box>
  );
};

// ─── ProfilePage ──────────────────────────────────────────────────────────────

const ProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { showMessage } = useToast();

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [ratingHistory, setRatingHistory] = useState([]);
  const [langStats, setLangStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!username) return;
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [userRes, statsRes, activityRes, ratingRes, langRes] = await Promise.all([
          ApiService.getUserByUsername(username),
          ApiService.getUserStatistics(username),
          ApiService.getUserActivity(username),
          ApiService.getRatingHistory(username).catch(() => ({ statusCode: 200, data: [] })),
          ApiService.getUserLanguageStats(username).catch(() => ({ statusCode: 200, data: {} })),
        ]);
        if (userRes.statusCode === 200) setUser(userRes.data);
        if (statsRes.statusCode === 200) setStats(statsRes.data);
        if (activityRes.statusCode === 200) setActivity(activityRes.data);
        if (ratingRes.statusCode === 200) setRatingHistory(ratingRes.data || []);
        if (langRes.statusCode === 200) setLangStats(langRes.data || {});
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
                {ratingHistory.length > 0 && (() => {
                  const last = ratingHistory[0];
                  const change = last.ratingChange;
                  return (
                    <HStack mt={2} gap={1}>
                      <Text fontSize="xs" fontWeight="700"
                        color={change >= 0 ? "#86EFAC" : "#FCA5A5"}>
                        {change >= 0 ? "+" : ""}{change}
                      </Text>
                      <Text fontSize="xs" opacity={0.5}>
                        last contest
                      </Text>
                    </HStack>
                  );
                })()}
              </Box>

              {/* Total Points */}
              <Box bg="white" borderRadius="2xl" boxShadow="sm" p={5}>
                <HStack gap={2} mb={3}>
                  <Trophy size={15} color="#7C3AED" />
                  <Text
                    fontSize="xs"
                    fontWeight="700"
                    color="gray.600"
                    letterSpacing="0.06em"
                  >
                    TOTAL POINTS
                  </Text>
                </HStack>
                <Text fontSize="3xl" fontWeight="900" color="#10B981" lineHeight="1">
                  {totalPts}
                </Text>
                <Text fontSize="xs" color="gray.400" mt={1}>
                  {solved} problem{solved !== 1 ? "s" : ""} solved
                </Text>
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
                    { label: "Total Points", value: totalPts },
                    { label: "Rating", value: rating },
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

              {/* Language Distribution */}
              {Object.keys(langStats).length > 0 && (
                <Box bg="white" borderRadius="2xl" boxShadow="sm" p={5}>
                  <HStack gap={2} mb={4}>
                    <Code2 size={15} color="#7C3AED" />
                    <Text fontSize="xs" fontWeight="700" color="gray.600" letterSpacing="0.06em">
                      LANGUAGE DISTRIBUTION
                    </Text>
                    <Text fontSize="xs" color="gray.400" ml="auto">AC submissions only</Text>
                  </HStack>
                  <LanguageDonutChart langStats={langStats} />
                </Box>
              )}

              {/* Rating Chart */}
              {ratingHistory.length > 0 && (
                <Box bg="white" borderRadius="2xl" boxShadow="sm" p={5}>
                  <HStack gap={2} mb={4}>
                    <TrendingUp size={15} color="#7C3AED" />
                    <Text
                      fontSize="xs"
                      fontWeight="700"
                      color="gray.600"
                      letterSpacing="0.06em"
                    >
                      RATING HISTORY
                    </Text>
                  </HStack>
                  <RatingChart data={ratingHistory} />
                </Box>
              )}

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
