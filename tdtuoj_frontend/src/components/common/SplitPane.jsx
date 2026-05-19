import { useEffect, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

const STORAGE_KEY = "arena-split-ratio";
const DEFAULT_LEFT = 42;

export default function SplitPane({ left, right, storageKey = STORAGE_KEY }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const saved = () => {
    try {
      const v = parseFloat(localStorage.getItem(storageKey));
      return isNaN(v) ? DEFAULT_LEFT : v;
    } catch { return DEFAULT_LEFT; }
  };

  const onLayout = (sizes) => {
    try { localStorage.setItem(storageKey, sizes[0]); } catch {}
  };

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 56px)" }}>
        <div style={{ height: "50%", overflow: "auto", borderBottom: "1px solid var(--border-default)" }}>
          {left}
        </div>
        <div style={{ height: "50%", overflow: "auto" }}>
          {right}
        </div>
      </div>
    );
  }

  return (
    <PanelGroup
      direction="horizontal"
      onLayout={onLayout}
      style={{ height: "calc(100dvh - 56px)" }}
    >
      <Panel defaultSize={saved()} minSize={25} maxSize={70}>
        <div style={{ height: "100%", overflow: "auto" }}>
          {left}
        </div>
      </Panel>

      <PanelResizeHandle style={{
        width: 4,
        background: "var(--border-default)",
        cursor: "col-resize",
        transition: "background var(--transition-fast)",
        flexShrink: 0,
      }}
        onDragging={(isDragging) => {
          document.body.style.cursor = isDragging ? "col-resize" : "";
          document.body.style.userSelect = isDragging ? "none" : "";
        }}
      />

      <Panel minSize={30}>
        <div style={{ height: "100%", overflow: "auto" }}>
          {right}
        </div>
      </Panel>
    </PanelGroup>
  );
}
