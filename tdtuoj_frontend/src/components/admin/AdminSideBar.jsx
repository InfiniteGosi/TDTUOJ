import { NavLink, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faList,
  faTags,
  faUser,
  faTrophy,
} from "@fortawesome/free-solid-svg-icons";
import ApiService from "../../services/ApiService";

const AdminSidebar = () => {
  const location = useLocation();
  const isAdmin = ApiService.isAdmin();

  return (
    <div className="admin-sidebar">
      <div className="sidebar-header">
        <h2>Panel</h2>
      </div>

      <div className="sidebar-nav">
        <ul>
          <li></li>
          <li>
            <NavLink
              to="/admin/problems"
              className={
                location.pathname.includes("/admin/problems") ? "active" : ""
              }
            >
              <FontAwesomeIcon icon={faList} />
              <span>Problems</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/admin/problem-tags"
              className={
                location.pathname.includes("/admin/problem-tags")
                  ? "active"
                  : ""
              }
            >
              <FontAwesomeIcon icon={faTags} />
              <span>Problem Tags</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/admin/contests"
              className={
                location.pathname.includes("/admin/contests") ? "active" : ""
              }
            >
              <FontAwesomeIcon icon={faTrophy} />
              <span>Contests</span>
            </NavLink>
          </li>
          {isAdmin && (
            <li>
              <NavLink
                to="/admin/users"
                className={
                  location.pathname.includes("/admin/users") ? "active" : ""
                }
              >
                <FontAwesomeIcon icon={faUser} />
                <span>Users</span>
              </NavLink>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default AdminSidebar;
