import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trophy, Plus, Edit, Trash2,
  Eye, Lock, Globe, Calendar, Users, BarChart2,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import Pagination from "../common/Pagination";
import { useConfirmDialog } from "../common/ConfirmDialog";
import { useToast } from "../common/ToastMessage";
import SuggestiveSearch from "../common/SuggestiveSearch";

const fmt = (dt) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const statusOf = (contest) => {
  const now = Date.now();
  const start = new Date(contest.startTime).getTime();
  const end = new Date(contest.endTime).getTime();
  if (now < start) return "UPCOMING";
  if (now > end) return "ENDED";
  return "RUNNING";
};

const STATUS_STYLE = {
  UPCOMING: { label: "Upcoming", color: "var(--blue-ce)",    bg: "var(--blue-subtle)" },
  RUNNING:  { label: "Running",  color: "var(--green-ac)",   bg: "var(--green-subtle)" },
  ENDED:    { label: "Ended",    color: "var(--text-muted)", bg: "var(--bg-raised)" },
};

const StatusBadge = ({ contest }) => {
  const s = STATUS_STYLE[statusOf(contest)];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 9999, fontSize: "var(--text-xs)", fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.color}33` }}>
      {s.label}
    </span>
  );
};

const AdminContestPage = () => {
  const { ConfirmDialog, showConfirm } = useConfirmDialog();
  const { showMessage } = useToast();
  const navigate = useNavigate();

  const [contests, setContests] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const SIZE = 10;

  const isAdmin = ApiService.isAdmin();

  const fetchContests = async (p = page) => {
    try {
      setLoading(true);
      const resp = await ApiService.getPublicContests({ page: p, size: SIZE });
      if (resp.statusCode === 200) {
        const data = resp.data;
        const content = data.content ?? data;
        const pageInfo = data.page ?? {};
        setContests(content);
        setTotalPages(pageInfo.totalPages ?? 1);
        setTotalElements(pageInfo.totalElements ?? content.length);
      }
    } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchContests(page); }, [page]);

  const handleDelete = (id, name) =>
    showConfirm("Delete Contest", `Are you sure you want to delete "${name}"? This cannot be undone.`, async () => {
      try {
        const resp = await ApiService.deleteContest(id);
        if (resp.statusCode === 200) { showMessage("Contest deleted successfully", "success"); fetchContests(page); }
      } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); }
    });

  const filtered = contests.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  if (loading && contests.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0" }}>
        <div className="page-container">
          <div className="flex flex-col items-center gap-4" style={{ padding: "80px 0" }}>
            <div className="spinner" />
            <span className="text-muted">Loading contests...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0" }}>
      <div className="page-container">
        <div className="flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Trophy size={28} color="var(--primary)" />
                <h2 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Manage Contests</h2>
              </div>
              <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 9999, fontSize: "var(--text-sm)", fontWeight: 600, background: "var(--primary-subtle)", color: "var(--primary)" }}>
                {totalElements} {totalElements === 1 ? "contest" : "contests"}
              </span>
            </div>
            <button className="btn btn-primary" onClick={() => navigate("/admin/contests/new")}>
              <Plus size={18} /> New Contest
            </button>
          </div>

          <ConfirmDialog />

          {/* Search */}
          <SuggestiveSearch
            value={search}
            onChange={(val) => setSearch(val)}
            suggestions={["Filter by contest name...", "Search 'Round'", "Find 'Weekly'"]}
            style={{ width: "100%", maxWidth: 320 }}
          />

          {/* Table */}
          <div className="card" style={{ overflow: "hidden", position: "relative" }}>
            {loading && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                <div className="spinner" />
              </div>
            )}

            <table className="table admin-table">
              <thead>
                <tr>
                  <th style={{ width: "5%" }}>#</th>
                  <th style={{ width: "27%" }}>Contest</th>
                  <th style={{ width: "11%" }}>Status</th>
                  <th style={{ width: "17%" }}>Start</th>
                  <th style={{ width: "17%" }}>End</th>
                  <th style={{ textAlign: "center", width: "7%" }}>Problems</th>
                  <th style={{ textAlign: "center", width: "16%" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((contest) => (
                    <tr key={contest.id}>
                      <td><span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-muted)" }}>{contest.id}</span></td>
                      <td>
                        <div>
                          <div className="flex items-center gap-1">
                            {contest.isPublic ? <Globe size={12} color="var(--text-muted)" /> : <Lock size={12} color="var(--text-muted)" />}
                            <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-primary)" }}>{contest.name}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>by {contest.creatorUsername ?? "—"}</p>
                        </div>
                      </td>
                      <td><StatusBadge contest={contest} /></td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Calendar size={12} color="var(--text-muted)" />
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{fmt(contest.startTime)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Calendar size={12} color="var(--text-muted)" />
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{fmt(contest.endTime)}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div className="flex items-center justify-center gap-1">
                          <Users size={12} color="var(--text-muted)" />
                          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{contest.totalProblems ?? 0}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <button className="btn btn-ghost btn-sm" title="View" style={{ padding: "5px 7px" }} onClick={() => navigate(`/contests/${contest.slug}`)}>
                            <Eye size={16} color="var(--blue-ce)" />
                          </button>
                          <button className="btn btn-ghost btn-sm" title="Monitor" style={{ padding: "5px 7px" }} onClick={() => navigate(`/admin/contests/monitor/${contest.id}`)}>
                            <BarChart2 size={16} color="var(--primary)" />
                          </button>
                          <button className="btn btn-ghost btn-sm" title="Edit" style={{ padding: "5px 7px" }} onClick={() => navigate(`/admin/contests/edit/${contest.id}`)}>
                            <Edit size={16} color="var(--primary)" />
                          </button>
                          {isAdmin && (
                            <button className="btn btn-ghost btn-sm" title="Delete" style={{ padding: "5px 7px" }} onClick={() => handleDelete(contest.id, contest.name)}>
                              <Trash2 size={16} color="var(--red-wa)" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ padding: "56px 24px", textAlign: "center" }}>
                      <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--bg-overlay)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                        <Trophy size={22} color="var(--text-muted)" />
                      </div>
                      <div style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4 }}>No contests found</div>
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Click 'New Contest' to create one</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminContestPage;
