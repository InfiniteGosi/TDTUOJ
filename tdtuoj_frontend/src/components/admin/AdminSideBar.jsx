import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  List, Tag, User, Trophy, Building2, BookOpen,
  LayoutDashboard, ChevronRight,
} from "lucide-react";
import ApiService from "../../services/ApiService";

const NAV_ITEMS = [
  { to: "/admin/problems",      label: "Problems",      Icon: List },
  { to: "/admin/my-problems",   label: "My Problems",   Icon: BookOpen },
  { to: "/admin/problem-tags",  label: "Problem Tags",  Icon: Tag },
  { to: "/admin/contests",      label: "Contests",      Icon: Trophy },
  { to: "/admin/organizations", label: "Organizations", Icon: Building2 },
];

const ADMIN_ONLY = { to: "/admin/users", label: "Users", Icon: User };

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = ApiService.isAdmin();

  const items = isAdmin ? [...NAV_ITEMS, ADMIN_ONLY] : NAV_ITEMS;

  const isActive = (to) => location.pathname.startsWith(to);

  return (
    <aside style={{
      width: 220,
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
      {/* Header */}
      <div style={{
        padding: "20px 20px 16px",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
        <button
          onClick={() => navigate("/home")}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "none", border: "none", cursor: "pointer", padding: 0,
            marginBottom: 12,
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: "var(--radius-md)",
            background: "var(--primary)", display: "flex",
            alignItems: "center", justifyContent: "center",
            boxShadow: "var(--glow-primary)",
          }}>
            <LayoutDashboard size={14} color="#000" />
          </div>
          <span style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-lg)",
            fontWeight: 700,
            letterSpacing: "0.05em",
            color: "var(--text-primary)",
          }}>
            TDTUOJ
          </span>
        </button>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "3px 10px",
          background: "var(--primary-subtle)",
          border: "1px solid var(--border-accent)",
          borderRadius: "var(--radius-pill)",
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: "50%",
            background: "var(--primary)",
            boxShadow: "var(--glow-primary)",
          }} />
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

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px" }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {items.map(({ to, label, Icon }) => {
            const active = isActive(to);
            return (
              <li key={to}>
                <NavLink
                  to={to}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px",
                    borderRadius: "var(--radius-md)",
                    textDecoration: "none",
                    background: active ? "var(--primary-subtle)" : "transparent",
                    border: `1px solid ${active ? "var(--border-accent)" : "transparent"}`,
                    color: active ? "var(--primary)" : "var(--text-secondary)",
                    fontWeight: active ? 600 : 400,
                    fontSize: "var(--text-sm)",
                    transition: "all var(--transition-fast)",
                    position: "relative",
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

      {/* Footer */}
      <div style={{
        padding: "12px 16px",
        borderTop: "1px solid var(--border-subtle)",
        fontSize: 10,
        color: "var(--text-muted)",
        fontFamily: "var(--font-code)",
        letterSpacing: "0.06em",
      }}>
        TDTUOJ v2 · Admin
      </div>
    </aside>
  );
};

export default AdminSidebar;
