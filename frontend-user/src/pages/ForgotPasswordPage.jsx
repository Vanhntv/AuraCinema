import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword, resetPassword } from "../api/authApi";

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
    if (formData.password.length < 8 || !/[A-Z]/.test(formData.password) || !/\d/.test(formData.password)) {
      return "Mat khau phai co it nhat 8 ky tu, gom chu hoa va so.";
    }

    if (formData.password !== formData.confirm_password) {
      return "Mat khau xac nhan khong khop.";
    }

    return "";
  };

  const handleRequestOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      const response = await forgotPassword({ email: formData.email });
      setMessage(response.dev_otp ? `${response.message} OTP dev: ${response.dev_otp}` : response.message);
      setStep("reset");
    } catch (err) {
      setError(err.response?.data?.message || "Khong the gui OTP. Vui long thu lai.");
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
      return;
    }

    setSubmitting(true);

    try {
      await resetPassword(formData);
      navigate("/login", {
        replace: true,
        state: { message: "Dat lai mat khau thanh cong. Vui long dang nhap." },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Khong the dat lai mat khau. Vui long thu lai.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="forgot-password-title">
        <div className="auth-brand">
          <span>AuraCinema</span>
          <h1 id="forgot-password-title">Quen mat khau</h1>
          <p>Nhap email de nhan OTP va dat lai mat khau moi.</p>
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
              {submitting ? "Dang gui OTP..." : "Gui OTP"}
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
                placeholder="Nhap OTP"
                required
                type="text"
                value={formData.otp}
              />
            </label>

            <label>
              Mat khau moi
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
              Xac nhan mat khau moi
              <input
                autoComplete="new-password"
                minLength={8}
                name="confirm_password"
                onChange={handleChange}
                placeholder="Nhap lai mat khau moi"
                required
                type="password"
                value={formData.confirm_password}
              />
            </label>

            <button className="auth-submit" disabled={submitting} type="submit">
              {submitting ? "Dang dat lai..." : "Dat lai mat khau"}
            </button>
          </form>
        )}

        <p className="auth-switch">
          Da nho mat khau? <Link to="/login">Dang nhap</Link>
        </p>
      </section>
    </main>
  );
}

export default ForgotPasswordPage;
