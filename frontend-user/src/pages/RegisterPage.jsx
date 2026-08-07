import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage, showToast } from "../utils/toast";

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(String(email || "").trim());
const isValidPhone = (phone) => /^0\d{9}$/.test(String(phone || "").trim());

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const fullName = formData.full_name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();

    if (!fullName) {
      return "Vui lòng nhập họ và tên.";
    }

    if (fullName.length < 2) {
      return "Họ và tên phải có ít nhất 2 ký tự.";
    }

    if (!email) {
      return "Vui lòng nhập email.";
    }

    if (!isValidEmail(email)) {
      return "Email không hợp lệ. Vui lòng nhập đúng định dạng, ví dụ email@example.com.";
    }

    if (phone && !isValidPhone(phone)) {
      return "Số điện thoại không hợp lệ. Vui lòng nhập 10 số và bắt đầu bằng số 0.";
    }

    if (!formData.password) {
      return "Vui lòng nhập mật khẩu.";
    }

    if (!formData.confirm_password) {
      return "Vui lòng nhập xác nhận mật khẩu.";
    }

    if (formData.password.length < 8 || !/[A-Z]/.test(formData.password) || !/\d/.test(formData.password)) {
      return "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa và số.";
    }

    if (formData.password !== formData.confirm_password) {
      return "Mật khẩu xác nhận không khớp.";
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
      await register({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirm_password: formData.confirm_password,
        phone: formData.phone.trim() || undefined,
      });
      navigate("/login", {
        replace: true,
        state: { message: "Đăng ký thành công. Vui lòng đăng nhập." },
      });
    } catch (err) {
      const message = getApiErrorMessage(err, "Đăng ký thất bại. Vui lòng thử lại.");
      setError(message);
      showToast("error", message);
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

          <label>
            Xác nhận mật khẩu
            <input
              autoComplete="new-password"
              minLength={8}
              name="confirm_password"
              onChange={handleChange}
              placeholder="Nhập lại mật khẩu"
              required
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirm_password}
            />
            <button
              type="button"
              className="auth-password-toggle"
              aria-label={
                showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"
              }
              onClick={() => setShowConfirmPassword((current) => !current)}
            >
              {showConfirmPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
            </button>
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
