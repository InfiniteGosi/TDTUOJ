import { useToast } from "../common/ToastMessage";
import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import ApiService from "../../services/ApiService";

// Paste the same <style> block from LoginPage here (identical CSS, scoped by .oj-* classes)

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
    <>
      <style>{/* same CSS string as LoginPage — paste it here */}</style>

      <div className="oj-page">
        <div className="oj-card">
          <div className="oj-card-header">
            <div className="oj-brand">TDTU Online Judge</div>
            <h2 className="oj-title">Create account</h2>
            <p className="oj-subtitle">// Join and start solving problems</p>
          </div>

          <div className="oj-body">
            <form onSubmit={handleSubmit}>
              <div className="oj-group">
                <label className="oj-label" htmlFor="username">
                  Username
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono'",
                      fontSize: 10,
                      color: "#484f58",
                      fontWeight: 400,
                      textTransform: "none",
                      letterSpacing: 0,
                    }}
                  >
                    3–20 chars
                  </span>
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  className="oj-input"
                  placeholder="e.g. nguyen_van_a"
                  value={formData.username}
                  onChange={handleChange}
                  minLength={3}
                  maxLength={20}
                  required
                />
                <div
                  style={{
                    fontFamily: "'JetBrains Mono'",
                    fontSize: 10,
                    color: "#484f58",
                    marginTop: 5,
                  }}
                >
                  Letters, numbers, underscores, hyphens only
                </div>
              </div>

              <div className="oj-group">
                <label className="oj-label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="oj-input"
                  placeholder="you@student.tdtu.edu.vn"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="oj-group">
                <label className="oj-label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="oj-input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="oj-group">
                <label className="oj-label" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  className="oj-input"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>

              <button type="submit" className="oj-btn" disabled={loading}>
                {loading ? "Creating account..." : "Create Account →"}
              </button>
            </form>

            <div className="oj-divider">
              <div className="oj-divider-line" />
              <span className="oj-divider-text">or continue with</span>
              <div className="oj-divider-line" />
            </div>

            <div className="oj-social">
              <div
                ref={googleBtnRef}
                style={{ display: "flex", justifyContent: "center", minHeight: 44 }}
              />

              <button className="oj-social-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </button>

              <button className="oj-social-btn">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </button>
            </div>
          </div>

          <div className="oj-footer">
            <Link to="/login">
              Already have an account? <span>Sign in →</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;
