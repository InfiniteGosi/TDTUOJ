import { useState, useEffect } from "react";
import {
  Button,
  Input,
  Text,
  VStack,
  HStack,
  Switch,
  DialogRoot,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
  Spinner,
} from "@chakra-ui/react";
import { Tag as TagIcon, Save } from "lucide-react";
import ApiService from "../../services/ApiService";

const TagFormDialog = ({ isOpen, tag, onSuccess, onError, onClose }) => {
  const isEditMode = !!tag;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", isActive: true });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (tag) {
        setFormData({ name: tag.name || "", isActive: tag.isActive ?? true });
      } else {
        setFormData({ name: "", isActive: true });
      }
      setErrors({});
    }
  }, [isOpen, tag]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Tag name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Tag name must be at least 2 characters";
    } else if (formData.name.trim().length > 50) {
      newErrors.name = "Tag name must not exceed 50 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        isActive: formData.isActive,
      };
      if (isEditMode) {
        const response = await ApiService.updateTag({ id: tag.id, ...payload });
        if (response.statusCode === 200) {
          onSuccess("Tag updated successfully");
        } else {
          onError(response.message || "Failed to update tag");
        }
      } else {
        const response = await ApiService.createTag(payload);
        if (response.statusCode === 201 || response.statusCode === 200) {
          onSuccess("Tag created successfully");
        } else {
          onError(response.message || "Failed to create tag");
        }
      }
    } catch (error) {
      onError(
        error.response?.data?.message || error.message || "An error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !loading) handleSubmit();
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent maxW="md">
          <DialogHeader>
            <HStack gap={2}>
              <TagIcon size={20} color="#805AD5" />
              <DialogTitle>
                {isEditMode ? "Edit Tag" : "Create New Tag"}
              </DialogTitle>
            </HStack>
            <DialogCloseTrigger onClick={onClose} />
          </DialogHeader>

          <DialogBody>
            <VStack gap={5} align="stretch">
              <Text fontSize="sm" color="gray.500">
                {isEditMode
                  ? "Update the tag details below."
                  : "Fill in the details for the new tag."}
              </Text>

              {/* Name Field */}
              <VStack align="stretch" gap={1}>
                <Text fontSize="sm" fontWeight="medium" color="gray.700">
                  Tag Name <span style={{ color: "red" }}>*</span>
                </Text>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Dynamic Programming, Graph, Greedy..."
                  size="md"
                  borderColor={errors.name ? "red.400" : "gray.300"}
                  _hover={{
                    borderColor: errors.name ? "red.500" : "purple.400",
                  }}
                  _focus={{
                    borderColor: errors.name ? "red.500" : "purple.500",
                    boxShadow: errors.name
                      ? "0 0 0 1px #FC8181"
                      : "0 0 0 1px #805AD5",
                  }}
                  autoFocus
                />
                {errors.name && (
                  <Text fontSize="xs" color="red.500">
                    {errors.name}
                  </Text>
                )}
              </VStack>

              {/* isActive Toggle */}
              <HStack
                justify="space-between"
                align="center"
                p={3}
                bg="gray.50"
                borderRadius="md"
                borderWidth="1px"
                borderColor="gray.200"
              >
                <VStack align="start" gap={0}>
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    Active
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Inactive tags will not be available for selection on
                    problems
                  </Text>
                </VStack>
                <Switch.Root
                  checked={formData.isActive}
                  onCheckedChange={(e) => handleChange("isActive", e.checked)}
                  colorPalette="green"
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
              </HStack>
            </VStack>
          </DialogBody>

          <DialogFooter display="flex" justifyContent="flex-end" gap={3}>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              colorPalette="purple"
              onClick={handleSubmit}
              disabled={loading}
              gap={2}
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Save size={16} />
                  {isEditMode ? "Update Tag" : "Create Tag"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
};

export default TagFormDialog;
