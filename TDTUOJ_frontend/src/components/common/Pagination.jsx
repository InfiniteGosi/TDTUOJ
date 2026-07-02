import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

function buildPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);

  const set = new Set([0, total - 1, current]);
  for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) set.add(i);

  const sorted = [...set].sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("...");
    result.push(sorted[i]);
  }
  return result;
}

const BTN = { padding: "5px 7px", opacity: 1 };
const BTN_DIM = { padding: "5px 7px", opacity: 0.35, pointerEvents: "none" };

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalElements,
  limit,
  onLimitChange,
  offset,
}) {
  if (!totalPages || totalPages <= 0) return null;

  const canPrev = currentPage > 0;
  const canNext = currentPage < totalPages - 1;
  const pages   = buildPages(currentPage, totalPages);

  const showCount = totalElements != null && offset != null && limit != null;
  const from = showCount ? offset + 1 : null;
  const to   = showCount ? Math.min(offset + limit, totalElements) : null;

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 16px",
      background: "var(--bg-raised)",
      borderTop: "1px solid var(--border-subtle)",
      gap: 8,
      flexWrap: "wrap",
    }}>
      {/* Left: rows-per-page */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 100 }}>
        {onLimitChange ? (
          <>
            <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Rows:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(parseInt(e.target.value))}
              style={{
                padding: "3px 6px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-default)", fontSize: 12,
                background: "var(--bg-overlay)", color: "var(--text-primary)", cursor: "pointer",
              }}
            >
              {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </>
        ) : <span />}
      </div>

      {/* Center: numbered pages */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <button className="btn btn-ghost btn-sm" style={canPrev ? BTN : BTN_DIM}
          onClick={() => canPrev && onPageChange(0)}>
          <ChevronsLeft size={14} />
        </button>
        <button className="btn btn-ghost btn-sm" style={canPrev ? BTN : BTN_DIM}
          onClick={() => canPrev && onPageChange(currentPage - 1)}>
          <ChevronLeft size={14} />
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} style={{
              fontSize: 12, color: "var(--text-muted)",
              padding: "0 3px", userSelect: "none", lineHeight: "28px",
            }}>…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={{
                minWidth: 28, height: 28, padding: "0 6px",
                borderRadius: "var(--radius-md)",
                fontSize: 12, fontWeight: 600,
                border: p === currentPage
                  ? "1px solid var(--border-accent)"
                  : "1px solid transparent",
                background: p === currentPage
                  ? "var(--primary-subtle)"
                  : "transparent",
                color: p === currentPage
                  ? "var(--primary)"
                  : "var(--text-muted)",
                cursor: p === currentPage ? "default" : "pointer",
                transition: "all var(--transition-fast)",
              }}
              onMouseEnter={(e) => {
                if (p === currentPage) return;
                e.currentTarget.style.background = "var(--bg-hover)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                if (p === currentPage) return;
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              {p + 1}
            </button>
          )
        )}

        <button className="btn btn-ghost btn-sm" style={canNext ? BTN : BTN_DIM}
          onClick={() => canNext && onPageChange(currentPage + 1)}>
          <ChevronRight size={14} />
        </button>
        <button className="btn btn-ghost btn-sm" style={canNext ? BTN : BTN_DIM}
          onClick={() => canNext && onPageChange(totalPages - 1)}>
          <ChevronsRight size={14} />
        </button>
      </div>

      {/* Right: count */}
      <div style={{ minWidth: 100, textAlign: "right" }}>
        {showCount ? (
          <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            {from}–{to} of {totalElements}
          </span>
        ) : totalPages > 0 ? (
          <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            {currentPage + 1} / {totalPages}
          </span>
        ) : null}
      </div>
    </div>
  );
}
