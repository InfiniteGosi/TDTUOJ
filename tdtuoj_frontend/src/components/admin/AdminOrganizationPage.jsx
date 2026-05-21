import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Plus, Eye, Trash2, Edit, Search,
  Users, Globe, Lock, X, Copy, Check, Calendar, Save,
} from "lucide-react";
import Pagination from "../common/Pagination";
import ApiService from "../../services/ApiService";
import SuggestiveSearch from "../common/SuggestiveSearch";
import { useConfirmDialog } from "../common/ConfirmDialog";
import { useToast } from "../common/ToastMessage";

const fmt = (dt) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

// ─── Modal base ───────────────────────────────────────────────────────────────

const ModalOverlay = ({ onClose, children }) => (
  <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
    <div className="card" style={{ position: "relative", padding: 24, width: 480, maxWidth: "90vw", zIndex: 1, boxShadow: "0 25px 60px rgba(0,0,0,0.2)" }}>
      {children}
    </div>
  </div>
);

// ─── OrgForm (shared between Create and Edit) ─────────────────────────────────

const OrgForm = ({ name, setName, about, setAbout, code, setCode, isPublic, setIsPublic }) => {
  const visBtn = (active, label, Icon, val) => (
    <button
      style={{ flex: 1, padding: 8, borderRadius: 8, border: `2px solid ${active ? "var(--primary)" : "var(--border-default)"}`, background: active ? "var(--primary-subtle)" : "var(--bg-base)", color: active ? "var(--primary)" : "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
      onClick={() => setIsPublic(val)}
    >
      <Icon size={14} /> {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="form-group">
        <label className="form-label">Name *</label>
        <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Organization name" />
      </div>
      <div className="form-group">
        <label className="form-label">About</label>
        <input className="input w-full" value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Short description (optional)" />
      </div>
      <div className="form-group">
        <label className="form-label">Join Code</label>
        <input className="input w-full" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Auto-generated if empty" maxLength={10} style={{ fontFamily: "monospace", letterSpacing: "0.1em" }} />
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-muted)" }}>Leave blank to auto-generate a 6-character code</p>
      </div>
      <div className="form-group">
        <label className="form-label">Visibility</label>
        <div className="flex gap-2">
          {visBtn(isPublic, "Public", Globe, true)}
          {visBtn(!isPublic, "Private", Lock, false)}
        </div>
      </div>
    </div>
  );
};

// ─── Create Modal ─────────────────────────────────────────────────────────────

const CreateModal = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [code, setCode] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const data = { name: name.trim(), about: about.trim(), isPublic };
    if (code.trim()) data.code = code.trim();
    await onCreate(data);
    setLoading(false);
    setName(""); setAbout(""); setCode(""); setIsPublic(true);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div className="flex items-center gap-2">
          <Building2 size={20} color="var(--primary)" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Create Organization</h3>
        </div>
        <button style={{ background: "none", border: "none", cursor: "pointer" }} onClick={onClose}><X size={18} color="var(--text-muted)" /></button>
      </div>
      <OrgForm name={name} setName={setName} about={about} setAbout={setAbout} code={code} setCode={setCode} isPublic={isPublic} setIsPublic={setIsPublic} />
      <div className="flex gap-2" style={{ marginTop: 20 }}>
        <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary flex-1" onClick={handleCreate} disabled={!name.trim() || loading}>
          {loading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : "Create"}
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

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div className="flex items-center gap-2">
          <Edit size={20} color="var(--primary)" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Edit Organization</h3>
        </div>
        <button style={{ background: "none", border: "none", cursor: "pointer" }} onClick={onClose}><X size={18} color="var(--text-muted)" /></button>
      </div>
      <OrgForm name={name} setName={setName} about={about} setAbout={setAbout} code={code} setCode={setCode} isPublic={isPublic} setIsPublic={setIsPublic} />
      <div className="flex gap-2" style={{ marginTop: 20 }}>
        <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary flex-1" onClick={handleSave} disabled={!name.trim() || loading}>
          {loading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <><Save size={14} /> Save</>}
        </button>
      </div>
    </ModalOverlay>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const AdminOrganizationPage = () => {
  const { ConfirmDialog, showConfirm } = useConfirmDialog();
  const { showMessage } = useToast();
  const navigate = useNavigate();

  const [organizations, setOrganizations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const SIZE = 10;

  const isAdmin = ApiService.isAdmin();

  const fetchOrgs = async (p = page) => {
    try {
      setLoading(true);
      const resp = await ApiService.getOrganizations({ page: p, size: SIZE, search });
      if (resp.statusCode === 200) {
        const data = resp.data;
        const content = data.content ?? data;
        const pageInfo = data.page ?? {};
        setOrganizations(content);
        setTotalPages(pageInfo.totalPages ?? 1);
        setTotalElements(pageInfo.totalElements ?? content.length);
      }
    } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrgs(page); }, [page]);
  useEffect(() => {
    const timer = setTimeout(() => { setPage(0); fetchOrgs(0); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = (id, name) =>
    showConfirm("Delete Organization", `Are you sure you want to delete "${name}"? This cannot be undone.`, async () => {
      try {
        const resp = await ApiService.deleteOrganization(id);
        if (resp.statusCode === 200) { showMessage("Organization deleted successfully", "success"); fetchOrgs(page); }
      } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); }
    });

  const handleCreate = async (data) => {
    try {
      const resp = await ApiService.createOrganization(data);
      if (resp.statusCode === 201) { showMessage("Organization created!", "success"); setCreateOpen(false); fetchOrgs(page); }
    } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); }
  };

  const handleCopyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEdit = async (data) => {
    try {
      const resp = await ApiService.updateOrganization(editingOrg.id, data);
      if (resp.statusCode === 200) { showMessage("Organization updated!", "success"); setEditingOrg(null); fetchOrgs(page); }
    } catch (err) { showMessage(err.response?.data?.message || err.message, "error"); }
  };

  const filtered = organizations.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()));

  if (loading && organizations.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0" }}>
        <div className="page-container">
          <div className="flex flex-col items-center gap-4" style={{ padding: "80px 0" }}>
            <div className="spinner" />
            <span className="text-muted">Loading organizations...</span>
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
                <Building2 size={28} color="var(--primary)" />
                <h2 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Manage Organizations</h2>
              </div>
              <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 9999, fontSize: 13, fontWeight: 600, background: "var(--primary-subtle)", color: "var(--primary)" }}>
                {totalElements} {totalElements === 1 ? "organization" : "organizations"}
              </span>
            </div>
            <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus size={18} /> New Organization
            </button>
          </div>

          <ConfirmDialog />

          {/* Search */}
          <SuggestiveSearch
            value={search}
            onChange={(val) => setSearch(val)}
            suggestions={["Filter by organization name...", "Search organizations"]}
            style={{ width: "100%", maxWidth: 320 }}
          />

          {/* Table */}
          <div className="card" style={{ overflow: "hidden", position: "relative" }}>
            {loading && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                <div className="spinner" />
              </div>
            )}

            <table className="table">
              <thead>
                <tr style={{ background: "var(--primary-subtle)" }}>
                  <th style={{ width: "5%", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>#</th>
                  <th style={{ width: "27%", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Organization</th>
                  <th style={{ width: "13%", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Code</th>
                  <th style={{ width: "10%", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Visibility</th>
                  <th style={{ textAlign: "center", width: "9%", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Members</th>
                  <th style={{ width: "13%", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Created</th>
                  <th style={{ textAlign: "center", width: "13%", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((org) => (
                    <tr key={org.id}>
                      <td><span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>{org.id}</span></td>
                      <td>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{org.name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>by {org.creatorUsername ?? "—"}</p>
                        </div>
                      </td>
                      <td>
                        {org.code ? (
                          <div className="flex items-center gap-1">
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", fontFamily: "monospace", letterSpacing: "0.05em" }}>{org.code}</span>
                            <button style={{ background: "none", border: "none", cursor: "pointer", padding: 2, borderRadius: 4 }} onClick={() => handleCopyCode(org.code, org.id)}>
                              {copiedId === org.id ? <Check size={12} color="var(--green-ac)" /> : <Copy size={12} color="var(--text-muted)" />}
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          {org.isPublic ? <><Globe size={12} color="var(--text-muted)" /><span style={{ fontSize: 11, color: "var(--text-muted)" }}>Public</span></> : <><Lock size={12} color="var(--text-muted)" /><span style={{ fontSize: 11, color: "var(--text-muted)" }}>Private</span></>}
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div className="flex items-center justify-center gap-1">
                          <Users size={12} color="var(--text-muted)" />
                          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{org.totalMembers ?? 0}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Calendar size={12} color="var(--text-muted)" />
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{fmt(org.createdAt)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <button className="btn btn-ghost btn-sm" title="View" style={{ padding: "5px 7px" }} onClick={() => navigate(`/organizations/${org.slug}`)}>
                            <Eye size={16} color="var(--blue-ce)" />
                          </button>
                          <button className="btn btn-ghost btn-sm" title="Edit" style={{ padding: "5px 7px" }} onClick={() => setEditingOrg(org)}>
                            <Edit size={16} color="var(--primary)" />
                          </button>
                          {isAdmin && (
                            <button className="btn btn-ghost btn-sm" title="Delete" style={{ padding: "5px 7px" }} onClick={() => handleDelete(org.id, org.name)}>
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
                        <Building2 size={22} color="var(--text-muted)" />
                      </div>
                      <div style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4 }}>No organizations found</div>
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Click 'New Organization' to create one</div>
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

      <CreateModal isOpen={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
      <EditModal isOpen={!!editingOrg} onClose={() => setEditingOrg(null)} org={editingOrg} onSave={handleEdit} />
    </div>
  );
};

export default AdminOrganizationPage;
