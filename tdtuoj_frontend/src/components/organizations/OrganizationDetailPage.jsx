import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  Globe,
  Lock,
  Calendar,
  Copy,
  Check,
  Shield,
  ShieldCheck,
  Crown,
  LogOut,
  UserMinus,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Settings,
  X,
  Save,
  KeyRound,
  LogIn,
  UserPlus,
  Search,
} from "lucide-react";
import SuggestiveSearch from "../common/SuggestiveSearch";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import { useConfirmDialog } from "../common/ConfirmDialog";
import LabListSection from "./LabListSection";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (dt) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const ROLE_STYLE = {
  OWNER: { label: "Owner", color: "#d97706", bg: "#fffbeb", icon: Crown },
  ADMIN: { label: "Admin", color: "#3b82f6", bg: "#eff6ff", icon: ShieldCheck },
  MEMBER: { label: "Member", color: "#16a34a", bg: "#f0fdf4", icon: Shield },
};

const RoleBadge = ({ role }) => {
  const s = ROLE_STYLE[role] || ROLE_STYLE.MEMBER;
  const Icon = s.icon;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.color}33`,
      }}
    >
      <Icon size={12} />
      {s.label}
    </span>
  );
};

// ─── Modal base ───────────────────────────────────────────────────────────────

const ModalOverlay = ({ onClose, children }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div
      style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    />
    <div
      className="card"
      style={{
        position: "relative",
        padding: 24,
        width: 480,
        maxWidth: "90vw",
        zIndex: 1,
        boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
      }}
    >
      {children}
    </div>
  </div>
);

// ─── Join Code Modal ──────────────────────────────────────────────────────────

const JoinCodeModal = ({ isOpen, onClose, onJoin, orgName }) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  if (!isOpen) return null;

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    await onJoin(code.trim());
    setLoading(false);
    setCode("");
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <KeyRound size={20} color="var(--primary)" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Enter Code</h3>
        </div>
        <button style={{ background: "none", border: "none", cursor: "pointer" }} onClick={onClose}>
          <X size={18} color="#9ca3af" />
        </button>
      </div>

      <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
        <strong style={{ color: "var(--text-primary)" }}>{orgName}</strong> is a private organization. Enter the invite code to join.
      </p>

      <input
        className="input w-full"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="e.g. ABC123"
        maxLength={10}
        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        style={{ textAlign: "center", fontWeight: 700, letterSpacing: "0.15em", fontSize: 20, marginBottom: 16 }}
      />

      <div className="flex gap-2">
        <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary flex-1"
          onClick={handleJoin}
          disabled={!code.trim() || loading}
        >
          {loading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : "Join"}
        </button>
      </div>
    </ModalOverlay>
  );
};

// ─── Edit Modal ───────────────────────────────────────────────────────────────

const EditModal = ({ isOpen, onClose, org, onSave }) => {
  const [name, setName] = useState(org?.name || "");
  const [about, setAbout] = useState(org?.about || "");
  const [code, setCode] = useState(org?.code || "");
  const [isPublic, setIsPublic] = useState(org?.isPublic ?? true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (org) {
      setName(org.name || "");
      setAbout(org.about || "");
      setCode(org.code || "");
      setIsPublic(org.isPublic ?? true);
    }
  }, [org]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const data = { name: name.trim(), about: about.trim(), isPublic };
    if (code.trim()) data.code = code.trim();
    await onSave(data);
    setLoading(false);
  };

  const visBtn = (active, label, Icon, val) => (
    <button
      style={{
        flex: 1, padding: "8px", borderRadius: 8, border: `2px solid ${active ? "var(--primary)" : "var(--border-default)"}`,
        background: active ? "var(--bg-raised)" : "white", color: active ? "var(--primary)" : "#6b7280",
        fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
      }}
      onClick={() => setIsPublic(val)}
    >
      <Icon size={14} /> {label}
    </button>
  );

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings size={20} color="var(--primary)" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Edit Organization</h3>
        </div>
        <button style={{ background: "none", border: "none", cursor: "pointer" }} onClick={onClose}>
          <X size={18} color="#9ca3af" />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Organization name" />
        </div>
        <div className="form-group">
          <label className="form-label">About</label>
          <input className="input w-full" value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Short description" />
        </div>
        <div className="form-group">
          <label className="form-label">Join Code</label>
          <input className="input w-full" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Current code" maxLength={10} style={{ fontFamily: "monospace", letterSpacing: "0.1em" }} />
        </div>
        <div className="form-group">
          <label className="form-label">Visibility</label>
          <div className="flex gap-2">
            {visBtn(isPublic, "Public", Globe, true)}
            {visBtn(!isPublic, "Private", Lock, false)}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary flex-1" onClick={handleSave} disabled={!name.trim() || loading}>
          {loading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <><Save size={14} /> Save</>}
        </button>
      </div>
    </ModalOverlay>
  );
};

// ─── Add Member Modal ─────────────────────────────────────────────────────────

const AddMemberModal = ({ isOpen, onClose, orgId, onAdd }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    if (!isOpen) { setQuery(""); setResults([]); return; }
    if (query.trim().length < 1) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const resp = await ApiService.searchNonMembers(orgId, query.trim());
        if (resp.statusCode === 200) {
          const data = resp.data;
          setResults(data.content ?? data);
        }
      } catch { setResults([]); } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, isOpen, orgId]);

  if (!isOpen) return null;

  const handleAdd = async (userId) => {
    setAddingId(userId);
    await onAdd(userId);
    setResults((prev) => prev.filter((u) => u.userId !== userId));
    setAddingId(null);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UserPlus size={20} color="var(--primary)" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Add Member</h3>
        </div>
        <button style={{ background: "none", border: "none", cursor: "pointer" }} onClick={onClose}>
          <X size={18} color="#9ca3af" />
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <SuggestiveSearch
          value={query}
          onChange={(val) => setQuery(val)}
          suggestions={["Search by username...", "Find a member"]}
          style={{ width: "100%", maxWidth: 280 }}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 200 }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
            <div className="spinner" />
          </div>
        ) : results.length > 0 ? (
          <div className="flex flex-col gap-1">
            {results.map((user) => (
              <div
                key={user.userId}
                className="flex items-center justify-between"
                style={{ padding: "8px 12px", borderRadius: 8, background: "var(--bg-raised)" }}
              >
                <div className="flex items-center gap-2">
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: "50%", background: "var(--bg-overlay)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, color: "var(--primary)", overflow: "hidden", flexShrink: 0,
                    }}
                  >
                    {user.profileUrl ? (
                      <img src={user.profileUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      (user.username || "U").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{user.name || user.username}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>@{user.username}</p>
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleAdd(user.userId)}
                  disabled={addingId === user.userId}
                >
                  {addingId === user.userId ? <div className="spinner" style={{ width: 14, height: 14 }} /> : "Add"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: "center" }}>
            <span className="text-sm text-muted">
              {query.trim().length > 0 ? "No users found" : "Type a username to search"}
            </span>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const OrganizationDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { showMessage } = useToast();
  const { ConfirmDialog, showConfirm } = useConfirmDialog();

  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [memberPage, setMemberPage] = useState(0);
  const [memberTotalPages, setMemberTotalPages] = useState(0);
  const [codeCopied, setCodeCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [joinCodeOpen, setJoinCodeOpen] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("MEMBERS");
  const [memberSearch, setMemberSearch] = useState("");
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const isAuthenticated = ApiService.isAuthenticated();

  const fetchOrg = async () => {
    try {
      setLoading(true);
      const resp = await ApiService.getOrganizationBySlug(slug);
      if (resp.statusCode === 200) setOrg(resp.data);
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
      navigate("/organizations");
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (p = memberPage) => {
    if (!org) return;
    try {
      setMembersLoading(true);
      const resp = await ApiService.getOrganizationMembers(org.id, { page: p, size: 20, search: memberSearch });
      if (resp.statusCode === 200) {
        const data = resp.data;
        setMembers(data.content ?? data);
        const pageInfo = data.page ?? {};
        setMemberTotalPages(pageInfo.totalPages ?? 1);
      }
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => { fetchOrg(); }, [slug]);
  useEffect(() => { if (org) fetchMembers(memberPage); }, [org, memberPage]);
  useEffect(() => {
    if (org) {
      const timer = setTimeout(() => { setMemberPage(0); fetchMembers(0); }, 300);
      return () => clearTimeout(timer);
    }
  }, [memberSearch]);

  const handleCopyCode = () => {
    if (org?.code) {
      navigator.clipboard.writeText(org.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleJoinClick = async () => {
    if (!isAuthenticated) { showMessage("Please log in to join an organization", "error"); return; }
    if (org.isPublic) {
      setJoinLoading(true);
      try {
        const resp = await ApiService.joinOrganization(org.id);
        if (resp.statusCode === 200) { showMessage("Joined organization successfully!", "success"); fetchOrg(); }
      } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); } finally { setJoinLoading(false); }
    } else {
      setJoinCodeOpen(true);
    }
  };

  const handleJoinWithCode = async (code) => {
    try {
      const resp = await ApiService.joinOrganization(org.id, code);
      if (resp.statusCode === 200) { showMessage("Joined organization successfully!", "success"); setJoinCodeOpen(false); fetchOrg(); }
    } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); }
  };

  const handleLeave = () =>
    showConfirm("Leave Organization", `Are you sure you want to leave "${org.name}"?`, async () => {
      try {
        const resp = await ApiService.leaveOrganization(org.id);
        if (resp.statusCode === 200) { showMessage("Left organization", "success"); fetchOrg(); }
      } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); }
    });

  const handleUpdateOrg = async (data) => {
    try {
      const resp = await ApiService.updateOrganization(org.id, data);
      if (resp.statusCode === 200) { showMessage("Organization updated!", "success"); setEditOpen(false); fetchOrg(); }
    } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); }
  };

  const handleAddMember = async (userId) => {
    try {
      const resp = await ApiService.addMember(org.id, userId);
      if (resp.statusCode === 201) { showMessage("Member added!", "success"); fetchMembers(memberPage); fetchOrg(); }
    } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); }
  };

  const handleToggleRole = (member) => {
    const newRole = member.role === "ADMIN" ? "MEMBER" : "ADMIN";
    const action = newRole === "ADMIN" ? "promote to Admin" : "demote to Member";
    showConfirm("Change Role", `Are you sure you want to ${action} "${member.username}"?`, async () => {
      try {
        const resp = await ApiService.updateMemberRole(org.id, member.userId, newRole);
        if (resp.statusCode === 200) { showMessage(`Role updated to ${newRole}`, "success"); fetchMembers(memberPage); }
      } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); }
    });
  };

  const handleRemoveMember = (member) =>
    showConfirm("Remove Member", `Remove "${member.username}" from the organization?`, async () => {
      try {
        const resp = await ApiService.removeMember(org.id, member.userId);
        if (resp.statusCode === 200) { showMessage("Member removed", "success"); fetchMembers(memberPage); fetchOrg(); }
      } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); }
    });

  const handleDeleteOrg = () =>
    showConfirm("Delete Organization", `This will permanently delete "${org.name}" and remove all members. This cannot be undone.`, async () => {
      try {
        const resp = await ApiService.deleteOrganization(org.id);
        if (resp.statusCode === 200) { showMessage("Organization deleted", "success"); navigate("/organizations"); }
      } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); }
    });

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0" }}>
        <div className="page-container">
          <div className="flex flex-col items-center gap-4" style={{ padding: "80px 0" }}>
            <div className="spinner" />
            <span className="text-muted">Loading organization...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!org) return null;

  const isOwner = org.myRole === "OWNER";
  const isOrgAdmin = org.myRole === "ADMIN";
  const isMember = !!org.myRole;
  const canManage = isOwner || isOrgAdmin;

  const TABS = isMember ? ["MEMBERS", "LABS"] : ["ADMINS"];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0" }}>
      <div className="page-container">
        <div className="flex flex-col gap-6">
          {/* Back */}
          <div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate("/organizations")}>
              <ArrowLeft size={16} /> Back to Organizations
            </button>
          </div>

          {/* Hero */}
          <div
            style={{
              background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-bright) 100%)",
              borderRadius: 16, padding: 32, color: "white", position: "relative", overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", inset: 0, opacity: 0.1, backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
            <div className="flex flex-col gap-3" style={{ position: "relative" }}>
              <div className="flex items-center gap-3">
                <Building2 size={32} />
                <h2 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>{org.name}</h2>
                {org.isPublic ? <Globe size={18} style={{ opacity: 0.7 }} /> : <Lock size={18} style={{ opacity: 0.7 }} />}
              </div>
              {org.about && <p style={{ fontSize: 15, opacity: 0.85, margin: 0, maxWidth: 600 }}>{org.about}</p>}
              <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.2)", color: "white", padding: "4px 12px", borderRadius: 9999, fontSize: 13 }}>
                  <Users size={14} /> {org.totalMembers} members
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.2)", color: "white", padding: "4px 12px", borderRadius: 9999, fontSize: 13 }}>
                  <Calendar size={14} /> Created {fmt(org.createdAt)}
                </span>
                {isMember ? (
                  <span style={{ background: org.myRole === "OWNER" ? "#facc15" : org.myRole === "ADMIN" ? "#60a5fa" : "#4ade80", color: "white", padding: "4px 12px", borderRadius: 9999, fontSize: 13, fontWeight: 600 }}>
                    You are {org.myRole.charAt(0) + org.myRole.slice(1).toLowerCase()}
                  </span>
                ) : (
                  <span style={{ background: "rgba(255,255,255,0.3)", color: "white", padding: "4px 12px", borderRadius: 9999, fontSize: 13 }}>
                    You are not a member
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center flex-wrap gap-3">
            {org.code && (
              <div className="flex items-center gap-2" style={{ background: "var(--bg-raised)", padding: "10px 16px", borderRadius: 10, border: "1px solid var(--border-default)" }}>
                <span className="text-sm" style={{ fontWeight: 600, color: "var(--text-muted)" }}>Join Code:</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)", letterSpacing: "0.1em", fontFamily: "monospace" }}>{org.code}</span>
                <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6 }} onClick={handleCopyCode} title="Copy code">
                  {codeCopied ? <Check size={16} color="#16a34a" /> : <Copy size={16} color="var(--primary)" />}
                </button>
              </div>
            )}

            <div style={{ flex: 1 }} />

            {!isMember && isAuthenticated && (
              <button className="btn btn-primary btn-sm" onClick={handleJoinClick} disabled={joinLoading}>
                {joinLoading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <>{org.isPublic ? <LogIn size={14} /> : <Lock size={14} />} Join{org.isPublic ? "" : " 🔒"}</>}
              </button>
            )}
            {isMember && !isOwner && (
              <button className="btn btn-danger btn-sm" onClick={handleLeave}>
                <LogOut size={14} /> Leave
              </button>
            )}
            {canManage && (
              <button className="btn btn-ghost btn-sm" style={{ border: "1px solid var(--primary)", color: "var(--primary)" }} onClick={() => setEditOpen(true)}>
                <Settings size={14} /> Edit
              </button>
            )}
            {isOwner && (
              <button className="btn btn-danger btn-sm" onClick={handleDeleteOrg}>
                Delete
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1" style={{ background: "var(--bg-raised)", padding: 6, borderRadius: 10, border: "1px solid var(--border-default)" }}>
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                style={{
                  padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600,
                  background: activeTab === t ? "var(--primary)" : "transparent",
                  color: activeTab === t ? "white" : "var(--text-muted)",
                  border: "none", cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Members Table */}
          {(activeTab === "MEMBERS" || activeTab === "ADMINS") && (
            <>
              {isMember && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1" style={{ background: "var(--bg-raised)", padding: "10px 16px", borderRadius: 10, border: "1px solid var(--border-default)" }}>
                    <Search size={16} color="#9CA3AF" />
                    <input
                      className="input"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search members by username..."
                      style={{ border: "none", background: "transparent", flex: 1, outline: "none" }}
                    />
                  </div>
                  {canManage && (
                    <button className="btn btn-primary btn-sm" onClick={() => setAddMemberOpen(true)}>
                      <UserPlus size={16} /> Add Member
                    </button>
                  )}
                </div>
              )}

              <div className="card" style={{ overflow: "hidden", position: "relative" }}>
                {membersLoading && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                    <div className="spinner" />
                  </div>
                )}

                <table className="table">
                  <thead>
                    <tr style={{ background: "var(--bg-raised)" }}>
                      <th style={{ width: "5%" }}>#</th>
                      <th style={{ width: "35%" }}>User</th>
                      <th style={{ width: "15%" }}>Role</th>
                      <th style={{ width: "20%" }}>Joined</th>
                      {canManage && <th style={{ width: "15%", textAlign: "center" }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {members.length > 0 ? (
                      members.map((member, idx) => (
                        <tr key={member.id} style={{ background: idx % 2 === 0 ? "white" : "var(--bg-raised)" }}>
                          <td>
                            <span className="text-sm" style={{ fontWeight: 600, color: "var(--text-muted)" }}>
                              {memberPage * 20 + idx + 1}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg-overlay)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--primary)", overflow: "hidden", flexShrink: 0 }}>
                                {member.profileUrl ? (
                                  <img src={member.profileUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                  (member.username || "U").charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <p
                                  style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text-primary)", cursor: "pointer" }}
                                  onClick={() => navigate(`/users/${member.username}`)}
                                >
                                  {member.name || member.username}
                                </p>
                                <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>@{member.username}</p>
                              </div>
                            </div>
                          </td>
                          <td><RoleBadge role={member.role} /></td>
                          <td><span className="text-xs" style={{ color: "var(--text-secondary)" }}>{fmt(member.joinedAt)}</span></td>
                          {canManage && (
                            <td>
                              <div className="flex items-center justify-center gap-1">
                                {member.role !== "OWNER" && (
                                  <>
                                    {isOwner && (
                                      <button
                                        style={{
                                          padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
                                          color: member.role === "ADMIN" ? "#ea580c" : "#2563eb",
                                          background: "transparent",
                                        }}
                                        onClick={() => handleToggleRole(member)}
                                        title={member.role === "ADMIN" ? "Demote to Member" : "Promote to Admin"}
                                      >
                                        {member.role === "ADMIN" ? "Demote" : "Promote"}
                                      </button>
                                    )}
                                    <button
                                      style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: "#ef4444" }}
                                      onClick={() => handleRemoveMember(member)}
                                      title="Remove member"
                                    >
                                      <UserMinus size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={canManage ? 5 : 4} style={{ textAlign: "center", padding: "40px 0" }}>
                          <div className="flex flex-col items-center gap-2">
                            <Users size={32} color="#D1D5DB" />
                            <span className="text-sm text-muted">No members yet</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {memberTotalPages > 1 && (
                  <div className="flex items-center justify-between" style={{ padding: "12px 20px", borderTop: "1px solid var(--border-subtle)" }}>
                    <span className="text-sm text-muted">Page {memberPage + 1} of {memberTotalPages}</span>
                    <div className="flex items-center gap-1">
                      <button
                        style={{ background: "none", border: "none", cursor: memberPage === 0 ? "not-allowed" : "pointer", padding: 4, borderRadius: 6, color: memberPage === 0 ? "#d1d5db" : "var(--text-secondary)", opacity: memberPage === 0 ? 0.5 : 1 }}
                        onClick={() => memberPage > 0 && setMemberPage((p) => p - 1)}
                        disabled={memberPage === 0}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        style={{ background: "none", border: "none", cursor: memberPage >= memberTotalPages - 1 ? "not-allowed" : "pointer", padding: 4, borderRadius: 6, color: memberPage >= memberTotalPages - 1 ? "#d1d5db" : "var(--text-secondary)", opacity: memberPage >= memberTotalPages - 1 ? 0.5 : 1 }}
                        onClick={() => memberPage < memberTotalPages - 1 && setMemberPage((p) => p + 1)}
                        disabled={memberPage >= memberTotalPages - 1}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Labs Tab */}
          {activeTab === "LABS" && isMember && (
            <LabListSection
              org={org}
              canManage={canManage}
              onNavigateToLab={(labSlug) => navigate(`/organizations/${org.slug}/labs/${labSlug}`)}
              onCreateLab={() => navigate(`/organizations/${org.slug}/labs/new`)}
            />
          )}
        </div>
      </div>

      <ConfirmDialog />
      <EditModal isOpen={editOpen} onClose={() => setEditOpen(false)} org={org} onSave={handleUpdateOrg} />
      <JoinCodeModal isOpen={joinCodeOpen} onClose={() => setJoinCodeOpen(false)} onJoin={handleJoinWithCode} orgName={org.name} />
      <AddMemberModal isOpen={addMemberOpen} onClose={() => setAddMemberOpen(false)} orgId={org.id} onAdd={handleAddMember} />
    </div>
  );
};

export default OrganizationDetailPage;
