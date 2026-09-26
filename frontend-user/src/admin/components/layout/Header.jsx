import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiBell,
  FiLogOut,
  FiMenu,
  FiMoon,
  FiSearch,
  FiSun,
} from "react-icons/fi";
import { useAuth } from "../../../hooks/useAuth";
import { LOGIN_PATH } from "../../../utils/authRoutes";

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

const searchItems = Object.entries(pageTitles)
  .filter(([path]) => path.startsWith("/admin/"))
  .map(([path, label]) => ({ path, label }));

const initialNotifications = [
  {
    id: 1,
    title: "Có 3 đơn vé mới",
    description: "Các đơn đặt vé vừa được ghi nhận trong hệ thống.",
    time: "5 phút trước",
    isRead: false,
  },
  {
    id: 2,
    title: "Suất chiếu sắp bắt đầu",
    description: "Suất chiếu phòng 02 sẽ bắt đầu sau 30 phút.",
    time: "20 phút trước",
    isRead: false,
  },
  {
    id: 3,
    title: "Báo cáo doanh thu đã sẵn sàng",
    description: "Báo cáo tổng hợp hôm nay đã được cập nhật.",
    time: "1 giờ trước",
    isRead: true,
  },
];

const normalizeSearchText = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const getInitialTheme = () => {
  if (typeof window === "undefined") return false;

  const savedTheme = window.localStorage.getItem("theme");
  if (savedTheme) return savedTheme === "dark";

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
};

