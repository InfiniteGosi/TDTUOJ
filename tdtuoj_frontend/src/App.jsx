import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import Footer from "./components/common/Footer";
import NavBar from "./components/common/NavBar";
import HomePage from "./components/home/HomePage";
import RegisterPage from "./components/auth/RegisterPage";
import LoginPage from "./components/auth/LoginPage";
import ProblemPage from "./components/problems/ProblemPage";
import ProblemDetailsPage from "./components/problems/ProblemDetailsPage";
import AdminLayout from "./components/admin/AdminLayout";
import { AdminRoute, ParticipantRoute } from "./services/Guard";
import AdminProblemPage from "./components/admin/AdminProblemPage";
import AdminProblemFormPage from "./components/admin/AdminProblemFormPage";

function App() {
  return (
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>
        <div className="App">
          <NavBar />
          <div className="content">
            <Routes>
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/problems" element={<ProblemPage />} />
              <Route path="/problems/:slug" element={<ProblemDetailsPage />} />
              <Route
                path="/admin"
                element={<AdminRoute element={<AdminLayout />} />}
              >
                <Route path="problems" element={<AdminProblemPage />} />
                <Route path="problems/new" element={<AdminProblemFormPage />} />
                <Route
                  path="problems/edit/:id"
                  element={<AdminProblemFormPage />}
                />
              </Route>
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </ChakraProvider>
  );
}

export default App;
