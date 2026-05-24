import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, Users, Globe, Lock, ChevronRight } from "lucide-react";
import ApiService from "../../services/ApiService";
import { useToast } from "../common/ToastMessage";
import SuggestiveSearch from "../common/SuggestiveSearch";
import FilterPills from "../common/FilterPills";
import Pagination from "../common/Pagination";

const ROLE_STYLE = {
  OWNER:  { label: "Owner",  color: "var(--amber-tle)", bg: "var(--amber-subtle)" },
  ADMIN:  { label: "Admin",  color: "var(--blue-ce)",   bg: "var(--blue-subtle)"  },
  MEMBER: { label: "Member", color: "var(--green-ac)",  bg: "var(--green-subtle)" },
};

const OrganizationPage = () => {
  const navigate = useNavigate();
  const { showMessage } = useToast();

  const [organizations, setOrganizations] = useState([]);
  const [search, setSearch]               = useState("");
  const [searchParams] = useSearchParams();
  useEffect(() => { const q = searchParams.get("q"); if (q) setSearch(q); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [loading, setLoading]             = useState(true);
  const [page, setPage]                   = useState(0);
  const [size, setSize]                   = useState(10);
  const [totalPages, setTotalPages]       = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [tab, setTab]                     = useState("ALL");

  const isAuthenticated = ApiService.isAuthenticated();

  const fetchOrgs = async () => {
    try {
      setLoading(true);
      const resp = tab === "MY" && isAuthenticated
        ? await ApiService.getMyOrganizations({ page, size })
        : await ApiService.getOrganizations({ page, size, search });
      if (resp.statusCode === 200) {
        const data    = resp.data;
        const content = data.content ?? data;
        const pi      = data.page ?? {};
        setOrganizations(content);
        setTotalPages(pi.totalPages ?? 1);
        setTotalElements(pi.totalElements ?? content.length);
      }
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrgs(); }, [page, size, tab]);

  useEffect(() => {
    if (tab !== "ALL") return;
    const t = setTimeout(() => { setPage(0); fetchOrgs(); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "var(--space-8) 0" }}>
      <div className="page-container">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

          {/* ── Hero ── */}
          <div style={{
            background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-bright) 100%)",
            borderRadius: "var(--radius-xl)", padding: "var(--space-10)",
            color: "#fff", position: "relative", overflow: "hidden", minHeight: 160,
          }}>
            <div style={{ position: "absolute", inset: 0, opacity: 0.1, backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
            <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Building2 size={36} />
                <h1 style={{ fontSize: "var(--text-3xl)", fontWeight: 900, margin: 0 }}>Organizations</h1>
              </div>
              <p style={{ fontSize: "var(--text-lg)", opacity: 0.85, margin: 0 }}>
                Browse and join study groups, teams, and communities
              </p>
              <span style={{ display: "inline-block", background: "rgba(255,255,255,0.2)", color: "#fff", padding: "4px 12px", borderRadius: "var(--radius-pill)", fontSize: "var(--text-sm)", alignSelf: "flex-start", marginTop: "var(--space-1)" }}>
                {totalElements} organizations
              </span>
            </div>
          </div>

          {/* ── Toolbar ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <SuggestiveSearch
              value={search}
              onChange={(val) => setSearch(val)}
              suggestions={["Search organizations...", "Find your class group", "Look up a department"]}
              style={{ flex: 1, minWidth: 180, maxWidth: 320 }}
            />
            {isAuthenticated && (
              <FilterPills
                value={tab}
                onChange={(v) => { setTab(v); setPage(0); }}
                options={[
                  { value: "ALL", label: "All"     },
                  { value: "MY",  label: "My Orgs", accent: "var(--primary)" },
                ]}
              />
            )}
          </div>

          {/* ── Table ── */}
          <div style={{ background: "var(--bg-raised)", borderRadius: "var(--radius-lg)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)", overflow: "hidden", position: "relative" }}>
            {loading && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(15,15,15,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                <div className="spinner" />
              </div>
            )}

            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr className="public-table-header">
                  <th style={{ width: "4%",  textAlign: "center" }}>#</th>
                  <th style={{ width: "36%" }}>Organization</th>
                  <th style={{ width: "11%" }}>Visibility</th>
                  <th style={{ width: "13%" }}>Your Role</th>
                  <th style={{ width: "10%", textAlign: "center" }}>Members</th>
                  <th style={{ width: "20%" }}>Creator</th>
                  <th style={{ width: "6%"  }} />
                </tr>
              </thead>
              <tbody>
                {organizations.length > 0 ? organizations.map((org, idx) => {
                  const rowBg = idx % 2 === 0 ? "var(--bg-raised)" : "var(--bg-overlay)";
                  const rs    = org.myRole ? ROLE_STYLE[org.myRole] : null;
                  return (
                    <tr key={org.id}
                      style={{ background: rowBg, cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-subtle)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = rowBg; }}
                      onClick={() => navigate(`/organizations/${org.slug}`)}>

                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>{page * size + idx + 1}</span>
                      </td>

                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{org.name}</span>
                          {org.about && (
                            <span style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>
                              {org.about}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)" }}>
                          {org.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                          {org.isPublic ? "Public" : "Private"}
                        </span>
                      </td>

                      <td>
                        {rs ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: "var(--radius-pill)", fontSize: "var(--text-xs)", fontWeight: 700, background: rs.bg, color: rs.color, border: `1px solid ${rs.color}33` }}>
                            {rs.label}
                          </span>
                        ) : <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>—</span>}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>
                          <Users size={13} color="var(--text-muted)" />{org.totalMembers ?? 0}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{org.creatorUsername ?? "—"}</span>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <ChevronRight size={15} color="var(--text-muted)" />
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "48px 0" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                        <Building2 size={40} color="var(--border-default)" />
                        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-muted)" }}>
                          {tab === "MY" ? "You haven't joined any organizations yet" : "No organizations found"}
                        </span>
                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                          {tab === "MY" ? "Browse organizations and join one" : "Try adjusting your search"}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalElements={totalElements}
              limit={size}
              onLimitChange={(l) => { setSize(l); setPage(0); }}
              offset={page * size}
            />
          </div>

        </div>
      </div>
    </div>
  );
};

export default OrganizationPage;
