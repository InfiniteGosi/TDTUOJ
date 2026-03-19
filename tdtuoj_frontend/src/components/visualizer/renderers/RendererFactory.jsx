// src/components/visualizer/renderers/RendererFactory.jsx
import ArrayRenderer from "./ArrayRenderer";
import TreeRenderer from "./TreeRendererer";
import GraphRenderer from "./GraphRenderer";
import LinkedListRenderer from "./LinkedListRenderer";
import StackRenderer from "./StackRenderer";
import QueueRenderer from "./QueueRenderer";
import MatrixRenderer from "./MatrixRenderer";

const T = {
  textMuted: "#888",
  surface: "#1a1a1a",
  border: "#2a2a2a",
  accent: "#ffa116",
};

export default function RendererFactory({ frame }) {
  if (!frame) {
    return (
      <div
        style={{
          color: T.textMuted,
          fontSize: 13,
          padding: 24,
          textAlign: "center",
        }}
      >
        No frame to display.
      </div>
    );
  }

  switch (frame.type) {
    case "array":
      return <ArrayRenderer frame={frame} />;

    case "tree":
      return <TreeRenderer frame={frame} />;

    case "graph":
      return <GraphRenderer frame={frame} />;

    case "linkedlist":
    case "linked_list":
    case "list":
      return <LinkedListRenderer frame={frame} />;

    case "stack":
      return <StackRenderer frame={frame} />;

    case "queue":
    case "deque":
      return <QueueRenderer frame={frame} />;

    case "matrix":
    case "grid":
    case "board":
      return <MatrixRenderer frame={frame} />;

    default:
      // Fallback: render raw JSON so the user can debug their snapshot() call
      return (
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>
            Unknown frame type:{" "}
            <code style={{ color: T.accent }}>{frame.type ?? "(none)"}</code>.
            Add a <code style={{ color: T.accent }}>"type"</code> field to your
            snapshot() call.
          </div>
          <pre
            style={{
              fontSize: 11,
              color: "#c8c8c8",
              backgroundColor: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              padding: 12,
              overflowX: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {JSON.stringify(frame, null, 2)}
          </pre>
        </div>
      );
  }
}
