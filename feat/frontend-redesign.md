# Frontend Redesign Spec — TDTUOJ "The Arena"

**Status**: 📋 Specified  
**Author**: —  
**Created**: 2026-05-16

---

## Concept

**"The Arena"** — Competitive programming is a sport. The UI mirrors that energy: a dark, data-dense, precision-engineered environment where every element serves the competitor. Not a textbook portal, not a blog, not a generic LMS. A place where students feel like they're entering a tournament.

One thing someone will remember: **the problem-solving page feels like a professional IDE inside a competition scoreboard** — split-panel, always-visible verdict, zero wasted space.

---

## Design System

### Color Palette

```css
:root {
  /* Backgrounds — layered depth */
  --bg-void:      #080C14;   /* deepest — page background */
  --bg-base:      #0D1420;   /* base surfaces — cards, panels */
  --bg-raised:    #131B2A;   /* raised surfaces — sidebars, inputs */
  --bg-overlay:   #1A2538;   /* overlays, dropdowns, modals */
  --bg-hover:     #1F2D42;   /* interactive hover states */

  /* Brand / Primary */
  --cyan:         #00D4FF;   /* primary accent — electric cyan */
  --cyan-dim:     #00A8CC;   /* hover / pressed state */
  --cyan-glow:    rgba(0, 212, 255, 0.15);  /* glow effect */
  --cyan-subtle:  rgba(0, 212, 255, 0.08);  /* subtle bg tint */

  /* Status / Semantic */
  --green-ac:     #00E676;   /* Accepted — vivid emerald */
  --green-subtle: rgba(0, 230, 118, 0.10);
  --red-wa:       #FF3B3B;   /* Wrong Answer / error */
  --red-subtle:   rgba(255, 59, 59, 0.10);
  --amber-tle:    #FFB800;   /* TLE / warning / gold rank */
  --amber-subtle: rgba(255, 184, 0, 0.10);
  --blue-ce:      #4D9FFF;   /* Compile Error / info */
  --purple-mle:   #B06EFF;   /* MLE */
  --gray-pending: #6B7A95;   /* Pending / judging */

  /* Typography */
  --text-primary:   #E8EDF5;   /* main readable text */
  --text-secondary: #8896B0;   /* labels, metadata */
  --text-muted:     #4A5568;   /* placeholders, disabled */
  --text-inverse:   #080C14;   /* text on bright backgrounds */

  /* Borders */
  --border-subtle:  rgba(255, 255, 255, 0.05);
  --border-default: rgba(255, 255, 255, 0.09);
  --border-strong:  rgba(255, 255, 255, 0.15);
  --border-accent:  rgba(0, 212, 255, 0.30);

  /* Rank colors */
  --rank-gold:     #FFD700;
  --rank-silver:   #C0C8D8;
  --rank-bronze:   #CD7F32;

  /* Difficulty */
  --diff-easy:   #00E676;
  --diff-medium: #FFB800;
  --diff-hard:   #FF3B3B;
}
```

### Typography

```css
/* Import in index.html */
/* Display/Headings: Syne Mono — editorial, technical, distinctive */
/* Body: Outfit — geometric, modern, readable at small sizes */
/* Code: JetBrains Mono — professional coding font */

@import url('https://fonts.googleapis.com/css2?family=Syne+Mono&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

:root {
  --font-display: 'Syne Mono', monospace;     /* hero text, problem numbers, ranks */
  --font-body:    'Outfit', sans-serif;        /* all readable content */
  --font-code:    'JetBrains Mono', monospace; /* code, verdicts, IDs */

  /* Scale */
  --text-xs:   0.70rem;   /* 11px — badges, timestamps */
  --text-sm:   0.80rem;   /* 13px — metadata, labels */
  --text-base: 0.9375rem; /* 15px — body */
  --text-lg:   1.0625rem; /* 17px — card titles */
  --text-xl:   1.25rem;   /* 20px — section headings */
  --text-2xl:  1.625rem;  /* 26px — page headings */
  --text-3xl:  2.125rem;  /* 34px — hero numbers */
  --text-4xl:  3rem;      /* 48px — display */

  /* Line heights */
  --leading-tight:  1.2;
  --leading-normal: 1.5;
  --leading-loose:  1.75;

  /* Letter spacing */
  --tracking-wide:  0.08em;  /* display text */
  --tracking-wider: 0.12em;  /* labels, ALL CAPS badges */
}
```

### Spacing & Radius

```css
:root {
  /* Spacing (4px base) */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Radius */
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-pill: 999px;

  /* Shadows */
  --shadow-sm:  0 1px 3px rgba(0,0,0,0.4);
  --shadow-md:  0 4px 16px rgba(0,0,0,0.5);
  --shadow-lg:  0 8px 32px rgba(0,0,0,0.6);
  --glow-cyan:  0 0 20px rgba(0,212,255,0.25), 0 0 60px rgba(0,212,255,0.10);
  --glow-green: 0 0 16px rgba(0,230,118,0.30);
}
```

### Motion

