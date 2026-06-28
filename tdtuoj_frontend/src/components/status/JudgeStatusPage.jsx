import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import ApiService from "../../services/ApiService";

const REFRESH_MS = 10_000;

const JudgeStatusPage = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await ApiService.getJudgeStatus();
      if (r.statusCode === 200) {
        setStatus(r.data);
        setError(false);
        setLastUpdated(new Date());
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const reachable = status?.reachable;
  const workers = status?.workers ?? [];

  return (
    <div className="page-container">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-4)",
          marginBottom: "var(--space-5)",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-2xl)",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Judge Status
          </h1>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
              margin: "var(--space-1) 0 0",
            }}
          >
            Live health of the code-execution engine (Judge0).
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            fontFamily: "var(--font-code)",
          }}
        >
          <RefreshCw size={13} />
          {lastUpdated
            ? `Updated ${lastUpdated.toLocaleTimeString()}`
            : "Loading…"}
        </div>
      </div>

      {/* Offline banner */}
      {!loading && (error || !reachable) && (
        <div
          className="card"
          style={{
            borderColor: "var(--red-wa)",
            background: "var(--red-wa-subtle, transparent)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            color: "var(--red-wa)",
            marginBottom: "var(--space-5)",
          }}
        >
          <XCircle size={18} />
          <span style={{ fontWeight: 600 }}>
            Judge engine offline — submissions cannot be processed right now.
          </span>
        </div>
      )}

      {/* Engine summary */}
      {reachable && (
        <div
          className="card"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-6)",
            marginBottom: "var(--space-5)",
          }}
        >
          <SummaryItem label="Version" value={status.version ?? "—"} />
          {status.system?.cpu && (
            <SummaryItem label="CPU" value={status.system.cpu} />
          )}
          {status.system?.arch && (
            <SummaryItem label="Arch" value={status.system.arch} />
          )}
          {status.system?.cpus && (
            <SummaryItem label="CPUs" value={status.system.cpus} />
          )}
          {status.system?.mem && (
            <SummaryItem label="Memory" value={status.system.mem} />
          )}
        </div>
      )}

      {/* Workers table */}
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Queue</th>
              <th style={{ textAlign: "center" }}>Available?</th>
              <th style={{ textAlign: "center" }}>Ping</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                  Loading…
                </td>
              </tr>
            ) : workers.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                  No worker queues reported.
                </td>
              </tr>
            ) : (
              workers.map((w, i) => (
                <tr key={w.queue ?? i}>
                  <td style={{ fontFamily: "var(--font-code)", fontWeight: 600 }}>
                    {w.queue}
                  </td>
                  <td>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      {w.available ? (
                        <CheckCircle2 size={18} color="var(--green-ac, #22c55e)" />
                      ) : (
                        <XCircle size={18} color="var(--red-wa, #ef4444)" />
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: "center", fontFamily: "var(--font-code)" }}>
                    {status.pingMs != null ? `${status.pingMs} ms` : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SummaryItem = ({ label, value }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
    <span
      style={{
        fontSize: "var(--text-xs)",
        textTransform: "uppercase",
        letterSpacing: "var(--tracking-wider)",
        color: "var(--text-muted)",
        fontWeight: 700,
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: "var(--text-sm)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-code)",
      }}
    >
      {value}
    </span>
  </div>
);

export default JudgeStatusPage;
