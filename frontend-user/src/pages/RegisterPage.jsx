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
      setError("Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa và số.");
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError("Mật khẩu xác nhận không khớp.");
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
        state: { message: "Đăng ký thành công. Vui lòng đăng nhập." },
      });
    } catch (err) {
      setError(
        err.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại."
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
          <h1 id="register-title">Tạo tài khoản</h1>
          <p>Đăng ký để bắt đầu đặt vé và lưu các phim yêu thích.</p>
        </div>

        <form className="auth-form auth-form-grid" noValidate onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <label className="auth-field-full">
            Họ và tên
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
              minLength={8}
              name="password"
              onChange={handleChange}
              placeholder="Tối thiểu 8 ký tự, có chữ hoa và số"
              required
              type="password"
              value={formData.password}
            />
          </label>

          <label>
            Xác nhận mật khẩu
            <input
              autoComplete="new-password"
              minLength={8}
              name="confirm_password"
              onChange={handleChange}
              placeholder="Nhập lại mật khẩu"
              required
              type="password"
              value={formData.confirm_password}
            />
          </label>

          <button className="auth-submit auth-field-full" disabled={submitting} type="submit">
            {submitting ? "Đang tạo tài khoản..." : "Đăng ký"}
          </button>
        </form>

        <p className="auth-switch">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </section>
    </main>
  );
}

export default RegisterPage;