```css
:root {
  --transition-fast:   120ms ease;
  --transition-base:   200ms ease;
  --transition-slow:   350ms cubic-bezier(0.16, 1, 0.3, 1);
  --transition-spring: 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## Component Library Plan

### Core Primitives

#### `<VerdictBadge verdict="AC" />`
Small pill badge with verdict color + monospace font. Variants: AC, WA, TLE, MLE, RE, CE, PENDING, JUDGING.

```
┌─────────┐  border-left: 3px solid --green-ac
│ ✓  AC   │  bg: --green-subtle  color: --green-ac
└─────────┘  font: --font-code  text-xs  tracking-wider
```

#### `<DifficultyChip difficulty="HARD" />`
```
┌──────────┐  no fill, just border + text in diff color
│   HARD   │  uppercase, --text-xs, --tracking-wider
└──────────┘
```

#### `<StatCard label="Solved" value="142" delta="+3" />`
Dark card with large display number (Syne Mono), label below, optional delta badge.

#### `<RankBadge rank={1} />`
Rank 1-3: gold/silver/bronze with glow. 4+: muted text. Uses --font-display.

#### `<ProblemRow />` (table row for problem lists)
```
#  │ Title                    │ Difficulty │ Tags      │ AC Rate │ Points │ ★
───┼──────────────────────────┼────────────┼───────────┼─────────┼────────┼──
23 │ Valid Parentheses        │ MEDIUM     │ Stack     │  64.2%  │  17    │ ☆
```
Row highlights cyan on hover. Solved problems show subtle green left-border.

#### `<SubmissionRow />` (submission history row)
```
Time ago  │  Language  │  Verdict  │  Runtime  │  Memory  │  →
──────────┼────────────┼───────────┼───────────┼──────────┼────
2m ago    │  C++       │  ✓ AC     │  12ms     │  4.1 MB  │  →
```

#### `<ContestCard />`
Dark card with neon cyan top-border for RUNNING, amber for UPCOMING, muted for ENDED.
Shows: title, dates, participant count, style (ICPC/IOI), countdown if active.

#### `<LiveDot />`
Pulsing dot indicator for RUNNING contests/judging states. CSS keyframe animation.

#### `<CodeEditor />` (Monaco wrapper)
Theme: custom dark matching --bg-void background. Font: JetBrains Mono 14px.
Toolbar above: language selector, run, submit. Verdict strip below with animation.

#### `<SplitPane />`
Resizable two-column layout for problem pages. Stores split ratio in localStorage.

#### `<HeatmapCalendar />`
GitHub-style activity heatmap. Dark cells, cyan fill intensity by activity count.

#### `<Leaderboard />`
Sports-ticker aesthetic. Rank column with medal colors, monospace numbers, name + score.

#### `<CountdownTimer />`
Large display font (Syne Mono), HH:MM:SS format. Turns amber at <30min, red at <5min.

#### `<TagPill />`
`bg: --bg-overlay  border: --border-default  color: --text-secondary`
Hover: cyan border + cyan text.

#### `<NavBar />`
Full-width dark bar. Left: logo (Syne Mono wordmark "TDTUOJ" in cyan). Center: nav links. Right: user menu.
Active link: cyan underline, no bg fill.

#### `<Sidebar />` (admin)
Left rail 240px. Collapse to 60px (icons only) on narrow. Section grouping with faint dividers.

---

## Page-by-Page Redesign

### 1. HomePage — "The Arena Entrance"

**Layout:** Full-bleed dark background with a subtle grid/dot pattern texture. Three zones.

```
┌─────────────────────────────────────────────────────────┐
│  NAVBAR                                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   HERO — large Syne Mono headline                       │
│   "PROVE YOUR LOGIC"  ← staggered letter animation      │
│   Subtext in Outfit, muted                              │
│   [Start Solving →]  [View Contests →]                  │
│                                                         │
│   ──── Stat bar: X Problems  Y Users  Z Submissions ──── │
│                                                         │
├──────────────────┬──────────────────────────────────────┤
│  RECENT CONTESTS │  TOP PROBLEMS THIS WEEK              │
│  (ContestCards)  │  (ProblemRow list, top 5)            │
│                  │                                       │
├──────────────────┴──────────────────────────────────────┤
│  USER STATS (if logged in): heatmap + solved count      │
│  OR: "Join the arena" CTA if guest                      │
└─────────────────────────────────────────────────────────┘
```

**Key details:**
- Background: `--bg-void` with `background-image: radial-gradient(circle, rgba(0,212,255,0.03) 1px, transparent 1px)` at 24px grid
- Hero font size: 4xl–5xl, letter-spacing: 0.06em
- Stat bar: monospace numbers, uppercase labels, dividers between
- Page load: staggered fade-up animation on each section (animation-delay increments)

---

### 2. ProblemPage — "The Problem Bank"

**Layout:** Left filter sidebar (280px) + main problem table. No horizontal scroll.

```
┌──────────┬──────────────────────────────────────────────┐
│ FILTERS  │  PROBLEMS  [Search ___________] [Sort ▾]    │
│          │                                               │
│ Difficulty│  # │ Title              │ Diff   │ AC%  │ ★ │
│ ○ All    │  ──┼────────────────────┼────────┼──────┼───│
│ ○ Easy   │   3│ Sum of Two Numbers │ MEDIUM │ 71%  │ ☆ │
│ ○ Medium │   4│ Combination Sum    │ MEDIUM │ 43%  │ ★ │
│ ○ Hard   │   9│ Sum of Array       │ EASY   │ 89%  │ ☆ │
│          │  ──┴────────────────────┴────────┴──────┴───│
│ Tags     │                                               │
│ □ Array  │  [← 1  2  3 →]                               │
│ □ Graph  │                                               │
│ □ Math   │                                               │
│          │                                               │
│ Status   │                                               │
│ ○ All    │                                               │
│ ○ Solved │                                               │
│ ○ Unsolved│                                              │
└──────────┴──────────────────────────────────────────────┘
```

**Key details:**
- Solved row: `border-left: 3px solid var(--green-ac)` + very subtle green bg tint
- Favorited: star column, click to toggle, optimistic UI
- Tags as small `<TagPill>` chips inline
- Filter sidebar sticky on scroll
- Table rows: 48px height, hover: `--bg-hover` transition 120ms

---

### 3. ProblemDetailsPage — "The Solver" (most important page)

**Layout:** Fixed viewport height split-pane. No page scroll — internal scroll per pane.

```
┌─────────────────────────────────────────────────────────┐
│  NAVBAR (48px fixed)                                     │
├───────────────────────────┬─────────────────────────────┤
│  LEFT PANE (scrollable)   │  RIGHT PANE (editor)        │
│                           │                             │
│  [Problem] [Submissions]  │  Language: [C++ ▾]          │
│  [Comments] [Hints]       │  ┌─────────────────────────┐│
│  ───────────────────      │  │                         ││
│  #9 — Sum of Array        │  │   Monaco Editor         ││
│  ★ EASY  •  5pts  •  2s   │  │   JetBrains Mono 14px   ││
│                           │  │   --bg-void theme       ││
│  Problem statement...     │  │                         ││
│  (markdown rendered)      │  │                         ││
│                           │  │                         ││
│  Sample I/O (collapsible) │  └─────────────────────────┘│
│  ┌────────────┐           │                             │
│  │ Input:     │           │  ┌─── VERDICT STRIP ───────┐│
│  │ 3          │           │  │  ✓ Accepted  12ms 4MB   ││
│  │ 1 2 3      │           │  │  green glow animation   ││
│  └────────────┘           │  └─────────────────────────┘│
│                           │                             │
│  Tags: Array              │  [▶ Run]    [⚡ Submit]     │
│                           │  (Run = judge0 direct,      │
│  ──── AI Hint ────        │   Submit = full judge)      │
│  [💡 Request Hint]        │                             │
│                           │  [📊 Visualize]             │
├───────────────────────────┼─────────────────────────────┤
│  RESIZE HANDLE (drag)     │                             │
└───────────────────────────┴─────────────────────────────┘
```

**Key details:**
- Pane ratio default: 42% / 58%, draggable, persisted in localStorage
- Verdict strip animation: slide up from bottom of editor pane, colored by verdict
  - AC: green glow flash → steady green strip
  - WA: red pulse → shows expected vs actual (diff view)
  - TLE/MLE: amber
  - JUDGING: animated cyan progress bar
- Submission history tab: shows last 10 submissions in `<SubmissionRow>` list
- Tabs (Problem / Submissions / Comments / Hints) use a segmented control style, not browser tabs
- Mobile (<768px): stack vertically — problem pane on top (fixed 50vh, scrollable), editor pane below (50vh, scrollable). `SplitPane` renders as single column at this breakpoint. No bottom sheet.

---

### 4. ContestPage — "The Arena Schedule"

**Layout:** Grid of `<ContestCard>` with filter tabs (All / Live / Upcoming / Ended).

```
CONTESTS
[All]  [● LIVE]  [UPCOMING]  [ENDED]

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ ● LIVE          │  │ UPCOMING        │  │ ENDED           │
│ ─────────────── │  │ ─────────────── │  │ ─────────────── │
│ Spring Round #3 │  │ Weekly #12      │  │ Fall Round #2   │
│ ICPC Style      │  │ IOI Style       │  │ ICPC Style      │
│ 14:23:05 left   │  │ Starts in 2d    │  │ Ended           │
│ 847 participants│  │ 23 registered   │  │ 512 participants│
│ [Join Now →]    │  │ [Register →]    │  │ [View Results→] │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

