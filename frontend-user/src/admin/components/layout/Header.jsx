import { useLocation, useNavigate } from "react-router-dom";
import {
  HiOutlineMenu,
  HiOutlineSearch,
  HiOutlineBell,
  HiOutlineMoon,
  HiOutlineLogout,
} from "react-icons/hi";
import { useAuth } from "../../../hooks/useAuth";

const pageTitles = {
  "/": "Dashboard",
  "/admin/dashboard": "Dashboard",
  "/admin/genres": "Thể loại",
  "/admin/movies": "Phim",
  "/admin/trailers": "Trailer",
  "/admin/cinemas": "Rạp chiếu",
  "/admin/rooms": "Phòng chiếu",
  "/admin/showtimes": "Suất chiếu",
  "/admin/users": "Người dùng",
  "/admin/settings": "Cài đặt",
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
          className="header-toggle-btn"
          onClick={onToggleSidebar}
          id="sidebar-toggle-desktop"
          title="Thu/mở sidebar"
          style={{ display: "none" }}
        >
          <HiOutlineMenu />
        </button>

        <button
          className="header-toggle-btn"
          onClick={onToggleMobile}
          id="sidebar-toggle-mobile"
          title="Mở menu"
        >
          <HiOutlineMenu />
        </button>

        <div className="header-breadcrumb">
          <span>Admin</span>
          <span style={{ opacity: 0.4 }}>/</span>
          <span className="header-breadcrumb-current">{currentTitle}</span>
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

        <button className="header-icon-btn" id="btn-theme-toggle" title="Chế độ tối">
          <HiOutlineMoon />
        </button>

        <button className="header-icon-btn" id="btn-notifications" title="Thông báo">
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
        >
          <HiOutlineLogout />
        </button>
      </div>
    </header>
  );
};

export default Header;
