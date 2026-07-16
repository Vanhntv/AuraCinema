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
    confirm_password: "",
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

    if (formData.password.length < 8 || !/[A-Z]/.test(formData.password) || !/\d/.test(formData.password)) {
      setError("Mat khau phai co it nhat 8 ky tu, gom chu hoa va so.");
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError("Mat khau xac nhan khong khop.");
      return;
    }

    setSubmitting(true);

    try {
      await register({
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        confirm_password: formData.confirm_password,
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
      <section className="auth-panel auth-panel-wide" aria-labelledby="register-title">
        <div className="auth-brand">
          <span>AuraCinema</span>
          <h1 id="register-title">Tao tai khoan</h1>
          <p>Dang ky de bat dau dat ve va luu cac phim yeu thich.</p>
        </div>

        <form className="auth-form auth-form-grid" noValidate onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <label className="auth-field-full">
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
              minLength={8}
              name="password"
              onChange={handleChange}
              placeholder="Toi thieu 8 ky tu, co chu hoa va so"
              required
              type="password"
              value={formData.password}
            />
          </label>

          <label>
            Xac nhan mat khau
            <input
              autoComplete="new-password"
              minLength={8}
              name="confirm_password"
              onChange={handleChange}
              placeholder="Nhap lai mat khau"
              required
              type="password"
              value={formData.confirm_password}
            />
          </label>

          <button className="auth-submit auth-field-full" disabled={submitting} type="submit">
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
