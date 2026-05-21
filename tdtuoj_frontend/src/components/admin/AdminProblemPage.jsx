import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Book, Trophy,
  Plus, Edit, Trash2, SlidersHorizontal, X, ChevronDown, RotateCcw, AlertTriangle,
} from "lucide-react";
import SuggestiveSearch from "../common/SuggestiveSearch";
import Pagination from "../common/Pagination";
import FilterPills from "../common/FilterPills";
import SortBar from "../common/SortBar";
import ApiService from "../../services/ApiService";
import { useConfirmDialog } from "../common/ConfirmDialog";
import { useToast } from "../common/ToastMessage";

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];
const DIFF_STYLE = {
  EASY:   { hex: "var(--diff-easy)",   bg: "var(--green-subtle)",  label: "Easy" },
  MEDIUM: { hex: "var(--diff-medium)", bg: "var(--amber-subtle)", label: "Medium" },
  HARD:   { hex: "var(--diff-hard)",   bg: "var(--red-subtle)",   label: "Hard" },
};

const DiffBadge = ({ difficulty }) => {
  const s = DIFF_STYLE[difficulty];
  if (!s) return null;
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 600, background: s.bg, color: s.hex }}>
      {s.label}
    </span>
  );
};

const FilterPanel = ({ availableTags, selectedDifficulty, onDifficultyChange, selectedTagNames, toggleTag, onReset, hasActiveFilters }) => {
  const [tagSearch, setTagSearch] = useState("");
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setTagDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredTags = availableTags.filter(
    (t) => !selectedTagNames.includes(t.name) && t.name.toLowerCase().includes(tagSearch.toLowerCase())
  );
  const activeFilterCount = (selectedDifficulty ? 1 : 0) + selectedTagNames.length;

  return (
    <div style={{
      background: "var(--bg-raised)",
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--border-subtle)",
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      overflow: "visible",
    }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} color="var(--text-muted)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em" }}>FILTERS</span>
          {hasActiveFilters && (
            <span style={{ display: "inline-block", padding: "1px 8px", borderRadius: 9999, fontSize: 10, fontWeight: 600, background: "var(--primary-subtle)", color: "var(--primary)" }}>
              {activeFilterCount} active
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--text-muted)", gap: 4 }} onClick={onReset}>
            <RotateCcw size={11} /> Reset
          </button>
        )}
      </div>

      {/* Difficulty */}
      <div className="flex items-center" style={{ padding: "10px 16px", gap: 12, borderBottom: "1px solid var(--border-subtle)" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", minWidth: 70, flexShrink: 0 }}>Difficulty</span>
        <FilterPills
          value={selectedDifficulty}
          onChange={(v) => onDifficultyChange(v)}
          clearable
          options={[
            { value: "EASY",   label: "Easy",   accent: "var(--diff-easy)" },
            { value: "MEDIUM", label: "Medium", accent: "var(--diff-medium)" },
            { value: "HARD",   label: "Hard",   accent: "var(--diff-hard)" },
          ]}
        />
      </div>

      {/* Topics */}
      <div className="flex" style={{ padding: "10px 16px", gap: 12, alignItems: "flex-start" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", minWidth: 70, flexShrink: 0, marginTop: 2 }}>Topics</span>
        <div style={{ flex: 1 }}>
          {selectedTagNames.length > 0 && (
            <div className="flex flex-wrap gap-2" style={{ marginBottom: 10 }}>
              {selectedTagNames.map((name) => (
                <button
                  key={name}
                  onClick={() => toggleTag(name)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 8px", borderRadius: 9999,
                    background: "var(--primary-subtle)", color: "var(--primary)",
                    fontSize: 12, fontWeight: 500,
                    border: "1px solid var(--border-accent)", cursor: "pointer",
                  }}
                >
                  {name} <X size={10} />
                </button>
              ))}
            </div>
          )}

          <div style={{ position: "relative", display: "inline-block" }} ref={dropdownRef}>
            <button
              onClick={() => setTagDropdownOpen((v) => !v)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 12px",
                borderRadius: 9999,
                border: `1.5px dashed ${tagDropdownOpen ? "var(--primary)" : "var(--border-default)"}`,
                background: "transparent",
                color: tagDropdownOpen ? "var(--primary)" : "var(--text-muted)",
                fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
              }}
            >
              + Add topic
              <ChevronDown size={11} style={{ transform: tagDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
            </button>

            {tagDropdownOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50,
                background: "var(--bg-raised)", border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                width: 230, maxHeight: 260, overflowY: "auto",
              }}>
                <div style={{ padding: 8, borderBottom: "1px solid var(--border-subtle)", position: "sticky", top: 0, background: "var(--bg-raised)" }}>
                  <input
                    className="input"
                    style={{ fontSize: 13, padding: "4px 8px" }}
                    placeholder="Search topics..."
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                {filteredTags.length === 0 ? (
                  <div style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No topics found</span>
                  </div>
                ) : (
                  filteredTags.map((tag) => (
                    <div
                      key={tag.id}
                      style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)", transition: "background 0.1s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      onClick={() => { toggleTag(tag.name); setTagSearch(""); setTagDropdownOpen(false); }}
                    >
                      {tag.name}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminProblemPage = () => {
  const { ConfirmDialog, showConfirm } = useConfirmDialog();
  const { showMessage } = useToast();
  const navigate = useNavigate();

  const [problems, setProblems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const filterWrapperRef = useRef(null);
  const [pagination, setPagination] = useState({ limit: 10, offset: 0, totalElements: 0, totalPages: 0, currentPage: 0 });
  const [sortField, setSortField] = useState("id");
  const [direction, setDirection] = useState("asc");
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTagNames, setSelectedTagNames] = useState([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState("");

  const hasActiveFilters = selectedTagNames.length > 0 || selectedDifficulty !== "";
  const activeFilterCount = (selectedDifficulty ? 1 : 0) + selectedTagNames.length;

  useEffect(() => {
    ApiService.getAllTags({ limit: 200, offset: 0 })
      .then((res) => { if (res.statusCode === 200) setAvailableTags((res.data.content || []).filter((t) => t.isActive === true)); })
      .catch(console.error);
  }, []);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getAllProblems({ limit: pagination.limit, offset: pagination.offset, sortField, direction, title: searchQuery, tags: selectedTagNames, difficulty: selectedDifficulty });
      if (response.statusCode === 200) {
        setProblems(response.data.content);
        setPagination((prev) => ({ ...prev, totalElements: response.data.page.totalElements, totalPages: response.data.page.totalPages, currentPage: response.data.page.number }));
      }
    } catch (error) {
      showMessage(error.response?.data?.message || error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProblems(); }, [pagination.limit, pagination.offset, sortField, direction, selectedTagNames, selectedDifficulty]);
  useEffect(() => {
    const delay = setTimeout(() => { setPagination((prev) => ({ ...prev, offset: 0 })); fetchProblems(); }, 500);
    return () => clearTimeout(delay);
  }, [searchQuery]);
  useEffect(() => {
    const handler = (e) => {
      if (filterWrapperRef.current && !filterWrapperRef.current.contains(e.target))
        setShowFilters(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleTag = (name) => {
    setSelectedTagNames((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);
    setPagination((prev) => ({ ...prev, offset: 0 }));
  };
  const handleDifficultyChange = (d) => { setSelectedDifficulty(d); setPagination((prev) => ({ ...prev, offset: 0 })); };
  const resetFilters = () => { setSelectedTagNames([]); setSelectedDifficulty(""); setPagination((prev) => ({ ...prev, offset: 0 })); };
  const handleDeleteProblem = (id) =>
    showConfirm("Delete Problem", "Are you sure you want to delete this problem? This action cannot be undone.", async () => {
      try {
        const response = await ApiService.deleteProblem(id);
        if (response.statusCode === 200) { showMessage("Problem deleted successfully", "success"); fetchProblems(); }
      } catch (error) { showMessage(error.response?.data?.message || error.message, "error"); }
    });

  const handlePageChange = (o) => setPagination((p) => ({ ...p, offset: o }));
  const handleLimitChange = (l) => setPagination((p) => ({ ...p, limit: parseInt(l), offset: 0 }));
  const getInactiveTags = (problem) => (problem.tags || []).filter((t) => t.isActive === false);

  if (loading && problems.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0" }}>
        <div className="page-container">
          <div className="flex flex-col items-center gap-4" style={{ padding: "80px 0" }}>
            <div className="spinner" />
            <span className="text-muted">Loading problems...</span>
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
              <h2 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Manage Problems</h2>
              <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 9999, fontSize: 13, fontWeight: 600, background: "var(--primary-subtle)", color: "var(--primary)" }}>
                {pagination.totalElements} {pagination.totalElements === 1 ? "problem" : "problems"}
              </span>
            </div>
            <button className="btn btn-primary" onClick={() => navigate("/admin/problems/new")}>
              <Plus size={18} /> Add Problem
            </button>
          </div>

          <ConfirmDialog />

          {/* Search + Sort + Filters toggle */}
          <div className="flex items-center gap-3 flex-wrap">
            <SuggestiveSearch
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              suggestions={[
                "Search by problem title...",
                "Find 'Two Sum'",
                "Look up 'Graph' problems",
              ]}
              style={{ flex: 1, minWidth: 180, maxWidth: 320 }}
            />

            <SortBar
              field={sortField}
              direction={direction}
              onFieldChange={setSortField}
              onDirectionChange={setDirection}
              fields={[
                { value: "id",    label: "ID" },
                { value: "title", label: "Title" },
                { value: "point", label: "Points" },
              ]}
            />

            <div ref={filterWrapperRef} style={{ position: "relative" }}>
              <button
                onClick={() => setShowFilters((v) => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "6px 8px",
                  background: showFilters ? "var(--primary)" : "var(--bg-raised)",
                  color: showFilters ? "var(--text-inverse)" : "var(--text-secondary)",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${showFilters ? "var(--primary)" : "var(--border-default)"}`,
                  cursor: "pointer", transition: "all var(--transition-fast)",
                  fontFamily: "var(--font-body)",
                }}
                title="Filters"
              >
                <SlidersHorizontal size={16} />
                {activeFilterCount > 0 && (
                  <span style={{
                    background: showFilters ? "var(--text-inverse)" : "var(--primary)",
                    color: showFilters ? "var(--primary)" : "var(--text-inverse)",
                    borderRadius: 9999, width: 16, height: 16, fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 2,
                  }}>
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {showFilters && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", right: 0,
                  zIndex: 200, animation: "fadeUp 0.18s ease both", minWidth: 380,
                }}>
                  <FilterPanel
                    availableTags={availableTags}
                    selectedDifficulty={selectedDifficulty}
                    onDifficultyChange={handleDifficultyChange}
                    selectedTagNames={selectedTagNames}
                    toggleTag={toggleTag}
                    onReset={resetFilters}
                    hasActiveFilters={hasActiveFilters}
                  />
                </div>
              )}
            </div>
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
                  <th style={{ textAlign: "center", width: "7%", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>#</th>
                  <th style={{ width: "25%", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Problem</th>
                  <th style={{ width: "10%", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Difficulty</th>
                  <th style={{ width: "27%", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tags</th>
                  <th style={{ textAlign: "center", width: "10%", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Points</th>
                  <th style={{ textAlign: "center", width: "10%", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Time Limit</th>
                  <th style={{ textAlign: "center", width: "11%", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {problems.length > 0 ? (
                  problems.map((problem) => {
                    const inactiveTags = getInactiveTags(problem);
                    const hasInactiveTags = inactiveTags.length > 0;
                    return (
                      <tr key={problem.id}>
                        <td style={{ textAlign: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>{problem.id}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{problem.title}</span>
                            {hasInactiveTags && (
                              <span title={`${inactiveTags.length} disabled tag(s): ${inactiveTags.map((t) => t.name).join(", ")}. Edit this problem to remove them.`} style={{ color: "var(--amber-tle)", cursor: "help" }}>
                                <AlertTriangle size={14} />
                              </span>
                            )}
                          </div>
                        </td>
                        <td><DiffBadge difficulty={problem.problemDifficulty} /></td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {(problem.tags || [])
                              .slice()
                              .sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0))
                              .map((tag) => (
                                <span
                                  key={tag.id}
                                  style={{
                                    display: "inline-block", padding: "1px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 500,
                                    background: tag.isActive === false ? "var(--bg-raised)" : "var(--primary-subtle)",
                                    color: tag.isActive === false ? "var(--text-muted)" : "var(--primary)",
                                    opacity: tag.isActive === false ? 0.6 : 1,
                                    textDecoration: tag.isActive === false ? "line-through" : "none",
                                    border: tag.isActive === false ? "1px solid var(--border-default)" : "none",
                                  }}
                                  title={tag.isActive === false ? "This tag is disabled" : tag.name}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            {(!problem.tags || problem.tags.length === 0) && (
                              <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>No tags</span>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div className="flex items-center justify-center gap-1">
                            <Trophy size={14} color="var(--primary)" />
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{problem.point}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{problem.timeLimit}ms</span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div className="flex items-center justify-center gap-1">
                            <button className="btn btn-ghost btn-sm" title="Edit Problem" style={{ padding: "5px 7px" }} onClick={() => navigate(`/admin/problems/edit/${problem.id}`)}>
                              <Edit size={16} color="var(--primary)" />
                            </button>
                            <button className="btn btn-ghost btn-sm" title="Delete Problem" style={{ padding: "5px 7px" }} onClick={() => handleDeleteProblem(problem.id)}>
                              <Trash2 size={16} color="var(--red-wa)" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ padding: "56px 24px", textAlign: "center" }}>
                      <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--bg-overlay)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                        <Book size={22} color="var(--text-muted)" />
                      </div>
                      <div style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4 }}>
                        {hasActiveFilters || searchQuery ? "No problems match your filters" : "No problems yet"}
                      </div>
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: hasActiveFilters ? 12 : 0 }}>
                        {hasActiveFilters || searchQuery ? "Try adjusting your search or filters" : "Click 'Add Problem' to create your first problem"}
                      </div>
                      {hasActiveFilters && (
                        <button className="btn btn-ghost btn-sm" style={{ border: "1px solid var(--primary)", color: "var(--primary)" }} onClick={resetFilters}>
                          Clear all filters
                        </button>
                      )}
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

export default AdminProblemPage;
