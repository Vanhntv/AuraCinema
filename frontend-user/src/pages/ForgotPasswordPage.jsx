import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword, resetPassword } from "../api/authApi";
import { getApiErrorMessage, showToast } from "../utils/toast";

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(String(email || "").trim());

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState("request");
  const [formData, setFormData] = useState({
    email: "",
    otp: "",
    password: "",
    confirm_password: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const validatePassword = () => {
    if (!formData.email.trim()) {
      return "Vui lòng nhập email.";
    }

    if (!isValidEmail(formData.email)) {
      return "Email không hợp lệ. Vui lòng nhập đúng định dạng, ví dụ email@example.com.";
    }

    if (!String(formData.otp || "").trim()) {
      return "Vui lòng nhập mã OTP.";
    }

    if (!/^\d{6}$/.test(String(formData.otp || "").trim())) {
      return "Mã OTP phải gồm 6 chữ số.";
    }

    if (!formData.password) {
      return "Vui lòng nhập mật khẩu mới.";
    }

    if (!formData.confirm_password) {
      return "Vui lòng nhập xác nhận mật khẩu mới.";
    }

    if (formData.password.length < 8 || !/[A-Z]/.test(formData.password) || !/\d/.test(formData.password)) {
      return "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa và số.";
    }

    if (formData.password !== formData.confirm_password) {
      return "Mật khẩu xác nhận không khớp.";
    }

    return "";
  };

  const validateEmail = () => {
    if (!formData.email.trim()) {
      return "Vui lòng nhập email.";
    }

    if (!isValidEmail(formData.email)) {
      return "Email không hợp lệ. Vui lòng nhập đúng định dạng, ví dụ email@example.com.";
    }

    return "";
  };

  const handleRequestOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const validationError = validateEmail();
    if (validationError) {
      setError(validationError);
      showToast("error", validationError);
      return;
    }

    setSubmitting(true);

    try {
      const response = await forgotPassword({ email: formData.email.trim() });
      const successMessage = response.dev_otp ? `${response.message} OTP dev: ${response.dev_otp}` : response.message;
      setMessage(successMessage);
      showToast("success", successMessage);
      setStep("reset");
    } catch (err) {
      const message = getApiErrorMessage(err, "Không thể gửi OTP. Vui lòng thử lại.");
      setError(message);
      showToast("error", message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      showToast("error", validationError);
      return;
    }

    setSubmitting(true);

    try {
      await resetPassword({
        ...formData,
        email: formData.email.trim(),
        otp: String(formData.otp || "").trim(),
      });
      navigate("/login", {
        replace: true,
        state: { message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập." },
      });
    } catch (err) {
      const message = getApiErrorMessage(err, "Không thể đặt lại mật khẩu. Vui lòng thử lại.");
      setError(message);
      showToast("error", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="forgot-password-title">
        <div className="auth-brand">
          <span>AuraCinema</span>
          <h1 id="forgot-password-title">Quên mật khẩu</h1>
          <p>Nhập email để nhận OTP và đặt lại mật khẩu mới.</p>
        </div>

        {step === "request" ? (
          <form className="auth-form" noValidate onSubmit={handleRequestOtp}>
            {message && <div className="auth-success">{message}</div>}
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

            <button className="auth-submit" disabled={submitting} type="submit">
              {submitting ? "Đang gửi OTP..." : "Gửi OTP"}
            </button>
          </form>
        ) : (
          <form className="auth-form" noValidate onSubmit={handleResetPassword}>
            {message && <div className="auth-success">{message}</div>}
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
              OTP
              <input
                inputMode="numeric"
                name="otp"
                onChange={handleChange}
                placeholder="Nhập OTP"
                required
                type="text"
                value={formData.otp}
              />
            </label>

            <label>
              Mật khẩu mới
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
              Xác nhận mật khẩu mới
              <input
                autoComplete="new-password"
                minLength={8}
                name="confirm_password"
                onChange={handleChange}
                placeholder="Nhập lại mật khẩu mới"
                required
                type="password"
                value={formData.confirm_password}
              />
            </label>

            <button className="auth-submit" disabled={submitting} type="submit">
              {submitting ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
            </button>
          </form>
        )}

        <p className="auth-switch">
          Đã nhớ mật khẩu? <Link to="/login">Đăng nhập</Link>
        </p>
      </section>
    </main>
  );
}

export default ForgotPasswordPage;
