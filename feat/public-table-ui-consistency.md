# Public Table UI Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize table header styling, row hover, row striping, and wrapper appearance across all four public-facing list pages.

**Architecture:** Add a single `.public-table-header` CSS class to `index.css` for the `<tr>` header background, then update each page's `<th>` inline styles to use the canonical token values. Fix row hover and wrapper inconsistencies per page.

**Tech Stack:** React JSX inline styles + global CSS (`index.css`)

---

## Canonical Standard

| Property | Value |
|---|---|
| Header row bg | `var(--primary-subtle)` |
| Header `<th>` font size | `var(--text-xs)` |
| Header `<th>` font weight | `700` |
| Header `<th>` color | `var(--primary)` |
| Header `<th>` transform | `uppercase` |
| Header `<th>` letter spacing | `0.06em` |
| Row hover | `var(--primary-subtle)` |
| Row even bg | `var(--bg-raised)` |
| Row odd bg | `var(--bg-overlay)` |
| Wrapper | `background: var(--bg-raised)`, `borderRadius: var(--radius-lg)`, `boxShadow: 0 2px 8px rgba(0,0,0,0.3)`, `overflow: hidden` — no extra border |

---

## File Map

- **Modify:** `tdtuoj_frontend/src/index.css` — add `.public-table-header` class
- **Modify:** `tdtuoj_frontend/src/components/problems/ProblemPage.jsx` — fix row hover (cyan-subtle → primary-subtle) in both tables
- **Modify:** `tdtuoj_frontend/src/components/contests/ContestPage.jsx` — add header bg + standardize `<th>` text style
- **Modify:** `tdtuoj_frontend/src/components/organizations/OrganizationPage.jsx` — add header bg + standardize `<th>` text style + remove extra border from wrapper
- **Modify:** `tdtuoj_frontend/src/components/users/UserPage.jsx` — replace `className="card"` wrapper, add header bg + `<th>` style, add row striping + hover

---

## Task 1: Add shared CSS class to index.css

**Files:**
- Modify: `tdtuoj_frontend/src/index.css`

- [ ] **Step 1: Append CSS class**

Find the end of the table-related CSS section in `index.css` and append:

```css
/* ── Public table header standard ────────────────────────────── */
.public-table-header {
  background: var(--primary-subtle);
}
.public-table-header th {
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
```

- [ ] **Step 2: Verify build**

```bash
cd tdtuoj_frontend && npm run build
```
Expected: build succeeds, no errors.

- [ ] **Step 3: Commit**

```bash
git add tdtuoj_frontend/src/index.css
git commit -m "style: add .public-table-header CSS class for shared table header tokens"
```

---

## Task 2: Fix ProblemPage row hover

**Files:**
- Modify: `tdtuoj_frontend/src/components/problems/ProblemPage.jsx`

**Current problem:** Problems table uses `var(--cyan-subtle)` on hover; favorites table uses `rgba(246,201,14,0.06)`. Both should use `var(--primary-subtle)` to match ContestPage/OrganizationPage.

- [ ] **Step 1: Update problems table row hover** (line ~795)

Old:
```jsx
onMouseEnter={(e) => { e.currentTarget.style.background = "var(--cyan-subtle)"; }}
```
New:
```jsx
onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-subtle)"; }}
```

- [ ] **Step 2: Update favorites table row hover** (line ~661)

Old:
```jsx
onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(246,201,14,0.06)"; }}
```
New:
```jsx
onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-subtle)"; }}
```

- [ ] **Step 3: Both `<tr>` headers already have `background: "var(--primary-subtle)"` and correct `<th>` styles — no change needed there.**

- [ ] **Step 4: Verify build**

