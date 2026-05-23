import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useConfirmDialog } from "./ConfirmDialog";
import ThemeToggle from "./ThemeToggle";
import ApiService from "../../services/ApiService";
import { Menu, X, ChevronDown, LogOut, User, Settings, LayoutDashboard } from "lucide-react";
import TDTULogo from "./TDTULogo";
import GlobalSearchBar from "./GlobalSearchBar";

const NavBar = () => {
  const isAuthenticated = ApiService.isAuthenticated();
  const isAdmin = ApiService.isAdmin();
  const isCreator = ApiService.isCreator();
  const navigate = useNavigate();
  const location = useLocation();
  const { ConfirmDialog, showConfirm } = useConfirmDialog();
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    ApiService.getOwnProfile()
      .then((r) => { if (r.statusCode === 200) setUserProfile(r.data); })
      .catch(() => {});
  }, [isAuthenticated]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    showConfirm("Logout", "Are you sure you want to logout?", () => {
      ApiService.logout();
      navigate("/login");
    });
    setDropdownOpen(false);
  };

  const handleViewProfile = async () => {
    if (isLoadingProfile) return;
    setIsLoadingProfile(true);
    setDropdownOpen(false);
    try {
      const r = await ApiService.getOwnProfile();
      if (r.statusCode === 200) navigate(`/users/${r.data.username}`);
    } catch { navigate("/users"); }
    finally { setIsLoadingProfile(false); }
  };

  const NAV_LINKS = [
    { to: "/problems",      label: "Problems" },
    { to: "/contests",      label: "Contests" },
    { to: "/organizations", label: "Organizations" },
    { to: "/users",         label: "Users" },
  ];

  const isActive = (to) => location.pathname.startsWith(to);

  const initials = userProfile?.username?.[0]?.toUpperCase() ?? "U";

  return (
    <>
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "var(--bg-base)",
        borderBottom: "1px solid var(--border-default)",
        backdropFilter: "blur(12px)",
      }}>
        <div style={{
          maxWidth: 1280, margin: "0 auto",
          padding: "0 var(--space-6)",
          height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "var(--space-6)",
        }}>
          {/* Logo */}
          <Link to="/home" style={{ textDecoration: "none", flexShrink: 0 }}>
            <TDTULogo size={28} />
          </Link>

          {/* Desktop nav links */}
          <div className="flex items-center gap-1 hide-mobile">
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} style={{
                padding: "var(--space-2) var(--space-3)",
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                color: isActive(to) ? "var(--cyan)" : "var(--text-secondary)",
                textDecoration: "none",
                borderRadius: "var(--radius-md)",
                transition: "color var(--transition-fast), background var(--transition-fast)",
                background: isActive(to) ? "var(--cyan-subtle)" : "transparent",
              }}>
                {label}
              </Link>
            ))}
          </div>

          {/* Global search — desktop only */}
          <div className="hide-mobile" style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <GlobalSearchBar />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {isAuthenticated ? (
              userProfile && (
                <div ref={dropdownRef} style={{ position: "relative" }}>
                  <button
                    onClick={() => setDropdownOpen((v) => !v)}
                    style={{
                      display: "flex", alignItems: "center", gap: "var(--space-2)",
                      padding: "var(--space-1) var(--space-2)",
                      borderRadius: "var(--radius-md)",
                      background: dropdownOpen ? "var(--bg-hover)" : "transparent",
                      border: "1px solid var(--border-default)",
                      cursor: "pointer",
                      transition: "background var(--transition-fast)",
                    }}
                    aria-label="User menu"
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%",
                      overflow: "hidden", flexShrink: 0,
                      background: "var(--cyan-subtle)",
                      border: "1px solid var(--border-accent)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {userProfile.profileUrl ? (
                        <img src={userProfile.profileUrl} alt="avatar"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "var(--text-xs)",
                          color: "var(--cyan)",
                          fontWeight: 700,
                        }}>{initials}</span>
                      )}
                    </div>
                    <span style={{
                      fontSize: "var(--text-sm)", fontWeight: 500,
                      color: "var(--text-primary)",
                    }} className="hide-mobile">
                      {userProfile.username}
                    </span>
                    <ChevronDown size={13} color="var(--text-muted)"
                      style={{ transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform var(--transition-fast)" }} />
                  </button>

                  {dropdownOpen && (
                    <div className="dropdown-content" style={{
                      position: "absolute", right: 0, top: "calc(100% + 6px)",
                      minWidth: 200,
                    }}>
                      <div style={{ padding: "var(--space-3)", borderBottom: "1px solid var(--border-subtle)" }}>
                        <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
                          {userProfile.name || userProfile.username}
                        </div>
                        {userProfile.email && (
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                            {userProfile.email}
                          </div>
                        )}
                      </div>
                      <button className="dropdown-item" onClick={handleViewProfile} disabled={isLoadingProfile}>
                        <User size={14} /> {isLoadingProfile ? "Loading…" : "View Profile"}
                      </button>
                      <button className="dropdown-item" onClick={() => { navigate("/profile"); setDropdownOpen(false); }}>
                        <Settings size={14} /> Settings
                      </button>
                      {(isAdmin || isCreator) && (
                        <button className="dropdown-item" onClick={() => { navigate("/admin"); setDropdownOpen(false); }}>
                          <LayoutDashboard size={14} /> Admin Panel
                        </button>
                      )}
                      <div className="dropdown-separator" />
                      <button className="dropdown-item" onClick={handleLogout}
                        style={{ color: "var(--red-wa)" }}>
                        <LogOut size={14} /> Logout
                      </button>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="btn btn-icon btn-ghost hide-desktop"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div style={{
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-base)",
            padding: "var(--space-4) var(--space-4)",
            display: "flex", flexDirection: "column", gap: "var(--space-1)",
          }}>
            <div style={{ padding: "0 var(--space-2)", marginBottom: "var(--space-2)" }}>
              <GlobalSearchBar />
            </div>
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} style={{
                padding: "var(--space-3) var(--space-4)",
                color: isActive(to) ? "var(--cyan)" : "var(--text-secondary)",
                fontWeight: 500, fontSize: "var(--text-base)",
                borderRadius: "var(--radius-md)",
                background: isActive(to) ? "var(--cyan-subtle)" : "transparent",
                textDecoration: "none",
              }}>
                {label}
              </Link>
            ))}
            {!isAuthenticated && (
              <>
                <Link to="/login" className="btn btn-ghost" style={{ justifyContent: "flex-start" }}>Login</Link>
                <Link to="/register" className="btn btn-primary" style={{ justifyContent: "flex-start" }}>Register</Link>
              </>
            )}
          </div>
        )}
      </nav>
      <ConfirmDialog />
    </>
  );
};

export default NavBar;
