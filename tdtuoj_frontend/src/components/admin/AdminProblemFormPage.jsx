import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus, Trash2, FileText, Upload, Edit2, Eye, ArrowLeft, User, Tag as TagIcon, X, AlertTriangle, Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useToast } from "../common/ToastMessage";
import ApiService from "../../services/ApiService";
import SuggestiveSearch from "../common/SuggestiveSearch";
import Editor from "@monaco-editor/react";

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

const DIFFICULTY_OPTIONS = [
  { value: "", label: "Select difficulty..." },
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

const DIFFICULTY_COLORS = { EASY: "var(--diff-easy)", MEDIUM: "var(--diff-medium)", HARD: "var(--diff-hard)" };
const POINT_RANGES = { EASY: { min: 1, max: 10 }, MEDIUM: { min: 11, max: 20 }, HARD: { min: 21, max: 30 } };
const getPointRange = (difficulty) => POINT_RANGES[difficulty] || { min: 1, max: 300 };

// ─── AI Loading Messages ─────────────────────────────────────────────────────

const PDF_MESSAGES = [
  { text: "Reading your PDF..." },
  { text: "Scanning problem statement..." },
  { text: "Analyzing constraints..." },
  { text: "Extracting test cases..." },
  { text: "Suggesting relevant tags..." },
  { text: "Assessing difficulty level..." },
  { text: "Polishing results..." },
  { text: "Almost there..." },
];

const GEN_MESSAGES = [
  { text: "Thinking about the problem..." },
  { text: "Designing edge cases..." },
  { text: "Computing expected outputs..." },
  { text: "Creating test scenarios..." },
  { text: "Checking boundary conditions..." },
  { text: "Validating inputs..." },
  { text: "Verifying correctness..." },
  { text: "Finalizing test cases..." },
];

if (typeof document !== "undefined" && !document.getElementById("ai-loading-styles")) {
  const style = document.createElement("style");
  style.id = "ai-loading-styles";
  style.textContent = `
    @keyframes ai-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes ai-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.95); } }
    @keyframes ai-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes ai-dot { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
    @keyframes ai-shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
  `;
  document.head.appendChild(style);
}

const AILoadingOverlay = ({ mode }) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const messages = mode === "pdf" ? PDF_MESSAGES : GEN_MESSAGES;

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setMsgIndex((i) => (i + 1) % messages.length); setVisible(true); }, 300);
    }, 2200);
    return () => clearInterval(interval);
  }, [messages.length]);

  const msg = messages[msgIndex];
  const title = mode === "pdf" ? "AI Reading PDF" : "AI Generating Test Cases";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}>
      <div style={{ background: "var(--bg-base)", borderRadius: 16, padding: 40, maxWidth: 420, width: "90%", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, var(--primary) 0%, var(--primary-bright) 50%, var(--primary) 100%)", backgroundSize: "200% auto", animation: "ai-shimmer 2s linear infinite" }} />
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <div style={{ position: "relative", width: 72, height: 72 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid var(--primary-subtle)" }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid transparent", borderTopColor: "var(--primary)", borderRightColor: "var(--primary-bright)", animation: "ai-spin 1s linear infinite" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, animation: "ai-pulse 2s ease-in-out infinite" }}>✨</div>
          </div>
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, background: "linear-gradient(90deg, var(--primary), var(--primary-bright))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{title}</p>
        <div style={{ minHeight: 52, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", animation: visible ? "ai-fade-in 0.3s ease-out" : "none", opacity: visible ? 1 : 0, transition: "opacity 0.3s" }}>{msg.text}</p>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          {[0, 1, 2].map((i) => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary-bright)", animation: `ai-dot 1.4s ease-in-out ${i * 0.16}s infinite` }} />)}
        </div>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 20 }}>This may take up to 30 seconds — Gemini is working hard!</p>
      </div>
    </div>
  );
};

