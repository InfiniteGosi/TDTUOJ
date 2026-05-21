import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, User, Camera, Save, ChevronRight, AlertTriangle } from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import { useConfirmDialog } from "../common/ConfirmDialog";
import AvatarUploadModal from "../common/AvatarUploadModal";

const MAX_ABOUT = 500;

const EditProfilePage = () => {
  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const navigate                  = useNavigate();
  const { showMessage }           = useToast();
  const { ConfirmDialog, showConfirm } = useConfirmDialog();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isHoveringAvatar, setIsHoveringAvatar]   = useState(false);

  const [formData, setFormData]     = useState({ name: "", about: "" });
  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await ApiService.getOwnProfile();
        if (res.statusCode === 200) {
          setUser(res.data);
          setFormData({ name: res.data.name || "", about: res.data.about || "" });
          setPreviewImage(res.data.profileUrl || "");
        }
      } catch (e) {
        showMessage(e.response?.data?.message || e.message, "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "about" && value.length > MAX_ABOUT) return;
    setFormData({ ...formData, [name]: value });
  };

  const handleSaveAvatar = (previewUrl, imageFile) => {
    setProfileImage(imageFile);
    setPreviewImage(previewUrl);
    showMessage("Avatar selected — click Save Changes to apply.", "success");
  };

  const handleSaveProfile = () => {
    showConfirm("Update Profile", "Save changes to your profile?", async () => {
      try {
        setSaving(true);
        const fd = new FormData();
        fd.append("name", formData.name);
        fd.append("about", formData.about);
        if (profileImage) fd.append("imageFile", profileImage);
        const res = await ApiService.updateProfile(fd);
        if (res.statusCode === 200) {
          showMessage("Profile updated!", "success");
          setTimeout(() => navigate(`/users/${user.username}`), 1500);
        }
      } catch (e) {
        showMessage(e.response?.data?.message || "Failed to update profile", "error");
      } finally {
        setSaving(false);
      }
    });
  };

  const handleDeactivateAccount = () => {
    showConfirm(
      "Deactivate Account",
      "This will permanently deactivate your account. This cannot be undone.",
      async () => {
        try {
          const res = await ApiService.deactivateProfile();
          if (res.statusCode === 200) {
            ApiService.logout();
            showMessage("Account deactivated.", "success");
            navigate("/");
          }
        } catch (e) {
          showMessage(e.response?.data?.message || "Failed to deactivate account", "error");
        }
      }
    );
  };

  const initials = (u) => (u ? u.substring(0, 2).toUpperCase() : "U");
  const aboutPct = Math.round((formData.about.length / MAX_ABOUT) * 100);
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
        <span style={{ fontSize: "var(--text-base)", color: "var(--text-secondary)" }}>Failed to load profile</span>
        <button className="btn btn-primary" onClick={() => navigate("/")}>Go Home</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0 64px" }}>
      <div className="page-container" style={{ maxWidth: 680 }}>
        <div className="flex flex-col gap-6">

          {/* ── Back ── */}
          <button
            className="btn btn-ghost btn-sm"
            style={{ alignSelf: "flex-start", gap: 6 }}
            onClick={() => navigate(`/users/${user.username}`)}
          >
            <ArrowLeft size={16} /> Back to profile
          </button>

          {/* ── Page header ── */}
          <div style={{ borderLeft: "4px solid var(--primary)", paddingLeft: 16 }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              @{user.username}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <User size={20} color="var(--primary)" />
              <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--text-primary)" }}>
                Edit Profile
              </h2>
            </div>
          </div>

          {/* ── Avatar card ── */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 18 }}>
              Profile Picture
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {/* Avatar */}
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
                    style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--primary)", display: "block" }}
                  />
                ) : (
                  <div style={{
                    width: 96, height: 96, borderRadius: "50%",
                    background: "var(--primary-subtle)", border: "3px solid var(--primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 28, fontWeight: 800, color: "var(--primary)",
                  }}>
                    {initials(user.username)}
                  </div>
                )}
                {/* Hover overlay */}
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: "rgba(0,0,0,0.55)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                  opacity: isHoveringAvatar ? 1 : 0, transition: "opacity 0.15s",
                }}>
                  <Camera size={22} color="white" />
                  <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>Edit</span>
                </div>
              </div>

              <div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ border: "1px solid var(--border-default)", marginBottom: 8 }}
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  <Camera size={14} /> Upload Photo
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
                <label style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Username
                </label>
                <input
                  className="input w-full"
                  value={user.username}
                  readOnly
                  style={{ cursor: "not-allowed", opacity: 0.55, background: "var(--bg-overlay)" }}
                />
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 4 }}>
                  Username cannot be changed.
                </div>
              </div>

              {/* Display name */}
              <div>
                <label style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Display Name
                </label>
                <input
                  className="input w-full"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter display name"
                />
              </div>

              {/* About */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    About
                  </label>
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: aboutColor }}>
                    {formData.about.length} / {MAX_ABOUT}
                  </span>
                </div>
                <textarea
                  className="input w-full"
                  name="about"
                  value={formData.about}
                  onChange={handleInputChange}
                  placeholder="Tell others about yourself…"
                  rows={4}
                  style={{ resize: "vertical", lineHeight: 1.6 }}
                />
                {/* Mini progress bar */}
                <div style={{ height: 2, borderRadius: 999, background: "var(--bg-overlay)", marginTop: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${aboutPct}%`, background: aboutColor, borderRadius: 999, transition: "width 0.2s, background 0.2s" }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Security link card ── */}
          <div
            className="card"
            style={{ padding: "14px 20px", cursor: "pointer", transition: "background 0.12s" }}
            onClick={() => navigate("/change-password")}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-overlay)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "var(--radius-md)", flexShrink: 0,
                  background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Lock size={17} color="var(--primary)" />
                </div>
                <div>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-primary)" }}>Password &amp; Security</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 1 }}>Change your password</div>
                </div>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </div>
          </div>

          {/* ── Actions ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            {/* Danger zone */}
            <button
              onClick={handleDeactivateAccount}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: "var(--radius-md)",
                border: "1px solid var(--red-wa)", background: "none",
                color: "var(--red-wa)", fontSize: "var(--text-xs)", fontWeight: 700, cursor: "pointer",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--red-subtle)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              <AlertTriangle size={14} /> Deactivate Account
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => navigate(`/users/${user.username}`)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveProfile}
                disabled={saving}
                style={{ gap: 8, minWidth: 120 }}
              >
                {saving
                  ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Saving…</>
                  : <><Save size={14} /> Save Changes</>
                }
              </button>
            </div>
          </div>

        </div>
      </div>

      <AvatarUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        currentAvatar={previewImage}
        onSave={handleSaveAvatar}
      />
      <ConfirmDialog />
    </div>
  );
};

export default EditProfilePage;
