import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  Globe,
  Lock,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import SuggestiveSearch from "../common/SuggestiveSearch";
import FilterPills from "../common/FilterPills";

// ─── Organization Card ────────────────────────────────────────────────────────

const OrgCard = ({ org, onEnter }) => {
  const accentColor =
    org.myRole === "OWNER" ? "#f59e0b" : org.myRole ? "#22c55e" : "var(--primary)";
  const roleBg =
    org.myRole === "OWNER"
      ? "#fffbeb"
      : org.myRole === "ADMIN"
      ? "#eff6ff"
      : "#f0fdf4";
  const roleColor =
    org.myRole === "OWNER"
      ? "#d97706"
      : org.myRole === "ADMIN"
      ? "#3b82f6"
      : "#16a34a";

  return (
    <div
      className="card"
      style={{ cursor: "pointer", overflow: "hidden", display: "flex", flexDirection: "column", transition: "all 0.2s" }}
      onClick={() => onEnter(org.slug)}
    >
      {/* Accent bar */}
      <div style={{ height: 4, background: accentColor }} />

      <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {org.isPublic ? (
              <Globe size={13} color="#9ca3af" />
            ) : (
              <Lock size={13} color="#9ca3af" />
            )}
            <span className="text-xs text-muted">{org.isPublic ? "Public" : "Private"}</span>
          </div>
          {org.myRole && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 8px",
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 600,
                background: roleBg,
                color: roleColor,
              }}
            >
              {org.myRole.charAt(0) + org.myRole.slice(1).toLowerCase()}
            </span>
          )}
        </div>

        {/* Name */}
        <div>
          <p style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4, lineHeight: 1.3 }}>
            {org.name}
          </p>
          {org.about && (
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>
              {org.about}
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2" style={{ marginTop: "auto" }}>
          <Users size={13} color="#9ca3af" />
          <span className="text-xs text-muted">
            {org.totalMembers ?? 0} {(org.totalMembers ?? 0) === 1 ? "member" : "members"}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between"
        style={{ padding: "10px 20px", background: "var(--bg-raised)", borderTop: "1px solid var(--border-subtle)" }}
      >
        <span className="text-xs text-muted">by {org.creatorUsername ?? "—"}</span>
        <div className="flex items-center gap-1" style={{ color: "var(--primary)", fontSize: 12, fontWeight: 600 }}>
          <span>Detail</span>
          <ChevronRight size={13} />
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const OrganizationPage = () => {
  const navigate = useNavigate();
  const { showMessage } = useToast();

  const [organizations, setOrganizations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [tab, setTab] = useState("ALL");
  const SIZE = 12;

  const isAuthenticated = ApiService.isAuthenticated();

  const fetchOrgs = async () => {
    try {
      setLoading(true);
      let resp;
      if (tab === "MY" && isAuthenticated) {
        resp = await ApiService.getMyOrganizations({ page, size: SIZE });
      } else {
        resp = await ApiService.getOrganizations({ page, size: SIZE, search });
      }
      if (resp.statusCode === 200) {
        const data = resp.data;
        const content = data.content ?? data;
        const pageInfo = data.page ?? {};
        setOrganizations(content);
        setTotalPages(pageInfo.totalPages ?? 1);
        setTotalElements(pageInfo.totalElements ?? content.length);
      }
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, [page, tab]);

  useEffect(() => {
    if (tab === "ALL") {
      const timer = setTimeout(() => {
        setPage(0);
        fetchOrgs();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [search]);

  const TABS = isAuthenticated ? ["ALL", "MY"] : ["ALL"];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "32px 0" }}>
      <div className="page-container">
        <div className="flex flex-col gap-6">
          {/* Hero Header */}
          <div
            style={{
              background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-bright) 100%)",
              borderRadius: 16,
              padding: "40px",
              color: "white",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.1,
                backgroundImage:
                  "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            />
            <div className="flex flex-col gap-3" style={{ position: "relative" }}>
              <div className="flex items-center gap-3">
                <Building2 size={36} />
                <h2 style={{ fontSize: 32, fontWeight: 900, margin: 0 }}>Organizations</h2>
              </div>
              <p style={{ fontSize: 16, opacity: 0.85, margin: 0 }}>
                Browse and join study groups, teams, and communities
              </p>
              <div>
                <span
                  style={{
                    display: "inline-block",
                    background: "rgba(255,255,255,0.2)",
                    color: "white",
                    padding: "4px 12px",
                    borderRadius: 9999,
                    fontSize: 13,
                  }}
                >
                  {totalElements} organizations
                </span>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <SuggestiveSearch
              value={search}
              onChange={(val) => setSearch(val)}
              suggestions={[
                "Search organizations...",
                "Find your class group",
                "Look up a department",
              ]}
              style={{ width: "100%", maxWidth: 320 }}
            />

            <FilterPills
              value={tab}
              onChange={(v) => { setTab(v); setPage(0); }}
              options={[
                { value: "ALL", label: "All" },
                { value: "MY",  label: "My Orgs" },
              ]}
            />
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center gap-4" style={{ padding: "80px 0" }}>
              <div className="spinner" />
              <span className="text-muted">Loading organizations...</span>
            </div>
          ) : organizations.length === 0 ? (
            <div className="flex flex-col items-center gap-3" style={{ padding: "64px 0" }}>
              <Building2 size={48} color="var(--border-default)" />
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-muted)", margin: 0 }}>
                {tab === "MY" ? "You haven't joined any organizations yet" : "No organizations found"}
              </p>
              <p className="text-sm text-muted" style={{ margin: 0 }}>
                {tab === "MY" ? "Browse organizations and join one" : "Try adjusting your search"}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
              {organizations.map((org) => (
                <OrgCard
                  key={org.id}
                  org={org}
                  onEnter={(slug) => navigate(`/organizations/${slug}`)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="text-sm text-muted" style={{ padding: "0 8px" }}>
                Page {page + 1} of {totalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizationPage;