```bash
cd tdtuoj_frontend && npm run build
```
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add tdtuoj_frontend/src/components/problems/ProblemPage.jsx
git commit -m "style(ProblemPage): normalize row hover to var(--primary-subtle)"
```

---

## Task 3: Fix ContestPage table header

**Files:**
- Modify: `tdtuoj_frontend/src/components/contests/ContestPage.jsx`

**Current problem:** Header `<tr>` has no background; `<th>` uses `fontSize: 13`, no color, no uppercase, no letter-spacing.

- [ ] **Step 1: Add `className` and standardize `<th>` styles** (lines 182–191)

Old:
```jsx
<thead>
  <tr>
    <th style={{ width: "4%",  textAlign: "center", fontSize: 13, fontWeight: 700 }}>#</th>
    <th style={{ width: "34%", fontSize: 13, fontWeight: 700 }}>Contest</th>
    <th style={{ width: "11%", fontSize: 13, fontWeight: 700 }}>Status</th>
    <th style={{ width: "8%",  fontSize: 13, fontWeight: 700 }}>Style</th>
    <th style={{ width: "22%", fontSize: 13, fontWeight: 700 }}>Schedule</th>
    <th style={{ width: "10%", textAlign: "center", fontSize: 13, fontWeight: 700 }}>Registered</th>
    <th style={{ width: "7%",  textAlign: "center", fontSize: 13, fontWeight: 700 }}>Problems</th>
    <th style={{ width: "4%"  }} />
  </tr>
</thead>
```

New:
```jsx
<thead>
  <tr className="public-table-header">
    <th style={{ width: "4%",  textAlign: "center" }}>#</th>
    <th style={{ width: "34%" }}>Contest</th>
    <th style={{ width: "11%" }}>Status</th>
    <th style={{ width: "8%"  }}>Style</th>
    <th style={{ width: "22%" }}>Schedule</th>
    <th style={{ width: "10%", textAlign: "center" }}>Registered</th>
    <th style={{ width: "7%",  textAlign: "center" }}>Problems</th>
    <th style={{ width: "4%"  }} />
  </tr>
</thead>
```

- [ ] **Step 2: Verify build**

```bash
cd tdtuoj_frontend && npm run build
```
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add tdtuoj_frontend/src/components/contests/ContestPage.jsx
git commit -m "style(ContestPage): standardize table header to public-table-header pattern"
```

---

## Task 4: Fix OrganizationPage table header + wrapper border

**Files:**
- Modify: `tdtuoj_frontend/src/components/organizations/OrganizationPage.jsx`

**Current problems:**
1. Header `<tr>` has no background; `<th>` uses `fontSize: 13`, no color/uppercase.
2. Wrapper div has extra `border: "1px solid var(--border-default)"` not present on other pages.

- [ ] **Step 1: Remove extra border from wrapper** (line ~105)

Old:
```jsx
<div style={{ background: "var(--bg-raised)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)", overflow: "hidden", position: "relative" }}>
```

New:
```jsx
<div style={{ background: "var(--bg-raised)", borderRadius: "var(--radius-lg)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)", overflow: "hidden", position: "relative" }}>
```

- [ ] **Step 2: Add `className` and standardize `<th>` styles** (lines 114–122)

Old:
```jsx
<thead>
  <tr>
    <th style={{ width: "4%",  textAlign: "center", fontSize: 13, fontWeight: 700 }}>#</th>
    <th style={{ width: "36%", fontSize: 13, fontWeight: 700 }}>Organization</th>
    <th style={{ width: "11%", fontSize: 13, fontWeight: 700 }}>Visibility</th>
    <th style={{ width: "13%", fontSize: 13, fontWeight: 700 }}>Your Role</th>
    <th style={{ width: "10%", textAlign: "center", fontSize: 13, fontWeight: 700 }}>Members</th>
    <th style={{ width: "20%", fontSize: 13, fontWeight: 700 }}>Creator</th>
    <th style={{ width: "6%"  }} />
  </tr>
</thead>
```

