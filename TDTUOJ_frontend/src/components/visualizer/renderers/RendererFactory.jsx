// src/components/visualizer/renderers/RendererFactory.jsx
import ArrayRenderer from "./ArrayRenderer";
import TreeRenderer from "./TreeRenderer";
import GraphRenderer from "./GraphRenderer";
import LinkedListRenderer from "./LinkedListRenderer";
import StackRenderer from "./StackRenderer";
import QueueRenderer from "./QueueRenderer";
import MatrixRenderer from "./MatrixRenderer";
import ScatterRenderer from "./ScatterRenderer";
import { V, MONO, Canvas } from "./vizTheme";

const T = {
  textMuted: V.muted,
  surface: V.canvas,
  border: V.canvasBorder,
  accent: V.current,
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

    case "scatter":
    case "plot":
      return <ScatterRenderer frame={frame} />;

    default:
      // Fallback: render raw JSON for debugging
      return (
        <Canvas>
          <div style={{ fontSize: 12, color: V.muted, marginBottom: 8 }}>
            Unknown frame type:{" "}
            <code style={{ color: V.current }}>{frame.type ?? "(none)"}</code>
          </div>
          <pre
            style={{
              fontSize: 13,
              color: V.text,
              fontFamily: MONO,
              margin: 0,
              overflowX: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {JSON.stringify(frame, null, 2)}
          </pre>
        </Canvas>
      );
  }
}
