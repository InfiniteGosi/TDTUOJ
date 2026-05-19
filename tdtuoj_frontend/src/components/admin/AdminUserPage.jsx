import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Plus, Edit,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import Pagination from "../common/Pagination";
import SuggestiveSearch from "../common/SuggestiveSearch";
import SortBar from "../common/SortBar";
import { useConfirmDialog } from "../common/ConfirmDialog";
import { useToast } from "../common/ToastMessage";

const ROLE_BADGE = {
  ADMIN:       { bg: "var(--red-subtle)",     color: "var(--red-wa)" },
  CREATOR:     { bg: "var(--amber-subtle)",   color: "var(--amber-tle)" },
  PARTICIPANT: { bg: "var(--primary-subtle)", color: "var(--primary)" },
};

const AdminUserPage = () => {
  const { ConfirmDialog } = useConfirmDialog();
  const { showMessage } = useToast();
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ limit: 10, offset: 0, totalElements: 0, totalPages: 0, currentPage: 0 });
  const [sortField, setSortField] = useState("id");
  const [direction, setDirection] = useState("asc");
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getAllUsers({ limit: pagination.limit, offset: pagination.offset, sortField, direction, username: searchQuery });
      if (response.statusCode === 200) {
        setUsers(response.data.content);
        setPagination((prev) => ({ ...prev, totalElements: response.data.page.totalElements, totalPages: response.data.page.totalPages, currentPage: response.data.page.number }));
      }
    } catch (error) { showMessage(error.response?.data?.message || error.message, "error"); } finally { setLoading(false); }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const meResponse = await ApiService.getOwnProfile();
        if (meResponse.statusCode === 200) setCurrentUser(meResponse.data);
      } catch (error) { /* non-critical */ }
    };
    init();
  }, []);

  useEffect(() => { fetchUsers(); }, [pagination.limit, pagination.offset, sortField, direction]);
  useEffect(() => {
    const delaySearch = setTimeout(() => { setPagination((prev) => ({ ...prev, offset: 0 })); fetchUsers(); }, 500);
    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const handlePageChange = (newOffset) => setPagination((prev) => ({ ...prev, offset: newOffset }));
  const handleLimitChange = (newLimit) => setPagination((prev) => ({ ...prev, limit: parseInt(newLimit), offset: 0 }));

  if (loading && users.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0" }}>
        <div className="page-container">
          <div className="flex flex-col items-center gap-4" style={{ padding: "80px 0" }}>
            <div className="spinner" />
            <span className="text-muted">Loading users...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0" }}>
      <div className="page-container">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Manage Users</h2>
              <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 9999, fontSize: 13, fontWeight: 600, background: "var(--primary-subtle)", color: "var(--primary)" }}>
                {pagination.totalElements} {pagination.totalElements === 1 ? "user" : "users"}
              </span>
            </div>
            <button className="btn btn-primary" onClick={() => navigate("/admin/users/register")}>
              <Plus size={20} /> Add User
            </button>
          </div>

          <ConfirmDialog />

          {/* Search + Sort */}
          <div className="flex items-center gap-3 flex-wrap">
            <SuggestiveSearch
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              suggestions={["Search by username...", "Find a user", "Look up by name"]}
              style={{ width: 320 }}
            />
            <SortBar
              field={sortField}
              direction={direction}
              onFieldChange={setSortField}
              onDirectionChange={setDirection}
              fields={[
                { value: "id",       label: "ID" },
                { value: "username", label: "Username" },
                { value: "email",    label: "Email" },
              ]}
            />
          </div>

          {/* Table */}
          <div className="card" style={{ overflow: "hidden", position: "relative" }}>
            {loading && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                <div className="spinner" />
              </div>
            )}

            <table className="table">
              <thead>
                <tr>
                  <th style={{ textAlign: "center", width: "8%" }}>ID</th>
                  <th style={{ width: "35%" }}>User</th>
                  <th style={{ width: "25%" }}>Email</th>
                  <th style={{ width: "17%" }}>Roles</th>
                  <th style={{ textAlign: "center", width: "10%" }}>Status</th>
                  <th style={{ textAlign: "center", width: "10%" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user, index) => {
                    const isSelf = currentUser?.id === user.id;
                    return (
                      <tr key={user.id} style={{ background: index % 2 === 0 ? "var(--bg-base)" : "var(--bg-raised)" }}>
                        <td style={{ textAlign: "center" }}>
                          <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, fontSize: 13, fontWeight: 700, background: "var(--primary-subtle)", color: "var(--primary)" }}>#{user.id}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--primary-subtle)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, overflow: "hidden", flexShrink: 0 }}>
                              {user.profileUrl ? (
                                <img src={user.profileUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                (user.name || user.username).charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{user.username}</span>
                                {isSelf && (
                                  <span style={{ display: "inline-block", padding: "1px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "var(--amber-subtle)", color: "var(--amber-tle)" }}>
                                    It&apos;s you
                                  </span>
                                )}
                              </div>
                              {user.name && <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>{user.name}</p>}
                            </div>
                          </div>
                        </td>
                        <td><span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{user.email}</span></td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {user.roles?.map((role) => {
                              const s = ROLE_BADGE[role.name] || { bg: "var(--bg-raised)", color: "var(--text-secondary)" };
                              return (
                                <span key={role.id} style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
                                  {role.name}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: user.isActive ? "var(--green-subtle)" : "var(--red-subtle)", color: user.isActive ? "var(--green-ac)" : "var(--red-wa)" }}>
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {isSelf ? (
                            <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "var(--bg-raised)", color: "var(--text-muted)" }}>
                              It&apos;s you
                            </span>
                          ) : (
                            <button className="btn btn-ghost btn-sm" title="Edit User" style={{ padding: "5px 7px" }} onClick={() => navigate(`/admin/users/edit/${user.id}`)}>
                              <Edit size={16} color="var(--primary)" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "40px 0" }}>
                      <div className="flex flex-col items-center gap-3">
                        <Users size={48} color="var(--text-muted)" />
                        <p style={{ fontSize: 16, color: "var(--text-muted)", margin: 0, fontWeight: 500 }}>
                          {searchQuery ? "No users match your search" : "No users found"}
                        </p>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                          {searchQuery ? "Try adjusting your search terms" : "Click 'Add User' to create your first user!"}
                        </p>
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
