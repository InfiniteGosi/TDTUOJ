import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import NavBar from "./components/common/NavBar";
import GlobalClockBar from "./components/common/GlobalClockBar";
import HomePage from "./components/home/HomePage";
import RegisterPage from "./components/auth/RegisterPage";
import LoginPage from "./components/auth/LoginPage";
import ProblemPage from "./components/problems/ProblemPage";
import UserPage from "./components/users/UserPage";
import ProfilePage from "./components/profile/ProfilePage";
import ProblemDetailsPage from "./components/problems/ProblemDetailsPage";
import AdminLayout from "./components/admin/AdminLayout";
import { AdminRoute, AdminOrCreatorRoute } from "./services/Guard";
import AdminProblemPage from "./components/admin/AdminProblemPage";
import AdminProblemFormPage from "./components/admin/AdminProblemFormPage";
import EditProfilePage from "./components/profile/EditProfilePage";
import ChangePasswordPage from "./components/profile/ChangePasswordPage";
import AdminUserPage from "./components/admin/AdminUserPage";
import AdminDashboardPage from "./components/admin/AdminDashboardPage";
import AdminEditUserPage from "./components/admin/AdminEditUserPage";
import AdminProblemTagPage from "./components/admin/AdminProblemTagPage";
import ContestPage from "./components/contests/ContestPage";
import ContestDetailPage from "./components/contests/ContestDetailPage";
import ContestProblemPage from "./components/contests/ContestProblemPage";
import AdminContestPage from "./components/admin/AdminContestPage";
import AdminContestFormPage from "./components/admin/AdminContestFormPage";
import AdminContestMonitorPage from "./components/admin/AdminContestMonitorPage";
import OrganizationPage from "./components/organizations/OrganizationPage";
import OrganizationDetailPage from "./components/organizations/OrganizationDetailPage";
import LabFormPage from "./components/organizations/LabFormPage";
import LabDetailPage from "./components/organizations/LabDetailPage";
import LabProgressPage from "./components/organizations/LabProgressPage";
import LabProblemPage from "./components/organizations/LabProblemPage";
import AdminOrganizationPage from "./components/admin/AdminOrganizationPage";
import MyProblemsPage from "./components/problems/MyProblemsPage";
import MyProblemFormPage from "./components/problems/MyProblemFormPage";
import JudgeStatusPage from "./components/status/JudgeStatusPage";
import { ToastProvider, useToast } from "./components/common/ToastMessage";
import { useEffect } from "react";

function RateLimitEventHandler() {
  const { showMessage } = useToast();
  useEffect(() => {
    const handler = (e) =>
      showMessage(`Too many requests. Retry in ${e.detail.seconds}s.`, "warning");
    window.addEventListener("api:rate-limited", handler);
    return () => window.removeEventListener("api:rate-limited", handler);
  }, [showMessage]);
  return null;
}

function App() {
  return (
    <ToastProvider>
      <RateLimitEventHandler />
      <BrowserRouter>
        <div className="app-shell">
          <NavBar />
          <GlobalClockBar />
          <div className="content">
            <Routes>
              <Route
                path="/contests/:contestSlug/problems/:problemSlug"
                element={<ContestProblemPage />}
              />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/problems" element={<ProblemPage />} />
              <Route path="/contests" element={<ContestPage />} />
              <Route path="/contests/:slug" element={<ContestDetailPage />} />
              <Route path="/organizations" element={<OrganizationPage />} />
              <Route path="/organizations/:slug" element={<OrganizationDetailPage />} />
              <Route path="/organizations/:orgSlug/labs/new" element={<LabFormPage />} />
              <Route path="/organizations/:orgSlug/labs/:labSlug/edit" element={<LabFormPage />} />
              <Route path="/organizations/:orgSlug/labs/:labSlug" element={<LabDetailPage />} />
              <Route path="/organizations/:orgSlug/labs/:labSlug/progress" element={<LabProgressPage />} />
              <Route path="/organizations/:orgSlug/labs/:labSlug/problems/:problemSlug" element={<LabProblemPage />} />
              <Route path="/users" element={<UserPage />} />
              <Route path="/status" element={<JudgeStatusPage />} />
              <Route path="/problems/:slug" element={<ProblemDetailsPage />} />
              <Route path="users/:username" element={<ProfilePage />} />
              <Route path="/profile" element={<EditProfilePage to="/home" />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
              <Route
                path="/admin"
                element={<AdminOrCreatorRoute element={<AdminLayout />} />}
              >
                <Route path="dashboard" element={<AdminRoute element={<AdminDashboardPage />} />} />
                <Route path="problems" element={<AdminProblemPage />} />
                <Route path="problems/new" element={<AdminProblemFormPage />} />
                <Route path="problems/edit/:id" element={<AdminProblemFormPage />} />
                <Route path="problem-tags" element={<AdminProblemTagPage />} />
                <Route path="contests" element={<AdminContestPage />} />
                <Route path="contests/new" element={<AdminContestFormPage />} />
                <Route path="contests/edit/:id" element={<AdminContestFormPage />} />
                <Route path="contests/monitor/:id" element={<AdminContestMonitorPage />} />
                <Route path="organizations" element={<AdminOrganizationPage />} />
                <Route path="my-problems" element={<MyProblemsPage />} />
                <Route path="my-problems/new" element={<MyProblemFormPage />} />
                <Route path="my-problems/:id/edit" element={<MyProblemFormPage />} />
                <Route path="users" element={<AdminRoute element={<AdminUserPage />} />} />
                <Route path="/admin/users/edit/:userId" element={<AdminRoute element={<AdminEditUserPage />} />} />
              </Route>
              <Route path="*" element={<Navigate to="/home" />} />
            </Routes>
          </div>
          <footer className="copyright-strip">
            TDTUOJ &copy; {new Date().getFullYear()} &mdash; TDTU Online Judge
          </footer>
        </div>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
