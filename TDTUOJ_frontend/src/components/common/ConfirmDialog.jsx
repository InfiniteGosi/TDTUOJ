import { useState, useEffect, useRef } from "react";

// ── CSS injected once ─────────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById("confirm-dialog-styles")) return;
  const style = document.createElement("style");
  style.id = "confirm-dialog-styles";
  style.textContent = `
    @keyframes confirm-backdrop-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes confirm-dialog-in {
      from { opacity: 0; transform: scale(0.95) translateY(-8px); }
      to   { opacity: 1; transform: scale(1)    translateY(0); }
    }
  `;
  document.head.appendChild(style);
};

// ── ConfirmDialogModal (internal) ─────────────────────────────────────────────
const ConfirmDialogModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    injectStyles();
  }, []);

  // Focus cancel button when opened; trap Escape key
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.activeElement;
    cancelBtnRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      prev?.focus();
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(2px)",
          animation: "confirm-backdrop-in 150ms ease forwards",
        }}
      />

      {/* Dialog panel */}
      <div
        style={{
          position: "relative",
          background: "var(--bg-overlay)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          width: "100%",
          maxWidth: "420px",
          animation: "confirm-dialog-in 180ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--space-4) var(--space-5)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <h2
            id="confirm-title"
            style={{
              margin: 0,
              fontSize: "var(--text-lg)",
              fontWeight: 600,
              color: "var(--text-primary)",
              fontFamily: "var(--font-body)",
            }}
          >
            {title}
          </h2>
          <button
            onClick={onCancel}
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-default)",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              transition: "var(--transition-fast)",
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "var(--space-5)",
          }}
        >
          <p
            id="confirm-desc"
            style={{
              margin: 0,
              fontSize: "var(--text-base)",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-body)",
              lineHeight: "var(--leading-normal)",
            }}
          >
            {message}
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "var(--space-3)",
            padding: "var(--space-4) var(--space-5)",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <button
            ref={cancelBtnRef}
            onClick={onCancel}
            className="btn btn-ghost btn-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-danger btn-sm"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useConfirmDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showConfirm = (title, message, onConfirm) => {
    setOptions({ title, message, onConfirm });
    setIsOpen(true);
  };

  const handleCancel = () => setIsOpen(false);

  const handleConfirm = () => {
    options.onConfirm();
    setIsOpen(false);
  };

  return {
    ConfirmDialog: () => (
      <ConfirmDialogModal
        isOpen={isOpen}
        title={options.title}
        message={options.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ),
    showConfirm,
  };
};

export default ConfirmDialogModal;
