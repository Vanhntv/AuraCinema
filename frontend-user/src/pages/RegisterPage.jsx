import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      await register({
        ...formData,
        phone: formData.phone.trim() || undefined,
      });
      navigate("/login", {
        replace: true,
        state: { message: "Dang ky thanh cong. Vui long dang nhap." },
      });
    } catch (err) {
      setError(
        err.response?.data?.message || "Dang ky that bai. Vui long thu lai."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="register-title">
        <div className="auth-brand">
          <span>AuraCinema</span>
          <h1 id="register-title">Tao tai khoan</h1>
          <p>Dang ky de bat dau dat ve va luu cac phim yeu thich.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <label>
            Ho va ten
            <input
              autoComplete="name"
              name="full_name"
              onChange={handleChange}
              placeholder="Nguyen Van A"
              required
              type="text"
              value={formData.full_name}
            />
          </label>

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
            So dien thoai
            <input
              autoComplete="tel"
              name="phone"
              onChange={handleChange}
              placeholder="Nhap so dien thoai"
              type="tel"
              value={formData.phone}
            />
          </label>

          <label>
            Mat khau
            <input
              autoComplete="new-password"
              minLength={6}
              name="password"
              onChange={handleChange}
              placeholder="Toi thieu 6 ky tu"
              required
              type="password"
              value={formData.password}
            />
          </label>

          <button className="auth-submit" disabled={submitting} type="submit">
            {submitting ? "Dang tao tai khoan..." : "Dang ky"}
          </button>
        </form>

        <p className="auth-switch">
          Da co tai khoan? <Link to="/login">Dang nhap</Link>
        </p>
      </section>
    </main>
  );
}

export default RegisterPage;
