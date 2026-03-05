import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Badge,
  Switch,
  Checkbox,
} from "@chakra-ui/react";
import { ArrowLeft, Lock, Shield, User } from "lucide-react";
import ApiService from "../../services/ApiService";
import { useConfirmDialog } from "../common/ConfirmDialog";
import AvatarUploadModal from "../common/AvatarUploadModal";
import { useToast } from "../common/ToastMessage";

const AVAILABLE_ROLES = ["PARTICIPANT", "CREATOR", "ADMIN"];

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

const getRoleIcon = (roleName) => {
  switch (roleName) {
    case "ADMIN":
      return <Shield size={14} />;
    case "CREATOR":
      return <User size={14} />;
    default:
      return null;
  }
};

const AdminEditUserPage = () => {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { ConfirmDialog, showConfirm } = useConfirmDialog();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    about: "",
    email: "",
    password: "",
    isActive: true,
  });

  const [selectedRoles, setSelectedRoles] = useState(["PARTICIPANT"]);
  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await ApiService.getUserByUserIdAsAdmin(userId);
        if (response.statusCode === 200) {
          const userData = response.data;
          setUser(userData);
          setFormData({
            name: userData.name || "",
            about: userData.about || "",
            email: userData.email || "",
            password: "",
            isActive: userData.isActive ?? true,
          });
          setPreviewImage(userData.profileUrl || "");
          setSelectedRoles(
            userData.roles?.map((r) => r.name) || ["PARTICIPANT"],
          );
        }
      } catch (error) {
        showMessage(error.response?.data?.message || error.message, "error");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleToggle = (role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleSaveAvatar = (previewUrl, imageFile) => {
    setProfileImage(imageFile);
    setPreviewImage(previewUrl);
    showMessage("Avatar selected! Click 'Save Changes' to apply.", "success");
  };

  const handleSave = async () => {
    if (selectedRoles.length === 0) {
      showMessage("User must have at least one role.", "error");
      return;
    }

    showConfirm(
      "Update User",
      `Are you sure you want to update the account for "${user?.username}"?`,
      async () => {
        try {
          setSaving(true);

          const formDataToSend = new FormData();
          formDataToSend.append("id", user.id); // backend reads userDTO.getId()
          formDataToSend.append("name", formData.name);
          formDataToSend.append("about", formData.about);
          formDataToSend.append("email", formData.email);
          formDataToSend.append("isActive", formData.isActive);

          if (formData.password) {
            formDataToSend.append("password", formData.password);
          }

          // Append each role as a separate "roles[N].name" field for @ModelAttribute binding
          selectedRoles.forEach((role) => {
            formDataToSend.append("roleNames", role);
          });

          if (profileImage) {
            formDataToSend.append("imageFile", profileImage);
          }

          const response = await ApiService.updateUserAsAdmin(formDataToSend);

          if (response.statusCode === 200) {
            showMessage("User updated successfully!", "success");
            setTimeout(() => navigate("/admin/users"), 1200);
          }
        } catch (error) {
          showMessage(
            error.response?.data?.message || "Failed to update user",
            "error",
          );
        } finally {
          setSaving(false);
        }
      },
    );
  };

  const getInitials = (username) =>
    username ? username.substring(0, 2).toUpperCase() : "U";

  if (loading) {
    return (
      <Box minH="100vh" bg="gray.50" py={8}>
        <Container maxW="container.md">
          <VStack gap={4} py={20}>
            <Spinner size="xl" color="purple.500" thickness="4px" />
            <Text color="gray.600">Loading user...</Text>
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
              User not found
            </Text>
            <Button
              colorScheme="purple"
              onClick={() => navigate("/admin/users")}
            >
              Back to Users
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
              onClick={() => navigate("/admin/users")}
              leftIcon={<ArrowLeft size={20} />}
            >
              Back
            </Button>
            <VStack align="start" gap={0}>
              <Heading size="xl" color="gray.800">
                Edit User
              </Heading>
              <Text fontSize="sm" color="gray.500">
                @{user.username}
              </Text>
            </VStack>
          </HStack>

          {/* Profile Picture */}
          <Box bg="white" borderRadius="lg" boxShadow="sm" p={6}>
            <Heading size="md" mb={4} color="gray.800">
              Profile Picture
            </Heading>
            <HStack gap={6} align="center">
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

              <Field.Root>
                <Field.Label>Display Name</Field.Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter display name"
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Email</Field.Label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>About</Field.Label>
                <Textarea
                  name="about"
                  value={formData.about}
                  onChange={handleInputChange}
                  placeholder="About this user..."
                  minH="100px"
                  resize="vertical"
                />
                <Field.HelperText>
                  {formData.about.length} / 500 characters
                </Field.HelperText>
              </Field.Root>
            </VStack>
          </Box>

          {/* Account Status */}
          <Box bg="white" borderRadius="lg" boxShadow="sm" p={6}>
            <Heading size="md" mb={4} color="gray.800">
              Account Status
            </Heading>
            <HStack
              justify="space-between"
              align="center"
              p={4}
              bg={formData.isActive ? "green.50" : "red.50"}
              borderRadius="md"
              border="1px solid"
              borderColor={formData.isActive ? "green.200" : "red.200"}
            >
              <VStack align="start" gap={0}>
                <Text
                  fontWeight="semibold"
                  color={formData.isActive ? "green.700" : "red.700"}
                >
                  {formData.isActive ? "Active" : "Inactive"}
                </Text>
                <Text
                  fontSize="sm"
                  color={formData.isActive ? "green.600" : "red.600"}
                >
                  {formData.isActive
                    ? "User can log in and access the platform"
                    : "User is deactivated and cannot log in"}
                </Text>
              </VStack>
              <Switch.Root
                checked={formData.isActive}
                onCheckedChange={(details) =>
                  setFormData((prev) => ({
                    ...prev,
                    isActive: details.checked,
                  }))
                }
                colorPalette="green"
                size="lg"
              >
                <Switch.HiddenInput />
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Root>
            </HStack>
          </Box>

          {/* Roles */}
          <Box bg="white" borderRadius="lg" boxShadow="sm" p={6}>
            <HStack justify="space-between" mb={4}>
              <Heading size="md" color="gray.800">
                Roles
              </Heading>
              <HStack gap={2}>
                {selectedRoles.map((role) => (
                  <Badge
                    key={role}
                    colorScheme={getRoleBadgeColor(role)}
                    px={2}
                    py={1}
                    borderRadius="md"
                    fontSize="xs"
                  >
                    {role}
                  </Badge>
                ))}
              </HStack>
            </HStack>

            <VStack gap={3} align="stretch">
              {AVAILABLE_ROLES.map((role) => {
                const isChecked = selectedRoles.includes(role);
                return (
                  <Box
                    key={role}
                    p={4}
                    border="2px solid"
                    borderColor={
                      isChecked ? `${getRoleBadgeColor(role)}.300` : "gray.200"
                    }
                    borderRadius="lg"
                    bg={isChecked ? `${getRoleBadgeColor(role)}.50` : "white"}
                    cursor="pointer"
                    onClick={() => handleRoleToggle(role)}
                    transition="all 0.2s"
                    _hover={{
                      borderColor: `${getRoleBadgeColor(role)}.400`,
                      bg: `${getRoleBadgeColor(role)}.50`,
                    }}
                  >
                    <HStack justify="space-between">
                      <HStack gap={3}>
                        <Checkbox.Root
                          checked={isChecked}
                          onCheckedChange={() => handleRoleToggle(role)}
                          colorPalette={getRoleBadgeColor(role)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox.HiddenInput />
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                        </Checkbox.Root>
                        <VStack align="start" gap={0}>
                          <HStack gap={2}>
                            {getRoleIcon(role)}
                            <Text fontWeight="semibold" color="gray.800">
                              {role}
                            </Text>
                          </HStack>
                          <Text fontSize="xs" color="gray.500">
                            {role === "ADMIN" &&
                              "Full platform access and user management"}
                            {role === "CREATOR" &&
                              "Can create and manage content"}
                            {role === "PARTICIPANT" && "Standard user access"}
                          </Text>
                        </VStack>
                      </HStack>
                      <Badge
                        colorScheme={getRoleBadgeColor(role)}
                        variant={isChecked ? "solid" : "outline"}
                        px={2}
                        py={1}
                        borderRadius="md"
                        fontSize="xs"
                      >
                        {isChecked ? "Assigned" : "Not assigned"}
                      </Badge>
                    </HStack>
                  </Box>
                );
              })}
            </VStack>

            {selectedRoles.length === 0 && (
              <Text fontSize="sm" color="red.500" mt={2}>
                ⚠ At least one role must be selected.
              </Text>
            )}
          </Box>

          {/* Security / Password Reset */}
          <Box bg="white" borderRadius="lg" boxShadow="sm" p={6}>
            <HStack gap={3} mb={4}>
              <Box p={2} bg="purple.100" borderRadius="md" color="purple.600">
                <Lock size={20} />
              </Box>
              <VStack align="start" gap={0}>
                <Heading size="md" color="gray.800">
                  Reset Password
                </Heading>
                <Text fontSize="sm" color="gray.500">
                  Leave blank to keep the current password
                </Text>
              </VStack>
            </HStack>
            <Field.Root>
              <Field.Label>New Password</Field.Label>
              <Input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter new password (optional)"
              />
            </Field.Root>
          </Box>

          {/* Action Buttons */}
          <HStack gap={4} justify="flex-end">
            <Button variant="outline" onClick={() => navigate("/admin/users")}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleSave}
              loading={saving}
              loadingText="Saving..."
              disabled={selectedRoles.length === 0}
            >
              Save Changes
            </Button>
          </HStack>
        </VStack>
      </Container>

      <AvatarUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        currentAvatar={previewImage}
        onSave={handleSaveAvatar}
      />

      <ConfirmDialog />
    </Box>
  );
};

export default AdminEditUserPage;
