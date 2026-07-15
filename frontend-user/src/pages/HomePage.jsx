import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { formatPhoneInput, isValidVietnamPhone } from "../utils/phone";

function HomePage() {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    avatar: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFormData({
      full_name: user?.full_name || "",
      phone: user?.phone || "",
      avatar: user?.avatar || "",
    });
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: name === "phone" ? formatPhoneInput(value) : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setSubmitting(true);

    try {
      if (formData.phone && !isValidVietnamPhone(formData.phone)) {
        setError("Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.");
        return;
      }

      const response = await updateProfile({
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        avatar: formData.avatar.trim(),
      });

      setMessage(response.message || "Cập nhật thông tin thành công");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Không thể cập nhật thông tin"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="home-shell">
      <section className="home-panel">
        <div>
          <span className="home-kicker">AuraCinema</span>
          <h1>Xin chào, {user?.full_name || "bạn"}</h1>
          <p>
            Cập nhật thông tin tài khoản để form đặt vé tự động điền đúng
            người đặt vé.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Họ tên
            <input
              autoComplete="name"
              name="full_name"
              placeholder="Nguyễn Văn A"
              required
              type="text"
              value={formData.full_name}
              onChange={handleChange}
            />
          </label>

          <label>
            Email
            <input readOnly type="email" value={user?.email || ""} />
          </label>

          <label>
            Số điện thoại
            <input
              autoComplete="tel"
              name="phone"
              placeholder="090..."
              maxLength={10}
              pattern="0[0-9]{9}"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
            />
          </label>

          <label>
            Ảnh đại diện
            <input
              name="avatar"
              placeholder="https://..."
              type="url"
              value={formData.avatar}
              onChange={handleChange}
            />
          </label>

          {message && <p className="auth-success">{message}</p>}
          {error && <p className="auth-error">{error}</p>}

          <button disabled={submitting} type="submit">
            {submitting ? "Đang cập nhật..." : "Lưu thông tin"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default HomePage;
