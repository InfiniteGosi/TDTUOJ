import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  List, Tag, User, Trophy, Building2, BookOpen,
  LayoutDashboard, LogOut, ChevronRight,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import TDTULogo from "../common/TDTULogo";

const NAV_ITEMS = [
  { to: "/admin/problems",      label: "Problems",      Icon: List      },
  { to: "/admin/my-problems",   label: "My Problems",   Icon: BookOpen  },
  { to: "/admin/problem-tags",  label: "Problem Tags",  Icon: Tag       },
  { to: "/admin/contests",      label: "Contests",      Icon: Trophy    },
  { to: "/admin/organizations", label: "Organizations", Icon: Building2 },
];

const ADMIN_ONLY = { to: "/admin/users", label: "Users", Icon: User };

const AdminSidebar = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const isAdmin   = ApiService.isAdmin();

  const items = isAdmin ? [...NAV_ITEMS, ADMIN_ONLY] : NAV_ITEMS;
  const isActive = (to) => location.pathname.startsWith(to);

  return (
    <aside style={{
      width: 232,
      flexShrink: 0,
      background: "var(--bg-void)",
      borderRight: "1px solid var(--border-subtle)",
      display: "flex",
      flexDirection: "column",
      position: "sticky",
      top: 0,
      height: "100vh",
      overflowY: "auto",
    }}>

      {/* ── Brand header ── */}
      <div style={{
        padding: "18px 18px 14px",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
        <button
          onClick={() => navigate("/home")}
          style={{
            display: "flex", alignItems: "center",
            background: "none", border: "none", cursor: "pointer",
            padding: "4px 0", marginBottom: 12, borderRadius: "var(--radius-sm)",
            transition: "opacity 0.12s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <TDTULogo size={26} showText={true} />
        </button>

        {/* Admin badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 10px",
          background: "var(--primary-subtle)",
          border: "1px solid var(--border-accent)",
          borderRadius: "var(--radius-pill)",
        }}>
          <LayoutDashboard size={10} color="var(--primary)" />
          <span style={{
            fontFamily: "var(--font-code)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.10em",
            color: "var(--primary)",
            textTransform: "uppercase",
          }}>
            Admin Panel
          </span>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, padding: "10px 10px" }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 1 }}>
          {items.map(({ to, label, Icon }) => {
            const active = isActive(to);
            return (
              <li key={to}>
                <NavLink
                  to={to}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 10px 9px 12px",
                    borderRadius: "var(--radius-md)",
                    textDecoration: "none",
                    background: active ? "var(--primary-subtle)" : "transparent",
                    borderLeft: `3px solid ${active ? "var(--primary)" : "transparent"}`,
                    color: active ? "var(--primary)" : "var(--text-secondary)",
                    fontWeight: active ? 700 : 400,
                    fontSize: "var(--text-sm)",
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "var(--bg-raised)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }
                  }}
                >
                  <Icon size={15} strokeWidth={active ? 2.2 : 1.75} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {active && <ChevronRight size={12} strokeWidth={2.5} />}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Footer ── */}
      <div style={{
        padding: "12px 16px",
        borderTop: "1px solid var(--border-subtle)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-code)", letterSpacing: "0.06em" }}>
          v2 · Admin
        </span>
        <button
          onClick={() => navigate("/home")}
          title="Back to site"
          style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "none", border: "none", cursor: "pointer",
            fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-code)",
            letterSpacing: "0.04em", padding: "2px 4px", borderRadius: "var(--radius-sm)",
            transition: "color 0.12s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
        >
          <LogOut size={10} /> exit
        </button>
      </div>

    </aside>
  );
};

export default AdminSidebar;
