import { useLocation, useNavigate } from "react-router-dom";
import {
  HiOutlineBell,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineMoon,
  HiOutlineSearch,
} from "react-icons/hi";
import { useAuth } from "../../../hooks/useAuth";

const pageTitles = {
  "/": "Dashboard",
  "/admin/dashboard": "Dashboard",
  "/admin/genres": "Thể loại",
  "/admin/movies": "Phim",
  "/admin/trailers": "Trailer",
  "/admin/rooms": "Phòng chiếu",
  "/admin/showtimes": "Suất chiếu",
  "/admin/bookings": "Đơn vé",
  "/admin/ticket-scanner": "Quét vé QR",
  "/admin/ticket-scan-history": "Lịch sử quét QR",
  "/admin/concessions": "Bắp nước",
  "/admin/vouchers": "Mã giảm giá",
  "/admin/marketing": "Nội dung marketing",
  "/admin/gifts": "Quà tặng",
  "/admin/users": "Người dùng",
  "/admin/policies": "Chính sách",
};

const Header = ({ isCollapsed, onToggleSidebar, onToggleMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const currentTitle = pageTitles[location.pathname] || "Trang";

  const handleLogout = () => {
    logout();
    navigate("/dang-nhap", { replace: true });
  };

  return (
    <header className={`header ${isCollapsed ? "sidebar-collapsed" : ""}`}>
      <div className="header-left">
        <button
          className="header-toggle-btn header-toggle-desktop"
          onClick={onToggleSidebar}
          title="Thu/mở sidebar"
          type="button"
        >
          <HiOutlineMenu />
        </button>

        <button
          className="header-toggle-btn header-toggle-mobile"
          onClick={onToggleMobile}
          title="Mở menu"
          type="button"
        >
          <HiOutlineMenu />
        </button>

        <div className="header-title-group">
          <div className="header-breadcrumb">
            <span>Admin</span>
            <span style={{ opacity: 0.45 }}>/</span>
            <span className="header-breadcrumb-current">{currentTitle}</span>
          </div>
          <strong>{currentTitle}</strong>
        </div>
      </div>

      <div className="header-right">
        <div className="header-search">
          <HiOutlineSearch className="header-search-icon" />
          <input
            type="text"
            className="header-search-input"
            placeholder="Tìm kiếm..."
            id="header-search"
          />
        </div>

        <button className="header-icon-btn" id="btn-theme-toggle" title="Chế độ tối" type="button">
          <HiOutlineMoon />
        </button>

        <button className="header-icon-btn" id="btn-notifications" title="Thông báo" type="button">
          <HiOutlineBell />
          <span className="header-notification-badge"></span>
        </button>

        <div className="header-user">
          <div className="header-user-avatar">
            {(user?.full_name || user?.email || "A").charAt(0).toUpperCase()}
          </div>
          <div className="header-user-info">
            <span className="header-user-name">{user?.full_name || "Admin"}</span>
            <span className="header-user-role">Quản trị viên</span>
          </div>
        </div>

        <button
          className="header-icon-btn"
          id="btn-logout"
          onClick={handleLogout}
          title="Đăng xuất"
          type="button"
        >
          <HiOutlineLogout />
        </button>
      </div>
    </header>
  );
};

export default Header;
