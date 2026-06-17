import { useLocation } from "react-router-dom";
import {
  HiOutlineMenu,
  HiOutlineSearch,
  HiOutlineBell,
  HiOutlineMoon,
} from "react-icons/hi";

const pageTitles = {
  "/": "Dashboard",
  "/genres": "Thể loại",
  "/movies": "Phim",
  "/showtimes": "Suất chiếu",
  "/users": "Người dùng",
  "/settings": "Cài đặt",
};

const Header = ({ isCollapsed, onToggleSidebar, onToggleMobile }) => {
  const location = useLocation();
  const currentTitle = pageTitles[location.pathname] || "Trang";

  return (
    <header className={`header ${isCollapsed ? "sidebar-collapsed" : ""}`}>
      <div className="header-left">
        {/* Desktop toggle */}
        <button
          className="header-toggle-btn"
          onClick={onToggleSidebar}
          id="sidebar-toggle-desktop"
          title="Thu/mở sidebar"
          style={{ display: "none" }}
        >
          <HiOutlineMenu />
        </button>

        {/* Mobile toggle */}
        <button
          className="header-toggle-btn"
          onClick={onToggleMobile}
          id="sidebar-toggle-mobile"
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
      </div>
    </header>
  );
};

export default Header;
