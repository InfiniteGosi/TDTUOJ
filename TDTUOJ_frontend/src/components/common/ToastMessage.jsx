import {
  useEffect,
  useState,
  useCallback,
  useRef,
  createContext,
  useContext,
} from "react";
import ReactDOM from "react-dom";

const injectKeyframes = () => {
  if (document.getElementById("toast-keyframes-v2")) return;
  const style = document.createElement("style");
  style.id = "toast-keyframes-v2";
  style.textContent = `
    @keyframes toast-slide-in {
      from { transform: translateY(-120%); opacity: 0; }
      to   { transform: translateY(0);     opacity: 1; }
    }
    @keyframes toast-slide-out {
      from { transform: translateY(0);     opacity: 1; }
      to   { transform: translateY(-120%); opacity: 0; }
    }
    @keyframes toast-progress {
      from { width: 100%; }
      to   { width: 0%; }
    }
  `;
  document.head.appendChild(style);
};

// ─── Context ─────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICONS = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  warning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

const TYPE_STYLES = {
  success: {
    borderColor: "var(--green-ac)",
    iconColor: "var(--green-ac)",
    progressColor: "var(--green-ac)",
    label: "Success",
  },
  error: {
    borderColor: "var(--red-wa)",
    iconColor: "var(--red-wa)",
    progressColor: "var(--red-wa)",
    label: "Error",
  },
  warning: {
    borderColor: "var(--amber-tle)",
    iconColor: "var(--amber-tle)",
    progressColor: "var(--amber-tle)",
    label: "Warning",
  },
  info: {
    borderColor: "var(--cyan)",
    iconColor: "var(--cyan)",
    progressColor: "var(--cyan)",
    label: "Info",
  },
};

// ─── Inner toast UI (rendered via portal into document.body) ─────────────────
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

  const styles = TYPE_STYLES[status] ?? TYPE_STYLES.info;

  return ReactDOM.createPortal(
    <div
      style={{
        position: "fixed",
        top: "24px",
        left: 0,
        right: 0,
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          minWidth: "320px",
          maxWidth: "420px",
          pointerEvents: "auto",
          background: "var(--bg-overlay)",
          border: `1px solid color-mix(in srgb, ${styles.borderColor} 50%, transparent)`,
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
          position: "relative",
          animation: isExiting
            ? "toast-slide-out 300ms cubic-bezier(0.4, 0, 1, 1) forwards"
            : "toast-slide-in 300ms cubic-bezier(0, 0, 0.2, 1) forwards",
          willChange: "transform, opacity",
        }}
      >
        {/* Content row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            padding: "14px 40px 14px 14px",
          }}
        >
          {/* Icon */}
          <span style={{ color: styles.iconColor, flexShrink: 0, marginTop: "1px" }}>
            {ICONS[status] ?? ICONS.info}
          </span>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                color: styles.iconColor,
                fontFamily: "var(--font-body)",
                marginBottom: "2px",
              }}
            >
              {styles.label}
            </div>
            <div
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-body)",
                lineHeight: "var(--leading-normal)",
                wordBreak: "break-word",
              }}
            >
              {message}
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            width: "22px",
            height: "22px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-default)",
            background: "transparent",
            color: "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            lineHeight: 1,
            transition: "var(--transition-fast)",
          }}
          aria-label="Dismiss"
        >
          ✕
        </button>

        {/* Progress bar */}
        <div
          style={{
            height: "3px",
            background: "var(--border-subtle)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: `${progress}%`,
              background: styles.progressColor,
              transition: "width 100ms linear",
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
};

// ─── Provider (place once at app root) ───────────────────────────────────────
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

// ─── Hook (use anywhere inside ToastProvider) ─────────────────────────────────
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
};

export default ToastMessage;
