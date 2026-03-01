import { NavLink, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faList,
  faTags,
  faShoppingBag,
  faCreditCard,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

const AdminSidebar = () => {
  const location = useLocation();

  return (
    <div className="admin-sidebar">
      <div className="sidebar-header">
        <h2>Pannel</h2>
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
              <span>Prolem Tags</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/admin/orders"
              className={
                location.pathname.includes("/admin/orders") ? "active" : ""
              }
            >
              <FontAwesomeIcon icon={faShoppingBag} />
              <span>Orders</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/admin/payments"
              className={
                location.pathname.includes("/admin/payments") ? "active" : ""
              }
            >
              <FontAwesomeIcon icon={faCreditCard} />
              <span>Payments</span>
            </NavLink>
          </li>
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
        </ul>
      </div>
    </div>
  );
};

export default AdminSidebar;
