import { useToast } from "../common/ToastMessage";
import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import ApiService from "../../services/ApiService";
import "../../styles/authStyle.css";

const RegisterPage = () => {
  const { showMessage } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleBtnRef = useRef(null);

  const handleGoogleResponse = useCallback(async (response) => {
    setGoogleLoading(true);
    try {
      const result = await ApiService.loginWithGoogle(response.credential);
      if (result.statusCode === 200) {
        ApiService.saveToken(result.data.token);
        ApiService.saveRole(result.data.roles);
        navigate("/home", { replace: true });
      } else {
        showMessage(result.message, "error");
      }
    } catch (err) {
      showMessage(err.response?.data?.message || err.message, "error");
    } finally {
      setGoogleLoading(false);
    }
  }, [navigate, showMessage]);

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
          text: "signup_with",
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

  const validateUsername = (username) => {
    if (username.length < 3 || username.length > 20) {
      showMessage("Username must be between 3 and 20 characters", "error");
      return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      showMessage(
        "Username can only contain letters, numbers, underscores, and hyphens",
        "error",
      );
      return false;
    }
    if (!/^[a-zA-Z0-9]/.test(username)) {
      showMessage("Username must start with a letter or number", "error");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.username ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      showMessage("All fields are required", "error");
      return;
    }
    if (!validateUsername(formData.username)) return;
    if (formData.password !== formData.confirmPassword) {
      showMessage("Passwords do not match", "error");
      return;
    }
    setLoading(true);
    try {
      const response = await ApiService.registerUser({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      if (response.statusCode === 200) {
        setFormData({
          username: "",
          email: "",
          password: "",
          confirmPassword: "",
        });
        navigate("/login");
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
            // The Arena
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
              Sign Up
            </h2>
            <p className="font-code text-muted text-xs">
              // Join and start solving problems
            </p>
          </div>

          {/* Body */}
          <div className="auth-card-body">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label font-code text-xs uppercase tracking-wide" htmlFor="username">
                  <span>Username</span>
                  <span className="font-code text-muted" style={{ fontSize: "var(--text-xs)", textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>
                    3–20 chars
                  </span>
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  className="input font-code"
                  placeholder="e.g. nguyen_van_a"
                  value={formData.username}
                  onChange={handleChange}
                  minLength={3}
                  maxLength={20}
                  required
                />
                <span className="font-code text-muted" style={{ fontSize: "var(--text-xs)" }}>
                  Letters, numbers, underscores, hyphens only
                </span>
              </div>

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

              <div className="form-group">
                <label className="form-label font-code text-xs uppercase tracking-wide" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  className="input font-code"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg w-full mt-2"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Create Account →"}
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
              to="/login"
              className="font-code text-muted text-xs"
              style={{ textDecoration: "none" }}
            >
              Already have an account?{" "}
              <span className="text-cyan font-bold">Sign in →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
