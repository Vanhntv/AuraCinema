import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineCalendar,
  HiOutlineCash,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineFilm,
  HiOutlineClock,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineTicket,
} from "react-icons/hi";
import MovieSearch from "../components/dashboard/MovieSearch";
import RevenueChart from "../components/dashboard/RevenueChart";
import {
  getDailyRevenue,
  getDashboardOverview,
  getDashboardStats,
  getMonthlyRevenue,
  getMovieRevenue,
  getRangeRevenue,
  getRevenueComparison,
  getTopMoviesRevenue,
  getTopSellingCombos,
  getWeeklyRevenue,
  getYearlyRevenue,
} from "../services/dashboardService";
import RevenueChart from "../components/dashboard/RevenueChart";
import MovieSearch from "../components/dashboard/MovieSearch";

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
    comboRevenue: 0,
    voucherUsageCount: 0,
    voucherDiscountAmount: 0,
  },
  recentBookings: [],
  todayShowtimes: [],
  topMovies: [],
  topCombos: [],
  bookingStatuses: {
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    expired: 0,
    refunded: 0,
    checked_in: 0,
  },
};

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat("vi-VN");
const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const displayDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh",
});
const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh",
});

const currentDate = dateFormatter.format(new Date());
const currentYear = Number(currentDate.slice(0, 4));
const shiftDate = (dateValue, amount) => {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + amount)).toISOString().slice(0, 10);
};
const yesterdayDate = shiftDate(currentDate, -1);

const getPeriodRange = (period, selectedDate, rangeFrom, rangeTo) => {
  if (period === "range") return { from: rangeFrom, to: rangeTo };
  if (period === "day") return { from: selectedDate, to: selectedDate };
  if (period === "week") {
    const date = new Date(`${selectedDate}T00:00:00Z`);
    const from = shiftDate(selectedDate, -((date.getUTCDay() + 6) % 7));
    return { from, to: shiftDate(from, 6) };
  }
  if (period === "month") {
    const [year, month] = selectedDate.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    return { from: `${prefix}-01`, to: `${prefix}-${lastDay}` };
  }
  return { from: `${selectedDate.slice(0, 4)}-01-01`, to: `${selectedDate.slice(0, 4)}-12-31` };
};

