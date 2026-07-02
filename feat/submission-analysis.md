# Submission Analysis (LeetCode-style "Analysis" button)

On an **Accepted** submission's code view, an **Analysis** button calls Gemini to produce a
LeetCode-style breakdown — Approach, Efficiency (Big-O), Code Style — plus a graph plotting
the Big-O growth curve of the detected complexity class.

## Scope / decisions

- **AC-only.** Button appears only when `submissionVerdict === "AC"`.
- **Owner-only.** Endpoint requires auth; only the submission's owner (or ADMIN) may analyze.
- **Cached.** Result persisted to a new `submissions.analysis` TEXT column (JSON). Re-viewing
  returns the cached analysis instantly — no repeat Gemini call (cost + latency + demo safety).
- **Graph driven by a canonical `complexityClass`** Gemini must pick from a fixed set, so the
  frontend can map it to a math function. Display string (`currentComplexity`) is free-form.

## Backend

- `Submission` entity: add `@Column(columnDefinition="TEXT") String analysis;` (ddl-auto adds it).
- `dto/SubmissionAnalysisResult` — `{ summary, approach{current[], suggested[], keyIdea},
  efficiency{currentComplexity, suggestedComplexity, complexityClass, suggestions}, codeStyle }`.
- `service/SubmissionAnalysisService` (Gemini) — mirrors `GeminiProblemAIService`: self-contained
  WebClient, `callGemini`, `stripMarkdownFences`, JSON parse, retries. Prompt includes problem
  title + (best-effort) statement from S3 + source code + language. Forces JSON-only output and a
  `complexityClass` ∈ {O(1), O(log n), O(n), O(n log n), O(n^2), O(n^3), O(2^n), O(n!)}.
- `SubmissionServiceImpl.getSubmissionAnalysis(id)`:
  1. Load submission; 404 if missing.
  2. Guard: verdict must be AC → 400 otherwise.
  3. Guard: owner or ADMIN → 403 otherwise.
  4. If `analysis` column set → parse + return (cache hit).
  5. Else call Gemini, persist JSON, return.
- `POST /api/submissions/{id}/analysis` in `SubmissionController`. `/api/submissions/**` is already
  authenticated in SecurityConfig (not public) — good.

## Frontend

- `ApiService.getSubmissionAnalysis(id)` → `POST /submissions/{id}/analysis`.
- `components/problems/analysis/BigOChart.jsx` — recharts `LineChart`; generates points from
  `complexityClass` (n = 1..N) and plots the growth curve, labeled with the complexity.
- `components/problems/analysis/SubmissionAnalysisPanel.jsx` — renders summary banner, Approach
  (current vs suggested chips + key idea), Efficiency (complexity + BigOChart + suggestions),
  Code Style. Styled to match screenshot 3 (dark card, purple section headers, green = suggested).
- `ProblemDetailsPage` submission-detail header: add **Analysis** button when AC. Click → loading
  → fetch → toggle panel above the code block.

(Contest/Lab problem pages have their own submission views — out of scope for now, same wiring
can be replicated later.)

## Build verification

- Backend `./mvnw compile -q`, Frontend `npm run build`.
