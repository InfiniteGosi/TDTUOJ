import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import { useConfirmDialog } from "../common/ConfirmDialog";

const ChangePasswordPage = () => {
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { showMessage } = useToast();
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

  const handleChangePassword = async () => {
    if (!formData.currentPassword) {
      showMessage("Please enter your current password", "error");
      return;
    }

    if (!formData.newPassword) {
      showMessage("Please enter a new password", "error");
      return;
    }

    if (formData.newPassword.length < 6) {
      showMessage("Password must be at least 6 characters", "error");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      showMessage("New passwords do not match", "error");
      return;
    }

    showConfirm(
      "Change Password",
      "Are you sure you want to change your password?",
      async () => {
        try {
          setSaving(true);

          const passwordData = {
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword,
            confirmPassword: formData.confirmPassword,
          };

          const response = await ApiService.changePassword(passwordData);

          if (response.statusCode === 200) {
            showMessage("Password changed successfully!", "success");
            setFormData({
              currentPassword: "",
              newPassword: "",
              confirmPassword: "",
            });
            setTimeout(() => {
              navigate("/profile");
            }, 1500);
          }
        } catch (error) {
          showMessage(
            error.response?.data?.message || "Failed to change password",
            "error",
          );
        } finally {
          setSaving(false);
        }
      },
    );
  };

  const isSubmitDisabled =
    saving ||
    !formData.currentPassword ||
    !formData.newPassword ||
    !formData.confirmPassword;

  return (
    <div
      className="page-container"
      style={{
        minHeight: "100vh",
        paddingTop: "var(--space-8)",
        paddingBottom: "var(--space-8)",
      }}
    >
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>
        <div className="flex flex-col" style={{ gap: "var(--space-6)" }}>

          {/* Header */}
          <div className="flex items-center" style={{ gap: "var(--space-4)" }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate("/profile")}
              style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <h1 className="text-2xl font-bold text-primary" style={{ margin: 0 }}>
              Change Password
            </h1>
          </div>

          {/* Security card */}
          <div className="card" style={{ padding: "var(--space-6)" }}>
            {/* Card header row */}
            <div
              className="flex items-center"
              style={{ gap: "var(--space-3)", marginBottom: "var(--space-5)" }}
            >
              <div
                style={{
                  padding: "var(--space-2)",
                  background: "var(--cyan-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--cyan)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Lock size={22} />
              </div>
              <div className="flex flex-col" style={{ gap: "2px" }}>
                <span className="text-base font-semibold text-primary">Security</span>
                <span className="text-sm text-secondary">
                  Update your password to keep your account secure
                </span>
              </div>
            </div>

            {/* Form fields */}
            <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  className="input"
                  name="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  className="input"
                  name="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted" style={{ margin: "var(--space-1) 0 0" }}>
                  Password must be at least 6 characters long
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  className="input"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </div>

              {/* Tip banner */}
              {formData.newPassword && (
                <div
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    background: "var(--cyan-subtle)",
                    border: "1px solid var(--border-accent)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <p
                    className="text-sm"
                    style={{ margin: 0, color: "var(--cyan)" }}
                  >
                    💡 Tip: Use a mix of letters, numbers, and symbols for a
                    stronger password
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div
            className="flex items-center"
            style={{ justifyContent: "flex-end", gap: "var(--space-3)" }}
          >
            <button
              className="btn btn-ghost"
              onClick={() => navigate("/profile")}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleChangePassword}
              disabled={isSubmitDisabled}
            >
              {saving ? (
                <span className="flex items-center" style={{ gap: "var(--space-2)" }}>
                  <span className="spinner" style={{ width: "14px", height: "14px" }} />
                  Changing Password...
                </span>
              ) : (
                "Change Password"
              )}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog />
    </div>
  );
};

export default ChangePasswordPage;
