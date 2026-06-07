import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Search, Plus, CheckSquare, Square, AlertCircle } from "lucide-react";

const DIFF_STYLE = {
  EASY:   { color: "var(--green-ac)",  bg: "var(--green-subtle)",  label: "Easy" },
  MEDIUM: { color: "var(--amber-tle)", bg: "var(--amber-subtle)",  label: "Medium" },
  HARD:   { color: "var(--red-wa)",    bg: "var(--red-subtle)",    label: "Hard" },
};

const DiffBadge = ({ diff }) => {
  const s = DIFF_STYLE[diff];
  if (!s) return <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>—</span>;
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 9999,
      fontSize: "var(--text-xs)", fontWeight: 600, background: s.bg, color: s.color,
      flexShrink: 0,
    }}>
      {s.label}
    </span>
  );
};

/**
 * Bulk problem picker modal — shared by contest and lab forms.
 *
 * Props:
 *  - isOpen, onClose
 *  - title:   modal header text
 *  - hint:    eligibility explanation shown under the header
 *  - fetchProblems({ search }) => Promise<problem[]>  (already filtered to eligible)
 *  - excludeIds: array of problem ids already attached (hidden from the list)
 *  - onAdd(problems[]): called with the selected problems
 */
const ProblemPickerModal = ({ isOpen, onClose, title, hint, fetchProblems, excludeIds = [], onAdd }) => {
  const [search, setSearch] = useState("");
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(() => new Set());

  // Reset state each time the modal opens
  useEffect(() => {
    if (isOpen) { setSearch(""); setSelected(new Set()); }
  }, [isOpen]);

  // Debounced fetch on open + search change
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const list = await fetchProblems({ search: search.trim() });
        if (!cancelled) setProblems(list || []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setProblems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [isOpen, search, fetchProblems]);

  // Escape closes
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);
  const available = problems.filter((p) => !excluded.has(p.id));
  const allVisibleSelected = available.length > 0 && available.every((p) => selected.has(p.id));

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleAll = () => setSelected((prev) => {
    if (allVisibleSelected) {
      const next = new Set(prev);
      available.forEach((p) => next.delete(p.id));
      return next;
    }
    const next = new Set(prev);
    available.forEach((p) => next.add(p.id));
    return next;
  });

  const handleAdd = () => {
    const picked = problems.filter((p) => selected.has(p.id));
    if (picked.length) onAdd(picked);
    onClose();
  };

  if (!isOpen) return null;

  // Portal to <body> — escapes ancestor stacking contexts / transforms
  // (form section cards animate with transform, which would trap a fixed
  // overlay and let later cards paint over it).
  return createPortal(
    <div role="dialog" aria-modal="true" style={{
      position: "fixed", inset: 0, zIndex: 10000,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "var(--space-4)",
    }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(2px)",
      }} />

      {/* Panel */}
      <div style={{
        position: "relative", display: "flex", flexDirection: "column",
        background: "var(--bg-overlay)", border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)",
        width: "100%", maxWidth: 560, maxHeight: "80vh",
      }}>
        {/* Header */}
        <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-primary)" }}>
              {title}
            </h2>
            <button onClick={onClose} aria-label="Close" style={{
              width: 24, height: 24, borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-default)", background: "transparent",
              color: "var(--text-muted)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
            }}>
              ✕
            </button>
          </div>
          {hint && (
            <p style={{ margin: "6px 0 0 0", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{hint}</p>
          )}
        </div>

        {/* Search */}
        <div style={{ padding: "var(--space-3) var(--space-5)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              autoFocus
              type="text"
              className="input"
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", paddingLeft: 34 }}
            />
          </div>
        </div>

        {/* Select all */}
        {available.length > 0 && (
          <div
            onClick={toggleAll}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px var(--space-5)", borderBottom: "1px solid var(--border-subtle)",
              cursor: "pointer", userSelect: "none",
              fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)",
            }}
          >
            {allVisibleSelected ? <CheckSquare size={15} color="var(--primary)" /> : <Square size={15} />}
            Select all ({available.length})
          </div>
        )}

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 120 }}>
          {loading ? (
            <div style={{ padding: "32px 0", textAlign: "center" }}>
              <div className="spinner" style={{ width: 20, height: 20, margin: "0 auto" }} />
            </div>
          ) : available.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "24px var(--space-5)" }}>
              <AlertCircle size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                No eligible problems{search ? " match your search" : ""}.
              </span>
            </div>
          ) : (
            available.map((p) => {
              const isSel = selected.has(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px var(--space-5)",
                    cursor: "pointer", userSelect: "none",
                    background: isSel ? "var(--primary-subtle)" : "transparent",
                    borderBottom: "1px solid var(--border-subtle)",
                    transition: "background 120ms",
                  }}
                  onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isSel ? "var(--primary-subtle)" : "transparent"; }}
                >
                  {isSel
                    ? <CheckSquare size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    : <Square size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
                  <span style={{
                    flex: 1, minWidth: 0, fontSize: "var(--text-sm)", fontWeight: 600,
                    color: "var(--text-primary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {p.title}
                  </span>
                  <DiffBadge diff={p.problemDifficulty} />
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", flexShrink: 0, width: 48, textAlign: "right" }}>
                    {p.point ?? 0} pts
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "var(--space-4) var(--space-5)", borderTop: "1px solid var(--border-subtle)",
        }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            {selected.size} selected
          </span>
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary btn-sm"
              disabled={selected.size === 0}
              onClick={handleAdd}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={14} /> Add {selected.size > 0 ? `${selected.size} problem${selected.size > 1 ? "s" : ""}` : "problems"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProblemPickerModal;
