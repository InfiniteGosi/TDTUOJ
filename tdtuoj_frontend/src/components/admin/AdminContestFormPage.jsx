import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Trophy, ArrowLeft, Save, Plus, Trash2, Search, ChevronDown, AlertTriangle, Clock, CalendarClock, User,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import DateTimePicker from "../common/DateTimePicker";
import SuggestiveSearch from "../common/SuggestiveSearch";

// ─── Reusable field ────────────────────────────────────────────────────────────

const Field = ({ label, required, children, hint }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-1">
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{label}</span>
      {required && <span style={{ fontSize: 13, color: "var(--red-wa)" }}>*</span>}
    </div>
    {children}
    {hint && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{hint}</span>}
  </div>
);

// ─── Problem picker dropdown ───────────────────────────────────────────────────

const ProblemPicker = ({ selectedProblems, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [allProblems, setAllProblems] = useState([]);

  useEffect(() => {
    ApiService.getAllProblems({ limit: 200, offset: 0 })
      .then((r) => { if (r.statusCode === 200) setAllProblems(r.data.content ?? []); })
      .catch(console.error);
  }, []);

  const selectedIds = selectedProblems.map((p) => p.problemId);
  const available = allProblems.filter((p) => !selectedIds.includes(p.id) && p.title.toLowerCase().includes(search.toLowerCase()));

  const add = (problem) => {
    onChange([...selectedProblems, { problemId: problem.id, problemTitle: problem.title, problemOrder: selectedProblems.length + 1, points: problem.point ?? 100 }]);
    setSearch(""); setOpen(false);
  };

  const remove = (problemId) => onChange(selectedProblems.filter((p) => p.problemId !== problemId).map((p, i) => ({ ...p, problemOrder: i + 1 })));

  const updatePoints = (problemId, points) => onChange(selectedProblems.map((p) => p.problemId === problemId ? { ...p, points: parseInt(points) || 0 } : p));

  return (
    <div className="flex flex-col gap-3">
      {selectedProblems.length > 0 && (
        <div style={{ border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
          {selectedProblems.map((p, idx) => (
            <div
              key={p.problemId}
              className="flex items-center justify-between"
              style={{ padding: "10px 16px", borderBottom: idx < selectedProblems.length - 1 ? "1px solid var(--border-subtle)" : 0, background: idx % 2 === 0 ? "var(--bg-base)" : "var(--bg-raised)" }}
            >
              <div className="flex items-center gap-3">
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--primary-subtle)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                  {String.fromCharCode(64 + p.problemOrder)}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{p.problemTitle}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>pts:</span>
                  <input
                    type="number" className="input"
                    style={{ width: 70, textAlign: "center", padding: "2px 6px", fontSize: 12 }}
                    value={p.points}
                    onChange={(e) => updatePoints(p.problemId, e.target.value)}
                    min={0}
                  />
                </div>
                <button type="button" style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: "var(--red-wa)" }} onClick={() => remove(p.problemId)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ position: "relative", display: "inline-block" }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10,
            border: `1.5px dashed ${open ? "var(--primary-bright)" : "var(--border-default)"}`,
            background: "var(--bg-base)", color: open ? "var(--primary)" : "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}
        >
          <Plus size={14} /> Add Problem
          <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
        </button>

        {open && (
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, background: "var(--bg-base)", border: "1px solid var(--border-default)", borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.1)", width: 320, maxHeight: 280, overflowY: "auto" }}>
            <div style={{ borderBottom: "1px solid var(--border-default)", position: "sticky", top: 0, background: "var(--bg-base)" }}>
              <SuggestiveSearch
                value={search}
                onChange={(val) => setSearch(val)}
                suggestions={["Search problems...", "Find by title"]}
                style={{ width: "100%" }}
              />
            </div>
            {available.length === 0 ? (
              <div style={{ padding: "10px 16px" }}><span style={{ fontSize: 11, color: "var(--text-muted)" }}>No problems available</span></div>
            ) : (
              available.slice(0, 30).map((problem) => (
                <div key={problem.id} style={{ padding: "8px 16px", cursor: "pointer" }} onClick={() => add(problem)}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{problem.title}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>{problem.point ?? 0} pts · {problem.problemDifficulty ?? "—"}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main form ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = { name: "", description: "", startTime: "", endTime: "", registrationStart: "", maxParticipant: "20", isPublic: true, isRated: true, contestStyle: "ICPC", problems: [] };

const toPickerDate = (isoStr) => { if (!isoStr) return ""; const base = isoStr.slice(0, 19); return base.length === 16 ? base + ":00" : base; };
const toIsoString = (val) => { if (!val) return null; return val.length === 16 ? val + ":00" : val; };
const fmtShort = (iso) => { if (!iso) return null; const d = new Date(iso); if (isNaN(d)) return null; return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); };

const getScheduleWarnings = (form) => {
  const w = [];
  const s = form.startTime ? new Date(form.startTime).getTime() : null;
  const e = form.endTime ? new Date(form.endTime).getTime() : null;
  const ro = form.registrationStart ? new Date(form.registrationStart).getTime() : null;
  if (s && e && e <= s) w.push({ type: "error", msg: "End time must be after start time" });
  if (s && e && e > s) { const mins = (e - s) / 60000; if (mins < 5) w.push({ type: "warn", msg: "Contest duration is under 5 minutes" }); }
  if (ro && s && ro >= s) w.push({ type: "warn", msg: "Registration opens after contest starts" });
  if (s && s < Date.now()) w.push({ type: "warn", msg: "Start time is in the past" });
  return w;
};

const EVENTS = [
  { key: "registrationStart", label: "Registration Opens", color: "var(--blue-ce)", bg: "var(--blue-subtle)" },
  { key: "startTime", label: "Registration Closes / Contest Starts", color: "var(--green-ac)", bg: "var(--green-subtle)" },
  { key: "endTime", label: "Contest Ends", color: "var(--red-wa)", bg: "var(--red-subtle)" },
];

const ScheduleTimeline = ({ form }) => {
  const events = useMemo(() => {
    const list = EVENTS.filter((ev) => form[ev.key]).map((ev) => ({ ...ev, time: new Date(form[ev.key]).getTime() }));
    list.sort((a, b) => a.time - b.time);
    return list;
  }, [form.startTime, form.endTime, form.registrationStart]);

  const warnings = useMemo(() => getScheduleWarnings(form), [form.startTime, form.endTime, form.registrationStart]);
  const hasStart = Boolean(form.startTime);
  const hasEnd = Boolean(form.endTime);

  if (events.length === 0) {
    return (
      <div style={{ background: "var(--bg-raised)", borderRadius: 10, border: "1px dashed var(--border-default)", padding: 16, textAlign: "center" }}>
        <CalendarClock size={24} color="var(--border-default)" style={{ margin: "0 auto 8px" }} />
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>Set times to see the schedule</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div style={{ background: "var(--bg-raised)", borderRadius: 10, padding: 16, border: "1px solid var(--border-subtle)" }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em", margin: "0 0 12px" }}>SCHEDULE ORDER</p>
        <div className="flex flex-col">
          {events.map((ev, i) => (
            <div key={ev.key} className="flex items-center gap-3" style={{ position: "relative" }}>
              <div className="flex flex-col items-center" style={{ width: 16, flexShrink: 0 }}>
                {i > 0 && <div style={{ width: 2, height: 8, background: "var(--border-default)" }} />}
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: ev.color, border: "2px solid var(--bg-void)", flexShrink: 0 }} />
                {i < events.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 8, background: "var(--border-default)" }} />}
              </div>
              <div style={{ flex: 1, background: ev.bg, borderRadius: 6, padding: "6px 12px", marginBottom: 4 }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: ev.color }}>{ev.label}</p>
                <p style={{ margin: 0, fontSize: 10, color: "var(--text-secondary)" }}>{fmtShort(new Date(ev.time).toISOString())}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {hasStart && hasEnd && (() => {
        const s = new Date(form.startTime).getTime();
        const e = new Date(form.endTime).getTime();
        const diff = e - s;
        if (diff <= 0) return null;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        return (
          <div className="flex items-center justify-center gap-1">
            <Clock size={12} color="var(--text-muted)" />
            <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>Duration: {h > 0 ? `${h}h ` : ""}{m}m</span>
          </div>
        );
      })()}

      {warnings.length > 0 && (
        <div className="flex flex-col gap-1">
          {warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-center gap-2"
              style={{ padding: "6px 12px", background: w.type === "error" ? "var(--red-subtle)" : "var(--amber-subtle)", borderRadius: 8, border: `1px solid ${w.type === "error" ? "var(--red-subtle)" : "var(--amber-subtle)"}` }}
            >
              <AlertTriangle size={14} color={w.type === "error" ? "var(--red-wa)" : "var(--amber-tle)"} />
              <span style={{ fontSize: 11, fontWeight: 600, color: w.type === "error" ? "var(--red-wa)" : "var(--amber-tle)" }}>{w.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Toggle button helper
const Toggle = ({ value, onChange, label }) => (
  <div className="flex items-center gap-3">
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{ width: 40, height: 24, borderRadius: 12, background: value ? "var(--primary)" : "var(--border-default)", position: "relative", border: "none", cursor: "pointer", transition: "background 0.2s" }}
    >
      <span style={{ position: "absolute", top: 2, left: value ? 18 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
    </button>
    <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{label}</span>
  </div>
);

const AdminContestFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { showMessage } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatorInfo, setCreatorInfo] = useState({ id: null, username: null });

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    ApiService.getContestById(id)
      .then((resp) => {
        if (resp.statusCode === 200) {
          const c = resp.data;
          setForm({ name: c.name ?? "", description: c.description ?? "", startTime: toPickerDate(c.startTime), endTime: toPickerDate(c.endTime), registrationStart: toPickerDate(c.registrationStart), maxParticipant: c.maxParticipant ?? "", isPublic: c.isPublic ?? true, isRated: c.isRated ?? false, contestStyle: c.contestStyle ?? "ICPC", problems: (c.problems ?? []).map((p) => ({ problemId: p.problemId, problemTitle: p.problemTitle, problemOrder: p.problemOrder, points: p.points ?? 100 })) });
          setCreatorInfo({ id: c.creatorId || null, username: c.creatorUsername || null });
        }
      })
      .catch((err) => showMessage(err.response?.data?.message || err.message, "error"))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return showMessage("Contest name is required", "error");
    if (!form.startTime) return showMessage("Start time is required", "error");
    if (!form.endTime) return showMessage("End time is required", "error");
    const sMs = new Date(form.startTime).getTime();
    const eMs = new Date(form.endTime).getTime();
    if (eMs <= sMs) return showMessage("End time must be after start time", "error");
    const payload = {
      name: form.name.trim(), description: form.description.trim() || null,
      startTime: toIsoString(form.startTime), endTime: toIsoString(form.endTime),
      registrationStart: toIsoString(form.registrationStart), registrationEnd: toIsoString(form.startTime),
      maxParticipant: form.maxParticipant ? parseInt(form.maxParticipant) : null,
      isPublic: form.isPublic, isRated: form.isRated, contestStyle: "ICPC",
      problems: form.problems.map((p) => ({ problemId: p.problemId, problemOrder: p.problemOrder, points: p.points })),
    };
    try {
      setSaving(true);
      const resp = isEdit ? await ApiService.updateContest(id, payload) : await ApiService.createContest(payload);
      if (resp.statusCode === 200 || resp.statusCode === 201) {
        showMessage(isEdit ? "Contest updated successfully" : "Contest created successfully", "success");
        navigate("/admin/contests");
      }
    } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="spinner" />
          <span className="text-muted">Loading contest...</span>
        </div>
      </div>
    );
  }

  const sectionLabel = { fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 16, display: "block" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0" }}>
      <div className="page-container" style={{ maxWidth: 800 }}>
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="btn btn-ghost btn-sm" onClick={() => navigate("/admin/contests")} style={{ padding: 8 }}>
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-2">
                <Trophy size={24} color="var(--primary)" />
                <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  {isEdit ? "Edit Contest" : "Create Contest"}
                </h2>
              </div>
            </div>
            <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 9999, fontSize: 13, fontWeight: 600, background: "var(--primary-subtle)", color: "var(--primary)" }}>
              ICPC Style
            </span>
          </div>

          {/* Creator info (edit mode) */}
          {isEdit && creatorInfo.id && (
            <div className="flex items-center gap-2" style={{ background: "var(--primary-subtle)", border: "1px solid var(--border-accent)", borderRadius: 10, padding: "8px 16px", alignSelf: "flex-start" }}>
              <User size={16} color="var(--primary)" />
              <span style={{ fontSize: 13, color: "var(--text-primary)" }}>Creator:</span>
              <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 13, background: "var(--primary-subtle)", color: "var(--primary)", fontWeight: 500 }}>{creatorInfo.username}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>(ID: {creatorInfo.id})</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="card" style={{ padding: 32 }}>
              <div className="flex flex-col gap-6">
                {/* Basic Info */}
                <div>
                  <span style={sectionLabel}>BASIC INFO</span>
                  <div className="flex flex-col gap-4">
                    <Field label="Contest Name" required>
                      <input className="input w-full" placeholder="e.g. TDTU Spring Cup 2025" value={form.name} onChange={(e) => set("name", e.target.value)} />
                    </Field>
                    <Field label="Description">
                      <textarea
                        className="input w-full"
                        placeholder="Describe the contest, rules, prizes..."
                        value={form.description}
                        onChange={(e) => set("description", e.target.value)}
                        rows={4}
                        style={{ resize: "vertical" }}
                      />
                    </Field>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border-subtle)" }} />

                {/* Schedule */}
                <div>
                  <span style={sectionLabel}>SCHEDULE</span>
                  <div className="flex gap-6" style={{ alignItems: "flex-start" }}>
                    <div className="flex flex-col gap-4" style={{ flex: 1 }}>
                      <Field label="Registration Opens" hint="Leave blank to allow registration any time. Closes automatically when contest starts.">
                        <DateTimePicker value={form.registrationStart} onChange={(v) => set("registrationStart", v)} placeholder="Pick opening date & time" />
                      </Field>
                      <div className="flex gap-4">
                        <Field label="Start Time" required>
                          <DateTimePicker value={form.startTime} onChange={(v) => set("startTime", v)} placeholder="Pick start date & time" />
                        </Field>
                        <Field label="End Time" required>
                          <DateTimePicker value={form.endTime} onChange={(v) => set("endTime", v)} placeholder="Pick end date & time" />
                        </Field>
                      </div>
                    </div>
                    <div style={{ width: 280, minWidth: 240, flexShrink: 0, paddingTop: 24 }}>
                      <ScheduleTimeline form={form} />
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border-subtle)" }} />

                {/* Settings */}
                <div>
                  <span style={sectionLabel}>SETTINGS</span>
                  <div className="flex flex-col gap-4">
                    <Field label="Max Participants" hint="Leave blank for unlimited">
                      <input type="number" className="input" placeholder="e.g. 500" value={form.maxParticipant} onChange={(e) => set("maxParticipant", e.target.value)} min={1} style={{ width: 200 }} />
                    </Field>
                    <div className="flex gap-6">
                      <Toggle value={form.isPublic} onChange={(v) => set("isPublic", v)} label="Public contest" />
                      <Toggle value={form.isRated} onChange={(v) => set("isRated", v)} label="Rated contest" />
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border-subtle)" }} />

                {/* Problems */}
                <div>
                  <span style={sectionLabel}>PROBLEMS ({form.problems.length})</span>
                  <ProblemPicker selectedProblems={form.problems} onChange={(p) => set("problems", p)} />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3" style={{ paddingTop: 8 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => navigate("/admin/contests")}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Save size={16} />}
                    {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Contest"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminContestFormPage;
