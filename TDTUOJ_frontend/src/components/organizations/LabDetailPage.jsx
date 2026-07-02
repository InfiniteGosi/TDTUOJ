import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertTriangle,
  Circle,
  BookOpen,
  BarChart3,
  Eye,
  EyeOff,
  Trash2,
  FileText,
  Pencil,
  Code,
  X,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import { useConfirmDialog } from "../common/ConfirmDialog";

const LANG_LABELS = { CPP: "C++", JAVA: "Java", PYTHON: "Python", C: "C" };

const StatusBadge = ({ status }) => {
  const MAP = {
    SOLVED: {
      icon: CheckCircle,
      color: "var(--green-ac)",
      bg: "var(--green-subtle)",
      label: "Solved",
    },
    ATTEMPTED: {
      icon: AlertTriangle,
      color: "var(--amber-tle)",
      bg: "var(--amber-subtle)",
      label: "Attempted",
    },
    NOT_STARTED: {
      icon: Circle,
      color: "var(--text-muted)",
      bg: "var(--bg-overlay)",
      label: "Not started",
    },
  };
  const s = MAP[status] || MAP.NOT_STARTED;
  const Icon = s.icon;
  return (
    <div
      className="flex items-center gap-1"
      style={{
        display: "inline-flex",
        padding: "3px 8px",
        borderRadius: 6,
        background: s.bg,
      }}
    >
      <Icon size={13} color={s.color} />
      <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: s.color }}>
        {s.label}
      </span>
    </div>
  );
};

const DeadlineBanner = ({ deadline }) => {
  if (!deadline) return null;
  const now = new Date();
  const dl = new Date(deadline);
  const diff = dl - now;
  const isPast = diff < 0;
  const fmt = dl.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  let timeLeft = "";
  if (!isPast) {
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    timeLeft = days > 0 ? `${days}d ${hours}h left` : `${hours}h ${mins}m left`;
  }
  return (
    <div
      style={{
        background: isPast ? "var(--red-subtle)" : "var(--amber-subtle)",
        border: `1px solid ${isPast ? "var(--red-wa)" : "var(--amber-tle)"}`,
        borderRadius: 10,
        padding: "10px 16px",
      }}
    >
      <div className="flex items-center gap-2">
        <Clock
          size={16}
          color={isPast ? "var(--red-wa)" : "var(--amber-tle)"}
        />
        <span
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: isPast ? "var(--red-wa)" : "var(--amber-tle)",
          }}
        >
          {isPast ? "Deadline passed" : "Deadline"}: {fmt}
        </span>
        {!isPast && (
          <span
            style={{
              padding: "1px 8px",
              borderRadius: 6,
              background: "var(--amber-subtle)",
              fontSize: "var(--text-xs)",
              fontWeight: 700,
              color: "var(--amber-tle)",
            }}
          >
            {timeLeft}
          </span>
        )}
      </div>
    </div>
  );
};

const DIFF_COLORS = {
  EASY: { color: "var(--green-ac)", bg: "var(--green-subtle)" },
  MEDIUM: { color: "var(--amber-tle)", bg: "var(--amber-subtle)" },
  HARD: { color: "var(--red-wa)", bg: "var(--red-subtle)" },
};

