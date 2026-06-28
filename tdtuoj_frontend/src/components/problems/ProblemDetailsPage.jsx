import { useState, useEffect, useRef } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensors, useSensor } from "@dnd-kit/core";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Clock, Bookmark, BookmarkCheck, MessageSquare, MessageCircle, ThumbsUp, ThumbsDown, Pencil, Trash2, CornerDownRight, Send, GripVertical, Lightbulb, Activity, Terminal, ChevronLeft, ChevronRight, Zap, HardDrive } from "lucide-react";
import { useToast } from "../common/ToastMessage";
import ApiService from "../../services/ApiService";
import ReactMarkdown from "react-markdown";
import CodeEditor from "../CodeEditor/CodeEditor";
import HintPanel from "./HintPanel";
import VisualizerModal from "../visualizer/VisualizerModal";
import hljs from "highlight.js/lib/core";
import cpp from "highlight.js/lib/languages/cpp";
import java from "highlight.js/lib/languages/java";
import python from "highlight.js/lib/languages/python";
import c from "highlight.js/lib/languages/c";
import csharp from "highlight.js/lib/languages/csharp";
import javascript from "highlight.js/lib/languages/javascript";
import "highlight.js/styles/vs2015.css";

hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("java", java);
hljs.registerLanguage("python", python);
hljs.registerLanguage("c", c);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("javascript", javascript);

const getHljsLanguage = (lang) => {
  switch (lang) {
    case "CPP":
      return "cpp";
    case "JAVA":
      return "java";
    case "PYTHON":
      return "python";
    case "C":
      return "c";
    case "CSHARP":
      return "csharp";
    case "JAVASCRIPT":
      return "javascript";
    default:
      return "cpp";
  }
};

// ─── Theme tokens — CSS variables (theme-aware) ──────────────────────────────
const T = {
  bg:          "var(--bg-void)",
  surface:     "var(--bg-base)",
  surfaceHover:"var(--bg-hover)",
  border:      "var(--border-default)",
  borderBright:"var(--border-strong)",
  text:        "var(--text-primary)",
  textMuted:   "var(--text-secondary)",
  textDim:     "var(--text-muted)",
  accent:      "var(--primary)",
  accentDim:   "var(--primary-subtle)",
  green:       "var(--green-ac)",
  greenDim:    "var(--green-subtle)",
  red:         "var(--red-wa)",
  redDim:      "var(--red-subtle)",
  blue:        "var(--blue-ce)",
  blueDim:     "var(--blue-subtle)",
  purple:      "var(--purple-mle)",
  purpleDim:   "var(--purple-subtle)",
};

// Map editor language → backend SubmissionLanguage enum
const mapEditorLanguageToSubmissionLanguage = (language) => {
  switch (language) {
    case "cpp":
      return "CPP";
    case "java":
      return "JAVA";
    case "python":
      return "PYTHON";
    case "c":
      return "C";
    case "csharp":
      return "CSHARP";
    case "javascript":
      return "JAVASCRIPT";
    default:
      return "CPP";
  }
};

const VERDICT_LABEL = {
  AC: "Accepted",
  WA: "Wrong Answer",
  CE: "Compilation Error",
  TLE: "Time Limit Exceeded",
  MLE: "Memory Limit Exceeded",
  SF: "Runtime Error",
};

const DIFF_STYLE = {
  EASY: { color: T.green, bg: T.greenDim, label: "Easy" },
  MEDIUM: { color: T.accent, bg: T.accentDim, label: "Medium" },
  HARD: { color: T.red, bg: T.redDim, label: "Hard" },
};

