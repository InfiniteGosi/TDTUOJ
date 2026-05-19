import { useState, useEffect } from "react";
import { ArrowLeft, Download, CheckCircle, AlertTriangle, Circle, BarChart3 } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";

const StatusCell = ({ status }) => {
  const MAP = {
    SOLVED: { icon: CheckCircle, color: "#16a34a", bg: "#dcfce7" },
    ATTEMPTED: { icon: AlertTriangle, color: "#ea580c", bg: "#fff7ed" },
    NOT_STARTED: { icon: Circle, color: "#9ca3af", bg: "#f9fafb" },
  };
  const s = MAP[status] || MAP.NOT_STARTED;
  const Icon = s.icon;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 6, background: s.bg, margin: "0 auto" }}>
      <Icon size={16} color={s.color} />
    </div>
  );
};

const LabProgressPage = () => {
  const { orgSlug, labSlug } = useParams();
  const navigate = useNavigate();
  const { showMessage } = useToast();

  const [org, setOrg] = useState(null);
  const [lab, setLab] = useState(null);
  const [progress, setProgress] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const orgResp = await ApiService.getOrganizationBySlug(orgSlug);
        if (orgResp.statusCode !== 200) return;
        setOrg(orgResp.data);

        const labResp = await ApiService.getOrgLab(orgResp.data.id, labSlug);
        if (labResp.statusCode !== 200) return;
        setLab(labResp.data);
        setExercises(labResp.data.exercises || []);

        const progResp = await ApiService.getLabProgress(orgResp.data.id, labResp.data.id);
        if (progResp.statusCode === 200) setProgress(progResp.data || []);
      } catch (e) {
        showMessage("Failed to load progress", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [orgSlug, labSlug]);

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const blob = await ApiService.exportLabProgress(org.id, lab.id, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lab-progress.${format === "xlsx" ? "xlsx" : "csv"}`;
      a.click();
      window.URL.revokeObjectURL(url);
      showMessage(`Exported as ${format.toUpperCase()}`, "success");
    } catch (e) {
      showMessage("Export failed", "error");
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!lab) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "80px 0", textAlign: "center" }}>
        <span className="text-muted">Lab not found</span>
      </div>
    );
  }

  const exCompletionPct = exercises.map((_, exIdx) => {
    if (progress.length === 0) return 0;
    const solved = progress.filter((s) => s.exerciseStatuses?.[exIdx]?.status === "SOLVED").length;
    return Math.round((solved / progress.length) * 100);
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0" }}>
      <div className="page-container">
        <div className="flex flex-col gap-6">
          {/* Back */}
          <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => navigate(`/organizations/${orgSlug}/labs/${labSlug}`)}>
            <ArrowLeft size={18} /> Back to {lab.title}
          </button>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={22} color="#7c3aed" />
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>Progress — {lab.title}</h2>
              <span style={{ padding: "2px 8px", borderRadius: 6, background: "#f5f3ff", fontSize: 11, fontWeight: 600, color: "#7c3aed" }}>
                {progress.length} student{progress.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn btn-ghost btn-sm" style={{ border: "1px solid var(--border-default)" }} onClick={() => handleExport("csv")} disabled={!!exporting}>
                {exporting === "csv" ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Download size={14} />} CSV
              </button>
              <button className="btn btn-ghost btn-sm" style={{ border: "1px solid var(--border-default)" }} onClick={() => handleExport("xlsx")} disabled={!!exporting}>
                {exporting === "xlsx" ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Download size={14} />} XLSX
              </button>
            </div>
          </div>

          {/* Progress grid */}
          <div className="card" style={{ overflowX: "auto" }}>
            <table className="table" style={{ minWidth: "max-content" }}>
              <thead>
                <tr style={{ background: "#faf5ff" }}>
                  <th style={{ position: "sticky", left: 0, background: "#faf5ff", minWidth: 150, zIndex: 1 }}>Student</th>
                  {exercises.map((ex, idx) => (
                    <th key={ex.id} style={{ textAlign: "center", minWidth: 60 }}>
                      <span style={{ fontWeight: 700, color: "#7c3aed", fontSize: 12 }}>{String.fromCharCode(65 + idx)}</span>
                    </th>
                  ))}
                  <th style={{ textAlign: "center", minWidth: 70 }}>Solved</th>
                  <th style={{ textAlign: "center", minWidth: 80 }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {progress.map((student) => (
                  <tr key={student.userId}>
                    <td style={{ position: "sticky", left: 0, background: "white", zIndex: 1 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{student.name || student.username}</p>
                        {student.name && <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>@{student.username}</p>}
                      </div>
                    </td>
                    {(student.exerciseStatuses || []).map((es, idx) => (
                      <td key={idx} style={{ textAlign: "center" }}>
                        <StatusCell status={es.status} />
                      </td>
                    ))}
                    <td style={{ textAlign: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                        {student.solvedCount}/{exercises.length}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#7c3aed" }}>
                        {student.earnedPoints}/{student.totalPoints}
                      </span>
                    </td>
                  </tr>
                ))}

                {progress.length > 0 && (
                  <tr style={{ background: "var(--bg-raised)" }}>
                    <td style={{ position: "sticky", left: 0, background: "var(--bg-raised)", zIndex: 1 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>COMPLETION %</span>
                    </td>
                    {exCompletionPct.map((pct, idx) => (
                      <td key={idx} style={{ textAlign: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: pct === 100 ? "#16a34a" : pct > 50 ? "#ea580c" : "#dc2626" }}>
                          {pct}%
                        </span>
                      </td>
                    ))}
                    <td /><td />
                  </tr>
                )}
              </tbody>
            </table>

            {progress.length === 0 && (
              <div style={{ padding: "48px 0", textAlign: "center" }}>
                <span className="text-muted">No students have submitted yet.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabProgressPage;
