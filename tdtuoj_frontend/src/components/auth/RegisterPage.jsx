import { useMessage } from "../common/MessageDisplay";
import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import ApiService from "../../services/ApiService";

const RegisterPage = () => {
  const { MessageDisplay, showMessage } = useMessage();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      showMessage("All fields are required", "error");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showMessage("Passwords do not match", "error");
      return;
    }

    const registrationData = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
    };

    try {
      const response = await ApiService.registerUser(registrationData);
      if (response.statusCode === 200) {
        setFormData({
          name: "",
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
        "error"
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
              <label htmlFor="name" className="register-label-food">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Your Full Name"
                className="register-input-food"
              />
            </div>

            <div className="register-form-group">
              <label htmlFor="name" className="register-label-food">
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
              <label htmlFor="name" className="register-label-food">
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
              <label htmlFor="name" className="register-label-food">
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

            {/* Render the ErrorDisplay component */}
            <MessageDisplay />

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
