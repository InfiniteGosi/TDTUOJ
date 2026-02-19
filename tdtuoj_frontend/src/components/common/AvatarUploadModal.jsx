// AvatarUploadModal.jsx
import { useState, useRef } from "react";
import {
  Box,
  Button,
  HStack,
  VStack,
  Text,
  IconButton,
} from "@chakra-ui/react";
import { RotateCcw, RotateCw, X } from "lucide-react";

const AvatarUploadModal = ({ isOpen, onClose, currentAvatar, onSave }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(currentAvatar || null);
  const [rotation, setRotation] = useState(0);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
        setRotation(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRotateLeft = () => {
    setRotation((prev) => prev - 90);
  };

  const handleRotateRight = () => {
    setRotation((prev) => prev + 90);
  };

  const handleReset = () => {
    setSelectedImage(null);
    setPreviewUrl(currentAvatar || null);
    setRotation(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = () => {
    // Here you would upload the image to your backend
    // For now, just pass the preview URL
    onSave(previewUrl, selectedImage);
    onClose();
  };

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="blackAlpha.700"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={9999}
      onClick={onClose}
    >
      <Box
        bg="white"
        borderRadius="lg"
        boxShadow="2xl"
        maxW="600px"
        w="90%"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <HStack justify="space-between" p={4} borderBottomWidth="1px">
          <Text fontSize="xl" fontWeight="semibold">
            Upload a New Avatar
          </Text>
          <IconButton
            size="sm"
            variant="ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </IconButton>
        </HStack>

        {/* Content */}
        <VStack p={6} gap={4}>
          {/* Preview */}
          <Box
            w="280px"
            h="280px"
            borderRadius="xl"
            border="4px solid"
            borderColor="gray.200"
            overflow="hidden"
            bg="gray.100"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Avatar preview"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: `rotate(${rotation}deg)`,
                  transition: "transform 0.3s ease",
                }}
              />
            ) : (
              <Text color="gray.400">No image selected</Text>
            )}
          </Box>

          {/* Rotation Controls */}
          {previewUrl && (
            <HStack gap={2}>
              <IconButton
                size="lg"
                variant="outline"
                onClick={handleRotateLeft}
                aria-label="Rotate left"
              >
                <RotateCcw size={20} />
              </IconButton>
              <IconButton
                size="lg"
                variant="outline"
                onClick={handleRotateRight}
                aria-label="Rotate right"
              >
                <RotateCw size={20} />
              </IconButton>
              <Button size="lg" variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </HStack>
          )}

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: "none" }}
          />

          <Button
            size="lg"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            leftIcon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M4.5 3A1.5 1.5 0 003 4.5v7A1.5 1.5 0 004.5 13h7a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0011.5 3h-7zM8 5a2 2 0 110 4 2 2 0 010-4z" />
              </svg>
            }
          >
            Choose Image...
          </Button>

          {/* Action Buttons */}
          <HStack gap={3} w="100%" justify="end" pt={4}>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSave}
              isDisabled={!selectedImage}
            >
              Save
            </Button>
          </HStack>
        </VStack>
      </Box>
    </Box>
  );
};

export default AvatarUploadModal;
