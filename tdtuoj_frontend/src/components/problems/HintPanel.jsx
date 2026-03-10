import { useEffect, useRef } from "react";
import { Box, HStack, VStack, Text, Spinner } from "@chakra-ui/react";

const T = {
  bg: "#0f0f0f",
  surface: "#1a1a1a",
  surfaceHover: "#222222",
  border: "#2a2a2a",
  borderBright: "#3a3a3a",
  text: "#e8e8e8",
  textMuted: "#888",
  textDim: "#555",
  accent: "#ffa116",
  accentDim: "rgba(255,161,22,0.12)",
  green: "#2cbb5d",
  blue: "#3b82f6",
  purple: "#a78bfa",
  purpleDim: "rgba(167,139,250,0.12)",
};

const MODELS = [
  { key: "gemini", label: "Gemini" },
  { key: "claude", label: "Claude" },
  { key: "openai", label: "GPT-4o Mini" },
];

const SUGGESTIONS = [
  { label: "Explain this problem", color: T.purple },
  { label: "Suggest an approach", color: T.blue },
  { label: "Time & space complexity", color: T.accent },
  { label: "Give me a hint", color: T.green },
];

const HintPanel = ({
  width = 340,
  messages,
  hintInput,
  setHintInput,
  hintLoading,
  selectedModel,
  setSelectedModel,
  onSubmit,
  onClose,
}) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, hintLoading]);

  return (
    <Box
      w={`${width}px`}
      h="100%"
      bg={T.surface}
      borderLeft={`1px solid ${T.border}`}
      display="flex"
      flexDirection="column"
      flexShrink={0}
    >
      {/* Header */}
      <Box
        px={4}
        py={3}
        borderBottom={`1px solid ${T.border}`}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexShrink={0}
      >
        <HStack gap={2}>
          <Text fontSize="sm" fontWeight="700" color={T.text}>
            🤖 AI Assistant
          </Text>
        </HStack>
        <Box
          as="button"
          onClick={onClose}
          bg="transparent"
          border="none"
          color={T.textMuted}
          cursor="pointer"
          fontSize="md"
          style={{ outline: "none" }}
          _hover={{ color: T.text }}
        >
          ✕
        </Box>
      </Box>

      {/* Messages area */}
      <Box flex={1} overflowY="auto" px={4} py={4}>
        {/* Intro screen */}
        {messages.length === 0 && !hintLoading && (
          <VStack gap={4} pt={4}>
            {/* Bot avatar */}
            <Box
              w="72px"
              h="72px"
              borderRadius="16px"
              bg={T.purpleDim}
              border={`1px solid ${T.purple}44`}
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="2xl"
            >
              🤖
            </Box>
            <VStack gap={1}>
              <Text fontSize="md" fontWeight="700" color={T.text}>
                AI Assistant
              </Text>
              <Text fontSize="xs" color={T.textMuted} textAlign="center">
                Your personal coding assistant
              </Text>
            </VStack>

            {/* Suggestion chips */}
            <VStack align="stretch" w="100%" gap={2} mt={2}>
              {SUGGESTIONS.map((s) => (
                <Box
                  key={s.label}
                  as="button"
                  onClick={() => onSubmit(s.label)}
                  textAlign="left"
                  px={4}
                  py={3}
                  borderRadius="8px"
                  bg={T.bg}
                  border={`1px solid ${T.border}`}
                  borderLeft={`3px solid ${s.color}`}
                  color={T.text}
                  fontSize="sm"
                  cursor="pointer"
                  transition="all 0.15s"
                  style={{ outline: "none" }}
                  _hover={{ bg: T.surfaceHover }}
                >
                  {s.label}
                </Box>
              ))}
            </VStack>
          </VStack>
        )}

        {/* Message history */}
        {messages.length > 0 && (
          <VStack align="stretch" gap={4}>
            {messages.map((msg, i) => (
              <Box key={i}>
                {/* User bubble */}
                <Box display="flex" justifyContent="flex-end" mb={2}>
                  <Box
                    px={3}
                    py={2}
                    borderRadius="12px"
                    borderBottomRightRadius="4px"
                    bg={T.purpleDim}
                    border={`1px solid ${T.purple}33`}
                    maxW="85%"
                    fontSize="sm"
                    color={T.text}
                  >
                    {msg.user}
                  </Box>
                </Box>
                {/* Assistant bubble */}
                <Box display="flex" justifyContent="flex-start">
                  <Box
                    px={3}
                    py={2}
                    borderRadius="12px"
                    borderBottomLeftRadius="4px"
                    bg={T.bg}
                    border={`1px solid ${T.border}`}
                    maxW="95%"
                    fontSize="sm"
                    color={T.text}
                    whiteSpace="pre-wrap"
                    lineHeight="1.7"
                  >
                    {msg.assistant}
                  </Box>
                </Box>
              </Box>
            ))}
            <Box ref={messagesEndRef} />
          </VStack>
        )}

        {/* Thinking indicator — always visible when loading, outside messages block */}
        {hintLoading && (
          <Box display="flex" justifyContent="flex-start" mt={3}>
            <Box
              px={3}
              py={2}
              borderRadius="12px"
              borderBottomLeftRadius="4px"
              bg={T.bg}
              border={`1px solid ${T.border}`}
              display="flex"
              alignItems="center"
              gap={2}
            >
              <Spinner size="xs" color={T.accent} />
              <Text fontSize="xs" color={T.textMuted}>
                Thinking...
              </Text>
            </Box>
          </Box>
        )}
      </Box>

      {/* Bottom: input + model selector */}
      <Box
        px={4}
        pt={3}
        pb={4}
        borderTop={`1px solid ${T.border}`}
        flexShrink={0}
      >
        {/* Input row */}
        <HStack gap={2} mb={3}>
          <Box
            as="textarea"
            value={hintInput}
            onChange={(e) => setHintInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder="Ask AI anything..."
            rows={2}
            flex={1}
            px={3}
            py={2}
            borderRadius="8px"
            border={`1px solid ${T.border}`}
            bg={T.bg}
            color={T.text}
            fontSize="sm"
            resize="none"
            style={{ outline: "none", fontFamily: "inherit" }}
          />
          <Box
            as="button"
            onClick={() => onSubmit()}
            disabled={hintLoading || !hintInput.trim()}
            w="36px"
            h="36px"
            borderRadius="8px"
            bg={T.accent}
            color="#000"
            fontWeight="700"
            fontSize="lg"
            cursor="pointer"
            border="none"
            display="flex"
            alignItems="center"
            justifyContent="center"
            opacity={hintLoading || !hintInput.trim() ? 0.4 : 1}
            transition="all 0.15s"
            style={{ outline: "none" }}
            alignSelf="flex-end"
          >
            ↑
          </Box>
        </HStack>

        {/* Model selector */}
        <HStack gap={2}>
          {MODELS.map(({ key, label }) => (
            <Box
              key={key}
              as="button"
              onClick={() => setSelectedModel(key)}
              px={3}
              py="4px"
              borderRadius="20px"
              fontSize="xs"
              fontWeight="600"
              cursor="pointer"
              border={`1px solid ${selectedModel === key ? T.accent : T.border}`}
              bg={selectedModel === key ? T.accentDim : "transparent"}
              color={selectedModel === key ? T.accent : T.textMuted}
              transition="all 0.15s"
              style={{ outline: "none" }}
            >
              {label}
            </Box>
          ))}
          <Text fontSize="10px" color={T.textDim} ml="auto">
            Shift+Enter for new line
          </Text>
        </HStack>
      </Box>
    </Box>
  );
};

export default HintPanel;
