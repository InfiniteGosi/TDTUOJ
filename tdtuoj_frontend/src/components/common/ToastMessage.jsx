import {
  useEffect,
  useState,
  useCallback,
  useRef,
  createContext,
  useContext,
} from "react";
import ReactDOM from "react-dom";
import { Alert, CloseButton, Progress } from "@chakra-ui/react";

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

// ─── Context ────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

// ─── Inner toast UI (rendered via portal into document.body) ────────────────
const ToastMessage = ({ status, message, onDismiss }) => {
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

  return ReactDOM.createPortal(
    <div
      style={{
        position: "fixed",
        top: "80px",
        right: "20px",
        zIndex: 9999,
        minWidth: "320px",
        overflow: "hidden",
      }}
    >
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
    </div>,
    document.body,
  );
};

// ─── Provider (place once at app root) ──────────────────────────────────────
export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({
    message: null,
    status: "error",
    isShowing: false,
  });

  const showMessage = useCallback((message, status = "error") => {
    setToast((prev) => {
      if (prev.isShowing) return prev;
      return { message, status, isShowing: true };
    });
  }, []);

  const dismissMessage = useCallback(() => {
    setToast({ message: null, status: "error", isShowing: false });
  }, []);

  return (
    <ToastContext.Provider value={{ showMessage, dismissMessage }}>
      {children}
      <ToastMessage
        message={toast.message}
        status={toast.status}
        onDismiss={dismissMessage}
      />
    </ToastContext.Provider>
  );
};

// ─── Hook (use anywhere inside ToastProvider) ────────────────────────────────
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
};

export default ToastMessage;
