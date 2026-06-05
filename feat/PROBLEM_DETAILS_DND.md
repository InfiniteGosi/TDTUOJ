# ProblemDetailsPage — Drag-and-Drop Workspace

## Current file state (after git restore)
- Uses Chakra UI: `Box`, `Spinner`, `Text`, `Button`, `HStack`, `VStack`, `Wrap`, `WrapItem`
- Has `ResizablePane` (horizontal only, left 42% / right 58%)
- Top nav bar: `<OJ/>` + Save + AI Assistant (~lines 1000-1069)
- Left panel: problem header + tabs (description, testcases, submissions, comments, results)
- Right panel: just CodeEditor with rightHeaderContent (Visualize + Submit)
- HintPanel + VisualizerModal as overlays
- Lucide imports at line 13 — no `GripVertical` yet
- State ends at line 569: `const [editInput, setEditInput] = useState("");`
- `tabs` array at line 972 — has `{ id: "testcases", label: ... }` entry
- `return (` starts at line 989

## What to build
3-slot drag-and-drop layout: left | right-top | right-bottom  
Default: description → left, editor → right-top, testcases → right-bottom  
Panels swap on drag. ResizablePane vertical added to right column.

## Changes — apply in this order

### 1. Add GripVertical to lucide imports (line 13)
```js
import { CheckCircle, XCircle, Clock, Bookmark, BookmarkCheck, MessageSquare,
  MessageCircle, ThumbsUp, ThumbsDown, Pencil, Trash2, CornerDownRight, Send,
  GripVertical } from "lucide-react";
```

### 2. Add state + swapPanels after line 569
```js
  const [layout, setLayout] = useState({
    left: "description",
    "right-top": "editor",
    "right-bottom": "testcases",
  });
  const [dragSrc, setDragSrc] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);

  const swapPanels = (targetSlot) => {
    if (!dragSrc || dragSrc === targetSlot) {
      setDragSrc(null); setDragTarget(null); return;
    }
    setLayout((prev) => {
      const next = { ...prev };
      [next[dragSrc], next[targetSlot]] = [next[targetSlot], next[dragSrc]];
      return next;
    });
    setDragSrc(null); setDragTarget(null);
  };
```

### 3. Remove testcases from tabs array (line 974)
Delete: `{ id: "testcases", label: \`Test Cases (${testCases.length})\` },`

### 4. Add helpers before return (insert just before `return (` at line 989)
```js
  const PANEL_LABELS = { description: "Description", editor: "Code Editor", testcases: "Test Cases" };

  const PanelBar = ({ slotId, title }) => (
    <div style={{
      height: 32, display: "flex", alignItems: "center", gap: 8,
      padding: "0 10px", flexShrink: 0,
      background: T.surface, borderBottom: `1px solid ${T.border}`,
      outline: dragTarget === slotId ? `2px solid ${T.accent}` : "none",
      outlineOffset: -2,
    }}
      onDragOver={(e) => { e.preventDefault(); setDragTarget(slotId); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragTarget(null); }}
      onDrop={() => swapPanels(slotId)}
    >
      <span draggable
        onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDragSrc(slotId); }}
        onDragEnd={() => { setDragSrc(null); setDragTarget(null); }}
        style={{ cursor: "grab", color: T.textDim, display: "flex", alignItems: "center" }}
        title="Drag to rearrange">
        <GripVertical size={13} />
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", flex: 1 }}>
        {title}
      </span>
    </div>
  );

  const TestCasesPanel = () => (
    <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      {testCases.length === 0
        ? <div style={{ textAlign: "center", padding: "32px 0", color: T.textMuted, fontSize: 13 }}>No sample test cases</div>
        : testCases.map((tc, i) => (
          <div key={tc.id} style={{ borderRadius: 8, border: `1px solid ${T.border}`, overflow: "hidden" }}>
            <div style={{ padding: "6px 12px", background: T.bg, borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: "0.05em" }}>CASE {i + 1}</span>
            </div>
            <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[{ label: "INPUT", val: tc.input, color: "#c8c8c8" }, { label: "EXPECTED", val: tc.output, color: T.green }].map(({ label, val, color }) => (
                <div key={label}>
                  <span style={{ fontSize: 11, color: T.textDim, fontWeight: 600, display: "block", marginBottom: 4, letterSpacing: "0.04em" }}>{label}</span>
                  <div style={{ background: T.bg, padding: 8, borderRadius: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color, whiteSpace: "pre-wrap", border: `1px solid ${T.border}`, minHeight: 36 }}>
                    {val}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      }
    </div>
  );
```

### 5. Remove top nav bar block entirely
Delete the entire `{/* ── Top Nav Bar ── */}` Box (~lines 1000-1069).  
This removes `<OJ/>`, Save button, AI Assistant button from top.

