# Global Search Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single multi-purpose search bar in the NavBar that searches Problems, Users, Contests, and Organizations simultaneously, displays grouped results inline, and navigates to the exact match on click.

**Architecture:** New `GlobalSearchBar.jsx` component mounted in the NavBar. Calls four existing list endpoints in parallel with a 300ms debounce (top 5 per category). Renders a dropdown with grouped sections, keyboard navigation, and "View all in X" footer links that deep-link to the respective list page with the query in the URL (`?q=`). Backend gets one small extension: `search` query param on `GET /api/contests` (currently missing). Each public list page is updated to read `?q=` from the URL and prefill its existing search input.

**Tech Stack:** React 19 + react-router-dom v7 + lucide-react icons + axios; Spring Boot 3.5 / JPA for backend search param.

---

## UX Spec

| Element | Behavior |
|---|---|
| Trigger | Always-visible pill input in NavBar (desktop); search-icon button opens full-screen overlay (mobile). |
| Keyboard | `Cmd/Ctrl+K` focuses; `/` focuses when not in input; `Esc` closes & blurs; `↑/↓` move selection; `Enter` opens selected. |
| Debounce | 300 ms after typing stops before firing requests. |
| Min chars | Fire only when query length ≥ 2 (avoid floods). |
| Result groups | Problems / Users / Contests / Organizations (top 5 each). Empty groups hidden. |
| Each result | Type icon + primary text + secondary text + (right-side) meta chip (e.g., difficulty for problems, rating for users, status for contests, member count for orgs). |
| Click result | `navigate(...)` to that entity's detail page, then close + clear input. |
| "View all" footer | Per-group link → `/{section}?q=<query>`. |
| Empty results | Show "No matches for X". |
| Loading | Small inline spinner inside the input on the right when fetching. |
| Auth | Works whether logged in or out — uses existing public endpoints. |

---

## File Map

**Backend (modify):**
- `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/repository/ContestRepository.java` — add `findByIsPublicTrueAndNameContainingIgnoreCase`
- `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service/ContestService.java` — extend signature with `search`
- `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service/ContestServiceImpl.java` — branch on non-blank search
- `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/controller/ContestController.java` — accept `search` query param

**Frontend (create):**
- `tdtuoj_frontend/src/components/common/GlobalSearchBar.jsx` — the search component

**Frontend (modify):**
- `tdtuoj_frontend/src/services/ApiService.js` — extend `getPublicContests`, add `globalSearch`
- `tdtuoj_frontend/src/components/common/NavBar.jsx` — mount GlobalSearchBar
- `tdtuoj_frontend/src/components/problems/ProblemPage.jsx` — read `?q=` from URL
- `tdtuoj_frontend/src/components/contests/ContestPage.jsx` — read `?q=` from URL
- `tdtuoj_frontend/src/components/organizations/OrganizationPage.jsx` — read `?q=` from URL
- `tdtuoj_frontend/src/components/users/UserPage.jsx` — read `?q=` from URL

---

## Task 1: Backend — add `search` param to public contests endpoint

**Files:**
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/repository/ContestRepository.java`
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service/ContestService.java`
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/service/ContestServiceImpl.java`
- Modify: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest/controller/ContestController.java`

- [ ] **Step 1: Add repository method**

In `ContestRepository.java`, alongside `findByIsPublicTrue`, add:

```java
Page<Contest> findByIsPublicTrueAndNameContainingIgnoreCase(String name, Pageable pageable);
```

- [ ] **Step 2: Update service interface**

In `ContestService.java`, change:

```java
Response<Page<ContestDTO>> getPublicContests(int page, int size);
```

to:

```java
Response<Page<ContestDTO>> getPublicContests(int page, int size, String search);
```

- [ ] **Step 3: Update service implementation**

In `ContestServiceImpl.java`, replace the method body of `getPublicContests`:

```java
@Override
public Response<Page<ContestDTO>> getPublicContests(int page, int size, String search) {
    if (size <= 0) size = 20;
    Pageable pageable = PageRequest.of(page, size,
            Sort.by(Sort.Direction.DESC, "startTime"));
    Page<Contest> pageEntities = (search != null && !search.isBlank())
            ? contestRepository.findByIsPublicTrueAndNameContainingIgnoreCase(search.trim(), pageable)
            : contestRepository.findByIsPublicTrue(pageable);
    Page<ContestDTO> dtoPage = pageEntities.map(this::toDTO);
    return Response.<Page<ContestDTO>>builder()
            .statusCode(HttpStatus.OK.value())
            .message("Contests retrieved successfully")
            .data(dtoPage)
            .build();
}
```

