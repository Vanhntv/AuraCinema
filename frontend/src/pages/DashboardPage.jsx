import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HiOutlineCalendar,
  HiOutlineCash,
  HiOutlineFilm,
  HiOutlineLogout,
  HiOutlineOfficeBuilding,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineTag,
  HiOutlineTicket,
} from "react-icons/hi";
import { getDashboardStats } from "../services/dashboardService";

const emptyDashboard = {
  stats: {
    genres: 0,
    movies: 0,
    cinemas: 0,
    bookings: 0,
    todayShowtimes: 0,
    nowShowingMovies: 0,
  },
  recentBookings: [],
  todayShowtimes: [],
};

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("vi-VN");

const DashboardPage = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getDashboardStats();
      setDashboard({
        ...emptyDashboard,
        ...(response.data || {}),
        stats: {
          ...emptyDashboard.stats,
          ...(response.data?.stats || {}),
        },
      });
    } catch (err) {
      setError("Không thể tải thống kê dashboard. Vui lòng kiểm tra API.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const statCards = useMemo(
    () => [
      {
        label: "Tổng phim",
        value: dashboard.stats.movies,
        icon: <HiOutlineFilm />,
        tone: "blue",
        hint: `${numberFormatter.format(dashboard.stats.nowShowingMovies)} đang chiếu`,
      },
      {
        label: "Thể loại",
        value: dashboard.stats.genres,
        icon: <HiOutlineTag />,
        tone: "purple",
        hint: "Danh mục phim",
      },
      {
        label: "Rạp phim",
        value: dashboard.stats.cinemas,
        icon: <HiOutlineOfficeBuilding />,
        tone: "green",
        hint: "Địa điểm hoạt động",
      },
      {
        label: "Vé đã đặt",
        value: dashboard.stats.bookings,
        icon: <HiOutlineTicket />,
        tone: "orange",
        hint: "Chờ module đặt vé",
      },
    ],
    [dashboard.stats],
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.clear();
    navigate("/admin/dashboard", { replace: true });
  };

  return (
    <div className="dashboard-page">
      <div className="page-header dashboard-header">
        <div className="page-header-info">
          <h1>Dashboard</h1>
          <p>Chào mừng bạn trở lại với AuraCinema Admin</p>
        </div>

        <div className="dashboard-header-actions">
          <button
            className="btn btn-secondary"
            onClick={fetchDashboard}
            disabled={loading}
          >
            <HiOutlineRefresh />
            Làm mới
          </button>
          <button className="btn btn-danger" onClick={handleLogout}>
            <HiOutlineLogout />
            Đăng xuất
          </button>
        </div>
      </div>

      {error && <div className="dashboard-alert">{error}</div>}

      <div className="stats-grid">
        {statCards.map((card) => (
          <div className="stat-card dashboard-stat-card" key={card.label}>
            <div className={`stat-card-icon ${card.tone}`}>{card.icon}</div>
            <div>
              <div className="stat-card-value">
                {loading ? "..." : numberFormatter.format(card.value || 0)}
              </div>
              <div className="stat-card-label">{card.label}</div>
              <div className="stat-card-hint">{card.hint}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="table-container dashboard-table">
          <div className="table-toolbar">
            <div className="table-toolbar-left">
              <span className="table-toolbar-title">Vé đặt gần đây</span>
              <span className="table-toolbar-count">
                {dashboard.recentBookings.length} vé
              </span>
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
          ) : dashboard.recentBookings.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã vé</th>
                  <th>Khách hàng</th>
                  <th>Phim</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentBookings.map((booking) => (
                  <tr key={booking.id || booking._id}>
                    <td className="table-cell-name">{booking.code}</td>
                    <td>{booking.customerName}</td>
                    <td>{booking.movieTitle}</td>
                    <td>
                      {currencyFormatter.format(booking.totalAmount || 0)}
                    </td>
                    <td>
                      <span className="status-badge status-now-showing">
                        {booking.status || "Đã đặt"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="table-empty">
              <HiOutlineTicket className="dashboard-empty-icon" />
              <div className="table-empty-text">Chưa có vé đặt gần đây</div>
              <div className="table-empty-sub">
                Dữ liệu sẽ hiển thị khi module đặt vé được kết nối.
              </div>
            </div>
          )}
        </section>

        <aside className="dashboard-side">
          <section className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <h2>Lịch chiếu hôm nay</h2>
                <p>
                  {numberFormatter.format(dashboard.stats.todayShowtimes || 0)}{" "}
                  suất chiếu
                </p>
              </div>
              <HiOutlineCalendar />
            </div>

            {loading ? (
              <div className="dashboard-mini-loading">Đang tải...</div>
            ) : dashboard.todayShowtimes.length ? (
              <div className="showtime-list">
                {dashboard.todayShowtimes.map((showtime) => (
                  <div
                    className="showtime-item"
                    key={showtime.id || showtime._id}
                  >
                    <div>
                      <strong>{showtime.movieTitle}</strong>
                      <span>{showtime.cinemaName}</span>
                    </div>
                    <time>{showtime.startTime}</time>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-state">
                Chưa có lịch chiếu hôm nay.
              </div>
            )}
          </section>

          <section className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <h2>Thao tác nhanh</h2>
                <p>Đi tới tác vụ quản trị thường dùng</p>
              </div>
              <HiOutlinePlus />
            </div>

            <div className="quick-actions">
              <Link className="quick-action" to="/movies">
                <HiOutlineFilm />
                Quản lý phim
              </Link>
              <Link className="quick-action" to="/genres">
                <HiOutlineTag />
                Quản lý thể loại
              </Link>
              <Link className="quick-action" to="/showtimes">
                <HiOutlineCalendar />
                Lịch chiếu
              </Link>
              <Link className="quick-action" to="/movies">
                <HiOutlineCash />
                Doanh thu
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default DashboardPage;
