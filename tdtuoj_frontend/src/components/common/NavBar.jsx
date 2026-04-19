import ApiService from "../../services/ApiService";
import { Link, useNavigate } from "react-router-dom";
import { useConfirmDialog } from "./ConfirmDialog";
import { useState, useEffect } from "react";

const NavBar = () => {
  const isAuthenticated = ApiService.isAuthenticated();
  const isAdmin = ApiService.isAdmin();
  const isCreator = ApiService.isCreator();
  const navigate = useNavigate();
  const { ConfirmDialog, showConfirm } = useConfirmDialog();
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  // Fetch user profile on mount if authenticated
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (isAuthenticated) {
        try {
          const response = await ApiService.getOwnProfile();
          if (response.statusCode === 200) {
            setUserProfile(response.data);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      }
    };

    fetchUserProfile();
  }, [isAuthenticated]);

  const handleLogout = () => {
    showConfirm("Logout", "Are you sure you want to logout?", () => {
      ApiService.logout();
      navigate("/login");
    });
  };

  const handleViewProfile = async (e) => {
    e.preventDefault();

    if (isLoadingProfile) return;

    setIsLoadingProfile(true);
    try {
      const response = await ApiService.getOwnProfile();
      if (response.statusCode === 200) {
        const username = response.data.username;
        navigate(`/users/${username}`);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      navigate("/users");
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleEditProfile = () => {
    navigate("/profile");
  };

  // Get first letter of username for avatar placeholder
  const getInitials = (username) => {
    return username ? username.charAt(0).toUpperCase() : "U";
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
                  {/* User Profile Dropdown */}
                  {userProfile && (
                    <li className="nav-item dropdown">
                      <button
                        className="nav-link dropdown-toggle d-flex align-items-center btn btn-dark border-0"
                        id="profileDropdown"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        style={{ cursor: "pointer" }}
                      >
                        {/* Avatar */}
                        <div
                          className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2"
                          style={{
                            width: "40px",
                            height: "40px",
                            fontSize: "16px",
                            fontWeight: "bold",
                          }}
                        >
                          {userProfile.profileUrl ? (
                            <img
                              src={userProfile.profileUrl}
                              alt="Profile"
                              className="rounded-circle"
                              style={{
                                width: "40px",
                                height: "40px",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            getInitials(userProfile.username)
                          )}
                        </div>

                        {/* User Info */}
                        <div className="d-flex flex-column text-start">
                          <span
                            className="fw-semibold text-white"
                            style={{ fontSize: "14px", lineHeight: "1.2" }}
                          >
                            {userProfile.name || userProfile.username}
                          </span>
                        </div>
                      </button>

                      {/* Dropdown Menu */}
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
                            className="dropdown-item"
                            onClick={handleEditProfile}
                          >
                            Settings
                          </button>
                        </li>

                        {/* Admin / Creator Panel Link */}
                        {(isAdmin || isCreator) && (
                          <li>
                            <Link className="dropdown-item" to="/admin">
                              Panel
                            </Link>
                          </li>
                        )}

                        <li>
                          <hr className="dropdown-divider" />
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
                  )}
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