- [ ] **Step 4: Update controller**

In `ContestController.java`, replace the `getPublicContests` handler:

```java
@GetMapping
public ResponseEntity<Response<Page<ContestDTO>>> getPublicContests(
        @RequestParam(defaultValue = "0")  int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String search
) {
    return ResponseEntity.ok(contestService.getPublicContests(page, size, search));
}
```

- [ ] **Step 5: Verify backend compiles**

```bash
cd TDTUOJ_backend
./mvnw compile -q
```
Expected: BUILD SUCCESS.

- [ ] **Step 6: Commit**

```bash
git add TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/contest
git commit -m "feat(contest): add search param to public contests endpoint"
```

---

## Task 2: ApiService — extend getPublicContests + add globalSearch helper

**Files:**
- Modify: `tdtuoj_frontend/src/services/ApiService.js`

- [ ] **Step 1: Extend `getPublicContests`**

Find (line ~422):

```js
static async getPublicContests({ page = 0, size = 20 } = {}) {
  const resp = await axios.get(`${this.BASE_URL}/contests`, {
    headers: this.getHeader(),
    params: { page, size },
  });
  return resp.data;
}
```

Replace with:

```js
static async getPublicContests({ page = 0, size = 20, search = "" } = {}) {
  const params = { page, size };
  if (search) params.search = search;
  const resp = await axios.get(`${this.BASE_URL}/contests`, {
    headers: this.getHeader(),
    params,
  });
  return resp.data;
}
```

- [ ] **Step 2: Add `globalSearch` helper**

At the end of the `ApiService` class body (just before the closing `}`), insert:

```js
// ─── Global multi-resource search ──────────────────────────────────────────
static async globalSearch(query, perCategory = 5) {
  if (!query || query.trim().length < 2) {
    return { problems: [], users: [], contests: [], organizations: [] };
  }
  const q = query.trim();
  const [problems, users, contests, organizations] = await Promise.allSettled([
    this.getAllProblems({ limit: perCategory, offset: 0, title: q }),
    this.getAllUsers({ limit: perCategory, offset: 0, username: q }),
    this.getPublicContests({ page: 0, size: perCategory, search: q }),
    this.getOrganizations({ page: 0, size: perCategory, search: q }),
  ]);
  const extract = (r) => {
    if (r.status !== "fulfilled" || r.value?.statusCode !== 200) return [];
    const d = r.value.data;
    return d?.content ?? (Array.isArray(d) ? d : []);
  };
  return {
    problems:      extract(problems),
    users:         extract(users),
    contests:      extract(contests),
    organizations: extract(organizations),
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add tdtuoj_frontend/src/services/ApiService.js
git commit -m "feat(api): add globalSearch helper and search param on getPublicContests"
```

---

## Task 3: Create GlobalSearchBar component (skeleton + state + debounced fetch)

**Files:**
- Create: `tdtuoj_frontend/src/components/common/GlobalSearchBar.jsx`

- [ ] **Step 1: Create the file with full implementation**

```jsx
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

  // Flatten results into one ordered list for keyboard navigation
  const flatList = useMemo(() => {
    const items = [];
    for (const key of ["problems", "users", "contests", "organizations"]) {
      for (const item of results[key]) items.push({ group: key, item });
    }
    return items;
  }, [results]);

  // ── Debounced fetch ────────────────────────────────────────────────────
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

  // ── Close on outside click ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Global keybindings: Cmd/Ctrl+K and "/" ─────────────────────────────
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
        // Fallback: send to problems page with the query
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
      {/* Input */}
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

      {/* Dropdown */}
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

// ── Result row ────────────────────────────────────────────────────────────
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
```

- [ ] **Step 2: Commit**

```bash
git add tdtuoj_frontend/src/components/common/GlobalSearchBar.jsx
git commit -m "feat: add GlobalSearchBar component with grouped results and keyboard nav"
```

---

## Task 4: Mount GlobalSearchBar in NavBar

**Files:**
- Modify: `tdtuoj_frontend/src/components/common/NavBar.jsx`

- [ ] **Step 1: Add import**

Near the top of NavBar.jsx, add:

