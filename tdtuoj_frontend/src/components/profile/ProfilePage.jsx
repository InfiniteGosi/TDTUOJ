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
  Button,
  Grid,
  GridItem,
  SimpleGrid,
} from "@chakra-ui/react";
import { Trophy, Star, Calendar, Mail, User, Award } from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import AvatarUploadModal from "../common/AvatarUploadModal";

const ProfilePage = () => {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showMessage } = useToast();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await ApiService.getUserByUsername(username);
        if (response.statusCode === 200) {
          setUser(response.data);
        }
      } catch (exception) {
        showMessage(
          exception.response?.data?.message || exception.message,
          "error",
        );
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchUserProfile();
    }
  }, [username]);

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

  const getInitials = (username) => {
    return username ? username.substring(0, 2).toUpperCase() : "U";
  };

  // Generate contribution data (mock data for now - replace with actual submission data later)
  const generateContributionData = () => {
    const weeks = 52;
    const days = 7;
    const data = [];
    const today = new Date();

    for (let week = weeks - 1; week >= 0; week--) {
      for (let day = 0; day < days; day++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (week * 7 + (6 - day)));
        // Random submission count (0-10) - replace with actual data
        const count = Math.floor(Math.random() * 11);
        data.push({
          date: date.toISOString().split("T")[0],
          count: count,
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
    return data;
  };

  // Generate rating history data (mock data - replace with actual data later)
  const generateRatingHistory = () => {
    const months = 12;
    const data = [];
    const today = new Date();
    let rating = 1500;

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      // Random rating change
      rating += Math.floor(Math.random() * 200) - 100;
      rating = Math.max(1300, Math.min(2200, rating));
      data.push({
        date: date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        rating: rating,
      });
    }
    return data;
  };

  const contributionData = generateContributionData();
  const ratingHistory = generateRatingHistory();

  const getContributionColor = (level) => {
    const colors = {
      0: "#ebedf0",
      1: "#9be9a8",
      2: "#40c463",
      3: "#30a14e",
      4: "#216e39",
    };
    return colors[level] || colors[0];
  };

  if (loading) {
    return (
      <Box minH="100vh" bg="gray.50" py={8}>
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
      <Box minH="100vh" bg="gray.50" py={8}>
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

  return (
    <Box minH="100vh" bg="gray.50" py={8}>
      <Container maxW="container.xl">
        <Grid templateColumns="repeat(12, 1fr)" gap={6}>
          {/* Left Sidebar - User Info */}
          <GridItem colSpan={{ base: 12, lg: 4 }}>
            <VStack align="stretch" gap={6}>
              {/* Profile Card */}
              <Box bg="white" borderRadius="lg" boxShadow="sm" p={6}>
                <VStack gap={4}>
                  {/* Avatar */}
                  <Box position="relative" cursor="pointer">
                    <Box position="relative">
                      {user.profileUrl ? (
                        <img
                          src={user.profileUrl}
                          alt={user.username}
                          style={{
                            width: "120px",
                            height: "120px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "4px solid #805AD5",
                          }}
                        />
                      ) : (
                        <Box
                          w="120px"
                          h="120px"
                          borderRadius="full"
                          bg="purple.400"
                          color="white"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          fontSize="3xl"
                          fontWeight="bold"
                          border="4px solid"
                          borderColor="purple.500"
                        >
                          {getInitials(user.username)}
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* Username and Name */}
                  <VStack gap={1}>
                    <Heading size="lg" color="gray.800" textAlign="center">
                      {user.username}
                    </Heading>
                    {user.name && (
                      <Text fontSize="md" color="gray.600" textAlign="center">
                        {user.name}
                      </Text>
                    )}
                  </VStack>

                  {/* Roles */}
                  <HStack gap={2} flexWrap="wrap" justify="center">
                    {user.roles.map((role) => (
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

                  {/* Status */}
                  <Badge
                    colorScheme={user.isActive ? "green" : "red"}
                    fontSize="sm"
                    px={3}
                    py={1}
                    borderRadius="md"
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </VStack>

                {/* Divider */}
                <Box borderTopWidth="1px" my={6} />

                {/* User Details */}
                <VStack align="stretch" gap={3}>
                  <HStack gap={3}>
                    <Mail size={18} color="#718096" />
                    <Text fontSize="sm" color="gray.700" wordBreak="break-all">
                      {user.email}
                    </Text>
                  </HStack>

                  <HStack gap={3}>
                    <User size={18} color="#718096" />
                    <Text fontSize="sm" color="gray.700">
                      User ID: #{user.id}
                    </Text>
                  </HStack>
                </VStack>
              </Box>

              {/* Stats Card */}
              <Box bg="white" borderRadius="lg" boxShadow="sm" p={6}>
                <Heading size="md" mb={4} color="gray.800">
                  Statistics
                </Heading>
                <VStack align="stretch" gap={4}>
                  {/* Problems Solved */}
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <HStack gap={2}>
                        <Award size={18} color="#805AD5" />
                        <Text
                          fontSize="sm"
                          fontWeight="medium"
                          color="gray.600"
                        >
                          Problems solved
                        </Text>
                      </HStack>
                      <Text fontSize="lg" fontWeight="bold" color="purple.600">
                        0
                      </Text>
                    </HStack>
                  </Box>

                  <Box borderTopWidth="1px" />

                  {/* Rank by Points */}
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <HStack gap={2}>
                        <Trophy size={18} color="#805AD5" />
                        <Text
                          fontSize="sm"
                          fontWeight="medium"
                          color="gray.600"
                        >
                          Rank by points
                        </Text>
                      </HStack>
                      <Text fontSize="lg" fontWeight="bold" color="purple.600">
                        #--
                      </Text>
                    </HStack>
                  </Box>

                  <Box borderTopWidth="1px" />

                  {/* Total Points */}
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="sm" fontWeight="medium" color="gray.600">
                        Total points
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="gray.800">
                        {user.point}
                      </Text>
                    </HStack>
                  </Box>

                  <Box borderTopWidth="1px" />

                  {/* Rating */}
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <HStack gap={2}>
                        <Star size={18} color="#F59E0B" />
                        <Text
                          fontSize="sm"
                          fontWeight="medium"
                          color="gray.600"
                        >
                          Rating
                        </Text>
                      </HStack>
                      <Text fontSize="lg" fontWeight="bold" color="orange.600">
                        {user.rating}
                      </Text>
                    </HStack>
                  </Box>
                </VStack>
              </Box>
            </VStack>
          </GridItem>

          {/* Right Content Area */}
          <GridItem colSpan={{ base: 12, lg: 8 }}>
            <VStack align="stretch" gap={6}>
              {/* About Section */}
              <Box bg="white" borderRadius="lg" boxShadow="sm" p={6}>
                <Heading size="md" mb={4} color="gray.800">
                  About
                </Heading>
                <Text color="gray.600" fontSize="sm">
                  {user.about || "This user hasn't added an about section yet."}
                </Text>
              </Box>

              {/* Submission Activity (GitHub-style contribution graph) */}
              <Box bg="white" borderRadius="lg" boxShadow="sm" p={6}>
                <HStack justify="space-between" align="center" mb={4}>
                  <Heading size="md" color="gray.800">
                    Submission Activity
                  </Heading>
                  <HStack gap={2} fontSize="xs" color="gray.600">
                    <Text>Less</Text>
                    <Box w="10px" h="10px" bg="#ebedf0" borderRadius="2px" />
                    <Box w="10px" h="10px" bg="#9be9a8" borderRadius="2px" />
                    <Box w="10px" h="10px" bg="#40c463" borderRadius="2px" />
                    <Box w="10px" h="10px" bg="#30a14e" borderRadius="2px" />
                    <Box w="10px" h="10px" bg="#216e39" borderRadius="2px" />
                    <Text>More</Text>
                  </HStack>
                </HStack>

                <Box overflowX="auto">
                  <HStack gap={0.5} align="start">
                    {Array.from({ length: 52 }).map((_, weekIndex) => (
                      <VStack key={weekIndex} gap={0.5}>
                        {Array.from({ length: 7 }).map((_, dayIndex) => {
                          const dataIndex = weekIndex * 7 + dayIndex;
                          const data = contributionData[dataIndex];
                          return (
                            <Box
                              key={dayIndex}
                              w="12px"
                              h="12px"
                              bg={
                                data
                                  ? getContributionColor(data.level)
                                  : "#ebedf0"
                              }
                              borderRadius="2px"
                              title={
                                data
                                  ? `${data.count} submissions on ${data.date}`
                                  : ""
                              }
                              cursor="pointer"
                              _hover={{ opacity: 0.8 }}
                            />
                          );
                        })}
                      </VStack>
                    ))}
                  </HStack>
                </Box>

                <Text fontSize="xs" color="gray.500" mt={2}>
                  Total submissions in the last year:{" "}
                  {contributionData.reduce((sum, d) => sum + d.count, 0)}
                </Text>
              </Box>

              {/* Rating History Graph */}
              <Box bg="white" borderRadius="lg" boxShadow="sm" p={6}>
                <Heading size="md" mb={4} color="gray.800">
                  Rating History
                </Heading>

                <Box position="relative" h="300px">
                  {/* Y-axis labels */}
                  <VStack
                    position="absolute"
                    left={0}
                    h="100%"
                    justify="space-between"
                    align="end"
                    pr={2}
                    fontSize="xs"
                    color="gray.500"
                  >
                    <Text>2200</Text>
                    <Text>2000</Text>
                    <Text>1800</Text>
                    <Text>1600</Text>
                    <Text>1400</Text>
                  </VStack>

                  {/* Graph container */}
                  <Box ml="40px" h="100%" position="relative">
                    {/* Background grid */}
                    <Box position="absolute" w="100%" h="100%">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Box
                          key={i}
                          position="absolute"
                          top={`${i * 25}%`}
                          w="100%"
                          borderTopWidth="1px"
                          borderColor="gray.200"
                        />
                      ))}
                    </Box>

                    {/* Rating line */}
                    <svg
                      width="100%"
                      height="100%"
                      style={{ position: "absolute" }}
                    >
                      <polyline
                        points={ratingHistory
                          .map((point, i) => {
                            const x = (i / (ratingHistory.length - 1)) * 100;
                            const y = 100 - ((point.rating - 1300) / 900) * 100;
                            return `${x}%,${y}%`;
                          })
                          .join(" ")}
                        fill="none"
                        stroke="#805AD5"
                        strokeWidth="2"
                      />
                      {ratingHistory.map((point, i) => {
                        const x = (i / (ratingHistory.length - 1)) * 100;
                        const y = 100 - ((point.rating - 1300) / 900) * 100;
                        return (
                          <circle
                            key={i}
                            cx={`${x}%`}
                            cy={`${y}%`}
                            r="4"
                            fill="#805AD5"
                          />
                        );
                      })}
                    </svg>
                  </Box>

                  {/* X-axis labels */}
                  <HStack
                    position="absolute"
                    bottom="-20px"
                    left="40px"
                    w="calc(100% - 40px)"
                    justify="space-between"
                    fontSize="xs"
                    color="gray.500"
                  >
                    {ratingHistory
                      .filter((_, i) => i % 2 === 0)
                      .map((point, i) => (
                        <Text key={i}>{point.date}</Text>
                      ))}
                  </HStack>
                </Box>

                <Text fontSize="xs" color="gray.500" mt={6}>
                  Current rating: {user.rating}
                </Text>
              </Box>

              {/* Badges & Awards Section */}
              <Box bg="white" borderRadius="lg" boxShadow="sm" p={6}>
                <Heading size="md" mb={4} color="gray.800">
                  Badges & Awards
                </Heading>
                <Text color="gray.500" fontSize="sm" fontStyle="italic">
                  This user has not earned any badges or awards.
                </Text>
              </Box>
            </VStack>
          </GridItem>
        </Grid>
      </Container>
    </Box>
  );
};

export default ProfilePage;
