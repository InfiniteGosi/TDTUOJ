import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Plus, Trash2, Search, BookOpen, Save } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import SuggestiveSearch from "../common/SuggestiveSearch";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import DateTimePicker from "../common/DateTimePicker";

const DIFF_COLORS = {
  EASY: { color: "#16a34a", bg: "#dcfce7" },
  MEDIUM: { color: "#ea580c", bg: "#fff7ed" },
  HARD: { color: "#dc2626", bg: "#fee2e2" },
};

const LabFormPage = () => {
  const { orgSlug, labSlug } = useParams();
  const isEdit = !!labSlug;
  const navigate = useNavigate();
  const { showMessage } = useToast();

  const [org, setOrg] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [exercises, setExercises] = useState([]);
  const [labId, setLabId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

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
      } catch (e) {
        showMessage("Failed to load", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [orgSlug, labSlug]);

  const searchProblems = useCallback(async () => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const resp = await ApiService.getMyProblems({ page: 0, size: 20, search: searchQuery.trim() });
      if (resp.statusCode === 200) {
        const existing = new Set(exercises.map((e) => e.problemId));
        setSearchResults((resp.data.content ?? []).filter((p) => !existing.has(p.id)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, exercises]);

  useEffect(() => {
    const t = setTimeout(searchProblems, 300);
    return () => clearTimeout(t);
  }, [searchProblems]);

  const addExercise = (problem) => {
    setExercises((prev) => [
      ...prev,
      { problemId: problem.id, problemTitle: problem.title, problemSlug: problem.slug, problemDifficulty: problem.problemDifficulty, points: problem.point || 100 },
    ]);
    setSearchResults((prev) => prev.filter((p) => p.id !== problem.id));
  };

  const removeExercise = (idx) => setExercises((prev) => prev.filter((_, i) => i !== idx));
  const updatePoints = (idx, pts) => setExercises((prev) => prev.map((e, i) => (i === idx ? { ...e, points: parseInt(pts) || 0 } : e)));

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

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0" }}>
      <div className="page-container" style={{ maxWidth: 900 }}>
        <div className="flex flex-col gap-6">
          {/* Back */}
          <button
            className="btn btn-ghost btn-sm"
            style={{ alignSelf: "flex-start" }}
            onClick={() => navigate(`/organizations/${orgSlug}`)}
          >
            <ArrowLeft size={18} /> Back to {org?.name}
          </button>

          {/* Info card */}
          <div className="card" style={{ padding: 24 }}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <BookOpen size={22} color="#7c3aed" />
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
                  {isEdit ? "Edit Lab" : "Create Lab"}
                </h2>
              </div>

              <div className="flex flex-col gap-3">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lab 1 — Arrays & Strings" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input className="input w-full" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Deadline</label>
                  <DateTimePicker value={deadline} onChange={setDeadline} placeholder="Pick deadline date & time" />
                </div>
              </div>
            </div>
          </div>

          {/* Exercises card */}
          <div className="card" style={{ padding: 24 }}>
            <div className="flex flex-col gap-4">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                Exercises ({exercises.length})
              </h3>

              {exercises.map((ex, idx) => {
                const dc = DIFF_COLORS[ex.problemDifficulty] || { color: "#6b7280", bg: "#f9fafb" };
                return (
                  <div
                    key={ex.problemId}
                    className="flex items-center gap-3"
                    style={{ background: "var(--bg-raised)", borderRadius: 10, padding: 12, border: "1px solid var(--border-subtle)" }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#7c3aed" }}>{String.fromCharCode(65 + idx)}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{ex.problemTitle}</p>
                      <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: dc.bg, color: dc.color }}>
                        {ex.problemDifficulty || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted">pts:</span>
                      <input
                        type="number"
                        className="input"
                        value={ex.points}
                        onChange={(e) => updatePoints(idx, e.target.value)}
                        style={{ width: 60, textAlign: "center", padding: "3px 6px" }}
                      />
                    </div>
                    <button style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6 }} onClick={() => removeExercise(idx)}>
                      <Trash2 size={16} color="#ef4444" />
                    </button>
                  </div>
                );
              })}

              {/* Search problems */}
              <div>
                <label className="form-label" style={{ marginBottom: 8 }}>Search your problems to add</label>
                <SuggestiveSearch
                  value={searchQuery}
                  onChange={(val) => setSearchQuery(val)}
                  suggestions={["Search by title...", "Find problems to add"]}
                  style={{ width: "100%" }}
                />

                {searching && (
                  <div style={{ padding: 12, textAlign: "center" }}>
                    <div className="spinner" style={{ width: 20, height: 20, margin: "0 auto" }} />
                  </div>
                )}

                {!searching && searchResults.length > 0 && (
                  <div className="flex flex-col gap-1" style={{ marginTop: 8, maxHeight: 250, overflowY: "auto" }}>
                    {searchResults.map((p) => {
                      const dc = DIFF_COLORS[p.problemDifficulty] || { color: "#6b7280", bg: "#f9fafb" };
                      return (
                        <div
                          key={p.id}
                          className="flex items-center gap-2"
                          style={{ background: "var(--bg-raised)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
                          onClick={() => addExercise(p)}
                        >
                          <Plus size={14} color="#7c3aed" />
                          <span style={{ fontSize: 13, fontWeight: 500, flex: 1, color: "var(--text-primary)" }}>{p.title}</span>
                          <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: dc.bg, color: dc.color }}>{p.problemDifficulty || "—"}</span>
                          <span className="text-xs text-muted">{p.point}pts</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button className="btn btn-ghost" onClick={() => navigate(`/organizations/${orgSlug}`)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Save size={16} />}
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Lab"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabFormPage;
