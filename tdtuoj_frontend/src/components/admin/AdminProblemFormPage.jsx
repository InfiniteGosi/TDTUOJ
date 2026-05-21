import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus, Trash2, FileText, Save, Edit2, Eye,
  ArrowLeft, User, Tag as TagIcon, X, AlertTriangle, Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useToast } from "../common/ToastMessage";
import ApiService from "../../services/ApiService";
import SuggestiveSearch from "../common/SuggestiveSearch";
import Editor from "@monaco-editor/react";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATEMENT_PLACEHOLDER = `## Two sum
Find the sum of two given elements. Both the numbers will always be 0 or positive.

#### Sample test case 1
Input
\`\`\`
1, 2
\`\`\`
Output
\`\`\`
3
\`\`\``;

const POINT_RANGES = { EASY: { min: 1, max: 10 }, MEDIUM: { min: 11, max: 20 }, HARD: { min: 21, max: 30 } };
const getPointRange = (d) => POINT_RANGES[d] || { min: 1, max: 300 };

// ─── Shared label style ───────────────────────────────────────────────────────

const LBL = { display: "block", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" };
const SEC = { fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 18 };

// ─── DifficultyPicker ─────────────────────────────────────────────────────────

const DIFF_OPTS = [
  { value: "EASY",   label: "Easy",   color: "var(--diff-easy,var(--green-ac))",  bg: "var(--green-subtle)"  },
  { value: "MEDIUM", label: "Medium", color: "var(--diff-medium,var(--amber-tle))", bg: "var(--amber-subtle)" },
  { value: "HARD",   label: "Hard",   color: "var(--diff-hard,var(--red-wa))",   bg: "var(--red-subtle)"    },
];

const DifficultyPicker = ({ value, onChange }) => (
  <div style={{ display: "flex", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
    {DIFF_OPTS.map(({ value: v, label, color, bg }, i) => {
      const active = value === v;
      return (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          style={{
            flex: 1, padding: "8px 0", border: "none",
            borderLeft: i > 0 ? "1px solid var(--border-subtle)" : "none",
            background: active ? bg : "var(--bg-surface)",
            color: active ? color : "var(--text-muted)",
            fontWeight: active ? 800 : 500,
            fontSize: "var(--text-xs)",
            cursor: "pointer",
            transition: "all 0.12s",
            letterSpacing: "0.04em",
          }}
          onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "var(--bg-overlay)"; e.currentTarget.style.color = color; } }}
          onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "var(--bg-surface)"; e.currentTarget.style.color = "var(--text-muted)"; } }}
        >
          {label}
        </button>
      );
    })}
  </div>
);

// ─── NumericStepper ───────────────────────────────────────────────────────────

