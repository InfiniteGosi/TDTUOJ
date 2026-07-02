// AvatarUploadModal.jsx
import { useState, useRef, useEffect } from "react";
import { RotateCcw, RotateCw, X } from "lucide-react";

// ── CSS injected once ─────────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById("avatar-modal-styles")) return;
  const style = document.createElement("style");
  style.id = "avatar-modal-styles";
  style.textContent = `
    @keyframes avatar-backdrop-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes avatar-modal-in {
      from { opacity: 0; transform: scale(0.96) translateY(-12px); }
      to   { opacity: 1; transform: scale(1)    translateY(0); }
    }
  `;
  document.head.appendChild(style);
};

const AvatarUploadModal = ({ isOpen, onClose, currentAvatar, onSave }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(currentAvatar || null);
  const [rotation, setRotation] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    injectStyles();
  }, []);

  // Trap Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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

  const handleRotateLeft = () => setRotation((prev) => prev - 90);
  const handleRotateRight = () => setRotation((prev) => prev + 90);

  const handleReset = () => {
    setSelectedImage(null);
    setPreviewUrl(currentAvatar || null);
    setRotation(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = () => {
    onSave(previewUrl, selectedImage);
    onClose();
  };

  return (
    <div
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
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(3px)",
          animation: "avatar-backdrop-in 150ms ease forwards",
        }}
      />

      {/* Modal panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Upload a New Avatar"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: "var(--bg-overlay)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          width: "100%",
          maxWidth: "520px",
          animation: "avatar-modal-in 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
          overflow: "hidden",
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
          <span
            style={{
              fontSize: "var(--text-lg)",
              fontWeight: 600,
              color: "var(--text-primary)",
              fontFamily: "var(--font-body)",
            }}
          >
            Upload a New Avatar
          </span>
          <button
            onClick={onClose}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-default)",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "var(--transition-fast)",
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: "var(--space-6)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-4)",
          }}
        >
          {/* Preview */}
          <div
            style={{
              width: "240px",
              height: "240px",
              borderRadius: "var(--radius-lg)",
              border: "2px solid var(--border-default)",
              overflow: "hidden",
              background: "var(--bg-raised)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
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
              <span
                style={{
                  color: "var(--text-muted)",
                  fontSize: "var(--text-sm)",
                  fontFamily: "var(--font-body)",
                }}
              >
                No image selected
              </span>
            )}
          </div>

          {/* Rotation Controls */}
          {previewUrl && (
            <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
              <button
                onClick={handleRotateLeft}
                className="btn btn-ghost btn-sm"
                aria-label="Rotate left"
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <RotateCcw size={16} />
                Left
              </button>
              <button
                onClick={handleRotateRight}
                className="btn btn-ghost btn-sm"
                aria-label="Rotate right"
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <RotateCw size={16} />
                Right
              </button>
              <button onClick={handleReset} className="btn btn-ghost btn-sm">
                Reset
              </button>
            </div>
          )}

          {/* File Input (hidden) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: "none" }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-ghost"
            style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Choose Image...
          </button>

          {/* Helper text */}
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              fontFamily: "var(--font-body)",
              textAlign: "center",
            }}
          >
            JPG, PNG or GIF. Max size 5 MB.
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
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedImage}
            className="btn btn-primary btn-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarUploadModal;
