# Admin Table UI Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate visual inconsistencies across all five admin table pages by standardizing the Toggle component, badge styles, and action button specs.

**Architecture:** Extract a shared `Toggle` component into `common/`, define a badge style standard applied inline across all pages, and lock action button specs. No new CSS classes — all fixes are inline style corrections or component replacements.

**Tech Stack:** React 19, JSX, Lucide React, CSS custom properties (`var(--*)`)

---

## Audit: What Is Actually Inconsistent

### Toggle (2 diverging implementations)

| Property | AdminContestFormPage (local) | AdminProblemTagPage |
|---|---|---|
| Width | 40px | 44px |
| Knob size | 20px | 18px |
| Knob top | 2px | 3px |
| Knob left (active) | 18px | 23px |
| Knob left (inactive) | 2px | 3px |
| Active color | `var(--primary)` (gold) | `var(--green-ac)` (green) |
| Active glow | none | `0 0 0 3px var(--green-subtle), var(--glow-green)` |
| Loading state | not supported | conditional spinner |
| Label | inline in component | not supported |
| Hardcoded colors | `#fff`, `rgba(0,0,0,0.2)` | `#fff`, `rgba(0,0,0,0.35)` |

### Badges

| Page | Font size | Border |
|---|---|---|
| AdminProblemPage difficulty | 11px | none |
| AdminContestPage status | 11px | `1px solid ${color}33` ✓ |
| AdminUserPage role | **10px** ← wrong | none |
| AdminUserPage active/inactive | **10px** ← wrong | none |
| AdminOrganizationPage | 11px | none |

Standard to adopt: **11px, `1px solid ${color}33`** (20% opacity border from ContestPage — most polished).

### Action Buttons

| Page | Padding | Icon size |
|---|---|---|
| AdminProblemPage | `5px 8px` | 14px |
| AdminContestPage | `5px 8px` | 14px |
| AdminUserPage | `5px 8px` (edit), `5px 7px` (delete) | 14px (edit), **16px** (delete) ← wrong |
| AdminProblemTagPage | `5px 8px` | 14px |
| AdminOrganizationPage | `5px 8px` | 14px |

Standard: **`padding: "5px 8px"`, `size={14}`** everywhere.

---

## File Map

| File | Action |
|---|---|
| `src/components/common/Toggle.jsx` | **Create** — shared toggle, replaces both local impls |
| `src/components/admin/AdminContestFormPage.jsx` | **Modify** — remove local `Toggle`, import shared |
| `src/components/admin/AdminProblemTagPage.jsx` | **Modify** — replace toggle with shared, fix badge font sizes (none here), fix action btn inconsistency (already correct) |
| `src/components/admin/AdminUserPage.jsx` | **Modify** — fix role badge 10px→11px, active/inactive badge 10px→11px, add `border` to all badges, fix delete icon size 16px→14px, delete btn padding `5px 7px`→`5px 8px` |

---

## Task 1: Create shared Toggle component

**Files:**
- Create: `src/components/common/Toggle.jsx`

### Standard spec
- Width: 44px, height: 24px
- Knob: 18px circle, top 3px, left-active 23px, left-inactive 3px
- Active: `color` prop (default `var(--primary)`)
- Inactive: `var(--border-default)`
- Loading: replaces knob with spinner
- Optional `label` rendered to the right

- [ ] **Step 1: Create the file**

```jsx
// src/components/common/Toggle.jsx
const Toggle = ({ value, onChange, label, loading = false, disabled = false, color = "var(--primary)" }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <button
      type="button"
      onClick={() => !loading && !disabled && onChange(!value)}
      disabled={disabled || loading}
      style={{
        position: "relative",
        width: 44, height: 24,
        borderRadius: 12,
        border: "none",
        padding: 0,
        flexShrink: 0,
        cursor: loading || disabled ? "not-allowed" : "pointer",
        background: value ? color : "var(--border-default)",
        opacity: loading || disabled ? 0.65 : 1,
        transition: "background 200ms ease",
        outline: "none",
      }}
    >
      {loading ? (
        <span style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            width: 12, height: 12,
            border: "2px solid rgba(255,255,255,0.3)",
            borderTopColor: "#fff",
            borderRadius: "50%",
            display: "inline-block",
            animation: "spin 0.6s linear infinite",
          }} />
        </span>
      ) : (
        <span style={{
          position: "absolute",
          top: 3,
          left: value ? 23 : 3,
          width: 18, height: 18,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
          transition: "left 200ms cubic-bezier(0.34,1.56,0.64,1)",
        }} />
      )}
    </button>
    {label && (
      <span style={{ fontSize: 13, color: "var(--text-primary)", userSelect: "none" }}>
        {label}
      </span>
    )}
  </div>
);

export default Toggle;
```