const NumericStepper = ({ value, onChange, min = 0, max = Infinity, step = 1, presets, disabled = false, unit = "" }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(String(value ?? ""));

  const clamp = (n) => Math.min(max, Math.max(min, n));
  const commit = (raw) => { const n = clamp(parseInt(raw) || min); onChange(n); setDraft(String(n)); setEditing(false); };
  const adjust = (delta) => { const n = clamp((parseInt(value) || 0) + delta); onChange(n); setDraft(String(n)); };

  const btnStyle = (side) => ({
    width: 30, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
    background: "none", border: "none",
    borderRight: side === "left" ? "1px solid var(--border-subtle)" : "none",
    borderLeft:  side === "right" ? "1px solid var(--border-subtle)" : "none",
    cursor: disabled ? "not-allowed" : "pointer",
    color: "var(--text-muted)", transition: "background 0.1s, color 0.1s",
    opacity: disabled ? 0.4 : 1,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", overflow: "hidden", background: disabled ? "var(--bg-overlay)" : "var(--bg-raised)" }}>
        <button type="button" style={btnStyle("left")} onClick={() => !disabled && adjust(-step)}
          onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = "var(--bg-overlay)"; e.currentTarget.style.color = "var(--text-primary)"; } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-muted)"; }}>
          <svg width="10" height="2" viewBox="0 0 10 2"><rect width="10" height="2" rx="1" fill="currentColor"/></svg>
        </button>

        {editing ? (
          <input
            autoFocus type="number" value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commit(draft)}
            onKeyDown={(e) => { if (e.key === "Enter") commit(draft); if (e.key === "Escape") { setDraft(String(value)); setEditing(false); } }}
            style={{ flex: 1, textAlign: "center", background: "none", border: "none", outline: "none", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--primary)", height: 32, minWidth: 0 }}
            min={min} max={max}
          />
        ) : (
          <button type="button" onClick={() => { if (!disabled) { setDraft(String(value ?? "")); setEditing(true); } }}
            title="Click to type"
            style={{ flex: 1, background: "none", border: "none", cursor: disabled ? "not-allowed" : "text", fontSize: "var(--text-sm)", fontWeight: 700, color: disabled ? "var(--text-muted)" : "var(--primary)", textAlign: "center", height: 32, minWidth: 0 }}>
            {value !== "" && value !== undefined ? `${value}${unit}` : <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>—</span>}
          </button>
        )}

        <button type="button" style={btnStyle("right")} onClick={() => !disabled && adjust(+step)}
          onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = "var(--bg-overlay)"; e.currentTarget.style.color = "var(--text-primary)"; } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-muted)"; }}>
          <svg width="10" height="10" viewBox="0 0 10 10"><rect x="4" width="2" height="10" rx="1" fill="currentColor"/><rect y="4" width="10" height="2" rx="1" fill="currentColor"/></svg>
        </button>
      </div>

      {presets && !disabled && (
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {presets.map((p) => (
            <button key={p} type="button" onClick={() => { onChange(p); setDraft(String(p)); }}
              style={{
                padding: "1px 7px", borderRadius: "var(--radius-pill)",
                border: `1px solid ${Number(value) === p ? "var(--primary)" : "var(--border-subtle)"}`,
                background: Number(value) === p ? "var(--primary-subtle)" : "none",
                color: Number(value) === p ? "var(--primary)" : "var(--text-muted)",
                fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.1s",
              }}>
              {p}{unit}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── AI Loading ───────────────────────────────────────────────────────────────

const PDF_MESSAGES = ["Reading your PDF…","Scanning problem statement…","Analyzing constraints…","Extracting test cases…","Suggesting relevant tags…","Assessing difficulty level…","Polishing results…","Almost there…"];
const GEN_MESSAGES = ["Thinking about the problem…","Designing edge cases…","Computing expected outputs…","Creating test scenarios…","Checking boundary conditions…","Validating inputs…","Verifying correctness…","Finalizing test cases…"];

if (typeof document !== "undefined" && !document.getElementById("ai-loading-styles")) {
  const s = document.createElement("style");
  s.id = "ai-loading-styles";
  s.textContent = `
    @keyframes ai-spin    { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
    @keyframes ai-pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(.95)} }
    @keyframes ai-fade-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes ai-dot     { 0%,80%,100%{transform:scale(.6);opacity:.4} 40%{transform:scale(1);opacity:1} }
    @keyframes ai-shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
  `;
  document.head.appendChild(s);
}

const AILoadingOverlay = ({ mode }) => {
  const [idx, setIdx]   = useState(0);
  const [vis, setVis]   = useState(true);
  const msgs = mode === "pdf" ? PDF_MESSAGES : GEN_MESSAGES;

  useEffect(() => {
    const t = setInterval(() => {
      setVis(false);
      setTimeout(() => { setIdx((i) => (i + 1) % msgs.length); setVis(true); }, 300);
    }, 2200);
    return () => clearInterval(t);
  }, [msgs.length]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}>
      <div style={{ background: "var(--bg-raised)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", padding: 40, maxWidth: 420, width: "90%", boxShadow: "0 25px 60px rgba(0,0,0,0.4)", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,var(--primary) 0%,var(--primary-bright,var(--primary)) 50%,var(--primary) 100%)", backgroundSize: "200% auto", animation: "ai-shimmer 2s linear infinite" }} />
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <div style={{ position: "relative", width: 64, height: 64 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid var(--primary-subtle)" }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid transparent", borderTopColor: "var(--primary)", animation: "ai-spin 1s linear infinite" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, animation: "ai-pulse 2s ease-in-out infinite" }}>✨</div>
          </div>
        </div>
        <p style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: 8, color: "var(--primary)" }}>
          {mode === "pdf" ? "AI Reading PDF" : "AI Generating Test Cases"}
        </p>
        <div style={{ minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", animation: vis ? "ai-fade-in 0.3s ease-out" : "none", opacity: vis ? 1 : 0, transition: "opacity 0.3s", margin: 0 }}>{msgs[idx]}</p>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          {[0,1,2].map((i) => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--primary)", animation: `ai-dot 1.4s ease-in-out ${i*0.16}s infinite` }} />)}
        </div>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 18 }}>Gemini is working — this may take up to 30 seconds.</p>
      </div>
    </div>
  );
};

// ─── AdminProblemFormPage ─────────────────────────────────────────────────────

