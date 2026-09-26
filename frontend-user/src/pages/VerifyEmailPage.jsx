import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { resendVerification, verifyEmail } from "../api/authApi";
import { LOGIN_PATH } from "../utils/authRoutes";
import { getApiErrorMessage } from "../utils/toast";

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState(location.state?.message || "Nhập email đăng ký và yêu cầu mã xác minh.");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [remaining, setRemaining] = useState(location.state?.retryAfter || 0);
  const [initialDeadline] = useState(() => Date.now() + (location.state?.retryAfter || 0) * 1000);
  const deadline = useRef(initialDeadline);
  const otpInput = useRef(null);
  useEffect(() => {
    const timer = setInterval(() => setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, []);
  const startCooldown = (seconds) => {
    deadline.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
  };
  const validEmail = () => /^\S+@\S+\.\S+$/.test(email.trim());
  const resend = async () => {
    if (busy || remaining) return;
    setError("");
    if (!validEmail()) { setError("Vui lòng nhập email hợp lệ."); return; }
    setBusy("send");
    try {
      const response = await resendVerification(email.trim());
      setMessage(response.message);
      setOtp("");
      startCooldown(response.retry_after_seconds || 60);
      otpInput.current?.focus();
    } catch (err) {
      setError(getApiErrorMessage(err, "Chưa gửi được mã. Vui lòng thử lại."));
      if (err.response?.status === 429) startCooldown(Number(err.response.data?.retry_after_seconds || 60));
    } finally { setBusy(""); }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (!validEmail() || !/^\d{6}$/.test(otp)) {
      setError("Vui lòng nhập email hợp lệ và mã xác minh gồm 6 chữ số.");
      return;
    }
    setBusy("verify");
    try {
      const response = await verifyEmail({ email: email.trim(), otp });
      navigate(LOGIN_PATH, { replace: true, state: { email: email.trim(),
        from: location.state?.from, message: response.message } });
    } catch (err) {
      setError(getApiErrorMessage(err, "Không thể xác minh. Vui lòng thử lại."));
    } finally { setBusy(""); }
  };
  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="verify-email-title">
        <div className="auth-brand">
          <h1 id="verify-email-title">Xác minh email</h1>
          <p>Hoàn tất xác minh để đăng nhập và đặt vé tại AuraCinema.</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <p className="auth-success" role="status">{message}</p>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <label>Email đăng ký
            <input name="email" type="email" autoComplete="email" required value={email} disabled={Boolean(busy)}
              onChange={(event) => { setEmail(event.target.value); setOtp(""); setMessage("Yêu cầu mã gửi đến email đăng ký của bạn."); setError(""); }} />
          </label>
          <label>Mã xác minh
            <input ref={otpInput} name="otp" type="text" inputMode="numeric" autoComplete="one-time-code"
              required pattern="[0-9]{6}" maxLength={6} value={otp} aria-describedby="otp-help"
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Nhập 6 chữ số" />
          </label>
          <p id="otp-help" className="auth-otp-help">Mã có hiệu lực 10 phút. Nếu chưa nhận được, hãy kiểm tra thư rác. Khi gửi lại, chỉ mã mới nhất có hiệu lực.</p>
          <button className="auth-submit" type="submit" disabled={Boolean(busy)}>
            {busy === "verify" ? "Đang xác minh..." : "Xác minh email"}
          </button>
          <button className="auth-resend" type="button" onClick={resend} disabled={Boolean(busy) || remaining > 0}>
            {busy === "send" ? "Đang gửi mã..." : remaining > 0 ? `Gửi lại mã sau ${remaining} giây` : "Gửi lại mã"}
          </button>
        </form>
        <p className="auth-switch"><Link to={LOGIN_PATH}>Quay lại đăng nhập</Link></p>
        <p className="auth-switch">Nhập sai email khi đăng ký? <Link to="/dang-ky">Đăng ký với email khác</Link></p>
      </section>
    </main>
  );
}
