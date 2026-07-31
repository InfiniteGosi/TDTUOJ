import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import Editor from "@monaco-editor/react";
import LanguageSelector from "./LanguageSelector";
import { CODE_SNIPPETS, EXTENSION_TO_LANGUAGE, LANGUAGE_NAMES } from "./constants";
import { Settings, X, Type, AlignJustify, Zap, Upload } from "lucide-react";
import { useToast } from "../common/ToastMessage";

// ─── Monaco theme definitions ─────────────────────────────────────────────────
const ARENA_DARK = {
  base: "vs-dark", inherit: true,
  rules: [
    { token: "comment",              foreground: "4A5C7A", fontStyle: "italic" },
    { token: "keyword",              foreground: "F5A000", fontStyle: "bold" },
    { token: "keyword.operator",     foreground: "D4880A" },
    { token: "storage.type",         foreground: "F5A000", fontStyle: "bold" },
    { token: "storage.modifier",     foreground: "F5A000" },
    { token: "string",               foreground: "C49050" },
    { token: "string.escape",        foreground: "FFB800" },
    { token: "number",               foreground: "FFB800" },
    { token: "constant.numeric",     foreground: "FFB800" },
    { token: "constant.language",    foreground: "F5A000" },
    { token: "type",                 foreground: "8EADD4" },
    { token: "type.identifier",      foreground: "8EADD4" },
    { token: "entity.name.function", foreground: "FFD070" },
    { token: "support.function",     foreground: "FFD070" },
    { token: "variable",             foreground: "C0CEED" },
    { token: "variable.parameter",   foreground: "B0BEDD" },
    { token: "identifier",           foreground: "E8EEF8" },
    { token: "operator",             foreground: "D4880A" },
    { token: "delimiter",            foreground: "8BA0C4" },
    { token: "delimiter.bracket",    foreground: "A0B4C8" },
    { token: "tag",                  foreground: "F5A000" },
    { token: "attribute.name",       foreground: "C8A060" },
    { token: "attribute.value",      foreground: "C49050" },
    { token: "annotation",           foreground: "F5A000", fontStyle: "italic" },
    { token: "metatag",              foreground: "4A5C7A" },
    { token: "regexp",               foreground: "C8A060" },
  ],
  colors: {
    "editor.background":             "#0A0A0A",
    "editor.foreground":             "#E8EEF8",
    "editor.lineHighlightBackground":"#1A1A1A",
    "editorLineNumber.foreground":   "#3A3A3A",
    "editorLineNumber.activeForeground": "#666666",
    "editor.selectionBackground":    "#F5A00028",
    "editorCursor.foreground":       "#F5A000",
    "editor.inactiveSelectionBackground": "#F5A00012",
    "editorIndentGuide.background1": "#1E1E1E",
    "editorIndentGuide.activeBackground1": "#333333",
    "editorWidget.background":       "#1A1A1A",
    "editorWidget.border":           "#333333",
    "editorSuggestWidget.background":"#1A1A1A",
    "editorSuggestWidget.border":    "#333333",
    "editorSuggestWidget.selectedBackground": "#F5A00018",
    "editorBracketMatch.background": "#F5A00018",
    "editorBracketMatch.border":     "#F5A00055",
  },
};
const ARENA_LIGHT = {
  base: "vs", inherit: true,
  rules: [
    { token: "comment",              foreground: "5C6B8A", fontStyle: "italic" },
    { token: "keyword",              foreground: "003087", fontStyle: "bold" },
    { token: "keyword.operator",     foreground: "002070" },
    { token: "storage.type",         foreground: "003087", fontStyle: "bold" },
    { token: "string",               foreground: "7A4018" },
    { token: "string.escape",        foreground: "1D4ED8" },
    { token: "number",               foreground: "1D4ED8" },
    { token: "constant.numeric",     foreground: "1D4ED8" },
    { token: "constant.language",    foreground: "003087" },
    { token: "type",                 foreground: "003070" },
    { token: "type.identifier",      foreground: "003070" },
    { token: "entity.name.function", foreground: "1D4ED8" },
    { token: "support.function",     foreground: "1D4ED8" },
    { token: "variable",             foreground: "06091A" },
    { token: "variable.parameter",   foreground: "2D3F6A" },
    { token: "identifier",           foreground: "06091A" },
    { token: "operator",             foreground: "002070" },
    { token: "delimiter",            foreground: "2D3F6A" },
    { token: "delimiter.bracket",    foreground: "2D3F6A" },
    { token: "tag",                  foreground: "003087" },
    { token: "attribute.name",       foreground: "2D5A9A" },
    { token: "attribute.value",      foreground: "7A4018" },
    { token: "annotation",           foreground: "003087", fontStyle: "italic" },
    { token: "regexp",               foreground: "7A4018" },
  ],
  colors: {
    "editor.background":             "#FFFFFF",
    "editor.foreground":             "#06091A",
    "editor.lineHighlightBackground":"#F4F7FC",
    "editorLineNumber.foreground":   "#8896B0",
    "editor.selectionBackground":    "#00308725",
    "editorCursor.foreground":       "#003087",
    "editor.inactiveSelectionBackground": "#00308712",
    "editorWidget.background":       "#F4F7FC",
    "editorWidget.border":           "#D0D8EC",
    "editorBracketMatch.background": "#00308715",
    "editorBracketMatch.border":     "#00308740",
  },
};

