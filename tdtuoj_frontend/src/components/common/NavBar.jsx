import ApiService from "../../services/ApiService";
import { Link, useNavigate } from "react-router-dom";
import { useConfirmDialog } from "./ConfirmDialog";
import { useState } from "react";

const NavBar = () => {
  const isAuthenticated = ApiService.isAuthenticated();
  const isAdmin = ApiService.isAdmin();
  const isCreator = ApiService.isCreator();
  const navigate = useNavigate();
  const { ConfirmDialog, showConfirm } = useConfirmDialog();
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const handleLogout = () => {
    showConfirm("Logout", "Are you sure you want to logout?", () => {
      ApiService.logout();
      navigate("/login");
    });
  };

  const handleViewProfile = async (e) => {
    e.preventDefault(); // Prevent default Link behavior

    if (isLoadingProfile) return; // Prevent multiple clicks

    setIsLoadingProfile(true);
    try {
      const response = await ApiService.getOwnProfile();
      if (response.statusCode === 200) {
        const username = response.data.username;
        navigate(`/users/${username}`);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      // Fallback to /users if error occurs
      navigate("/users");
    } finally {
      setIsLoadingProfile(false);
    }
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid">
          {/* Logo / Brand */}
          <Link className="navbar-brand" to="/home">
            TDTUOJ
          </Link>

          {/* Hamburger button for mobile */}
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* Collapsible content */}
          <div className="collapse navbar-collapse" id="navbarNav">
            {/* Left-side links */}
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <Link className="nav-link" to="/problems">
                  Problems
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/contests">
                  Contests
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/organizations">
                  Organizations
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/users">
                  Users
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/status">
                  Status
                </Link>
              </li>
            </ul>

            {/* Right-side auth links */}
            <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
              {isAuthenticated ? (
                <>
                  {isCreator && (
                    <li className="nav-item">
                      <Link className="nav-link" to="/creator">
                        Creator
                      </Link>
                    </li>
                  )}
                  {isAdmin && (
                    <li className="nav-item">
                      <Link className="nav-link" to="/admin">
                        Admin
                      </Link>
                    </li>
                  )}

                  {/* Profile dropdown */}
                  <li className="nav-item dropdown">
                    <button
                      className="btn btn-dark nav-link dropdown-toggle"
                      id="profileDropdown"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      Profile
                    </button>
                    <ul
                      className="dropdown-menu dropdown-menu-end"
                      aria-labelledby="profileDropdown"
                    >
                      <li>
                        <button
                          className="dropdown-item"
                          onClick={handleViewProfile}
                          disabled={isLoadingProfile}
                        >
                          {isLoadingProfile ? "Loading..." : "View Profile"}
                        </button>
                      </li>
                      <li>
                        <button
                          className="dropdown-item text-danger"
                          onClick={handleLogout}
                        >
                          Logout
                        </button>
                      </li>
                    </ul>
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item">
                    <Link className="nav-link" to="/login">
                      Login
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/register">
                      Register
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>

      <ConfirmDialog />
    </>
  );
};

export default NavBar;
