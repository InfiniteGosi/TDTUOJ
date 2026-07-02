import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Trash2, Edit, EyeOff, Globe, BookOpen, Trophy, FlaskConical,
} from "lucide-react";
import SuggestiveSearch from "../common/SuggestiveSearch";
import Pagination from "../common/Pagination";
import { useConfirmDialog } from "../common/ConfirmDialog";
import { useToast } from "../common/ToastMessage";
import ApiService from "../../services/ApiService";

const DIFF_STYLE = {
  EASY:   { hex: "var(--diff-easy)",   bg: "var(--green-subtle)",  label: "Easy" },
  MEDIUM: { hex: "var(--diff-medium)", bg: "var(--amber-subtle)",  label: "Medium" },
  HARD:   { hex: "var(--diff-hard)",   bg: "var(--red-subtle)",    label: "Hard" },
};

const MyProblemsPage = () => {
  const navigate = useNavigate();
  const { showMessage } = useToast();
  const { ConfirmDialog, showConfirm } = useConfirmDialog();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const resp = await ApiService.getMyProblems({ page, size, search });
      if (resp.statusCode === 200) {
        const d = resp.data;
        const pi = d.page ?? d; // Spring serializes page info under `page`
        setProblems(d.content || []);
        setTotalPages(pi.totalPages || 0);
        setTotalElements(pi.totalElements ?? (d.content || []).length);
      }
    } catch (e) {
      showMessage(e.response?.data?.message || e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProblems(); }, [page, search, size]);

  const handleTogglePublic = async (problem) => {
    try {
      const formData = new FormData();
      formData.append("id", problem.id);
      formData.append("isPublic", !problem.isPublic);
      await ApiService.updateProblem(formData);
      showMessage(problem.isPublic ? "Problem is now private" : "Problem is now public", "success");
      fetchProblems();
    } catch (e) {
      showMessage(e.response?.data?.message || e.message, "error");
    }
  };

  const handleDelete = (id, title) => {
    showConfirm("Delete Problem", `Delete "${title}" permanently? This cannot be undone.`, async () => {
      try {
        await ApiService.deleteProblem(id);
        showMessage("Problem deleted", "success");
        fetchProblems();
      } catch (e) {
        showMessage(e.response?.data?.message || e.message, "error");
      }
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0" }}>
      <div className="page-container">
        <div className="flex flex-col gap-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                My Problems
              </h2>
              {totalElements > 0 && (
                <span style={{
                  display: "inline-block", padding: "3px 12px", borderRadius: 9999,
                  fontSize: "var(--text-sm)", fontWeight: 600,
                  background: "var(--primary-subtle)", color: "var(--primary)",
                }}>
                  {totalElements} {totalElements === 1 ? "problem" : "problems"}
                </span>
              )}
            </div>
            <button className="btn btn-primary" onClick={() => navigate("/admin/my-problems/new")}>
              <Plus size={18} /> New Problem
            </button>
          </div>

          <ConfirmDialog />

          {/* Search */}
          <SuggestiveSearch
            value={search}
            onChange={(val) => { setSearch(val); setPage(0); }}
            suggestions={["Search your problems...", "Find by title"]}
            style={{ width: "100%", maxWidth: 320 }}
          />

          {/* Table */}
          <div className="card" style={{ overflow: "hidden", position: "relative" }}>
            {loading && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10,
              }}>
                <div className="spinner" />
              </div>
            )}

            <table className="table">
              <thead>
                <tr style={{ background: "var(--primary-subtle)" }}>
                  <th style={{ width: "7%", textAlign: "center", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>#</th>
                  <th style={{ width: "35%", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Problem</th>
                  <th style={{ width: "12%", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Difficulty</th>
                  <th style={{ width: "10%", textAlign: "center", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Points</th>
                  <th style={{ width: "10%", textAlign: "center", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Visibility</th>
                  <th style={{ width: "12%", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Time Limit</th>
                  <th style={{ width: "14%", textAlign: "center", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && problems.length > 0 ? (
                  problems.map((p, idx) => {
                    const dc = DIFF_STYLE[p.problemDifficulty];
                    return (
                      <tr key={p.id} style={{ background: idx % 2 === 0 ? "var(--bg-base)" : "var(--bg-raised)" }}>
                        <td style={{ textAlign: "center" }}>
                          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-muted)" }}>{p.id}</span>
                        </td>
                        <td>
                          <div>
                            <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>{p.title}</span>
                            {p.solutionCode && (
                              <span style={{
                                display: "inline-block", marginLeft: 6,
                                padding: "1px 7px", borderRadius: 6, fontSize: "var(--text-xs)", fontWeight: 600,
                                background: "var(--blue-subtle)", color: "var(--blue-ce)",
                              }}>
                                Solution
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {dc ? (
                            <span style={{
                              display: "inline-block", padding: "2px 8px", borderRadius: 9999,
                              fontSize: "var(--text-xs)", fontWeight: 600, background: dc.bg, color: dc.hex,
                            }}>
                              {dc.label}
                            </span>
                          ) : (
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--primary)" }}>{p.point}</span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              padding: "2px 8px", borderRadius: 9999, fontSize: "var(--text-xs)", fontWeight: 600,
                              background: p.isPublic ? "var(--green-subtle)" : "var(--amber-subtle)",
                              color: p.isPublic ? "var(--green-ac)" : "var(--amber-tle)",
                            }}>
                              {p.isPublic ? <Globe size={10} /> : <EyeOff size={10} />}
                              {p.isPublic ? "Public" : "Private"}
                            </span>
                            {p.usedInContest && (
                              <span title="Attached to a contest — publishes automatically when it ends" style={{
                                display: "inline-flex", alignItems: "center", gap: 3,
                                padding: "2px 8px", borderRadius: 9999, fontSize: "var(--text-xs)", fontWeight: 700,
                                background: "var(--cyan-subtle)", color: "var(--cyan)",
                              }}>
                                <Trophy size={9} /> CONTEST
                              </span>
                            )}
                            {p.usedInLab && (
                              <span title="Used as a lab exercise — stays private, not eligible for contests" style={{
                                display: "inline-flex", alignItems: "center", gap: 3,
                                padding: "2px 8px", borderRadius: 9999, fontSize: "var(--text-xs)", fontWeight: 700,
                                background: "var(--blue-subtle)", color: "var(--blue-ce)",
                              }}>
                                <FlaskConical size={9} /> LAB
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{p.timeLimit}ms</span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              className="btn btn-ghost btn-sm"
                              title={p.isPublic ? "Make Private" : "Make Public"}
                              onClick={() => handleTogglePublic(p)}
                            >
                              {p.isPublic
                                ? <EyeOff size={15} color="var(--text-secondary)" />
                                : <Globe size={15} color="var(--text-secondary)" />}
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Edit Problem"
                              onClick={() => navigate(`/admin/my-problems/${p.id}/edit`)}
                            >
                              <Edit size={15} color="var(--primary)" />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Delete Problem"
                              onClick={() => handleDelete(p.id, p.title)}
                            >
                              <Trash2 size={15} color="var(--red-wa)" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : !loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "48px 0" }}>
                      <div className="flex flex-col items-center gap-3">
                        <BookOpen size={44} color="var(--text-muted)" />
                        <p style={{ fontSize: "var(--text-base)", color: "var(--text-muted)", margin: 0, fontWeight: 500 }}>
                          {search ? "No problems match your search" : "No problems yet"}
                        </p>
                        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: 0 }}>
                          {search ? "Try adjusting your search" : "Click 'New Problem' to create your first one"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>

            {totalPages > 0 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalElements={totalElements}
                offset={page * size}
                limit={size}
                onLimitChange={(l) => { setPage(0); setSize(l); }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProblemsPage;
