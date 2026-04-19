import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import Footer from "./components/common/Footer";
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
import { AdminRoute, AdminOrCreatorRoute, ParticipantRoute } from "./services/Guard";
import AdminProblemPage from "./components/admin/AdminProblemPage";
import AdminProblemFormPage from "./components/admin/AdminProblemFormPage";
import EditProfilePage from "./components/profile/EditProfilePage";
import ChangePasswordPage from "./components/profile/ChangePasswordPage";
import AdminUserPage from "./components/admin/AdminUserPage";
import AdminEditUserPage from "./components/admin/AdminEditUserPage";
import AdminProblemTagPage from "./components/admin/AdminProblemTagPage";
import ContestPage from "./components/contests/ContestPage";
import ContestDetailPage from "./components/contests/ContestDetailPage";
import ContestProblemPage from "./components/contests/ContestProblemPage";
import AdminContestPage from "./components/admin/AdminContestPage";
import AdminContestFormPage from "./components/admin/AdminContestFormPage";
import { ToastProvider } from "./components/common/ToastMessage";

function App() {
  return (
    <ChakraProvider value={defaultSystem}>
      <ToastProvider>
        <BrowserRouter>
          <div className="App">
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
                <Route path="/users" element={<UserPage />} />
                <Route
                  path="/problems/:slug"
                  element={<ProblemDetailsPage />}
                />
                <Route path="users/:username" element={<ProfilePage />} />
                <Route
                  path="/profile"
                  element={<EditProfilePage to="/home" />}
                />
                <Route
                  path="/change-password"
                  element={<ChangePasswordPage />}
                />
                <Route
                  path="/admin"
                  element={<AdminOrCreatorRoute element={<AdminLayout />} />}
                >
                  <Route path="problems" element={<AdminProblemPage />} />
                  <Route
                    path="problems/new"
                    element={<AdminProblemFormPage />}
                  />
                  <Route
                    path="problems/edit/:id"
                    element={<AdminProblemFormPage />}
                  />

                  <Route
                    path="problem-tags"
                    element={<AdminProblemTagPage />}
                  />

                  <Route path="contests" element={<AdminContestPage />} />
                  <Route
                    path="contests/new"
                    element={<AdminContestFormPage />}
                  />
                  <Route
                    path="contests/edit/:id"
                    element={<AdminContestFormPage />}
                  />

                  <Route path="users" element={<AdminRoute element={<AdminUserPage />} />} />
                  <Route
                    path="/admin/users/edit/:userId"
                    element={<AdminRoute element={<AdminEditUserPage />} />}
                  />
                </Route>

                <Route path="*" element={<Navigate to={"/home"} />} />
              </Routes>
            </div>
            <Footer />
          </div>
        </BrowserRouter>
      </ToastProvider>
    </ChakraProvider>
  );
}

export default App;
