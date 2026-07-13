import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Trophy, ArrowLeft, Save, Plus, Trash2, Search, ChevronDown, AlertTriangle, Clock, CalendarClock, User,
} from "lucide-react";
import Toggle from "../common/Toggle";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import DateTimePicker from "../common/DateTimePicker";
import SuggestiveSearch from "../common/SuggestiveSearch";
import ProblemPickerModal from "../common/ProblemPickerModal";
import { FormPageShell, StickyFormBar, SectionCard, Field, ButtonSpinner } from "../common/FormSection";

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
    borderRight: side === "left"  ? "1px solid var(--border-subtle)" : "none",
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
                fontSize: "var(--text-xs)", fontWeight: 700, cursor: "pointer", transition: "all 0.1s",
              }}>
              {p}{unit}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Problem picker dropdown ───────────────────────────────────────────────────

const ProblemPicker = ({ selectedProblems, onChange }) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  // Contest-fairness: only private, never-submitted problems are eligible
  const fetchEligible = useCallback(async ({ search }) => {
    const r = await ApiService.getContestEligibleProblems({ size: 200, search });
    return r.statusCode === 200 ? r.data.content ?? [] : [];
  }, []);

  const addMany = (problems) => {
    let order = selectedProblems.length;
    onChange([
      ...selectedProblems,
      ...problems.map((p) => ({
        problemId: p.id, problemTitle: p.title,
        problemOrder: ++order, points: p.point ?? 100,
      })),
    ]);
  };

  const remove = (problemId) => onChange(selectedProblems.filter((p) => p.problemId !== problemId).map((p, i) => ({ ...p, problemOrder: i + 1 })));

  const updatePoints = (problemId, points) => onChange(selectedProblems.map((p) => p.problemId === problemId ? { ...p, points: parseInt(points) || 0 } : p));

  return (
    <div className="flex flex-col gap-3">
      {selectedProblems.length === 0 ? (
        <div style={{ border: "1.5px dashed var(--border-default)", borderRadius: 10, padding: "24px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
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
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary)", color: "var(--bg-void)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: "var(--text-sm)", fontWeight: 700, flexShrink: 0 }}>
                  {String.fromCharCode(64 + p.problemOrder)}
                </div>
                <span style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)" }}>{p.problemTitle}</span>
              </div>
              <div className="flex items-center gap-3">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>pts:</span>
                  <div style={{ width: 110 }}>
                    <NumericStepper
                      value={p.points}
                      onChange={(n) => updatePoints(p.problemId, n)}
                      min={0} max={9999} step={10}
                    />
                  </div>
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

      <div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10,
            border: "1.5px dashed var(--border-default)",
            background: "var(--bg-base)", color: "var(--text-secondary)", fontSize: "var(--text-sm)", fontWeight: 500, cursor: "pointer",
            transition: "color 150ms ease, border-color 150ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--primary)"; e.currentTarget.style.borderColor = "var(--primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "var(--border-default)"; }}
        >
          <Plus size={14} /> Add Problems
        </button>
      </div>

      <ProblemPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Add contest problems"
        hint="Only your private, never-submitted problems are listed. They are published automatically when the contest ends."
        fetchProblems={fetchEligible}
        excludeIds={selectedProblems.map((p) => p.problemId)}
        onAdd={addMany}
      />
    </div>
  );
};