const Header = ({ isCollapsed, onToggleSidebar, onToggleMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const searchRef = useRef(null);
  const notificationRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const [isDarkMode, setIsDarkMode] = useState(getInitialTheme);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const currentTitle = pageTitles[location.pathname] || "Trang";

  const filteredResults = useMemo(() => {
    const normalizedTerm = normalizeSearchText(searchTerm);
    if (!normalizedTerm) return [];

    return searchItems
      .filter((item) => normalizeSearchText(item.label).includes(normalizedTerm))
      .slice(0, 6);
  }, [searchTerm]);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    window.localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }

      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
        setActiveResultIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    setShowSearchResults(Boolean(value.trim()));
    setActiveResultIndex(-1);
  };

  const selectSearchResult = (result) => {
    setSearchTerm("");
    setShowSearchResults(false);
    setActiveResultIndex(-1);
    navigate(result.path);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Escape") {
      setShowSearchResults(false);
      setActiveResultIndex(-1);
      return;
    }

    if (!filteredResults.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setShowSearchResults(true);
      setActiveResultIndex((current) => (current + 1) % filteredResults.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setShowSearchResults(true);
      setActiveResultIndex((current) =>
        current <= 0 ? filteredResults.length - 1 : current - 1,
      );
    }

    if (event.key === "Enter") {
      event.preventDefault();
      selectSearchResult(filteredResults[activeResultIndex] || filteredResults[0]);
    }
  };

  const markAllAsRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, isRead: true })),
    );
  };

  const handleLogout = () => {
    logout();
    navigate(LOGIN_PATH, { replace: true });
  };

  return (
    <header
      className={`header ${isCollapsed ? "sidebar-collapsed" : ""} bg-white/95 text-slate-900 dark:bg-slate-950/95 dark:text-slate-100`}
    >
      <div className="header-left">
        <button
          className="header-toggle-btn header-toggle-desktop dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          onClick={onToggleSidebar}
          title="Thu/mở sidebar"
          type="button"
        >
          <FiMenu aria-hidden="true" />
        </button>

        <button
          className="header-toggle-btn header-toggle-mobile dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          onClick={onToggleMobile}
          title="Mở menu"
          type="button"
        >
          <FiMenu aria-hidden="true" />
        </button>

        <div className="header-title-group">
          <div className="header-breadcrumb dark:text-slate-500">
            <span>Admin</span>
            <span className="opacity-45">/</span>
            <span className="header-breadcrumb-current dark:text-slate-300">{currentTitle}</span>
          </div>
          <strong className="dark:!text-slate-100">{currentTitle}</strong>
        </div>
      </div>

      <div className="header-right">
        <div ref={searchRef} className="header-search relative isolate z-[200]">
          <FiSearch className="header-search-icon" aria-hidden="true" />
          <input
            id="header-search"
            type="search"
            className="header-search-input dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            placeholder="Tìm kiếm chức năng..."
            value={searchTerm}
            onChange={handleSearchChange}
            onFocus={() => setShowSearchResults(Boolean(searchTerm.trim()))}
            onKeyDown={handleSearchKeyDown}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showSearchResults}
            aria-controls="global-search-results"
          />

          {showSearchResults && (
            <div
              id="global-search-results"
              role="listbox"
              className="header-search-dropdown absolute left-0 top-[calc(100%+10px)] z-[1200] w-full min-w-[340px] overflow-hidden rounded-xl border border-slate-200 bg-white !p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            >
              {filteredResults.length > 0 ? (
                filteredResults.map((result, index) => (
                  <button
                    key={result.path}
                    type="button"
                    role="option"
                    aria-selected={activeResultIndex === index}
                    onMouseEnter={() => setActiveResultIndex(index)}
                    onClick={() => selectSearchResult(result)}
                    className={`header-search-result flex min-h-11 w-full items-center !gap-3 rounded-lg !px-4 !py-3 text-left text-sm leading-5 transition-colors ${
                      activeResultIndex === index
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <FiSearch className="shrink-0" aria-hidden="true" />
                    <span className="font-bold leading-5 text-gray-900 dark:text-gray-100">
                      {result.label}
                    </span>
                  </button>
                ))
              ) : (
                <p className="!px-4 !py-6 text-center text-sm leading-5 text-slate-500 dark:text-slate-400">
                  Không tìm thấy chức năng phù hợp.
                </p>
              )}
            </div>
          )}
        </div>

        <button
          className="header-icon-btn dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          onClick={() => setIsDarkMode((current) => !current)}
          title={isDarkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
          aria-label={isDarkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
          type="button"
        >
          {isDarkMode ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}
        </button>

        <div ref={notificationRef} className="relative isolate z-[100]">
          <button
            className="header-icon-btn dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            onClick={() => setShowNotifications((current) => !current)}
            title="Thông báo"
            aria-label={`Thông báo${unreadCount ? `, ${unreadCount} chưa đọc` : ""}`}
            aria-expanded={showNotifications}
            type="button"
          >
            <FiBell aria-hidden="true" />
            {unreadCount > 0 && <span className="header-notification-badge" />}
          </button>

          {showNotifications && (
            <div className="header-notification-dropdown absolute right-0 top-full z-[1100] !mt-2 w-[420px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-gray-200 !bg-white opacity-100 shadow-2xl dark:border-gray-700 dark:!bg-gray-800">
              <div className="header-notification-heading flex min-h-[80px] items-center justify-between !gap-4 border-b border-gray-100 !px-5 !py-4 dark:border-gray-700">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold leading-5 text-gray-900 dark:text-gray-100">
                    Thông báo
                  </h2>
                  <p className="header-notification-summary !mt-1 text-xs font-semibold leading-4 text-gray-600 dark:text-gray-300">
                    {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Bạn đã đọc tất cả"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className="header-notification-action shrink-0 rounded-lg !px-3 !py-2 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45 dark:text-blue-400 dark:hover:bg-gray-700"
                >
                  Đọc tất cả
                </button>
              </div>

              <ul className="max-h-[360px] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-700">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`header-notification-item relative min-h-[92px] !px-5 !py-4 transition-colors ${
                      notification.isRead
                        ? "bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        : "bg-blue-50 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                    }`}
                  >
                    {!notification.isRead && (
                      <span className="absolute right-4 top-5 h-2 w-2 rounded-full bg-red-500" />
                    )}
                    <h3 className="!pr-6 text-sm font-bold leading-5 text-gray-900 dark:text-gray-100">
                      {notification.title}
                    </h3>
                    <p className="!mt-1.5 !pr-5 text-xs font-semibold leading-5 text-gray-700 dark:text-gray-200">
                      {notification.description}
                    </p>
                    <time className="!mt-2 block text-[11px] font-semibold leading-4 text-gray-500 dark:text-gray-300">
                      {notification.time}
                    </time>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="header-user dark:border-slate-700 dark:bg-slate-900">
          <div className="header-user-avatar">
            {(user?.full_name || user?.email || "A").charAt(0).toUpperCase()}
          </div>
          <div className="header-user-info">
            <span className="header-user-name dark:!text-slate-100">
              {user?.full_name || "Admin"}
            </span>
            <span className="header-user-role dark:!text-slate-400">Quản trị viên</span>
          </div>
        </div>

        <button
          className="header-icon-btn dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          onClick={handleLogout}
          title="Đăng xuất"
          aria-label="Đăng xuất"
          type="button"
        >
          <FiLogOut aria-hidden="true" />
        </button>
      </div>
    </header>
  );
};

export default Header;