// ─── Resize Handle ───────────────────────────────────────────────────────────
const ResizeHandle = ({ direction = "horizontal" }) => {
  const [active, setActive] = useState(false);
  const isH = direction === "horizontal";
  return (
    <PanelResizeHandle
      onDragging={setActive}
      style={{
        width: isH ? "5px" : "100%",
        height: !isH ? "5px" : "100%",
        background: active ? T.accent : T.border,
        cursor: isH ? "col-resize" : "row-resize",
        flexShrink: 0,
        transition: "background 0.15s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        zIndex: 10,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = T.accent; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = T.border; }}
    >
      <div
        style={{
          width: isH ? "3px" : "28px",
          height: isH ? "28px" : "3px",
          borderRadius: "3px",
          background: active ? T.accent : T.textDim,
          opacity: active ? 1 : 0.5,
          transition: "background 0.15s, opacity 0.15s",
          pointerEvents: "none",
        }}
      />
    </PanelResizeHandle>
  );
};

// ─── Difficulty Badge ─────────────────────────────────────────────────────────
const DifficultyBadge = ({ difficulty }) => {
  const s = DIFF_STYLE[difficulty] || DIFF_STYLE.EASY;
  return (
    <span
      style={{
        display: "inline-block",
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: "2px",
        paddingBottom: "2px",
        borderRadius: "4px",
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: "0.04em",
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.color}44`,
      }}
    >
      {s.label}
    </span>
  );
};

// ─── Stat Chip ────────────────────────────────────────────────────────────────
const StatChip = ({ icon, value, color }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      paddingLeft: 8,
      paddingRight: 8,
      paddingTop: "3px",
      paddingBottom: "3px",
      borderRadius: "4px",
      background: T.surface,
      border: `1px solid ${T.border}`,
      fontSize: 12,
      color: color || T.textMuted,
      fontWeight: "500",
      fontFamily: "'JetBrains Mono', monospace",
    }}
  >
    <span>{icon}</span>
    <span>{value}</span>
  </div>
);

// ─── Tag Chip ─────────────────────────────────────────────────────────────────
const TagChip = ({ name }) => (
  <span
    style={{
      display: "inline-block",
      paddingLeft: 8,
      paddingRight: 8,
      paddingTop: "3px",
      paddingBottom: "3px",
      borderRadius: "var(--radius-pill)",
      fontSize: "var(--text-xs)",
      fontWeight: "500",
      fontFamily: "var(--font-body)",
      color: "var(--text-secondary)",
      background: "var(--bg-overlay)",
      border: "1px solid var(--border-default)",
      letterSpacing: "0.02em",
      whiteSpace: "nowrap",
      transition: "border-color 0.15s, color 0.15s",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
  >
    {name}
  </span>
);

// ─── Comment Block ────────────────────────────────────────────────────────────
const CommentBlock = ({
  comment, T, currentUsername, navigate,
  replyingTo, setReplyingTo, replyInput, setReplyInput,
  editingComment, setEditingComment, editInput, setEditInput,
  commentSubmitting, onVote, onReply, onEditSave, onDelete, formatDate,
  isReply = false,
  rootId = null,   // top-level comment id — for replies-on-replies
}) => {
  const [showReplies, setShowReplies] = useState(false);
  const isDeleted = comment.isDeleted;
  const isAuthor  = currentUsername && comment.username === currentUsername;
  const isEditing = editingComment?.id === comment.id;

  // For replies: reply box lives on the top-level comment — use rootId
  const replyTargetId = isReply ? rootId : comment.id;
  const isReplying    = replyingTo?.id === (isReply ? rootId : comment.id)
                     && replyingTo?.replyTo === comment.id;

  const replyCount = comment.replies?.length ?? 0;

  return (
    <div
      style={{
        borderTop: `1px solid ${T.border}`,
        paddingTop: 12,
        paddingBottom: isReply ? 8 : 12,
        paddingLeft: isReply ? 16 : 0,
        marginLeft: isReply ? 12 : 0,
        borderLeft: isReply ? `2px solid ${T.borderBright}` : "none",
      }}
    >
      {/* Author row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isDeleted ? 4 : 8 }}>
        {/* Avatar */}
        <div
          style={{
            width: "26px",
            height: "26px",
            borderRadius: "50%",
            overflow: "hidden",
            background: isDeleted ? T.borderBright : T.accentDim,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            cursor: isDeleted ? "default" : "pointer",
          }}
          onClick={() => !isDeleted && window.open(`/users/${comment.username}`, '_blank')}
          title={isDeleted ? undefined : `View ${comment.username}'s profile`}
        >
          {!isDeleted && comment.userProfileUrl ? (
            <img src={comment.userProfileUrl} alt={comment.username}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => { e.target.style.display = "none"; }} />
          ) : !isDeleted ? (
            <span style={{ fontSize: "10px", fontWeight: "700", color: T.accent }}>
              {comment.username?.[0]?.toUpperCase() ?? "?"}
            </span>
          ) : null}
        </div>

        {/* Username */}
        <span
          style={{ fontSize: 12, fontWeight: "600", color: isDeleted ? T.textDim : T.textMuted, cursor: isDeleted ? "default" : "pointer" }}
          onClick={() => !isDeleted && window.open(`/users/${comment.username}`, '_blank')}
          onMouseEnter={(e) => { if (!isDeleted) { e.currentTarget.style.color = T.accent; e.currentTarget.style.textDecoration = "underline"; } }}
          onMouseLeave={(e) => { if (!isDeleted) { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.textDecoration = "none"; } }}
        >
          {isDeleted ? "[deleted]" : comment.username}
        </span>
        <span style={{ fontSize: 12, color: T.textDim }}>·</span>
        <span style={{ fontSize: 12, color: T.textDim }}>{formatDate(comment.createdAt)}</span>
        {comment.updatedAt && comment.updatedAt !== comment.createdAt && !isDeleted && (
          <span style={{ fontSize: 12, color: T.textDim, fontStyle: "italic" }}>(edited)</span>
        )}
      </div>

      {/* Content / edit box */}
      {isEditing ? (
        <div style={{ marginBottom: 8 }}>
          <textarea value={editInput} onChange={(e) => setEditInput(e.target.value)}
            rows={3} autoFocus
            style={{
              width: "100%", background: T.bg, border: `1px solid ${T.borderBright}`,
              borderRadius: "6px", padding: "8px", outline: "none", resize: "vertical",
              color: T.text, fontSize: "13px", lineHeight: "1.6",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={() => onEditSave(comment.id)}
              style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 4, borderRadius: "6px", background: T.accent, color: "var(--text-inverse)", fontSize: 12, fontWeight: "700", cursor: "pointer", outline: "none", border: "none" }}>Save</button>
            <button onClick={() => { setEditingComment(null); setEditInput(""); }}
              style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 4, borderRadius: "6px", background: T.borderBright, color: T.textMuted, fontSize: 12, fontWeight: "600", cursor: "pointer", outline: "none", border: "none" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: isDeleted ? T.textDim : T.text, lineHeight: "1.7", marginBottom: 8, fontStyle: isDeleted ? "italic" : "normal" }}>
          {isDeleted ? "[deleted]" : renderCommentContent(comment.content, T)}
        </p>
      )}

      {/* Action row */}
      {!isEditing && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>

          {/* Upvote */}
          <button
            style={{ display: "flex", alignItems: "center", gap: 4, color: comment.userVote === "UPVOTE" ? T.accent : T.textDim, background: "transparent", border: "none", cursor: "pointer", fontSize: 12, fontWeight: "600", outline: "none" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = T.accent; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = comment.userVote === "UPVOTE" ? T.accent : T.textDim; }}
            onClick={() => onVote(comment.id, "UPVOTE")}>
            <ThumbsUp size={13} />
            <span>{comment.upvoteCount ?? 0}</span>
          </button>

          {/* Downvote */}
          <button
            style={{ display: "flex", alignItems: "center", gap: 4, color: comment.userVote === "DOWNVOTE" ? T.red : T.textDim, background: "transparent", border: "none", cursor: "pointer", fontSize: 12, fontWeight: "600", outline: "none" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = T.red; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = comment.userVote === "DOWNVOTE" ? T.red : T.textDim; }}
            onClick={() => onVote(comment.id, "DOWNVOTE")}>
            <ThumbsDown size={13} />
            <span>{comment.downvoteCount ?? 0}</span>
          </button>

          {/* Hide/Show Replies — top-level only */}
          {!isReply && replyCount > 0 && (
            <button
              style={{ display: "flex", alignItems: "center", gap: 4, color: T.textDim, background: "transparent", border: "none", cursor: "pointer", fontSize: 12, fontWeight: "600", outline: "none" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = T.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = T.textDim; }}
              onClick={() => setShowReplies((v) => !v)}>
              <MessageCircle size={13} />
              <span>{showReplies ? `Hide Replies (${replyCount})` : `Show Replies (${replyCount})`}</span>
            </button>
          )}

          {/* Reply button — works for both top-level and replies */}
          {!isDeleted && currentUsername && (
            <button
              style={{ display: "flex", alignItems: "center", gap: 4, color: isReplying ? T.accent : T.textDim, background: "transparent", border: "none", cursor: "pointer", fontSize: 12, fontWeight: "600", outline: "none" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = T.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = isReplying ? T.accent : T.textDim; }}
              onClick={() => {
                if (isReplying) {
                  setReplyingTo(null);
                  setReplyInput("");
                } else {
                  // Always target the root (top-level) comment's reply box
                  setReplyingTo({ id: replyTargetId, replyTo: comment.id, username: comment.username });
                  setReplyInput(`@${comment.username} `);
                  // Auto-expand replies so the box is visible
                  if (isReply) setShowReplies(true);
                }
              }}>
              <CornerDownRight size={13} />
              <span>Reply</span>
            </button>
          )}

          {/* Edit / Delete — author only, no isReply guard */}
          {isAuthor && !isDeleted && (
            <>
              <button
                style={{ display: "flex", alignItems: "center", gap: 4, color: T.textDim, background: "transparent", border: "none", cursor: "pointer", fontSize: 12, outline: "none" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = T.text; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = T.textDim; }}
                onClick={() => { setEditingComment({ id: comment.id }); setEditInput(comment.content); }}>
                <Pencil size={12} />
              </button>
              <button
                style={{ display: "flex", alignItems: "center", gap: 4, color: T.textDim, background: "transparent", border: "none", cursor: "pointer", fontSize: 12, outline: "none" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = T.red; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = T.textDim; }}
                onClick={() => onDelete(comment.id)}>
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Inline reply box — shown on top-level comment when replyingTo targets this comment */}
      {!isReply && replyingTo?.id === comment.id && (
        <div style={{ marginTop: 12, paddingLeft: 8 }}>
          <textarea value={replyInput} onChange={(e) => setReplyInput(e.target.value)}
            placeholder={`Reply to ${replyingTo.username}...`}
            rows={2} autoFocus
            style={{
              width: "100%", background: T.bg, border: `1px solid ${T.borderBright}`,
              borderRadius: "6px", padding: "8px", outline: "none", resize: "vertical",
              color: T.text, fontSize: "13px", lineHeight: "1.6",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={() => onReply(comment.id)}
              style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 4, borderRadius: "6px", background: T.accent, color: "var(--text-inverse)", fontSize: 12, fontWeight: "700", cursor: commentSubmitting ? "not-allowed" : "pointer", opacity: commentSubmitting ? 0.6 : 1, outline: "none", border: "none" }}>Post Reply</button>
            <button onClick={() => { setReplyingTo(null); setReplyInput(""); }}
              style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 4, borderRadius: "6px", background: T.borderBright, color: T.textMuted, fontSize: 12, fontWeight: "600", cursor: "pointer", outline: "none", border: "none" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Replies list — collapsible */}
      {!isReply && replyCount > 0 && showReplies && (
        <div style={{ marginTop: 8 }}>
          {comment.replies.map((reply) => (
            <CommentBlock
              key={reply.id}
              comment={reply}
              T={T}
              currentUsername={currentUsername}
              navigate={navigate}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyInput={replyInput}
              setReplyInput={setReplyInput}
              editingComment={editingComment}
              setEditingComment={setEditingComment}
              editInput={editInput}
              setEditInput={setEditInput}
              commentSubmitting={commentSubmitting}
              onVote={onVote}
              onReply={onReply}
              onEditSave={onEditSave}
              onDelete={onDelete}
              formatDate={formatDate}
              isReply
              rootId={comment.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Render comment text — parse @username tokens into clickable mentions (open new tab)
const renderCommentContent = (content, T) => {
  if (!content) return null;
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (/^@\w+$/.test(part)) {
      const username = part.slice(1);
      return (
        <span
          key={i}
          style={{ color: T.accent, fontWeight: "600", cursor: "pointer" }}
          onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
          onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
          onClick={(e) => { e.stopPropagation(); window.open(`/users/${username}`, '_blank'); }}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const ProblemDetailsPage = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // contestId is passed as ?contestId=<id> when navigating from a contest
  const contestId = searchParams.get("contestId")
    ? Number(searchParams.get("contestId"))
    : null;
  // labId is passed as ?labId=<id> when navigating from a lab exercise
  const labId = searchParams.get("labId")
    ? Number(searchParams.get("labId"))
    : null;
  const [problem, setProblem] = useState(null);
  const [statement, setStatement] = useState("");
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [pollingId, setPollingId] = useState(null);
  const [queuePosition, setQueuePosition] = useState(null);
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [verdictFilter, setVerdictFilter] = useState(null);

  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionsLoaded, setSubmissionsLoaded] = useState(false);

  const [hintPanelOpen, setHintPanelOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [hintInput, setHintInput] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini");

  const [hintPanelWidth, setHintPanelWidth] = useState(340);
  const [isDraggingHint, setIsDraggingHint] = useState(false);
  const [vizOpen, setVizOpen] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // ── Comments state ────────────────────────────────────────────────────────
  const COMMENTS_PER_PAGE = 5;
  const [comments, setComments] = useState([]);
  const [commentsTotalElements, setCommentsTotalElements] = useState(0);
  const [commentsTotalPages, setCommentsTotalPages] = useState(0);
  const [commentPage, setCommentPage] = useState(0);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // { username, profileUrl }
  const [commentInput, setCommentInput] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);   // { id, username }
  const [replyInput, setReplyInput] = useState("");
  const [editingComment, setEditingComment] = useState(null); // { id, content }
  const [editInput, setEditInput] = useState("");

  // ── Workspace layout ────────────────────────────────────────────────────────
  const [layout, setLayout] = useState({
    left: ["description", "submissions", "comments"],
    "right-top": ["editor"],
    "right-bottom": ["testcases", "results"],
  });
  const [activeInSlot, setActiveInSlot] = useState({
    left: "description",
    "right-top": "editor",
    "right-bottom": "testcases",
  });
  // @dnd-kit drag state
  const [activeTab, setActiveTab] = useState(null); // { id, fromSlot, panelId }
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const movePanel = (fromSlot, panelId, targetSlot) => {
    if (fromSlot === targetSlot || layout[fromSlot].length <= 1) return;
    setLayout((prev) => {
      const next = { ...prev };
      next[fromSlot] = next[fromSlot].filter((id) => id !== panelId);
      if (!next[targetSlot].includes(panelId)) next[targetSlot] = [...next[targetSlot], panelId];
      return next;
    });
    setActiveInSlot((prev) => {
      const next = { ...prev };
      if (next[fromSlot] === panelId)
        next[fromSlot] = layout[fromSlot].find((id) => id !== panelId) ?? layout[fromSlot][0];
      next[targetSlot] = panelId;
      return next;
    });
  };

  const handleDragStart = ({ active }) => {
    const [fromSlot, panelId] = active.id.split(":");
    setActiveTab({ id: active.id, fromSlot, panelId });
  };

  const handleDragEnd = ({ over }) => {
    if (over && activeTab) {
      const targetSlot = over.data.current?.slotId;
      if (targetSlot) movePanel(activeTab.fromSlot, activeTab.panelId, targetSlot);
    }
    setActiveTab(null);
  };

  const showResultsPanel = () => {
    const slot = Object.keys(layout).find((s) => layout[s].includes("results")) ?? "right-bottom";
    setActiveInSlot((prev) => ({ ...prev, [slot]: "results" }));
  };

  const { showMessage } = useToast();
  const codeEditorRef = useRef(null);

  const fetchProblem = async () => {
    try {
      const response = await ApiService.getProblemBySlug(slug);
      if (response.statusCode === 200) {
        setProblem(response.data);
        const statementRes = await ApiService.fetchFileContent(
          response.data.statementFileUrl,
        );
        setStatement(statementRes);
        const sampleTestCases = response.data.testCases.filter(
          (tc) => tc.isSample === true,
        );
        const fetched = await Promise.all(
          sampleTestCases.map(async (tc) => ({
            id: tc.id,
            input: await ApiService.fetchFileContent(tc.inputFileUrl),
            output: await ApiService.fetchFileContent(tc.expectedOutputFileUrl),
          })),
        );
        setTestCases(fetched);

        // Load favorite status + current user profile if logged in
        if (ApiService.isAuthenticated()) {
          try {
            const favResp = await ApiService.getFavoriteProblems();
            if (favResp.statusCode === 200) {
              const favIds = (favResp.data || []).map((p) => p.id);
              setIsFavorited(favIds.includes(response.data.id));
            }
          } catch (_) { /* ignore */ }

          try {
            const meResp = await ApiService.getOwnProfile();
            if (meResp.statusCode === 200) {
              setCurrentUser({
                username: meResp.data.username,
                profileUrl: meResp.data.profileUrl,
              });
            }
          } catch (_) { /* ignore */ }
        }
      }
    } catch (error) {
      showMessage(error.response?.data?.message || error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!ApiService.isAuthenticated()) {
      showMessage("Please log in to save favorites", "warning");
      return;
    }
    if (favoriteLoading || !problem) return;
    setFavoriteLoading(true);
    try {
      const resp = await ApiService.toggleFavorite(problem.id);
      if (resp.statusCode === 200) {
        setIsFavorited(resp.data.isFavorited);
        showMessage(
          resp.data.isFavorited ? "Added to favorites ★" : "Removed from favorites",
          resp.data.isFavorited ? "success" : "info",
        );
      }
    } catch (error) {
      showMessage(error.response?.data?.message || error.message, "error");
    } finally {
      setFavoriteLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    if (!problem?.id) return;
    setLoadingSubmissions(true);
    try {
      const resp = await ApiService.getMySubmissions({
        limit: 20,
        offset: 0,
        problemId: problem.id,
      });
      if (resp.statusCode === 200 && resp.data) {
        setSubmissions(resp.data.content || []);
        setSubmissionsLoaded(true);
      }
    } catch (error) {
      showMessage(error.response?.data?.message || error.message, "error");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!codeEditorRef.current) return;
    const { code, language } = codeEditorRef.current.getCodeAndLanguage();
    if (!code?.trim()) {
      showMessage("Please write some code before submitting", "warning");
      return;
    }

    setSubmitting(true);
    setResults(null);
    setQueuePosition(null);

    try {
      // 1. POST submission — returns immediately with PENDING
      const resp = await ApiService.createSubmission({
        sourceCode: code,
        submissionLanguage: mapEditorLanguageToSubmissionLanguage(language),
        problemId: problem.id,
        isPublic: true,
        contestId,
        labId,
      });

      const sub = resp.data;
      setQueuePosition(sub.queuePosition ?? null);
      showResultsPanel();

      // 2. Poll /status every 2s until COMPLETED
      const intervalId = setInterval(async () => {
        try {
          const statusResp = await ApiService.getSubmissionStatus(sub.id);
          const updated = statusResp.data;

          if (updated.submissionStatus === "PENDING") {
            setQueuePosition(updated.queuePosition ?? null);
          } else if (updated.submissionStatus === "RUNNING") {
            setQueuePosition(null); // no longer in queue
          } else if (updated.submissionStatus === "COMPLETED") {
            clearInterval(intervalId);
            setPollingId(null);
            setSubmitting(false);
            setQueuePosition(null);

            const allPassed = updated.submissionVerdict === "AC";

            if (allPassed && !problem?.solved) {
              setProblem((prev) => ({
                ...prev,
                solved: true,
                attempted: false,
              }));
            } else if (!allPassed) {
              setProblem((prev) => ({ ...prev, attempted: true }));
            }

            setResults({
              allPassed,
              passedCount: updated.testCasesPassed ?? 0,
              totalCount: updated.totalTestCases ?? testCases.length,
              verdict: updated.submissionVerdict,
              errorMessage: updated.errorMessage,
              executionTime: updated.executionTime,
              memoryUsed: updated.memoryUsed,
            });

            showMessage(
              allPassed
                ? "All test cases passed! 🎉"
                : `${updated.testCasesPassed}/${updated.totalTestCases} test cases passed — ${updated.submissionVerdict}`,
              allPassed ? "success" : "warning",
            );

            if (submissionsLoaded) await fetchSubmissions();
          }
        } catch (err) {
          clearInterval(intervalId);
          setPollingId(null);
          setSubmitting(false);
          showMessage(err.response?.data?.message || err.message, "error");
        }
      }, 2000);

      setPollingId(intervalId);
    } catch (error) {
      setSubmitting(false);
      if (error.response?.status === 429) {
        showMessage("Please wait 5 seconds before submitting again", "warning");
      } else {
        showMessage(error.response?.data?.message || error.message, "error");
      }
    }
  };

  const handleHintSubmit = async (question = null) => {
    const userQuestion = (question || hintInput).trim();
    if (!userQuestion || hintLoading) return;
    setHintInput("");
    setHintLoading(true);

    const { code, language } =
      codeEditorRef.current?.getCodeAndLanguage() || {};

    // Build history from existing messages
    const history = messages.flatMap((msg) => [
      { role: "user", content: msg.user },
      { role: "assistant", content: msg.assistant },
    ]);

    try {
      const resp = await ApiService.getHint({
        problemTitle: problem.title,
        problemStatement: statement,
        userQuestion,
        model: selectedModel,
        currentCode: code || "",
        currentLanguage: language || "",
        errorMessage: results?.errorMessage || "",
        history,
      });
      setMessages((prev) => [
        ...prev,
        { user: userQuestion, assistant: resp.data },
      ]);
    } catch (error) {
      showMessage(error.response?.data?.message || error.message, "error");
    } finally {
      setHintLoading(false);
    }
  };

  useEffect(() => {
    fetchProblem();
  }, [slug]);

  useEffect(() => {
    return () => {
      if (pollingId) clearInterval(pollingId);
    };
  }, [pollingId]);

  useEffect(() => {
    if (!isDraggingHint) return;

    const handleMouseMove = (e) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 260 && newWidth <= 600) {
        setHintPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => setIsDraggingHint(false);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingHint]);

  const activeTags = (problem?.tags || []).filter((t) => t.isActive !== false);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: T.bg,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <div className="spinner" style={{ borderTopColor: T.accent }} />
          <span style={{ color: T.textMuted, fontSize: 13 }}>
            Loading problem...
          </span>
        </div>
      </div>
    );
  }

  // ── Comment helpers ───────────────────────────────────────────────────────
  const fetchComments = async (page = commentPage) => {
    if (!problem?.id) return;
    setCommentsLoading(true);
    try {
      const resp = await ApiService.getComments(problem.id, page, COMMENTS_PER_PAGE);
      if (resp.statusCode === 200 && resp.data) {
        setComments(resp.data.content || []);
        // Spring Boot 3.x puts pagination metadata under data.page
        const pageInfo = resp.data.page ?? resp.data; // fallback for older Spring
        setCommentsTotalElements(pageInfo.totalElements ?? 0);
        setCommentsTotalPages(pageInfo.totalPages ?? 0);
        setCommentPage(page);
        setCommentsLoaded(true);
      }
    } catch (e) {
      showMessage(e.response?.data?.message || e.message, "error");
    } finally {
      setCommentsLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentInput.trim()) return;
    setCommentSubmitting(true);
    try {
      const resp = await ApiService.createComment(problem.id, { content: commentInput.trim() });
      if (resp.statusCode === 201) {
        setCommentInput("");
        await fetchComments(0); // newest comment → page 0
      }
    } catch (e) {
      showMessage(e.response?.data?.message || e.message, "error");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handlePostReply = async (parentId) => {
    if (!replyInput.trim()) return;
    setCommentSubmitting(true);
    try {
      const resp = await ApiService.createComment(problem.id, {
        content: replyInput.trim(),
        parentId,
      });
      if (resp.statusCode === 201) {
        setReplyInput("");
        setReplyingTo(null);
        await fetchComments(commentPage); // stay on current page after reply
      }
    } catch (e) {
      showMessage(e.response?.data?.message || e.message, "error");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleVote = async (commentId, voteType) => {
    if (!ApiService.isAuthenticated()) {
      showMessage("Login to vote", "warning");
      return;
    }
    try {
      const resp = await ApiService.voteComment(problem.id, commentId, voteType);
      if (resp.statusCode === 200) {
        // Patch updated counts into local state without full reload
        const updated = resp.data;
        setComments((prev) => patchComment(prev, updated));
      }
    } catch (e) {
      showMessage(e.response?.data?.message || e.message, "error");
    }
  };

  const patchComment = (list, updated) =>
    list.map((c) => {
      if (c.id === updated.id) return { ...c, ...updated };
      return {
        ...c,
        replies: c.replies ? patchComment(c.replies, updated) : c.replies,
      };
    });

  const handleEditSave = async (commentId) => {
    if (!editInput.trim()) return;
    try {
      const resp = await ApiService.editComment(problem.id, commentId, editInput.trim());
      if (resp.statusCode === 200) {
        setEditingComment(null);
        setEditInput("");
        await fetchComments();
      }
    } catch (e) {
      showMessage(e.response?.data?.message || e.message, "error");
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await ApiService.deleteComment(problem.id, commentId);
      await fetchComments();
    } catch (e) {
      showMessage(e.response?.data?.message || e.message, "error");
    }
  };

  const formatCommentDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 30) return `${diffD}d ago`;
    return d.toLocaleDateString();
  };

  const currentUsername = currentUser?.username ?? null;

  const PANEL_LABELS = {
    description: "Description",
    submissions: "Submissions",
    comments: `Comments${commentsTotalElements > 0 ? ` (${commentsTotalElements})` : ""}`,
    results: submitting ? "Judging…" : results ? `Results ${results.passedCount}/${results.totalCount}` : "Results",
    editor: "Code Editor",
    testcases: "Test Cases",
  };

  // Draggable tab — @dnd-kit useDraggable
  const DraggableTab = ({ panelId, slotId, isActive }) => {
    const dndId = `${slotId}:${panelId}`;
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: dndId,
      data: { panelId, fromSlot: slotId },
    });
    return (
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={async (e) => {
          // click fires even when drag-distance < threshold, but not after a real drag
          if (!isDragging) {
            setActiveInSlot((prev) => ({ ...prev, [slotId]: panelId }));
            if (panelId === "submissions" && !submissionsLoaded) await fetchSubmissions();
            if (panelId === "comments" && !commentsLoaded) await fetchComments();
          }
        }}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "8px 12px",
          cursor: isDragging ? "grabbing" : "grab",
          borderBottom: `2px solid ${isActive ? T.accent : "transparent"}`,
          color: isActive ? T.text : T.textMuted,
          fontSize: 13, fontWeight: isActive ? 600 : 400,
          whiteSpace: "nowrap", flexShrink: 0,
          userSelect: "none",
          opacity: isDragging ? 0.35 : 1,
          transition: "opacity 0.1s, color 0.12s",
          touchAction: "none",
        }}
        onMouseEnter={(e) => { if (!isActive && !isDragging) e.currentTarget.style.color = T.text; }}
        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = T.textMuted; }}
      >
        <GripVertical size={12} style={{ color: T.textDim, flexShrink: 0, opacity: 0.5 }} />
        {PANEL_LABELS[panelId]}
        {panelId === "results" && results && (
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: results.allPassed ? T.green : T.red, flexShrink: 0 }} />
        )}
      </div>
    );
  };

  // Drop zone tab bar — @dnd-kit useDroppable
  const SlotTabBar = ({ slotId }) => {
    const panels = layout[slotId] ?? [];
    const active = activeInSlot[slotId];
    const isDragOver = activeTab && activeTab.fromSlot !== slotId;
    const { isOver, setNodeRef } = useDroppable({
      id: `slot:${slotId}`,
      data: { slotId },
    });
    return (
      <div
        ref={setNodeRef}
        style={{
          display: "flex", flexShrink: 0, background: T.surface,
          borderBottom: `1px solid ${isOver && isDragOver ? T.accent : T.border}`,
          boxShadow: isOver && isDragOver ? `inset 0 -2px 0 ${T.accent}` : "none",
          overflowX: "auto", overflowY: "visible",
          transition: "border-color 0.1s, box-shadow 0.1s",
          minHeight: 37,
        }}
      >
        {panels.map((panelId) => (
          <DraggableTab
            key={panelId}
            panelId={panelId}
            slotId={slotId}
            isActive={active === panelId}
          />
        ))}
        {/* Empty drop hint when dragging over a slot with no tabs visible */}
        {isOver && isDragOver && panels.length === 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.accent, fontSize: 12, opacity: 0.7 }}>
            Drop here
          </div>
        )}
      </div>
    );
  };

  // Problem header — reused wherever the description panel lives
  const problemHeaderJSX = (
    <div style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 20, paddingBottom: 16, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
      <p style={{ fontSize: 20, fontWeight: "700", color: T.text, marginBottom: 12, lineHeight: 1.3, letterSpacing: "-0.02em" }}>
        {problem?.title}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        {problem?.problemDifficulty && <DifficultyBadge difficulty={problem.problemDifficulty} />}
        {problem?.solved && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, paddingLeft: 8, paddingRight: 8, paddingTop: "2px", paddingBottom: "2px", borderRadius: "4px", fontSize: 12, fontWeight: "700", color: T.green, background: T.greenDim, border: `1px solid ${T.green}44` }}>
            <CheckCircle size={11} /><span>Solved</span>
          </div>
        )}
        {problem?.attempted && !problem?.solved && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, paddingLeft: 8, paddingRight: 8, paddingTop: "2px", paddingBottom: "2px", borderRadius: "4px", fontSize: 12, fontWeight: "700", color: "#f97316", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)" }}>
            <Clock size={11} /><span>Attempted</span>
          </div>
        )}
        <StatChip icon={<Zap size={11} />} value={`${problem?.point} pts`} color={T.accent} />
        <StatChip icon={<Clock size={11} />} value={`${problem?.timeLimit}s`} color={T.blue} />
        <StatChip icon={<HardDrive size={11} />} value={`${problem?.memoryLimit}MB`} color={T.textMuted} />
        {activeTags.length > 0 && (
          <>
            <div style={{ width: "1px", height: "16px", background: T.border, marginLeft: 4, marginRight: 4 }} />
            {activeTags.map((tag) => <TagChip key={tag.id} name={tag.name} />)}
          </>
        )}
      </div>
    </div>
  );

  // Editor header buttons — shared across all slots
  const editorHeaderButtons = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button onClick={handleToggleFavorite} style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 4, borderRadius: "6px", background: isFavorited ? "rgba(251,191,36,0.12)" : "transparent", border: `1px solid ${isFavorited ? "#fbbf24" : T.border}`, color: isFavorited ? "#fbbf24" : T.textMuted, fontSize: 12, fontWeight: "600", cursor: favoriteLoading ? "not-allowed" : "pointer", opacity: favoriteLoading ? 0.6 : 1, outline: "none" }}>
        {isFavorited ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
        <span style={{ marginLeft: 4 }}>{isFavorited ? "Saved" : "Save"}</span>
      </button>
      <button onClick={() => setHintPanelOpen((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 4, borderRadius: "6px", background: hintPanelOpen ? "var(--primary-subtle)" : "transparent", border: `1px solid ${hintPanelOpen ? "var(--primary)" : "var(--border-default)"}`, color: hintPanelOpen ? "var(--primary)" : "var(--text-secondary)", fontSize: 12, fontWeight: "600", cursor: "pointer", outline: "none" }}>
        <Lightbulb size={13} /><span style={{ marginLeft: 4 }}>Hints</span>
      </button>
      <button onClick={() => setVizOpen(true)} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-default)", fontWeight: "600", fontSize: 13, paddingLeft: 14, paddingRight: 14, paddingTop: 4, paddingBottom: 4, borderRadius: "6px", cursor: "pointer", transition: "all 0.15s", outline: "none" }} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-subtle)"; e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
        <Activity size={13} />Visualize
      </button>
      <button onClick={handleSubmit} disabled={submitting} style={{ background: T.accent, color: "var(--text-inverse)", fontWeight: "700", fontSize: 13, paddingLeft: 20, paddingRight: 20, paddingTop: 4, paddingBottom: 4, borderRadius: "6px", cursor: submitting ? "not-allowed" : "pointer", transition: "all 0.15s", outline: "none", border: "none", opacity: submitting ? 0.7 : 1 }} onMouseEnter={(e) => { if (!submitting) { e.currentTarget.style.filter = "brightness(1.15)"; e.currentTarget.style.transform = "translateY(-1px)"; } }} onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "none"; }}>
        Run & Submit
      </button>
    </div>
  );

  // Render content for a single panel
  const renderPanelContent = (panelId) => {
    switch (panelId) {
      case "testcases": return (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {testCases.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingTop: 48 }}>
              <Terminal size={28} style={{ color: "var(--text-muted)", opacity: 0.4 }} />
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>No sample test cases</span>
            </div>
          ) : testCases.map((tc, i) => (
            <div key={tc.id} style={{ flexShrink: 0, borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", overflow: "hidden", background: "var(--bg-base)" }}>
              <div style={{ padding: "7px 14px", background: "var(--bg-void)", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, fontFamily: "var(--font-code)", color: "var(--primary)", background: "var(--primary-subtle)", border: "1px solid var(--border-accent)", padding: "1px 7px", borderRadius: "var(--radius-sm)", letterSpacing: "0.06em" }}>
                  CASE {i + 1}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                {[{ label: "INPUT", val: tc.input, accent: false }, { label: "EXPECTED OUTPUT", val: tc.output, accent: true }].map(({ label, val, accent }, idx) => (
                  <div key={label} style={{ display: "flex", flexDirection: "column", borderRight: idx === 0 ? "1px solid var(--border-subtle)" : "none", background: accent ? "var(--green-subtle)" : "transparent" }}>
                    <div style={{ padding: "6px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
                      <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: accent ? "var(--green-ac)" : "var(--text-muted)", letterSpacing: "0.06em", fontFamily: "var(--font-code)" }}>{label}</span>
                    </div>
                    <div style={{ flex: 1, padding: "12px 14px", fontFamily: "var(--font-code)", fontSize: "var(--text-sm)", color: accent ? "var(--green-ac)" : "var(--text-primary)", whiteSpace: "pre-wrap", lineHeight: 1.7, minHeight: 44, maxHeight: 200, overflowY: "auto" }}>
                      {val || <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontFamily: "var(--font-body)" }}>empty</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
      case "description": return (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {problemHeaderJSX}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 20 }}>
            <div className="problem-description">
              <ReactMarkdown>{statement}</ReactMarkdown>
            </div>
          </div>
        </div>
      );
      case "submissions": return (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {loadingSubmissions ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
              <div className="spinner" style={{ borderTopColor: "var(--primary)" }} />
            </div>
          ) : submissions.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", fontFamily: "var(--font-body)", margin: 0 }}>No submissions yet</p>
            </div>
          ) : submissions.map((s) => {
            const vc = { AC: { c: "var(--green-ac)", bg: "var(--green-subtle)" }, WA: { c: "var(--red-wa)", bg: "var(--red-subtle)" }, TLE: { c: "var(--amber-tle)", bg: "var(--amber-subtle)" }, CE: { c: "var(--blue-ce)", bg: "var(--blue-subtle)" }, MLE: { c: "var(--purple-mle)", bg: "var(--purple-subtle)" } }[s.submissionVerdict] || { c: "var(--text-muted)", bg: "var(--bg-raised)" };
            return (
              <div key={s.id} style={{ borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", borderLeft: `3px solid ${vc.c}`, background: "transparent", transition: "background 0.12s", cursor: "default" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--text-xs)", fontWeight: 700, color: vc.c, background: vc.bg, padding: "2px 7px", borderRadius: "var(--radius-sm)", letterSpacing: "0.04em", flexShrink: 0 }}>
                  {s.submissionVerdict ?? "—"}
                </span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontFamily: "var(--font-code)" }}>{s.submissionLanguage}</span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginLeft: "auto", fontFamily: "var(--font-code)" }}>
                  {s.testCasesPassed != null ? `${s.testCasesPassed}/${s.totalTestCases}` : ""}
                  {s.executionTime != null ? ` · ${s.executionTime}ms` : ""}
                </span>
              </div>
            );
          })}
        </div>
      );
      case "results": return (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {submitting && queuePosition != null && (
            <div style={{ padding: "18px 20px", borderRadius: "var(--radius-md)", background: "var(--blue-subtle)", border: "1px solid var(--border-default)", borderLeft: "4px solid var(--blue-ce)", display: "flex", alignItems: "center", gap: 14 }}>
              <div className="spinner" style={{ borderTopColor: "var(--blue-ce)", width: 18, height: 18, flexShrink: 0 }} />
              <div>
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-xl)", color: "var(--blue-ce)", margin: "0 0 3px", letterSpacing: "0.02em" }}>IN QUEUE</p>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", margin: 0, fontFamily: "var(--font-code)" }}>Position #{queuePosition}</p>
              </div>
            </div>
          )}
          {submitting && queuePosition == null && (
            <div style={{ padding: "18px 20px", borderRadius: "var(--radius-md)", background: "var(--primary-subtle)", border: "1px solid var(--border-accent)", borderLeft: "4px solid var(--primary)", display: "flex", alignItems: "center", gap: 14 }}>
              <div className="spinner" style={{ borderTopColor: "var(--primary)", width: 18, height: 18, flexShrink: 0 }} />
              <div>
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-xl)", color: "var(--primary)", margin: "0 0 3px", letterSpacing: "0.02em" }}>JUDGING</p>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", margin: 0, fontFamily: "var(--font-code)" }}>Running against test cases…</p>
              </div>
            </div>
          )}
          {results && (
            <>
              <div style={{ flexShrink: 0, padding: "18px 20px", borderRadius: "var(--radius-md)", background: results.allPassed ? "var(--green-subtle)" : "var(--red-subtle)", border: `1px solid ${results.allPassed ? "var(--green-ac)" : "var(--red-wa)"}33`, borderLeft: `4px solid ${results.allPassed ? "var(--green-ac)" : "var(--red-wa)"}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  {results.allPassed ? <CheckCircle size={20} color="var(--green-ac)" strokeWidth={2.5} /> : <XCircle size={20} color="var(--red-wa)" strokeWidth={2.5} />}
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "var(--text-2xl)", letterSpacing: "0.01em", color: results.allPassed ? "var(--green-ac)" : "var(--red-wa)" }}>
                    {VERDICT_LABEL[results.verdict] ?? results.verdict}
                  </span>
                </div>
                <div style={{ marginBottom: results.executionTime != null || results.memoryUsed != null ? 12 : 0 }}>
                  <div style={{ height: 3, borderRadius: 2, background: results.allPassed ? "var(--green-subtle)" : "var(--red-subtle)", overflow: "hidden", marginBottom: 6 }}>
                    <div style={{ height: "100%", width: `${(results.passedCount / results.totalCount) * 100}%`, background: results.allPassed ? "var(--green-ac)" : "var(--red-wa)", borderRadius: 2, transition: "width 0.5s ease" }} />
                  </div>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontFamily: "var(--font-code)" }}>
                    {results.passedCount} / {results.totalCount} test cases passed
                  </span>
                </div>
                {(results.executionTime != null || results.memoryUsed != null) && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {results.executionTime != null && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--text-xs)", fontFamily: "var(--font-code)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-overlay)", padding: "2px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                        <Clock size={10} />{results.executionTime} ms
                      </span>
                    )}
                    {results.memoryUsed != null && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--text-xs)", fontFamily: "var(--font-code)", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-overlay)", padding: "2px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                        <HardDrive size={10} />{results.memoryUsed} KB
                      </span>
                    )}
                  </div>
                )}
              </div>
              {results.errorMessage && (
                <div style={{ flexShrink: 0, borderRadius: "var(--radius-md)", border: "1px solid var(--red-wa)33", overflow: "hidden" }}>
                  <div style={{ padding: "6px 14px", background: "var(--red-subtle)", borderBottom: "1px solid var(--red-wa)33" }}>
                    <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--red-wa)", fontFamily: "var(--font-code)", letterSpacing: "0.06em" }}>
                      {results.verdict === "CE" ? "COMPILATION ERROR" : "RUNTIME ERROR"}
                    </span>
                  </div>
                  <pre style={{ margin: 0, padding: "12px 14px", fontFamily: "var(--font-code)", fontSize: "var(--text-xs)", color: "var(--red-wa)", whiteSpace: "pre-wrap", background: "var(--bg-void)", lineHeight: 1.7, maxHeight: 260, overflowY: "auto" }}>
                    {results.errorMessage}
                  </pre>
                </div>
              )}
            </>
          )}
          {!submitting && !results && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingTop: 48 }}>
              <Terminal size={28} style={{ color: "var(--text-muted)", opacity: 0.35 }} />
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Submit your code to see results</p>
            </div>
          )}
        </div>
      );
      case "comments": return (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Compose */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}>
            {ApiService.isAuthenticated() ? (
              <div style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--bg-void)", overflow: "hidden", transition: "border-color 0.15s" }}
                onFocusCapture={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                onBlurCapture={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; }}
              >
                <textarea value={commentInput} onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Share your approach or ask a question…"
                  rows={3}
                  style={{ width: "100%", background: "transparent", border: "none", outline: "none", resize: "vertical", color: "var(--text-primary)", fontSize: "var(--text-sm)", lineHeight: 1.7, padding: "11px 14px", fontFamily: "var(--font-body)", boxSizing: "border-box" }}
                  onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handlePostComment(); }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 12px", borderTop: "1px solid var(--border-subtle)" }}>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-code)" }}>Ctrl+Enter to post</span>
                  <button onClick={handlePostComment} disabled={commentSubmitting}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 14px", borderRadius: "var(--radius-sm)", background: "var(--primary)", color: "var(--text-inverse)", fontSize: "var(--text-xs)", fontWeight: 700, cursor: commentSubmitting ? "not-allowed" : "pointer", border: "none", outline: "none", opacity: commentSubmitting ? 0.6 : 1, fontFamily: "var(--font-body)" }}>
                    <Send size={11} />Post
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: "13px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", background: "var(--bg-raised)", textAlign: "center", fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                <span style={{ color: "var(--primary)", fontWeight: 600, cursor: "pointer" }}>Log in</span> to join the discussion
              </div>
            )}
          </div>
          {/* List */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            {commentsLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                <div className="spinner" style={{ borderTopColor: "var(--primary)" }} />
              </div>
            ) : comments.length === 0 ? (
              <div style={{ padding: "48px 20px", textAlign: "center" }}>
                <MessageSquare size={26} style={{ color: "var(--text-muted)", opacity: 0.3, margin: "0 auto 10px", display: "block" }} />
                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>No comments yet — be the first</p>
              </div>
            ) : (
              <>
                {comments.map((comment) => (
                  <CommentBlock key={comment.id} comment={comment} T={T} currentUsername={currentUsername} navigate={navigate}
                    replyingTo={replyingTo} setReplyingTo={setReplyingTo} replyInput={replyInput} setReplyInput={setReplyInput}
                    editingComment={editingComment} setEditingComment={setEditingComment} editInput={editInput} setEditInput={setEditInput}
                    commentSubmitting={commentSubmitting} onVote={handleVote} onReply={handlePostReply} onEditSave={handleEditSave}
                    onDelete={handleDeleteComment} formatDate={formatCommentDate} />
                ))}
                {commentsTotalPages > 1 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "14px 20px", borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap" }}>
                    <button onClick={() => commentPage > 0 && fetchComments(commentPage - 1)} disabled={commentPage === 0}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", fontWeight: 600, background: "transparent", border: "1px solid var(--border-default)", color: commentPage === 0 ? "var(--text-muted)" : "var(--text-secondary)", cursor: commentPage === 0 ? "not-allowed" : "pointer", opacity: commentPage === 0 ? 0.5 : 1, fontFamily: "var(--font-body)" }}
                      onMouseEnter={(e) => { if (commentPage > 0) { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; } }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = commentPage === 0 ? "var(--text-muted)" : "var(--text-secondary)"; }}
                    ><ChevronLeft size={12} />Prev</button>
                    {Array.from({ length: commentsTotalPages }, (_, i) => i).map((p) => (
                      <button key={p} onClick={() => p !== commentPage && fetchComments(p)}
                        style={{ minWidth: 28, height: 26, borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", fontWeight: 700, background: p === commentPage ? "var(--primary)" : "transparent", color: p === commentPage ? "var(--text-inverse)" : "var(--text-secondary)", border: `1px solid ${p === commentPage ? "var(--primary)" : "var(--border-default)"}`, cursor: p === commentPage ? "default" : "pointer", fontFamily: "var(--font-code)" }}
                        onMouseEnter={(e) => { if (p !== commentPage) { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; } }}
                        onMouseLeave={(e) => { if (p !== commentPage) { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-secondary)"; } }}
                      >{p + 1}</button>
                    ))}
                    <button onClick={() => commentPage < commentsTotalPages - 1 && fetchComments(commentPage + 1)} disabled={commentPage >= commentsTotalPages - 1}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", fontWeight: 600, background: "transparent", border: "1px solid var(--border-default)", color: commentPage >= commentsTotalPages - 1 ? "var(--text-muted)" : "var(--text-secondary)", cursor: commentPage >= commentsTotalPages - 1 ? "not-allowed" : "pointer", opacity: commentPage >= commentsTotalPages - 1 ? 0.5 : 1, fontFamily: "var(--font-body)" }}
                      onMouseEnter={(e) => { if (commentPage < commentsTotalPages - 1) { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; } }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = commentPage >= commentsTotalPages - 1 ? "var(--text-muted)" : "var(--text-secondary)"; }}
                    >Next<ChevronRight size={12} /></button>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-code)", marginLeft: 4 }}>
                      {commentPage + 1} / {commentsTotalPages} · {commentsTotalElements} total
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      );
      case "editor": return (
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <CodeEditor ref={codeEditorRef} rightHeaderContent={editorHeaderButtons} />
        </div>
      );
      default: return null;
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: T.bg,
        color: T.text,
        fontFamily: "'Inter', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Nav Bar removed — Save/AI moved into editor header */}
      {false && <div
        style={{
          height: "44px",
          background: T.surface,
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          paddingLeft: 16,
          paddingRight: 16,
          gap: 16,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 18,
            fontWeight: "800",
            color: T.accent,
            letterSpacing: "-0.03em",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {"<OJ/>"}
        </span>
        <div style={{ flex: 1 }} />

        {/* Bookmark / Favorite button */}
        <button
          onClick={handleToggleFavorite}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            paddingLeft: 12,
            paddingRight: 12,
            paddingTop: 4,
            paddingBottom: 4,
            borderRadius: "6px",
            background: isFavorited ? "rgba(251,191,36,0.12)" : "transparent",
            border: `1px solid ${isFavorited ? "#fbbf24" : T.border}`,
            color: isFavorited ? "#fbbf24" : T.textMuted,
            fontSize: 12,
            fontWeight: "600",
            cursor: favoriteLoading ? "not-allowed" : "pointer",
            opacity: favoriteLoading ? 0.6 : 1,
            transition: "all 0.15s",
            outline: "none",
          }}
          title={isFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorited
            ? <BookmarkCheck size={14} />
            : <Bookmark size={14} />}
          <span style={{ marginLeft: 4 }}>{isFavorited ? "Saved" : "Save"}</span>
        </button>

        <button
          onClick={() => setHintPanelOpen((prev) => !prev)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            paddingLeft: 12,
            paddingRight: 12,
            paddingTop: 4,
            paddingBottom: 4,
            borderRadius: "6px",
            background: hintPanelOpen ? "var(--primary-subtle)" : "transparent",
            border: `1px solid ${hintPanelOpen ? "var(--primary)" : "var(--border-default)"}`,
            color: hintPanelOpen ? "var(--primary)" : "var(--text-secondary)",
            fontSize: 12,
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.15s",
            outline: "none",
          }}
        >
          <Lightbulb size={14} /><span style={{ marginLeft: 4 }}>Hints</span>
        </button>
      </div>}

      {/* ── Main split ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <DndContext
            sensors={dndSensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
          <PanelGroup direction="horizontal" style={{ height: "100%" }}>
            {/* ══ LEFT SLOT ══ */}
            <Panel
              defaultSize={42}
              minSize={18}
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                background: T.surface,
                borderRight: `1px solid ${T.border}`,
                overflow: "hidden",
              }}
            >
              <SlotTabBar slotId="left" />
              {/* Problem header — follows description panel */}
              <>
              {activeInSlot.left === "description" && problemHeaderJSX}

              {/* Panel content — driven by activeInSlot.left */}
              {activeInSlot.left === "testcases" && renderPanelContent("testcases")}
              {activeInSlot.left === "editor" && renderPanelContent("editor")}
              <div style={{ flex: 1, overflowY: "auto", paddingLeft: 20, paddingRight: 20, paddingTop: 20, paddingBottom: 20, display: ["testcases", "editor"].includes(activeInSlot.left) ? "none" : "block" }}>
                {/* ── Description ── */}
                {activeInSlot.left === "description" && (
                  <div
                    className="problem-description"
                    style={{
                      fontSize: 13,
                      lineHeight: "1.8",
                      color: T.text,
                    }}
                  >
                    <ReactMarkdown>{statement}</ReactMarkdown>
                  </div>
                )}

                {/* ── Test Cases ── */}
                {activeInSlot.left === "testcases" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {testCases.map((tc, index) => (
                      <div
                        key={tc.id}
                        style={{
                          borderRadius: "8px",
                          border: `1px solid ${T.border}`,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            paddingLeft: 12,
                            paddingRight: 12,
                            paddingTop: 8,
                            paddingBottom: 8,
                            background: T.bg,
                            borderBottom: `1px solid ${T.border}`,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color: T.textMuted,
                              letterSpacing: "0.05em",
                            }}
                          >
                            CASE {index + 1}
                          </span>
                        </div>
                        <div
                          style={{
                            padding: 12,
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 12,
                          }}
                        >
                          {[
                            { label: "INPUT", val: tc.input, color: "#c8c8c8" },
                            {
                              label: "EXPECTED",
                              val: tc.output,
                              color: T.green,
                            },
                          ].map(({ label, val, color }) => (
                            <div key={label}>
                              <span
                                style={{
                                  fontSize: 12,
                                  color: T.textDim,
                                  fontWeight: "600",
                                  marginBottom: 4,
                                  display: "block",
                                  letterSpacing: "0.04em",
                                }}
                              >
                                {label}
                              </span>
                              <div
                                style={{
                                  background: T.bg,
                                  padding: 8,
                                  borderRadius: "6px",
                                  fontFamily: "'JetBrains Mono', monospace",
                                  fontSize: 12,
                                  color,
                                  whiteSpace: "pre-wrap",
                                  border: `1px solid ${T.border}`,
                                  minHeight: "40px",
                                  maxHeight: 200,
                                  overflowY: "auto",
                                }}
                              >
                                {val}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Submissions ── */}
                {activeInSlot.left === "submissions" && (
                  <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    {/* ── Submission detail view (like NeetCode's "← All Submissions" panel) ── */}
                    {viewingSubmission ? (
                      <div style={{ display: "flex", flexDirection: "column", overflowY: "auto", flex: 1 }}>
                        {/* Back button + header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}>
                          <button onClick={() => setViewingSubmission(null)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: "var(--radius-sm)", background: "transparent", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "var(--text-xs)", fontWeight: 600, outline: "none", transition: "all 0.12s", fontFamily: "var(--font-body)", flexShrink: 0 }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                          >
                            <ChevronLeft size={12} />All
                          </button>
                          <div style={{ width: 1, height: 16, background: "var(--border-default)", flexShrink: 0 }} />
                          {(() => {
                            const VC = { AC: "var(--green-ac)", WA: "var(--red-wa)", TLE: "var(--amber-tle)", CE: "var(--blue-ce)", MLE: "var(--purple-mle)", RE: "var(--red-wa)" };
                            const vc = VC[viewingSubmission.submissionVerdict] || "var(--text-muted)";
                            return (
                              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-base)", color: vc, letterSpacing: "0.01em" }}>
                                {VERDICT_LABEL[viewingSubmission.submissionVerdict] ?? viewingSubmission.submissionVerdict}
                              </span>
                            );
                          })()}
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontFamily: "var(--font-code)", background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)", padding: "2px 8px", borderRadius: "var(--radius-sm)" }}>
                            {viewingSubmission.submissionLanguage}
                          </span>
                          <div style={{ flex: 1 }} />
                          {viewingSubmission.executionTime != null && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontFamily: "var(--font-code)" }}>
                              <Clock size={10} />{viewingSubmission.executionTime}s
                            </span>
                          )}
                          {viewingSubmission.memoryUsed != null && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontFamily: "var(--font-code)" }}>
                              <HardDrive size={10} />{viewingSubmission.memoryUsed}KB
                            </span>
                          )}
                        </div>

                        {/* Code block with syntax highlighting — always dark regardless of theme */}
                        <div
                          style={{
                            margin: "0 16px 16px",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            background: "#0D1117",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              fontFamily: "var(--font-code)",
                              fontSize: 12,
                              lineHeight: "1.8",
                            }}
                          >
                            {/* Line numbers column */}
                            <div
                              style={{
                                paddingLeft: 12,
                                paddingRight: 14,
                                paddingTop: 16,
                                paddingBottom: 16,
                                borderRight: "1px solid rgba(255,255,255,0.06)",
                                color: "#4A5568",
                                userSelect: "none",
                                textAlign: "right",
                                flexShrink: 0,
                                background: "#080C14",
                                minWidth: "48px",
                              }}
                            >
                              {(viewingSubmission.sourceCode || "")
                                .split("\n")
                                .map((_, i) => (
                                  <div key={i} style={{ lineHeight: "1.8", fontSize: 12 }}>
                                    {i + 1}
                                  </div>
                                ))}
                            </div>

                            {/* Highlighted code */}
                            <pre
                              style={{
                                margin: 0,
                                padding: 16,
                                flex: 1,
                                overflow: "visible",
                                background: "#0D1117",
                                color: "#C9D1D9",
                                border: "none",
                                borderRadius: 0,
                              }}
                              dangerouslySetInnerHTML={{
                                __html: `<code class="hljs language-${getHljsLanguage(viewingSubmission.submissionLanguage)}" style="background:transparent;padding:0;font-size:0.75rem;font-family:var(--font-code);line-height:1.8;color:#C9D1D9">${
                                  hljs.highlight(
                                    viewingSubmission.sourceCode ||
                                      "// No source code available",
                                    {
                                      language: getHljsLanguage(
                                        viewingSubmission.submissionLanguage,
                                      ),
                                    },
                                  ).value
                                }</code>`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (() => {
                      const VC = {
                        AC:  { c: "var(--green-ac)",   bg: "var(--green-subtle)"   },
                        WA:  { c: "var(--red-wa)",     bg: "var(--red-subtle)"     },
                        TLE: { c: "var(--amber-tle)",  bg: "var(--amber-subtle)"   },
                        CE:  { c: "var(--blue-ce)",    bg: "var(--blue-subtle)"    },
                        MLE: { c: "var(--purple-mle)", bg: "var(--purple-subtle)"  },
                        RE:  { c: "var(--red-wa)",     bg: "var(--red-subtle)"     },
                      };
                      const verdicts = [...new Set(submissions.map((s) => s.submissionVerdict))].filter(Boolean);
                      const countOf = (v) => submissions.filter((s) => s.submissionVerdict === v).length;
                      const filtered = submissions.filter((s) => verdictFilter ? s.submissionVerdict === verdictFilter : true);
                      return (
                        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
                          {/* ── Filter bar ── */}
                          {submissions.length > 0 && (
                            <div style={{ padding: "10px 16px 0", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
                              {/* All pill */}
                              <button onClick={() => setVerdictFilter(null)} style={{
                                display: "inline-flex", alignItems: "center", gap: 5,
                                padding: "4px 11px", borderRadius: "var(--radius-pill)",
                                fontSize: "var(--text-xs)", fontWeight: 700,
                                fontFamily: "var(--font-code)", letterSpacing: "0.04em",
                                cursor: "pointer", outline: "none", transition: "all 0.12s",
                                border: `1px solid ${verdictFilter === null ? "var(--primary)" : "var(--border-default)"}`,
                                background: verdictFilter === null ? "var(--primary-subtle)" : "transparent",
                                color: verdictFilter === null ? "var(--primary)" : "var(--text-secondary)",
                              }}
                                onMouseEnter={(e) => { if (verdictFilter !== null) { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text-primary)"; } }}
                                onMouseLeave={(e) => { if (verdictFilter !== null) { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-secondary)"; } }}
                              >
                                ALL
                                <span style={{ fontWeight: 400, opacity: 0.7 }}>{submissions.length}</span>
                              </button>

                              {/* Per-verdict pills */}
                              {verdicts.map((v) => {
                                const vc = VC[v] || { c: "var(--text-muted)", bg: "var(--bg-raised)" };
                                const active = verdictFilter === v;
                                return (
                                  <button key={v} onClick={() => setVerdictFilter((prev) => prev === v ? null : v)} style={{
                                    display: "inline-flex", alignItems: "center", gap: 5,
                                    padding: "4px 11px", borderRadius: "var(--radius-pill)",
                                    fontSize: "var(--text-xs)", fontWeight: 700,
                                    fontFamily: "var(--font-code)", letterSpacing: "0.04em",
                                    cursor: "pointer", outline: "none", transition: "all 0.12s",
                                    border: `1px solid ${active ? vc.c : "var(--border-default)"}`,
                                    background: active ? vc.bg : "transparent",
                                    color: active ? vc.c : "var(--text-secondary)",
                                  }}
                                    onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = vc.c; e.currentTarget.style.color = vc.c; } }}
                                    onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-secondary)"; } }}
                                  >
                                    {v}
                                    <span style={{ fontWeight: 400, opacity: 0.7 }}>{countOf(v)}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* ── Column headers ── */}
                          {!loadingSubmissions && submissions.length > 0 && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 110px 48px", padding: "10px 16px 6px", borderBottom: "1px solid var(--border-subtle)", marginTop: 10, flexShrink: 0 }}>
                              {["VERDICT", "LANG", "TIME / MEM", ""].map((h) => (
                                <span key={h} style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.07em", fontFamily: "var(--font-code)" }}>{h}</span>
                              ))}
                            </div>
                          )}

                          {/* ── Rows ── */}
                          <div style={{ flex: 1, overflowY: "auto" }}>
                            {loadingSubmissions && (
                              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: "24px 0" }}>
                                <div className="spinner" style={{ borderTopColor: "var(--primary)" }} />
                                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Loading…</span>
                              </div>
                            )}

                            {!loadingSubmissions && submissions.length === 0 && (
                              <div style={{ padding: "40px 16px", textAlign: "center" }}>
                                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>No submissions yet</p>
                              </div>
                            )}

                            {!loadingSubmissions && filtered.map((sub) => {
                              const vc = VC[sub.submissionVerdict] || { c: "var(--text-muted)", bg: "var(--bg-raised)" };
                              return (
                                <div key={sub.id}
                                  style={{ display: "grid", gridTemplateColumns: "1fr 80px 110px 48px", alignItems: "center", padding: "11px 16px", borderBottom: "1px solid var(--border-subtle)", borderLeft: `3px solid ${vc.c}`, background: "transparent", transition: "background 0.1s", cursor: "default" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                                >
                                  {/* Verdict + date + test count */}
                                  <div>
                                    <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-base)", color: vc.c, letterSpacing: "0.01em" }}>
                                      {VERDICT_LABEL[sub.submissionVerdict] ?? sub.submissionVerdict}
                                    </span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                                      {sub.submissionDate && (
                                        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-code)" }}>
                                          {new Date(sub.submissionDate).toLocaleDateString()}
                                        </span>
                                      )}
                                      {sub.testCasesPassed != null && sub.totalTestCases != null && (
                                        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-code)" }}>
                                          · {sub.testCasesPassed}/{sub.totalTestCases}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Language */}
                                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontFamily: "var(--font-code)", fontWeight: 500 }}>
                                    {sub.submissionLanguage}
                                  </span>

                                  {/* Time + memory */}
                                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    {sub.executionTime != null && (
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontFamily: "var(--font-code)" }}>
                                        <Clock size={9} />{sub.executionTime}s
                                      </span>
                                    )}
                                    {sub.memoryUsed != null && (
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontFamily: "var(--font-code)" }}>
                                        <HardDrive size={9} />{sub.memoryUsed}KB
                                      </span>
                                    )}
                                  </div>

                                  {/* View code arrow */}
                                  <button onClick={() => setViewingSubmission(sub)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "var(--radius-sm)", background: "transparent", border: "1px solid var(--border-default)", color: "var(--text-muted)", cursor: "pointer", outline: "none", transition: "all 0.12s", flexShrink: 0 }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; e.currentTarget.style.background = "var(--primary-subtle)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}
                                  >
                                    <ChevronRight size={13} />
                                  </button>
                                </div>
                              );
                            })}

                            {!loadingSubmissions && submissions.length > 0 && filtered.length === 0 && (
                              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                                  No {verdictFilter} submissions
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ── Results ── */}
                {activeInSlot.left === "results" && renderPanelContent("results")}

                {/* ── Comments ── */}
                {activeInSlot.left === "comments" && renderPanelContent("comments")}
              </div>
              </>
            </Panel>

            <ResizeHandle direction="horizontal" />

            {/* ══ RIGHT COLUMN — vertical split ══ */}
            <Panel defaultSize={58} minSize={20} style={{ overflow: "hidden" }}>
              <PanelGroup direction="vertical" style={{ height: "100%" }}>
                {/* RIGHT-TOP SLOT */}
                <Panel defaultSize={60} minSize={20} style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                  <SlotTabBar slotId="right-top" />
                  {renderPanelContent(activeInSlot["right-top"])}
                </Panel>

                <ResizeHandle direction="vertical" />

                {/* RIGHT-BOTTOM SLOT */}
                <Panel defaultSize={40} minSize={15} style={{ height: "100%", display: "flex", flexDirection: "column", background: T.surface }}>
                  <SlotTabBar slotId="right-bottom" />
                  {renderPanelContent(activeInSlot["right-bottom"])}
                </Panel>
              </PanelGroup>
            </Panel>
          </PanelGroup>
          <DragOverlay dropAnimation={null}>
            {activeTab ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 12px",
                background: T.surface,
                border: `1px solid ${T.accent}`,
                borderRadius: "6px",
                color: T.text,
                fontSize: 13, fontWeight: 600,
                whiteSpace: "nowrap",
                boxShadow: `0 8px 24px rgba(0,0,0,0.4)`,
                cursor: "grabbing",
                userSelect: "none",
                opacity: 0.95,
              }}>
                <GripVertical size={12} style={{ color: T.accent, opacity: 0.8 }} />
                {PANEL_LABELS[activeTab.panelId]}
              </div>
            ) : null}
          </DragOverlay>
          </DndContext>
        </div>

        {hintPanelOpen && (
          <>
            <div
              style={{
                width: "5px",
                height: "100%",
                background: isDraggingHint ? T.accent : T.border,
                cursor: "col-resize",
                flexShrink: 0,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.accent; }}
              onMouseLeave={(e) => { if (!isDraggingHint) e.currentTarget.style.background = T.border; }}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingHint(true);
              }}
            />
            <HintPanel
              width={hintPanelWidth}
              messages={messages}
              hintInput={hintInput}
              setHintInput={setHintInput}
              hintLoading={hintLoading}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              onSubmit={handleHintSubmit}
              onClose={() => setHintPanelOpen(false)}
            />
          </>
        )}

        {vizOpen && (
          <VisualizerModal
            isOpen={vizOpen}
            onClose={() => setVizOpen(false)}
            defaultCode={codeEditorRef.current?.getCodeAndLanguage().code ?? ""}
            defaultLang={
              codeEditorRef.current?.getCodeAndLanguage().language ?? "cpp"
            }
            testCases={testCases}
          />
        )}
      </div>
    </div>
  );
};

export default ProblemDetailsPage;
