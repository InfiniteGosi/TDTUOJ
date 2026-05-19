import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSideBar";

const AdminLayout = () => {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>
      <AdminSidebar />
      <div style={{ flex: 1, minWidth: 0, overflowX: "hidden" }}>
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
