import { useAuth } from "../hooks/useAuth";

function HomePage() {
  const { user } = useAuth();

  return (
    <main className="home-shell">
      <section className="home-panel">
        <div>
          <span className="home-kicker">AuraCinema</span>
          <h1>Xin chao, {user?.full_name || "ban"}</h1>
          <p>
            Ban da dang nhap thanh cong. Cac trang dat ve co the su dung
            thong tin tai khoan tu AuthContext.
          </p>
        </div>

        <dl className="profile-list">
          <div>
            <dt>Email</dt>
            <dd>{user?.email || "Chua co thong tin"}</dd>
          </div>
          <div>
            <dt>So dien thoai</dt>
            <dd>{user?.phone || "Chua cap nhat"}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

export default HomePage;
