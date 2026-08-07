import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  HiOutlineCalendar,
  HiOutlineCash,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineFilm,
  HiOutlineLogout,
  HiOutlineOfficeBuilding,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineTag,
  HiOutlineTicket,
} from "react-icons/hi";
import {
  getDailyRevenue,
  getDashboardOverview,
  getDashboardStats,
  getMonthlyRevenue,
  getTopMoviesRevenue,
  getTodayRevenue,
  getWeeklyRevenue,
} from "../services/dashboardService";
import RevenueChart from "../components/dashboard/RevenueChart";
import MovieSearch from "../components/dashboard/MovieSearch";
import { useAuth } from "../../hooks/useAuth";

const emptyDashboard = {
  stats: {
    genres: 0,
    movies: 0,
    cinemas: 0,
    bookings: 0,
    todayShowtimes: 0,
    nowShowingMovies: 0,
    revenue: 0,
    todayRevenue: 0,
    ticketsSold: 0,
    successfulBookings: 0,
  },
  recentBookings: [],
  todayShowtimes: [],
  topMovies: [],
};

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("vi-VN");
const dashboardDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
});
const dashboardCurrentDate = dashboardDateFormatter.format(new Date());
const [dashboardCurrentYear, dashboardCurrentMonth] = dashboardCurrentDate
  .split("-")
  .map(Number);

const emptyDailyStats = {
  revenue: 0,
  ticketsSold: 0,
  bookingCount: 0,
};

