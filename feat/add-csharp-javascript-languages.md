# Add C# and JavaScript Language Support — Spec / Runbook

> **Repo root**: `d:\OJ`
> **Goal**: Let users write, submit, judge, and view submissions in **C#** and **JavaScript**, alongside the existing C / C++ / Java / Python.
> **Status**: spec — not yet implemented.

---

## 0. Scope

**In scope**
- Submission + judging (Judge0) for C# and JavaScript.
- Code editor: language dropdown entries + starter boilerplate.
- Syntax highlighting in the submission viewer (highlight.js).
- Profile language-stats chart: colors + labels for the two new languages.

**Out of scope**
- **Visualizer** (`visualizer/service/instrumentor/`). No `CSharpInstrumentor` / `JavaScriptInstrumentor`. The visualizer keeps supporting Python / Java / C / C++ only. New languages simply will not appear in the visualizer flow.
- Fixing the pre-existing `C` Judge0-ID mismatch (see §5).

**Judge0 CE language IDs** (self-hosted CE defaults):
- **C# (Mono 6.6.0.161)** → `51`
- **JavaScript (Node.js 12.14.0)** → `63`

> If your Judge0 instance differs, confirm with `GET http://localhost:2358/languages` and substitute the real IDs everywhere `51` / `63` appear below.

---

## 1. Naming conventions (hold these exactly)

Three string spaces exist; keep them straight:

| Space | C# value | JavaScript value | Used by |
|-------|----------|------------------|---------|
| **Backend enum** | `CSHARP` | `JAVASCRIPT` | `SubmissionLanguage`, DTOs, DB |
| **Editor key** (lowercase) | `csharp` | `javascript` | Monaco `language` prop, `LANGUAGE_IDS`, `CODE_SNIPPETS` keys |
| **highlight.js id** | `csharp` | `javascript` | `hljs.registerLanguage`, `getHljsLanguage` return |

Bridges:
- editor key → backend enum: `mapEditorLanguageToSubmissionLanguage`
- backend enum → highlight.js id: `getHljsLanguage`

Monaco and highlight.js both ship `csharp` and `javascript` natively — no extra Monaco grammar config needed; the `language` prop passes straight through.

---

## 2. Backend changes

### 2.1 `SubmissionLanguage` enum

File: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/common/enums/SubmissionLanguage.java`

Add two values:

```java
public enum SubmissionLanguage {
    C,
    CPP,
    JAVA,
    PYTHON,
    CSHARP,
    JAVASCRIPT
}
```

### 2.2 `Judge0Service` language map

File: `TDTUOJ_backend/src/main/java/com/oj/TDTUOJ/judge0/Judge0Service.java` (around line 25)

Add the two mappings:

```java
private static final Map<SubmissionLanguage, Integer> LANGUAGE_MAP = Map.of(
        SubmissionLanguage.C,          50,
        SubmissionLanguage.CPP,        54,
        SubmissionLanguage.JAVA,       62,
        SubmissionLanguage.PYTHON,     71,
        SubmissionLanguage.CSHARP,     51,
        SubmissionLanguage.JAVASCRIPT, 63
);
```

> `Map.of` supports up to **10** key/value pairs. Six entries is fine — do **not** switch to `Map.ofEntries`.

### 2.3 No other backend changes

`Submission` entity, DTOs (`SubmissionDTO`, `SubmissionJobDTO`), `SubmissionServiceImpl`, and `SubmissionJudgeService` all reference `SubmissionLanguage` as an opaque enum — adding values requires no changes there. The async worker already forwards `job.getSubmissionLanguage()` to `Judge0Service`.

`@Enumerated(EnumType.STRING)` (verify on the `Submission.submissionLanguage` field) means new values persist by name with no migration.

---

## 3. Frontend changes

### 3.1 Editor constants

File: `tdtuoj_frontend/src/components/CodeEditor/constants.js`

**`LANGUAGE_IDS`** — add two keys:

```js
export const LANGUAGE_IDS = {
  c: "49",
  cpp: "54",
  python: "71",
  java: "62",
  csharp: "51",
  javascript: "63",
};
```

**`CODE_SNIPPETS`** — add starter boilerplate:

```js
  csharp: `using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello, World!");
    }
}
`,

  javascript: `function greet() {
    console.log("Hello, World!");
}

greet();
`,
```

> `LANGUAGE_IDS` is used only by `LanguageSelector` to fetch display names from Judge0 (`ApiService.getLanguage(id)`) and to drive the dropdown order. `CODE_SNIPPETS[lang]` seeds the editor on language switch (`CodeEditor.jsx` `onSelect`).

### 3.2 Problem submission/view pages (3 files, each has its OWN copies)

Each of these pages **independently** registers highlight.js languages and defines its own `getHljsLanguage`. Update **all three** — there is no shared util.

Files:
- `tdtuoj_frontend/src/components/problems/ProblemDetailsPage.jsx`
- `tdtuoj_frontend/src/components/contests/ContestProblemPage.jsx`
- `tdtuoj_frontend/src/components/organizations/LabProblemPage.jsx`

**(a) Imports** — alongside the existing `cpp` / `java` / `python` / `c` hljs imports, add:

```js
import csharp from "highlight.js/lib/languages/csharp";
import javascript from "highlight.js/lib/languages/javascript";
```

**(b) Registration** — alongside existing `hljs.registerLanguage(...)` calls:

```js
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("javascript", javascript);
```

**(c) `getHljsLanguage`** — add cases (return the hljs id):

```js
case "CSHARP":
  return "csharp";
