import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";
import { useAuth } from "../hooks/useAuth";
import { isAdminUser } from "../utils/authRedirect";
import { getApiErrorMessage, showToast } from "../utils/toast";

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(String(email || "").trim());

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const successMessage = location.state?.message;
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fromState = location.state?.from;
  const from = typeof fromState === "string"
    ? fromState
    : `${fromState?.pathname || "/"}${fromState?.search || ""}`;
  const isAdminRedirect = from.startsWith("/admin");

  useEffect(() => {
    if (successMessage) showToast("success", successMessage);
  }, [successMessage]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const email = formData.email.trim();

    if (!email && !formData.password) {
      return "Vui lòng nhập email và mật khẩu.";
    }

    if (!email) {
      return "Vui lòng nhập email.";
    }

    if (!isValidEmail(email)) {
      return "Email không hợp lệ. Vui lòng nhập đúng định dạng, ví dụ email@example.com.";
    }

    if (!formData.password) {
      return "Vui lòng nhập mật khẩu.";
    }

    if (formData.password.length < 6) {
      return "Mật khẩu phải có ít nhất 6 ký tự.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      showToast("error", validationError);
      return;
    }

    setSubmitting(true);

    try {
      const response = await login({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (isAdminUser(response.data)) {
        navigate("/admin/dashboard", { replace: true });
        return;
      }

      navigate(isAdminRedirect ? "/tai-khoan" : from, { replace: true });
    } catch (err) {
      const message = getApiErrorMessage(err, "Đăng nhập thất bại. Vui lòng thử lại.");
      setError(message);
      showToast("error", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-brand">
          <span>AuraCinema</span>
          <h1 id="login-title">Đăng nhập</h1>
          <p>Truy cập tài khoản để đặt vé và quản lý lịch xem phim.</p>
        </div>

        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          {successMessage && <div className="auth-success">{successMessage}</div>}
          {error && <div className="auth-error">{error}</div>}

          <label>
            Email
            <input
              autoComplete="email"
              name="email"
              onChange={handleChange}
              placeholder="email@example.com"
              required
              type="email"
              value={formData.email}
            />
          </label>

          <label>
            Mật khẩu
            <input
              autoComplete="current-password"
              minLength={6}
              name="password"
              onChange={handleChange}
              placeholder="Nhập mật khẩu"
              required
              type={showPassword ? "text" : "password"}
              value={formData.password}
            />
            <button
              type="button"
              className="auth-password-toggle"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
            </button>
          </label>

          <div className="auth-form-link">
            <Link to="/quen-mat-khau">Quên mật khẩu?</Link>
          </div>

          <button className="auth-submit" disabled={submitting} type="submit">
            {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <p className="auth-switch">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
