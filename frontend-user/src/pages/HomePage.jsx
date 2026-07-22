import { useAuth } from "../hooks/useAuth";

function HomePage() {
  const { user } = useAuth();

  return (
    <main className="home-shell">
      <section className="home-panel">
        <div>
          <span className="home-kicker">AuraCinema</span>
          <h1>Xin chào, {user?.full_name || "bạn"}</h1>
          <p>
            Bạn đã đăng nhập thành công. Các trang đặt vé có thể sử dụng
            thông tin tài khoản từ AuthContext.
          </p>
        </div>

        <dl className="profile-list">
          <div>
            <dt>Email</dt>
            <dd>{user?.email || "Chưa có thông tin"}</dd>
          </div>
          <div>
            <dt>Số điện thoại</dt>
            <dd>{user?.phone || "Chưa cập nhật"}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

export default HomePage;
