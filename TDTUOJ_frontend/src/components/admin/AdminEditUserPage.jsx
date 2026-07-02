import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Lock, Shield, User, Camera, Save,
  Eye, EyeOff, Crown, CheckCircle, AlertTriangle,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useConfirmDialog } from "../common/ConfirmDialog";
import AvatarUploadModal from "../common/AvatarUploadModal";
import { useToast } from "../common/ToastMessage";

// ─── Constants ────────────────────────────────────────────────────────────────

const AVAILABLE_ROLES = ["PARTICIPANT", "CREATOR", "ADMIN"];

const ROLE_META = {
  ADMIN:       { bg: "var(--red-subtle)",     color: "var(--red-wa)",    icon: Shield,    desc: "Full platform access and user management" },
  CREATOR:     { bg: "var(--amber-subtle)",   color: "var(--amber-tle)", icon: Crown,     desc: "Can create and manage problems and contests" },
  PARTICIPANT: { bg: "var(--primary-subtle)", color: "var(--primary)",   icon: User,      desc: "Standard user — can compete and submit" },
};

const MAX_ABOUT = 500;

// ─── PasswordField ────────────────────────────────────────────────────────────

const PasswordField = ({ value, onChange }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        className="input w-full"
        name="password"
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder="Leave blank to keep current password"
        autoComplete="new-password"
        style={{ paddingRight: 40 }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer", display: "flex",
          color: "var(--text-muted)", transition: "color 0.1s", padding: 2,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
};

// ─── AdminEditUserPage ────────────────────────────────────────────────────────

const AdminEditUserPage = () => {
  const { userId } = useParams();
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const navigate               = useNavigate();
  const { ConfirmDialog, showConfirm } = useConfirmDialog();
  const { showMessage }        = useToast();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isHoveringAvatar, setIsHoveringAvatar]   = useState(false);

  const [formData, setFormData]   = useState({ name: "", about: "", email: "", password: "", isActive: true });
  const [selectedRoles, setSelectedRoles] = useState(["PARTICIPANT"]);
  const [profileImage, setProfileImage]   = useState(null);
  const [previewImage, setPreviewImage]   = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await ApiService.getUserByUserIdAsAdmin(userId);
        if (res.statusCode === 200) {
          const u = res.data;
          setUser(u);
          setFormData({ name: u.name || "", about: u.about || "", email: u.email || "", password: "", isActive: u.isActive ?? true });
          setPreviewImage(u.profileUrl || "");
          setSelectedRoles(u.roles?.map((r) => r.name) || ["PARTICIPANT"]);
        }
      } catch (e) { showMessage(e.response?.data?.message || e.message, "error"); }
      finally { setLoading(false); }
    })();
  }, [userId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "about" && value.length > MAX_ABOUT) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleToggle = (role) =>
    setSelectedRoles((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]);

  const handleSaveAvatar = (previewUrl, imageFile) => {
    setProfileImage(imageFile);
    setPreviewImage(previewUrl);
    showMessage("Avatar selected — click Save Changes to apply.", "success");
  };

  const handleSave = () => {
    if (selectedRoles.length === 0) { showMessage("User must have at least one role.", "error"); return; }
    showConfirm("Update User", `Save changes to "${user?.username}"?`, async () => {
      try {
        setSaving(true);
        const fd = new FormData();
        fd.append("id", user.id);
        fd.append("name", formData.name);
        fd.append("about", formData.about);
        fd.append("email", formData.email);
        fd.append("isActive", formData.isActive);
        if (formData.password) fd.append("password", formData.password);
        selectedRoles.forEach((r) => fd.append("roleNames", r));
        if (profileImage) fd.append("imageFile", profileImage);
        const res = await ApiService.updateUserAsAdmin(fd);
        if (res.statusCode === 200) {
          showMessage("User updated!", "success");
          setTimeout(() => navigate("/admin/users"), 1200);
        }
      } catch (e) { showMessage(e.response?.data?.message || "Failed to update user", "error"); }
      finally { setSaving(false); }
    });
  };

  const initials = (u) => (u ? u.substring(0, 2).toUpperCase() : "U");
  const aboutPct   = Math.round((formData.about.length / MAX_ABOUT) * 100);
  const aboutColor = aboutPct >= 90 ? "var(--red-wa)" : aboutPct >= 70 ? "var(--amber-tle)" : "var(--text-muted)";

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <span style={{ fontSize: "var(--text-base)", color: "var(--text-secondary)" }}>User not found</span>
        <button className="btn btn-primary" onClick={() => navigate("/admin/users")}>Back to Users</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0 64px" }}>
      <div className="page-container" style={{ maxWidth: 700 }}>
        <div className="flex flex-col gap-6">

          {/* ── Back ── */}
          <button
            className="btn btn-ghost btn-sm"
            style={{ alignSelf: "flex-start", gap: 6 }}
            onClick={() => navigate("/admin/users")}
          >
            <ArrowLeft size={16} /> Back to Users
          </button>

          {/* ── Page header ── */}
          <div style={{ borderLeft: "4px solid var(--primary)", paddingLeft: 16 }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Admin / Users / @{user.username}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <User size={20} color="var(--primary)" />
              <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--text-primary)" }}>
                Edit User
              </h2>
              {/* Status pill */}
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "2px 10px", borderRadius: "var(--radius-pill)",
                background: formData.isActive ? "var(--green-subtle)" : "var(--red-subtle)",
                fontSize: "var(--text-xs)", fontWeight: 700,
                color: formData.isActive ? "var(--green-ac)" : "var(--red-wa)",
              }}>
                {formData.isActive ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
                {formData.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          {/* ── Avatar card ── */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 18 }}>
              Profile Picture
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div
                style={{ position: "relative", cursor: "pointer", flexShrink: 0 }}
                onMouseEnter={() => setIsHoveringAvatar(true)}
                onMouseLeave={() => setIsHoveringAvatar(false)}
                onClick={() => setIsUploadModalOpen(true)}
              >
                {previewImage ? (
                  <img src={previewImage} alt={user.username} style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--primary)", display: "block" }} />
                ) : (
                  <div style={{ width: 88, height: 88, borderRadius: "50%", background: "var(--primary-subtle)", border: "3px solid var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "var(--primary)" }}>
                    {initials(user.username)}
                  </div>
                )}
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.55)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                  opacity: isHoveringAvatar ? 1 : 0, transition: "opacity 0.15s",
                }}>
                  <Camera size={20} color="white" />
                  <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>Edit</span>
                </div>
              </div>
              <div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ border: "1px solid var(--border-default)", marginBottom: 8 }}
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  <Camera size={13} /> Upload Photo
                </button>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", lineHeight: 1.6 }}>
                  JPG, PNG or GIF · Max 5 MB
                </div>
              </div>
            </div>
          </div>

          {/* ── Basic info card ── */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 18 }}>
              Basic Information
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Username — read only */}
              <div>
                <label style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Username</label>
                <input className="input w-full" value={user.username} readOnly style={{ cursor: "not-allowed", opacity: 0.55, background: "var(--bg-overlay)" }} />
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 4 }}>Username cannot be changed.</div>
              </div>

              {/* Display name */}
              <div>
                <label style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Display Name</label>
                <input className="input w-full" name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter display name" />
              </div>

              {/* Email */}
              <div>
                <label style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</label>
                <input className="input w-full" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="Enter email address" />
              </div>

              {/* About */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>About</label>
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: aboutColor }}>{formData.about.length} / {MAX_ABOUT}</span>
                </div>
                <textarea
                  className="input w-full"
                  name="about"
                  value={formData.about}
                  onChange={handleInputChange}
                  placeholder="About this user…"
                  rows={3}
                  style={{ resize: "vertical", lineHeight: 1.6 }}
                />
                <div style={{ height: 2, borderRadius: 999, background: "var(--bg-overlay)", marginTop: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${aboutPct}%`, background: aboutColor, borderRadius: 999, transition: "width 0.2s, background 0.2s" }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Account status card ── */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16 }}>
              Account Status
            </div>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 16px", borderRadius: "var(--radius-md)",
              background: formData.isActive ? "var(--green-subtle)" : "var(--red-subtle)",
              border: `1px solid ${formData.isActive ? "var(--green-ac)" : "var(--red-wa)"}33`,
            }}>
              <div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: formData.isActive ? "var(--green-ac)" : "var(--red-wa)" }}>
                  {formData.isActive ? "Active" : "Inactive"}
                </div>
                <div style={{ fontSize: "var(--text-xs)", color: formData.isActive ? "var(--green-ac)" : "var(--red-wa)", marginTop: 2, opacity: 0.8 }}>
                  {formData.isActive ? "User can log in and access the platform" : "User is deactivated and cannot log in"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))}
                style={{
                  position: "relative", width: 44, height: 24, borderRadius: 12,
                  border: "none", cursor: "pointer", flexShrink: 0,
                  background: formData.isActive ? "var(--green-ac)" : "var(--border-default)",
                  boxShadow: formData.isActive ? "0 0 0 3px var(--green-subtle)" : "inset 0 0 0 1px var(--border-default)",
                  transition: "background 0.18s, box-shadow 0.18s",
                }}
              >
                <span style={{
                  position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%",
                  background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                  left: formData.isActive ? 23 : 3, transition: "left 0.18s",
                }} />
              </button>
            </div>
          </div>

          {/* ── Roles card ── */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Roles
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {selectedRoles.map((role) => {
                  const s = ROLE_META[role] || { bg: "var(--bg-raised)", color: "var(--text-secondary)" };
                  return (
                    <span key={role} style={{ display: "inline-flex", padding: "2px 8px", borderRadius: "var(--radius-pill)", fontSize: 10, fontWeight: 700, background: s.bg, color: s.color }}>
                      {role}
                    </span>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {AVAILABLE_ROLES.map((role) => {
                const isChecked = selectedRoles.includes(role);
                const s = ROLE_META[role];
                const Icon = s.icon;
                return (
                  <div
                    key={role}
                    onClick={() => handleRoleToggle(role)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px", borderRadius: "var(--radius-md)", cursor: "pointer",
                      border: `1.5px solid ${isChecked ? s.color + "55" : "var(--border-subtle)"}`,
                      background: isChecked ? s.bg : "var(--bg-surface)",
                      transition: "all 0.12s",
                    }}
                    onMouseEnter={(e) => { if (!isChecked) e.currentTarget.style.borderColor = "var(--border-default)"; }}
                    onMouseLeave={(e) => { if (!isChecked) e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      border: `2px solid ${isChecked ? s.color : "var(--border-default)"}`,
                      background: isChecked ? s.color : "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.12s",
                    }}>
                      {isChecked && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>

                    {/* Role icon */}
                    <div style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", flexShrink: 0, background: isChecked ? s.color + "22" : "var(--bg-overlay)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={14} color={isChecked ? s.color : "var(--text-muted)"} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: isChecked ? s.color : "var(--text-primary)" }}>{role}</div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 1 }}>{s.desc}</div>
                    </div>

                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--radius-pill)",
                      background: isChecked ? s.bg : "var(--bg-overlay)",
                      color: isChecked ? s.color : "var(--text-muted)",
                      border: `1px solid ${isChecked ? s.color + "44" : "var(--border-subtle)"}`,
                    }}>
                      {isChecked ? "Assigned" : "Not assigned"}
                    </span>
                  </div>
                );
              })}
            </div>

            {selectedRoles.length === 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--red-wa)" }}>
                <AlertTriangle size={13} /> At least one role must be assigned.
              </div>
            )}
          </div>

          {/* ── Password card ── */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Lock size={16} color="var(--primary)" />
              </div>
              <div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-primary)" }}>Reset Password</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 1 }}>Leave blank to keep the current password.</div>
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                New Password
              </label>
              <PasswordField value={formData.password} onChange={handleInputChange} />
            </div>
          </div>

          {/* ── Actions ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => navigate("/admin/users")}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || selectedRoles.length === 0}
              style={{ gap: 8, minWidth: 130 }}
            >
              {saving
                ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Saving…</>
                : <><Save size={14} /> Save Changes</>
              }
            </button>
          </div>

        </div>
      </div>

      <AvatarUploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} currentAvatar={previewImage} onSave={handleSaveAvatar} />
      <ConfirmDialog />
    </div>
  );
};

export default AdminEditUserPage;