New:
```jsx
<thead>
  <tr className="public-table-header">
    <th style={{ width: "4%",  textAlign: "center" }}>#</th>
    <th style={{ width: "36%" }}>Organization</th>
    <th style={{ width: "11%" }}>Visibility</th>
    <th style={{ width: "13%" }}>Your Role</th>
    <th style={{ width: "10%", textAlign: "center" }}>Members</th>
    <th style={{ width: "20%" }}>Creator</th>
    <th style={{ width: "6%"  }} />
  </tr>
</thead>
```

- [ ] **Step 3: Verify build**

```bash
cd tdtuoj_frontend && npm run build
```
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add tdtuoj_frontend/src/components/organizations/OrganizationPage.jsx
git commit -m "style(OrganizationPage): standardize table header, remove extra wrapper border"
```

---

## Task 5: Fix UserPage table wrapper, header, striping, and hover

**Files:**
- Modify: `tdtuoj_frontend/src/components/users/UserPage.jsx`

**Current problems:**
1. Wrapper uses `className="card"` instead of matching inline div style.
2. Header `<tr>` has no background; `<th>` elements have no explicit text style.
3. Rows have no striping.
4. Rows have no hover handler.

- [ ] **Step 1: Replace `className="card"` wrapper** (line ~222)

Old:
```jsx
<div className="card" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
```

New:
```jsx
<div style={{ background: "var(--bg-raised)", borderRadius: "var(--radius-lg)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)", overflow: "hidden", position: "relative" }}>
```

- [ ] **Step 2: Add `className` to header `<tr>` and clean up `<th>` styles** (lines 243–250)

Old:
```jsx
<thead>
  <tr>
    <th style={{ textAlign: "center", width: "8%" }}>Rank</th>
    <th style={{ width: "38%" }}>User</th>
    <th style={{ width: "22%" }}>Roles</th>
    <th style={{ textAlign: "center", width: "14%" }}>Points</th>
    <th style={{ textAlign: "center", width: "14%" }}>Rating</th>
    <th style={{ textAlign: "center", width: "8%" }}>Status</th>
  </tr>
</thead>
```

New:
```jsx
<thead>
  <tr className="public-table-header">
    <th style={{ textAlign: "center", width: "8%" }}>Rank</th>
    <th style={{ width: "38%" }}>User</th>
    <th style={{ width: "22%" }}>Roles</th>
    <th style={{ textAlign: "center", width: "14%" }}>Points</th>
    <th style={{ textAlign: "center", width: "14%" }}>Rating</th>
    <th style={{ textAlign: "center", width: "8%" }}>Status</th>
  </tr>
</thead>
```

- [ ] **Step 3: Add striping and hover to data rows** (lines 254–259)

Old:
```jsx
users.map((user) => (
  <tr
    key={user.id}
    onClick={() => handleOnClick(user.username)}
    style={{ cursor: "pointer" }}
  >
```

New:
```jsx
users.map((user, index) => {
  const rowBg = index % 2 === 0 ? "var(--bg-raised)" : "var(--bg-overlay)";
  return (
  <tr
    key={user.id}
    onClick={() => handleOnClick(user.username)}
    style={{ background: rowBg, cursor: "pointer", transition: "background 0.15s" }}
    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-subtle)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = rowBg; }}
  >
```

Also close the `map` with `); })` instead of `))` at the end of the row.

- [ ] **Step 4: Verify build**

```bash
cd tdtuoj_frontend && npm run build
```
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add tdtuoj_frontend/src/components/users/UserPage.jsx
git commit -m "style(UserPage): standardize table wrapper, header, row striping and hover"
```

---

## Verification Checklist

After all tasks complete:

- [ ] All 4 pages render table headers with `var(--primary-subtle)` background
- [ ] All `<th>` text is `var(--text-xs)`, `var(--primary)`, uppercase, `0.06em` tracking
- [ ] All pages use `var(--primary-subtle)` row hover
- [ ] All pages show alternating row striping (`var(--bg-raised)` / `var(--bg-overlay)`)
- [ ] OrganizationPage wrapper has no `border: "1px solid var(--border-default)"`
- [ ] UserPage wrapper no longer uses `className="card"`
- [ ] `npm run build` passes with no errors
