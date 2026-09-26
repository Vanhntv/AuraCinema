import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineCalendar,
  HiOutlineCash,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineRefresh,
  HiOutlineTicket,
} from "react-icons/hi";
import RevenueChart from "../components/dashboard/RevenueChart";
import {
  getDailyRevenue,
  getDashboardOverview,
  getDashboardStats,
  getMonthlyRevenue,
  getRevenueComparison,
  getTopMoviesRevenue,
  getWeeklyRevenue,
} from "../services/dashboardService";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat("vi-VN");
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
});
const displayDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

const currentDate = dateFormatter.format(new Date());
const yesterdayDate = (() => {
  const [year, month, day] = currentDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
})();

const emptyDashboard = {
  stats: {
    revenue: 0,
    todayRevenue: 0,
    ticketsSold: 0,
    successfulBookings: 0,
    todayShowtimes: 0,
  },
  recentBookings: [],
  todayShowtimes: [],
  topMovies: [],
};

const emptyDailyStats = { revenue: 0, ticketsSold: 0, bookingCount: 0 };
const emptyComparison = {
  current: { label: "", revenue: 0 },
  previous: { label: "", revenue: 0 },
  percentageChange: null,
};

const DashboardPage = () => {
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revenuePeriod, setRevenuePeriod] = useState("day");
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [dailyStats, setDailyStats] = useState(emptyDailyStats);
  const [chartData, setChartData] = useState([]);
  const [periodTotal, setPeriodTotal] = useState(0);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [revenueError, setRevenueError] = useState("");
  const [comparison, setComparison] = useState(emptyComparison);
  const [topMoviesLoading, setTopMoviesLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [statsResponse, overviewResponse, todayResponse] = await Promise.all([
        getDashboardStats(),
        getDashboardOverview(),
        getDailyRevenue(currentDate),
      ]);
      const overview = overviewResponse.data || {};

      setDashboard((previous) => ({
        ...emptyDashboard,
        ...(statsResponse.data || {}),
        topMovies: previous.topMovies,
        stats: {
          ...emptyDashboard.stats,
          ...(statsResponse.data?.stats || {}),
          revenue: overview.revenue || 0,
          todayRevenue: todayResponse.data?.revenue || 0,
          ticketsSold: overview.ticketsSold || 0,
          successfulBookings: overview.successfulBookings || 0,
        },
      }));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Không thể tải dữ liệu dashboard. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRevenue = useCallback(async () => {
    try {
      setRevenueLoading(true);
      setRevenueError("");
      const comparisonDate = revenuePeriod === "day" ? selectedDate : currentDate;
      const comparisonRequest = getRevenueComparison(revenuePeriod, comparisonDate);

      let revenueRequest;
      if (revenuePeriod === "day") {
        revenueRequest = getDailyRevenue(selectedDate);
      } else if (revenuePeriod === "week") {
        revenueRequest = getWeeklyRevenue(currentDate);
      } else {
        const [year, month] = currentDate.split("-").map(Number);
        revenueRequest = getMonthlyRevenue(month, year);
      }

      const [revenueResponse, comparisonResponse] = await Promise.all([
        revenueRequest,
        comparisonRequest,
      ]);

      setComparison({ ...emptyComparison, ...(comparisonResponse.data || {}) });

      if (revenuePeriod === "day") {
        const daily = { ...emptyDailyStats, ...(revenueResponse.data || {}) };
        setDailyStats(daily);
        setPeriodTotal(Number(daily.revenue || 0));
        setChartData([]);
      } else if (revenuePeriod === "week") {
        const days = revenueResponse.data || [];
        setChartData(days);
        setPeriodTotal(days.reduce((sum, item) => sum + Number(item.revenue || 0), 0));
      } else {
        setChartData(revenueResponse.data?.days || []);
        setPeriodTotal(Number(revenueResponse.data?.totalRevenue || 0));
      }
    } catch (err) {
      setRevenueError(
        err.response?.data?.message || "Không thể tải dữ liệu doanh thu.",
      );
    } finally {
      setRevenueLoading(false);
    }
  }, [revenuePeriod, selectedDate]);

  const fetchTopMovies = useCallback(async () => {
    try {
      setTopMoviesLoading(true);
      const date = revenuePeriod === "day" ? selectedDate : currentDate;
      const response = await getTopMoviesRevenue({ period: revenuePeriod, date });
      setDashboard((previous) => ({
        ...previous,
        topMovies: response.data || [],
      }));
    } catch {
      setDashboard((previous) => ({ ...previous, topMovies: [] }));
    } finally {
      setTopMoviesLoading(false);
    }
  }, [revenuePeriod, selectedDate]);

  useEffect(() => {
    const request = window.setTimeout(fetchDashboard, 0);
    return () => window.clearTimeout(request);
  }, [fetchDashboard]);

  useEffect(() => {
    const request = window.setTimeout(() => {
      fetchRevenue();
      fetchTopMovies();
    }, 0);
    return () => window.clearTimeout(request);
  }, [fetchRevenue, fetchTopMovies]);

  const handleRefresh = () => {
    fetchDashboard();
    fetchRevenue();
    fetchTopMovies();
  };

  const chooseDate = (date) => {
    setRevenuePeriod("day");
    setSelectedDate(date);
  };

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return "ngày đã chọn";
    if (selectedDate === currentDate) return "Hôm nay";
    if (selectedDate === yesterdayDate) return "Hôm qua";
    return displayDateFormatter.format(new Date(`${selectedDate}T12:00:00+07:00`));
  }, [selectedDate]);

  const comparisonTrend = useMemo(() => {
    const change = comparison.percentageChange;
    if (change === null || change === undefined) {
      return { label: "Chưa có dữ liệu đối chiếu", tone: "neutral" };
    }
    if (change > 0) {
      return { label: `Tăng ${numberFormatter.format(change)}%`, tone: "increase" };
    }
    if (change < 0) {
      return {
        label: `Giảm ${numberFormatter.format(Math.abs(change))}%`,
        tone: "decrease",
      };
    }
    return { label: "Không thay đổi", tone: "neutral" };
  }, [comparison.percentageChange]);

  const statCards = [
    { label: "Doanh thu hôm nay", value: dashboard.stats.todayRevenue, icon: <HiOutlineCash />, currency: true, tone: "teal" },
    { label: "Tổng doanh thu", value: dashboard.stats.revenue, icon: <HiOutlineChartBar />, currency: true, tone: "blue" },
    { label: "Đơn thành công", value: dashboard.stats.successfulBookings, icon: <HiOutlineCheckCircle />, tone: "purple" },
    { label: "Vé đã bán", value: dashboard.stats.ticketsSold, icon: <HiOutlineTicket />, tone: "orange" },
  ];

  const topRevenue = Math.max(
    ...dashboard.topMovies.map((movie) => Number(movie.revenue || 0)),
    0,
  );

  return (
    <div className="dashboard-page dashboard-page--compact">
      <div className="page-header dashboard-header">
        <div className="page-header-info">
          <h1>Tổng quan</h1>
          <p>Theo dõi nhanh doanh thu và hoạt động bán vé</p>
        </div>
        <button className="btn btn-secondary" onClick={handleRefresh} disabled={loading || revenueLoading}>
          <HiOutlineRefresh />
          Làm mới
        </button>
      </div>

      {error && <div className="dashboard-alert">{error}</div>}

      <div className="stats-grid dashboard-summary-grid">
        {statCards.map((card) => (
          <div className="stat-card dashboard-stat-card" key={card.label}>
            <div className={`stat-card-icon ${card.tone}`}>{card.icon}</div>
            <div className="dashboard-stat-content">
              <div className="stat-card-value">
                {loading
                  ? "..."
                  : card.currency
                    ? currencyFormatter.format(card.value || 0)
                    : numberFormatter.format(card.value || 0)}
              </div>
              <div className="stat-card-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <section className="dashboard-revenue-workspace">
        <div className="dashboard-revenue-toolbar">
          <div>
            <h2>Phân tích doanh thu</h2>
            <p>Chọn ngày trên lịch để xem chính xác doanh thu ngày đó</p>
          </div>
          <div className="dashboard-revenue-controls">
            <div className="dashboard-date-shortcuts" aria-label="Chọn ngày nhanh">
              <button
                className={selectedDate === currentDate && revenuePeriod === "day" ? "active" : ""}
                onClick={() => chooseDate(currentDate)}
                type="button"
              >
                Hôm nay
              </button>
              <button
                className={selectedDate === yesterdayDate && revenuePeriod === "day" ? "active" : ""}
                onClick={() => chooseDate(yesterdayDate)}
                type="button"
              >
                Hôm qua
              </button>
            </div>
            <label className="dashboard-date-filter">
              <span>Kiểu xem</span>
              <select
                className="form-input dashboard-period-select"
                value={revenuePeriod}
                onChange={(event) => setRevenuePeriod(event.target.value)}
              >
                <option value="day">Theo ngày</option>
                <option value="week">Tuần này</option>
                <option value="month">Tháng này</option>
              </select>
            </label>
            {revenuePeriod === "day" && (
              <label className="dashboard-date-filter">
                <span>Chọn ngày</span>
                <input
                  className="form-input dashboard-date-input"
                  type="date"
                  max={currentDate}
                  required
                  value={selectedDate}
                  onChange={(event) => {
                    if (event.target.value) setSelectedDate(event.target.value);
                  }}
                />
              </label>
            )}
          </div>
        </div>

        {revenueError ? (
          <div className="dashboard-daily-error">{revenueError}</div>
        ) : (
          <>
            <div className="dashboard-revenue-summary">
              <div className="dashboard-revenue-primary">
                <span>
                  {revenuePeriod === "day"
                    ? `Doanh thu ${selectedDateLabel.toLowerCase()}`
                    : revenuePeriod === "week"
                      ? "Doanh thu tuần này"
                      : "Doanh thu tháng này"}
                </span>
                <strong>{revenueLoading ? "..." : currencyFormatter.format(periodTotal)}</strong>
                {revenuePeriod === "day" && (
                  <small>
                    {revenueLoading ? "..." : numberFormatter.format(dailyStats.bookingCount)} đơn ·{" "}
                    {revenueLoading ? "..." : numberFormatter.format(dailyStats.ticketsSold)} vé
                  </small>
                )}
              </div>
              <div className="dashboard-comparison-inline">
                <div>
                  <span>Kỳ trước</span>
                  <strong>
                    {revenueLoading ? "..." : currencyFormatter.format(comparison.previous.revenue || 0)}
                  </strong>
                  <small>{comparison.previous.label}</small>
                </div>
                <div className={`dashboard-trend ${comparisonTrend.tone}`}>
                  <span>Biến động</span>
                  <strong>{revenueLoading ? "..." : comparisonTrend.label}</strong>
                  <small>So với kỳ trước</small>
                </div>
              </div>
            </div>
            {revenuePeriod !== "day" && <RevenueChart data={chartData} loading={revenueLoading} />}
          </>
        )}
      </section>

      <div className="dashboard-compact-grid">
        <section className="dashboard-top-movies-panel">
          <div className="dashboard-panel-header dashboard-top-movies-header">
            <div>
              <h2>Phim nổi bật theo doanh thu</h2>
              <p>Cùng khoảng thời gian đang chọn</p>
            </div>
            <HiOutlineChartBar />
          </div>
          {topMoviesLoading ? (
            <div className="dashboard-chart-state">Đang tải xếp hạng...</div>
          ) : dashboard.topMovies.length ? (
            <div className="dashboard-top-movies-list">
              {dashboard.topMovies.map((movie, index) => (
                <div className="dashboard-top-movie" key={movie.id || movie.title}>
                  <span className={`dashboard-movie-rank rank-${index + 1}`}>{index + 1}</span>
                  <div className="dashboard-top-movie-info">
                    <div className="dashboard-top-movie-title-row">
                      <strong>{movie.title || "Phim không xác định"}</strong>
                      <span>{currencyFormatter.format(movie.revenue || 0)}</span>
                    </div>
                    <div className="dashboard-top-movie-track">
                      <div
                        className="dashboard-top-movie-bar"
                        style={{
                          width: `${topRevenue ? Math.max((Number(movie.revenue || 0) / topRevenue) * 100, 3) : 0}%`,
                        }}
                      />
                    </div>
                    <small>{numberFormatter.format(movie.ticketsSold || 0)} vé</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty-state">Chưa có dữ liệu doanh thu theo phim.</div>
          )}
        </section>

        <section className="dashboard-panel dashboard-today-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2>Lịch chiếu hôm nay</h2>
              <p>{numberFormatter.format(dashboard.stats.todayShowtimes || 0)} suất chiếu</p>
            </div>
            <HiOutlineCalendar />
          </div>
          {loading ? (
            <div className="dashboard-mini-loading">Đang tải...</div>
          ) : dashboard.todayShowtimes.length ? (
            <div className="showtime-list">
              {dashboard.todayShowtimes.slice(0, 6).map((showtime) => (
                <div className="showtime-item" key={showtime.id || showtime._id}>
                  <div>
                    <strong>{showtime.movieTitle}</strong>
                    <span>{showtime.roomName || "Phòng chiếu"}</span>
                  </div>
                  <time>{showtime.startTime}</time>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty-state">Chưa có lịch chiếu hôm nay.</div>
          )}
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
