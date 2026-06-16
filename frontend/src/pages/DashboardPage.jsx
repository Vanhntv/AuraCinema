import {
  HiOutlineViewGrid,
  HiOutlineFilm,
  HiOutlineTag,
  HiOutlineTicket,
} from "react-icons/hi";

const DashboardPage = () => {
  return (
    <>
      <div className="page-header">
        <div className="page-header-info">
          <h1>Dashboard</h1>
          <p>Chào mừng bạn trở lại với AuraCinema Admin</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon purple">
            <HiOutlineTag />
          </div>
          <div>
            <div className="stat-card-value">—</div>
            <div className="stat-card-label">Thể loại</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon blue">
            <HiOutlineFilm />
          </div>
          <div>
            <div className="stat-card-value">—</div>
            <div className="stat-card-label">Phim</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green">
            <HiOutlineTicket />
          </div>
          <div>
            <div className="stat-card-value">—</div>
            <div className="stat-card-label">Suất chiếu</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon orange">
            <HiOutlineViewGrid />
          </div>
          <div>
            <div className="stat-card-value">—</div>
            <div className="stat-card-label">Đơn đặt vé</div>
          </div>
        </div>
      </div>

      <div className="table-container" style={{ padding: "60px 20px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>🎬</div>
        <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "var(--color-text-primary)" }}>
          Chào mừng đến AuraCinema Admin
        </h2>
        <p style={{ fontSize: "14px", color: "var(--color-text-muted)", maxWidth: "400px", margin: "0 auto" }}>
          Hệ thống quản trị rạp chiếu phim. Sử dụng menu bên trái để điều hướng đến các trang quản lý.
        </p>
      </div>
    </>
  );
};

export default DashboardPage;