```jsx
import GlobalSearchBar from "./GlobalSearchBar";
```

- [ ] **Step 2: Place the search bar between nav links and right side**

Find the section (line ~93–108):

```jsx
{/* Desktop nav links */}
<div className="flex items-center gap-1 hide-mobile" style={{ flex: 1 }}>
  {NAV_LINKS.map(...)}
</div>
```

Replace with this two-column structure that pushes the search bar to the right of the nav links:

```jsx
{/* Desktop nav links */}
<div className="flex items-center gap-1 hide-mobile">
  {NAV_LINKS.map(({ to, label }) => (
    <Link key={to} to={to} style={{
      padding: "var(--space-2) var(--space-3)",
      fontSize: "var(--text-sm)",
      fontWeight: 500,
      color: isActive(to) ? "var(--cyan)" : "var(--text-secondary)",
      textDecoration: "none",
      borderRadius: "var(--radius-md)",
      transition: "color var(--transition-fast), background var(--transition-fast)",
      background: isActive(to) ? "var(--cyan-subtle)" : "transparent",
    }}>
      {label}
    </Link>
  ))}
</div>

{/* Global search — desktop only */}
<div className="hide-mobile" style={{ flex: 1, display: "flex", justifyContent: "center" }}>
  <GlobalSearchBar />
</div>
```

(The original `style={{ flex: 1 }}` on the nav-links wrapper is removed so the search bar can take the flex space instead.)

- [ ] **Step 3: Verify build**