const AdminProblemFormPage = ({ mode = "admin", backPath }) => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { showMessage } = useToast();

  const [loading, setLoading]         = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [authorInfo, setAuthorInfo]   = useState({ id: null, username: null });
  const [aiExtracting, setAiExtracting] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState(5);
  const pdfInputRef = useRef(null);

  const [problemData, setProblemData] = useState({ title: "", point: "", timeLimit: "", memoryLimit: "", statement: "", problemDifficulty: "", solutionCode: "" });
  const [testCases, setTestCases]     = useState([{ input: "", expectedOutput: "", isSample: false }]);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags]   = useState([]);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  const fetchActiveTags = async () => {
    try {
      const r = await ApiService.getAllTags({ limit: 200, offset: 0 });
      if (r.statusCode === 200) setAvailableTags((r.data.content || []).filter((t) => t.isActive === true));
    } catch {}
  };

  useEffect(() => {
    (async () => {
      try {
        const p = await ApiService.getOwnProfile();
        if (p?.data?.id) setCurrentUserId(p.data.id);
      } catch { showMessage("Failed to fetch user profile", "error"); }
    })();
    fetchActiveTags();
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoadingData(true);
      setProblemData({ title: "", point: "", timeLimit: "", memoryLimit: "", statement: "", problemDifficulty: "", solutionCode: "" });
      setTestCases([{ input: "", expectedOutput: "" }]);
      setSelectedTags([]);
      setAuthorInfo({ id: null, username: null });
      try {
        const r = await ApiService.getProblemById(id);
        if (r.statusCode === 200 && r.data) {
          const p = r.data;
          setAuthorInfo({ id: p.authorId || null, username: p.authorUserName || null });
          if (p.tags?.length) setSelectedTags(p.tags);
          let stmt = "";
          if (p.statementFileUrl) {
            try { const res = await fetch(`${p.statementFileUrl}?t=${Date.now()}`); stmt = await res.text(); } catch {}
          }
          setProblemData({ title: p.title || "", point: p.point || "", timeLimit: p.timeLimit || "", memoryLimit: p.memoryLimit || "", statement: stmt, problemDifficulty: p.problemDifficulty || "", solutionCode: p.solutionCode || "" });
          if (p.testCases?.length) {
            const loaded = await Promise.all(p.testCases.map(async (tc, i) => {
              let input = "", expectedOutput = "";
              try {
                if (tc.inputFileUrl) { const res = await fetch(`${tc.inputFileUrl}?t=${Date.now()}`); const t = await res.text(); input = t.startsWith("<?xml") || t.startsWith("<Error") ? "" : t; }
                if (tc.expectedOutputFileUrl) { const res = await fetch(`${tc.expectedOutputFileUrl}?t=${Date.now()}`); const t = await res.text(); expectedOutput = t.startsWith("<?xml") || t.startsWith("<Error") ? "" : t; }
              } catch {}
              return { id: tc.id, input, expectedOutput, isSample: tc.isSample ?? false, dirty: false };
            }));
            setTestCases(loaded);
          } else { setTestCases([{ input: "", expectedOutput: "" }]); }
        } else { showMessage("Failed to load problem", "error"); }
      } catch (e) { showMessage(e.response?.data?.message || e.message || "Failed to load problem", "error"); }
      finally { setLoadingData(false); }
    })();
  }, [id, dataVersion]);

  const inactiveTags   = selectedTags.filter((t) => t.isActive === false);
  const hasInactiveTags = inactiveTags.length > 0;
  const addTag    = (tag) => { if (!selectedTags.find((t) => t.id === tag.id)) setSelectedTags((p) => [...p, tag]); setTagSearchQuery(""); setShowTagDropdown(false); };
  const removeTag = (tagId) => setSelectedTags((p) => p.filter((t) => t.id !== tagId));
  const removeAllInactiveTags = () => setSelectedTags((p) => p.filter((t) => t.isActive !== false));
  const filteredDropdownTags  = availableTags.filter((t) => !selectedTags.find((s) => s.id === t.id) && t.name.toLowerCase().includes(tagSearchQuery.toLowerCase()));

  const handleProblemChange = (field, value) => setProblemData((p) => ({ ...p, [field]: value, ...(field === "problemDifficulty" ? { point: "" } : {}) }));
  const addTestCase = () => setTestCases((p) => [...p, { input: "", expectedOutput: "", isSample: false, dirty: true }]);
  const removeTestCase = (i) => { if (testCases.length > 1) setTestCases((p) => p.filter((_, j) => j !== i)); };
  const handleTestCaseChange = (i, field, value) => setTestCases((p) => p.map((tc, j) => j === i ? { ...tc, [field]: value, dirty: true } : tc));
  const stringToFile = (content, name, mime) => new File([new Blob([content], { type: mime })], name, { type: mime });

  const handlePdfImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { showMessage("PDF must be under 4MB", "error"); e.target.value = ""; return; }
    setAiExtracting(true);
    try {
      const r = await ApiService.extractProblemFromPdf(file);
      if (r.statusCode === 200 && r.data) {
        const d = r.data;
        setProblemData((prev) => ({ title: d.title || "", point: d.point || "", timeLimit: d.timeLimit || "", memoryLimit: d.memoryLimit || "", statement: d.statement || "", problemDifficulty: d.difficulty || "", solutionCode: prev.solutionCode }));
        if (d.testCases?.length) setTestCases(d.testCases.map((tc) => ({ input: tc.input || "", expectedOutput: tc.expectedOutput || "", isSample: tc.isSample ?? false, dirty: true })));
        if (d.suggestedTags?.length) {
          const matched = availableTags.filter((t) => d.suggestedTags.includes(t.name));
          if (matched.length) setSelectedTags((p) => { const ids = new Set(p.map((t) => t.id)); return [...p, ...matched.filter((t) => !ids.has(t.id))]; });
        }
        showMessage(d.testCasesGenerated ? `Extracted! ${d.testCases?.length || 0} test cases generated.` : "Extracted — review all fields before saving.", "success");
      } else { showMessage(r.message || "Failed to extract from PDF", "error"); }
    } catch (e) { showMessage(e.response?.data?.message || e.message || "Failed to extract from PDF", "error"); }
    finally { setAiExtracting(false); e.target.value = ""; }
  };

  const handleGenerateTestCases = async () => {
    if (!problemData.statement.trim()) { showMessage("Write problem statement first", "error"); return; }
    setAiGenerating(true);
    try {
      const r = await ApiService.generateTestCases(problemData.statement, generateCount);
      if (r.statusCode === 200 && r.data?.testCases) {
        const gen = r.data.testCases.map((tc) => ({ input: tc.input || "", expectedOutput: tc.expectedOutput || "", isSample: tc.isSample ?? false, dirty: true }));
        setTestCases((p) => { const empty = p.length === 1 && !p[0].input.trim() && !p[0].expectedOutput.trim(); return empty ? gen : [...p, ...gen]; });
        showMessage(`${gen.length} test cases generated — please review!`, "success");
      } else { showMessage(r.message || "Failed to generate test cases", "error"); }
    } catch (e) { showMessage(e.response?.data?.message || e.message || "Failed to generate test cases", "error"); }
    finally { setAiGenerating(false); }
  };

  const validateForm = () => {
    if (!problemData.title.trim())             { showMessage("Problem title is required", "error"); return false; }
    if (!problemData.point || problemData.point <= 0) { showMessage("Points must be greater than 0", "error"); return false; }
    if (problemData.problemDifficulty) {
      const { min, max } = getPointRange(problemData.problemDifficulty);
      if (problemData.point < min || problemData.point > max) { showMessage(`Points for ${problemData.problemDifficulty.toLowerCase()} must be ${min}–${max}`, "error"); return false; }
    }
    if (!problemData.timeLimit || problemData.timeLimit <= 0) { showMessage("Time limit must be > 0", "error"); return false; }
    if (problemData.timeLimit > 10)            { showMessage("Time limit cannot exceed 10s", "error"); return false; }
    if (problemData.memoryLimit < 16)          { showMessage("Memory limit must be ≥ 16MB", "error"); return false; }
    if (problemData.memoryLimit > 1024)        { showMessage("Memory limit cannot exceed 1024MB", "error"); return false; }
    if (!problemData.statement.trim())         { showMessage("Problem statement is required", "error"); return false; }
    if (!problemData.problemDifficulty)        { showMessage("Problem difficulty is required", "error"); return false; }
    if (hasInactiveTags)                       { showMessage("Remove disabled tags before saving.", "error"); return false; }
    for (let i = 0; i < testCases.length; i++) {
      if (!testCases[i].input.trim())          { showMessage(`Input required for test case ${i + 1}`, "error"); return false; }
      if (!testCases[i].expectedOutput.trim()) { showMessage(`Expected output required for test case ${i + 1}`, "error"); return false; }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!currentUserId) { showMessage("User profile not loaded. Try again.", "error"); return; }
    if (!validateForm()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("title",             problemData.title);
      fd.append("point",             problemData.point);
      fd.append("timeLimit",         problemData.timeLimit);
      fd.append("memoryLimit",       problemData.memoryLimit);
      fd.append("authorId",          currentUserId);
      fd.append("problemDifficulty", problemData.problemDifficulty);
      fd.append("statementFile",     stringToFile(problemData.statement, "statement.md", "text/markdown"));
      if (problemData.solutionCode)  { fd.append("solutionCode", problemData.solutionCode); fd.append("solutionLanguage", "CPP"); }
      if (mode === "my" && !id)      fd.append("isPublic", false);
      selectedTags.filter((t) => t.isActive !== false).forEach((t) => fd.append("tagNames", t.name));
      testCases.forEach((tc, i) => {
        if (tc.id) fd.append(`testCases[${i}].id`, tc.id);
        fd.append(`testCases[${i}].isSample`, tc.isSample ?? false);
        if (!tc.id || tc.dirty) {
          fd.append(`testCases[${i}].inputFile`,          stringToFile(tc.input,          `input_${i}.txt`,  "text/plain"));
          fd.append(`testCases[${i}].expectedOutputFile`, stringToFile(tc.expectedOutput, `output_${i}.txt`, "text/plain"));
        }
      });
      let resp;
      if (id) { fd.append("id", id); resp = await ApiService.updateProblem(fd); }
      else    { resp = await ApiService.createProblem(fd); }
      if (resp.statusCode === 201 || resp.statusCode === 200) {
        showMessage(resp.message || `Problem ${id ? "updated" : "created"}!`, "success");
        if (id) { setTimeout(() => setDataVersion((v) => v + 1), 1000); }
        else    { setTimeout(() => navigate(backPath || (mode === "my" ? "/admin/my-problems" : "/admin/problems")), 1500); }
      } else { showMessage(resp.message || `Failed to ${id ? "update" : "create"} problem`, "error"); }
    } catch (e) { showMessage(e.response?.data?.message || e.message || `Failed to ${id ? "update" : "create"} problem`, "error"); }
    finally { setLoading(false); }
  };

  const destPath = backPath || (mode === "my" ? "/admin/my-problems" : "/admin/problems");

  if (loadingData) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div
      style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0 64px" }}
      onClick={() => showTagDropdown && setShowTagDropdown(false)}
    >
      {(aiExtracting || aiGenerating) && <AILoadingOverlay mode={aiExtracting ? "pdf" : "gen"} />}

      <div className="page-container" style={{ maxWidth: 1100 }}>
        <div className="flex flex-col gap-6">

          {/* ── Back ── */}
          <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start", gap: 6 }} onClick={() => navigate(destPath)}>
            <ArrowLeft size={16} /> Back to Problems
          </button>

          {/* ── Page header ── */}
          <div style={{ borderLeft: "4px solid var(--primary)", paddingLeft: 16, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Admin / Problems
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText size={20} color="var(--primary)" />
                <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--text-primary)" }}>
                  {id ? "Edit Problem" : "Create Problem"}
                </h2>
              </div>
            </div>

            {/* PDF import */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <input type="file" accept=".pdf" ref={pdfInputRef} style={{ display: "none" }} onChange={handlePdfImport} />
              <button
                className="btn btn-ghost btn-sm"
                style={{ border: "1px solid var(--border-accent)", color: "var(--primary)", gap: 6 }}
                onClick={() => pdfInputRef.current?.click()}
                disabled={aiExtracting}
              >
                <Sparkles size={14} /> Import from PDF
              </button>
            </div>
          </div>

          {/* ── Problem details card ── */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={SEC}>Problem Details</div>
              {id && authorInfo.id && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "var(--bg-overlay)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)" }}>
                  <User size={13} color="var(--primary)" />
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Author</span>
                  <span style={{ display: "inline-flex", padding: "1px 8px", borderRadius: "var(--radius-pill)", fontSize: "var(--text-xs)", fontWeight: 700, background: "var(--primary-subtle)", color: "var(--primary)" }}>
                    {authorInfo.username}
                  </span>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>#{authorInfo.id}</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Title */}
              <div>
                <label style={LBL}>Title <span style={{ color: "var(--red-wa)" }}>*</span></label>
                <input className="input w-full" value={problemData.title} onChange={(e) => handleProblemChange("title", e.target.value)} placeholder="Enter problem title" style={{ fontSize: "var(--text-base)" }} />
              </div>

              {/* Difficulty + numeric row */}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>

                {/* Difficulty */}
                <div style={{ flex: "2 1 200px" }}>
                  <label style={LBL}>Difficulty <span style={{ color: "var(--red-wa)" }}>*</span></label>
                  <DifficultyPicker value={problemData.problemDifficulty} onChange={(v) => handleProblemChange("problemDifficulty", v)} />
                  {!problemData.problemDifficulty && (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Select difficulty to unlock points range.</div>
                  )}
                </div>

                {/* Points */}
                <div style={{ flex: "1 1 130px" }}>
                  <label style={LBL}>
                    Points <span style={{ color: "var(--red-wa)" }}>*</span>
                    {problemData.problemDifficulty && (
                      <span style={{ marginLeft: 4, fontWeight: 500, color: "var(--text-muted)", textTransform: "none", letterSpacing: 0 }}>
                        {getPointRange(problemData.problemDifficulty).min}–{getPointRange(problemData.problemDifficulty).max}
                      </span>
                    )}
                  </label>
                  <NumericStepper
                    value={problemData.point === "" ? "" : Number(problemData.point)}
                    onChange={(n) => handleProblemChange("point", n)}
                    min={problemData.problemDifficulty ? getPointRange(problemData.problemDifficulty).min : 1}
                    max={problemData.problemDifficulty ? getPointRange(problemData.problemDifficulty).max : 300}
                    step={1}
                    disabled={!problemData.problemDifficulty}
                    presets={problemData.problemDifficulty
                      ? Array.from({ length: getPointRange(problemData.problemDifficulty).max - getPointRange(problemData.problemDifficulty).min + 1 }, (_, i) => getPointRange(problemData.problemDifficulty).min + i).filter((_, i, a) => i === 0 || i === Math.floor(a.length / 2) || i === a.length - 1)
                      : undefined}
                  />
                </div>

                {/* Time limit */}
                <div style={{ flex: "1 1 130px" }}>
                  <label style={LBL}>Time Limit <span style={{ color: "var(--red-wa)" }}>*</span></label>
                  <NumericStepper
                    value={problemData.timeLimit === "" ? "" : Number(problemData.timeLimit)}
                    onChange={(n) => handleProblemChange("timeLimit", n)}
                    min={1} max={10} step={1} unit="s"
                    presets={[1, 2, 3, 5]}
                  />
                </div>

                {/* Memory */}
                <div style={{ flex: "1 1 130px" }}>
                  <label style={LBL}>Memory <span style={{ color: "var(--red-wa)" }}>*</span></label>
                  <NumericStepper
                    value={problemData.memoryLimit === "" ? "" : Number(problemData.memoryLimit)}
                    onChange={(n) => handleProblemChange("memoryLimit", n)}
                    min={16} max={1024} step={64} unit="MB"
                    presets={[64, 128, 256, 512]}
                  />
                </div>

              </div>

              {/* Tags */}
              <div onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ ...LBL, marginBottom: 0, display: "flex", alignItems: "center", gap: 5 }}>
                    <TagIcon size={12} /> Tags
                  </label>
                  {hasInactiveTags && (
                    <button className="btn btn-ghost btn-sm" style={{ color: "var(--amber-tle)", gap: 4 }} onClick={removeAllInactiveTags}>
                      <Trash2 size={12} /> Remove disabled
                    </button>
                  )}
                </div>

                {hasInactiveTags && (
                  <div style={{ marginBottom: 10, padding: "10px 14px", background: "var(--amber-subtle)", border: "1px solid var(--amber-tle)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <AlertTriangle size={14} color="var(--amber-tle)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--amber-tle)", marginBottom: 2 }}>
                        {inactiveTags.length} disabled tag{inactiveTags.length > 1 ? "s" : ""} detected
                      </div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--amber-tle)", opacity: 0.9 }}>
                        {inactiveTags.map((t) => t.name).join(", ")} — remove before saving.
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ padding: "10px 12px", border: `1px solid ${hasInactiveTags ? "var(--amber-tle)" : "var(--border-default)"}`, borderRadius: "var(--radius-md)", background: "var(--bg-raised)", minHeight: 48, position: "relative" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selectedTags.map((tag) => (
                      <span
                        key={tag.id}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "3px 10px", borderRadius: "var(--radius-pill)", fontSize: "var(--text-xs)",
                          background: tag.isActive === false ? "var(--amber-subtle)" : "var(--primary-subtle)",
                          color: tag.isActive === false ? "var(--amber-tle)" : "var(--primary)",
                          border: `1px solid ${tag.isActive === false ? "var(--amber-tle)" : "transparent"}`,
                        }}
                        title={tag.isActive === false ? "Disabled tag — remove before saving" : tag.name}
                      >
                        {tag.isActive === false && <AlertTriangle size={10} />}
                        <span style={{ textDecoration: tag.isActive === false ? "line-through" : "none" }}>{tag.name}</span>
                        <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "inherit" }} onClick={() => removeTag(tag.id)}>
                          <X size={11} />
                        </button>
                      </span>
                    ))}

                    {/* Add tag button + dropdown */}
                    <div style={{ position: "relative" }}>
                      <button
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: "var(--radius-pill)", border: "1px dashed var(--border-accent)", background: "none", color: "var(--primary)", fontSize: "var(--text-xs)", cursor: "pointer" }}
                        onClick={(e) => { e.stopPropagation(); setShowTagDropdown((v) => !v); }}
                      >
                        <Plus size={11} /> Add tag
                      </button>

                      {showTagDropdown && (
                        <div
                          style={{ position: "absolute", top: "110%", left: 0, zIndex: 30, background: "var(--bg-raised)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", boxShadow: "0 8px 24px rgba(0,0,0,0.3)", width: 220, maxHeight: 260, overflowY: "auto" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ borderBottom: "1px solid var(--border-subtle)", position: "sticky", top: 0, background: "var(--bg-raised)" }}>
                            <SuggestiveSearch value={tagSearchQuery} onChange={setTagSearchQuery} suggestions={["Search tags…"]} style={{ width: "100%" }} />
                          </div>
                          {filteredDropdownTags.length === 0 ? (
                            <div style={{ padding: 12, textAlign: "center", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                              {availableTags.length === 0 ? "No active tags" : "All active tags already added"}
                            </div>
                          ) : filteredDropdownTags.map((tag) => (
                            <div
                              key={tag.id}
                              style={{ padding: "8px 12px", cursor: "pointer", fontSize: "var(--text-sm)", color: "var(--text-primary)", transition: "background 0.1s" }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-overlay)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                              onClick={() => addTag(tag)}
                            >
                              {tag.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 4 }}>
                  Only active tags can be assigned.
                </div>
              </div>

              {/* Statement */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ ...LBL, marginBottom: 0 }}>Problem Statement (Markdown) <span style={{ color: "var(--red-wa)" }}>*</span></label>
                  {/* Edit / Preview toggle */}
                  <div style={{ display: "flex", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                    {[{ label: "Edit", icon: Edit2, val: false }, { label: "Preview", icon: Eye, val: true }].map(({ label, icon: Icon, val }) => (
                      <button
                        key={label}
                        onClick={() => setPreviewMode(val)}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "5px 12px", border: "none",
                          background: previewMode === val ? "var(--primary-subtle)" : "var(--bg-surface)",
                          color: previewMode === val ? "var(--primary)" : "var(--text-secondary)",
                          fontWeight: previewMode === val ? 700 : 400,
                          fontSize: "var(--text-xs)", cursor: "pointer",
                          borderRight: val === false ? "1px solid var(--border-default)" : "none",
                          transition: "all 0.12s",
                        }}
                      >
                        <Icon size={12} /> {label}
                      </button>
                    ))}
                  </div>
                </div>

                {!previewMode ? (
                  <>
                    <div style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", overflow: "hidden", height: 350 }}>
                      <Editor
                        height="100%" theme="vs-dark" language="markdown"
                        value={problemData.statement}
                        onChange={(v) => handleProblemChange("statement", v || "")}
                        options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: "on", wordWrap: "on", scrollBeyondLastLine: false, automaticLayout: true }}
                      />
                    </div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 6 }}>Saved as a .md file — use standard Markdown syntax.</div>
                  </>
                ) : (
                  <div style={{ minHeight: 300, padding: 20, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", overflowY: "auto", maxHeight: 500 }}>
                    {problemData.statement ? (
                      <div className="markdown-preview"><ReactMarkdown>{problemData.statement}</ReactMarkdown></div>
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>Nothing to preview yet.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Solution code card (my-problems mode) ── */}
          {mode === "my" && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ ...SEC, marginBottom: 4 }}>Solution Code (C++)</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 14 }}>Optional — shown to students when you publish solutions in a lab.</div>
              <div style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", overflow: "hidden", height: 350 }}>
                <Editor
                  height="100%" theme="vs-dark" language="cpp"
                  value={problemData.solutionCode}
                  onChange={(v) => handleProblemChange("solutionCode", v || "")}
                  options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: "on", scrollBeyondLastLine: false, automaticLayout: true }}
                />
              </div>
            </div>
          )}

          {/* ── Test cases card ── */}
          <div className="card" style={{ padding: 24 }}>

            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={SEC}>Test Cases</div>
              <span style={{ display: "inline-flex", padding: "2px 9px", borderRadius: "var(--radius-pill)", fontSize: "var(--text-xs)", fontWeight: 700, background: "var(--primary-subtle)", color: "var(--primary)" }}>
                {testCases.length}
              </span>
            </div>

            {/* AI generate toolbar */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", marginBottom: 16,
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
            }}>
              <Sparkles size={13} color="var(--primary)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", flex: 1 }}>
                AI generate
              </span>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4, textAlign: "center" }}>Count</div>
                  <NumericStepper
                    value={generateCount}
                    onChange={(n) => setGenerateCount(n)}
                    min={1} max={50} step={1}
                    presets={[3, 5, 10, 20]}
                  />
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ border: "1px solid var(--border-accent)", color: "var(--primary)", gap: 6, marginTop: 20, alignSelf: "flex-start" }}
                  onClick={handleGenerateTestCases}
                  disabled={aiGenerating || !problemData.statement.trim()}
                  title={!problemData.statement.trim() ? "Write problem statement first" : `Generate ${generateCount} test case(s) with AI`}
                >
                  <Sparkles size={13} /> Generate
                </button>
              </div>
            </div>

            {/* Test case rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {testCases.map((tc, i) => (
                <div
                  key={i}
                  style={{ background: "var(--bg-raised)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", overflow: "hidden" }}
                >
                  {/* Test case header bar */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px",
                    borderBottom: "1px solid var(--border-subtle)",
                    background: "var(--bg-overlay)",
                  }}>
                    <div style={{ width: 22, height: 22, borderRadius: "var(--radius-sm)", background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "var(--primary)" }}>{i + 1}</span>
                    </div>

                    <button
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "2px 9px", borderRadius: "var(--radius-pill)", cursor: "pointer",
                        background: tc.isSample ? "var(--green-subtle)" : "transparent",
                        border: `1px solid ${tc.isSample ? "var(--green-ac)" : "var(--border-default)"}`,
                        transition: "all 0.12s",
                      }}
                      onClick={() => handleTestCaseChange(i, "isSample", !tc.isSample)}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: tc.isSample ? "var(--green-ac)" : "var(--text-muted)", flexShrink: 0 }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: tc.isSample ? "var(--green-ac)" : "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {tc.isSample ? "Sample" : "Hidden"}
                      </span>
                    </button>

                    <div style={{ flex: 1 }} />

                    {testCases.length > 1 && (
                      <button
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: "var(--radius-sm)", display: "flex", color: "var(--text-muted)", transition: "color 0.12s, background 0.12s" }}
                        onClick={() => removeTestCase(i)}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--red-wa)"; e.currentTarget.style.background = "var(--red-subtle)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "none"; }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Input / output textareas */}
                  <div style={{ display: "flex", gap: 0 }}>
                    <div style={{ flex: 1, padding: "12px 14px", borderRight: "1px solid var(--border-subtle)" }}>
                      <label style={{ ...LBL, marginBottom: 6 }}>Input <span style={{ color: "var(--red-wa)" }}>*</span></label>
                      <textarea
                        className="input w-full"
                        value={tc.input}
                        onChange={(e) => handleTestCaseChange(i, "input", e.target.value)}
                        placeholder="Enter test input…"
                        style={{ minHeight: 100, fontFamily: "var(--font-code)", fontSize: 13, resize: "vertical", border: "none", padding: 0, background: "transparent", outline: "none" }}
                      />
                    </div>
                    <div style={{ flex: 1, padding: "12px 14px" }}>
                      <label style={{ ...LBL, marginBottom: 6 }}>Expected Output <span style={{ color: "var(--red-wa)" }}>*</span></label>
                      <textarea
                        className="input w-full"
                        value={tc.expectedOutput}
                        onChange={(e) => handleTestCaseChange(i, "expectedOutput", e.target.value)}
                        placeholder="Enter expected output…"
                        style={{ minHeight: 100, fontFamily: "var(--font-code)", fontSize: 13, resize: "vertical", border: "none", padding: 0, background: "transparent", outline: "none" }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                className="btn btn-ghost w-full"
                style={{ border: "1.5px dashed var(--border-accent)", color: "var(--primary)", gap: 6 }}
                onClick={addTestCase}
              >
                <Plus size={14} /> Add Test Case
              </button>
            </div>
          </div>

          {/* ── Submit ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, paddingTop: 8 }}>
            {hasInactiveTags && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--amber-tle)" }}>
                <AlertTriangle size={13} /> Remove disabled tags before saving
              </div>
            )}
            <button className="btn btn-ghost" onClick={() => navigate(destPath)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading || hasInactiveTags}
              style={{ gap: 8, minWidth: 150 }}
            >
              {loading
                ? <><div className="spinner" style={{ width: 14, height: 14 }} /> {id ? "Updating…" : "Creating…"}</>
                : <><Save size={14} /> {id ? "Update Problem" : "Create Problem"}</>
              }
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminProblemFormPage;
