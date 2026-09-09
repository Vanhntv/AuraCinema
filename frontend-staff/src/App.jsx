import { useState } from "react";
import "./App.css";

const menuItems = [
  { id: "counter", label: "Bán vé tại quầy", icon: "▣" },
  { id: "rooms", label: "Quản lý phòng và ghế", icon: "▤" },
  { id: "shift", label: "Báo cáo ca làm việc", icon: "▥" },
  { id: "history", label: "Lịch sử giao dịch", icon: "◷" },
];

const pageContent = {
  counter: { eyebrow: "Bán vé tại quầy", title: "Chọn suất chiếu để bắt đầu bán vé", description: "Theo dõi các suất chiếu hôm nay và xử lý giao dịch ngay tại quầy." },
  rooms: { eyebrow: "Quản lý phòng và ghế", title: "Sơ đồ phòng chiếu", description: "Kiểm tra tình trạng phòng và cập nhật trạng thái ghế." },
  shift: { eyebrow: "Báo cáo ca làm việc", title: "Tổng kết ca làm việc", description: "Xem doanh thu, số vé bán và các giao dịch trong ca của bạn." },
  history: { eyebrow: "Lịch sử giao dịch", title: "Các giao dịch gần đây", description: "Tra cứu hóa đơn, trạng thái thanh toán và lịch sử bán vé." },
};

function App() {
  const [activeItem, setActiveItem] = useState("counter");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const page = pageContent[activeItem];
  const selectMenuItem = (item) => { setActiveItem(item.id); setMobileOpen(false); };

  return (
    <div className={`staff-layout ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-logo"><div className="sidebar-logo-icon">A</div><span className="sidebar-logo-text">AuraCinema</span></div>
        <nav className="sidebar-nav" aria-label="Điều hướng nhân viên">
          <div className="sidebar-section-title">Nhân viên</div>
          {menuItems.map((item) => <button type="button" key={item.id} className={`sidebar-link ${activeItem === item.id ? "active" : ""}`} onClick={() => selectMenuItem(item)} title={collapsed ? item.label : undefined}><span className="sidebar-link-icon" aria-hidden="true">{item.icon}</span><span className="sidebar-link-text">{item.label}</span></button>)}
        </nav>
        <div className="sidebar-footer"><div className="sidebar-footer-avatar">N</div><div className="sidebar-footer-details"><strong>Nhân viên</strong><span>Nhân viên quầy vé</span></div></div>
      </aside>
      {mobileOpen && <button className="sidebar-overlay" aria-label="Đóng menu" onClick={() => setMobileOpen(false)} />}

      <div className="staff-main">
        <header className="header">
          <div className="header-left"><button className="header-toggle desktop-toggle" onClick={() => setCollapsed((value) => !value)} aria-label="Thu gọn thanh bên">☰</button><button className="header-toggle mobile-toggle" onClick={() => setMobileOpen(true)} aria-label="Mở menu">☰</button><div className="breadcrumb"><span>Nhân viên</span><b>/</b><strong>{page.eyebrow}</strong></div></div>
          <div className="header-right"><label className="header-search"><span>⌕</span><input placeholder="Tìm kiếm..." /></label><button className="header-icon" aria-label="Thông báo">♢<i /></button><div className="header-user"><div>N</div><span><strong>Nhân viên</strong><small>Quầy vé</small></span></div></div>
        </header>
        <main className="staff-content">
          <section className="page-heading"><span>{page.eyebrow}</span><h1>{page.title}</h1><p>{page.description}</p></section>
          <section className="stats-grid"><article><span>Vé đã bán hôm nay</span><strong>128</strong><small className="positive">↑ 12% so với hôm qua</small></article><article><span>Doanh thu ca hiện tại</span><strong>4.860.000₫</strong><small className="positive">↑ 8% so với ca trước</small></article><article><span>Suất chiếu sắp tới</span><strong>06</strong><small>Trong 2 giờ tới</small></article></section>
          <section className="content-card"><div className="card-heading"><div><h2>Suất chiếu hôm nay</h2><p>Chọn suất chiếu để xem sơ đồ ghế và bán vé.</p></div><button className="outline-button">Xem tất cả</button></div><div className="showtime-list"><Showtime poster="poster-one" code="AV" title="Avatar: Lửa và Tro" room="Phòng 03 · 2D Phụ đề" time="14:30" seats="Còn 42 ghế" /><Showtime poster="poster-two" code="F1" title="F1: The Movie" room="Phòng 01 · IMAX" time="15:15" seats="Còn 18 ghế" /><Showtime poster="poster-three" code="JW" title="Jurassic World: Rebirth" room="Phòng 05 · 2D Lồng tiếng" time="16:00" seats="Còn 56 ghế" /></div></section>
        </main>
      </div>
    </div>
  );
}

function Showtime({ poster, code, title, room, time, seats }) { return <button className="showtime"><span className={`poster ${poster}`}>{code}</span><span className="movie"><strong>{title}</strong><small>{room}</small></span><span className="time"><strong>{time}</strong><small>{seats}</small></span><span className="arrow">→</span></button>; }
export default App;
