import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, UserPlus, Shield, User, Eye, EyeOff,
  Crown, AlertTriangle, CheckCircle,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";

// ─── Constants ────────────────────────────────────────────────────────────────

const AVAILABLE_ROLES = ["PARTICIPANT", "CREATOR", "ADMIN"];

const ROLE_META = {
  ADMIN:       { bg: "var(--red-subtle)",     color: "var(--red-wa)",    icon: Shield, desc: "Full platform access and user management" },
  CREATOR:     { bg: "var(--amber-subtle)",   color: "var(--amber-tle)", icon: Crown,  desc: "Can create and manage problems and contests" },
  PARTICIPANT: { bg: "var(--primary-subtle)", color: "var(--primary)",   icon: User,   desc: "Standard user — can compete and submit" },
};

// ─── PasswordField ────────────────────────────────────────────────────────────

const PasswordField = ({ id, name, value, onChange, placeholder = "••••••••" }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        id={id}
        className="input w-full"
        name={name}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
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

// ─── AdminRegisterUserPage ────────────────────────────────────────────────────

const AdminRegisterUserPage = () => {
  const navigate = useNavigate();
  const { showMessage } = useToast();

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    isActive: true,
  });
  const [selectedRoles, setSelectedRoles] = useState(["PARTICIPANT"]);

  // ── Field helpers ────────────────────────────────────────────────────────────

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleToggle = (role) =>
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );

  // ── Validation ───────────────────────────────────────────────────────────────

  const validate = () => {
    const { username, email, password, confirmPassword } = formData;
    if (!username || !email || !password || !confirmPassword) {
      showMessage("All fields are required.", "error"); return false;
    }
    if (username.length < 3 || username.length > 20) {
      showMessage("Username must be 3–20 characters.", "error"); return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      showMessage("Username: letters, numbers, underscores, hyphens only.", "error"); return false;
    }
    if (!/^[a-zA-Z0-9]/.test(username)) {
      showMessage("Username must start with a letter or number.", "error"); return false;
    }
    if (password !== confirmPassword) {
      showMessage("Passwords do not match.", "error"); return false;
    }
    if (password.length < 6) {
      showMessage("Password must be at least 6 characters.", "error"); return false;
    }
    if (selectedRoles.length === 0) {
      showMessage("User must have at least one role.", "error"); return false;
    }
    return true;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // Step 1 — create the account via the public register endpoint
      const regRes = await ApiService.registerUser({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      if (regRes.statusCode !== 200) {
        showMessage(regRes.message || "Registration failed.", "error");
        return;
      }

      const newUserId = regRes.data?.id;

      // Step 2 — apply roles & isActive via admin update (if we have a user id
      // and the desired state differs from defaults)
      const needsAdminUpdate =
        newUserId &&
        (!selectedRoles.includes("PARTICIPANT") ||
          selectedRoles.length !== 1 ||
          !formData.isActive);

      if (needsAdminUpdate) {
        const fd = new FormData();
        fd.append("id", newUserId);
        fd.append("email", formData.email);
        fd.append("isActive", formData.isActive);
        selectedRoles.forEach((r) => fd.append("roleNames", r));
        await ApiService.updateUserAsAdmin(fd);
      }

      showMessage(`User "${formData.username}" created successfully!`, "success");
      setTimeout(() => navigate("/admin/users"), 1200);
    } catch (e) {
      showMessage(e.response?.data?.message || e.message || "Failed to create user.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

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
              Admin / Users / New
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <UserPlus size={20} color="var(--primary)" />
              <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--text-primary)" }}>
                Create User
              </h2>
            </div>
          </div>

          {/* ── Account info card ── */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 18 }}>
              Account Information
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Username */}
              <div>
                <label htmlFor="reg-username" style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Username <span style={{ color: "var(--red-wa)" }}>*</span>
                </label>
                <input
                  id="reg-username"
                  className="input w-full"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="e.g. nguyen_van_a"
                  minLength={3}
                  maxLength={20}
                />
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 4 }}>
                  3–20 chars · letters, numbers, underscores, hyphens only
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="reg-email" style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Email <span style={{ color: "var(--red-wa)" }}>*</span>
                </label>
                <input
                  id="reg-email"
                  className="input w-full"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="user@student.tdtu.edu.vn"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="reg-password" style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Password <span style={{ color: "var(--red-wa)" }}>*</span>
                </label>
                <PasswordField
                  id="reg-password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                />
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 4 }}>
                  Minimum 6 characters
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="reg-confirm-password" style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Confirm Password <span style={{ color: "var(--red-wa)" }}>*</span>
                </label>
                <PasswordField
                  id="reg-confirm-password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Re-enter password"
                />
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, fontSize: "var(--text-xs)", color: "var(--red-wa)", fontWeight: 600 }}>
                    <AlertTriangle size={12} /> Passwords do not match
                  </div>
                )}
                {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, fontSize: "var(--text-xs)", color: "var(--green-ac)", fontWeight: 600 }}>
                    <CheckCircle size={12} /> Passwords match
                  </div>
                )}
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

          {/* ── Actions ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => navigate("/admin/users")}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={saving || selectedRoles.length === 0}
              style={{ gap: 8, minWidth: 140 }}
            >
              {saving
                ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Creating…</>
                : <><UserPlus size={14} /> Create User</>
              }
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminRegisterUserPage;
