import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, X, Book, Trophy, Users, Building2, User, Star, Globe, Lock,
} from "lucide-react";
import ApiService from "../../services/ApiService";

const MIN_CHARS  = 2;
const DEBOUNCE   = 300;
const PER_GROUP  = 5;

const groupMeta = {
  problems:      { label: "Problems",      icon: Book,       path: "/problems"      },
  users:         { label: "Users",         icon: User,       path: "/users"         },
  contests:      { label: "Contests",      icon: Trophy,     path: "/contests"      },
  organizations: { label: "Organizations", icon: Building2,  path: "/organizations" },
};

export default function GlobalSearchBar() {
  const navigate = useNavigate();

  const [query, setQuery]     = useState("");
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({
    problems: [], users: [], contests: [], organizations: [],
  });
  const [highlight, setHighlight] = useState(0);

  const wrapperRef = useRef(null);
  const inputRef   = useRef(null);
  const reqIdRef   = useRef(0);

  const flatList = useMemo(() => {
    const items = [];
    for (const key of ["problems", "users", "contests", "organizations"]) {
      for (const item of results[key]) items.push({ group: key, item });
    }
    return items;
  }, [results]);

  useEffect(() => {
    if (query.trim().length < MIN_CHARS) {
      setResults({ problems: [], users: [], contests: [], organizations: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    const myId = ++reqIdRef.current;
    const t = setTimeout(async () => {
      try {
        const data = await ApiService.globalSearch(query, PER_GROUP);
        if (myId === reqIdRef.current) {
          setResults(data);
          setHighlight(0);
        }
      } catch {
        if (myId === reqIdRef.current) {
          setResults({ problems: [], users: [], contests: [], organizations: [] });
        }
      } finally {
        if (myId === reqIdRef.current) setLoading(false);
      }
    }, DEBOUNCE);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const tag = e.target?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      } else if (e.key === "/" && !inField) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const closeAndClear = () => {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const goToItem = ({ group, item }) => {
    if (group === "problems")      navigate(`/problems/${item.slug}`);
    if (group === "users")         navigate(`/users/${item.username}`);
    if (group === "contests")      navigate(`/contests/${item.slug}`);
    if (group === "organizations") navigate(`/organizations/${item.slug}`);
    closeAndClear();
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") { closeAndClear(); return; }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(0, flatList.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (flatList[highlight]) {
        e.preventDefault();
        goToItem(flatList[highlight]);
      } else if (query.trim().length >= MIN_CHARS) {
        navigate(`/problems?q=${encodeURIComponent(query.trim())}`);
        closeAndClear();
      }
    }
  };

  const hasAnyResults = flatList.length > 0;
  const showDropdown  = open && query.trim().length >= MIN_CHARS;

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", flex: 1, maxWidth: 420, minWidth: 200 }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", gap: "var(--space-2)",
          padding: "var(--space-2) var(--space-3)",
          border: open
            ? "1px solid var(--primary)"
            : "1px solid var(--border-default)",
          borderRadius: "var(--radius-pill)",
          background: "var(--bg-raised)",
          boxShadow: open ? "0 0 0 3px var(--primary-glow)" : "none",
          transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
        }}
        onClick={() => inputRef.current?.focus()}
      >
        <Search size={15} color="var(--text-muted)" strokeWidth={2} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Search problems, users, contests, organizations…"
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          aria-label="Global search"
          style={{
            flex: 1, background: "transparent", outline: "none", border: "none",
            fontSize: "var(--text-sm)", color: "var(--text-primary)",
            fontFamily: "var(--font-body)",
          }}
        />
        {loading && <div className="spinner" style={{ width: 14, height: 14 }} />}
        {query && !loading && (
          <button
            type="button"
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}
            aria-label="Clear"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
            zIndex: 300,
            background: "var(--bg-raised)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
            maxHeight: 480, overflowY: "auto",
          }}
        >
          {!hasAnyResults && !loading && (
            <div style={{ padding: "20px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No matches for "{query.trim()}"
            </div>
          )}

          {["problems", "users", "contests", "organizations"].map((groupKey) => {
            const items = results[groupKey];
            if (items.length === 0) return null;
            const G = groupMeta[groupKey];
            const Icon = G.icon;
            return (
              <div key={groupKey}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 14px",
                  background: "var(--primary-subtle)",
                  fontSize: "var(--text-xs)", fontWeight: 700,
                  color: "var(--primary)", textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  borderTop: "1px solid var(--border-subtle)",
                }}>
                  <Icon size={12} />
                  {G.label}
                </div>
                {items.map((item) => {
                  const flatIdx = flatList.findIndex(
                    (f) => f.group === groupKey && f.item === item,
                  );
                  const active = flatIdx === highlight;
                  return (
                    <ResultRow
                      key={`${groupKey}-${item.id ?? item.slug ?? item.username}`}
                      groupKey={groupKey}
                      item={item}
                      active={active}
                      onMouseEnter={() => setHighlight(flatIdx)}
                      onClick={() => goToItem({ group: groupKey, item })}
                    />
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    navigate(`${G.path}?q=${encodeURIComponent(query.trim())}`);
                    closeAndClear();
                  }}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "8px 14px",
                    background: "transparent", border: "none", cursor: "pointer",
                    fontSize: 12, color: "var(--primary)", fontWeight: 600,
                  }}
                >
                  View all {G.label.toLowerCase()} matching "{query.trim()}" →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResultRow({ groupKey, item, active, onMouseEnter, onClick }) {
  const rowStyle = {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px", cursor: "pointer",
    background: active ? "var(--primary-subtle)" : "transparent",
    borderTop: "1px solid var(--border-subtle)",
    transition: "background 0.1s",
  };

  if (groupKey === "problems") {
    return (
      <div style={rowStyle} onMouseEnter={onMouseEnter} onClick={onClick}>
        <Book size={14} color="var(--text-muted)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.title}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {item.problemDifficulty ?? "—"} · {item.point ?? 0} pts
          </div>
        </div>
      </div>
    );
  }

  if (groupKey === "users") {
    return (
      <div style={rowStyle} onMouseEnter={onMouseEnter} onClick={onClick}>
        {item.profileUrl ? (
          <img src={item.profileUrl} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--bg-overlay)", border: "1px solid var(--border-accent)", color: "var(--cyan)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {item.username?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
            {item.username}
          </div>
          {item.name && (
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.name}</div>
          )}
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--amber-tle)", fontWeight: 700 }}>
          <Star size={11} /> {item.rating ?? 0}
        </span>
      </div>
    );
  }

  if (groupKey === "contests") {
    return (
      <div style={rowStyle} onMouseEnter={onMouseEnter} onClick={onClick}>
        <Trophy size={14} color="var(--text-muted)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {item.contestStyle ?? "—"} · {item.totalProblems ?? 0} problems
          </div>
        </div>
      </div>
    );
  }

  if (groupKey === "organizations") {
    return (
      <div style={rowStyle} onMouseEnter={onMouseEnter} onClick={onClick}>
        <Building2 size={14} color="var(--text-muted)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            {item.isPublic ? <Globe size={10} /> : <Lock size={10} />}
            <Users size={10} /> {item.totalMembers ?? 0}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
