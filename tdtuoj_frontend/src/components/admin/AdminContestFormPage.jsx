import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Trophy, ArrowLeft, Save, Plus, Trash2, Search, ChevronDown, AlertTriangle, Clock, CalendarClock, User,
} from "lucide-react";
import Toggle from "../common/Toggle";
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

// ─── Section card ──────────────────────────────────────────────────────────────

const SectionCard = ({ number, title, children, delay = 0 }) => (
  <div style={{
    background: "var(--bg-base)",
    border: "1px solid var(--border-default)",
    borderRadius: 12,
    padding: "28px 28px 28px",
    position: "relative",
    marginTop: 32,
    animation: `fadeUp 350ms cubic-bezier(0.16,1,0.3,1) ${delay}ms both`,
    transition: "border-color 200ms ease",
  }}>
    <div style={{
      position: "absolute", top: -14, left: 20,
      width: 28, height: 28, borderRadius: "50%",
      background: "var(--primary)", color: "var(--bg-void)",
      fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 0 0 3px var(--bg-void), 0 0 16px rgba(245,160,0,0.4)",
    }}>{number}</div>
    <div style={{
      fontSize: 10, fontWeight: 700, color: "var(--primary)",
      letterSpacing: "0.14em", marginBottom: 20,
      fontFamily: "var(--font-display)",
    }}>{title}</div>
    {children}
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
      {selectedProblems.length === 0 ? (
        <div style={{ border: "1.5px dashed var(--border-default)", borderRadius: 10, padding: "24px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          No problems added yet. Use the button below to add problems to this contest.
        </div>
      ) : (
        <div style={{ border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
          {selectedProblems.map((p, idx) => (
            <div
              key={p.problemId}
              className="flex items-center justify-between"
              style={{ padding: "10px 16px", borderBottom: idx < selectedProblems.length - 1 ? "1px solid var(--border-subtle)" : 0, background: idx % 2 === 0 ? "var(--bg-base)" : "var(--bg-raised)" }}
            >
              <div className="flex items-center gap-3">
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary)", color: "var(--bg-void)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {String.fromCharCode(64 + p.problemOrder)}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{p.problemTitle}</span>
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
                <button
                  type="button"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: "var(--red-wa)" }}
                  onClick={() => remove(p.problemId)}
                >
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
            border: `1.5px dashed ${open ? "var(--primary)" : "var(--border-default)"}`,
            background: "var(--bg-base)", color: open ? "var(--primary)" : "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer",
            transition: "color 150ms ease, border-color 150ms ease",
          }}
        >
          <Plus size={14} /> Add Problem
          <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }} />
        </button>

        {open && (
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, background: "var(--bg-base)", border: "1px solid var(--border-default)", borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.25)", width: 320, maxHeight: 280, overflowY: "auto" }}>
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
                <div key={problem.id} style={{ padding: "8px 16px", cursor: "pointer", transition: "background 120ms" }} onClick={() => add(problem)}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-raised)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", fontWeight: 700 }}>{problem.title}</p>
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
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: ev.color, border: "2px solid var(--bg-void)", flexShrink: 0, boxShadow: `0 0 8px ${ev.color}` }} />
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
      <div style={{ minHeight: "100vh", background: "var(--bg-void)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="spinner" />
          <span className="text-muted">Loading contest...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "var(--bg-void)",
        backgroundImage: "radial-gradient(circle, rgba(245,160,0,0.04) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}>
        {/* Sticky top bar */}
        <div style={{
          position: "sticky", top: 0, zIndex: 20,
          height: 56,
          background: "var(--bg-raised)",
          borderBottom: "1px solid var(--border-subtle)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px",
        }}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigate("/admin/contests")}
              style={{ padding: "6px 8px" }}
            >
              <ArrowLeft size={18} />
            </button>
            <Trophy size={20} color="var(--primary)" />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
              {isEdit ? "Edit Contest" : "Create Contest"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span style={{
              padding: "3px 12px", borderRadius: 9999,
              background: "var(--primary-subtle)", color: "var(--primary)",
              fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
            }}>
              ICPC STYLE
            </span>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={handleSubmit}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              {saving ? (
                <>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", animation: "spin 0.8s linear infinite" }} />
                  Saving...
                </>
              ) : (
                <><Save size={14} /> Save</>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px 64px" }}>

          {/* Creator info (edit mode) */}
          {isEdit && creatorInfo.id && (
            <div className="flex items-center gap-2" style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border-default)",
              borderLeft: "3px solid var(--primary)",
              borderRadius: 10, padding: "8px 16px",
              display: "inline-flex", alignItems: "center", gap: 8,
              marginBottom: 4,
            }}>
              <User size={15} color="var(--primary)" />
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Creator:</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)" }}>{creatorInfo.username}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>(ID: {creatorInfo.id})</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>

            {/* Card 1 — Basics */}
            <SectionCard number={1} title="BASICS" delay={0}>
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
            </SectionCard>

            {/* Card 2 — Schedule */}
            <SectionCard number={2} title="SCHEDULE" delay={60}>
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
            </SectionCard>

            {/* Card 3 — Settings */}
            <SectionCard number={3} title="SETTINGS" delay={120}>
              <div className="flex flex-col gap-4">
                <Field label="Max Participants" hint="Leave blank for unlimited">
                  <input type="number" className="input" placeholder="e.g. 500" value={form.maxParticipant} onChange={(e) => set("maxParticipant", e.target.value)} min={1} style={{ width: 200 }} />
                </Field>
                <div className="flex gap-6">
                  <Toggle value={form.isPublic} onChange={(v) => set("isPublic", v)} label="Public contest" />
                  <Toggle value={form.isRated} onChange={(v) => set("isRated", v)} label="Rated contest" />
                </div>
              </div>
            </SectionCard>

            {/* Card 4 — Problems */}
            <SectionCard number={4} title={`PROBLEMS (${form.problems.length})`} delay={180}>
              <ProblemPicker selectedProblems={form.problems} onChange={(p) => set("problems", p)} />
            </SectionCard>

            {/* Bottom actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 32, paddingBottom: 16 }}>
              <button type="button" className="btn btn-ghost" onClick={() => navigate("/admin/contests")}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 160, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {saving ? (
                  <>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", animation: "spin 0.8s linear infinite" }} />
                    Saving...
                  </>
                ) : (
                  <><Save size={15} /> {isEdit ? "Save Changes" : "Create Contest"}</>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </>
  );
};

export default AdminContestFormPage;
