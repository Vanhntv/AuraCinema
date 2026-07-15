import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || "/";
  const successMessage = location.state?.message;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(formData);
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Đăng nhập thất bại. Vui lòng thử lại."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="admin-login-title">
        <div className="auth-card-header">
          <span>AuraCinema Admin</span>
          <h1 id="admin-login-title">Đăng nhập quản trị</h1>
          <p>Chỉ tài khoản có quyền admin mới được truy cập dashboard.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {successMessage && <div className="auth-alert success">{successMessage}</div>}
          {error && <div className="auth-alert error">{error}</div>}

          <label>
            Email
            <input
              autoComplete="email"
              name="email"
              onChange={handleChange}
              placeholder="admin@example.com"
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
              type="password"
              value={formData.password}
            />
          </label>

          <button className="auth-submit" disabled={submitting} type="submit">
            {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <p className="auth-switch">
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
