import { useToast } from "../common/ToastMessage";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import ApiService from "../../services/ApiService";
import "../../styles/authStyle.css";

const LoginPage = () => {
  const { showMessage } = useToast();
  const navigate = useNavigate();
  const { state } = useLocation();
  const redirectPath = state?.from?.pathName || "/home";
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleBtnRef = useRef(null);

  const handleGoogleResponse = useCallback(async (response) => {
    setGoogleLoading(true);
    try {
      const result = await ApiService.loginWithGoogle(response.credential);
      if (result.statusCode === 200) {
        ApiService.saveToken(result.data.token);
        ApiService.saveRole(result.data.roles);
        navigate(redirectPath, { replace: true });
      } else {
        showMessage(result.message, "error");
      }
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    } finally {
      setGoogleLoading(false);
    }
  }, [navigate, redirectPath, showMessage]);

  useEffect(() => {
    const initGoogle = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "filled_black",
          size: "large",
          shape: "rectangular",
          text: "signin_with",
          width: googleBtnRef.current.offsetWidth || 200,
        });
      }
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.body.appendChild(script);
      return () => {
        if (document.body.contains(script)) document.body.removeChild(script);
      };
    }
  }, [handleGoogleResponse]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      showMessage("Email and password are required", "error");
      return;
    }
    setLoading(true);
    try {
      const response = await ApiService.loginUser(formData);
      if (response.statusCode === 200) {
        ApiService.saveToken(response.data.token);
        ApiService.saveRole(response.data.roles);
        navigate(redirectPath, { replace: true });
      } else {
        showMessage(response.message, "error");
      }
    } catch (exception) {
      showMessage(
        exception.response?.data?.message || exception.message,
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Ambient background grid + glow via CSS */}
      <div className="auth-wrap animate-fade-up">
        {/* Brand header above card */}
        <div className="flex flex-col items-center gap-2 mb-4">
          <span
            className="font-display text-cyan uppercase tracking-wider"
            style={{ fontSize: "var(--text-xl)", letterSpacing: "0.18em" }}
          >
            TDTUOJ
          </span>
          <span className="font-code text-muted text-xs tracking-wide">
            // TDTU Online Judge
          </span>
        </div>

        {/* Card */}
        <div className="auth-card">
          {/* Top accent line */}
          <div className="auth-card-accent" />

          {/* Header */}
          <div className="auth-card-header">
            <h2
              className="font-display text-primary"
              style={{ fontSize: "var(--text-2xl)", fontWeight: 700, marginBottom: "var(--space-1)" }}
            >
              Sign In
            </h2>
            <p className="font-code text-muted text-xs">
              // Submit your solutions to the arena
            </p>
          </div>

          {/* Body */}
          <div className="auth-card-body">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label font-code text-xs uppercase tracking-wide" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="input font-code"
                  placeholder="you@student.tdtu.edu.vn"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label font-code text-xs uppercase tracking-wide" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="input font-code"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg w-full mt-2"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In →"}
              </button>
            </form>

            {/* Divider */}
            <div className="auth-divider">
              <div className="auth-divider-line" />
              <span className="font-code text-muted uppercase tracking-wider" style={{ fontSize: "var(--text-xs)", whiteSpace: "nowrap" }}>
                or continue with
              </span>
              <div className="auth-divider-line" />
            </div>

            {/* Google OAuth — renders into ref */}
            <div className="auth-google-wrap">
              <div
                ref={googleBtnRef}
                style={{ display: "flex", justifyContent: "center", minHeight: 44 }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="auth-card-footer flex justify-center">
            <Link
              to="/register"
              className="font-code text-muted text-xs"
              style={{ textDecoration: "none" }}
            >
              No account?{" "}
              <span className="text-cyan font-bold">Create one →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