const AdminProblemFormPage = ({ mode = "admin", backPath }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showMessage } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [authorInfo, setAuthorInfo] = useState({ id: null, username: null });
  const [aiExtracting, setAiExtracting] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState(5);
  const pdfInputRef = useRef(null);

  const [problemData, setProblemData] = useState({ title: "", point: "", timeLimit: "", memoryLimit: "", statement: "", problemDifficulty: "", solutionCode: "" });
  const [testCases, setTestCases] = useState([{ input: "", expectedOutput: "", isSample: false }]);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  const fetchActiveTags = async () => {
    try {
      const response = await ApiService.getAllTags({ limit: 200, offset: 0 });
      if (response.statusCode === 200) {
        setAvailableTags((response.data.content || []).filter((t) => t.isActive === true));
      }
    } catch (err) { console.error("Failed to fetch tags:", err); }
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const profile = await ApiService.getOwnProfile();
        if (profile?.data?.id) setCurrentUserId(profile.data.id);
      } catch (err) { showMessage("Failed to fetch user profile", "error"); }
    };
    fetchCurrentUser();
    fetchActiveTags();
  }, []);

  useEffect(() => {
    const fetchProblemData = async () => {
      if (!id) return;
      setLoadingData(true);
      setProblemData({ title: "", point: "", timeLimit: "", memoryLimit: "", statement: "", problemDifficulty: "", solutionCode: "" });
      setTestCases([{ input: "", expectedOutput: "" }]);
      setSelectedTags([]);
      setAuthorInfo({ id: null, username: null });
      try {
        const response = await ApiService.getProblemById(id);
        if (response.statusCode === 200 && response.data) {
          const problem = response.data;
          setAuthorInfo({ id: problem.authorId || null, username: problem.authorUserName || null });
          if (problem.tags && problem.tags.length > 0) setSelectedTags(problem.tags);
          let statementContent = "";
          if (problem.statementFileUrl) {
            try {
              const statementResponse = await fetch(`${problem.statementFileUrl}?t=${Date.now()}`);
              statementContent = await statementResponse.text();
            } catch (err) { showMessage("Failed to load problem statement", "warning"); }
          }
          setProblemData({ title: problem.title || "", point: problem.point || "", timeLimit: problem.timeLimit || "", memoryLimit: problem.memoryLimit || "", statement: statementContent, problemDifficulty: problem.problemDifficulty || "", solutionCode: problem.solutionCode || "" });
          if (problem.testCases && problem.testCases.length > 0) {
            const loaded = await Promise.all(
              problem.testCases.map(async (tc, index) => {
                let input = "", expectedOutput = "";
                try {
                  if (tc.inputFileUrl) { const resp = await fetch(`${tc.inputFileUrl}?t=${Date.now()}`); const text = await resp.text(); input = text.startsWith("<?xml") || text.startsWith("<Error") ? "" : text; }
                  if (tc.expectedOutputFileUrl) { const resp = await fetch(`${tc.expectedOutputFileUrl}?t=${Date.now()}`); const text = await resp.text(); expectedOutput = text.startsWith("<?xml") || text.startsWith("<Error") ? "" : text; }
                } catch (err) { console.error(`Error fetching test case ${index} files:`, err); }
                return { id: tc.id, input, expectedOutput, isSample: tc.isSample ?? false, dirty: false };
              })
            );
            setTestCases(loaded);
          } else { setTestCases([{ input: "", expectedOutput: "" }]); }
        } else { showMessage("Failed to load problem", "error"); }
      } catch (err) { showMessage(err.response?.data?.message || err.message || "Failed to load problem", "error"); } finally { setLoadingData(false); }
    };
    fetchProblemData();
  }, [id, dataVersion]);

  const inactiveTags = selectedTags.filter((t) => t.isActive === false);
  const hasInactiveTags = inactiveTags.length > 0;
  const addTag = (tag) => { if (!selectedTags.find((t) => t.id === tag.id)) setSelectedTags((prev) => [...prev, tag]); setTagSearchQuery(""); setShowTagDropdown(false); };
  const removeTag = (tagId) => setSelectedTags((prev) => prev.filter((t) => t.id !== tagId));
  const removeAllInactiveTags = () => setSelectedTags((prev) => prev.filter((t) => t.isActive !== false));
  const filteredDropdownTags = availableTags.filter((t) => !selectedTags.find((s) => s.id === t.id) && t.name.toLowerCase().includes(tagSearchQuery.toLowerCase()));

  const handleProblemChange = (field, value) => setProblemData((prev) => ({ ...prev, [field]: value, ...(field === "problemDifficulty" ? { point: "" } : {}) }));
  const addTestCase = () => setTestCases((prev) => [...prev, { input: "", expectedOutput: "", isSample: false, dirty: true }]);
  const removeTestCase = (index) => { if (testCases.length > 1) setTestCases((prev) => prev.filter((_, i) => i !== index)); };
  const handleTestCaseChange = (index, field, value) => setTestCases((prev) => prev.map((tc, i) => i === index ? { ...tc, [field]: value, dirty: true } : tc));
  const stringToFile = (content, filename, mimeType) => new File([new Blob([content], { type: mimeType })], filename, { type: mimeType });

  const handlePdfImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { showMessage("PDF must be under 4MB", "error"); e.target.value = ""; return; }
    setAiExtracting(true);
    try {
      const response = await ApiService.extractProblemFromPdf(file);
      if (response.statusCode === 200 && response.data) {
        const d = response.data;
        setProblemData((prev) => ({ title: d.title || "", point: d.point || "", timeLimit: d.timeLimit || "", memoryLimit: d.memoryLimit || "", statement: d.statement || "", problemDifficulty: d.difficulty || "", solutionCode: prev.solutionCode }));
        if (d.testCases && d.testCases.length > 0) setTestCases(d.testCases.map((tc) => ({ input: tc.input || "", expectedOutput: tc.expectedOutput || "", isSample: tc.isSample ?? false, dirty: true })));
        if (d.suggestedTags && d.suggestedTags.length > 0) {
          const matched = availableTags.filter((t) => d.suggestedTags.includes(t.name));
          if (matched.length > 0) setSelectedTags((prev) => { const existingIds = new Set(prev.map((t) => t.id)); return [...prev, ...matched.filter((t) => !existingIds.has(t.id))]; });
        }
        showMessage(d.testCasesGenerated ? `Extracted! ${d.testCases?.length || 0} test cases generated by AI.` : `Problem extracted from PDF — please review all fields before saving.`, "success");
      } else { showMessage(response.message || "Failed to extract from PDF", "error"); }
    } catch (err) { showMessage(err.response?.data?.message || err.message || "Failed to extract from PDF", "error"); } finally { setAiExtracting(false); e.target.value = ""; }
  };

  const handleGenerateTestCases = async () => {
    if (!problemData.statement.trim()) { showMessage("Write problem statement first", "error"); return; }
    setAiGenerating(true);
    try {
      const response = await ApiService.generateTestCases(problemData.statement, generateCount);
      if (response.statusCode === 200 && response.data?.testCases) {
        const generated = response.data.testCases.map((tc) => ({ input: tc.input || "", expectedOutput: tc.expectedOutput || "", isSample: tc.isSample ?? false, dirty: true }));
        setTestCases((prev) => { const hasOnlyEmpty = prev.length === 1 && !prev[0].input.trim() && !prev[0].expectedOutput.trim(); return hasOnlyEmpty ? generated : [...prev, ...generated]; });
        showMessage(`${generated.length} test cases generated by AI — please review!`, "success");
      } else { showMessage(response.message || "Failed to generate test cases", "error"); }
    } catch (err) { showMessage(err.response?.data?.message || err.message || "Failed to generate test cases", "error"); } finally { setAiGenerating(false); }
  };

  const validateForm = () => {
    if (!problemData.title.trim()) { showMessage("Problem title is required", "error"); return false; }
    if (!problemData.point || problemData.point <= 0) { showMessage("Point must be greater than 0", "error"); return false; }
    if (problemData.problemDifficulty) {
      const range = getPointRange(problemData.problemDifficulty);
      if (problemData.point < range.min || problemData.point > range.max) { showMessage(`Points for ${problemData.problemDifficulty.toLowerCase()} problems must be between ${range.min} and ${range.max}`, "error"); return false; }
    }
    if (!problemData.timeLimit || problemData.timeLimit <= 0) { showMessage("Time limit must be greater than 0", "error"); return false; }
    if (problemData.timeLimit > 10) { showMessage("Time limit cannot exceed 10 seconds", "error"); return false; }
    if (problemData.memoryLimit < 16) { showMessage("Memory limit must be at least 16MB", "error"); return false; }
    if (problemData.memoryLimit > 1024) { showMessage("Memory limit cannot exceed 1024MB", "error"); return false; }
    if (!problemData.statement.trim()) { showMessage("Problem statement is required", "error"); return false; }
    if (!problemData.problemDifficulty) { showMessage("Problem difficulty is required", "error"); return false; }
    if (hasInactiveTags) { showMessage("Please remove disabled tags before saving.", "error"); return false; }
    for (let i = 0; i < testCases.length; i++) {
      if (!testCases[i].input.trim()) { showMessage(`Input is required for test case ${i + 1}`, "error"); return false; }
      if (!testCases[i].expectedOutput.trim()) { showMessage(`Expected output is required for test case ${i + 1}`, "error"); return false; }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!currentUserId) { showMessage("User profile not loaded. Please try again.", "error"); return; }
    if (!validateForm()) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", problemData.title);
      formData.append("point", problemData.point);
      formData.append("timeLimit", problemData.timeLimit);
      formData.append("memoryLimit", problemData.memoryLimit);
      formData.append("authorId", currentUserId);
      formData.append("problemDifficulty", problemData.problemDifficulty);
      formData.append("statementFile", stringToFile(problemData.statement, "statement.md", "text/markdown"));
      if (problemData.solutionCode) { formData.append("solutionCode", problemData.solutionCode); formData.append("solutionLanguage", "CPP"); }
      if (mode === "my" && !id) formData.append("isPublic", false);
      const activeSelectedTags = selectedTags.filter((t) => t.isActive !== false);
      activeSelectedTags.forEach((tag) => formData.append("tagNames", tag.name));
      testCases.forEach((tc, index) => {
        if (tc.id) formData.append(`testCases[${index}].id`, tc.id);
        formData.append(`testCases[${index}].isSample`, tc.isSample ?? false);
        if (!tc.id || tc.dirty) {
          formData.append(`testCases[${index}].inputFile`, stringToFile(tc.input, `input_${index}.txt`, "text/plain"));
          formData.append(`testCases[${index}].expectedOutputFile`, stringToFile(tc.expectedOutput, `output_${index}.txt`, "text/plain"));
        }
      });
      let response;
      if (id) { formData.append("id", id); response = await ApiService.updateProblem(formData); }
      else { response = await ApiService.createProblem(formData); }
      if (response.statusCode === 201 || response.statusCode === 200) {
        showMessage(response.message || `Problem ${id ? "updated" : "created"} successfully!`, "success");
        if (id) { setTimeout(() => setDataVersion((v) => v + 1), 1000); }
        else { const dest = backPath || (mode === "my" ? "/admin/my-problems" : "/admin/problems"); setTimeout(() => navigate(dest), 1500); }
      } else { showMessage(response.message || `Failed to ${id ? "update" : "create"} problem`, "error"); }
    } catch (err) { showMessage(err.response?.data?.message || err.response?.data?.error || err.message || `Failed to ${id ? "update" : "create"} problem`, "error"); } finally { setLoading(false); }
  };

  if (loadingData) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card" style={{ padding: 32 }}>
          <div className="flex flex-col items-center gap-4">
            <p style={{ fontSize: 18, color: "var(--text-primary)" }}>Loading problem data...</p>
            <div className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  const sectionStyle = { borderBottom: "1px solid var(--border-default)", paddingBottom: 24 };
  const labelStyle = { fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8, display: "block" };

  return (
    <div
      style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 16px" }}
      onClick={() => showTagDropdown && setShowTagDropdown(false)}
    >
      {(aiExtracting || aiGenerating) && <AILoadingOverlay mode={aiExtracting ? "pdf" : "gen"} />}
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="card" style={{ padding: 32 }}>
          {/* Header */}
          <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
            <div className="flex items-center gap-3">
              <FileText size={32} color="var(--primary)" />
              <h2 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{id ? "Edit Problem" : "Create New Problem"}</h2>
            </div>
            <div className="flex items-center gap-2">
              <input type="file" accept=".pdf" ref={pdfInputRef} style={{ display: "none" }} onChange={handlePdfImport} />
              <button
                className="btn btn-ghost btn-sm"
                style={{ border: "1px solid var(--border-accent)", color: "var(--primary)" }}
                onClick={() => pdfInputRef.current?.click()}
                disabled={aiExtracting}
              >
                <Sparkles size={16} /> Import from PDF
              </button>
              <button className="btn btn-ghost" onClick={() => navigate(backPath || (mode === "my" ? "/admin/my-problems" : "/admin/problems"))}>
                <ArrowLeft size={20} /> Back to Problems
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* Problem Details */}
            <div style={sectionStyle}>
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Problem Details</h3>
                {id && authorInfo.id && (
                  <div className="flex items-center gap-2" style={{ background: "var(--bg-raised)", border: "1px solid var(--border-accent)", borderRadius: 10, padding: "8px 16px" }}>
                    <User size={16} color="var(--primary)" />
                    <span style={{ fontSize: 13, color: "var(--text-primary)" }}>Author:</span>
                    <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 13, background: "var(--primary-subtle)", color: "var(--primary)", fontWeight: 500 }}>{authorInfo.username}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>(ID: {authorInfo.id})</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                {/* Title */}
                <div>
                  <label style={labelStyle}>Title *</label>
                  <input className="input w-full" value={problemData.title} onChange={(e) => handleProblemChange("title", e.target.value)} placeholder="Enter problem title" style={{ fontSize: 15 }} />
                </div>

                {/* Numeric fields */}
                <div className="flex gap-4">
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>
                      Points *{" "}
                      {problemData.problemDifficulty && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          ({getPointRange(problemData.problemDifficulty).min}–{getPointRange(problemData.problemDifficulty).max} for {problemData.problemDifficulty.toLowerCase()})
                        </span>
                      )}
                    </label>
                    <input
                      type="number" className="input w-full"
                      value={problemData.point}
                      onChange={(e) => handleProblemChange("point", e.target.value)}
                      onBlur={() => {
                        if (problemData.point && problemData.problemDifficulty) {
                          const range = getPointRange(problemData.problemDifficulty);
                          if (problemData.point < range.min || problemData.point > range.max) showMessage(`Points for ${problemData.problemDifficulty.toLowerCase()} problems must be between ${range.min} and ${range.max}`, "error");
                        }
                      }}
                      placeholder={problemData.problemDifficulty ? `${getPointRange(problemData.problemDifficulty).min}–${getPointRange(problemData.problemDifficulty).max}` : "Select difficulty first"}
                      min={getPointRange(problemData.problemDifficulty).min}
                      max={getPointRange(problemData.problemDifficulty).max}
                      disabled={!problemData.problemDifficulty}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Time Limit (s) * <span style={{ fontSize: 11, color: "var(--text-muted)" }}>(max 10s)</span></label>
                    <input type="number" className="input w-full" value={problemData.timeLimit} onChange={(e) => handleProblemChange("timeLimit", e.target.value)} placeholder="2" min={1} max={10} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Memory Limit (MB) * <span style={{ fontSize: 11, color: "var(--text-muted)" }}>(max 1024MB)</span></label>
                    <input type="number" className="input w-full" value={problemData.memoryLimit} onChange={(e) => handleProblemChange("memoryLimit", e.target.value)} placeholder="256" min={16} max={1024} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Difficulty *</label>
                    <select
                      className="select w-full"
                      value={problemData.problemDifficulty}
                      onChange={(e) => handleProblemChange("problemDifficulty", e.target.value)}
                      style={{ color: problemData.problemDifficulty ? DIFFICULTY_COLORS[problemData.problemDifficulty] : undefined, fontWeight: problemData.problemDifficulty ? 600 : undefined }}
                    >
                      {DIFFICULTY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} style={{ color: opt.value ? DIFFICULTY_COLORS[opt.value] : "inherit", fontWeight: opt.value ? 600 : "normal" }}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                    <div className="flex items-center gap-1">
                      <TagIcon size={16} color="var(--primary)" />
                      <span style={labelStyle}>Tags</span>
                    </div>
                    {hasInactiveTags && (
                      <button className="btn btn-ghost btn-sm" style={{ color: "#f97316" }} onClick={removeAllInactiveTags}>
                        <Trash2 size={12} /> Remove all disabled tags
                      </button>
                    )}
                  </div>

                  {hasInactiveTags && (
                    <div style={{ marginBottom: 12, padding: 12, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8 }}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} color="#f97316" style={{ flexShrink: 0 }} />
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#c2410c" }}>
                            {inactiveTags.length} disabled tag{inactiveTags.length > 1 ? "s" : ""} detected
                          </p>
                          <p style={{ margin: 0, fontSize: 11, color: "#ea580c" }}>
                            The following tag{inactiveTags.length > 1 ? "s have" : " has"} been disabled: <strong>{inactiveTags.map((t) => t.name).join(", ")}</strong>. Please remove or replace them.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ padding: 12, border: `1px solid ${hasInactiveTags ? "#fed7aa" : "var(--border-default)"}`, borderRadius: 8, background: "var(--bg-raised)", minHeight: 52, position: "relative" }}>
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <span
                          key={tag.id}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 9999, fontSize: 13,
                            background: tag.isActive === false ? "transparent" : "var(--primary-subtle)",
                            color: tag.isActive === false ? "#f97316" : "var(--primary)",
                            border: `1px solid ${tag.isActive === false ? "#fed7aa" : "transparent"}`,
                            opacity: tag.isActive === false ? 0.8 : 1,
                          }}
                          title={tag.isActive === false ? "This tag is disabled — remove it before saving" : tag.name}
                        >
                          {tag.isActive === false && <AlertTriangle size={11} />}
                          <span style={{ textDecoration: tag.isActive === false ? "line-through" : "none" }}>{tag.name}</span>
                          <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }} onClick={() => removeTag(tag.id)}>
                            <X size={12} />
                          </button>
                        </span>
                      ))}

                      <div style={{ position: "relative" }}>
                        <button
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 9999, border: "1px dashed var(--primary-subtle)", background: "#fff", color: "var(--primary)", fontSize: 12, cursor: "pointer" }}
                          onClick={(e) => { e.stopPropagation(); setShowTagDropdown((v) => !v); }}
                        >
                          <Plus size={12} /> Add tag
                        </button>

                        {showTagDropdown && (
                          <div
                            style={{ position: "absolute", top: "110%", left: 0, zIndex: 30, background: "var(--bg-base)", border: "1px solid var(--border-default)", borderRadius: 10, boxShadow: "var(--shadow-md)", width: 220, maxHeight: 260, overflowY: "auto" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div style={{ borderBottom: "1px solid var(--border-default)", position: "sticky", top: 0, background: "var(--bg-base)" }}>
                              <SuggestiveSearch
                                value={tagSearchQuery}
                                onChange={(val) => setTagSearchQuery(val)}
                                suggestions={["Search active tags...", "Filter tags"]}
                                style={{ width: "100%" }}
                              />
                            </div>
                            {filteredDropdownTags.length === 0 ? (
                              <div style={{ padding: 12, textAlign: "center" }}>
                                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{availableTags.length === 0 ? "No active tags available" : "All active tags already added"}</span>
                              </div>
                            ) : (
                              filteredDropdownTags.map((tag) => (
                                <div key={tag.id} style={{ padding: "8px 12px", cursor: "pointer" }} onClick={() => addTag(tag)}>
                                  <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{tag.name}</span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>Only active tags can be assigned. Inactive tags must be removed before saving.</p>
                </div>

                {/* Statement */}
                <div>
                  <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Problem Statement (Markdown) *</label>
                    <div className="flex items-center gap-2">
                      <button
                        className="btn btn-sm"
                        style={{ background: !previewMode ? "var(--primary)" : "transparent", color: !previewMode ? "var(--bg-void)" : "var(--text-secondary)", border: `1px solid ${!previewMode ? "var(--primary)" : "var(--border-default)"}` }}
                        onClick={() => setPreviewMode(false)}
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{ background: previewMode ? "var(--primary)" : "transparent", color: previewMode ? "var(--bg-void)" : "var(--text-secondary)", border: `1px solid ${previewMode ? "var(--primary)" : "var(--border-default)"}` }}
                        onClick={() => setPreviewMode(true)}
                      >
                        <Eye size={14} /> Preview
                      </button>
                    </div>
                  </div>

                  {!previewMode ? (
                    <>
                      <div style={{ border: "1px solid var(--border-default)", borderRadius: 8, overflow: "hidden", height: 350 }}>
                        <Editor
                          height="100%" theme="vs-dark" language="markdown"
                          value={problemData.statement}
                          onChange={(val) => handleProblemChange("statement", val || "")}
                          options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: "on", wordWrap: "on", scrollBeyondLastLine: false, automaticLayout: true }}
                        />
                      </div>
                      <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 8 }}>This will be converted to a .md file. Use Markdown syntax for formatting.</p>
                    </>
                  ) : (
                    <div style={{ minHeight: 300, padding: 16, background: "var(--bg-base)", border: "1px solid var(--border-default)", borderRadius: 8, overflowY: "auto", maxHeight: 500 }}>
                      {problemData.statement ? (
                        <div className="markdown-preview">
                          <ReactMarkdown>{problemData.statement}</ReactMarkdown>
                        </div>
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No content to preview. Start typing in the editor...</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Solution Code (My Problems mode only) */}
            {mode === "my" && (
              <div style={sectionStyle}>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>Solution Code (C++)</h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>Optional. This code will be shown to students when you publish solutions in a lab.</p>
                <div style={{ border: "1px solid var(--border-default)", borderRadius: 8, overflow: "hidden", height: 350 }}>
                  <Editor
                    height="100%" theme="vs-dark" language="cpp"
                    value={problemData.solutionCode}
                    onChange={(val) => handleProblemChange("solutionCode", val || "")}
                    options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: "on", scrollBeyondLastLine: false, automaticLayout: true }}
                  />
                </div>
              </div>
            )}

            {/* Test Cases */}
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Test Cases</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number" className="input"
                    style={{ width: 70, textAlign: "center" }}
                    min={1} max={50}
                    value={generateCount}
                    onChange={(e) => setGenerateCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                    title="Number of test cases to generate (max 50)"
                  />
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ border: "1px solid var(--border-accent)", color: "var(--primary)" }}
                    onClick={handleGenerateTestCases}
                    disabled={aiGenerating || !problemData.statement.trim()}
                    title={!problemData.statement.trim() ? "Write problem statement first" : `Generate ${generateCount} test case(s) using AI`}
                  >
                    <Sparkles size={14} /> AI Generate
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {testCases.map((testCase, index) => (
                  <div key={index} style={{ background: "var(--bg-raised)", padding: 16, borderRadius: 10 }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                      <div className="flex items-center gap-3">
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Test Case {index + 1}</h4>
                        <button
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 12px", borderRadius: 9999, cursor: "pointer",
                            background: testCase.isSample ? "#f0fdf4" : "var(--bg-raised)",
                            border: `1px solid ${testCase.isSample ? "#86efac" : "var(--border-default)"}`,
                          }}
                          onClick={() => handleTestCaseChange(index, "isSample", !testCase.isSample)}
                          title="Sample test cases are visible to users solving the problem"
                        >
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: testCase.isSample ? "#4ade80" : "var(--text-muted)", flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: 500, color: testCase.isSample ? "#15803d" : "var(--text-secondary)" }}>
                            {testCase.isSample ? "Sample (visible)" : "Hidden"}
                          </span>
                        </button>
                      </div>
                      {testCases.length > 1 && (
                        <button className="btn btn-ghost btn-sm" style={{ color: "#ef4444" }} onClick={() => removeTestCase(index)}>
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    <div className="flex gap-4">
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Input *</label>
                        <textarea
                          className="input w-full"
                          value={testCase.input}
                          onChange={(e) => handleTestCaseChange(index, "input", e.target.value)}
                          placeholder="Enter test input..."
                          style={{ minHeight: 120, fontFamily: "monospace", fontSize: 13, resize: "vertical" }}
                        />
                        <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>Will be saved as {index}.txt</p>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Expected Output *</label>
                        <textarea
                          className="input w-full"
                          value={testCase.expectedOutput}
                          onChange={(e) => handleTestCaseChange(index, "expectedOutput", e.target.value)}
                          placeholder="Enter expected output..."
                          style={{ minHeight: 120, fontFamily: "monospace", fontSize: 13, resize: "vertical" }}
                        />
                        <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>Will be saved as {index}.txt</p>
                      </div>
                    </div>
                  </div>
                ))}

                <button className="btn btn-ghost w-full" style={{ border: "1px dashed var(--border-accent)", color: "var(--primary)" }} onClick={addTestCase}>
                  <Plus size={20} /> Add Test Case
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3" style={{ paddingTop: 24, borderTop: "1px solid var(--border-subtle)" }}>
              {hasInactiveTags && (
                <span style={{ fontSize: 13, color: "#f97316", display: "flex", alignItems: "center", gap: 4 }}>
                  <AlertTriangle size={14} /> Remove disabled tags before saving
                </span>
              )}
              <button
                className="btn btn-primary"
                style={{ fontSize: 15, padding: "10px 24px" }}
                onClick={handleSubmit}
                disabled={loading || hasInactiveTags}
              >
                <Upload size={20} />
                {loading ? (id ? "Updating..." : "Creating...") : (id ? "Update Problem" : "Create Problem")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProblemFormPage;
