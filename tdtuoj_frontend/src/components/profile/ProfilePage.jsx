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
} from "@chakra-ui/react";
import { Trophy, Star, Calendar, Mail, User, Award } from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";

const ProfilePage = () => {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showMessage } = useToast();

  useEffect(() => {
    if (!username) return;

    const fetchAll = async () => {
      try {
        setLoading(true);
        const [userResponse, activityResponse] = await Promise.all([
          ApiService.getUserByUsername(username),
          ApiService.getUserActivity(username),
        ]);

        if (userResponse.statusCode === 200) setUser(userResponse.data);
        if (activityResponse.statusCode === 200)
          setActivity(activityResponse.data);
      } catch (exception) {
        showMessage(
          exception.response?.data?.message || exception.message,
          "error",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
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

  const getInitials = (username) =>
    username ? username.substring(0, 2).toUpperCase() : "U";

  const generateContributionData = () => {
    const activityMap = {};
    activity.forEach((a) => {
      activityMap[a.activityDate] = a.submissionsCount;
    });

    const data = [];
    const today = new Date();

    for (let week = 51; week >= 0; week--) {
      for (let day = 0; day < 7; day++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (week * 7 + (6 - day)));
        const dateStr = date.toISOString().split("T")[0];
        const count = activityMap[dateStr] || 0;
        data.push({
          date: dateStr,
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
    return data;
  };

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

  const formatTooltip = (date, count) => {
    const formatted = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${count} submission${count !== 1 ? "s" : ""} on ${formatted}`;
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

  const contributionData = generateContributionData();
  const totalSubmissions = contributionData.reduce(
    (sum, d) => sum + d.count,
    0,
  );

  return (
    <Box minH="100vh" bg="gray.50" py={8}>
      <Container maxW="container.xl">
        <Grid templateColumns="repeat(12, 1fr)" gap={6}>
          {/* Left Sidebar */}
          <GridItem colSpan={{ base: 12, lg: 4 }}>
            <VStack align="stretch" gap={6}>
              {/* Profile Card */}
              <Box bg="white" borderRadius="lg" boxShadow="sm" p={6}>
                <VStack gap={4}>
                  <Box position="relative" cursor="pointer">
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

                <Box borderTopWidth="1px" my={6} />

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

          {/* Right Content */}
          <GridItem colSpan={{ base: 12, lg: 8 }}>
            <VStack align="stretch" gap={6}>
              {/* About */}
              <Box bg="white" borderRadius="lg" boxShadow="sm" p={6}>
                <Heading size="md" mb={4} color="gray.800">
                  About
                </Heading>
                <Text color="gray.600" fontSize="sm">
                  {user.about || "This user hasn't added an about section yet."}
                </Text>
              </Box>

              {/* Contribution Graph */}
              <Box bg="white" borderRadius="lg" boxShadow="sm" p={6}>
                <HStack justify="space-between" align="center" mb={4}>
                  <Heading size="md" color="gray.800">
                    Submission Activity
                  </Heading>
                  <HStack gap={2} fontSize="xs" color="gray.600">
                    <Text>Less</Text>
                    {[
                      "#ebedf0",
                      "#9be9a8",
                      "#40c463",
                      "#30a14e",
                      "#216e39",
                    ].map((color) => (
                      <Box
                        key={color}
                        w="10px"
                        h="10px"
                        bg={color}
                        borderRadius="2px"
                      />
                    ))}
                    <Text>More</Text>
                  </HStack>
                </HStack>

                <Box overflowX="auto">
                  <HStack gap={0.5} align="start">
                    {Array.from({ length: 52 }).map((_, weekIndex) => (
                      <VStack key={weekIndex} gap={0.5}>
                        {Array.from({ length: 7 }).map((_, dayIndex) => {
                          const data =
                            contributionData[weekIndex * 7 + dayIndex];
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
                                data ? formatTooltip(data.date, data.count) : ""
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
                  {totalSubmissions} submissions in the last year
                </Text>
              </Box>

              {/* Badges */}
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