// ─── Settings persistence ─────────────────────────────────────────────────────
const LS_KEY = "arena-editor-settings";
const loadSettings = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } };
const saveSettings = (s) => { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {} };

// ─── Settings panel style helpers ────────────────────────────────────────────
const sLabel = {
  fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)",
  fontFamily: "var(--font-code)", letterSpacing: "0.07em",
  display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
};
const sChip = (active) => ({
  padding: "4px 12px", borderRadius: "var(--radius-pill)",
  fontSize: "var(--text-xs)", fontWeight: 600, fontFamily: "var(--font-body)",
  cursor: "pointer", outline: "none", transition: "all 0.12s",
  border: `1px solid ${active ? "var(--primary)" : "var(--border-default)"}`,
  background: active ? "var(--primary-subtle)" : "transparent",
  color: active ? "var(--primary)" : "var(--text-secondary)",
});

const CodeEditor = forwardRef(({ rightHeaderContent }, ref) => {
  const editorRef      = useRef(null);
  const panelRef       = useRef(null);
  const settingsBtnRef = useRef(null);
  const fileInputRef   = useRef(null);

  const { showMessage } = useToast();

  const [value, setValue]     = useState(CODE_SNIPPETS["c"]);
  const [language, setLanguage] = useState("c");
  const [isDark, setIsDark]   = useState(
    () => (document.documentElement.getAttribute("data-theme") ?? "dark") === "dark"
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelPos, setPanelPos]         = useState(null);

  // Settings (persisted)
  const saved = loadSettings();
  const [fontSize,     setFontSize]     = useState(saved.fontSize     ?? 14);
  const [tabSize,      setTabSize]      = useState(saved.tabSize      ?? 4);
  const [intellisense, setIntellisense] = useState(saved.intellisense ?? false);

  // Persist on change
  useEffect(() => {
    saveSettings({ fontSize, tabSize, intellisense });
  }, [fontSize, tabSize, intellisense]);

  // Track theme changes
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.getAttribute("data-theme") === "dark")
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // Swap Monaco theme
  useEffect(() => {
    if (!editorRef.current) return;
    const monaco = editorRef.current._themeService?._standaloneThemeService;
    if (monaco) monaco.setTheme(isDark ? "arena-dark" : "arena-light");
  }, [isDark]);

  // Apply editor options on change
  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.updateOptions(buildOptions());
  }, [fontSize, tabSize, intellisense]); // eslint-disable-line

  // Click-outside to close settings
  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e) => {
      if (panelRef.current   && !panelRef.current.contains(e.target) &&
          settingsBtnRef.current && !settingsBtnRef.current.contains(e.target))
        setSettingsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [settingsOpen]);

  const buildOptions = () => ({
    fontSize,
    tabSize,
    fontFamily: "var(--font-code)",
    fontLigatures: true,
    minimap: { enabled: false },
    suggestOnTriggerCharacters: intellisense,
    quickSuggestions: intellisense ? { other: true, comments: false, strings: false } : false,
    wordBasedSuggestions: intellisense ? "currentDocument" : "off",
    parameterHints: { enabled: intellisense },
    snippetSuggestions: intellisense ? "inline" : "none",
    tabCompletion: "on",
    lineNumbers: "on",
    renderLineHighlight: "line",
    scrollBeyondLastLine: false,
    padding: { top: 12, bottom: 12 },
  });

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monaco.editor.defineTheme("arena-dark", ARENA_DARK);
    monaco.editor.defineTheme("arena-light", ARENA_LIGHT);
    monaco.editor.setTheme(isDark ? "arena-dark" : "arena-light");
    editor.updateOptions(buildOptions());
    editor.focus();
  };

  const onSelect = (lang) => { setLanguage(lang); setValue(CODE_SNIPPETS[lang]); };

  const openSettings = () => {
    if (settingsBtnRef.current) {
      const r = settingsBtnRef.current.getBoundingClientRect();
      setPanelPos({ top: r.bottom + 6, left: r.left });
    }
    setSettingsOpen((v) => !v);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Size guard — reject files over 256 KB
    if (file.size > 256 * 1024) {
      showMessage("File too large (max 256 KB)", "warning");
      e.target.value = "";
      return;
    }

    // Detect language from extension
    const ext = "." + file.name.split(".").pop().toLowerCase();
    const detectedLang = EXTENSION_TO_LANGUAGE[ext];

    const reader = new FileReader();
    reader.onload = (evt) => {
      const contents = evt.target.result;
      const lang = detectedLang || language; // fallback to current language
      setValue(contents);
      setLanguage(lang);
      if (!detectedLang) {
        showMessage(`Unrecognized file type "${ext}". Using current language.`, "warning");
      } else {
        showMessage(`Loaded ${file.name} as ${LANGUAGE_NAMES[lang]}`, "success");
      }
    };
    reader.onerror = () => {
      showMessage("Failed to read file", "error");
    };
    reader.readAsText(file);

    // Reset so re-selecting the same file fires onChange again
    e.target.value = "";
  };

  useImperativeHandle(ref, () => ({
    getCodeAndLanguage: () => ({ code: value, language }),
    setCodeAndLanguage: (code, lang) => { setValue(code); setLanguage(lang); },
  }));

  // ─── Settings panel (portal so it escapes Panel overflow:hidden) ──────────
  const settingsPanel = settingsOpen && panelPos && createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: panelPos.top,
        left: panelPos.left,
        zIndex: 9999,
        width: 292,
        background: "var(--bg-raised)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-lg)",
        padding: "16px 18px 18px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-base)", color: "var(--text-primary)", letterSpacing: "0.03em" }}>
          EDITOR SETTINGS
        </span>
        <button onClick={() => setSettingsOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", padding: 2, borderRadius: "var(--radius-sm)", transition: "color 0.12s" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Font size */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={sLabel}><Type size={11} />FONT SIZE</span>
          <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)", background: "var(--primary-subtle)", border: "1px solid var(--border-accent)", padding: "1px 7px", borderRadius: "var(--radius-sm)" }}>
            {fontSize}px
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-code)", userSelect: "none" }}>A</span>
          <input type="range" min={12} max={21} step={1} value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            style={{ flex: 1, accentColor: "var(--primary)", cursor: "pointer" }}
          />
          <span style={{ fontSize: 14, color: "var(--text-muted)", fontFamily: "var(--font-code)", userSelect: "none" }}>A</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, paddingLeft: 16, paddingRight: 16 }}>
          {[12, 14, 16, 18, 21].map((n) => (
            <span key={n} onClick={() => setFontSize(n)} style={{ fontSize: 9, color: fontSize === n ? "var(--primary)" : "var(--text-muted)", fontFamily: "var(--font-code)", cursor: "pointer", userSelect: "none", fontWeight: fontSize === n ? 700 : 400 }}>
              {n}
            </span>
          ))}
        </div>
      </div>

      {/* Tab width */}
      <div style={{ marginBottom: 20 }}>
        <span style={sLabel}><AlignJustify size={11} />TAB WIDTH</span>
        <div style={{ display: "flex", gap: 6 }}>
          {[2, 4].map((n) => (
            <button key={n} onClick={() => setTabSize(n)} style={sChip(tabSize === n)}>
              {n} spaces
            </button>
          ))}
        </div>
      </div>

      {/* Intellisense */}
      <div style={{ marginBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={sLabel}><Zap size={11} />INTELLISENSE</span>
            <p style={{ margin: "-4px 0 0", fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              Autocomplete & parameter hints
            </p>
          </div>
          <button onClick={() => setIntellisense((v) => !v)} style={{ width: 40, height: 22, borderRadius: "var(--radius-pill)", background: intellisense ? "var(--primary)" : "var(--bg-overlay)", border: `1px solid ${intellisense ? "var(--primary)" : "var(--border-default)"}`, cursor: "pointer", outline: "none", padding: 0, position: "relative", transition: "background 0.2s, border-color 0.2s", flexShrink: 0 }}>
            <span style={{ position: "absolute", top: 2, left: intellisense ? "calc(100% - 18px)" : 2, width: 16, height: 16, borderRadius: "50%", background: intellisense ? "var(--text-inverse)" : "var(--text-muted)", transition: "left 0.2s", display: "block" }} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* ── Toolbar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 var(--space-4)", minHeight: 52, background: "var(--bg-raised)", borderBottom: "1px solid var(--border-default)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LanguageSelector language={language} onSelect={onSelect} />
          <button
            ref={settingsBtnRef}
            onClick={openSettings}
            title="Editor settings"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "var(--radius-sm)", background: settingsOpen ? "var(--primary-subtle)" : "transparent", border: `1px solid ${settingsOpen ? "var(--primary)" : "var(--border-default)"}`, color: settingsOpen ? "var(--primary)" : "var(--text-secondary)", cursor: "pointer", outline: "none", transition: "all 0.12s" }}
            onMouseEnter={(e) => { if (!settingsOpen) { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text-primary)"; } }}
            onMouseLeave={(e) => { if (!settingsOpen) { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-secondary)"; } }}
          >
            <Settings size={13} />
          </button>
          {/* ── Upload source file ── */}
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
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "var(--radius-sm)", background: "transparent", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", outline: "none", transition: "all 0.12s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            <Upload size={13} />
          </button>
        </div>
        <div>{rightHeaderContent}</div>
      </div>

      {settingsPanel}

      {/* ── Editor ── */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Editor
          height="100%"
          theme={isDark ? "arena-dark" : "arena-light"}
          language={language}
          value={value}
          onMount={handleMount}
          onChange={setValue}
          options={buildOptions()}
        />
      </div>

    </div>
  );
});

CodeEditor.displayName = "CodeEditor";
export default CodeEditor;
