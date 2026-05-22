import { useState, useEffect } from "react";
import {
  Tag as TagIcon, Plus, Edit, Trash2,
} from "lucide-react";
import SuggestiveSearch from "../common/SuggestiveSearch";
import Pagination from "../common/Pagination";
import ApiService from "../../services/ApiService";
import SortBar from "../common/SortBar";
import { useConfirmDialog } from "../common/ConfirmDialog";
import { useToast } from "../common/ToastMessage";
import TagFormDialog from "./TagFormDialog";
import Toggle from "../common/Toggle";

const AdminProblemTagPage = () => {
  const { ConfirmDialog, showConfirm } = useConfirmDialog();
  const { showMessage } = useToast();
  const [tags, setTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [togglingIds, setTogglingIds] = useState(new Set());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [pagination, setPagination] = useState({ limit: 10, offset: 0, totalElements: 0, totalPages: 0, currentPage: 0 });
  const [sortField, setSortField] = useState("id");
  const [direction, setDirection] = useState("asc");

  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getAllTags({ limit: pagination.limit, offset: pagination.offset, sortField, direction, name: searchQuery });
      if (response.statusCode === 200) {
        setTags(response.data.content);
        setPagination((prev) => ({ ...prev, totalElements: response.data.page.totalElements, totalPages: response.data.page.totalPages, currentPage: response.data.page.number }));
      }
    } catch (error) { showMessage(error.response?.data?.message || error.message, "error"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchTags(); }, [pagination.limit, pagination.offset, sortField, direction]);
  useEffect(() => {
    const delaySearch = setTimeout(() => { setPagination((prev) => ({ ...prev, offset: 0 })); fetchTags(); }, 500);
    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const handleAddTag = () => { setEditingTag(null); setIsFormOpen(true); };
  const handleEditTag = (tag) => { setEditingTag(tag); setIsFormOpen(true); };
  const handleFormSuccess = (message) => { showMessage(message, "success"); setIsFormOpen(false); setEditingTag(null); fetchTags(); };

  const handleToggleActive = async (id) => {
    setTogglingIds((prev) => new Set(prev).add(id));
    try {
      const response = await ApiService.toggleTagActive(id);
      if (response.statusCode === 200) {
        setTags((prev) => prev.map((tag) => tag.id === id ? { ...tag, isActive: response.data.isActive } : tag));
        showMessage("Tag status updated successfully", "success");
      }
    } catch (error) { showMessage(error.response?.data?.message || error.message, "error"); } finally {
      setTogglingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const handleDeleteTag = (id) => {
    showConfirm("Delete Tag", "Are you sure you want to delete this tag? This action cannot be undone.", async () => {
      try {
        const response = await ApiService.deleteTag(id);
        if (response.statusCode === 200) { showMessage("Tag deleted successfully", "success"); fetchTags(); }
      } catch (error) { showMessage(error.response?.data?.message || error.message, "error"); }
    });
  };

  const handlePageChange = (newOffset) => setPagination((prev) => ({ ...prev, offset: newOffset }));
  const handleLimitChange = (newLimit) => setPagination((prev) => ({ ...prev, limit: parseInt(newLimit), offset: 0 }));

  if (loading && tags.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0" }}>
        <div className="page-container">
          <div className="flex flex-col items-center gap-4" style={{ padding: "80px 0" }}>
            <div className="spinner" />
            <span className="text-muted">Loading tags...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0" }}>
      <div className="page-container">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Manage Tags</h2>
              <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 9999, fontSize: 13, fontWeight: 600, background: "var(--primary-subtle)", color: "var(--primary)" }}>
                {pagination.totalElements} {pagination.totalElements === 1 ? "tag" : "tags"}
              </span>
            </div>
            <button className="btn btn-primary" onClick={handleAddTag}>
              <Plus size={20} /> Add Tag
            </button>
          </div>

          <ConfirmDialog />

          <TagFormDialog
            isOpen={isFormOpen}
            tag={editingTag}
            onSuccess={handleFormSuccess}
            onError={(msg) => showMessage(msg, "error")}
            onClose={() => { setIsFormOpen(false); setEditingTag(null); }}
          />

          {/* Search + Sort */}
          <div className="flex items-center gap-3 flex-wrap">
            <SuggestiveSearch
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              suggestions={["Search by tag name...", "Filter tags"]}
              style={{ width: 320 }}
            />
            <SortBar
              field={sortField}
              direction={direction}
              onFieldChange={setSortField}
              onDirectionChange={setDirection}
              fields={[
                { value: "id",   label: "ID" },
                { value: "name", label: "Name" },
              ]}
            />
          </div>

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
                  <th style={{ textAlign: "center", width: "10%", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>#</th>
                  <th style={{ width: "50%", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tag Name</th>
                  <th style={{ textAlign: "center", width: "20%", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</th>
                  <th style={{ textAlign: "center", width: "20%", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <tr key={tag.id}>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>{tag.id}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "var(--radius-sm)", background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <TagIcon size={13} color="var(--primary)" />
                          </div>
                          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>{tag.name}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <Toggle
                            value={tag.isActive}
                            onChange={() => handleToggleActive(tag.id)}
                            loading={togglingIds.has(tag.id)}
                            disabled={togglingIds.has(tag.id)}
                            color="var(--green-ac)"
                          />
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: tag.isActive ? "var(--green-ac)" : "var(--text-muted)", transition: "color var(--transition-base)" }}>
                            {tag.isActive ? "ON" : "OFF"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" title="Edit Tag" style={{ padding: "5px 8px" }} onClick={() => handleEditTag(tag)}>
                            <Edit size={14} color="var(--primary)" />
                          </button>
                          <button className="btn btn-ghost btn-sm" title="Delete Tag" style={{ padding: "5px 8px" }} onClick={() => handleDeleteTag(tag.id)}>
                            <Trash2 size={14} color="var(--red-wa)" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ padding: "56px 24px", textAlign: "center" }}>
                      <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--bg-overlay)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                        <TagIcon size={22} color="var(--text-muted)" />
                      </div>
                      <div style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4 }}>
                        {searchQuery ? "No tags match your search" : "No tags found"}
                      </div>
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                        {searchQuery ? "Try different search terms" : "Click 'Add Tag' to create your first tag"}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {pagination.totalPages > 0 && (
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={(p) => handlePageChange(p * pagination.limit)}
                totalElements={pagination.totalElements}
                limit={pagination.limit}
                onLimitChange={handleLimitChange}
                offset={pagination.offset}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProblemTagPage;