const LabDetailPage = () => {
  const { orgSlug, labSlug } = useParams();
  const navigate = useNavigate();
  const { showMessage } = useToast();
  const { ConfirmDialog, showConfirm } = useConfirmDialog();

  const [org, setOrg] = useState(null);
  const [lab, setLab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewingSolution, setViewingSolution] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const orgResp = await ApiService.getOrganizationBySlug(orgSlug);
      if (orgResp.statusCode === 200) {
        setOrg(orgResp.data);
        const labResp = await ApiService.getOrgLab(orgResp.data.id, labSlug);
        if (labResp.statusCode === 200) setLab(labResp.data);
      }
    } catch (e) {
      showMessage("Failed to load lab", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orgSlug, labSlug]);

  const canManage = org && org.myRole === "OWNER";

  const handleDelete = () => {
    showConfirm(
      "Delete Lab",
      `Are you sure you want to delete "${lab.title}"? This cannot be undone.`,
      async () => {
        try {
          await ApiService.deleteLab(org.id, lab.id);
          showMessage("Lab deleted", "success");
          navigate(`/organizations/${orgSlug}`);
        } catch (e) {
          showMessage(e.response?.data?.message || e.message, "error");
        }
      },
    );
  };

  const handlePublishSolutions = async () => {
    try {
      const resp = await ApiService.publishSolutions(org.id, lab.id);
      if (resp.statusCode === 200) {
        setLab(resp.data);
        showMessage(
          resp.data.solutionsPublished
            ? "Solutions published!"
            : "Solutions unpublished",
          "success",
        );
      }
    } catch (e) {
      showMessage(e.response?.data?.message || e.message, "error");
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-base)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  if (!lab) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-base)",
          padding: "80px 0",
          textAlign: "center",
        }}
      >
        <span className="text-muted">Lab not found</span>
      </div>
    );
  }

  const exercises = lab.exercises || [];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        padding: "32px 0",
      }}
    >
      <div className="page-container">
        <div className="flex flex-col gap-6">
          {/* Back */}
          <button
            className="btn btn-ghost btn-sm"
            style={{ alignSelf: "flex-start" }}
            onClick={() => navigate(`/organizations/${orgSlug}`)}
          >
            <ArrowLeft size={18} /> Back to {org?.name}
          </button>

          {/* Header */}
          <div className="card" style={{ padding: 24 }}>
            <div
              className="flex items-center justify-between"
              style={{ alignItems: "flex-start" }}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen size={22} color="var(--primary)" />
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {lab.title}
                  </h2>
                </div>
                {lab.description && (
                  <p className="text-sm text-muted" style={{ margin: 0 }}>
                    {lab.description}
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">
                    {exercises.length} exercise
                    {exercises.length !== 1 ? "s" : ""} · {lab.totalPoints} pts
                    total
                  </span>
                  {lab.solutionsPublished && (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: "var(--text-xs)",
                        fontWeight: 600,
                        background: "var(--blue-subtle)",
                        color: "var(--blue-ce)",
                      }}
                    >
                      Solutions published
                    </span>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="flex items-center gap-2">
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ border: "1px solid var(--border-default)" }}
                    onClick={() =>
                      navigate(`/organizations/${orgSlug}/labs/${labSlug}/edit`)
                    }
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ border: "1px solid var(--border-default)" }}
                    onClick={() =>
                      navigate(
                        `/organizations/${orgSlug}/labs/${labSlug}/progress`,
                      )
                    }
                  >
                    <BarChart3 size={14} /> Progress
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{
                      border: `1px solid ${lab.solutionsPublished ? "var(--amber-tle)" : "var(--blue-ce)"}`,
                      color: lab.solutionsPublished
                        ? "var(--amber-tle)"
                        : "var(--blue-ce)",
                    }}
                    onClick={handlePublishSolutions}
                  >
                    {lab.solutionsPublished ? (
                      <EyeOff size={14} />
                    ) : (
                      <Eye size={14} />
                    )}
                    {lab.solutionsPublished ? "Unpublish" : "Publish"} Solutions
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={handleDelete}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Deadline */}
          <DeadlineBanner deadline={lab.deadline} />

          {/* Exercises table */}
          <div className="card" style={{ overflow: "hidden" }}>
            <table className="table">
              <thead>
                <tr style={{ background: "var(--bg-raised)" }}>
                  <th style={{ width: "5%" }}>#</th>
                  <th>Problem</th>
                  <th style={{ width: "12%" }}>Difficulty</th>
                  <th style={{ width: "10%" }}>Points</th>
                  <th style={{ width: "12%" }}>Status</th>
                  <th style={{ width: "8%" }}>Submissions</th>
                  {lab.solutionsPublished && (
                    <th style={{ width: "10%" }}>Solution</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {exercises.map((ex) => {
                  const dc = DIFF_COLORS[ex.problemDifficulty] || {
                    color: "var(--text-secondary)",
                    bg: "var(--bg-overlay)",
                  };
                  return (
                    <tr
                      key={ex.id}
                      style={{ cursor: "pointer" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "var(--primary-subtle)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "")
                      }
                      onClick={() =>
                        navigate(
                          `/organizations/${orgSlug}/labs/${labSlug}/problems/${ex.problemSlug}`,
                        )
                      }
                    >
                      <td>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: "var(--bg-overlay)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "var(--text-sm)",
                              fontWeight: 700,
                              color: "var(--primary)",
                            }}
                          >
                            {String.fromCharCode(64 + ex.exerciseOrder)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            fontSize: "var(--text-sm)",
                          }}
                        >
                          {ex.problemTitle}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontSize: "var(--text-xs)",
                            fontWeight: 700,
                            background: dc.bg,
                            color: dc.color,
                          }}
                        >
                          {ex.problemDifficulty || "—"}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: "var(--text-sm)",
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {ex.points}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={ex.status || "NOT_STARTED"} />
                      </td>
                      <td>
                        <span className="text-sm text-muted">
                          {ex.submissionCount ?? 0}
                        </span>
                      </td>
                      {lab.solutionsPublished && (
                        <td>
                          {ex.solutionCode ? (
                            <button
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingSolution(ex);
                              }}
                            >
                              <div
                                className="flex items-center gap-1"
                                style={{ color: "var(--primary)" }}
                              >
                                <Code size={14} />
                                <span style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>
                                  View
                                </span>
                              </div>
                            </button>
                          ) : ex.solutionFileUrl ? (
                            <a
                              href={ex.solutionFileUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div
                                className="flex items-center gap-1"
                                style={{ color: "var(--blue-ce)" }}
                              >
                                <FileText size={14} />
                                <span style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>
                                  File
                                </span>
                              </div>
                            </a>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <ConfirmDialog />

      {/* Solution Code Modal */}
      {viewingSolution && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setViewingSolution(null)}
        >
          <div
            style={{
              background: "var(--bg-void)",
              borderRadius: 14,
              padding: 24,
              maxWidth: 700,
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: 16 }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-primary)",
                    fontWeight: 700,
                    fontSize: "var(--text-base)",
                  }}
                >
                  {viewingSolution.problemTitle}
                </p>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-muted)",
                    fontSize: "var(--text-xs)",
                  }}
                >
                  Solution ·{" "}
                  {LANG_LABELS[viewingSolution.solutionLanguage] || "C++"}
                </p>
              </div>
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                }}
                onClick={() => setViewingSolution(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div
              style={{
                borderRadius: 8,
                overflow: "hidden",
                height: 400,
                border: "1px solid var(--border-default)",
              }}
            >
              <Editor
                height="100%"
                theme="vs-dark"
                language="cpp"
                value={viewingSolution.solutionCode}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: "var(--text-base)",
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  domReadOnly: true,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabDetailPage;
