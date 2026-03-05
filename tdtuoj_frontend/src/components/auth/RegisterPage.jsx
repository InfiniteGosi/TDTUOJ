import { useToast } from "../common/ToastMessage";
import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import ApiService from "../../services/ApiService";

const RegisterPage = () => {
  const { showMessage } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateUsername = (username) => {
    // Check length
    if (username.length < 3 || username.length > 20) {
      showMessage("Username must be between 3 and 20 characters", "error");
      return false;
    }

    // Check for valid characters (alphanumeric, underscore, hyphen only)
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      showMessage(
        "Username can only contain letters, numbers, underscores, and hyphens",
        "error",
      );
      return false;
    }

    // Check if starts with letter or number (optional, good practice)
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

    // Validate username format
    if (!validateUsername(formData.username)) {
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showMessage("Passwords do not match", "error");
      return;
    }

    const registrationData = {
      username: formData.username,
      email: formData.email,
      password: formData.password,
    };

    try {
      const response = await ApiService.registerUser(registrationData);
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
    }
  };

  return (
    <div className="register-page-food">
      <div className="register-card-food">
        <div className="register-header-food">
          <h2 className="register-title-food">Register</h2>
          <p className="register-description-food">
            Create an account to submit your solution now!
          </p>
        </div>
        <div className="register-content-food">
          <form className="register-form-food" onSubmit={handleSubmit}>
            <div className="register-form-group">
              <label htmlFor="username" className="register-label-food">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Your Username"
                className="register-input-food"
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_-]+"
                title="Username can only contain letters, numbers, underscores, and hyphens"
              />
              <small className="register-input-hint">
                3-20 characters, letters, numbers, underscores, and hyphens only
              </small>
            </div>

            <div className="register-form-group">
              <label htmlFor="email" className="register-label-food">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Your Email Here"
                className="register-input-food"
              />
            </div>

            <div className="register-form-group">
              <label htmlFor="password" className="register-label-food">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Password"
                className="register-input-food"
              />
            </div>

            <div className="register-form-group">
              <label htmlFor="confirmPassword" className="register-label-food">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm Password"
                className="register-input-food"
              />
            </div>

            <div>
              <button type="submit" className="register-button-food">
                Register
              </button>
            </div>

            <div className="already">
              <Link to="/login" className="register-link-food">
                Already Have Account? Login
              </Link>
            </div>
          </form>

          <div className="register-social-food">
            <div className="register-separator-food">
              <span className="register-separator-text-food">
                Or continue with
              </span>
            </div>

            <div className="register-social-buttons-food">
              {/* Add social login buttons here (e.g., Google, Facebook, GitHub) */}
              <button className="register-social-button-food register-social-google-food">
                Google
              </button>
              <button className="register-social-button-food register-social-facebook-food">
                Facebook
              </button>
              <button className="register-social-button-food register-social-github-food">
                Github
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
