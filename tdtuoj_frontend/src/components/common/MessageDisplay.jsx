import { useEffect, useState, useCallback } from "react";
import { Alert, Box, CloseButton, Progress } from "@chakra-ui/react";

/**
 * Chakra v3 Alert-based Display with auto-dismiss + dynamic status
 */
const MessageDisplay = ({ status = "error", message, onDismiss }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!message) return;

    setProgress(100);
    const duration = 4000;
    const stepTime = 100;
    const totalSteps = duration / stepTime;
    let step = 0;

    const timer = setInterval(() => {
      step += 1;
      setProgress(100 - (step / totalSteps) * 100);
      if (step >= totalSteps) {
        clearInterval(timer);
        onDismiss();
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <Box
      position="fixed"
      top="80px"
      right="20px"
      zIndex={9999}
      minW="320px"
      data-state="open"
      animationName="slide-in-right"
      animationDuration="300ms"
    >
      <Alert.Root
        status={status}
        variant="subtle"
        borderRadius="lg"
        shadow="lg"
      >
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title fontWeight="bold">
            {status === "error" && "Error"}
            {status === "success" && "Success"}
            {status === "warning" && "Warning"}
            {status === "info" && "Info"}
          </Alert.Title>
          <Alert.Description>{message}</Alert.Description>
          <Progress.Root
            mt={2}
            height="4px"
            value={progress}
            max={100}
            colorPalette={
              status === "error"
                ? "red"
                : status === "success"
                ? "green"
                : "blue"
            }
            borderBottomRadius="lg"
          >
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        </Alert.Content>

        <CloseButton
          onClick={onDismiss}
          position="absolute"
          right="8px"
          top="8px"
        />
      </Alert.Root>
    </Box>
  );
};

/**
 * Hook for managing and displaying Chakra v3 alerts with status
 */
export const useMessage = () => {
  const [alertData, setAlertData] = useState({
    message: null,
    status: "error",
    isShowing: false,
  });

  const showMessage = useCallback((message, status = "error") => {
    setAlertData((prev) => {
      // Prevent resetting the current popup while it's showing
      if (prev.isShowing) return prev;
      return { message, status, isShowing: true };
    });
  }, []);

  const dismissMessage = useCallback(() => {
    setAlertData((prev) => ({
      ...prev,
      message: null,
      isShowing: false,
    }));
  }, []);

  const MessageDisplayWrapper = useCallback(
    () => (
      <MessageDisplay
        message={alertData.message}
        status={alertData.status}
        onDismiss={dismissMessage}
      />
    ),
    [alertData.message, alertData.status, dismissMessage]
  );

  return {
    MessageDisplay: MessageDisplayWrapper,
    showMessage,
    dismissMessage,
  };
};

export default MessageDisplay;
