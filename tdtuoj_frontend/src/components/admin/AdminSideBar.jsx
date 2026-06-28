import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
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

const ADMIN_DASHBOARD = { to: "/admin/dashboard", label: "Dashboard", Icon: LayoutDashboard };
const ADMIN_ONLY = { to: "/admin/users", label: "Users", Icon: User };

const RAIL = 56;   // collapsed width
const OPEN = 240;  // expanded width

// label fade/slide — matches the reference's per-item stagger
const labelVariants = {
  open:   { opacity: 1, x: 0,   transition: { x: { stiffness: 1000, velocity: -100 } } },
  closed: { opacity: 0, x: -12, transition: { x: { stiffness: 100 } } },
};

const AdminSidebar = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const isAdmin   = ApiService.isAdmin();
  const [open, setOpen] = useState(false);

  const items = isAdmin ? [ADMIN_DASHBOARD, ...NAV_ITEMS, ADMIN_ONLY] : NAV_ITEMS;
  const isActive = (to) => location.pathname.startsWith(to);

  return (
    <>
      {/* in-flow spacer so page content reserves the collapsed rail width */}
      <div style={{ width: RAIL, flexShrink: 0 }} aria-hidden="true" />

      <motion.aside
        className="app-chrome"
        initial={false}
        animate={{ width: open ? OPEN : RAIL }}
        transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        style={{
          position: "fixed", left: 0, top: 0, zIndex: 50,
          height: "100vh",
          background: "var(--bg-void)",
          borderRight: "1px solid var(--border-subtle)",
          display: "flex", flexDirection: "column",
          overflow: "hidden", whiteSpace: "nowrap",
          boxShadow: open ? "var(--shadow-lg)" : "none",
        }}
      >
        {/* ── Brand header ── */}
        <div style={{
          minHeight: 56, flexShrink: 0,
          display: "flex", alignItems: "center",
          padding: "0 12px",
          borderBottom: "1px solid var(--border-subtle)",
        }}>
          <button
            onClick={() => navigate("/home")}
            title="Back to site"
            style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "none", border: "none", cursor: "pointer",
              padding: 0, borderRadius: "var(--radius-sm)", overflow: "hidden",
              transition: "opacity 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            <span style={{ flexShrink: 0, display: "flex" }}>
              <TDTULogo size={26} showText={false} />
            </span>
            <AnimatePresence>
              {open && (
                <motion.span
                  variants={labelVariants} initial="closed" animate="open" exit="closed"
                  style={{
                    fontFamily: "var(--font-display)", fontWeight: 800,
                    fontSize: "var(--text-lg)", letterSpacing: "0.04em",
                    color: "var(--text-primary)",
                  }}
                >
                  TDTUOJ
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* admin badge — only when expanded */}
        <div style={{ height: 34, flexShrink: 0, padding: "0 14px", display: "flex", alignItems: "center" }}>
          <AnimatePresence>
            {open && (
              <motion.div
                variants={labelVariants} initial="closed" animate="open" exit="closed"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "3px 10px",
                  background: "var(--primary-subtle)",
                  border: "1px solid var(--border-accent)",
                  borderRadius: "var(--radius-pill)",
                }}
              >
                <LayoutDashboard size={10} color="var(--primary)" />
                <span style={{
                  fontFamily: "var(--font-code)", fontSize: 10, fontWeight: 700,
                  letterSpacing: "0.10em", color: "var(--primary)", textTransform: "uppercase",
                }}>
                  Admin Panel
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Nav ── */}
        <nav style={{ flex: 1, padding: "4px 8px", overflowY: "auto", overflowX: "hidden" }}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            {items.map(({ to, label, Icon }) => {
              const active = isActive(to);
              return (
                <li key={to}>
                  <NavLink
                    to={to}
                    title={label}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      height: 38, padding: "0 8px 0 10px",
                      borderRadius: "var(--radius-md)",
                      textDecoration: "none",
                      background: active ? "var(--primary-subtle)" : "transparent",
                      borderLeft: `3px solid ${active ? "var(--primary)" : "transparent"}`,
                      color: active ? "var(--primary)" : "var(--text-secondary)",
                      fontWeight: active ? 700 : 400,
                      fontSize: "var(--text-sm)",
                      transition: "background 0.12s, color 0.12s",
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
                    <span style={{ flexShrink: 0, display: "flex", width: 18, justifyContent: "center" }}>
                      <Icon size={17} strokeWidth={active ? 2.2 : 1.75} />
                    </span>
                    <AnimatePresence>
                      {open && (
                        <motion.span
                          variants={labelVariants} initial="closed" animate="open" exit="closed"
                          style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                          {label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {open && active && <ChevronRight size={12} strokeWidth={2.5} style={{ flexShrink: 0 }} />}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── Footer ── */}
        <div style={{
          flexShrink: 0, borderTop: "1px solid var(--border-subtle)", padding: "6px 8px",
        }}>
          <button
            onClick={() => navigate("/home")}
            title="Back to site"
            style={{
              display: "flex", alignItems: "center", gap: 12,
              width: "100%", height: 38, padding: "0 8px 0 10px",
              background: "none", border: "none", cursor: "pointer",
              borderRadius: "var(--radius-md)",
              color: "var(--text-muted)", fontSize: "var(--text-sm)",
              transition: "background 0.12s, color 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-raised)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            <span style={{ flexShrink: 0, display: "flex", width: 18, justifyContent: "center" }}>
              <LogOut size={17} strokeWidth={1.75} />
            </span>
            <AnimatePresence>
              {open && (
                <motion.span
                  variants={labelVariants} initial="closed" animate="open" exit="closed"
                  style={{ flex: 1, textAlign: "left" }}
                >
                  Back to site
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>
    </>
  );
};

export default AdminSidebar;
