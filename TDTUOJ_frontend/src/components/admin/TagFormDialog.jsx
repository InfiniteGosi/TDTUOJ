import { useState, useEffect } from "react";
import { Tag as TagIcon, Save } from "lucide-react";
import ApiService from "../../services/ApiService";

const TagFormDialog = ({ isOpen, tag, onSuccess, onError, onClose }) => {
  const isEditMode = !!tag;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", isActive: true });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData(tag ? { name: tag.name || "", isActive: tag.isActive ?? true } : { name: "", isActive: true });
      setErrors({});
    }
  }, [isOpen, tag]);

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = "Tag name is required";
    else if (formData.name.trim().length < 2) e.name = "Min 2 characters";
    else if (formData.name.trim().length > 50) e.name = "Max 50 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { name: formData.name.trim(), isActive: formData.isActive };
      if (isEditMode) {
        const r = await ApiService.updateTag({ id: tag.id, ...payload });
        r.statusCode === 200 ? onSuccess("Tag updated successfully") : onError(r.message || "Failed to update");
      } else {
        const r = await ApiService.createTag(payload);
        (r.statusCode === 201 || r.statusCode === 200) ? onSuccess("Tag created successfully") : onError(r.message || "Failed to create");
      }
    } catch (err) {
      onError(err.response?.data?.message || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(8,12,20,0.8)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--bg-base)", border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-xl)", padding: "var(--space-8)",
        width: "100%", maxWidth: 480,
        boxShadow: "var(--shadow-lg)",
        animation: "fadeUp 0.2s ease both",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--space-5)" }}>
          <TagIcon size={18} color="var(--primary)" />
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", color: "var(--text-primary)", margin: 0 }}>
            {isEditMode ? "Edit Tag" : "Create New Tag"}
          </h3>
        </div>

        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-5)" }}>
          {isEditMode ? "Update the tag details below." : "Fill in the details for the new tag."}
        </p>

        {/* Name field */}
        <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
          <label className="form-label">Tag Name <span style={{ color: "var(--red-wa)" }}>*</span></label>
          <input
            className="input"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleSubmit()}
            placeholder="e.g. Dynamic Programming, Graph, Greedy…"
            autoFocus
            style={errors.name ? { borderColor: "var(--red-wa)" } : {}}
          />
          {errors.name && <div className="form-error">{errors.name}</div>}
        </div>

        {/* Active toggle */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "var(--space-3) var(--space-4)",
          background: "var(--bg-raised)", borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)", marginBottom: "var(--space-6)",
        }}>
          <div>
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-primary)" }}>Active</div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Inactive tags won't be available for problems
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <div style={{
              width: 36, height: 20, borderRadius: 10, position: "relative",
              background: formData.isActive ? "var(--green-ac)" : "var(--bg-overlay)",
              border: "1px solid var(--border-default)",
              transition: "background var(--transition-base)",
              cursor: "pointer",
            }} onClick={() => handleChange("isActive", !formData.isActive)}>
              <div style={{
                position: "absolute", top: 2, left: formData.isActive ? 18 : 2,
                width: 14, height: 14, borderRadius: "50%",
                background: "#fff", transition: "left var(--transition-base)",
              }} />
            </div>
          </label>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)" }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              {isEditMode ? "Updating…" : "Creating…"}</>
              : <><Save size={14} />{isEditMode ? "Update Tag" : "Create Tag"}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TagFormDialog;