const emptyDashboard = {
  stats: {
    genres: 0, movies: 0, cinemas: 0, bookings: 0, revenue: 0,
    todayRevenue: 0, ticketsSold: 0, successfulBookings: 0, todayShowtimes: 0,
  },
  recentBookings: [],
  todayShowtimes: [],
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
  const [rangeFrom, setRangeFrom] = useState(currentDate);
  const [rangeTo, setRangeTo] = useState(currentDate);
  const [dailyStats, setDailyStats] = useState(emptyDailyStats);
  const [chartData, setChartData] = useState([]);
  const [periodTotal, setPeriodTotal] = useState(0);
  const [comparison, setComparison] = useState(emptyComparison);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [revenueError, setRevenueError] = useState("");
  const [topMovies, setTopMovies] = useState([]);
  const [topCombos, setTopCombos] = useState([]);
  const [rankingsLoading, setRankingsLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieReport, setMovieReport] = useState(null);
  const [movieReportLoading, setMovieReportLoading] = useState(false);
  const [movieReportError, setMovieReportError] = useState("");

  const periodRange = useMemo(
    () => getPeriodRange(revenuePeriod, selectedDate, rangeFrom, rangeTo),
    [rangeFrom, rangeTo, revenuePeriod, selectedDate],
  );

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [statsResponse, overviewResponse, todayResponse] = await Promise.all([
        getDashboardStats(), getDashboardOverview(), getDailyRevenue(currentDate),
      ]);
      const overview = overviewResponse.data || {};
      setDashboard({
        ...emptyDashboard,
        ...(statsResponse.data || {}),
        stats: {
          ...emptyDashboard.stats,
          ...(statsResponse.data?.stats || {}),
          revenue: overview.revenue || 0,
          todayRevenue: todayResponse.data?.revenue || 0,
          ticketsSold: overview.ticketsSold || 0,
          successfulBookings: overview.successfulBookings || 0,
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải dữ liệu dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRevenue = useCallback(async () => {
    try {
      setRevenueLoading(true);
      setRevenueError("");
      const comparisonRequest = getRevenueComparison(
        revenuePeriod,
        selectedDate,
        revenuePeriod === "range" ? periodRange : {},
      );
      let revenueRequest;
      if (revenuePeriod === "day") revenueRequest = getDailyRevenue(selectedDate);
      else if (revenuePeriod === "week") revenueRequest = getWeeklyRevenue(selectedDate);
      else if (revenuePeriod === "month") {
        const [year, month] = selectedDate.split("-").map(Number);
        revenueRequest = getMonthlyRevenue(month, year);
      } else if (revenuePeriod === "year") {
        revenueRequest = getYearlyRevenue(Number(selectedDate.slice(0, 4)));
      } else revenueRequest = getRangeRevenue(rangeFrom, rangeTo);

      const [revenueResponse, comparisonResponse] = await Promise.all([revenueRequest, comparisonRequest]);
      const data = revenueResponse.data || {};
      setComparison({ ...emptyComparison, ...(comparisonResponse.data || {}) });
      if (revenuePeriod === "day") {
        const daily = { ...emptyDailyStats, ...data };
        setDailyStats(daily);
        setPeriodTotal(Number(daily.revenue || 0));
        setChartData([]);
      } else if (revenuePeriod === "week") {
        setDailyStats(emptyDailyStats);
        setChartData(data);
        setPeriodTotal(data.reduce((sum, item) => sum + Number(item.revenue || 0), 0));
      } else if (revenuePeriod === "range") {
        setDailyStats({ revenue: Number(data.totalRevenue || 0), ticketsSold: Number(data.ticketsSold || 0), bookingCount: Number(data.bookingCount || 0) });
        setChartData(data.days || []);
        setPeriodTotal(Number(data.totalRevenue || 0));
      } else if (revenuePeriod === "year") {
        setDailyStats(emptyDailyStats);
        setChartData(data.months || []);
        setPeriodTotal(Number(data.totalRevenue || 0));
      } else {
        setDailyStats(emptyDailyStats);
        setChartData(data.days || []);
        setPeriodTotal(Number(data.totalRevenue || 0));
      }
    } catch (err) {
      setRevenueError(err.response?.data?.message || "Không thể tải dữ liệu doanh thu.");
    } finally {
      setRevenueLoading(false);
    }
  }, [periodRange, rangeFrom, rangeTo, revenuePeriod, selectedDate]);

  const fetchRankings = useCallback(async () => {
    try {
      setRankingsLoading(true);
      const filters = { period: revenuePeriod, date: selectedDate, ...(revenuePeriod === "range" ? periodRange : {}) };
      const [moviesResponse, combosResponse] = await Promise.all([
        getTopMoviesRevenue(filters), getTopSellingCombos(filters),
      ]);
      setTopMovies(moviesResponse.data || []);
      setTopCombos(combosResponse.data || []);
    } catch {
      setTopMovies([]);
      setTopCombos([]);
    } finally {
      setRankingsLoading(false);
    }
  }, [periodRange, revenuePeriod, selectedDate]);

  const fetchSelectedMovie = useCallback(async () => {
    if (!selectedMovie) {
      setMovieReport(null);
      setMovieReportError("");
      return;
    }
    try {
      setMovieReportLoading(true);
      setMovieReportError("");
      const response = await getMovieRevenue(selectedMovie._id || selectedMovie.id, periodRange);
      setMovieReport(response.data || null);
    } catch (err) {
      setMovieReport(null);
      setMovieReportError(err.response?.data?.message || "Không thể tải doanh thu phim.");
    } finally {
      setMovieReportLoading(false);
    }
  }, [periodRange, selectedMovie]);

  useEffect(() => {
    if (revenuePeriod === "month") {
      fetchMonthlyRevenue(dashboardCurrentMonth, dashboardCurrentYear);
    }
  }, [fetchMonthlyRevenue, revenuePeriod]);

  const fetchRevenueComparison = useCallback(async (period, date) => {
    if (!date) return;

    try {
      setComparisonLoading(true);
      setComparisonError("");
      const response = await getRevenueComparison(period, date);
      setRevenueComparison({
        ...emptyRevenueComparison,
        ...(response.data || {}),
      });
    } catch (err) {
      setComparisonError(
        err.response?.data?.message || "Không thể tải dữ liệu so sánh kỳ trước.",
      );
    } finally {
      setComparisonLoading(false);
    }
  }, []);

  useEffect(() => {
    const period = revenuePeriod === "today" || revenuePeriod === "custom"
      ? "day"
      : revenuePeriod;
    const date = revenuePeriod === "custom" ? selectedDate : dashboardCurrentDate;
    fetchRevenueComparison(period, date);
  }, [fetchRevenueComparison, revenuePeriod, selectedDate]);

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

  const topComboQuantityMax = useMemo(
    () => Math.max(
      ...dashboard.topCombos.map((combo) => Number(combo.quantitySold || 0)),
      0,
    ),
    [dashboard.topCombos],
  );

  const comparisonTrend = useMemo(() => {
    const change = comparison.percentageChange;
    if (change === null || change === undefined) return { label: "Chưa có dữ liệu đối chiếu", tone: "neutral" };
    if (change > 0) return { label: `Tăng ${numberFormatter.format(change)}%`, tone: "increase" };
    if (change < 0) return { label: `Giảm ${numberFormatter.format(Math.abs(change))}%`, tone: "decrease" };
    return { label: "Không thay đổi", tone: "neutral" };
  }, [comparison.percentageChange]);

  const fetchSelectedMovieRevenue = useCallback(async (movie, filters = {}) => {
    if (!movie?._id) return;

    try {
      setMovieRevenueLoading(true);
      setMovieRevenueError("");
      const response = await getMovieRevenue(movie._id, filters);
      setMovieRevenue({
        ...emptyMovieRevenue,
        ...(response.data || {}),
      });
    } catch (err) {
      setMovieRevenueError(
        err.response?.data?.message || "Không thể tải doanh thu của phim.",
      );
    } finally {
      setMovieRevenueLoading(false);
    }
  }, []);

  const handleMovieSelect = (movie) => {
    setSelectedMovie(movie);
    setMovieRevenueFrom("");
    setMovieRevenueTo("");
    setMovieRevenueError("");

    if (movie) {
      fetchSelectedMovieRevenue(movie);
    } else {
      setMovieRevenue(emptyMovieRevenue);
    }
  };

  const handleMovieRevenueFilter = (event) => {
    event.preventDefault();
    if (!selectedMovie) return;

    if (!movieRevenueFrom || !movieRevenueTo) {
      setMovieRevenueError("Vui lòng chọn đầy đủ từ ngày và đến ngày.");
      return;
    }
    if (movieRevenueFrom > movieRevenueTo) {
      setMovieRevenueError("Từ ngày không được lớn hơn đến ngày.");
      return;
    }

    fetchSelectedMovieRevenue(selectedMovie, {
      from: movieRevenueFrom,
      to: movieRevenueTo,
    });
  };

  const handleClearMovieRevenueFilter = () => {
    setMovieRevenueFrom("");
    setMovieRevenueTo("");
    fetchSelectedMovieRevenue(selectedMovie);
  };

  const handleRefresh = () => {
    fetchDashboard();

    const comparisonPeriod = revenuePeriod === "today" || revenuePeriod === "custom"
      ? "day"
      : revenuePeriod;
    const comparisonDate = revenuePeriod === "custom" ? selectedDate : dashboardCurrentDate;
    fetchRevenueComparison(comparisonPeriod, comparisonDate);

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
        label: "Doanh thu bắp nước",
        value: dashboard.stats.comboRevenue,
        icon: <HiOutlineShoppingBag />,
        tone: "pink",
        hint: "Combo trong booking đã thanh toán",
        isCurrency: true,
      },
      {
        label: "Lượt sử dụng voucher",
        value: dashboard.stats.voucherUsageCount,
        icon: <HiOutlineTag />,
        tone: "blue",
        hint: "Booking đã thanh toán có voucher",
      },
      {
        label: "Tổng tiền đã giảm",
        value: dashboard.stats.voucherDiscountAmount,
        icon: <HiOutlineCash />,
        tone: "pink",
        hint: "Ưu đãi từ voucher đã sử dụng",
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
        label: "Vé đã bán",
        value: dashboard.stats.ticketsSold,
        icon: <HiOutlineTicket />,
        tone: "orange",
        hint: "Từ booking đã thanh toán",
      },
    ],
    [dashboard.stats],
  );

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
        </div>
      </div>
      {error && <div className="dashboard-alert">{error}</div>}

      <div className="stats-grid dashboard-summary-grid">
        {statCards.map((card) => (
          <div className="stat-card dashboard-stat-card" key={card.label}>
            <div className={`stat-card-icon ${card.tone}`}>{card.icon}</div>
            <div className="dashboard-stat-content">
              <div className="stat-card-value">{loading ? "..." : card.currency ? currencyFormatter.format(card.value || 0) : numberFormatter.format(card.value || 0)}</div>
              <div className="stat-card-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <section className="dashboard-booking-status-panel">
        <div className="dashboard-panel-header">
          <div>
            <h2>Thống kê trạng thái booking</h2>
            <p>Mỗi booking được tính một lần theo trạng thái hiện tại</p>
          </div>
          <HiOutlineChartPie />
        </div>
        <div className="dashboard-booking-status-grid" aria-busy={loading}>
          {bookingStatusItems.map((status) => (
            <div
              className={`dashboard-booking-status-item ${status.tone}`}
              key={status.key}
            >
              <span className="dashboard-booking-status-dot" />
              <div>
                <strong>
                  {loading
                    ? "..."
                    : numberFormatter.format(dashboard.bookingStatuses[status.key] || 0)}
                </strong>
                <span>{status.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

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

      <section className="dashboard-comparison-panel">
        <div className="dashboard-panel-header">
          <div>
            <h2>So sánh kỳ trước</h2>
            <p>Đối chiếu doanh thu với kỳ liền trước cùng độ dài</p>
          </div>
          <HiOutlineChartBar />
        </div>

        {comparisonError ? (
          <div className="dashboard-daily-error">{comparisonError}</div>
        ) : (
          <div className="dashboard-comparison-grid" aria-busy={comparisonLoading}>
            <div className="dashboard-comparison-metric current">
              <span>{comparisonLoading ? "Kỳ hiện tại" : revenueComparison.current.label}</span>
              <strong>
                {comparisonLoading
                  ? "..."
                  : currencyFormatter.format(revenueComparison.current.revenue || 0)}
              </strong>
              <small>Kỳ hiện tại</small>
            </div>
            <div className="dashboard-comparison-metric previous">
              <span>{comparisonLoading ? "Kỳ trước" : revenueComparison.previous.label}</span>
              <strong>
                {comparisonLoading
                  ? "..."
                  : currencyFormatter.format(revenueComparison.previous.revenue || 0)}
              </strong>
              <small>Kỳ trước</small>
            </div>
            <div className={`dashboard-comparison-metric trend ${comparisonTrend.tone}`}>
              <span>Biến động</span>
              <strong>{comparisonLoading ? "..." : comparisonTrend.label}</strong>
              <small>So với kỳ trước</small>
            </div>
          </div>
        )}
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

      <div className="dashboard-ranking-grid">
        <RankingPanel title="Doanh thu theo phim" subtitle={selectedPeriodLabel} items={topMovies} loading={rankingsLoading} maxRevenue={topMovieRevenue} type="movie" onSelect={(item) => setSelectedMovie({ _id: item.id, title: item.title })} />
        <RankingPanel title="Doanh thu combo" subtitle={selectedPeriodLabel} items={topCombos} loading={rankingsLoading} maxRevenue={topComboRevenue} type="combo" />
      </div>

      <section className="dashboard-movie-search-panel">
        <div className="dashboard-panel-header"><div><h2>Xem doanh thu từng phim</h2><p>Tìm một phim để xem doanh thu, số vé, suất chiếu và tỷ lệ lấp đầy trong kỳ đang chọn</p></div><HiOutlineFilm /></div>
        <MovieSearch selectedMovie={selectedMovie} onSelect={setSelectedMovie} />
      </section>
      {selectedMovie && <MovieRevenueReport report={movieReport} loading={movieReportLoading} error={movieReportError} periodLabel={selectedPeriodLabel} />}

      <div className="dashboard-compact-grid">
        <section className="dashboard-panel dashboard-today-panel">
          <div className="dashboard-panel-header"><div><h2>Lịch chiếu hôm nay</h2><p>{numberFormatter.format(dashboard.stats.todayShowtimes || 0)} suất chiếu</p></div><HiOutlineCalendar /></div>
          {loading ? <div className="dashboard-mini-loading">Đang tải...</div> : dashboard.todayShowtimes.length ? <div className="showtime-list">{dashboard.todayShowtimes.slice(0, 6).map((showtime) => <div className="showtime-item" key={showtime.id || showtime._id}><div><strong>{showtime.movieTitle}</strong><span>{showtime.cinemaName || "Rạp"} · {showtime.roomName || "Phòng chiếu"}</span></div><time>{showtime.startTime}</time></div>)}</div> : <div className="dashboard-empty-state">Chưa có lịch chiếu hôm nay.</div>}
        </section>
      )}

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
                      <span>{showtime.roomName || "Phòng chiếu"}</span>
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
