import { useState, useEffect, useCallback } from "react";
import { Plus, Clock, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";

const deadlineColor = (deadline) => {
  if (!deadline) return { text: "No deadline", color: "var(--text-muted)" };
  const diff = new Date(deadline) - new Date();
  if (diff < 0) return { text: "Past due", color: "var(--red-wa)" };
  const days = Math.ceil(diff / 86400000);
  if (days <= 1) return { text: "Due today", color: "var(--amber-tle)" };
  if (days <= 3) return { text: `${days}d left`, color: "var(--amber-tle)" };
  return {
    text: new Date(deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    color: "var(--green-ac)",
  };
};

const MiniProgress = ({ solved, total }) => {
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
      <div style={{
        flex: 1, height: 6, background: "var(--bg-overlay)",
        borderRadius: "var(--radius-pill)", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: pct === 100 ? "var(--green-ac)" : "var(--cyan)",
          borderRadius: "var(--radius-pill)",
          transition: "width 0.3s",
        }} />
      </div>
      <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", minWidth: 40, textAlign: "right", fontFamily: "var(--font-code)" }}>
        {solved}/{total}
      </span>
    </div>
  );
};

const LabListSection = ({ org, canManage, onNavigateToLab, onCreateLab }) => {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchLabs = useCallback(async (p = 0) => {
    try {
      setLoading(true);
      const resp = await ApiService.getOrgLabs(org.id, { page: p, size: 10 });
      if (resp.statusCode === 200) {
        setLabs(resp.data.content ?? []);
        setTotalPages(resp.data.totalPages ?? 1);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [org.id]);

  useEffect(() => { fetchLabs(page); }, [page, fetchLabs]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BookOpen size={16} color="var(--cyan)" />
          <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "var(--text-base)" }}>Labs</span>
        </div>
        {canManage && (
          <button className="btn btn-primary btn-sm" onClick={onCreateLab}
            style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Plus size={13} /> Create Lab
          </button>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "var(--space-10) 0" }}>
          <div className="spinner spinner-lg" style={{ margin: "0 auto" }} />
        </div>
      )}

      {!loading && labs.length === 0 && (
        <div className="empty-state">
          <BookOpen size={40} className="empty-state-icon" />
          <div style={{ fontWeight: 500, color: "var(--text-secondary)" }}>No labs yet</div>
          {canManage && (
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              Create a lab to assign exercises to your students.
            </div>
          )}
        </div>
      )}

      {!loading && labs.map((lab) => {
        const dl = deadlineColor(lab.deadline);
        return (
          <div key={lab.id} className="card" style={{ cursor: "pointer" }}
            onClick={() => onNavigateToLab(lab.slug)}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--border-accent)"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border-default)"}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-4)" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "var(--text-base)" }}>{lab.title}</div>
                {lab.description && (
                  <div style={{
                    fontSize: "var(--text-sm)", color: "var(--text-secondary)",
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>{lab.description}</div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    <BookOpen size={12} />
                    {lab.exerciseCount} exercise{lab.exerciseCount !== 1 ? "s" : ""}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "var(--text-xs)", color: dl.color, fontWeight: 600 }}>
                    <Clock size={11} /> {dl.text}
                  </div>
                  {lab.solutionsPublished && (
                    <span className="badge" style={{ color: "var(--cyan)", background: "var(--cyan-subtle)", border: "1px solid var(--border-accent)" }}>
                      Solutions published
                    </span>
                  )}
                </div>
              </div>
              {lab.solvedCount != null && (
                <MiniProgress solved={lab.solvedCount} total={lab.exerciseCount} />
              )}
            </div>
          </div>
        );
      })}

      {totalPages > 1 && (
        <div className="pagination">
          <button className={`pagination-btn ${page <= 0 ? "" : ""}`}
            onClick={() => page > 0 && setPage((p) => p - 1)} disabled={page <= 0}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontFamily: "var(--font-code)" }}>
            {page + 1} / {totalPages}
          </span>
          <button className="pagination-btn"
            onClick={() => page < totalPages - 1 && setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default LabListSection;