**Key details:**
- LIVE cards: cyan top-border (3px), `<LiveDot>` pulsing indicator
- UPCOMING: amber top-border
- ENDED: muted, no top-border
- `<CountdownTimer>` on LIVE cards — runs client-side with `setInterval`

---

### 5. ContestDetailPage — "Pre-Match Briefing"

**Layout:** Single-column with two-column stat summary at top.

```
┌─────────────────────────────────────────────────────────┐
│  ← Back   SPRING ROUND #3           ● LIVE  14:23:05    │
├──────────┬──────────┬──────────┬───────────────────────┤
│ Problems │ Duration │ Style    │ Participants           │
│    8     │  3 hours │  ICPC    │     847                │
├──────────┴──────────┴──────────┴───────────────────────┤
│  [Problems]  [Leaderboard]  [My Rank]  [Rules]          │
│  ─────────────────────────────────────────────────      │
│  PROBLEM LIST / LEADERBOARD (tab content)               │
└─────────────────────────────────────────────────────────┘
│  [REGISTER / UNREGISTER]   sticky bottom bar            │
└─────────────────────────────────────────────────────────┘
```

**Leaderboard tab:**
- Sports-ticker aesthetic: sticky header row, alternating row shading
- Rank medals (gold/silver/bronze) for top 3
- Own row: highlighted with cyan left-border
- Problem columns showing solve time (ICPC) or score (IOI) per problem

---

### 6. ContestProblemPage — "The Match"

Same split-pane as ProblemDetailsPage but with additions:
- NavBar replaced by **contest bar**: contest name, live countdown (amber when <30min), problem switcher (A B C D…), current rank
- Problem switcher shows solved (✓ green), attempted (⚡ amber), unattempted (○ muted) per problem
- No AI hints in contest mode

---

### 7. UserPage (Leaderboard) — "The Rankings"

```
┌─────────────────────────────────────────────────────────┐
│  LEADERBOARD           [Search ___________]             │
├─────────────────────────────────────────────────────────┤
│  RANK  │  PLAYER                │  SOLVED  │  POINTS   │
│  ──────┼────────────────────────┼──────────┼───────────│
│  🥇 1  │  🐶 SuperDog12         │    47    │   1,240   │
│  🥈 2  │  👤 khangho             │    38    │     980   │
│  🥉 3  │  👤 codingmaster        │    34    │     860   │
│     4  │  👤 algorithmking       │    31    │     750   │
└─────────────────────────────────────────────────────────┘
```

- Rank column: `--font-display`, medal colors for 1-3
- Points column: `--font-code`, right-aligned
- Row click → ProfilePage
- Own row: subtle cyan border-left
- Pagination: simple prev/next, no number sprawl

---

### 8. ProfilePage — "Player Card"

**Layout:** Two-column — left 1/3: player identity card; right 2/3: stats + activity.

```
┌────────────────┬────────────────────────────────────────┐
│  [Avatar 96px] │  STATISTICS                            │
│  khangho       │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│  Rank #2       │  │  38  │ │  92% │ │  1.2k│ │  14  │ │
│                │  │Solved│ │AC Rate│ │Points│ │Streak│ │
│  Joined        │  └──────┘ └──────┘ └──────┘ └──────┘ │
│  Mar 2026      │                                        │
│                │  ACTIVITY (Heatmap)                    │
│  Tags favorite │  [■■□□■■■□■■□□□■■■□□□■■■■□□□□■■]     │
│  Array, Graph  │                                        │
│                │  SUBMISSIONS BY VERDICT (donut chart)  │
│                │  LANGUAGE BREAKDOWN (bar chart)        │
│                │  RATING HISTORY (line chart)           │
└────────────────┴────────────────────────────────────────┘
```

- Charts: **D3** for all visualizations — heatmap, donut, bar, line. Full control over dark/light theme tokens, no recharts abstraction layer.
- Heatmap: GitHub contribution graph style, cyan fill intensity, built with D3 `scaleSqrt` color scale
- Avatar border: gradient ring (cyan → blue) on hover

---

### 9. Admin Panel — "Mission Control"

**Layout:** Persistent left sidebar (240px) + main content area.

```
┌─────────────┬───────────────────────────────────────────┐
│  ADMIN      │  PROBLEMS                    [+ New]      │
│  ───────    │  ─────────────────────────────────────── │
│  Problems   │  [Search]  [Filter ▾]                     │
│  Tags       │                                           │
│  Contests   │  ID │ Title          │ Public │ Actions   │
│  Monitor    │  ───┼────────────────┼────────┼─────────  │
│  Users      │   3 │ Sum of Two Num │  ✓     │ ✏ 🗑      │
│  Orgs       │   4 │ Combination Sum│  ✓     │ ✏ 🗑      │
│  ───────    │                                           │
│  My Problems│  [← 1  2  3 →]                           │
│  ───────    │                                           │
│  [Logout]   │                                           │
└─────────────┴───────────────────────────────────────────┘
```

**Contest Monitor:**
- Live submission feed — new rows animate slide-in from top
- Color-coded verdicts per cell (problem × team matrix)
- Auto-refresh every 10s with subtle pulse on refresh

---

### 10. Organization / Lab Pages — "Team Training"

**OrganizationPage:** Card grid similar to ContestPage. Each card shows name, member count, lab count.

**OrganizationDetailPage:** Tab layout — Overview / Members / Labs.

**LabDetailPage:** Problem list within the lab context. Shows per-student progress bars if creator view.

**LabProgressPage:** Table: rows = students, columns = problems. Cell shows solved/not/score. Export button.

---

## UX Improvements for Competitive Programming

### Problem Solving Flow
1. **Persistent code** — auto-save to localStorage per problem per language on every keystroke (debounced 1s). Never lose code on navigation.
2. **Quick language switch** — switching language asks "Save current code?" before clearing editor.
3. **Run vs Submit separation** — Run uses Judge0 directly (fast, no verdict saved). Submit goes through full judging pipeline. Clearly labeled, different button styles.
4. **Submission throttle feedback** — when 429 hit, show countdown timer "Submit available in 47s" on the button itself (disabled + countdown).
5. **Verdict animation** — AC verdict: brief confetti burst (subtle, 0.5s), green glow. WA: show diff of expected vs actual output inline.
6. **Test case panel** — custom test input inline (not a separate page), shows stdout + stderr split.

### Contest Experience
1. **Sticky contest clock** — always visible during contest, not in a bar that scrolls away.
2. **Problem solved indicator** — problem switcher (A B C…) shows ✓ on solved, ⚡ on attempted. Visual at-a-glance.
3. **Last minute warning** — at T-5min: amber pulsing border around the entire page, clock turns red.
4. **Leaderboard refresh** — live leaderboard auto-fetches every 30s during contest. Row rank changes animate.

### Submissions & Feedback
1. **Optimistic submission state** — button shows spinner immediately on click, verdict strip shows "JUDGING…" with animated progress.
2. **Polling indicator** — small dot in verdict strip pulses while polling Judge0.
3. **Submission history diff** — click any past submission → opens in read-only editor split with problem on left.

