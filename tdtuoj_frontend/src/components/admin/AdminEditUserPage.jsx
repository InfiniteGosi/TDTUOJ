import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Lock, Shield, User } from "lucide-react";
import ApiService from "../../services/ApiService";
import { useConfirmDialog } from "../common/ConfirmDialog";
import AvatarUploadModal from "../common/AvatarUploadModal";
import { useToast } from "../common/ToastMessage";

const AVAILABLE_ROLES = ["PARTICIPANT", "CREATOR", "ADMIN"];

const ROLE_BADGE = {
  ADMIN:       { bg: "var(--red-subtle)",     color: "var(--red-wa)" },
  CREATOR:     { bg: "var(--amber-subtle)",   color: "var(--amber-tle)" },
  PARTICIPANT: { bg: "var(--primary-subtle)", color: "var(--primary)" },
};

const getRoleIcon = (roleName) => {
  switch (roleName) {
    case "ADMIN": return <Shield size={14} />;
    case "CREATOR": return <User size={14} />;
    default: return null;
  }
};

const AdminEditUserPage = () => {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { ConfirmDialog, showConfirm } = useConfirmDialog();
  const { showMessage } = useToast();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);

  const [formData, setFormData] = useState({ name: "", about: "", email: "", password: "", isActive: true });
  const [selectedRoles, setSelectedRoles] = useState(["PARTICIPANT"]);
  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await ApiService.getUserByUserIdAsAdmin(userId);
        if (response.statusCode === 200) {
          const userData = response.data;
          setUser(userData);
          setFormData({ name: userData.name || "", about: userData.about || "", email: userData.email || "", password: "", isActive: userData.isActive ?? true });
          setPreviewImage(userData.profileUrl || "");
          setSelectedRoles(userData.roles?.map((r) => r.name) || ["PARTICIPANT"]);
        }
      } catch (error) { showMessage(error.response?.data?.message || error.message, "error"); } finally { setLoading(false); }
    };
    fetchUser();
  }, [userId]);

  const handleInputChange = (e) => { const { name, value } = e.target; setFormData((prev) => ({ ...prev, [name]: value })); };
  const handleRoleToggle = (role) => setSelectedRoles((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]);

  const handleSaveAvatar = (previewUrl, imageFile) => {
    setProfileImage(imageFile);
    setPreviewImage(previewUrl);
    showMessage("Avatar selected! Click 'Save Changes' to apply.", "success");
  };

  const handleSave = async () => {
    if (selectedRoles.length === 0) { showMessage("User must have at least one role.", "error"); return; }
    showConfirm("Update User", `Are you sure you want to update the account for "${user?.username}"?`, async () => {
      try {
        setSaving(true);
        const formDataToSend = new FormData();
        formDataToSend.append("id", user.id);
        formDataToSend.append("name", formData.name);
        formDataToSend.append("about", formData.about);
        formDataToSend.append("email", formData.email);
        formDataToSend.append("isActive", formData.isActive);
        if (formData.password) formDataToSend.append("password", formData.password);
        selectedRoles.forEach((role) => formDataToSend.append("roleNames", role));
        if (profileImage) formDataToSend.append("imageFile", profileImage);
        const response = await ApiService.updateUserAsAdmin(formDataToSend);
        if (response.statusCode === 200) { showMessage("User updated successfully!", "success"); setTimeout(() => navigate("/admin/users"), 1200); }
      } catch (error) { showMessage(error.response?.data?.message || "Failed to update user", "error"); } finally { setSaving(false); }
    });
  };

  const getInitials = (username) => username ? username.substring(0, 2).toUpperCase() : "U";

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0" }}>
        <div className="page-container" style={{ maxWidth: 700 }}>
          <div className="flex flex-col items-center gap-4" style={{ padding: "80px 0" }}>
            <div className="spinner" />
            <span className="text-muted">Loading user...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0" }}>
        <div className="page-container" style={{ maxWidth: 700 }}>
          <div className="flex flex-col items-center gap-4" style={{ padding: "80px 0" }}>
            <p style={{ fontSize: 24, color: "var(--text-muted)" }}>User not found</p>
            <button className="btn btn-primary" onClick={() => navigate("/admin/users")}>Back to Users</button>
          </div>
        </div>
      </div>
    );
  }

  const sectionCard = { background: "var(--bg-raised)", borderRadius: 10, border: "1px solid var(--border-subtle)", padding: 24 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0" }}>
      <div className="page-container" style={{ maxWidth: 700 }}>
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button className="btn btn-ghost" onClick={() => navigate("/admin/users")}>
              <ArrowLeft size={20} /> Back
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Edit User</h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>@{user.username}</p>
            </div>
          </div>

          {/* Profile Picture */}
          <div style={sectionCard}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Profile Picture</h3>
            <div className="flex items-center gap-6">
              <div
                style={{ position: "relative", cursor: "pointer" }}
                onMouseEnter={() => setIsHoveringAvatar(true)}
                onMouseLeave={() => setIsHoveringAvatar(false)}
                onClick={() => setIsUploadModalOpen(true)}
              >
                {previewImage ? (
                  <img src={previewImage} alt={user.username} style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: "4px solid var(--primary)" }} />
                ) : (
                  <div style={{ width: 120, height: 120, borderRadius: "50%", background: "var(--primary-subtle)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700, border: "4px solid var(--primary)" }}>
                    {getInitials(user.username)}
                  </div>
                )}
                {isHoveringAvatar && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", borderRadius: "50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="white" style={{ marginBottom: 8 }}>
                      <path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
                      <path d="M21 5h-3.17l-1.24-1.35A1.99 1.99 0 0015.12 3H8.88c-.56 0-1.1.24-1.48.65L6.17 5H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V7a2 2 0 00-2-2zm-9 13a5.5 5.5 0 110-11 5.5 5.5 0 010 11z" />
                    </svg>
                    <span style={{ color: "white", fontSize: 13, fontWeight: 500 }}>Edit</span>
                  </div>
                )}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>Click on the avatar to upload a new profile picture</p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>JPG, PNG or GIF. Max size 5MB.</p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div style={sectionCard}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Basic Information</h3>
            <div className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="input w-full" value={user.username} readOnly style={{ background: "var(--bg-raised)", cursor: "not-allowed" }} />
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-muted)" }}>Username cannot be changed</p>
              </div>
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input className="input w-full" name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter display name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="input w-full" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="Enter email address" />
              </div>
              <div className="form-group">
                <label className="form-label">About</label>
                <textarea className="input w-full" name="about" value={formData.about} onChange={handleInputChange} placeholder="About this user..." style={{ minHeight: 100, resize: "vertical" }} />
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-muted)" }}>{formData.about.length} / 500 characters</p>
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div style={sectionCard}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Account Status</h3>
            <div
              className="flex items-center justify-between"
              style={{ padding: 16, background: formData.isActive ? "var(--green-subtle)" : "var(--red-subtle)", borderRadius: 8, border: `1px solid ${formData.isActive ? "var(--green-subtle)" : "var(--red-subtle)"}` }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: formData.isActive ? "var(--green-ac)" : "var(--red-wa)" }}>{formData.isActive ? "Active" : "Inactive"}</p>
                <p style={{ margin: 0, fontSize: 13, color: formData.isActive ? "var(--green-ac)" : "var(--red-wa)" }}>
                  {formData.isActive ? "User can log in and access the platform" : "User is deactivated and cannot log in"}
                </p>
              </div>
              {/* Toggle */}
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))}
                style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: formData.isActive ? "var(--green-ac)" : "var(--border-default)", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
              >
                <span style={{ position: "absolute", top: 2, left: formData.isActive ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
              </button>
            </div>
          </div>

          {/* Roles */}
          <div style={sectionCard}>
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Roles</h3>
              <div className="flex items-center gap-2">
                {selectedRoles.map((role) => {
                  const s = ROLE_BADGE[role] || { bg: "var(--bg-raised)", color: "var(--text-secondary)" };
                  return (
                    <span key={role} style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{role}</span>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {AVAILABLE_ROLES.map((role) => {
                const isChecked = selectedRoles.includes(role);
                const s = ROLE_BADGE[role] || { bg: "var(--bg-overlay)", color: "var(--text-secondary)" };
                return (
                  <div
                    key={role}
                    style={{ padding: 16, border: `2px solid ${isChecked ? s.color + "66" : "var(--border-default)"}`, borderRadius: 10, background: isChecked ? s.bg : "var(--bg-overlay)", cursor: "pointer", transition: "all 0.2s" }}
                    onClick={() => handleRoleToggle(role)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Checkbox */}
                        <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isChecked ? s.color : "var(--border-strong)"}`, background: isChecked ? s.color : "var(--bg-overlay)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {isChecked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(role)}
                            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{role}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>
                            {role === "ADMIN" && "Full platform access and user management"}
                            {role === "CREATOR" && "Can create and manage content"}
                            {role === "PARTICIPANT" && "Standard user access"}
                          </p>
                        </div>
                      </div>
                      <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: isChecked ? s.bg : "transparent", color: isChecked ? s.color : "var(--text-muted)", border: isChecked ? "none" : `1px solid var(--border-default)` }}>
                        {isChecked ? "Assigned" : "Not assigned"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedRoles.length === 0 && (
              <p style={{ fontSize: 13, color: "#ef4444", marginTop: 8 }}>⚠ At least one role must be selected.</p>
            )}
          </div>

          {/* Security */}
          <div style={sectionCard}>
            <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
              <div style={{ padding: 8, background: "var(--primary-subtle)", borderRadius: 8, color: "var(--primary)" }}>
                <Lock size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Reset Password</h3>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Leave blank to keep the current password</p>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="input w-full" name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder="Enter new password (optional)" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4">
            <button className="btn btn-ghost" onClick={() => navigate("/admin/users")}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || selectedRoles.length === 0}>
              {saving ? <div className="spinner" style={{ width: 16, height: 16 }} /> : null}
              {saving ? "Saving..." : "Save Changes"}
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
