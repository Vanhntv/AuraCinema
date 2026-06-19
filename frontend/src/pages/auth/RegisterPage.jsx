import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
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
        state: {
          message:
            "Đăng ký thành công. Tài khoản cần được cấp quyền admin trước khi vào dashboard.",
        },
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Đăng ký thất bại. Vui lòng thử lại."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="admin-register-title">
        <div className="auth-card-header">
          <span>AuraCinema Admin</span>
          <h1 id="admin-register-title">Đăng ký tài khoản</h1>
          <p>Tài khoản mới mặc định là user và cần được cấp quyền admin.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-alert error">{error}</div>}

          <label>
            Họ và tên
            <input
              autoComplete="name"
              name="full_name"
              onChange={handleChange}
              placeholder="Nguyễn Văn A"
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
              placeholder="admin@example.com"
              required
              type="email"
              value={formData.email}
            />
          </label>

          <label>
            Số điện thoại
            <input
              autoComplete="tel"
              name="phone"
              onChange={handleChange}
              placeholder="Nhập số điện thoại"
              type="tel"
              value={formData.phone}
            />
          </label>

          <label>
            Mật khẩu
            <input
              autoComplete="new-password"
              minLength={6}
              name="password"
              onChange={handleChange}
              placeholder="Tối thiểu 6 ký tự"
              required
              type="password"
              value={formData.password}
            />
          </label>

          <button className="auth-submit" disabled={submitting} type="submit">
            {submitting ? "Đang đăng ký..." : "Đăng ký"}
          </button>
        </form>

        <p className="auth-switch">
          Đã có tài khoản admin? <Link to="/login">Đăng nhập</Link>
        </p>
      </section>
    </main>
  );
}

export default RegisterPage;
