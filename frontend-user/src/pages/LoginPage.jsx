import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getAdminDashboardUrl, isAdminUser } from "../utils/authRedirect";

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

  const from = location.state?.from?.pathname || "/";

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
      const response = await login(formData);

      if (isAdminUser(response.data)) {
        window.location.assign(getAdminDashboardUrl(response.token));
        return;
      }

      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message || "Dang nhap that bai. Vui long thu lai."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-brand">
          <span>AuraCinema</span>
          <h1 id="login-title">Dang nhap</h1>
          <p>Truy cap tai khoan de dat ve va quan ly lich xem phim.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
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
            Mat khau
            <input
              autoComplete="current-password"
              minLength={6}
              name="password"
              onChange={handleChange}
              placeholder="Nhap mat khau"
              required
              type="password"
              value={formData.password}
            />
          </label>

          <div className="auth-form-link">
            <Link to="/quen-mat-khau">Quen mat khau?</Link>
          </div>

          <button className="auth-submit" disabled={submitting} type="submit">
            {submitting ? "Dang dang nhap..." : "Dang nhap"}
          </button>
        </form>

        <p className="auth-switch">
          Chua co tai khoan? <Link to="/register">Dang ky ngay</Link>
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
