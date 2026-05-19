import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import { useConfirmDialog } from "../common/ConfirmDialog";
import AvatarUploadModal from "../common/AvatarUploadModal";

const EditProfilePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { showMessage } = useToast();
  const { ConfirmDialog, showConfirm } = useConfirmDialog();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    about: "",
  });

  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState("");

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await ApiService.getOwnProfile();
        if (response.statusCode === 200) {
          setUser(response.data);
          setFormData({
            name: response.data.name || "",
            about: response.data.about || "",
          });
          setPreviewImage(response.data.profileUrl || "");
        }
      } catch (exception) {
        showMessage(
          exception.response?.data?.message || exception.message,
          "error",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSaveAvatar = async (previewUrl, imageFile) => {
    try {
      setProfileImage(imageFile);
      setPreviewImage(previewUrl);
      showMessage("Avatar selected! Click 'Save Changes' to update.", "success");
    } catch (error) {
      showMessage("Failed to select avatar", "error");
    }
  };

  const handleSaveProfile = async () => {
    showConfirm(
      "Update Profile",
      "Are you sure you want to update your profile?",
      async () => {
        try {
          setSaving(true);

          const formDataToSend = new FormData();
          formDataToSend.append("name", formData.name);
          formDataToSend.append("about", formData.about);

          if (profileImage) {
            formDataToSend.append("imageFile", profileImage);
          }

          const response = await ApiService.updateProfile(formDataToSend);

          if (response.statusCode === 200) {
            showMessage("Profile updated successfully!", "success");
            setTimeout(() => {
              navigate(`/users/${user.username}`);
            }, 1500);
          }
        } catch (error) {
          showMessage(
            error.response?.data?.message || "Failed to update profile",
            "error",
          );
        } finally {
          setSaving(false);
        }
      },
    );
  };

  const handleDeactivateAccount = async () => {
    showConfirm(
      "Deactivate Account",
      "Are you sure you want to deactivate your account? This action cannot be undone.",
      async () => {
        try {
          const response = await ApiService.deactivateProfile();

          if (response.statusCode === 200) {
            ApiService.logout();
            showMessage("Account deactivated successfully", "success");
            navigate("/");
          }
        } catch (error) {
          showMessage(
            error.response?.data?.message || "Failed to deactivate account",
            "error",
          );
        }
      },
    );
  };

  const getInitials = (username) =>
    username ? username.substring(0, 2).toUpperCase() : "U";

  if (loading) {
    return (
      <div className="page-container" style={{ minHeight: "100vh" }}>
        <div
          className="flex flex-col items-center"
          style={{ gap: "var(--space-4)", padding: "80px 0" }}
        >
          <span className="spinner" />
          <span className="text-secondary text-sm">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-container" style={{ minHeight: "100vh" }}>
        <div
          className="flex flex-col items-center"
          style={{ gap: "var(--space-4)", padding: "80px 0" }}
        >
          <p className="text-2xl text-secondary">Failed to load profile</p>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ minHeight: "100vh", paddingTop: "var(--space-8)", paddingBottom: "var(--space-8)" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>
        <div className="flex flex-col" style={{ gap: "var(--space-6)" }}>

          {/* Header */}
          <div className="flex items-center" style={{ gap: "var(--space-4)" }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate(`/users/${user.username}`)}
              style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <h1 className="text-2xl font-bold text-primary" style={{ margin: 0 }}>
              Edit Profile
            </h1>
          </div>

          {/* Profile Picture Section */}
          <div className="card" style={{ padding: "var(--space-6)" }}>
            <h2
              className="text-lg font-semibold text-primary"
              style={{ margin: "0 0 var(--space-4)" }}
            >
              Profile Picture
            </h2>
            <div className="flex items-center" style={{ gap: "var(--space-6)" }}>
              {/* Avatar with hover overlay */}
              <div
                style={{ position: "relative", cursor: "pointer", flexShrink: 0 }}
                onMouseEnter={() => setIsHoveringAvatar(true)}
                onMouseLeave={() => setIsHoveringAvatar(false)}
                onClick={() => setIsUploadModalOpen(true)}
              >
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt={user.username}
                    style={{
                      width: "112px",
                      height: "112px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "3px solid var(--cyan)",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "112px",
                      height: "112px",
                      borderRadius: "50%",
                      background: "var(--bg-raised)",
                      border: "3px solid var(--cyan)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "2rem",
                      fontWeight: 700,
                      color: "var(--cyan)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {getInitials(user.username)}
                  </div>
                )}

                {/* Hover overlay */}
                {isHoveringAvatar && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.58)",
                      borderRadius: "50%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="white"
                    >
                      <path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
                      <path d="M21 5h-3.17l-1.24-1.35A1.99 1.99 0 0015.12 3H8.88c-.56 0-1.1.24-1.48.65L6.17 5H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V7a2 2 0 00-2-2zm-9 13a5.5 5.5 0 110-11 5.5 5.5 0 010 11z" />
                    </svg>
                    <span
                      style={{
                        color: "white",
                        fontSize: "var(--text-xs)",
                        fontWeight: 600,
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      Edit
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col" style={{ gap: "var(--space-1)" }}>
                <p className="text-sm text-secondary" style={{ margin: 0 }}>
                  Click on the avatar to upload a new profile picture
                </p>
                <p className="text-xs text-muted" style={{ margin: 0 }}>
                  JPG, PNG or GIF. Max size 5 MB.
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="card" style={{ padding: "var(--space-6)" }}>
            <h2
              className="text-lg font-semibold text-primary"
              style={{ margin: "0 0 var(--space-4)" }}
            >
              Basic Information
            </h2>
            <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
              {/* Username (read-only) */}
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  className="input"
                  value={user.username}
                  readOnly
                  style={{
                    cursor: "not-allowed",
                    opacity: 0.6,
                  }}
                />
                <p className="text-xs text-muted" style={{ margin: "var(--space-1) 0 0" }}>
                  Username cannot be changed
                </p>
              </div>

              {/* Display Name */}
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input
                  className="input"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your display name"
                />
              </div>

              {/* About */}
              <div className="form-group">
                <label className="form-label">About</label>
                <textarea
                  className="input"
                  name="about"
                  value={formData.about}
                  onChange={handleInputChange}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  style={{ resize: "vertical", minHeight: "100px" }}
                />
                <p className="text-xs text-muted" style={{ margin: "var(--space-1) 0 0" }}>
                  {formData.about.length} / 500 characters
                </p>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div
            className="card"
            style={{
              padding: "var(--space-5)",
              cursor: "pointer",
              transition: "var(--transition-fast)",
            }}
            onClick={() => navigate("/change-password")}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}
          >
            <div
              className="flex items-center"
              style={{ justifyContent: "space-between" }}
            >
              <div className="flex items-center" style={{ gap: "var(--space-3)" }}>
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
                  <span className="text-base font-semibold text-primary">
                    Password &amp; Security
                  </span>
                  <span className="text-sm text-secondary">
                    Change your password or update security settings
                  </span>
                </div>
              </div>
              <span className="text-sm text-cyan font-medium">Change →</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            className="flex items-center"
            style={{ justifyContent: "space-between", gap: "var(--space-4)" }}
          >
            <button
              className="btn btn-danger"
              onClick={handleDeactivateAccount}
            >
              Deactivate Account
            </button>

            <div className="flex items-center" style={{ gap: "var(--space-3)" }}>
              <button
                className="btn btn-ghost"
                onClick={() => navigate(`/users/${user.username}`)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <span className="flex items-center" style={{ gap: "var(--space-2)" }}>
                    <span className="spinner" style={{ width: "14px", height: "14px" }} />
                    Saving...
                  </span>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Upload Modal */}
      <AvatarUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        currentAvatar={previewImage}
        onSave={handleSaveAvatar}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog />
    </div>
  );
};

export default EditProfilePage;