- [ ] **Step 2: Verify file saved correctly**

Check `src/components/common/Toggle.jsx` exists and has the `export default Toggle` line.

---

## Task 2: Replace AdminContestFormPage local Toggle

**Files:**
- Modify: `src/components/admin/AdminContestFormPage.jsx`

- [ ] **Step 1: Add import at top of file**

In `AdminContestFormPage.jsx`, find the existing imports block and add:

```jsx
import Toggle from "../common/Toggle";
```

- [ ] **Step 2: Delete local Toggle component**

Remove this entire block (the local `Toggle` definition, ~lines 268–280):

```jsx
// Toggle button helper
const Toggle = ({ value, onChange, label }) => (
  <div className="flex items-center gap-3">
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{ width: 40, height: 24, borderRadius: 12, background: value ? "var(--primary)" : "var(--border-default)", position: "relative", border: "none", cursor: "pointer", transition: "background 0.2s" }}
    >
      <span style={{ position: "absolute", top: 2, left: value ? 18 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
    </button>
    <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{label}</span>
  </div>
);
```

- [ ] **Step 3: Verify usage sites still work**

The two usage sites already match the shared Toggle API exactly:
```jsx
<Toggle value={form.isPublic} onChange={(v) => set("isPublic", v)} label="Public contest" />
<Toggle value={form.isRated} onChange={(v) => set("isRated", v)} label="Rated contest" />
```
No changes needed there.

- [ ] **Step 4: Build and verify no errors**

```bash
cd tdtuoj_frontend && npm run build
```
Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/common/Toggle.jsx src/components/admin/AdminContestFormPage.jsx
git commit -m "refactor: extract shared Toggle component, replace AdminContestFormPage local"
```

---

## Task 3: Replace AdminProblemTagPage toggle with shared Toggle

**Files:**
- Modify: `src/components/admin/AdminProblemTagPage.jsx`

- [ ] **Step 1: Add import**

```jsx
import Toggle from "../common/Toggle";
```

- [ ] **Step 2: Find and replace the existing toggle button**

Find the `<button onClick={() => !togglingIds.has(tag.id) && handleToggleActive(tag.id)} ...>` block (the entire button element with spinner/knob children) and replace with:

```jsx
<Toggle
  value={tag.isActive}
  onChange={() => handleToggleActive(tag.id)}
  loading={togglingIds.has(tag.id)}
  disabled={togglingIds.has(tag.id)}
  color="var(--green-ac)"
/>
```

- [ ] **Step 3: Build and verify**

```bash
cd tdtuoj_frontend && npm run build
```
Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminProblemTagPage.jsx
git commit -m "refactor: replace AdminProblemTagPage toggle with shared Toggle component"
```

---

## Task 4: Fix AdminUserPage badge font sizes and borders

**Files:**
- Modify: `src/components/admin/AdminUserPage.jsx`

Standard for all badges:
- `fontSize: 11` (not 10)
- `padding: "2px 8px"`
- `border: \`1px solid ${color}33\`` where `color` is the text color

- [ ] **Step 1: Fix role badge style**

Find the role badge render (the `ROLE_BADGE` map application). The current badge:

```jsx
<span style={{
  display: "inline-flex",
  padding: "2px 8px",
  borderRadius: "var(--radius-pill)",
  fontSize: 10,
  fontWeight: 700,
  background: s.bg,
  color: s.color
}}>
  {role.name}
</span>
```

Replace with:

