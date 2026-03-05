import { useEffect, useState, useCallback, useRef } from "react";
import { Alert, Box, CloseButton, Progress } from "@chakra-ui/react";

// Inject keyframes once into the document
const injectKeyframes = () => {
  if (document.getElementById("toast-keyframes")) return;
  const style = document.createElement("style");
  style.id = "toast-keyframes";
  style.textContent = `
    @keyframes toast-slide-in {
      from { transform: translateX(calc(100% + 40px)); opacity: 0; }
      to   { transform: translateX(0);                 opacity: 1; }
    }
    @keyframes toast-slide-out {
      from { transform: translateX(0);                 opacity: 1; }
      to   { transform: translateX(calc(100% + 40px)); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
};

/**
 * Chakra v3 Alert-based Display with slide in/out animation + auto-dismiss
 */
const MessageDisplay = ({ status = "error", message, onDismiss }) => {
  const [progress, setProgress] = useState(100);
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    injectKeyframes();
  }, []);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      setIsVisible(false);
      dismissRef.current();
    }, 350);
  }, []);

  useEffect(() => {
    if (!message) {
      setIsVisible(false);
      return;
    }
    setIsVisible(true);
    setIsExiting(false);
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
        handleDismiss();
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [message, handleDismiss]);

  if (!isVisible && !isExiting) return null;

  return (
    // Outer wrapper: handles position + clipping
    <div
      style={{
        position: "fixed",
        top: "80px",
        right: "20px",
        zIndex: 9999,
        minWidth: "320px",
        overflow: "hidden", // prevents scrollbar flash during slide
      }}
    >
      {/* Inner wrapper: this is what animates */}
      <div
        style={{
          animation: isExiting
            ? "toast-slide-out 350ms cubic-bezier(0.4, 0, 1, 1) forwards"
            : "toast-slide-in 350ms cubic-bezier(0, 0, 0.2, 1) forwards",
          willChange: "transform, opacity",
        }}
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
            onClick={handleDismiss}
            position="absolute"
            right="8px"
            top="8px"
          />
        </Alert.Root>
      </div>
    </div>
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
    [alertData.message, alertData.status, dismissMessage],
  );

  return {
    MessageDisplay: MessageDisplayWrapper,
    showMessage,
    dismissMessage,
  };
};

export default MessageDisplay;