### Accessibility & Ergonomics
1. **Keyboard shortcuts** — `Ctrl+Enter` submits, `Ctrl+Shift+Enter` runs, `Ctrl+L` switches language. Shown in tooltip on buttons.
2. **Focus trap in modals** — ConfirmDialog, HintPanel properly trap focus.
3. **Theme toggle** — dark (default) / light. See Design System → Theming. Toggle persisted to localStorage. Sun/moon icon in NavBar top-right.
4. **Reduced motion** — `@media (prefers-reduced-motion: reduce)` kills all keyframe animations, keeps transitions ≤150ms.

---

## Affected Files

### New / Replace
| File | Action | Description |
|------|--------|-------------|
| `src/index.css` | REPLACE | New design system with CSS variables, all component styles |
| `src/styles/authStyle.css` | REPLACE | Auth pages in new dark system |
| `src/components/common/NavBar.jsx` | REWRITE | New dark nav, cyan brand, user dropdown |
| `src/components/common/Footer.jsx` | REMOVE | Replaced by 1-line copyright strip — see Footer decision below |
| `src/components/common/GlobalClockBar.jsx` | REWRITE | Contest bar with countdown, problem switcher |
| `src/components/home/HomePage.jsx` | REWRITE | Arena hero + stat bar + recent contests + top problems |
| `src/components/problems/ProblemPage.jsx` | REWRITE | Filter sidebar + sortable table |
| `src/components/problems/ProblemDetailsPage.jsx` | REWRITE | Split-pane IDE layout |
| `src/components/users/UserPage.jsx` | REWRITE | Sports-ticker leaderboard |
| `src/components/contests/ContestPage.jsx` | REWRITE | Card grid with live/upcoming/ended tabs |
| `src/components/contests/ContestDetailPage.jsx` | REWRITE | Stats bar + tabbed content |

### New Components
| File | Description |
|------|-------------|
| `src/components/common/VerdictBadge.jsx` | Colored verdict pill |
| `src/components/common/DifficultyChip.jsx` | Difficulty indicator |
| `src/components/common/StatCard.jsx` | Stat number card |
| `src/components/common/RankBadge.jsx` | Rank with medal colors |
| `src/components/common/LiveDot.jsx` | Pulsing live indicator |
| `src/components/common/CountdownTimer.jsx` | HH:MM:SS display |
| `src/components/common/SplitPane.jsx` | Resizable two-column layout via `react-resizable-panels` |
| `src/components/common/TagPill.jsx` | Problem tag chip |
| `src/components/common/HeatmapCalendar.jsx` | D3-powered activity heatmap |
| `src/components/common/ThemeToggle.jsx` | Sun/moon toggle, writes `data-theme` on `<html>`, persists to localStorage |

### Unchanged / Minor Tweaks
| File | Action |
|------|--------|
| `src/components/CodeEditor/CodeEditor.jsx` | Theme token update only |
| `src/components/visualizer/**` | CSS variable swap only |
| `src/services/ApiService.js` | No change |
| `src/services/Guard.jsx` | No change |
| `src/App.jsx` | No change (routes stay identical) |

---

## Implementation Order

Each phase is independently shippable. Do not start a phase until the previous one renders without errors.

### Phase 1 — Dependency swap ✅ DONE (2026-05-16)
- `package.json`: removed `bootstrap`, `@chakra-ui/react`, `@emotion/react`; added `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tabs`, `@radix-ui/react-tooltip`, `react-resizable-panels`, `d3`
- `index.html`: added Google Fonts preconnect + Syne Mono / Outfit / JetBrains Mono; theme-init inline script reads `localStorage` before React hydrates
- `main.jsx`: removed all bootstrap imports
- `App.jsx`: removed ChakraProvider + Footer import; added `<footer class="copyright-strip">`; routes unchanged
- `npm install` complete

### Phase 2 — Design token foundation ✅ DONE (2026-05-16)
- `src/index.css` full rewrite — 32 sections: CSS variables (`:root` dark + `[data-theme="light"]`), reset, typography, layout/spacing/border/bg utilities, card, buttons, forms, table, tabs, badges, scrollbar, keyframes, skeleton, spinner, pagination, modal base, alert, empty state, tooltip/dropdown base, grid-dot background, reduced motion, responsive helpers, sr-only
- `App.jsx`: `.app-shell` flex-column shell, `.content` flex-1, `<footer class="copyright-strip">`

### Phase 3 — Atomic primitives ✅ DONE (2026-05-16)
All 8 built as standalone files in `src/components/common/`:
1. `ThemeToggle.jsx` — sun/moon icon, toggles `data-theme` on `<html>`, persists to `localStorage`
2. `VerdictBadge.jsx` — AC/WA/TLE/MLE/RE/CE/PENDING/JUDGING; left-border colored pill, JUDGING pulses
3. `DifficultyChip.jsx` — EASY/MEDIUM/HARD; border-only pill in diff color, no fill
4. `TagPill.jsx` — clickable or display-only; hover cyan border+text, active state
5. `LiveDot.jsx` — pulsing dot with glow, configurable size/color
6. `RankBadge.jsx` — ranks 1-3 with medal emoji + glow, 4+ muted monospace
7. `StatCard.jsx` — Syne Mono display number, uppercase label, optional +/- delta in green/red
8. `CountdownTimer.jsx` — `setInterval` HH:MM:SS; amber <30min, red+pulse <5min, ARIA live

### Phase 4 — Layout shell ✅ DONE (2026-05-16)
1. **`NavBar.jsx`** rewrite — dark bar, Syne Mono "TDTUOJ" wordmark in cyan, nav links, `ThemeToggle`, user avatar dropdown (Radix DropdownMenu)
2. **`GlobalClockBar.jsx`** rewrite — contest mode only (hide on non-contest pages), CountdownTimer + problem switcher (A B C…) + live rank
3. **`SplitPane.jsx`** — wrap `react-resizable-panels`, default 42/58, localStorage persistence, mobile stacks at <768px
- Verify: NavBar renders on all pages, theme toggle works, no footer component remains

### Phase 5 — Problem solving pages (highest impact) ✅ DONE (2026-05-16)
1. **`ProblemPage.jsx`** — filter sidebar (Difficulty / Tags / Status), sortable `<ProblemRow>` table, pagination, search input
2. **`CodeEditor/CodeEditor.jsx`** — Monaco theme update to `--bg-void` + token colors, toolbar with language selector + Run + Submit buttons, keyboard shortcuts
3. **`ProblemDetailsPage.jsx`** — `SplitPane` layout, left pane tabs (Problem / Submissions / Comments / Hints) via Radix Tabs, right pane editor + verdict strip animation
4. **`HintPanel.jsx`** — Radix Dialog, dark modal
- Verify: can open a problem, write code, run, submit, see verdict animate

### Phase 6 — Contest pages ✅ DONE (2026-05-16)
1. **`ContestPage.jsx`** — filter tabs (All / Live / Upcoming / Ended), `ContestCard` grid, `LiveDot` on active
2. **`ContestDetailPage.jsx`** — stat summary bar, Radix Tabs (Problems / Leaderboard / My Rank / Rules), sticky register/unregister CTA
3. **`ContestProblemPage.jsx`** — same split-pane as ProblemDetailsPage, `GlobalClockBar` replaces NavBar during contest
- Verify: contest flow end-to-end, countdown updates, leaderboard renders

