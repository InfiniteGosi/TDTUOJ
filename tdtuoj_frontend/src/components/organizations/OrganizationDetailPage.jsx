import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Building2, Users, Globe, Lock, Calendar, Copy, Check,
  Shield, ShieldCheck, Crown, LogOut, UserMinus,
  ChevronLeft, ChevronRight, ArrowLeft, Settings, X,
  Save, KeyRound, LogIn, UserPlus, Search, BookOpen,
} from "lucide-react";
import SuggestiveSearch from "../common/SuggestiveSearch";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import { useConfirmDialog } from "../common/ConfirmDialog";
import LabListSection from "./LabListSection";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (dt) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const ROLE_STYLE = {
  OWNER:  { label: "Owner",  color: "var(--amber-tle)", bg: "var(--amber-subtle)", icon: Crown      },
  ADMIN:  { label: "Admin",  color: "var(--blue-ce)",   bg: "var(--blue-subtle)",  icon: ShieldCheck },
  MEMBER: { label: "Member", color: "var(--green-ac)",  bg: "var(--green-subtle)", icon: Shield      },
};

const RoleBadge = ({ role }) => {
  const s = ROLE_STYLE[role] || ROLE_STYLE.MEMBER;
  const Icon = s.icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: "var(--radius-pill)", fontSize: "var(--text-xs)", fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.color}33` }}>
      <Icon size={11} />{s.label}
    </span>
  );
};

// ─── Modal base ───────────────────────────────────────────────────────────────

const ModalOverlay = ({ onClose, children }) => (
  <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={onClose} />
    <div style={{ position: "relative", background: "var(--bg-raised)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", padding: 24, width: 480, maxWidth: "90vw", zIndex: 1, boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
      {children}
    </div>
  </div>
);

const ModalHeader = ({ icon: Icon, title, onClose }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Icon size={18} color="var(--primary)" />
      <h3 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3>
    </div>
    <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 2, borderRadius: "var(--radius-sm)", transition: "color 0.12s" }} onClick={onClose}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}>
      <X size={16} />
    </button>
  </div>
);

// ─── Join Code Modal ──────────────────────────────────────────────────────────

const JoinCodeModal = ({ isOpen, onClose, onJoin, orgName }) => {
  const [code, setCode]       = useState("");
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
      <ModalHeader icon={KeyRound} title="Enter Invite Code" onClose={onClose} />
      <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: 16 }}>
        <strong style={{ color: "var(--text-primary)" }}>{orgName}</strong> is private. Enter the invite code to join.
      </p>
      <input className="input w-full" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="e.g. ABC123" maxLength={10} onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        style={{ textAlign: "center", fontWeight: 700, letterSpacing: "0.15em", fontSize: 20, marginBottom: 16, fontFamily: "var(--font-code)" }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleJoin} disabled={!code.trim() || loading}>
          {loading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : "Join"}
        </button>
      </div>
    </ModalOverlay>
  );
};

// ─── Edit Modal ───────────────────────────────────────────────────────────────

const EditModal = ({ isOpen, onClose, org, onSave }) => {
  const [name, setName]       = useState(org?.name || "");
  const [about, setAbout]     = useState(org?.about || "");
  const [code, setCode]       = useState(org?.code || "");
  const [isPublic, setIsPublic] = useState(org?.isPublic ?? true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (org) { setName(org.name || ""); setAbout(org.about || ""); setCode(org.code || ""); setIsPublic(org.isPublic ?? true); }
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

  const VisBtn = ({ active, label, Icon, val }) => (
    <button style={{ flex: 1, padding: "8px", borderRadius: "var(--radius-md)", border: `2px solid ${active ? "var(--primary)" : "var(--border-default)"}`, background: active ? "var(--primary-subtle)" : "transparent", color: active ? "var(--primary)" : "var(--text-muted)", fontSize: "var(--text-sm)", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
      onClick={() => setIsPublic(val)}>
      <Icon size={14} />{label}
    </button>
  );

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader icon={Settings} title="Edit Organization" onClose={onClose} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
          <input className="input w-full" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Invite code" maxLength={10} style={{ fontFamily: "var(--font-code)", letterSpacing: "0.1em" }} />
        </div>
        <div className="form-group">
          <label className="form-label">Visibility</label>
          <div style={{ display: "flex", gap: 8 }}>
            <VisBtn active={isPublic}  label="Public"  Icon={Globe} val={true}  />
            <VisBtn active={!isPublic} label="Private" Icon={Lock}  val={false} />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={!name.trim() || loading}>
          {loading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <><Save size={14} />Save</>}
        </button>
      </div>
    </ModalOverlay>
  );
};

// ─── Add Member Modal ─────────────────────────────────────────────────────────

const AddMemberModal = ({ isOpen, onClose, orgId, onAdd }) => {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    if (!isOpen) { setQuery(""); setResults([]); return; }
    if (query.trim().length < 1) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const resp = await ApiService.searchNonMembers(orgId, query.trim());
        if (resp.statusCode === 200) setResults(resp.data.content ?? resp.data);
      } catch { setResults([]); } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
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
      <ModalHeader icon={UserPlus} title="Add Member" onClose={onClose} />
      <div style={{ marginBottom: 12 }}>
        <SuggestiveSearch value={query} onChange={setQuery} suggestions={["Search by username..."]} style={{ width: "100%" }} />
      </div>
      <div style={{ minHeight: 200, overflowY: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><div className="spinner" /></div>
        ) : results.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {results.map((user) => (
              <div key={user.userId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: "var(--radius-md)", background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--primary)", overflow: "hidden", flexShrink: 0 }}>
                    {user.profileUrl ? <img src={user.profileUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (user.username || "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{user.name || user.username}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>@{user.username}</p>
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => handleAdd(user.userId)} disabled={addingId === user.userId}>
                  {addingId === user.userId ? <div className="spinner" style={{ width: 14, height: 14 }} /> : "Add"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: "center" }}>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
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
  const { slug }        = useParams();
  const navigate        = useNavigate();
  const { showMessage } = useToast();
  const { ConfirmDialog, showConfirm } = useConfirmDialog();

  const [org, setOrg]                     = useState(null);
  const [members, setMembers]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [memberPage, setMemberPage]       = useState(0);
  const [memberTotalPages, setMemberTotalPages] = useState(0);
  const [codeCopied, setCodeCopied]       = useState(false);
  const [editOpen, setEditOpen]           = useState(false);
  const [joinCodeOpen, setJoinCodeOpen]   = useState(false);
  const [joinLoading, setJoinLoading]     = useState(false);
  const [activeTab, setActiveTab]         = useState("MEMBERS");
  const [memberSearch, setMemberSearch]   = useState("");
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const isAuthenticated = ApiService.isAuthenticated();

  const fetchOrg = async () => {
    try {
      setLoading(true);
      const resp = await ApiService.getOrganizationBySlug(slug);
      if (resp.statusCode === 200) setOrg(resp.data);
    } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); navigate("/organizations"); }
    finally { setLoading(false); }
  };

  const fetchMembers = async (p = memberPage) => {
    if (!org) return;
    try {
      setMembersLoading(true);
      const resp = await ApiService.getOrganizationMembers(org.id, { page: p, size: 20, search: memberSearch });
      if (resp.statusCode === 200) {
        const data = resp.data;
        setMembers(data.content ?? data);
        setMemberTotalPages((data.page ?? {}).totalPages ?? 1);
      }
    } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); }
    finally { setMembersLoading(false); }
  };

  useEffect(() => { fetchOrg(); }, [slug]);
  useEffect(() => { if (org) fetchMembers(memberPage); }, [org, memberPage]);
  useEffect(() => {
    if (!org) return;
    const t = setTimeout(() => { setMemberPage(0); fetchMembers(0); }, 300);
    return () => clearTimeout(t);
  }, [memberSearch]);

  const handleCopyCode = () => {
    if (org?.code) { navigator.clipboard.writeText(org.code); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }
  };

  const handleJoinClick = async () => {
    if (!isAuthenticated) { showMessage("Please log in to join an organization", "error"); return; }
    if (org.isPublic) {
      setJoinLoading(true);
      try {
        const resp = await ApiService.joinOrganization(org.id);
        if (resp.statusCode === 200) { showMessage("Joined successfully!", "success"); fetchOrg(); }
      } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); }
      finally { setJoinLoading(false); }
    } else { setJoinCodeOpen(true); }
  };

  const handleJoinWithCode = async (code) => {
    try {
      const resp = await ApiService.joinOrganization(org.id, code);
      if (resp.statusCode === 200) { showMessage("Joined successfully!", "success"); setJoinCodeOpen(false); fetchOrg(); }
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
    showConfirm("Change Role", `${newRole === "ADMIN" ? "Promote" : "Demote"} "${member.username}" to ${newRole}?`, async () => {
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
    showConfirm("Delete Organization", `Permanently delete "${org?.name}" and remove all members? This cannot be undone.`, async () => {
      try {
        const resp = await ApiService.deleteOrganization(org.id);
        if (resp.statusCode === 200) { showMessage("Organization deleted", "success"); navigate("/organizations"); }
      } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); }
    });

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div className="spinner" />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Loading organization...</span>
        </div>
      </div>
    );
  }
  if (!org) return null;

  const isOwner    = org.myRole === "OWNER";
  const isOrgAdmin = org.myRole === "ADMIN";
  const isMember   = !!org.myRole;
  const canManage  = isOwner || isOrgAdmin;
  const TABS       = isMember ? ["MEMBERS", "LABS"] : ["MEMBERS"];

  const accentColor = isOwner ? "var(--amber-tle)" : isOrgAdmin ? "var(--blue-ce)" : isMember ? "var(--green-ac)" : "var(--border-strong)";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", paddingBottom: "var(--space-16)" }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }`}</style>

      {/* ── Banner ── */}
      <div style={{ background: "var(--bg-void)", borderBottom: "1px solid var(--border-default)" }}>
        <div className="page-container" style={{ paddingTop: "var(--space-7)", paddingBottom: "var(--space-8)" }}>
          {/* Back */}
          <button onClick={() => navigate("/organizations")}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--text-muted)", fontSize: "var(--text-sm)", cursor: "pointer", outline: "none", padding: 0, marginBottom: "var(--space-6)", transition: "color 0.12s", fontFamily: "var(--font-body)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}>
            <ArrowLeft size={14} />All Organizations
          </button>

          {/* Accented content */}
          <div style={{ borderLeft: `4px solid ${accentColor}`, paddingLeft: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {/* Badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: "var(--radius-pill)", fontSize: "var(--text-xs)", fontWeight: 700, background: org.isPublic ? "var(--bg-overlay)" : "var(--bg-overlay)", color: "var(--text-muted)", border: "1px solid var(--border-default)" }}>
                {org.isPublic ? <Globe size={10} /> : <Lock size={10} />}
                {org.isPublic ? "Public" : "Private"}
              </span>
              {isMember && (
                <RoleBadge role={org.myRole} />
              )}
              {!isMember && (
                <span style={{ padding: "3px 10px", borderRadius: "var(--radius-pill)", fontSize: "var(--text-xs)", fontWeight: 600, background: "var(--bg-overlay)", color: "var(--text-muted)", border: "1px solid var(--border-default)" }}>
                  Not a member
                </span>
              )}
            </div>

            {/* Title */}
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-3xl)", fontWeight: 900, margin: 0, lineHeight: 1.1, color: "var(--text-primary)" }}>
              {org.name}
            </h1>

            {/* About */}
            {org.about && (
              <p style={{ fontSize: "var(--text-base)", color: "var(--text-secondary)", margin: 0, maxWidth: 620, lineHeight: 1.65 }}>
                {org.about}
              </p>
            )}

            {/* Meta */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 18 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                <Users size={13} color="var(--text-muted)" />{org.totalMembers ?? 0} members
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                <Calendar size={13} color="var(--text-muted)" />Created {fmt(org.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="page-container" style={{ marginTop: "var(--space-8)" }}>
        <div style={{ display: "flex", gap: "var(--space-6)", alignItems: "flex-start" }}>

          {/* ── Left: main content ── */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border-default)", marginBottom: "var(--space-4)" }}>
              {TABS.map((t) => (
                <button key={t} onClick={() => setActiveTab(t)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", fontWeight: 600, outline: "none", color: activeTab === t ? "var(--text-primary)" : "var(--text-muted)", borderBottom: `2px solid ${activeTab === t ? "var(--primary)" : "transparent"}`, marginBottom: -1, transition: "color 0.12s" }}>
                  {t === "MEMBERS" ? <><Users size={13} />Members</> : <><BookOpen size={13} />Labs</>}
                </button>
              ))}
            </div>

            {/* ── Members tab ── */}
            {(activeTab === "MEMBERS") && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                {/* Search + add */}
                {isMember && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--bg-raised)", padding: "8px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)" }}>
                      <Search size={14} color="var(--text-muted)" />
                      <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="Search members by username..."
                        style={{ border: "none", background: "transparent", flex: 1, outline: "none", fontSize: "var(--text-sm)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                      />
                    </div>
                    {canManage && (
                      <button className="btn btn-primary btn-sm" onClick={() => setAddMemberOpen(true)}>
                        <UserPlus size={14} />Add Member
                      </button>
                    )}
                  </div>
                )}

                {/* Members table */}
                <div style={{ background: "var(--bg-raised)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", overflow: "hidden", position: "relative" }}>
                  {membersLoading && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(15,15,15,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                      <div className="spinner" />
                    </div>
                  )}
                  <table className="table" style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "5%", textAlign: "center", fontSize: 13, fontWeight: 700 }}>#</th>
                        <th style={{ width: "40%", fontSize: 13, fontWeight: 700 }}>User</th>
                        <th style={{ width: "15%", fontSize: 13, fontWeight: 700 }}>Role</th>
                        <th style={{ width: "22%", fontSize: 13, fontWeight: 700 }}>Joined</th>
                        {canManage && <th style={{ width: "18%", textAlign: "center", fontSize: 13, fontWeight: 700 }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {members.length > 0 ? members.map((member, idx) => {
                        const rowBg = idx % 2 === 0 ? "var(--bg-raised)" : "var(--bg-overlay)";
                        return (
                          <tr key={member.id}
                            style={{ background: rowBg, transition: "background 0.12s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = rowBg; }}>
                            <td style={{ textAlign: "center" }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>{memberPage * 20 + idx + 1}</span>
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--primary)", overflow: "hidden", flexShrink: 0 }}>
                                  {member.profileUrl ? <img src={member.profileUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (member.username || "U").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text-primary)", cursor: "pointer" }}
                                    onClick={() => navigate(`/users/${member.username}`)}>
                                    {member.name || member.username}
                                  </p>
                                  <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>@{member.username}</p>
                                </div>
                              </div>
                            </td>
                            <td><RoleBadge role={member.role} /></td>
                            <td><span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{fmt(member.joinedAt)}</span></td>
                            {canManage && (
                              <td>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                  {member.role !== "OWNER" && (
                                    <>
                                      {isOwner && (
                                        <button
                                          style={{ padding: "3px 9px", borderRadius: "var(--radius-sm)", fontSize: 11, fontWeight: 600, border: `1px solid ${member.role === "ADMIN" ? "var(--amber-tle)" : "var(--blue-ce)"}`, cursor: "pointer", background: "transparent", color: member.role === "ADMIN" ? "var(--amber-tle)" : "var(--blue-ce)", fontFamily: "var(--font-body)", transition: "all 0.12s" }}
                                          onClick={() => handleToggleRole(member)}>
                                          {member.role === "ADMIN" ? "Demote" : "Promote"}
                                        </button>
                                      )}
                                      <button
                                        style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", display: "flex", alignItems: "center", transition: "color 0.12s" }}
                                        onClick={() => handleRemoveMember(member)}
                                        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--red-wa)"; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}>
                                        <UserMinus size={14} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={canManage ? 5 : 4} style={{ textAlign: "center", padding: "40px 0" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                              <Users size={32} color="var(--border-default)" />
                              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No members yet</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {memberTotalPages > 1 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--border-subtle)" }}>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Page {memberPage + 1} of {memberTotalPages}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => memberPage > 0 && setMemberPage((p) => p - 1)} disabled={memberPage === 0}>
                          <ChevronLeft size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => memberPage < memberTotalPages - 1 && setMemberPage((p) => p + 1)} disabled={memberPage >= memberTotalPages - 1}>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Labs tab ── */}
            {activeTab === "LABS" && isMember && (
              <LabListSection
                org={org}
                canManage={canManage}
                onNavigateToLab={(labSlug) => navigate(`/organizations/${org.slug}/labs/${labSlug}`)}
                onCreateLab={() => navigate(`/organizations/${org.slug}/labs/new`)}
              />
            )}
          </div>

          {/* ── Right: sidebar ── */}
          <div style={{ width: 256, flexShrink: 0, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

            {/* CTA */}
            {!isMember && isAuthenticated && (
              <button className="btn btn-primary"
                style={{ width: "100%", padding: "13px 0", fontWeight: 800, fontSize: "var(--text-base)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: "var(--radius-md)" }}
                disabled={joinLoading} onClick={handleJoinClick}>
                {joinLoading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <>{org.isPublic ? <LogIn size={15} /> : <Lock size={15} />}Join Organization</>}
              </button>
            )}

            {isMember && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 12px", borderRadius: "var(--radius-md)", background: isOwner ? "var(--amber-subtle)" : isOrgAdmin ? "var(--blue-subtle)" : "var(--green-subtle)", border: `1px solid ${isOwner ? "rgba(251,191,36,0.25)" : isOrgAdmin ? "rgba(96,165,250,0.25)" : "rgba(74,222,128,0.2)"}` }}>
                  <RoleBadge role={org.myRole} />
                </div>
                {canManage && (
                  <button
                    style={{ width: "100%", padding: "9px 0", borderRadius: "var(--radius-md)", background: "transparent", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: "var(--text-sm)", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "border-color 0.12s", fontFamily: "var(--font-body)" }}
                    onClick={() => setEditOpen(true)}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-primary)"; }}>
                    <Settings size={13} />Edit Organization
                  </button>
                )}
                {!isOwner && (
                  <button
                    style={{ width: "100%", padding: "8px 0", borderRadius: "var(--radius-md)", background: "transparent", border: "1px solid var(--border-default)", color: "var(--text-muted)", fontSize: "var(--text-sm)", fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.12s", fontFamily: "var(--font-body)" }}
                    onClick={handleLeave}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--red-wa)"; e.currentTarget.style.color = "var(--red-wa)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                    <LogOut size={13} />Leave Organization
                  </button>
                )}
                {isOwner && (
                  <button
                    style={{ width: "100%", padding: "8px 0", borderRadius: "var(--radius-md)", background: "transparent", border: "1px solid var(--border-default)", color: "var(--text-muted)", fontSize: "var(--text-sm)", fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.12s", fontFamily: "var(--font-body)" }}
                    onClick={handleDeleteOrg}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--red-wa)"; e.currentTarget.style.color = "var(--red-wa)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                    Delete Organization
                  </button>
                )}
              </div>
            )}

            {/* Join code */}
            {org.code && canManage && (
              <div style={{ background: "var(--bg-raised)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", overflow: "hidden" }}>
                <div style={{ padding: "9px 14px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-overlay)" }}>
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Invite Code</span>
                </div>
                <div style={{ padding: "var(--space-3) var(--space-4)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--primary)", letterSpacing: "0.12em", fontFamily: "var(--font-code)" }}>{org.code}</span>
                  <button style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, borderRadius: "var(--radius-sm)", color: "var(--text-muted)", display: "flex", transition: "color 0.12s" }}
                    onClick={handleCopyCode}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--primary)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}>
                    {codeCopied ? <Check size={16} color="var(--green-ac)" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Org info */}
            <div style={{ background: "var(--bg-raised)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", overflow: "hidden" }}>
              <div style={{ padding: "9px 14px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-overlay)" }}>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Info</span>
              </div>
              <div style={{ padding: "0 var(--space-4)" }}>
                {[
                  ["Members",    `${org.totalMembers ?? 0}`,  true ],
                  ["Visibility", org.isPublic ? "Public" : "Private", false],
                  ["Created",    fmt(org.createdAt),           false],
                ].map(([label, value, mono], i, arr) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)", fontWeight: 600, fontFamily: mono ? "var(--font-code)" : "var(--font-body)" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
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
