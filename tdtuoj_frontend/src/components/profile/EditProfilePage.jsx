import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Field,
  Input,
  Textarea,
  Spinner,
} from "@chakra-ui/react";
import { ArrowLeft, Lock } from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import { useConfirmDialog } from "../common/ConfirmDialog";
import AvatarUploadModal from "../common/AvatarUploadModal";

const EditProfilePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { showMessage } = useToast();
  const { ConfirmDialog, showConfirm } = useConfirmDialog();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);

  // Form state (removed password fields)
  const [formData, setFormData] = useState({
    name: "",
    about: "",
  });

  // Profile image state
  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState("");

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await ApiService.getOwnProfile();
        if (response.statusCode === 200) {
          setUser(response.data);
          setFormData({
            name: response.data.name || "",
            about: response.data.about || "",
          });
          setPreviewImage(response.data.profileUrl || "");
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

    fetchUserProfile();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSaveAvatar = async (previewUrl, imageFile) => {
    try {
      setProfileImage(imageFile);
      setPreviewImage(previewUrl);
      showMessage(
        "Avatar selected! Click 'Save Changes' to update.",
        "success",
      );
    } catch (error) {
      showMessage("Failed to select avatar", "error");
    }
  };

  const handleSaveProfile = async () => {
    showConfirm(
      "Update Profile",
      "Are you sure you want to update your profile?",
      async () => {
        try {
          setSaving(true);

          // Create FormData object (NO PASSWORD FIELDS)
          const formDataToSend = new FormData();
          formDataToSend.append("name", formData.name);
          formDataToSend.append("about", formData.about);

          // Add profile image if changed
          if (profileImage) {
            formDataToSend.append("imageFile", profileImage);
          }

          const response = await ApiService.updateProfile(formDataToSend);

          if (response.statusCode === 200) {
            showMessage("Profile updated successfully!", "success");
            setTimeout(() => {
              navigate(`/users/${user.username}`);
            }, 1500);
          }
        } catch (error) {
          showMessage(
            error.response?.data?.message || "Failed to update profile",
            "error",
          );
        } finally {
          setSaving(false);
        }
      },
    );
  };

  const handleDeactivateAccount = async () => {
    showConfirm(
      "Deactivate Account",
      "Are you sure you want to deactivate your account? This action cannot be undone.",
      async () => {
        try {
          const response = await ApiService.deactivateProfile();

          if (response.statusCode === 200) {
            ApiService.logout();
            showMessage("Account deactivated successfully", "success");
            navigate("/");
          }
        } catch (error) {
          showMessage(
            error.response?.data?.message || "Failed to deactivate account",
            "error",
          );
        }
      },
    );
  };

  const getInitials = (username) => {
    return username ? username.substring(0, 2).toUpperCase() : "U";
  };

  if (loading) {
    return (
      <Box minH="100vh" bg="gray.50" py={8}>
        <Container maxW="container.md">
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
        <Container maxW="container.md">
          <VStack gap={4} py={20}>
            <Text fontSize="2xl" color="gray.600">
              Failed to load profile
            </Text>
            <Button colorScheme="purple" onClick={() => navigate("/")}>
              Go Home
            </Button>
          </VStack>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50" py={8}>
      <Container maxW="container.md">
        <VStack align="stretch" gap={6}>
          {/* Header */}
          <HStack gap={4} align="center">
            <Button
              variant="ghost"
              onClick={() => navigate(`/users/${user.username}`)}
              leftIcon={<ArrowLeft size={20} />}
            >
              Back
            </Button>
            <Heading size="xl" color="gray.800">
              Edit Profile
            </Heading>
          </HStack>

          {/* Profile Picture Section */}
          <Box bg="white" borderRadius="lg" boxShadow="sm" p={6}>
            <Heading size="md" mb={4} color="gray.800">
              Profile Picture
            </Heading>
            <HStack gap={6} align="center">
              {/* Avatar with hover effect */}
              <Box
                position="relative"
                onMouseEnter={() => setIsHoveringAvatar(true)}
                onMouseLeave={() => setIsHoveringAvatar(false)}
                cursor="pointer"
                onClick={() => setIsUploadModalOpen(true)}
              >
                <Box position="relative">
                  {previewImage ? (
                    <img
                      src={previewImage}
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

                  {/* Overlay on hover */}
                  {isHoveringAvatar && (
                    <Box
                      position="absolute"
                      top={0}
                      left={0}
                      right={0}
                      bottom={0}
                      bg="blackAlpha.600"
                      borderRadius="full"
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="center"
                      transition="all 0.2s"
                    >
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="white"
                        style={{ marginBottom: "8px" }}
                      >
                        <path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
                        <path d="M21 5h-3.17l-1.24-1.35A1.99 1.99 0 0015.12 3H8.88c-.56 0-1.1.24-1.48.65L6.17 5H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V7a2 2 0 00-2-2zm-9 13a5.5 5.5 0 110-11 5.5 5.5 0 010 11z" />
                      </svg>
                      <Text color="white" fontSize="sm" fontWeight="medium">
                        Edit
                      </Text>
                    </Box>
                  )}
                </Box>
              </Box>

              <VStack align="start" gap={1}>
                <Text fontSize="sm" color="gray.600">
                  Click on the avatar to upload a new profile picture
                </Text>
                <Text fontSize="xs" color="gray.500">
                  JPG, PNG or GIF. Max size 5MB.
                </Text>
              </VStack>
            </HStack>
          </Box>

          {/* Basic Information */}
          <Box bg="white" borderRadius="lg" boxShadow="sm" p={6}>
            <Heading size="md" mb={4} color="gray.800">
              Basic Information
            </Heading>
            <VStack gap={4} align="stretch">
              {/* Username (Read-only) */}
              <Field.Root>
                <Field.Label>Username</Field.Label>
                <Input
                  value={user.username}
                  readOnly
                  bg="gray.100"
                  cursor="not-allowed"
                />
                <Field.HelperText>Username cannot be changed</Field.HelperText>
              </Field.Root>

              {/* Display Name */}
              <Field.Root>
                <Field.Label>Display Name</Field.Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your display name"
                />
              </Field.Root>

              {/* About */}
              <Field.Root>
                <Field.Label>About</Field.Label>
                <Textarea
                  name="about"
                  value={formData.about}
                  onChange={handleInputChange}
                  placeholder="Tell us about yourself..."
                  minH="120px"
                  resize="vertical"
                />
                <Field.HelperText>
                  {formData.about.length} / 500 characters
                </Field.HelperText>
              </Field.Root>
            </VStack>
          </Box>

          {/* Security Section - Link to Change Password */}
          <Box
            bg="white"
            borderRadius="lg"
            boxShadow="sm"
            p={6}
            cursor="pointer"
            _hover={{ bg: "gray.50" }}
            transition="all 0.2s"
            onClick={() => navigate("/change-password")}
          >
            <HStack justify="space-between">
              <HStack gap={3}>
                <Box p={2} bg="purple.100" borderRadius="md" color="purple.600">
                  <Lock size={24} />
                </Box>
                <VStack align="start" gap={0}>
                  <Heading size="md" color="gray.800">
                    Password & Security
                  </Heading>
                  <Text fontSize="sm" color="gray.600">
                    Change your password or update security settings
                  </Text>
                </VStack>
              </HStack>
              <Button variant="ghost" colorScheme="purple">
                Change →
              </Button>
            </HStack>
          </Box>

          {/* Action Buttons */}
          <HStack gap={4} justify="space-between">
            <Button
              colorScheme="red"
              variant="outline"
              onClick={handleDeactivateAccount}
            >
              Deactivate Account
            </Button>

            <HStack gap={4}>
              <Button
                variant="outline"
                onClick={() => navigate(`/users/${user.username}`)}
              >
                Cancel
              </Button>
              <Button
                colorScheme="purple"
                onClick={handleSaveProfile}
                loading={saving}
                loadingText="Saving..."
              >
                Save Changes
              </Button>
            </HStack>
          </HStack>
        </VStack>
      </Container>

      {/* Avatar Upload Modal */}
      <AvatarUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        currentAvatar={previewImage}
        onSave={handleSaveAvatar}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog />
    </Box>
  );
};

export default EditProfilePage;
