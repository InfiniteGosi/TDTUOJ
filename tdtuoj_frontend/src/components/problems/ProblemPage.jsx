import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Book,
  Trophy,
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  RotateCcw,
  CheckCircle,
  Clock,
  Star,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import DifficultyChip from "../common/DifficultyChip";
import TagPill from "../common/TagPill";
import SuggestiveSearch from "../common/SuggestiveSearch";
import FilterPills from "../common/FilterPills";
import SortBar from "../common/SortBar";
import Pagination from "../common/Pagination";

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];

const DIFF_STYLE = {
  EASY:   { label: "Easy",   hex: "#00E676", bg: "rgba(0,230,118,0.08)" },
  MEDIUM: { label: "Medium", hex: "#FFB800", bg: "rgba(255,184,0,0.08)" },
  HARD:   { label: "Hard",   hex: "#FF3B3B", bg: "rgba(255,59,59,0.08)" },
};

// ─── Filter panel ─────────────────────────────────────────────────────────────

const FilterPanel = ({
  availableTags,
  selectedDifficulty,
  onDifficultyChange,
  selectedTagNames,
  toggleTag,
  onReset,
  hasActiveFilters,
}) => {
  const [tagSearch, setTagSearch] = useState("");
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setTagDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredTags = availableTags.filter(
    (t) =>
      !selectedTagNames.includes(t.name) &&
      t.name.toLowerCase().includes(tagSearch.toLowerCase()),
  );

  return (
    <div
      style={{
        background: "var(--bg-raised)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-subtle)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        overflow: "visible",
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} color="var(--text-muted)" />
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            FILTERS
          </span>
          {hasActiveFilters && (
            <span
              className="badge"
              style={{
                background: "var(--primary-subtle)",
                color: "var(--primary)",
                borderRadius: "var(--radius-pill)",
                fontSize: "10px",
                padding: "1px 8px",
              }}
            >
              {(selectedDifficulty ? 1 : 0) + selectedTagNames.length} active
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={onReset}
            style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)" }}
          >
            <RotateCcw size={11} />
            Reset
          </button>
        )}
      </div>

      {/* Filter rows */}
      <div>
        {/* ── Difficulty row ── */}
        <div
          className="flex items-center"
          style={{
            padding: "10px 16px",
            gap: 12,
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div className="flex items-center" style={{ minWidth: 70, flexShrink: 0 }}>
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Difficulty
            </span>
          </div>
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

        {/* ── Topics row ── */}
        <div
          className="flex"
          style={{ padding: "10px 16px", gap: 12, alignItems: "flex-start" }}
        >
          <div className="flex items-center" style={{ minWidth: 70, flexShrink: 0, marginTop: 2 }}>
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Topics
            </span>
          </div>

          <div style={{ flex: 1 }}>
            {/* Selected topic chips */}
            {selectedTagNames.length > 0 && (
              <div className="flex flex-wrap gap-2" style={{ marginBottom: 12 }}>
                {selectedTagNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => toggleTag(name)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      borderRadius: "var(--radius-pill)",
                      background: "var(--primary-subtle)",
                      color: "var(--primary)",
                      fontSize: "12px",
                      fontWeight: 500,
                      cursor: "pointer",
                      border: "1px solid var(--border-accent)",
                      outline: "none",
                    }}
                  >
                    <span>{name}</span>
                    <X size={10} />
                  </button>
                ))}
              </div>
            )}

            {/* Dropdown trigger */}
            <div style={{ position: "relative", display: "inline-block" }} ref={dropdownRef}>
              <button
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "5px 12px",
                  borderRadius: "var(--radius-pill)",
                  border: `1.5px dashed ${tagDropdownOpen ? "var(--primary)" : "var(--border-default)"}`,
                  background: "transparent",
                  color: tagDropdownOpen ? "var(--primary)" : "var(--text-muted)",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  outline: "none",
                }}
                onClick={() => setTagDropdownOpen((v) => !v)}
              >
                + Add topic
                <ChevronDown
                  size={11}
                  style={{
                    transform: tagDropdownOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.15s",
                  }}
                />
              </button>

              {tagDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    zIndex: 50,
                    background: "var(--bg-raised)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-lg)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    width: 230,
                    maxHeight: 260,
                    overflowY: "auto",
                  }}
                >
                  <div
                    style={{
                      padding: 8,
                      borderBottom: "1px solid var(--border-subtle)",
                      position: "sticky",
                      top: 0,
                      background: "var(--bg-raised)",
                    }}
                  >
                    <input
                      className="input"
                      style={{ fontSize: "var(--text-sm)", padding: "4px 8px" }}
                      placeholder="Search topics..."
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  {filteredTags.length === 0 ? (
                    <div style={{ padding: "12px 16px" }}>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        No topics found
                      </span>
                    </div>
                  ) : (
                    filteredTags.map((tag) => (
                      <div
                        key={tag.id}
                        style={{
                          padding: "8px 12px",
                          cursor: "pointer",
                          fontSize: "var(--text-sm)",
                          color: "var(--text-secondary)",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        onClick={() => {
                          toggleTag(tag.name);
                          setTagSearch("");
                          setTagDropdownOpen(false);
                        }}
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
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const ProblemPage = () => {
  const { showMessage } = useToast();
  const navigate = useNavigate();

  const [problems, setProblems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams] = useSearchParams();
  useEffect(() => { const q = searchParams.get("q"); if (q) setSearchQuery(q); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const filterWrapperRef = useRef(null);
  const [favoritesMode, setFavoritesMode] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [favLoading, setFavLoading] = useState(false);
  const [pagination, setPagination] = useState({
    limit: 10,
    offset: 0,
    totalElements: 0,
    totalPages: 0,
    currentPage: 0,
  });
  const [sortField, setSortField] = useState("id");
  const [direction, setDirection] = useState("asc");
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTagNames, setSelectedTagNames] = useState([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState("");

  const hasActiveFilters =
    selectedTagNames.length > 0 || selectedDifficulty !== "";
  const activeFilterCount =
    (selectedDifficulty ? 1 : 0) + selectedTagNames.length;

  // Load active tags once
  useEffect(() => {
    ApiService.getAllTags({ limit: 200, offset: 0 })
      .then((res) => {
        if (res.statusCode === 200)
          setAvailableTags(
            (res.data.content || []).filter((t) => t.isActive === true),
          );
      })
      .catch(console.error);
  }, []);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getAllProblems({
        limit: pagination.limit,
        offset: pagination.offset,
        sortField,
        direction,
        title: searchQuery,
        tags: selectedTagNames,
        difficulty: selectedDifficulty,
      });
      if (response.statusCode === 200) {
        setProblems(response.data.content);
        setPagination((prev) => ({
          ...prev,
          totalElements: response.data.page.totalElements,
          totalPages: response.data.page.totalPages,
          currentPage: response.data.page.number,
        }));
      }
    } catch (error) {
      showMessage(error.response?.data?.message || error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    if (!ApiService.isAuthenticated()) {
      showMessage("Please log in to view favorites", "warning");
      setFavoritesMode(false);
      return;
    }
    setFavLoading(true);
    try {
      const resp = await ApiService.getFavoriteProblems();
      if (resp.statusCode === 200) setFavorites(resp.data || []);
    } catch (error) {
      showMessage(error.response?.data?.message || error.message, "error");
    } finally {
      setFavLoading(false);
    }
  };

  const toggleFavoritesMode = () => {
    const next = !favoritesMode;
    setFavoritesMode(next);
    if (next) fetchFavorites();
  };

  useEffect(() => {
    fetchProblems();
  }, [
    pagination.limit,
    pagination.offset,
    sortField,
    direction,
    selectedTagNames,
    selectedDifficulty,
  ]);

  useEffect(() => {
    const delay = setTimeout(() => {
      setPagination((prev) => ({ ...prev, offset: 0 }));
      fetchProblems();
    }, 500);
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
    setSelectedTagNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
    setPagination((prev) => ({ ...prev, offset: 0 }));
  };

  const handleDifficultyChange = (d) => {
    setSelectedDifficulty(d);
    setPagination((prev) => ({ ...prev, offset: 0 }));
  };

  const resetFilters = () => {
    setSelectedTagNames([]);
    setSelectedDifficulty("");
    setPagination((prev) => ({ ...prev, offset: 0 }));
  };

  const handlePageChange = (o) => setPagination((p) => ({ ...p, offset: o }));
  const handleLimitChange = (l) =>
    setPagination((p) => ({ ...p, limit: parseInt(l), offset: 0 }));

  if (loading && problems.length === 0) {
    return (
      <div className="page-container" style={{ minHeight: "100vh", paddingTop: 32 }}>
        <div className="flex flex-col items-center justify-center" style={{ paddingTop: 80, paddingBottom: 80, gap: 16 }}>
          <div className="spinner spinner-lg" />
          <span style={{ color: "var(--text-muted)", fontSize: "var(--text-base)" }}>Loading problems...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ minHeight: "100vh", paddingTop: 32, paddingBottom: 32 }}>
      <div className="flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Problems
          </h2>
          <div className="flex items-center gap-3">
            {/* Favorites toggle */}
            {ApiService.isAuthenticated() && (
              <button
                onClick={toggleFavoritesMode}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  border: `1px solid ${favoritesMode ? "#F6C90E" : "var(--border-subtle)"}`,
                  background: favoritesMode ? "#F6C90E" : "var(--bg-raised)",
                  color: favoritesMode ? "#000" : "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  outline: "none",
                  whiteSpace: "nowrap",
                  fontSize: "var(--text-base)",
                  fontWeight: 500,
                }}
              >
                <Star size={15} fill={favoritesMode ? "#000" : "none"} />
                <span>
                  {favoritesMode ? "All Problems" : "Favorites"}
                  {!favoritesMode && favorites.length > 0 && (
                    <span
                      style={{
                        marginLeft: 8,
                        background: "#F6C90E",
                        color: "#000",
                        borderRadius: "var(--radius-pill)",
                        padding: "1px 8px",
                        fontSize: "var(--text-sm)",
                        fontWeight: 700,
                      }}
                    >
                      {favorites.length}
                    </span>
                  )}
                </span>
              </button>
            )}
            <span
              className="badge"
              style={{
                background: "var(--cyan-subtle)",
                color: "var(--cyan)",
                borderRadius: "var(--radius-pill)",
                fontSize: "var(--text-base)",
                padding: "4px 12px",
              }}
            >
              {favoritesMode ? favorites.length : pagination.totalElements}{" "}
              {(favoritesMode ? favorites.length : pagination.totalElements) === 1 ? "problem" : "problems"}
            </span>
          </div>
        </div>

        {/* Search + Sort + Filters toggle */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <SuggestiveSearch
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
            suggestions={[
              "Search by problem title...",
              "Try 'Two Sum'",
              "Find 'Binary Search' problems",
              "Explore 'Graph' algorithms",
              "Look up 'Dynamic Programming'",
            ]}
            style={{ flex: 1, minWidth: 180, maxWidth: 320 }}
          />

          {/* Sort */}
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

          {/* Filter toggle + dropdown */}
          <div ref={filterWrapperRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowFilters((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 8px",
                background: showFilters ? "var(--primary)" : "var(--bg-raised)",
                color: showFilters ? "var(--text-inverse)" : "var(--text-secondary)",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${showFilters ? "var(--primary)" : "var(--border-default)"}`,
                cursor: "pointer",
                transition: "all var(--transition-fast)",
                outline: "none",
                fontFamily: "var(--font-body)",
              }}
              title="Filters"
            >
              <SlidersHorizontal size={16} />
              {activeFilterCount > 0 && (
                <span
                  style={{
                    background: showFilters ? "var(--text-inverse)" : "var(--primary)",
                    color: showFilters ? "var(--primary)" : "var(--text-inverse)",
                    borderRadius: "var(--radius-pill)",
                    width: 16,
                    height: 16,
                    fontSize: "var(--text-xs)",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 2,
                  }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>

            {showFilters && !favoritesMode && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                zIndex: 200,
                animation: "fadeUp 0.18s ease both",
                minWidth: 380,
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

        {/* ── Favorites table ── */}
        {favoritesMode ? (
          <div
            style={{
              background: "var(--bg-raised)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {favLoading ? (
              <div
                className="flex justify-center"
                style={{ padding: "80px 0" }}
              >
                <div className="spinner" />
              </div>
            ) : favorites.length === 0 ? (
              <div style={{ padding: "64px 0", textAlign: "center" }}>
                <div className="flex flex-col items-center gap-3">
                  <Star size={44} color="var(--border-default)" />
                  <span className="text-lg font-medium" style={{ color: "var(--text-muted)" }}>
                    No favorites yet
                  </span>
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Open a problem and click Save to bookmark it
                  </span>
                </div>
              </div>
            ) : (
              <table className="table" style={{ width: "100%" }}>
                <thead>
                  <tr className="public-table-header">
                    <th style={{ textAlign: "center", width: "7%" }}>#</th>
                    <th style={{ width: "30%" }}>Problem</th>
                    <th style={{ width: "12%" }}>Difficulty</th>
                    <th style={{ width: "30%" }}>Topics</th>
                    <th style={{ textAlign: "center", width: "12%" }}>Points</th>
                    <th style={{ textAlign: "center", width: "9%" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {favorites.map((problem, index) => {
                    const activeTags = (problem.tags || []).filter((t) => t.isActive !== false);
                    return (
                      <tr
                        key={problem.id}
                        style={{
                          background: index % 2 === 0 ? "var(--bg-raised)" : "var(--bg-overlay)",
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-subtle)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = index % 2 === 0 ? "var(--bg-raised)" : "var(--bg-overlay)"; }}
                        onClick={() => navigate(`/problems/${problem.slug}`)}
                      >
                        <td style={{ textAlign: "center" }}>
                          <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>{problem.id}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Star size={12} color="#F6C90E" fill="#F6C90E" />
                            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                              {problem.title}
                            </span>
                          </div>
                        </td>
                        <td>
                          <DifficultyChip difficulty={problem.problemDifficulty} />
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap gap-1">
                            {activeTags.length > 0 ? (
                              activeTags.map((tag) => (
                                <TagPill key={tag.id} label={tag.name} />
                              ))
                            ) : (
                              <span className="text-xs" style={{ color: "var(--text-muted)", fontStyle: "italic" }}>—</span>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div className="flex items-center justify-center gap-1">
                            <Trophy size={14} color="var(--cyan)" />
                            <span className="text-sm font-bold" style={{ color: "var(--cyan)" }}>{problem.point}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {problem.solved ? (
                            <span
                              style={{
                                display: "inline-flex",
                                padding: 8,
                                borderRadius: "var(--radius-md)",
                                background: "rgba(44,187,93,0.12)",
                                color: "#2cbb5d",
                              }}
                            >
                              <CheckCircle size={18} />
                            </span>
                          ) : problem.attempted ? (
                            <span
                              style={{
                                display: "inline-flex",
                                padding: 8,
                                borderRadius: "var(--radius-md)",
                                background: "rgba(249,115,22,0.12)",
                                color: "#f97316",
                              }}
                            >
                              <Clock size={18} />
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                padding: 8,
                                borderRadius: "var(--radius-md)",
                                background: "var(--cyan-subtle)",
                                color: "var(--cyan)",
                              }}
                            >
                              <Book size={18} />
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          /* ── Problems table ── */
          <div
            style={{
              background: "var(--bg-raised)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {loading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(15,15,15,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10,
                }}
              >
                <div className="spinner" />
              </div>
            )}

            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr className="public-table-header">
                  <th style={{ textAlign: "center", width: "7%" }}>#</th>
                  <th style={{ width: "30%" }}>Problem</th>
                  <th style={{ width: "12%" }}>Difficulty</th>
                  <th style={{ width: "30%" }}>Topics</th>
                  <th style={{ textAlign: "center", width: "12%" }}>Points</th>
                  <th style={{ textAlign: "center", width: "9%" }}>Solve</th>
                </tr>
              </thead>

              <tbody>
                {problems.length > 0 ? (
                  problems.map((problem, index) => {
                    const activeTags = (problem.tags || []).filter(
                      (t) => t.isActive !== false,
                    );
                    return (
                      <tr
                        key={problem.id}
                        style={{
                          background: index % 2 === 0 ? "var(--bg-raised)" : "var(--bg-overlay)",
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-subtle)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = index % 2 === 0 ? "var(--bg-raised)" : "var(--bg-overlay)"; }}
                        onClick={() => navigate(`/problems/${problem.slug}`)}
                      >
                        {/* ID */}
                        <td style={{ textAlign: "center" }}>
                          <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
                            {problem.id}
                          </span>
                        </td>

                        {/* Title */}
                        <td>
                          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            {problem.title}
                          </span>
                        </td>

                        {/* Difficulty */}
                        <td>
                          <DifficultyChip difficulty={problem.problemDifficulty} />
                        </td>

                        {/* Active tags — clicking a tag adds it as a filter */}
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap gap-1">
                            {activeTags.length > 0 ? (
                              activeTags.map((tag) => (
                                <TagPill
                                  key={tag.id}
                                  label={tag.name}
                                  active={selectedTagNames.includes(tag.name)}
                                  onClick={() => {
                                    toggleTag(tag.name);
                                    if (!showFilters) setShowFilters(true);
                                  }}
                                />
                              ))
                            ) : (
                              <span className="text-xs" style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                                —
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Points */}
                        <td style={{ textAlign: "center" }}>
                          <div className="flex items-center justify-center gap-1">
                            <Trophy size={14} color="var(--cyan)" />
                            <span className="text-sm font-bold" style={{ color: "var(--cyan)" }}>
                              {problem.point}
                            </span>
                          </div>
                        </td>

                        {/* Solve status */}
                        <td style={{ textAlign: "center" }}>
                          {problem.solved ? (
                            <span
                              style={{
                                display: "inline-flex",
                                padding: 8,
                                borderRadius: "var(--radius-md)",
                                background: "rgba(44,187,93,0.12)",
                                color: "#2cbb5d",
                                transition: "all 0.15s",
                              }}
                            >
                              <CheckCircle size={18} />
                            </span>
                          ) : problem.attempted ? (
                            <span
                              style={{
                                display: "inline-flex",
                                padding: 8,
                                borderRadius: "var(--radius-md)",
                                background: "rgba(249,115,22,0.12)",
                                color: "#f97316",
                                transition: "all 0.15s",
                              }}
                            >
                              <Clock size={18} />
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                padding: 8,
                                borderRadius: "var(--radius-md)",
                                background: "var(--cyan-subtle)",
                                color: "var(--cyan)",
                                transition: "all 0.15s",
                              }}
                            >
                              <Book size={18} />
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "48px 0" }}>
                      <div className="flex flex-col items-center gap-3">
                        <Book size={44} color="var(--border-default)" />
                        <span className="text-lg font-medium" style={{ color: "var(--text-muted)" }}>
                          {hasActiveFilters || searchQuery
                            ? "No problems match your filters"
                            : "No problems yet"}
                        </span>
                        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                          {hasActiveFilters || searchQuery
                            ? "Try adjusting your search or filters"
                            : "Check back later!"}
                        </span>
                        {hasActiveFilters && (
                          <button className="btn btn-ghost btn-sm" onClick={resetFilters}>
                            Clear all filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
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
        )}

      </div>
    </div>
  );
};

export default ProblemPage;
