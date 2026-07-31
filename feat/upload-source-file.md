# Upload Source File to Code Editor — Spec / Runbook

> **Repo root**: `d:\OJ`
> **Goal**: Let users upload a local source file (e.g. `solution.cpp`, `Main.java`) into the Monaco code editor on the problem-solving pages, with automatic language detection and a manual language picker fallback. After upload, the file contents appear in the IDE ready for submission.
> **Status**: spec — not yet implemented.

---

## 0. Scope

**In scope**
- An **Upload File** button in the `CodeEditor` toolbar (next to the language selector + settings gear).
- A small upload dialog/popover that lets the user:
  1. Pick a file from their local filesystem.
  2. Select the target language from the 6 supported languages (C, C++, Python, Java, C#, JavaScript) — auto-detected from the file extension, but overridable.
  3. Confirm — file contents are read client-side and injected into the Monaco editor, language selector switches to the detected/chosen language.
- Works on all three problem-solving pages that embed `<CodeEditor>`:
  - `ProblemDetailsPage.jsx`
  - `ContestProblemPage.jsx`
  - `LabProblemPage.jsx`

**Out of scope**
- Server-side file upload (the file is read entirely client-side via `FileReader`; no new API endpoint).
- Drag-and-drop onto the editor surface (future enhancement).
- Binary file support — only plain-text source files.

---

## 1. Supported Languages & Extension Mapping

The 6 languages already defined in `codeEditor/constants.js`:

| Editor key   | Display name | Judge0 ID | Recognized extensions              |
|--------------|--------------|-----------|-------------------------------------|
| `c`          | C            | 49        | `.c`                                |
| `cpp`        | C++          | 54        | `.cpp`, `.cc`, `.cxx`, `.hpp`, `.h` |
| `python`     | Python       | 71        | `.py`                               |
| `java`       | Java         | 62        | `.java`                             |
| `csharp`     | C#           | 51        | `.cs`                               |
| `javascript` | JavaScript   | 63        | `.js`, `.mjs`                       |

Add the extension→editor-key mapping as a new export in `codeEditor/constants.js`:

```js
export const EXTENSION_TO_LANGUAGE = {
  ".c":    "c",
  ".cpp":  "cpp",
  ".cc":   "cpp",
  ".cxx":  "cpp",
  ".hpp":  "cpp",
  ".h":    "c",       // ambiguous — default to C; user can override
  ".py":   "python",
  ".java": "java",
  ".cs":   "csharp",
  ".js":   "javascript",
  ".mjs":  "javascript",
};
```

> `.h` defaults to C. The user can manually switch to C++ via the language dropdown in the upload dialog if needed.

---

## 2. Frontend changes

### 2.1 `CodeEditor.jsx` — Expose `setCodeAndLanguage` via imperative handle

**File**: `tdtuoj_frontend/src/components/codeEditor/CodeEditor.jsx`

The `CodeEditor` currently exposes only a getter through `useImperativeHandle`:

```js
useImperativeHandle(ref, () => ({
  getCodeAndLanguage: () => ({ code: value, language }),
}));
```

**Add a setter** so parent pages (and the upload flow) can inject code + switch language:

```js
useImperativeHandle(ref, () => ({
  getCodeAndLanguage: () => ({ code: value, language }),
  setCodeAndLanguage: (code, lang) => {
    setValue(code);
    setLanguage(lang);
  },
}));
```

> **Why a setter on the imperative handle?** The upload button lives inside `CodeEditor` itself, so it can call `setValue` / `setLanguage` directly. But exposing the setter keeps the handle symmetrical and enables future use cases (e.g., loading code from a past submission into the editor from a parent page).

### 2.2 `CodeEditor.jsx` — Add the Upload button + flow

**Location in toolbar**: Between the settings gear button and the `{rightHeaderContent}` slot, add an upload button. The left side of the toolbar becomes:

```
[ LanguageSelector ] [ ⚙ Settings ] [ ↑ Upload ]
```

**Implementation approach**: Keep it simple — a hidden `<input type="file">` triggered by a toolbar icon button. No modal or popover needed for the MVP; a confirmation step is optional since the user explicitly chose the file.

#### Upload flow (all client-side):

1. User clicks the **Upload** button (icon: `Upload` from `lucide-react`).
2. A hidden `<input type="file" accept=".c,.cpp,.cc,.cxx,.h,.hpp,.py,.java,.cs,.js,.mjs">` opens the native file picker.
3. On file selection:
   a. Extract the file extension, look up `EXTENSION_TO_LANGUAGE[ext]`.
   b. If the extension is unrecognized, show a toast warning: _"Unrecognized file type. Please select a language manually."_ — do **not** block the upload; default to the currently selected language.
   c. Read the file contents as UTF-8 text via `FileReader.readAsText()`.
   d. Call `setValue(fileContents)` and `setLanguage(detectedLang)` to update the editor.
   e. Show a success toast: _"Loaded {filename} as {languageName}"_ (e.g., "Loaded solution.cpp as C++").
4. Reset the file input's `value` so re-uploading the same file triggers `onChange` again.

#### Size guard

Reject files larger than **256 KB** with a toast warning: _"File too large (max 256 KB)."_ — competitive programming solutions are small; this prevents accidental binary uploads.

#### Detailed code sketch

```jsx
import { Upload } from "lucide-react";
import { EXTENSION_TO_LANGUAGE, LANGUAGE_NAMES } from "./constants";

// Inside CodeEditor component body:
const fileInputRef = useRef(null);

const handleFileUpload = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Size guard
  if (file.size > 256 * 1024) {
    showMessage?.("File too large (max 256 KB)", "warning");
    e.target.value = "";
    return;
  }

  // Detect language from extension
  const ext = "." + file.name.split(".").pop().toLowerCase();
  const detectedLang = EXTENSION_TO_LANGUAGE[ext];

  const reader = new FileReader();
  reader.onload = (evt) => {
    const contents = evt.target.result;
    const lang = detectedLang || language; // fallback to current

    setValue(contents);
    setLanguage(lang);

    if (!detectedLang) {
      showMessage?.(`Unrecognized file type "${ext}". Using current language.`, "warning");
    } else {
      showMessage?.(`Loaded ${file.name} as ${LANGUAGE_NAMES[lang]}`, "success");
    }
  };
  reader.onerror = () => {
    showMessage?.("Failed to read file", "error");
  };
  reader.readAsText(file);

  // Reset so re-selecting the same file triggers onChange
  e.target.value = "";
};

// In the toolbar JSX (after the settings button):
<>
  <input
    ref={fileInputRef}
    type="file"
    accept=".c,.cpp,.cc,.cxx,.h,.hpp,.py,.java,.cs,.js,.mjs"
    style={{ display: "none" }}
    onChange={handleFileUpload}
  />
  <button
    onClick={() => fileInputRef.current?.click()}
    title="Upload source file"
    style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      width: 30, height: 30,
      borderRadius: "var(--radius-sm)",
      background: "transparent",
      border: "1px solid var(--border-default)",
      color: "var(--text-secondary)",
      cursor: "pointer", outline: "none",
      transition: "all 0.12s",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = "var(--border-strong)";
      e.currentTarget.style.color = "var(--text-primary)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = "var(--border-default)";
      e.currentTarget.style.color = "var(--text-secondary)";
    }}
  >
    <Upload size={13} />
  </button>
</>
```

### 2.3 `CodeEditor.jsx` — Toast integration

The `CodeEditor` component currently does **not** receive a toast/message callback. There are two options:

**Option A (recommended)**: Accept an optional `onMessage` prop (or use the existing `useToast` hook if `ToastProvider` wraps the editor). Since `CodeEditor` is rendered inside `ProblemDetailsPage`, `ContestProblemPage`, and `LabProblemPage` — all of which are wrapped by `ToastProvider` — importing `useToast` inside `CodeEditor` is safe:

```jsx
import { useToast } from "../common/ToastMessage";

// Inside the component:
const { showMessage } = useToast();
```

**Option B**: Pass a `showMessage` callback as a prop from each parent page. This is more explicit but requires changes to all three parent pages.

**Go with Option A** — cleaner, no parent page changes needed.

### 2.4 Constants file update

**File**: `tdtuoj_frontend/src/components/codeEditor/constants.js`

Add the `EXTENSION_TO_LANGUAGE` export (see §1 for the full map). No changes to existing exports.

### 2.5 Parent pages — no changes required

Since the upload button lives inside `CodeEditor` itself, `ProblemDetailsPage.jsx`, `ContestProblemPage.jsx`, and `LabProblemPage.jsx` need **zero changes**. The upload feature is automatically available wherever `<CodeEditor>` is used.

---

## 3. UX Details

### 3.1 Button styling

The upload button should match the settings gear button's style exactly — same dimensions (30×30), same border radius, same hover behavior. This keeps the toolbar visually consistent.

### 3.2 Button placement

```
┌─────────────────────────────────────────────────────────────┐
│  Language: [C++  ▾]  [⚙]  [↑]              [Submit] [Run]  │
│─────────────────────────────────────────────────────────────│
│                                                             │
│                    Monaco Editor                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

The `[↑]` (Upload) button sits immediately after the `[⚙]` (Settings) button, in the left cluster. The right side (`rightHeaderContent` — Submit/Run buttons) remains unchanged.

### 3.3 Overwrite warning

When the editor already contains non-empty, non-default code and the user uploads a file, the existing code will be silently replaced. **No confirmation dialog** — this matches the behavior of the language selector, which also replaces editor content with the default snippet on language switch (`onSelect`). If users request it later, a "You have unsaved changes" confirmation can be added as a follow-up.

### 3.4 Encoding

`FileReader.readAsText(file)` defaults to UTF-8. This is correct for source code files. No BOM handling is needed — Monaco handles it gracefully.

---

## 4. Touchpoint checklist

Frontend only — no backend changes:

- [ ] `codeEditor/constants.js` — add `EXTENSION_TO_LANGUAGE` export
- [ ] `codeEditor/CodeEditor.jsx`:
  - [ ] Import `Upload` from `lucide-react`
  - [ ] Import `EXTENSION_TO_LANGUAGE`, `LANGUAGE_NAMES` from `./constants`
  - [ ] Import `useToast` from `../common/ToastMessage`
  - [ ] Add `fileInputRef` and `handleFileUpload` handler
  - [ ] Add hidden `<input type="file">` and upload button to toolbar
  - [ ] Extend `useImperativeHandle` to include `setCodeAndLanguage`

No changes to:
- `ProblemDetailsPage.jsx`
- `ContestProblemPage.jsx`
- `LabProblemPage.jsx`
- `ApiService.js`
- Any backend file

---

## 5. Verification gate

**Frontend build**:
```bash
cd D:/OJ/tdtuoj_frontend
npm run build
```

Must pass before the task is reported done (per `CLAUDE.md` Build Verification Rule).

**Manual smoke test**:
1. Open any problem page (e.g., `/problems/two-sum`).
2. Click the **Upload** button in the editor toolbar → native file picker opens.
3. Select a `.cpp` file → file contents appear in the editor, language switches to C++, success toast shown.
4. Select a `.py` file → file contents replace previous, language switches to Python.
5. Select a `.txt` file → warning toast, contents loaded but language stays as-is.
6. Select a file > 256 KB → warning toast, editor contents unchanged.
7. Repeat the upload on `ContestProblemPage` and `LabProblemPage` → same behavior (since they share `CodeEditor`).
8. After uploading, click **Submit** → submission uses the correct language and uploaded code.

---

## 6. Future enhancements (out of scope)

- **Drag-and-drop**: Allow dropping a file directly onto the Monaco editor surface.
- **Download**: A companion "Download" button to save current editor contents as a file.
- **Overwrite confirmation**: Prompt when replacing non-trivial code.
- **Multi-file**: For Java packages or multi-file projects (unlikely for competitive programming).
