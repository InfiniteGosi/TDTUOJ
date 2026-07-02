import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Trophy,
  Star,
  Search,
  User,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import RankBadge from "../common/RankBadge";
import SuggestiveSearch from "../common/SuggestiveSearch";
import SortBar from "../common/SortBar";
import Pagination from "../common/Pagination";

// ─── Role badge colours ────────────────────────────────────────────────────────

const ROLE_COLORS = {
  ADMIN: { bg: "rgba(239,68,68,0.12)", color: "#ef4444", border: "rgba(239,68,68,0.3)" },
  CREATOR: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "rgba(245,158,11,0.3)" },
  PARTICIPANT: { bg: "var(--primary-subtle)", color: "var(--primary)", border: "var(--border-accent)" },
};

const RolePill = ({ name }) => {
  const style = ROLE_COLORS[name] ?? {
    bg: "var(--bg-overlay)",
    color: "var(--text-muted)",
    border: "var(--border-default)",
  };
  return (
    <span
      className="font-code text-xs uppercase tracking-wider"
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "var(--radius-pill)",
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        fontWeight: 700,
      }}
    >
      {name}
    </span>
  );
};

// ─── Avatar initials ──────────────────────────────────────────────────────────

const UserAvatar = ({ user }) => {
  if (user.profileUrl) {
    return (
      <img
        src={user.profileUrl}
        alt={user.username}
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          objectFit: "cover",
          border: "1px solid var(--border-default)",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      className="font-display"
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "var(--bg-overlay)",
        border: "1px solid var(--border-accent)",
        color: "var(--cyan)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "var(--text-sm)",
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {user.username.charAt(0).toUpperCase()}
    </div>
  );
};

// ─── UserPage ─────────────────────────────────────────────────────────────────

const UserPage = () => {
  const { showMessage } = useToast();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams] = useSearchParams();
  useEffect(() => { const q = searchParams.get("q"); if (q) setSearchQuery(q); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    totalElements: 0,
    totalPages: 0,
    currentPage: 0,
  });
  const [sortField, setSortField] = useState("id");
  const [direction, setDirection] = useState("asc");
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getAllUsers({
        limit: pagination.limit,
        offset: pagination.offset,
        sortField,
        direction,
        username: searchQuery,
      });

      if (response.statusCode === 200) {
        setUsers(response.data.content);
        setPagination((prev) => ({
          ...prev,
          totalElements: response.data.page.totalElements,
          totalPages: response.data.page.totalPages,
          currentPage: response.data.page.number,
        }));
      }
    } catch (error) {
      showMessage(error.response?.data?.message || error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.limit, pagination.offset, sortField, direction]);

  // Debounced search
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      setPagination((prev) => ({ ...prev, offset: 0 }));
      fetchUsers();
    }, 500);
    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const handleOnClick = (username) => navigate(`/users/${username}`);

  const handlePageChange = (newOffset) =>
    setPagination((prev) => ({ ...prev, offset: newOffset }));

  const handleLimitChange = (newLimit) =>
    setPagination((prev) => ({
      ...prev,
      limit: parseInt(newLimit),
      offset: 0,
    }));

  // ── Loading state (initial only) ─────────────────────────────────────────
  if (loading && users.length === 0) {
    return (
      <div className="page-container flex flex-col items-center justify-center" style={{ minHeight: "60vh" }}>
        <div className="spinner spinner-lg" />
        <p className="text-muted text-sm" style={{ marginTop: "16px" }}>Loading users…</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl" style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
          Leaderboard
        </h1>
        <span
          className="font-code text-xs uppercase tracking-wider text-muted"
          style={{
            background: "var(--bg-raised)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-pill)",
            padding: "4px 12px",
          }}
        >
          {pagination.totalElements}{" "}
          {pagination.totalElements === 1 ? "user" : "users"}
        </span>
      </div>

      {/* ── Search + Sort bar ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {/* Search */}
        <div style={{ flex: "1 1 220px", maxWidth: 320 }}>
          <SuggestiveSearch
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
            suggestions={[
              "Search by username...",
              "Find a competitor",
              "Look up a friend",
            ]}
            style={{ width: "100%" }}
          />
        </div>

        <SortBar
          field={sortField}
          direction={direction}
          onFieldChange={setSortField}
          onDirectionChange={setDirection}
          fields={[
            { value: "id",       label: "ID" },
            { value: "username", label: "Username" },
            { value: "point",    label: "Points" },
            { value: "rating",   label: "Rating" },
          ]}
        />
      </div>

      {/* ── Table card ─────────────────────────────────────────────────────── */}
      <div style={{ background: "var(--bg-raised)", borderRadius: "var(--radius-lg)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)", overflow: "hidden", position: "relative" }}>
        {/* Overlay spinner during re-fetch */}
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              borderRadius: "var(--radius-lg)",
            }}
          >
            <div className="spinner spinner-lg" />
          </div>
        )}

        <table className="table" style={{ margin: 0 }}>
          <thead>
            <tr className="public-table-header">
              <th style={{ textAlign: "center", width: "8%" }}>Rank</th>
              <th style={{ width: "38%" }}>User</th>
              <th style={{ width: "22%" }}>Roles</th>
              <th style={{ textAlign: "center", width: "14%" }}>Points</th>
              <th style={{ textAlign: "center", width: "14%" }}>Rating</th>
              <th style={{ textAlign: "center", width: "8%" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user, index) => {
                const rowBg = index % 2 === 0 ? "var(--bg-raised)" : "var(--bg-overlay)";
                return (
                <tr
                  key={user.id}
                  onClick={() => handleOnClick(user.username)}
                  style={{ background: rowBg, cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-subtle)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = rowBg; }}
                >
                  {/* Rank */}
                  <td style={{ textAlign: "center" }}>
                    <RankBadge rank={user.rank} />
                  </td>

                  {/* User info */}
                  <td>
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} />
                      <div>
                        <div
                          className="font-semibold text-sm"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {user.username}
                        </div>
                        {user.name && (
                          <div className="text-xs text-muted">{user.name}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Roles */}
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <RolePill key={role.id} name={role.name} />
                      ))}
                    </div>
                  </td>

                  {/* Points */}
                  <td style={{ textAlign: "center" }}>
                    <div className="flex items-center justify-center gap-1">
                      <Trophy size={14} style={{ color: "var(--cyan)" }} />
                      <span
                        className="font-display font-bold text-sm"
                        style={{ color: "var(--cyan)" }}
                      >
                        {user.point}
                      </span>
                    </div>
                  </td>

                  {/* Rating */}
                  <td style={{ textAlign: "center" }}>
                    <div className="flex items-center justify-center gap-1">
                      <Star size={14} style={{ color: "var(--amber-tle)" }} />
                      <span
                        className="font-display font-bold text-sm"
                        style={{ color: "var(--amber-tle)" }}
                      >
                        {user.rating}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ textAlign: "center" }}>
                    <span
                      className="badge text-xs"
                      style={{
                        background: user.isActive
                          ? "rgba(16,185,129,0.12)"
                          : "rgba(239,68,68,0.12)",
                        color: user.isActive ? "var(--green-ac)" : "var(--red-wa)",
                        border: `1px solid ${user.isActive ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                        borderRadius: "var(--radius-pill)",
                        padding: "2px 8px",
                        fontWeight: 700,
                      }}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ); })
            ) : (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <User size={40} style={{ color: "var(--text-muted)", marginBottom: "12px" }} />
                    <p className="text-secondary font-semibold">
                      {searchQuery ? "No users match your search" : "No users found"}
                    </p>
                    <p className="text-muted text-sm">
                      {searchQuery
                        ? "Try adjusting your search terms"
                        : "Be the first to register!"}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ── Pagination footer ─────────────────────────────────────────────── */}
        {pagination.totalPages > 0 && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={(p) => handlePageChange(p * pagination.limit)}
            totalElements={pagination.totalElements}
            limit={pagination.limit}
            onLimitChange={handleLimitChange}
            offset={pagination.offset}
          />
        )}
      </div>
    </div>
  );
};

export default UserPage;