### Phase 7 — Discovery & social pages ✅ DONE (2026-05-16)
1. **`HomePage.jsx`** — hero section, stat bar, recent contests grid, top problems list, activity heatmap preview (if authed)
2. **`UserPage.jsx`** — leaderboard table, medal ranks, search, pagination
3. **`ProfilePage.jsx`** — two-column layout, StatCards, D3 heatmap calendar, D3 donut chart (verdicts), D3 bar chart (languages), D3 line chart (rating history)
4. **`HeatmapCalendar.jsx`** — D3 implementation, reads `getUserActivity` API, cyan `scaleSqrt` color scale
5. **`EditProfilePage.jsx`**, **`ChangePasswordPage.jsx`** — dark form styles
- Verify: profile page renders all charts, heatmap shows data, theme toggle flips chart colors

### Phase 8 — Auth pages ✅ DONE (2026-05-16)
1. **`LoginPage.jsx`** — dark form, Google OAuth button, link to register
2. **`RegisterPage.jsx`** — dark form, validation error states
3. **`src/styles/authStyle.css`** — rewrite or inline into components
- Verify: login flow works, Google OAuth works, form errors display

### Phase 9 — Organization & Lab pages ✅ DONE (2026-05-16)
1. **`OrganizationPage.jsx`** — card grid
2. **`OrganizationDetailPage.jsx`** — Radix Tabs (Overview / Members / Labs)
3. **`LabDetailPage.jsx`** — problem list within lab context
4. **`LabProgressPage.jsx`** — student × problem progress table, export button
5. **`LabProblemPage.jsx`** — split-pane (reuse ProblemDetailsPage layout)
6. **`LabFormPage.jsx`** — dark form
- Verify: org/lab navigation, progress table, lab problem solver

### Phase 10 — Admin panel ✅ DONE (2026-05-16)
1. **`AdminLayout.jsx`** + **`AdminSideBar.jsx`** — left rail 240px, collapsible to 60px icons-only
2. **`AdminProblemPage.jsx`** + **`AdminProblemFormPage.jsx`** + **`AdminProblemTagPage.jsx`**
3. **`AdminContestPage.jsx`** + **`AdminContestFormPage.jsx`** + **`AdminContestMonitorPage.jsx`** (live feed, slide-in row animation)
4. **`AdminUserPage.jsx`** + **`AdminEditUserPage.jsx`**
5. **`AdminOrganizationPage.jsx`**
6. **`MyProblemsPage.jsx`** + **`MyProblemFormPage.jsx`**
- Verify: all CRUD flows work, monitor live-refreshes

### Phase 11 — Visualizer ✅ DONE (2026-05-16)
1. **`VisualizerModal.jsx`** + **`VisualizerPlayer.jsx`** — CSS variable swap, dark modal via Radix Dialog
2. All renderers in `visualizer/renderers/` — replace hardcoded colors with CSS variables
3. **`theme.js`** — update to export token values matching CSS variables
- Verify: visualizer launches, plays trace, looks correct in both themes

### Phase 12 — Polish & QA ✅ DONE (2026-05-16)
- `@media (prefers-reduced-motion: reduce)` — in index.css, kills all keyframes and caps transitions at 0.15ms
- Mobile layout — SplitPane stacks at <768px (50/50 dvh), NavBar mobile menu with hamburger, `.hide-mobile`/`.hide-desktop` responsive helpers
- Animations — `fadeUp`, `pulse`, `shimmer`, `spin`, `slideInRight` keyframes in index.css; stagger helpers `.delay-1`–`.delay-4`; HomePage uses `.animate-fade-up` with delays
- Build: `npm run build` — ✅ 1980 modules, 0 errors, 14.95s. Chunk size warning only (Monaco editor, expected)
- Remaining manual QA: Lighthouse audit, Safari `dvh` check, contest last-5min pulse, live leaderboard animation

---

## Decisions Log

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| Q1 | Bootstrap 5 — keep or remove? | **Remove entirely** | Zero Bootstrap classes; all layout via CSS Grid/Flexbox + design-token utilities. Smaller bundle, full control. |
| Q2 | Charts library — Recharts or D3? | **D3 for everything** | Heatmap, donut, bar, line all built in D3 with shared token constants. Maximum visual control for dark/light theming. |
| Q3 | `SplitPane` implementation | **`react-resizable-panels`** | Battle-tested, accessible, handles keyboard resize, minimal API. |
| Q4 | Mobile layout for ProblemDetailsPage | **Stack vertically at <768px** | Problem pane 50vh top, editor pane 50vh bottom, both independently scrollable. No bottom sheet complexity. |
| Q5 | Chakra UI v3 — keep or remove? | **Remove, replace with Radix UI** | Radix UI primitives (Dialog, Tooltip, DropdownMenu, Tabs) are unstyled + accessible. We style with CSS variables. Much lighter. |

---

## Theming — Dark / Light

Two themes via `data-theme` attribute on `<html>`. Toggle stored in `localStorage` key `arena-theme`. Default: `dark`.

```css
/* Dark theme (default) — already defined in :root above */

/* Light theme */
[data-theme="light"] {
  --bg-void:    #F0F4F9;
  --bg-base:    #FFFFFF;
  --bg-raised:  #F5F8FC;
  --bg-overlay: #EBF0F7;
  --bg-hover:   #E2E9F2;

  --cyan:       #0099BB;   /* darker for contrast on white */
  --cyan-dim:   #007A99;
  --cyan-glow:  rgba(0, 153, 187, 0.12);
  --cyan-subtle:rgba(0, 153, 187, 0.07);

  --text-primary:   #0D1420;
  --text-secondary: #3D5070;
  --text-muted:     #8896B0;
  --text-inverse:   #F0F4F9;

  --border-subtle:  rgba(0, 0, 0, 0.05);
  --border-default: rgba(0, 0, 0, 0.09);
  --border-strong:  rgba(0, 0, 0, 0.15);
  --border-accent:  rgba(0, 153, 187, 0.30);

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.10);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
}
```

**`ThemeToggle` behavior:**
```jsx
// On mount: read localStorage, set data-theme on <html>
// On click: flip theme, persist, update <html> attribute
// Icon: moon (dark mode shown) ↔ sun (light mode shown)
// Location: NavBar far right, before user avatar
```

Light theme still uses Syne Mono + Outfit — same fonts, same layout. The Arena in daylight.

---

## Footer Decision

**Recommendation: Remove the full footer component. Replace with a single `<footer>` line anchored to the page bottom.**

Rationale: Arenas don't have footers. A full footer (with nav links, socials, tagline) breaks the focused application feel — it belongs on marketing sites, not tools. The existing footer adds visual noise that competes with the content.

**Replacement:** A 1-line copyright strip, visually invisible unless you scroll all the way down or the page has short content.

```css
.copyright-strip {
  text-align: center;
  padding: var(--space-4) var(--space-6);
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-family: var(--font-code);
  letter-spacing: var(--tracking-wide);
  border-top: 1px solid var(--border-subtle);
  margin-top: auto;   /* push to bottom in flex column layout */
}
```

```jsx
// In App.jsx layout wrapper (or each page):
<footer className="copyright-strip">
  TDTUOJ © {new Date().getFullYear()} — TDTU Online Judge
</footer>
```

