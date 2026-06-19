import { NavLink } from "react-router-dom";
import {
  HiOutlineViewGrid,
  HiOutlineFilm,
  HiOutlineTag,
  HiOutlineTicket,
  HiOutlineUsers,
  HiOutlineCog,
  HiOutlineOfficeBuilding,
  HiOutlineVideoCamera,
} from "react-icons/hi";

const menuItems = [
  {
    section: "Tổng quan",
    items: [
      { path: "/admin/dashboard", icon: <HiOutlineViewGrid />, label: "Dashboard" },
    ],
  },
  {
    section: "Quản lý nội dung",
    items: [
      { path: "/genres", icon: <HiOutlineTag />, label: "Thể loại" },
      { path: "/movies", icon: <HiOutlineFilm />, label: "Phim" },
      { path: "/trailers", icon: <HiOutlineVideoCamera />, label: "Trailer" },
      { path: "/cinemas", icon: <HiOutlineOfficeBuilding />, label: "Rạp chiếu" },
      { path: "/showtimes", icon: <HiOutlineTicket />, label: "Suất chiếu" },
    ],
  },
  {
    section: "Hệ thống",
    items: [
      { path: "/users", icon: <HiOutlineUsers />, label: "Người dùng" },
      { path: "/settings", icon: <HiOutlineCog />, label: "Cài đặt" },
    ],
  },
];

const Sidebar = ({ isCollapsed, isMobileOpen, onCloseMobile }) => {
  const sidebarClasses = [
    "sidebar",
    isCollapsed ? "collapsed" : "",
    isMobileOpen ? "mobile-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <aside className={sidebarClasses}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">A</div>
          <span className="sidebar-logo-text">AuraCinema</span>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((section) => (
            <div key={section.section}>
              <div className="sidebar-section-title">{section.section}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? "active" : ""}`
                  }
                  onClick={onCloseMobile}
                >
                  <span className="sidebar-link-icon">{item.icon}</span>
                  <span className="sidebar-link-text">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-info">
            <div className="sidebar-footer-avatar">A</div>
            <div className="sidebar-footer-details">
              <div className="sidebar-footer-name">Admin</div>
              <div className="sidebar-footer-role">Quản trị viên</div>
            </div>
          </div>
        </div>
      </aside>

      {isMobileOpen && (
        <div className="sidebar-overlay active" onClick={onCloseMobile} />
      )}
    </>
  );
};

export default Sidebar;