```jsx
<span style={{
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 8px",
  borderRadius: 9999,
  fontSize: 11,
  fontWeight: 700,
  background: s.bg,
  color: s.color,
  border: `1px solid ${s.color}33`,
}}>
  {role.name}
</span>
```

- [ ] **Step 2: Fix active/inactive status badge**

Find the `user.isActive` badge. Current:

```jsx
<span style={{
  display: "inline-flex",
  padding: "2px 9px",
  borderRadius: "var(--radius-pill)",
  fontSize: 10,
  fontWeight: 700,
  background: user.isActive ? "var(--green-subtle)" : "var(--red-subtle)",
  color: user.isActive ? "var(--green-ac)" : "var(--red-wa)"
}}>
  {user.isActive ? "Active" : "Inactive"}
</span>
```

Replace with:

```jsx
<span style={{
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 8px",
  borderRadius: 9999,
  fontSize: 11,
  fontWeight: 700,
  background: user.isActive ? "var(--green-subtle)" : "var(--red-subtle)",
  color: user.isActive ? "var(--green-ac)" : "var(--red-wa)",
  border: `1px solid ${user.isActive ? "var(--green-ac)" : "var(--red-wa)"}33`,
}}>
  {user.isActive ? "Active" : "Inactive"}
</span>
```

- [ ] **Step 3: Fix delete button icon size and padding**

Find the delete button (Trash2) in the actions column. Current:

```jsx
<button className="btn btn-ghost btn-sm" style={{ padding: "5px 7px" }} ...>
  <Trash2 size={16} color="var(--red-wa)" />
</button>
```

Replace with:

```jsx
<button className="btn btn-ghost btn-sm" style={{ padding: "5px 8px" }} ...>
  <Trash2 size={14} color="var(--red-wa)" />
</button>
```

- [ ] **Step 4: Build and verify**

```bash
cd tdtuoj_frontend && npm run build
```
Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/AdminUserPage.jsx
git commit -m "fix: standardize AdminUserPage badge font size, borders, delete button spec"
```

---

## Task 5: Add border to badges in remaining pages

The ContestPage status badge already has `border: \`1px solid ${s.color}33\`` — that's the standard. Apply same to AdminProblemPage difficulty badges and AdminOrganizationPage status badges.

**Files:**
- Modify: `src/components/admin/AdminProblemPage.jsx`
- Modify: `src/components/admin/AdminOrganizationPage.jsx`

- [ ] **Step 1: AdminProblemPage — add border to difficulty badge**

Find the difficulty badge render (the `DIFF_META` map application). Add `border`:

```jsx
// Before (approximate):
<span style={{
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 9999,
  fontSize: 11,
  fontWeight: 600,
  background: s.bg,
  color: s.hex,
}}>

// After:
<span style={{
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 8px",
  borderRadius: 9999,
  fontSize: 11,
  fontWeight: 700,
  background: s.bg,
  color: s.hex,
  border: `1px solid ${s.hex}33`,
}}>
```

- [ ] **Step 2: AdminOrganizationPage — add border to public/private badge**

Find the public/private badge. Add `border: \`1px solid ${color}33\`` using the badge's text color value.

- [ ] **Step 3: Build and verify**

```bash
cd tdtuoj_frontend && npm run build
```
Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminProblemPage.jsx src/components/admin/AdminOrganizationPage.jsx
git commit -m "fix: add consistent 20% border to difficulty and org status badges"
```

---

## Self-Review

**Spec coverage:**
- Toggle extracted to shared component ✓
- AdminContestFormPage local Toggle removed ✓
- AdminProblemTagPage toggle replaced ✓
- AdminUserPage badge 10px→11px ✓
- AdminUserPage active/inactive badge fixed ✓
- AdminUserPage delete button `5px 7px` / `size=16` fixed ✓
- Difficulty badge border added ✓
- Org badge border added ✓

**Placeholder scan:** All steps contain exact code, no TBDs.

**Type consistency:** `Toggle` props (`value`, `onChange`, `label`, `loading`, `disabled`, `color`) consistent across all tasks. `color="var(--green-ac)"` in Task 3 is a valid CSS var string.