const DashboardPage = () => {
  const { logout } = useAuth();
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revenuePeriod, setRevenuePeriod] = useState("today");
  const [selectedDate, setSelectedDate] = useState(dashboardCurrentDate);
  const [dailyStats, setDailyStats] = useState(emptyDailyStats);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyError, setDailyError] = useState("");
  const [weeklyRevenue, setWeeklyRevenue] = useState([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weeklyError, setWeeklyError] = useState("");
  const [monthlyRevenue, setMonthlyRevenue] = useState({
    totalRevenue: 0,
    days: [],
  });
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyError, setMonthlyError] = useState("");
  const [selectedMovie, setSelectedMovie] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [
        statsResponse,
        overviewResponse,
        todayRevenueResponse,
        topMoviesResponse,
      ] = await Promise.all([
        getDashboardStats(),
        getDashboardOverview(),
        getTodayRevenue(),
        getTopMoviesRevenue(),
      ]);

      setDashboard({
        ...emptyDashboard,
        ...(statsResponse.data || {}),
        topMovies: topMoviesResponse.data || [],
        stats: {
          ...emptyDashboard.stats,
          ...(statsResponse.data?.stats || {}),
          revenue: overviewResponse.data?.revenue ?? 0,
          todayRevenue: todayRevenueResponse.data?.revenue ?? 0,
          ticketsSold: overviewResponse.data?.ticketsSold ?? 0,
          successfulBookings: overviewResponse.data?.successfulBookings ?? 0,
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

  const fetchDailyStats = useCallback(async (date) => {
    if (!date) {
      setDailyStats(emptyDailyStats);
      setDailyError("Vui lòng chọn ngày cần xem.");
      setDailyLoading(false);
      return;
    }

    try {
      setDailyLoading(true);
      setDailyError("");
      const response = await getDailyRevenue(date);
      setDailyStats({
        ...emptyDailyStats,
        ...(response.data || {}),
      });
    } catch (err) {
      setDailyError(
        err.response?.data?.message || "Không thể tải doanh thu theo ngày.",
      );
    } finally {
      setDailyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (revenuePeriod === "today") {
      fetchDailyStats(dashboardCurrentDate);
    } else if (revenuePeriod === "custom") {
      fetchDailyStats(selectedDate);
    }
  }, [fetchDailyStats, revenuePeriod, selectedDate]);

  const fetchWeeklyRevenue = useCallback(async (date) => {
    if (!date) {
      setWeeklyRevenue([]);
      setWeeklyError("Vui lòng chọn một ngày trong tuần cần xem.");
      setWeeklyLoading(false);
      return;
    }

    try {
      setWeeklyLoading(true);
      setWeeklyError("");
      const response = await getWeeklyRevenue(date);
      setWeeklyRevenue(response.data || []);
    } catch (err) {
      setWeeklyError(
        err.response?.data?.message || "Không thể tải doanh thu theo tuần.",
      );
    } finally {
      setWeeklyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (revenuePeriod === "week") {
      fetchWeeklyRevenue(dashboardCurrentDate);
    }
  }, [fetchWeeklyRevenue, revenuePeriod]);

  const weeklyRevenueSummary = useMemo(() => {
    const total = weeklyRevenue.reduce(
      (sum, item) => sum + Number(item.revenue || 0),
      0,
    );

    return { total };
  }, [weeklyRevenue]);

  const fetchMonthlyRevenue = useCallback(async (month, year) => {
    if (!month || !year) {
      setMonthlyRevenue({ totalRevenue: 0, days: [] });
      setMonthlyError("Vui lòng chọn đầy đủ tháng và năm.");
      setMonthlyLoading(false);
      return;
    }

    try {
      setMonthlyLoading(true);
      setMonthlyError("");
      const response = await getMonthlyRevenue(month, year);
      setMonthlyRevenue({
        totalRevenue: response.data?.totalRevenue ?? 0,
        days: response.data?.days || [],
      });
    } catch (err) {
      setMonthlyError(
        err.response?.data?.message || "Không thể tải doanh thu theo tháng.",
      );
    } finally {
      setMonthlyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (revenuePeriod === "month") {
      fetchMonthlyRevenue(dashboardCurrentMonth, dashboardCurrentYear);
    }
  }, [fetchMonthlyRevenue, revenuePeriod]);

  const dailyChartData = useMemo(() => {
    const date = revenuePeriod === "today" ? dashboardCurrentDate : selectedDate;
    const [, month, day] = String(date || "").split("-");

    return [{
      label: day && month ? `${day}/${month}` : "-",
      revenue: Number(dailyStats.revenue || 0),
    }];
  }, [dailyStats.revenue, revenuePeriod, selectedDate]);

  const topMovieRevenueMax = useMemo(
    () => Math.max(
      ...dashboard.topMovies.map((movie) => Number(movie.revenue || 0)),
      0,
    ),
    [dashboard.topMovies],
  );

  const handleRefresh = () => {
    fetchDashboard();

    if (revenuePeriod === "today") {
      fetchDailyStats(dashboardCurrentDate);
    } else if (revenuePeriod === "week") {
      fetchWeeklyRevenue(dashboardCurrentDate);
    } else if (revenuePeriod === "month") {
      fetchMonthlyRevenue(dashboardCurrentMonth, dashboardCurrentYear);
    } else {
      fetchDailyStats(selectedDate);
    }
  };

  const statCards = useMemo(
    () => [
      {
        label: "Doanh thu hôm nay",
        value: dashboard.stats.todayRevenue,
        icon: <HiOutlineCash />,
        tone: "teal",
        hint: "Booking đã thanh toán hôm nay",
        isCurrency: true,
      },
      {
        label: "Tổng doanh thu",
        value: dashboard.stats.revenue,
        icon: <HiOutlineCash />,
        tone: "teal",
        hint: "Doanh thu đã thanh toán",
        isCurrency: true,
      },
      {
        label: "Tổng phim",
        value: dashboard.stats.movies,
        icon: <HiOutlineFilm />,
        tone: "blue",
        hint: `${numberFormatter.format(dashboard.stats.nowShowingMovies)} đang chiếu`,
      },
      {
        label: "Đơn thành công",
        value: dashboard.stats.successfulBookings,
        icon: <HiOutlineCheckCircle />,
        tone: "purple",
        hint: "Đã thanh toán và xác nhận",
      },
      {
        label: "Rạp phim",
        value: dashboard.stats.cinemas,
        icon: <HiOutlineOfficeBuilding />,
        tone: "green",
        hint: "Địa điểm hoạt động",
      },
      {
        label: "Vé đã bán",
        value: dashboard.stats.ticketsSold,
        icon: <HiOutlineTicket />,
        tone: "orange",
        hint: "Từ booking đã thanh toán",
      },
    ],
    [dashboard.stats],
  );

  const handleLogout = () => {
    logout();
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
            onClick={handleRefresh}
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
          <div
            className={`stat-card dashboard-stat-card${
              card.isCurrency ? " dashboard-stat-card--revenue" : ""
            }`}
            key={card.label}
          >
            <div className={`stat-card-icon ${card.tone}`}>{card.icon}</div>
            <div className="dashboard-stat-content">
              <div
                className="stat-card-value"
                title={
                  !loading && card.isCurrency
                    ? currencyFormatter.format(card.value || 0)
                    : undefined
                }
              >
                {loading
                  ? "..."
                  : card.isCurrency
                  ? currencyFormatter.format(card.value || 0)
                  : numberFormatter.format(card.value || 0)}
              </div>
              <div className="stat-card-label">{card.label}</div>
              <div className="stat-card-hint">{card.hint}</div>
            </div>
          </div>
        ))}
      </div>

      <section className="dashboard-revenue-filter">
        <div>
          <h2>Phân tích doanh thu</h2>
          <p>Chọn khoảng thời gian muốn theo dõi</p>
        </div>
        <label className="dashboard-date-filter">
          <span>Thời gian</span>
          <select
            className="form-input dashboard-period-select"
            value={revenuePeriod}
            onChange={(event) => setRevenuePeriod(event.target.value)}
          >
            <option value="today">Hôm nay</option>
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
            <option value="custom">Tùy chọn</option>
          </select>
        </label>
      </section>

      {(revenuePeriod === "today" || revenuePeriod === "custom") && (
      <section className="dashboard-daily-panel">
        <div className="dashboard-daily-header">
          <div>
            <h2>
              {revenuePeriod === "today"
                ? "Doanh thu hôm nay"
                : "Doanh thu ngày tùy chọn"}
            </h2>
            <p>Chỉ tính booking đã thanh toán và xác nhận</p>
          </div>
          {revenuePeriod === "custom" && (
          <label className="dashboard-date-filter">
            <span>Chọn ngày</span>
            <input
              className="form-input dashboard-date-input"
              type="date"
              required
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>
          )}
        </div>

        {dailyError ? (
          <div className="dashboard-daily-error">{dailyError}</div>
        ) : (
          <>
          <div className="dashboard-daily-results" aria-busy={dailyLoading}>
            <div className="dashboard-daily-metric">
              <span>Doanh thu</span>
              <strong>
                {dailyLoading ? "..." : currencyFormatter.format(dailyStats.revenue)}
              </strong>
            </div>
            <div className="dashboard-daily-metric">
              <span>Vé đã bán</span>
              <strong>
                {dailyLoading ? "..." : numberFormatter.format(dailyStats.ticketsSold)}
              </strong>
            </div>
            <div className="dashboard-daily-metric">
              <span>Đơn thành công</span>
              <strong>
                {dailyLoading ? "..." : numberFormatter.format(dailyStats.bookingCount)}
              </strong>
            </div>
          </div>
          <RevenueChart data={dailyChartData} loading={dailyLoading} />
          </>
        )}
      </section>
      )}

      {revenuePeriod === "week" && (
      <section className="dashboard-weekly-panel">
        <div className="dashboard-daily-header">
          <div>
            <h2>Doanh thu theo tuần</h2>
            <p>
              Tổng tuần: {weeklyLoading
                ? "..."
                : currencyFormatter.format(weeklyRevenueSummary.total)}
            </p>
          </div>
        </div>

        {weeklyError ? (
          <div className="dashboard-daily-error">{weeklyError}</div>
        ) : (
          <RevenueChart data={weeklyRevenue} loading={weeklyLoading} />
        )}
      </section>
      )}

      {revenuePeriod === "month" && (
      <section className="dashboard-monthly-panel">
        <div className="dashboard-daily-header">
          <div>
            <h2>Doanh thu theo tháng</h2>
            <p>
              Tổng tháng: {monthlyLoading
                ? "..."
                : currencyFormatter.format(monthlyRevenue.totalRevenue)}
            </p>
          </div>
        </div>

        {monthlyError ? (
          <div className="dashboard-daily-error">{monthlyError}</div>
        ) : (
          <RevenueChart data={monthlyRevenue.days} loading={monthlyLoading} />
        )}
      </section>
      )}

      <section className="dashboard-top-movies-panel">
        <div className="dashboard-panel-header dashboard-top-movies-header">
          <div>
            <h2>Top phim doanh thu cao nhất</h2>
            <p>Xếp hạng theo tổng doanh thu từ booking đã thanh toán</p>
          </div>
          <HiOutlineChartBar />
        </div>

        {loading ? (
          <div className="dashboard-chart-state">Đang tải xếp hạng...</div>
        ) : dashboard.topMovies.length ? (
          <div className="dashboard-top-movies-list">
            {dashboard.topMovies.map((movie, index) => {
              const revenue = Number(movie.revenue || 0);
              const width = topMovieRevenueMax
                ? Math.max((revenue / topMovieRevenueMax) * 100, 3)
                : 0;

              return (
                <div className="dashboard-top-movie" key={movie.id || movie.title}>
                  <span className={`dashboard-movie-rank rank-${index + 1}`}>
                    {index + 1}
                  </span>
                  <div className="dashboard-top-movie-info">
                    <div className="dashboard-top-movie-title-row">
                      <strong>{movie.title || "Phim không xác định"}</strong>
                      <span>{currencyFormatter.format(revenue)}</span>
                    </div>
                    <div className="dashboard-top-movie-track">
                      <div
                        className="dashboard-top-movie-bar"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <small>
                      {numberFormatter.format(movie.ticketsSold || 0)} vé · {numberFormatter.format(movie.bookingCount || 0)} đơn
                    </small>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="dashboard-empty-state">
            Chưa có dữ liệu doanh thu theo phim.
          </div>
        )}
      </section>

      <section className="dashboard-movie-search-panel">
        <div className="dashboard-panel-header">
          <div>
            <h2>Tìm kiếm phim</h2>
            <p>Chọn một phim để xem thống kê chi tiết</p>
          </div>
          <HiOutlineFilm />
        </div>
        <MovieSearch
          selectedMovie={selectedMovie}
          onSelect={setSelectedMovie}
        />
      </section>

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
              <Link className="quick-action" to="/admin/movies">
                <HiOutlineFilm />
                Quản lý phim
              </Link>
              <Link className="quick-action" to="/admin/genres">
                <HiOutlineTag />
                Quản lý thể loại
              </Link>
              <Link className="quick-action" to="/admin/showtimes">
                <HiOutlineCalendar />
                Lịch chiếu
              </Link>
              <Link className="quick-action" to="/admin/movies">
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