case "JAVASCRIPT":
  return "javascript";
```

**(d) `mapEditorLanguageToSubmissionLanguage`** — this exists in `ProblemDetailsPage.jsx` for sure (line ~62). **Grep all three pages** for a similar editor-key → enum mapping used at submit time; wherever present, add:

```js
case "csharp":
  return "CSHARP";
case "javascript":
  return "JAVASCRIPT";
```

> If `ContestProblemPage` / `LabProblemPage` build the submission language differently (e.g. inline), trace from each page's submit handler / `codeEditorRef ... getCodeAndLanguage()` call and apply the equivalent edit so the editor key `csharp` / `javascript` becomes enum `CSHARP` / `JAVASCRIPT`.

### 3.3 Profile language-stats chart

File: `tdtuoj_frontend/src/components/profile/ProfilePage.jsx` (around line 83)

```js
const LANG_COLORS = {
  CPP:        "#4f46e5",
  C:          "#06b6d4",
  JAVA:       "#f59e0b",
  PYTHON:     "#10b981",
  CSHARP:     "#9333ea",
  JAVASCRIPT: "#eab308",
};
const LANG_LABELS = {
  CPP: "C++", C: "C", JAVA: "Java", PYTHON: "Python",
  CSHARP: "C#", JAVASCRIPT: "JavaScript",
};
```

> Colors are suggestions (purple for C#, yellow for JS). The existing `|| "#6b7280"` fallback means missing entries degrade gracefully, but add explicit ones for a clean chart.

---

## 4. Touchpoint checklist

Backend:
- [ ] `SubmissionLanguage.java` — `CSHARP`, `JAVASCRIPT` added
- [ ] `Judge0Service.java` — `LANGUAGE_MAP` += `CSHARP→51`, `JAVASCRIPT→63`

Frontend:
- [ ] `CodeEditor/constants.js` — `LANGUAGE_IDS` + `CODE_SNIPPETS`
- [ ] `ProblemDetailsPage.jsx` — imports + register + `getHljsLanguage` + `mapEditorLanguageToSubmissionLanguage`
- [ ] `ContestProblemPage.jsx` — imports + register + `getHljsLanguage` (+ submit map if present)
- [ ] `LabProblemPage.jsx` — imports + register + `getHljsLanguage` (+ submit map if present)
- [ ] `ProfilePage.jsx` — `LANG_COLORS` + `LANG_LABELS`

Grep sweep before declaring done (catch any missed copy):
```
rg -n "PYTHON|JAVA|case \"python\"|case \"java\"|registerLanguage|getHljsLanguage|LANG_COLORS|LANGUAGE_IDS|CODE_SNIPPETS" tdtuoj_frontend/src
```
Any location that enumerates the existing 4 languages but is **not** in the checklist above must be evaluated and either updated or explicitly judged irrelevant.

---

## 5. Known pre-existing issue (do NOT fix here)

Frontend `LANGUAGE_IDS.c = "49"` but backend `LANGUAGE_MAP` maps `C → 50`. The frontend `49` is used only by `LanguageSelector` for the Judge0 **display name** lookup; actual judging uses the backend `50`. This is a latent display inconsistency, **out of scope** for this task. Note it; do not change it.

---

## 6. Verification gate

**Backend**
```bash
cd D:/OJ/TDTUOJ_backend
./mvnw compile -q
```

**Frontend**
```bash
cd D:/OJ/tdtuoj_frontend
npm run build
```

Both must pass before the task is reported done (per `CLAUDE.md` Build Verification Rule).

**Manual smoke test** (requires Judge0 with C# id 51 and JS id 63 available):
1. Open a problem, select **C#** in the editor → boilerplate appears.
2. Submit a correct C# solution → verdict `AC`.
3. Open the submission in the viewer → C# source is syntax-highlighted (not plain text).
4. Repeat 1–3 for **JavaScript**.
5. Visit a profile with C#/JS submissions → language pie chart shows correct label + color.

If Judge0 lacks these language IDs, judging will fail — confirm availability via `GET /languages` first.