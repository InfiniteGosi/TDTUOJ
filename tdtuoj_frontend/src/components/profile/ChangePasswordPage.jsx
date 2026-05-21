import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Eye, EyeOff, ShieldCheck, Save } from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import { useConfirmDialog } from "../common/ConfirmDialog";

// ─── Password strength ────────────────────────────────────────────────────────

const calcStrength = (pw) => {
  if (!pw) return { level: 0, label: "", color: "var(--bg-overlay)" };
  let score = 0;
  if (pw.length >= 8)                   score++;
  if (pw.length >= 12)                  score++;
  if (/[A-Z]/.test(pw))                 score++;
  if (/[0-9]/.test(pw))                 score++;
  if (/[^A-Za-z0-9]/.test(pw))         score++;
  if (score <= 1) return { level: 1, label: "Weak",   color: "var(--red-wa)"   };
  if (score <= 2) return { level: 2, label: "Fair",   color: "var(--amber-tle)" };
  if (score <= 3) return { level: 3, label: "Good",   color: "var(--blue-ce)"  };
                  return { level: 4, label: "Strong", color: "var(--green-ac)" };
};

const StrengthBar = ({ password }) => {
  const { level, label, color } = calcStrength(password);
  if (!password) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 999,
            background: i <= level ? color : "var(--bg-overlay)",
            transition: "background 0.2s",
          }} />
        ))}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );
};

// ─── PasswordField ────────────────────────────────────────────────────────────

const PasswordField = ({ label, name, value, onChange, placeholder, hint, showStrength, matchValue }) => {
  const [show, setShow] = useState(false);
  const matches = matchValue !== undefined && value && value === matchValue;
  const mismatch = matchValue !== undefined && value && value !== matchValue;

  return (
    <div>
      <label style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          className="input w-full"
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
          style={{
            paddingRight: 40,
            borderColor: matches ? "var(--green-ac)" : mismatch ? "var(--red-wa)" : undefined,
          }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-muted)", display: "flex", padding: 2,
            transition: "color 0.1s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {showStrength && <StrengthBar password={value} />}
      {matches && (
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--green-ac)", marginTop: 4 }}>
          Passwords match ✓
        </div>
      )}
      {mismatch && (
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--red-wa)", marginTop: 4 }}>
          Passwords do not match
        </div>
      )}
      {hint && !matches && !mismatch && (
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 4 }}>{hint}</div>
      )}
    </div>
  );
};

// ─── ChangePasswordPage ───────────────────────────────────────────────────────

const ChangePasswordPage = () => {
  const [saving, setSaving]   = useState(false);
  const navigate               = useNavigate();
  const { showMessage }        = useToast();
  const { ConfirmDialog, showConfirm } = useConfirmDialog();

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleChangePassword = () => {
    if (!formData.currentPassword) { showMessage("Enter current password", "error"); return; }
    if (!formData.newPassword)     { showMessage("Enter new password", "error"); return; }
    if (formData.newPassword.length < 6) { showMessage("Password must be at least 6 characters", "error"); return; }
    if (formData.newPassword !== formData.confirmPassword) { showMessage("Passwords do not match", "error"); return; }

    showConfirm("Change Password", "Are you sure you want to change your password?", async () => {
      try {
        setSaving(true);
        const res = await ApiService.changePassword({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        });
        if (res.statusCode === 200) {
          showMessage("Password changed!", "success");
          setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
          setTimeout(() => navigate("/profile"), 1500);
        }
      } catch (e) {
        showMessage(e.response?.data?.message || "Failed to change password", "error");
      } finally {
        setSaving(false);
      }
    });
  };

  const isDisabled =
    saving ||
    !formData.currentPassword ||
    !formData.newPassword ||
    !formData.confirmPassword ||
    formData.newPassword !== formData.confirmPassword;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0 64px" }}>
      <div className="page-container" style={{ maxWidth: 520 }}>
        <div className="flex flex-col gap-6">

          {/* ── Back ── */}
          <button
            className="btn btn-ghost btn-sm"
            style={{ alignSelf: "flex-start", gap: 6 }}
            onClick={() => navigate("/profile")}
          >
            <ArrowLeft size={16} /> Back to profile
          </button>

          {/* ── Page header ── */}
          <div style={{ borderLeft: "4px solid var(--primary)", paddingLeft: 16 }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Account / Security
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Lock size={20} color="var(--primary)" />
              <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--text-primary)" }}>
                Change Password
              </h2>
            </div>
          </div>

          {/* ── Form card ── */}
          <div className="card" style={{ padding: 24 }}>
            {/* Card icon header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, paddingBottom: 18, borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{
                width: 40, height: 40, borderRadius: "var(--radius-md)", flexShrink: 0,
                background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <ShieldCheck size={18} color="var(--primary)" />
              </div>
              <div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-primary)" }}>Update Password</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 1 }}>Keep your account secure with a strong password.</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <PasswordField
                label="Current Password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                placeholder="Enter current password"
              />

              <PasswordField
                label="New Password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="Enter new password"
                hint="Minimum 6 characters"
                showStrength
              />

              <PasswordField
                label="Confirm New Password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Repeat new password"
                matchValue={formData.newPassword}
              />
            </div>
          </div>

          {/* ── Actions ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => navigate("/profile")}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleChangePassword}
              disabled={isDisabled}
              style={{ gap: 8, minWidth: 150 }}
            >
              {saving
                ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Changing…</>
                : <><Save size={14} /> Change Password</>
              }
            </button>
          </div>

        </div>
      </div>
      <ConfirmDialog />
    </div>
  );
};

export default ChangePasswordPage;
