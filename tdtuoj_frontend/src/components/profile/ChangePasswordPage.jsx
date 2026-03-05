import { useState } from "react";
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
} from "@chakra-ui/react";
import { ArrowLeft, Lock } from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import { useConfirmDialog } from "../common/ConfirmDialog";

const ChangePasswordPage = () => {
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { showMessage } = useToast();
  const { ConfirmDialog, showConfirm } = useConfirmDialog();

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleChangePassword = async () => {
    // Validation
    if (!formData.currentPassword) {
      showMessage("Please enter your current password", "error");
      return;
    }

    if (!formData.newPassword) {
      showMessage("Please enter a new password", "error");
      return;
    }

    if (formData.newPassword.length < 6) {
      showMessage("Password must be at least 6 characters", "error");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      showMessage("New passwords do not match", "error");
      return;
    }

    showConfirm(
      "Change Password",
      "Are you sure you want to change your password?",
      async () => {
        try {
          setSaving(true);

          const passwordData = {
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword,
            confirmPassword: formData.confirmPassword,
          };

          const response = await ApiService.changePassword(passwordData);

          if (response.statusCode === 200) {
            showMessage("Password changed successfully!", "success");
            // Clear form
            setFormData({
              currentPassword: "",
              newPassword: "",
              confirmPassword: "",
            });
            // Navigate back to profile after a short delay
            setTimeout(() => {
              navigate("/profile");
            }, 1500);
          }
        } catch (error) {
          showMessage(
            error.response?.data?.message || "Failed to change password",
            "error",
          );
        } finally {
          setSaving(false);
        }
      },
    );
  };

  return (
    <Box minH="100vh" bg="gray.50" py={8}>
      <Container maxW="container.sm">
        <VStack align="stretch" gap={6}>
          {/* Header */}
          <HStack gap={4} align="center">
            <Button
              variant="ghost"
              onClick={() => navigate("/profile")}
              leftIcon={<ArrowLeft size={20} />}
            >
              Back
            </Button>
            <Heading size="xl" color="gray.800">
              Change Password
            </Heading>
          </HStack>

          {/* Password Change Form */}
          <Box bg="white" borderRadius="lg" boxShadow="sm" p={6}>
            <HStack gap={3} mb={4}>
              <Box p={2} bg="purple.100" borderRadius="md" color="purple.600">
                <Lock size={24} />
              </Box>
              <VStack align="start" gap={0}>
                <Heading size="md" color="gray.800">
                  Security
                </Heading>
                <Text fontSize="sm" color="gray.600">
                  Update your password to keep your account secure
                </Text>
              </VStack>
            </HStack>

            <VStack gap={4} align="stretch" mt={6}>
              <Field.Root>
                <Field.Label>Current Password</Field.Label>
                <Input
                  name="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  placeholder="Enter current password"
                  size="lg"
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>New Password</Field.Label>
                <Input
                  name="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  placeholder="Enter new password"
                  size="lg"
                />
                <Field.HelperText>
                  Password must be at least 6 characters long
                </Field.HelperText>
              </Field.Root>

              <Field.Root>
                <Field.Label>Confirm New Password</Field.Label>
                <Input
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm new password"
                  size="lg"
                />
              </Field.Root>

              {/* Password Strength Indicator (optional) */}
              {formData.newPassword && (
                <Box
                  p={3}
                  bg="blue.50"
                  borderRadius="md"
                  borderLeft="4px solid"
                  borderColor="blue.500"
                >
                  <Text fontSize="sm" color="blue.700">
                    💡 Tip: Use a mix of letters, numbers, and symbols for a
                    stronger password
                  </Text>
                </Box>
              )}
            </VStack>
          </Box>

          {/* Action Buttons */}
          <HStack gap={4} justify="flex-end">
            <Button
              variant="outline"
              onClick={() => navigate("/profile")}
              size="lg"
            >
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleChangePassword}
              loading={saving}
              loadingText="Changing Password..."
              size="lg"
              isDisabled={
                !formData.currentPassword ||
                !formData.newPassword ||
                !formData.confirmPassword
              }
            >
              Change Password
            </Button>
          </HStack>
        </VStack>
      </Container>

      <ConfirmDialog />
    </Box>
  );
};

export default ChangePasswordPage;