### 6. Add Save + AI to editor's rightHeaderContent
Find the `<HStack spacing={2}>` in rightHeaderContent (has Visualize + Submit).  
Add before Visualize button:
```jsx
<Box as="button" onClick={handleToggleFavorite}
  display="flex" alignItems="center" gap={1.5} px={3} py={1} borderRadius="6px"
  bg={isFavorited ? "rgba(251,191,36,0.12)" : "transparent"}
  border={`1px solid ${isFavorited ? "#fbbf24" : T.border}`}
  color={isFavorited ? "#fbbf24" : T.textMuted}
  fontSize="xs" fontWeight="600"
  cursor={favoriteLoading ? "not-allowed" : "pointer"} opacity={favoriteLoading ? 0.6 : 1}
  style={{ outline: "none" }} title={isFavorited ? "Remove from favorites" : "Save"}>
  {isFavorited ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
  <Text ml={1}>{isFavorited ? "Saved" : "Save"}</Text>
</Box>
<Box as="button" onClick={() => setHintPanelOpen((v) => !v)}
  display="flex" alignItems="center" gap={1.5} px={3} py={1} borderRadius="6px"
  bg={hintPanelOpen ? T.purpleDim : "transparent"}
  border={`1px solid ${hintPanelOpen ? T.purple : T.border}`}
  color={hintPanelOpen ? T.purple : T.textMuted}
  fontSize="xs" fontWeight="600" cursor="pointer" style={{ outline: "none" }}>
  🤖 <Text ml={1}>AI</Text>
</Box>
```

### 7. Restructure main layout for 3 slots
In the return, the `<ResizablePane direction="horizontal" initialSizes={[42, 58]}>` currently has:
- Child 0: Left Box (problem header + tabs)
- Child 1: Right Box (just CodeEditor)

**Change child 1 (right Box)** to a vertical split with right-top (editor) and right-bottom (testcases):
```jsx
{/* RIGHT COLUMN */}
<div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
  <ResizablePane direction="vertical" initialSizes={[60, 40]}>
    {/* RIGHT-TOP: editor */}
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <PanelBar slotId="right-top" title={PANEL_LABELS[layout["right-top"]]} />
      {layout["right-top"] === "editor" && (
        <Box flex={1} overflow="hidden" position="relative">
          {/* existing CodeEditor JSX unchanged */}
        </Box>
      )}
      {layout["right-top"] === "testcases" && <TestCasesPanel />}
      {layout["right-top"] === "description" && (
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* existing left panel tabs + content */}
        </div>
      )}
    </div>

    {/* RIGHT-BOTTOM: testcases */}
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: T.surface, borderTop: `1px solid ${T.border}` }}>
      <PanelBar slotId="right-bottom" title={PANEL_LABELS[layout["right-bottom"]]} />
      {layout["right-bottom"] === "testcases" && <TestCasesPanel />}
      {layout["right-bottom"] === "editor" && (
        <Box flex={1} overflow="hidden" position="relative">
          {/* existing CodeEditor JSX */}
        </Box>
      )}
      {layout["right-bottom"] === "description" && (
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* existing left panel tabs + content */}
        </div>
      )}
    </div>
  </ResizablePane>
</div>
```

**Also wrap left Box** with `<>` + add PanelBar before the existing content:
```jsx
{/* LEFT SLOT */}
<Box height="100%" display="flex" flexDirection="column" bg={T.surface} borderRight={`1px solid ${T.border}`}>
  <PanelBar slotId="left" title={PANEL_LABELS[layout.left]} />
  {layout.left === "description" && (
    <>
      {/* existing problem header Box */}
      {/* existing tabs */}
      {/* existing tab content */}
    </>
  )}
  {layout.left === "testcases" && <TestCasesPanel />}
  {layout.left === "editor" && (
    <Box flex={1} overflow="hidden" position="relative">
      {/* CodeEditor */}
    </Box>
  )}
</Box>
```

## Implementation note
Since the panel content JSX is large and duplicated across 3 slots, consider extracting to named consts:
```js
const EditorPanel = () => ( <Box flex={1} ...><CodeEditor ... /></Box> );
const DescriptionPanel = () => ( <>header + tabs + content</> );
```
Then renderPanelContent(panelId) just returns `<EditorPanel />`, `<DescriptionPanel />`, or `<TestCasesPanel />`.

## Key state flows that need preserving
- `setActiveTab("results")` called on submit complete → still works since DescriptionPanel uses activeTab
- `setActiveTab("submissions")` on tab click → same
- HintPanel overlay: unchanged, sits outside ResizablePane
- VisualizerModal: unchanged overlay
- Problem header (title, difficulty, tags) ONLY shown when description panel is in left slot visually looks best
