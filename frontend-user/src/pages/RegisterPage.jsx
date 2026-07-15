import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { formatPhoneInput, isValidVietnamPhone } from "../utils/phone";

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
      [name]: name === "phone" ? formatPhoneInput(value) : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (formData.phone && !isValidVietnamPhone(formData.phone)) {
        setError("Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.");
        return;
      }

      await register({
        ...formData,
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
      <section className="auth-panel" aria-labelledby="register-title">
        <div className="auth-brand">
          <span>AuraCinema</span>
          <h1 id="register-title">Tạo tài khoản</h1>
          <p>Đăng ký để bắt đầu đặt vé và lưu các phim yêu thích.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

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
              maxLength={10}
              pattern="0[0-9]{9}"
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
