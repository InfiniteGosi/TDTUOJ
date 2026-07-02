import { ThumbsUp, Zap, Code2, Route, CheckCircle2 } from "lucide-react";
import BigOChart from "./BigOChart";

// Renders the LeetCode-style AI analysis: summary, approach (current vs suggested),
// efficiency (complexity + Big-O graph), and code-style feedback.

const Chip = ({ label, suggested }) => (
  <span
    style={{
      display: "inline-block",
      padding: "2px 9px",
      borderRadius: "var(--radius-sm)",
      fontSize: "var(--text-xs)",
      fontWeight: 600,
      fontFamily: "var(--font-code)",
      border: `1px solid ${suggested ? "var(--green-ac)" : "var(--border-default)"}`,
      color: suggested ? "var(--green-ac)" : "var(--text-secondary)",
      background: suggested ? "var(--green-subtle)" : "var(--bg-overlay)",
    }}
  >
    {label}
  </span>
);

const SectionHeader = ({ icon: Icon, children }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 7,
      color: "var(--purple-mle, #A78BFA)",
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: "var(--text-sm)",
      marginBottom: 8,
    }}
  >
    <Icon size={15} />
    {children}
  </div>
);

const Row = ({ label, children }) => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", minWidth: 78, fontWeight: 600 }}>
      {label}
    </span>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>{children}</div>
  </div>
);

const SubmissionAnalysisPanel = ({ data }) => {
  if (!data) return null;
  const { summary, approach, efficiency, codeStyle } = data;

  return (
    <div
      style={{
        margin: "0 16px 16px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-default)",
        background: "var(--bg-raised)",
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      {/* Summary banner */}
      {summary && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <CheckCircle2 size={16} color="var(--green-ac)" style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)", lineHeight: 1.5 }}>
            {summary}
          </span>
        </div>
      )}

      {/* Approach */}
      {approach && (
        <div>
          <SectionHeader icon={Route}>Approach</SectionHeader>
          {approach.current?.length > 0 && (
            <Row label="Current">
              {approach.current.map((t, i) => <Chip key={i} label={t} />)}
            </Row>
          )}
          {approach.suggested?.length > 0 && (
            <Row label="Suggested">
              {approach.suggested.map((t, i) => <Chip key={i} label={t} suggested />)}
            </Row>
          )}
          {approach.keyIdea && (
            <Row label="Key idea">
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {approach.keyIdea}
              </span>
            </Row>
          )}
        </div>
      )}

      {/* Efficiency */}
      {efficiency && (
        <div>
          <SectionHeader icon={Zap}>Efficiency</SectionHeader>
          <Row label="Current">
            <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--text-sm)", color: "var(--text-primary)", fontWeight: 700 }}>
              {efficiency.currentComplexity}
            </span>
          </Row>
          {efficiency.suggestedComplexity && (
            <Row label="Optimal">
              <span style={{ fontFamily: "var(--font-code)", fontSize: "var(--text-sm)", color: "var(--green-ac)", fontWeight: 700 }}>
                {efficiency.suggestedComplexity}
              </span>
            </Row>
          )}
          <div style={{ marginTop: 10 }}>
            <BigOChart complexityClass={efficiency.complexityClass} />
          </div>
          {efficiency.suggestions && (
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.6, margin: "8px 0 0" }}>
              {efficiency.suggestions}
            </p>
          )}
        </div>
      )}

      {/* Code style */}
      {codeStyle && (
        <div>
          <SectionHeader icon={Code2}>Code Style</SectionHeader>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
            {codeStyle}
          </p>
        </div>
      )}
    </div>
  );
};

export default SubmissionAnalysisPanel;
