import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Plus, Trash2, BookOpen, Save, Clock,
  Sparkles, AlertCircle, Minus,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import ApiService from "../../services/ApiService";
import ProblemPickerModal from "../common/ProblemPickerModal";
import { useToast } from "../common/ToastMessage";
import DateTimePicker from "../common/DateTimePicker";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIFF_COLORS = {
  EASY:   { color: "var(--green-ac)",  bg: "var(--green-subtle)"  },
  MEDIUM: { color: "var(--amber-tle)", bg: "var(--amber-subtle)"  },
  HARD:   { color: "var(--red-wa)",    bg: "var(--red-subtle)"    },
};

const DiffBadge = ({ diff }) => {
  const s = DIFF_COLORS[diff] || { color: "var(--text-secondary)", bg: "var(--bg-overlay)" };
  return (
    <span style={{
      display: "inline-flex", padding: "1px 7px", borderRadius: "var(--radius-pill)",
      fontSize: "var(--text-xs)", fontWeight: 700, background: s.bg, color: s.color,
    }}>
      {diff || "—"}
    </span>
  );
};

// ─── PointsStepper ───────────────────────────────────────────────────────────

const STEP = 10;
const PRESETS = [25, 50, 100, 150, 200];

const PointsStepper = ({ value, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const commit = (raw) => {
    const n = Math.max(0, parseInt(raw) || 0);
    onChange(n);
    setDraft(String(n));
    setEditing(false);
  };

  const adjust = (delta) => {
    const n = Math.max(0, (value || 0) + delta);
    onChange(n);
    setDraft(String(n));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
      {/* Stepper row */}
      <div style={{
        display: "flex", alignItems: "center",
        border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
        overflow: "hidden", background: "var(--bg-raised)",
      }}>
        <button
          type="button"
          onClick={() => adjust(-STEP)}
          style={{
            width: 28, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "none", borderRight: "1px solid var(--border-subtle)",
            cursor: "pointer", color: "var(--text-muted)", transition: "background 0.1s, color 0.1s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-overlay)"; e.currentTarget.style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-muted)"; }}
        >
          <Minus size={12} />
        </button>

        {editing ? (
          <input
            autoFocus
            type="number"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commit(draft)}
            onKeyDown={(e) => { if (e.key === "Enter") commit(draft); if (e.key === "Escape") { setDraft(String(value)); setEditing(false); } }}
            style={{
              width: 52, textAlign: "center", background: "none", border: "none", outline: "none",
              fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--primary)", padding: "0 4px", height: 30,
            }}
            min={0}
          />
        ) : (
          <button
            type="button"
            onClick={() => { setDraft(String(value)); setEditing(true); }}
            title="Click to edit"
            style={{
              width: 52, height: 30, background: "none", border: "none", cursor: "text",
              fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--primary)", textAlign: "center",
            }}
          >
            {value}
          </button>
        )}

        <button
          type="button"
          onClick={() => adjust(+STEP)}
          style={{
            width: 28, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "none", borderLeft: "1px solid var(--border-subtle)",
            cursor: "pointer", color: "var(--text-muted)", transition: "background 0.1s, color 0.1s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-overlay)"; e.currentTarget.style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-muted)"; }}
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Preset chips */}
      <div style={{ display: "flex", gap: 3 }}>
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => { onChange(p); setDraft(String(p)); }}
            style={{
              padding: "1px 6px", borderRadius: "var(--radius-pill)",
              border: `1px solid ${value === p ? "var(--primary)" : "var(--border-subtle)"}`,
              background: value === p ? "var(--primary-subtle)" : "none",
              color: value === p ? "var(--primary)" : "var(--text-muted)",
              fontSize: 10, fontWeight: 700, cursor: "pointer",
              transition: "all 0.1s",
            }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── LabFormPage ──────────────────────────────────────────────────────────────

const LabFormPage = () => {
  const { orgSlug, labSlug } = useParams();
  const isEdit = !!labSlug;
  const navigate = useNavigate();
  const { showMessage } = useToast();

  const [org, setOrg]               = useState(null);
  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline]     = useState("");
  const [exercises, setExercises]   = useState([]);
  const [labId, setLabId]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);

  const [pickerOpen, setPickerOpen]     = useState(false);

  const backTo = isEdit
    ? `/organizations/${orgSlug}/labs/${labSlug}`
    : `/organizations/${orgSlug}`;

  useEffect(() => {
    (async () => {
      try {
        const resp = await ApiService.getOrganizationBySlug(orgSlug);
        if (resp.statusCode === 200) {
          setOrg(resp.data);
          if (isEdit) {
            const labResp = await ApiService.getOrgLab(resp.data.id, labSlug);
            if (labResp.statusCode === 200) {
              const lab = labResp.data;
              setLabId(lab.id);
              setTitle(lab.title);
              setDescription(lab.description || "");
              setDeadline(lab.deadline || "");
              setExercises(
                (lab.exercises || []).map((ex) => ({
                  problemId: ex.problemId,
                  problemTitle: ex.problemTitle,
                  problemSlug: ex.problemSlug,
                  problemDifficulty: ex.problemDifficulty,
                  points: ex.points,
                }))
              );
            }
          }
        }
      } catch {
        showMessage("Failed to load", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [orgSlug, labSlug]);

  // Lab-fairness: only the creator's PRIVATE problems are eligible
  const fetchLabEligible = useCallback(async ({ search }) => {
    const resp = await ApiService.getMyProblems({ page: 0, size: 50, search });
    if (resp.statusCode !== 200) return [];
    return (resp.data.content ?? []).filter((p) => p.isPublic === false);
  }, []);

  const addExercises = (problems) => {
    setExercises((prev) => [
      ...prev,
      ...problems.map((p) => ({
        problemId: p.id,
        problemTitle: p.title,
        problemSlug: p.slug,
        problemDifficulty: p.problemDifficulty,
        points: p.point || 100,
      })),
    ]);
  };

  const removeExercise = (idx) => setExercises((prev) => prev.filter((_, i) => i !== idx));
  const updatePoints = (idx, pts) =>
    setExercises((prev) => prev.map((e, i) => (i === idx ? { ...e, points: typeof pts === "number" ? pts : parseInt(pts) || 0 } : e)));

  const handleSave = async () => {
    if (!title.trim()) { showMessage("Title is required", "error"); return; }
    if (exercises.length === 0) { showMessage("Add at least one exercise", "error"); return; }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        deadline: deadline || null,
        exercises: exercises.map((e) => ({ problemId: e.problemId, points: e.points })),
      };
      let resp;
      if (isEdit) {
        resp = await ApiService.updateLab(org.id, labId, payload);
      } else {
        resp = await ApiService.createLab(org.id, payload);
      }
      if (resp.statusCode === 201 || resp.statusCode === 200) {
        showMessage(isEdit ? "Lab updated!" : "Lab created!", "success");
        if (isEdit) {
          navigate(`/organizations/${orgSlug}/labs/${resp.data.slug || labSlug}`);
        } else {
          navigate(`/organizations/${orgSlug}`);
        }
      }
    } catch (e) {
      showMessage(e.response?.data?.message || e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner" />
      </div>
    );
  }

  const totalPoints = exercises.reduce((s, e) => s + (e.points || 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0 64px" }}>
      <div className="page-container" style={{ maxWidth: 860 }}>
        <div className="flex flex-col gap-6">

          {/* ── Back ── */}
          <button
            className="btn btn-ghost btn-sm"
            style={{ alignSelf: "flex-start", gap: 6 }}
            onClick={() => navigate(backTo)}
          >
            <ArrowLeft size={16} />
            {isEdit ? `Back to ${labSlug}` : `Back to ${org?.name}`}
          </button>

          {/* ── Page header ── */}
          <div style={{ borderLeft: "4px solid var(--primary)", paddingLeft: 16 }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {org?.name} / {isEdit ? "Edit Lab" : "New Lab"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <BookOpen size={20} color="var(--primary)" />
              <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--text-primary)" }}>
                {isEdit ? "Edit Lab" : "Create Lab"}
              </h2>
            </div>
          </div>

          {/* ── Lab details card ── */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 18 }}>
              Lab Details
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Title */}
              <div>
                <label style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Title <span style={{ color: "var(--red-wa)" }}>*</span>
                </label>
                <input
                  className="input w-full"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lab 1 — Arrays & Strings"
                  style={{ fontSize: "var(--text-base)" }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Description
                  <span style={{ marginLeft: 6, fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--text-muted)", textTransform: "none", letterSpacing: 0 }}>optional</span>
                </label>
                <textarea
                  className="input w-full"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what students will practice…"
                  rows={3}
                  style={{ resize: "vertical", lineHeight: 1.6 }}
                />
              </div>

              {/* Deadline */}
              <div>
                <label style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <Clock size={12} /> Deadline
                    <span style={{ marginLeft: 2, fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--text-muted)", textTransform: "none", letterSpacing: 0 }}>optional</span>
                  </span>
                </label>
                <DateTimePicker value={deadline} onChange={setDeadline} placeholder="Pick deadline date & time" />
              </div>

            </div>
          </div>

          {/* ── Exercises card ── */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Exercises
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {exercises.length > 0 && (
                  <span style={{
                    padding: "2px 10px", borderRadius: "var(--radius-pill)",
                    background: "var(--primary-subtle)", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)",
                  }}>
                    {exercises.length} problem{exercises.length !== 1 ? "s" : ""}
                  </span>
                )}
                {totalPoints > 0 && (
                  <span style={{
                    padding: "2px 10px", borderRadius: "var(--radius-pill)",
                    background: "var(--amber-subtle)", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--amber-tle)",
                  }}>
                    {totalPoints} pts total
                  </span>
                )}
              </div>
            </div>

            {/* Exercise list */}
            {exercises.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {exercises.map((ex, idx) => {
                  return (
                    <div
                      key={ex.problemId}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        background: "var(--bg-raised)", borderRadius: "var(--radius-md)",
                        padding: "10px 14px", border: "1px solid var(--border-subtle)",
                        transition: "border-color 0.12s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                    >
                      {/* Index badge */}
                      <div style={{
                        width: 26, height: 26, borderRadius: "var(--radius-sm)", flexShrink: 0,
                        background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{ fontSize: "var(--text-xs)", fontWeight: 800, color: "var(--primary)" }}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                      </div>

                      {/* Title + diff */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {ex.problemTitle}
                        </div>
                        <div style={{ marginTop: 2 }}>
                          <DiffBadge diff={ex.problemDifficulty} />
                        </div>
                      </div>

                      {/* Points stepper */}
                      <PointsStepper
                        value={ex.points}
                        onChange={(n) => updatePoints(idx, n)}
                      />

                      {/* Remove */}
                      <button
                        onClick={() => removeExercise(idx)}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          padding: 6, borderRadius: "var(--radius-sm)", display: "flex",
                          color: "var(--text-muted)", transition: "color 0.12s, background 0.12s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--red-wa)"; e.currentTarget.style.background = "var(--red-subtle)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "none"; }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                padding: "28px 16px", textAlign: "center", marginBottom: 20,
                border: "1.5px dashed var(--border-default)", borderRadius: "var(--radius-md)",
                background: "var(--bg-surface)",
              }}>
                <Sparkles size={20} style={{ margin: "0 auto 8px", display: "block", color: "var(--text-muted)" }} />
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                  No exercises yet
                </div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  Search and add problems below.
                </div>
              </div>
            )}

            {/* Divider */}
            <div style={{ borderTop: "1px solid var(--border-subtle)", marginBottom: 16 }} />

            {/* Add problems (bulk picker) */}
            <div>
              <label style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Add Problems
              </label>
              <p style={{ margin: "0 0 8px 0", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                Only your private problems can be added. Note: once students submit to a lab problem, it becomes ineligible for contests.
              </p>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPickerOpen(true)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  border: "1.5px dashed var(--border-default)", borderRadius: "var(--radius-md)",
                }}
              >
                <Plus size={14} /> Add Problems
              </button>
            </div>
          </div>

          <ProblemPickerModal
            isOpen={pickerOpen}
            onClose={() => setPickerOpen(false)}
            title="Add lab problems"
            hint="Only your private problems are listed. Once students submit to a lab problem, it becomes ineligible for contests."
            fetchProblems={fetchLabEligible}
            excludeIds={exercises.map((e) => e.problemId)}
            onAdd={addExercises}
          />

          {/* ── Actions ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
            <button
              className="btn btn-ghost"
              onClick={() => navigate(backTo)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ gap: 8, minWidth: 130 }}
            >
              {saving
                ? <><div className="spinner" style={{ width: 15, height: 15 }} /> Saving…</>
                : <><Save size={15} /> {isEdit ? "Save Changes" : "Create Lab"}</>
              }
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LabFormPage;