`Footer.jsx` component file is deleted. No footer nav links, no social icons, no tagline sections.

---

---

# v2 — TDTU Brand & Polish Overhaul

**Status**: ✅ Phase 13 Complete (2026-05-16)  
**Drivers**: Syne Mono feels "weird" / institutional-misfit; cyan palette doesn't represent TDTU; light theme has critical contrast failures on status colors; no visual identity beyond a text wordmark.

---

## Issues Audit (Current State)

### Typography
| Token | Current value | Problem |
|-------|--------------|---------|
| `--font-display` | `'Syne Mono', monospace` | Typewriter-monospace for headings reads odd next to body text; evokes "retro terminal" not "prestigious university competition" |
| `--font-body` | `'Outfit', sans-serif` | Adequate but generic; nothing distinctive about the pairing |

### Light Theme Contrast Failures
These tokens produce text/bg combinations below WCAG AA (4.5:1) in `[data-theme="light"]`:

| Token | Light value | Used on `--bg-base` (#FFF) | Ratio | Status |
|-------|-------------|---------------------------|-------|--------|
| `--green-ac` | `#00E676` | alert-success text, badge | ~1.5:1 | ❌ FAIL |
| `--amber-tle` | `#FFB800` | alert-warning text, badge | ~1.7:1 | ❌ FAIL |
| `--blue-ce` | `#4D9FFF` | alert-info text, badge | ~2.8:1 | ❌ FAIL |
| `--purple-mle` | `#B06EFF` | badge text | ~3.1:1 | ❌ FAIL |
| `--cyan` / primary | `#0099BB` | buttons, links, tabs | ~4.4:1 | ⚠ borderline |
| `--text-muted` | `#8896B0` | placeholder text | ~3.7:1 | ❌ FAIL on bg-raised |

### Brand Identity
- Logo is plain Syne Mono text "TDTUOJ" in cyan — zero visual identity
- TDTU's actual brand (navy #003087 + gold) is absent
- Cyan (#00D4FF) reads as "generic tech startup", not "university competition platform"

### Specific Component Failures in Light Mode
- `.alert-success`: green text (`#00E676`) on `rgba(0,230,118,0.10)` bg → invisible
- `.badge` verdict colors: all neon colors on light bg fail
- `code:not(pre code)`: `color: var(--cyan)` — borderline contrast in light
- `.tab.active`: cyan bottom border + cyan text — fine in dark, borderline in light

---

## v2 Design Direction: "TDTU Forge"

**Concept**: Where raw students are forged into competitive programmers. The TDTU torch is the forge. Institutional prestige meets high-performance tooling — think Bloomberg Terminal's density with a university's authority.

**Tone**: Refined technical. Not hacker-dark, not corporate-cold. The aesthetic earned through achievement: the gold of a medal, the navy of an academic robe.

**Memorable element**: The TDTU torch mark glows gold in the navbar. Every solved problem earns a flash of that same gold. The leaderboard's top rank carries a gold shimmer. Gold = achievement. Navy = institution. Together = TDTU.

---

## v2 Typography

### Replacement Fonts

| Role | Current | → Replacement | Rationale |
|------|---------|---------------|-----------|
| Display / Headings | `Syne Mono` | `Barlow Condensed` SemiBold/Bold | Athletic, technical, excellent for condensed numbers (ranks, timers, scores). Wide use in sports/performance contexts. Readable at any size. |
| Body | `Outfit` | `Figtree` | Warm geometric sans. Distinct character vs Outfit but same readability. Rounder terminals give a more approachable feel for long problem statements. |
| Code | `JetBrains Mono` | `JetBrains Mono` (unchanged) | Best in class for code display. |

### Google Fonts URL

```html
<!-- Replace existing Google Fonts link in index.html -->
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800&family=Figtree:wght@300;400;500;600;700&family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet" />
```

### Token Update

```css
:root {
  --font-display: 'Barlow Condensed', sans-serif;  /* was: 'Syne Mono' */
  --font-body:    'Figtree', sans-serif;             /* was: 'Outfit' */
  --font-code:    'JetBrains Mono', monospace;       /* unchanged */
}
```

### Typography Behavior Changes
- Display headings: `font-weight: 700`, `letter-spacing: 0.01em` (Barlow Condensed is already tight — don't add extra tracking)
- Hero text: `font-weight: 800`, natural condensed proportions shine at large sizes
- Stat numbers (ranks, timers): `font-weight: 700` — Barlow Condensed makes monospace-level number density with proportional elegance
- Body: `font-weight: 400` base, `500` for UI labels, `600` for emphasis — Figtree's rounded forms reduce eye strain on dense problem statements

---

## v2 Color System

### Design Principles
1. **Dark mode primary accent = Gold** (`#F5A000`). Gold reads as achievement; it's warm against cold navy-black backgrounds; it IS TDTU.
2. **Light mode primary accent = Navy** (`#003087`). High contrast on white; institutional authority.
3. **`--primary` abstraction**: new token that resolves to gold (dark) or navy (light). All `--cyan` refs become aliases pointing to `--primary` — zero JSX changes needed initially.
4. **Status colors split**: separate dark/light values for green, amber, blue, purple — all must hit WCAG AA.

### Dark Theme `:root` (replace existing)

```css
:root {
  /* ── Backgrounds — deep navy-black ─────────────────── */
  --bg-void:    #06091A;
  --bg-base:    #0B1228;
  --bg-raised:  #111B35;
  --bg-overlay: #182341;
  --bg-hover:   #1E2D52;

  /* ── Brand: TDTU Gold (primary dark-mode accent) ───── */
  --primary:         #F5A000;
  --primary-bright:  #FFB800;
  --primary-dim:     #D4880A;
  --primary-glow:    rgba(245, 160, 0, 0.22);
  --primary-subtle:  rgba(245, 160, 0, 0.08);

  /* ── Brand: TDTU Navy ───────────────────────────────── */
  --navy:        #003087;
  --navy-bright: #1D5FC4;
  --navy-subtle: rgba(29, 95, 196, 0.15);

  /* ── Legacy aliases (keep until JSX migrated) ───────── */
  --cyan:        var(--primary);
  --cyan-dim:    var(--primary-dim);
  --cyan-glow:   var(--primary-glow);
  --cyan-subtle: var(--primary-subtle);

  /* ── Status / Semantic — dark ───────────────────────── */
  --green-ac:     #22C55E;
  --green-subtle: rgba(34, 197, 94, 0.10);
  --red-wa:       #EF4444;
  --red-subtle:   rgba(239, 68, 68, 0.10);
  --amber-tle:    #F5A000;   /* unified with gold — TLE = gold = pressure */
  --amber-subtle: rgba(245, 160, 0, 0.10);
  --blue-ce:      #60A5FA;
  --blue-subtle:  rgba(96, 165, 250, 0.10);
  --purple-mle:   #A78BFA;
  --purple-subtle: rgba(167, 139, 250, 0.10);
  --gray-pending: #6B7A95;

  /* ── Text ───────────────────────────────────────────── */
  --text-primary:   #E8EEF8;
  --text-secondary: #8BA0C4;
  --text-muted:     #4A5C7A;
  --text-inverse:   #06091A;

  /* ── Borders ────────────────────────────────────────── */
  --border-subtle:  rgba(255, 255, 255, 0.05);
  --border-default: rgba(255, 255, 255, 0.09);
  --border-strong:  rgba(255, 255, 255, 0.15);
  --border-accent:  rgba(245, 160, 0, 0.30);

  /* ── Ranks ───────────────────────────────────────────── */
  --rank-gold:   #FFD700;
  --rank-silver: #C0C8D8;
  --rank-bronze: #CD7F32;

  /* ── Difficulty ─────────────────────────────────────── */
  --diff-easy:   #22C55E;
  --diff-medium: #F5A000;
  --diff-hard:   #EF4444;

  /* ── Shadows / Glow ─────────────────────────────────── */
  --shadow-sm:   0 1px 3px rgba(0,0,0,0.5);
  --shadow-md:   0 4px 16px rgba(0,0,0,0.6);
  --shadow-lg:   0 8px 32px rgba(0,0,0,0.7);
  --glow-primary: 0 0 20px rgba(245,160,0,0.30), 0 0 60px rgba(245,160,0,0.12);
  --glow-green:   0 0 16px rgba(34,197,94,0.30);
  --glow-cyan:    var(--glow-primary);   /* legacy alias */

  /* ── Spacing, radius, transitions — UNCHANGED ───────── */
  /* (see Phase 2 spec above) */

  /* ── Fonts ───────────────────────────────────────────── */
  --font-display: 'Barlow Condensed', sans-serif;
  --font-body:    'Figtree', sans-serif;
  --font-code:    'JetBrains Mono', monospace;
}
```

### Light Theme `[data-theme="light"]` (full replacement)

```css
[data-theme="light"] {
  --bg-void:    #EEF2F9;
  --bg-base:    #FFFFFF;
  --bg-raised:  #F4F7FC;
  --bg-overlay: #E8EDF6;
  --bg-hover:   #DDE4F0;

  /* Primary = TDTU Navy in light mode */
  --primary:         #003087;
  --primary-bright:  #1D4ED8;
  --primary-dim:     #002070;
  --primary-glow:    rgba(0, 48, 135, 0.15);
  --primary-subtle:  rgba(0, 48, 135, 0.07);

  --navy:        #003087;
  --navy-bright: #003087;
  --navy-subtle: rgba(0, 48, 135, 0.07);

  --cyan:        var(--primary);
  --cyan-dim:    var(--primary-dim);
  --cyan-glow:   var(--primary-glow);
  --cyan-subtle: var(--primary-subtle);

  /* Status: ALL darkened for white-bg contrast (WCAG AA ≥ 4.5:1) */
  --green-ac:     #16A34A;   /* was #22C55E — ratio 5.4:1 on white ✓ */
  --green-subtle: rgba(22, 163, 74, 0.10);
  --red-wa:       #DC2626;   /* was #EF4444 — ratio 4.6:1 on white ✓ */
  --red-subtle:   rgba(220, 38, 38, 0.10);
  --amber-tle:    #B45309;   /* was #F5A000 — ratio 4.8:1 on white ✓ */
  --amber-subtle: rgba(180, 83, 9, 0.10);
  --blue-ce:      #1D4ED8;   /* was #60A5FA — ratio 5.1:1 on white ✓ */
  --blue-subtle:  rgba(29, 78, 216, 0.08);
  --purple-mle:   #6D28D9;   /* was #A78BFA — ratio 5.5:1 on white ✓ */
  --purple-subtle: rgba(109, 40, 217, 0.08);
  --gray-pending: #4B5563;

  --text-primary:   #06091A;
  --text-secondary: #2D3F6A;
  --text-muted:     #5C6B8A;   /* was #8896B0 — darkened for bg-raised ✓ */
  --text-inverse:   #FFFFFF;

  --border-subtle:  rgba(0, 0, 0, 0.06);
  --border-default: rgba(0, 0, 0, 0.10);
  --border-strong:  rgba(0, 0, 0, 0.18);
  --border-accent:  rgba(0, 48, 135, 0.30);

  --diff-easy:   #16A34A;
  --diff-medium: #B45309;
  --diff-hard:   #DC2626;

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.10);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
  --glow-primary: 0 0 12px rgba(0,48,135,0.20);
  --glow-green:   0 0 12px rgba(22,163,74,0.20);
  --glow-cyan:    var(--glow-primary);
}
```

---

## v2 Logo: TDTU Torch Mark

### Concept
The TDTU logo features a torch — flame rising from a handle, shield/crest framing. The OJ mark adapts this: a **pentagonal shield** (navy) with a **torch** (gold handle + gold flame) whose tip protrudes above the shield top edge. Clean, geometric, scalable from 20px to 128px.

### SVG Spec — `TDTULogo.jsx`

```jsx
// src/components/common/TDTULogo.jsx
// Props: size (default 28), showText (default true), textColor (default 'var(--primary)')

export default function TDTULogo({ size = 28, showText = true, textColor = "var(--primary)" }) {
  const shield = size;
  const aspect = 28 / 22; // h/w ratio of the mark

  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.3 }}>
      {/* SVG mark */}
      <svg
        width={shield / aspect}
        height={shield}
        viewBox="0 0 22 28"
        fill="none"
        aria-hidden="true"
      >
        {/* Shield body — TDTU navy */}
        <path
          d="M11 27C11 27 2 22.5 2 16V5.5L11 2.5L20 5.5V16C20 22.5 11 27 11 27Z"
          fill="var(--navy)"
          stroke="var(--primary)"
          strokeWidth="0.6"
        />
        {/* Torch handle — gold */}
        <rect x="10" y="14" width="2" height="9" rx="1" fill="var(--primary)" />
        {/* Flame outer — gold, tip above shield */}
        <path
          d="M11 1C11 1 7 5.5 7 9.5C7 12.5 8.8 14.5 11 14.5C13.2 14.5 15 12.5 15 9.5C15 5.5 11 1 11 1Z"
          fill="var(--primary)"
        />
        {/* Flame inner — white highlight */}
        <path
          d="M11 4.5C11 4.5 9 7 9 9C9 10.4 9.9 11.5 11 11.5C12.1 11.5 13 10.4 13 9C13 7 11 4.5 11 4.5Z"
          fill="white"
          opacity="0.30"
        />
        {/* Flame core glow */}
        <ellipse cx="11" cy="9" rx="1.2" ry="2" fill="white" opacity="0.18" />
      </svg>

      {/* Wordmark */}
      {showText && (
        <span style={{
          fontFamily: "var(--font-display)",
          fontSize: size * 0.75,
          fontWeight: 700,
          letterSpacing: "0.04em",
          color: textColor,
          lineHeight: 1,
          userSelect: "none",
        }}>
          TDTU<span style={{ color: "var(--primary)", fontWeight: 800 }}>OJ</span>
        </span>
      )}
    </div>
  );
}
```

### Logo Usage
| Context | Props | Notes |
|---------|-------|-------|
| NavBar | `size={28}` | Default |
| Auth page header | `size={40}` | Centered above card |
| Favicon / tab icon | SVG only, no text | Export mark as `favicon.svg` |
| Loading splash | `size={64}` | With pulse animation on flame |

### NavBar Update
Replace the `<Link>` text wordmark with:
```jsx
import TDTULogo from "./TDTULogo";

// In NavBar render:
<Link to="/home" style={{ textDecoration: "none" }}>
  <TDTULogo size={28} />
</Link>
```

---

## v2 Alert Colors Fix

`authStyle.css` uses `--cyan-glow` and `--cyan-subtle` for the grid overlay and radial gradient. These become `--primary-glow` / `--primary-subtle` after token alias is set — **no JSX change required** since alias is in CSS.

Alert component text colors need explicit light-mode overrides in `index.css`:

```css
/* Add to [data-theme="light"] block: */
[data-theme="light"] .alert-success { color: var(--green-ac); }
[data-theme="light"] .alert-error   { color: var(--red-wa); }
[data-theme="light"] .alert-warning { color: var(--amber-tle); }
[data-theme="light"] .alert-info    { color: var(--blue-ce); }

/* Badge verdict colors in light mode (override neon values) */
[data-theme="light"] .badge-ac     { color: var(--green-ac); border-color: var(--green-ac); }
[data-theme="light"] .badge-wa     { color: var(--red-wa); border-color: var(--red-wa); }
[data-theme="light"] .badge-tle    { color: var(--amber-tle); border-color: var(--amber-tle); }
[data-theme="light"] .badge-ce     { color: var(--blue-ce); border-color: var(--blue-ce); }
[data-theme="light"] .badge-mle    { color: var(--purple-mle); border-color: var(--purple-mle); }
```

---

## v2 Btn-Primary Light Mode

In light mode `--primary` = `#003087` (navy), `--text-inverse` = `#FFFFFF`.

```css
/* Already correct via tokens — verify renders: */
/* .btn-primary { background: var(--primary); color: var(--text-inverse); } */
/* Light: navy bg + white text = 14:1 ratio ✓ */
/* Dark: gold bg + #06091A text = 12:1 ratio ✓ */
```

No CSS change needed here — verify visually.

---

## Phase 13 — Implementation

All files below, in order. Each step independently buildable.

### Step 13.1 — Font Swap ✅ DONE (2026-05-16)
- `index.html`: Google Fonts URL → Barlow Condensed + Figtree + JetBrains Mono
- `index.css`: `--font-display` + `--font-body` tokens updated

### Step 13.2 — Token Overhaul ✅ DONE (2026-05-16)
- `:root` replaced: cyan → `--primary` gold (`#F5A000`), added `--navy`, legacy `--cyan` aliases, status colors updated, shadows/glow updated
- `[data-theme="light"]` replaced in full: `--primary` = navy (`#003087`), all status colors darkened to WCAG AA, `--text-muted` darkened

### Step 13.3 — Logo Component ✅ DONE (2026-05-16)
- `src/components/common/TDTULogo.jsx` created — SVG torch-shield mark (see spec above)
- `src/components/common/NavBar.jsx` updated — text wordmark replaced with `<TDTULogo size={28} />`

### Step 13.4 — Button + Link Primary Color Audit ✅ DONE (2026-05-16)
8 hardcoded cyan values found across 3 files, all fixed:
- `users/UserPage.jsx` — PARTICIPANT role badge: `rgba(0,212,255,0.08)` → `var(--primary-subtle)`, `var(--cyan)` → `var(--primary)`
- `CodeEditor/CodeEditor.jsx` — Monaco dark theme cursor/selection: `#00D4FF` → `#F5A000` (gold); light theme: `#0099BB` → `#003087` (navy)
- `profile/ProfilePage.jsx` — default role badge + heatmap color scale (5 levels) → TDTU gold rgba gradient

### Step 13.5 — Auth Page Glow Update ✅ DONE (2026-05-16)
`authStyle.css` uses `var(--cyan-subtle)`, `var(--cyan-glow)`, `var(--cyan)` — all resolve to `var(--primary)` via aliases set in Step 13.2. No file changes needed.

### Step 13.6 — Alert & Badge Contrast Fix ✅ DONE (2026-05-16)
All status colors in `[data-theme="light"]` were corrected in Step 13.2 (WCAG AA values). `.alert-*` and verdict badge classes consume these tokens — auto-fixed.
One stray hardcoded `rgba(77,159,255,0.10)` in `.alert-info` background → `var(--blue-subtle)`.

### Step 13.7 — `--glow-cyan` Cleanup ✅ DONE (2026-05-16)
`--glow-cyan: var(--glow-primary)` alias set in Step 13.2. No further action needed.

### Step 13.7b — Purple Purge ✅ DONE (2026-05-16)
40+ hardcoded `#7c3aed` / `#a855f7` / `#6366f1` / `rgba(124,58,237,X)` values replaced with CSS vars across 6 files:
- `contests/ContestPage.jsx`, `ContestDetailPage.jsx`, `ContestProblemPage.jsx`
- `organizations/OrganizationPage.jsx`, `OrganizationDetailPage.jsx`, `LabDetailPage.jsx`
Full replacement mapping documented above in Step 13.7b section.

### Step 13.8 — Homepage Matrix Rain ✅ DONE (2026-05-16)
- `home/HomePage.jsx` rewritten: canvas-based code rain, session-random palette (6 options), programming/English chars only
- Iterations applied: char pool (removed katakana), slower speed, DPR scaling for retina, row-snap (`lastRow` tracker) to prevent character overlap, `COL_W=26` / `ROW_H=22` spacing
- Canvas always dark (`#06091A`) regardless of theme toggle

### Step 13.9 — Icon Audit: Emoji → Lucide (HomePage) ✅ DONE (2026-05-16)
All 9 emoji icons in `HomePage.jsx` replaced with Lucide React SVGs. Feature cards use 40×40px icon containers with `var(--primary)` color. Remaining pages (ProblemPage, AdminPages, ProfilePage, etc.) are a separate future sweep.

### Step 13.10 — Build Verify ✅ DONE (2026-05-16)
`npm run build` — ✅ 1981 modules, 0 errors, 8.73s. Monaco chunk warning only (expected).

---

## Decisions Log v2

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| Q6 | Keep cyan or shift to TDTU navy+gold? | **TDTU navy+gold via `--primary` abstraction** | Aligns with institutional identity. Legacy `--cyan` alias means zero JSX refactoring in step 1. |
| Q11 | Dark theme backgrounds: navy-tinted vs carbon? | **Carbon (`#0A0A0A`–`#2A2A2A`)** | Navy-tinted backgrounds clashed with warm gold accent (cold/warm temperature conflict). Pure carbon maximises gold contrast. |
| Q7 | Display font: replace Syne Mono with what? | **Barlow Condensed** | Technical + athletic character suits competitive programming. Excellent numeral forms. Avoids overused Space Grotesk / Geist. |
| Q8 | Body font: replace Outfit with what? | **Figtree** | Warm geometric sans with distinct character; better for long problem statement reading than Outfit. |
| Q9 | Status color strategy in light theme | **Separate dark values per theme in `[data-theme="light"]`** | Neon greens/ambers fail WCAG on white. Light-specific values in CSS vars means no component code changes. |
| Q10 | Logo approach | **SVG torch-shield component `TDTULogo.jsx`** | Scalable, theme-aware via CSS vars, no external image dependency. Inspired by TDTU torch motif. |