```bash
cd tdtuoj_frontend && npm run build
```
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add tdtuoj_frontend/src/components/common/NavBar.jsx
git commit -m "feat(NavBar): mount GlobalSearchBar in desktop layout"
```

---

## Task 5: Prefill search on ProblemPage from `?q=` URL param

**Files:**
- Modify: `tdtuoj_frontend/src/components/problems/ProblemPage.jsx`

- [ ] **Step 1: Add `useSearchParams` import**

At the top, change:

```jsx
import { useNavigate } from "react-router-dom";
```

to:

```jsx
import { useNavigate, useSearchParams } from "react-router-dom";
```

- [ ] **Step 2: Read `q` into `searchQuery` on mount**

Inside the `ProblemPage` component body, near the existing `useState` declarations (before `useEffect`):

```jsx
const [searchParams] = useSearchParams();
useEffect(() => {
  const q = searchParams.get("q");
  if (q) setSearchQuery(q);
  // Only on first mount — subsequent URL changes ignored to avoid fighting user input
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

- [ ] **Step 3: Verify build**

```bash
cd tdtuoj_frontend && npm run build
```
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add tdtuoj_frontend/src/components/problems/ProblemPage.jsx
git commit -m "feat(ProblemPage): prefill search from ?q= URL param"
```

---

## Task 6: Prefill search on ContestPage from `?q=` URL param

**Files:**
- Modify: `tdtuoj_frontend/src/components/contests/ContestPage.jsx`

- [ ] **Step 1: Add `useSearchParams` import**

Change:

```jsx
import { useNavigate } from "react-router-dom";
```

to:

```jsx
import { useNavigate, useSearchParams } from "react-router-dom";
```

- [ ] **Step 2: Read `q` into `search` on mount**

After the existing `useState` block in `ContestPage`:

```jsx
const [searchParams] = useSearchParams();
useEffect(() => {
  const q = searchParams.get("q");
  if (q) setSearch(q);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

- [ ] **Step 3: Verify build**

```bash
cd tdtuoj_frontend && npm run build
```
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add tdtuoj_frontend/src/components/contests/ContestPage.jsx
git commit -m "feat(ContestPage): prefill search from ?q= URL param"
```

---

## Task 7: Prefill search on OrganizationPage from `?q=` URL param

**Files:**
- Modify: `tdtuoj_frontend/src/components/organizations/OrganizationPage.jsx`

- [ ] **Step 1: Add `useSearchParams` import**

Change:

```jsx
import { useNavigate } from "react-router-dom";
```

to:

```jsx
import { useNavigate, useSearchParams } from "react-router-dom";
```

- [ ] **Step 2: Read `q` on mount**

After the existing `useState` block in `OrganizationPage`:

```jsx
const [searchParams] = useSearchParams();
useEffect(() => {
  const q = searchParams.get("q");
  if (q) setSearch(q);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

- [ ] **Step 3: Verify build**

```bash
cd tdtuoj_frontend && npm run build
```
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add tdtuoj_frontend/src/components/organizations/OrganizationPage.jsx
git commit -m "feat(OrganizationPage): prefill search from ?q= URL param"
```

---

## Task 8: Prefill search on UserPage from `?q=` URL param

**Files:**
- Modify: `tdtuoj_frontend/src/components/users/UserPage.jsx`

- [ ] **Step 1: Add `useSearchParams` import**

Change:

```jsx
import { useNavigate } from "react-router-dom";
```

to:

```jsx
import { useNavigate, useSearchParams } from "react-router-dom";
```

- [ ] **Step 2: Read `q` into `searchQuery` on mount**

After the existing `useState` block in `UserPage`:

```jsx
const [searchParams] = useSearchParams();
useEffect(() => {
  const q = searchParams.get("q");
  if (q) setSearchQuery(q);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

- [ ] **Step 3: Verify build**

```bash
cd tdtuoj_frontend && npm run build
```
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add tdtuoj_frontend/src/components/users/UserPage.jsx
git commit -m "feat(UserPage): prefill search from ?q= URL param"
```

---

## Task 9: Mobile fallback — show GlobalSearchBar inside mobile menu

**Files:**
- Modify: `tdtuoj_frontend/src/components/common/NavBar.jsx`

**Rationale:** Desktop bar is hidden on mobile via `className="hide-mobile"`. To keep mobile users covered, render a second instance inside the existing mobile menu panel.

- [ ] **Step 1: Add GlobalSearchBar at the top of the mobile menu**

Find the existing mobile menu block (line ~213–240) and insert at the top, before the `NAV_LINKS.map(...)`:

```jsx
<div style={{ padding: "0 var(--space-2)", marginBottom: "var(--space-2)" }}>
  <GlobalSearchBar />
</div>
```

- [ ] **Step 2: Verify build**

```bash
cd tdtuoj_frontend && npm run build
```
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add tdtuoj_frontend/src/components/common/NavBar.jsx
git commit -m "feat(NavBar): render GlobalSearchBar inside mobile menu"
```

---

## Task 10: Final manual verification

- [ ] **Step 1: Start dev server**

```bash
cd tdtuoj_frontend && npm run dev
```

In a separate terminal:

```bash
cd TDTUOJ_backend && ./mvnw spring-boot:run
```

- [ ] **Step 2: Run through the verification checklist**

Open `http://localhost:5173` and confirm each item:

- [ ] Search bar visible in NavBar between nav links and user menu.
- [ ] Type fewer than 2 chars — no requests fire (check DevTools Network tab).
- [ ] Type "a" then "ab" — dropdown shows up to 5 results per category for any non-empty group.
- [ ] Click a Problem row → navigates to `/problems/<slug>`, dropdown closes, input clears.
- [ ] Click a User row → navigates to `/users/<username>`.
- [ ] Click a Contest row → navigates to `/contests/<slug>`.
- [ ] Click an Organization row → navigates to `/organizations/<slug>`.
- [ ] Click "View all problems matching X" → navigates to `/problems?q=X`, ProblemPage's existing search input shows X, list filtered.
- [ ] Same for the three other "View all" links.
- [ ] Press `Cmd/Ctrl+K` anywhere → input focuses + dropdown opens.
- [ ] Press `/` outside any input → focuses search input.
- [ ] `↑/↓` move highlight; `Enter` on highlighted row navigates.
- [ ] `Esc` clears and blurs.
- [ ] Click outside dropdown → it closes.
- [ ] Resize to mobile width — search bar disappears from header, appears inside hamburger menu.
- [ ] Empty state: search for a string with no matches → "No matches for X" shown.
- [ ] Backend: `curl 'http://localhost:8090/api/contests?search=spring&size=5'` returns only contests whose name contains "spring" (case insensitive).

- [ ] **Step 3: Final build verification**

```bash
cd tdtuoj_frontend && npm run build
cd ../TDTUOJ_backend && ./mvnw compile -q
```
Expected: both succeed.

---

## Out of Scope (deferred for future iterations)

- Recent-searches history (localStorage).
- Search-result highlighting (bolding matched substring).
- Backend-side relevance ranking (currently relies on default DB ordering).
- Searching submissions, comments, tags.
- Caching layer for repeated queries.
- Per-category filter chips inside the dropdown.
