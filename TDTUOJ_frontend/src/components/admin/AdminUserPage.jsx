import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, Edit } from "lucide-react";
import ApiService from "../../services/ApiService";
import Pagination from "../common/Pagination";
import SuggestiveSearch from "../common/SuggestiveSearch";
import SortBar from "../common/SortBar";
import { useConfirmDialog } from "../common/ConfirmDialog";
import { useToast } from "../common/ToastMessage";

const ROLE_BADGE = {
  ADMIN: { bg: "var(--red-subtle)", color: "var(--red-wa)" },
  CREATOR: { bg: "var(--amber-subtle)", color: "var(--amber-tle)" },
  PARTICIPANT: { bg: "var(--primary-subtle)", color: "var(--primary)" },
};

const AdminUserPage = () => {
  const { ConfirmDialog } = useConfirmDialog();
  const { showMessage } = useToast();
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    limit: 10,
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
    const init = async () => {
      try {
        const meResponse = await ApiService.getOwnProfile();
        if (meResponse.statusCode === 200) setCurrentUser(meResponse.data);
      } catch (error) {
        /* non-critical */
      }
    };
    init();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [pagination.limit, pagination.offset, sortField, direction]);
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      setPagination((prev) => ({ ...prev, offset: 0 }));
      fetchUsers();
    }, 500);
    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const handlePageChange = (newOffset) =>
    setPagination((prev) => ({ ...prev, offset: newOffset }));
  const handleLimitChange = (newLimit) =>
    setPagination((prev) => ({
      ...prev,
      limit: parseInt(newLimit),
      offset: 0,
    }));

  if (loading && users.length === 0) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-base)",
          padding: "32px 0",
        }}
      >
        <div className="page-container">
          <div
            className="flex flex-col items-center gap-4"
            style={{ padding: "80px 0" }}
          >
            <div className="spinner" />
            <span className="text-muted">Loading users...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        padding: "32px 0",
      }}
    >
      <div className="page-container">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                Manage Users
              </h2>
              <span
                style={{
                  display: "inline-block",
                  padding: "3px 12px",
                  borderRadius: 9999,
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  background: "var(--primary-subtle)",
                  color: "var(--primary)",
                }}
              >
                {pagination.totalElements}{" "}
                {pagination.totalElements === 1 ? "user" : "users"}
              </span>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/admin/users/register")}
            >
              <Plus size={20} /> Add User
            </button>
          </div>

          <ConfirmDialog />

          {/* Search + Sort */}
          <div className="flex items-center gap-3 flex-wrap">
            <SuggestiveSearch
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              suggestions={[
                "Search by username...",
                "Find a user",
                "Look up by name",
              ]}
              style={{ width: 320 }}
            />
            <SortBar
              field={sortField}
              direction={direction}
              onFieldChange={setSortField}
              onDirectionChange={setDirection}
              fields={[
                { value: "id", label: "ID" },
                { value: "username", label: "Username" },
                { value: "email", label: "Email" },
                { value: "point", label: "Points" },
                { value: "rating", label: "Rating" },
              ]}
            />
          </div>

          {/* Table */}
          <div
            className="card"
            style={{ overflow: "hidden", position: "relative" }}
          >
            {loading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10,
                }}
              >
                <div className="spinner" />
              </div>
            )}

            <table className="table admin-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "center", width: "6%" }}>#</th>
                  <th style={{ width: "26%" }}>User</th>
                  <th style={{ width: "20%" }}>Email</th>
                  <th style={{ width: "13%" }}>Roles</th>
                  <th style={{ textAlign: "center", width: "9%" }}>Points</th>
                  <th style={{ textAlign: "center", width: "9%" }}>Rating</th>
                  <th style={{ textAlign: "center", width: "9%" }}>Status</th>
                  <th style={{ textAlign: "center", width: "8%" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user) => {
                    const isSelf = currentUser?.id === user.id;
                    return (
                      <tr key={user.id}>
                        <td style={{ textAlign: "center" }}>
                          <span
                            style={{
                              fontSize: "var(--text-sm)",
                              fontWeight: 600,
                              color: "var(--text-muted)",
                            }}
                          >
                            {user.id}
                          </span>
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                background: "var(--primary-subtle)",
                                color: "var(--primary)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "var(--text-base)",
                                fontWeight: 800,
                                overflow: "hidden",
                                flexShrink: 0,
                              }}
                            >
                              {user.profileUrl ? (
                                <img
                                  src={user.profileUrl}
                                  alt=""
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                (user.name || user.username)
                                  .charAt(0)
                                  .toUpperCase()
                              )}
                            </div>
                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "var(--text-sm)",
                                    fontWeight: 600,
                                    color: "var(--text-primary)",
                                  }}
                                >
                                  {user.username}
                                </span>
                                {isSelf && (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      padding: "1px 7px",
                                      borderRadius: "var(--radius-pill)",
                                      fontSize: "var(--text-xs)",
                                      fontWeight: 700,
                                      background: "var(--amber-subtle)",
                                      color: "var(--amber-tle)",
                                    }}
                                  >
                                    It's you
                                  </span>
                                )}
                              </div>
                              {user.name && (
                                <div
                                  style={{
                                    fontSize: "var(--text-xs)",
                                    color: "var(--text-muted)",
                                    marginTop: 1,
                                  }}
                                >
                                  {user.name}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: "var(--text-xs)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {user.email}
                          </span>
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 4,
                            }}
                          >
                            {user.roles?.map((role) => {
                              const s = ROLE_BADGE[role.name] || {
                                bg: "var(--bg-raised)",
                                color: "var(--text-secondary)",
                              };
                              return (
                                <span
                                  key={role.id}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    padding: "2px 8px",
                                    borderRadius: 9999,
                                    fontSize: "var(--text-xs)",
                                    fontWeight: 700,
                                    background: s.bg,
                                    color: s.color,
                                    border: `1px solid ${s.color}33`,
                                  }}
                                >
                                  {role.name}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            style={{
                              fontSize: "var(--text-sm)",
                              fontWeight: 700,
                              color: "var(--amber-tle)",
                            }}
                          >
                            {user.point ?? 0}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            style={{
                              fontSize: "var(--text-sm)",
                              fontWeight: 700,
                              color: "var(--amber-tle)",
                            }}
                          >
                            {user.rating ?? 0}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "2px 8px",
                              borderRadius: 9999,
                              fontSize: "var(--text-xs)",
                              fontWeight: 700,
                              background: user.isActive
                                ? "var(--green-subtle)"
                                : "var(--red-subtle)",
                              color: user.isActive
                                ? "var(--green-ac)"
                                : "var(--red-wa)",
                              border: `1px solid ${user.isActive ? "var(--green-ac)" : "var(--red-wa)"}33`,
                            }}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {isSelf ? (
                            <span
                              style={{
                                display: "inline-flex",
                                padding: "2px 9px",
                                borderRadius: "var(--radius-pill)",
                                fontSize: "var(--text-xs)",
                                fontWeight: 600,
                                background: "var(--bg-overlay)",
                                color: "var(--text-muted)",
                              }}
                            >
                              It's you
                            </span>
                          ) : (
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Edit User"
                              style={{ padding: "5px 8px", gap: 4 }}
                              onClick={() =>
                                navigate(`/admin/users/edit/${user.id}`)
                              }
                            >
                              <Edit size={14} color="var(--primary)" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      style={{ padding: "56px 24px", textAlign: "center" }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          background: "var(--bg-overlay)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto 14px",
                        }}
                      >
                        <Users size={22} color="var(--text-muted)" />
                      </div>
                      <div
                        style={{
                          fontSize: "var(--text-base)",
                          fontWeight: 700,
                          color: "var(--text-secondary)",
                          marginBottom: 4,
                        }}
                      >
                        {searchQuery
                          ? "No users match your search"
                          : "No users found"}
                      </div>
                      <div
                        style={{
                          fontSize: "var(--text-sm)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {searchQuery
                          ? "Try different search terms"
                          : "Click 'Add User' to get started"}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

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
      </div>
    </div>
  );
};

export default AdminUserPage;