// ─── Main form ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = { name: "", description: "", startTime: "", endTime: "", registrationStart: "", maxParticipant: "20", isPublic: true, isRated: true, contestStyle: "ICPC", freezeDuration: "", problems: [] };

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
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>Set times to see the schedule</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div style={{ background: "var(--bg-raised)", borderRadius: 10, padding: 16, border: "1px solid var(--border-subtle)" }}>
        <p style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em", margin: "0 0 12px" }}>SCHEDULE ORDER</p>
        <div className="flex flex-col">
          {events.map((ev, i) => (
            <div key={ev.key} className="flex items-center gap-3" style={{ position: "relative" }}>
              <div className="flex flex-col items-center" style={{ width: 16, flexShrink: 0 }}>
                {i > 0 && <div style={{ width: 2, height: 8, background: "var(--border-default)" }} />}
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: ev.color, border: "2px solid var(--bg-void)", flexShrink: 0, boxShadow: `0 0 8px ${ev.color}` }} />
                {i < events.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 8, background: "var(--border-default)" }} />}
              </div>
              <div style={{ flex: 1, background: ev.bg, borderRadius: 6, padding: "6px 12px", marginBottom: 4 }}>
                <p style={{ margin: 0, fontSize: "var(--text-xs)", fontWeight: 700, color: ev.color }}>{ev.label}</p>
                <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{fmtShort(new Date(ev.time).toISOString())}</p>
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
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 600 }}>Duration: {h > 0 ? `${h}h ` : ""}{m}m</span>
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
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: w.type === "error" ? "var(--red-wa)" : "var(--amber-tle)" }}>{w.msg}</span>
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
          setForm({ name: c.name ?? "", description: c.description ?? "", startTime: toPickerDate(c.startTime), endTime: toPickerDate(c.endTime), registrationStart: toPickerDate(c.registrationStart), maxParticipant: c.maxParticipant ?? "", isPublic: c.isPublic ?? true, isRated: c.isRated ?? false, contestStyle: c.contestStyle ?? "ICPC", freezeDuration: c.freezeDurationMinutes ? String(c.freezeDurationMinutes) : "", problems: (c.problems ?? []).map((p) => ({ problemId: p.problemId, problemTitle: p.problemTitle, problemOrder: p.problemOrder, points: p.points ?? 100 })) });
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
      isPublic: true, isRated: form.isRated, contestStyle: "ICPC",
      freezeDurationMinutes: form.freezeDuration === "" ? 0 : Math.max(0, parseInt(form.freezeDuration, 10) || 0),
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
      <FormPageShell>
        {/* Sticky top bar */}
        <StickyFormBar
          onBack={() => navigate("/admin/contests")}
          icon={Trophy}
          title={isEdit ? "Edit Contest" : "Create Contest"}
        >
          <span style={{
            padding: "3px 12px", borderRadius: 9999,
            background: "var(--primary-subtle)", color: "var(--primary)",
            fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "0.1em",
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
            {saving ? <><ButtonSpinner /> Saving...</> : <><Save size={14} /> Save</>}
          </button>
        </StickyFormBar>

        {/* Content */}
        <div style={{ maxWidth: 940, margin: "0 auto", padding: "24px 24px 64px" }}>

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
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Creator:</span>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--primary)" }}>{creatorInfo.username}</span>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>(ID: {creatorInfo.id})</span>
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
              <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>

                {/* Max Participants */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Max Participants</label>
                  <div style={{ width: 180 }}>
                    <NumericStepper
                      value={form.maxParticipant === "" ? "" : Number(form.maxParticipant)}
                      onChange={(n) => set("maxParticipant", n)}
                      min={1} max={10000} step={1}
                    />
                  </div>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Leave blank for unlimited</span>
                </div>

                {/* Scoreboard Freeze */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Scoreboard Freeze</label>
                  <div style={{ width: 180 }}>
                    <NumericStepper
                      value={form.freezeDuration === "" ? 0 : Number(form.freezeDuration)}
                      onChange={(n) => set("freezeDuration", n)}
                      min={0} max={300} step={5}
                      unit="m"
                    />
                  </div>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Minutes before end. 0 = no freeze.</span>
                </div>

                {/* Rated toggle — pushed to end */}
                <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", justifyContent: "center", gap: 6, paddingTop: 22 }}>
                  <Toggle value={form.isRated} onChange={(v) => set("isRated", v)} label="Rated contest" />
                </div>

              </div>
            </SectionCard>


            {/* Card 4 — Problems */}
            <SectionCard number={4} title={`PROBLEMS (${form.problems.length})`} delay={180}>
              <p style={{ margin: "0 0 12px 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                Only your private, never-submitted problems can be added. They are published to the public archive automatically when the contest ends.
              </p>
              <ProblemPicker selectedProblems={form.problems} onChange={(p) => set("problems", p)} />
            </SectionCard>

            {/* Bottom actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 32, paddingBottom: 16 }}>
              <button type="button" className="btn btn-ghost" onClick={() => navigate("/admin/contests")}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 160, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {saving ? (
                  <><ButtonSpinner size={16} /> Saving...</>
                ) : (
                  <><Save size={15} /> {isEdit ? "Save Changes" : "Create Contest"}</>
                )}
              </button>
            </div>

          </form>
        </div>
      </FormPageShell>
    </>
  );
};

export default AdminContestFormPage;
