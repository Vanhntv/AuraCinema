import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineCalendar,
  HiOutlineCash,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineFilm,
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
    const request = window.setTimeout(fetchDashboard, 0);
    return () => window.clearTimeout(request);
  }, [fetchDashboard]);
  useEffect(() => {
    const request = window.setTimeout(() => { fetchRevenue(); fetchRankings(); }, 0);
    return () => window.clearTimeout(request);
  }, [fetchRankings, fetchRevenue]);
  useEffect(() => {
    const request = window.setTimeout(fetchSelectedMovie, 0);
    return () => window.clearTimeout(request);
  }, [fetchSelectedMovie]);

  const handleRefresh = () => { fetchDashboard(); fetchRevenue(); fetchRankings(); fetchSelectedMovie(); };
  const chooseDate = (date) => { setRevenuePeriod("day"); setSelectedDate(date); };
  const formatDisplayDate = (value) => displayDateFormatter.format(new Date(`${value}T12:00:00+07:00`));
  const selectedPeriodLabel = comparison.current.label || (periodRange.from === periodRange.to
    ? formatDisplayDate(periodRange.from)
    : `${formatDisplayDate(periodRange.from)} - ${formatDisplayDate(periodRange.to)}`);
  const comparisonTrend = useMemo(() => {
    const change = comparison.percentageChange;
    if (change === null || change === undefined) return { label: "Chưa có dữ liệu đối chiếu", tone: "neutral" };
    if (change > 0) return { label: `Tăng ${numberFormatter.format(change)}%`, tone: "increase" };
    if (change < 0) return { label: `Giảm ${numberFormatter.format(Math.abs(change))}%`, tone: "decrease" };
    return { label: "Không thay đổi", tone: "neutral" };
  }, [comparison.percentageChange]);

  const statCards = [
    { label: "Tổng doanh thu", value: dashboard.stats.revenue, icon: <HiOutlineCash />, currency: true, tone: "teal" },
    { label: "Doanh thu hôm nay", value: dashboard.stats.todayRevenue, icon: <HiOutlineChartBar />, currency: true, tone: "blue" },
    { label: "Vé đã bán", value: dashboard.stats.ticketsSold, icon: <HiOutlineTicket />, tone: "orange" },
    { label: "Đơn thành công", value: dashboard.stats.successfulBookings, icon: <HiOutlineCheckCircle />, tone: "purple" },
    { label: "Tổng đơn đặt vé", value: dashboard.stats.bookings, icon: <HiOutlineTicket />, tone: "blue" },
    { label: "Phim trong hệ thống", value: dashboard.stats.movies, icon: <HiOutlineFilm />, tone: "purple" },
    { label: "Rạp đang quản lý", value: dashboard.stats.cinemas, icon: <HiOutlineChartBar />, tone: "teal" },
    { label: "Suất chiếu hôm nay", value: dashboard.stats.todayShowtimes, icon: <HiOutlineCalendar />, tone: "orange" },
  ];
  const topMovieRevenue = Math.max(...topMovies.map((item) => Number(item.revenue || 0)), 0);
  const topComboRevenue = Math.max(...topCombos.map((item) => Number(item.revenue || 0)), 0);

  return (
    <div className="dashboard-page">
      <div className="page-header dashboard-header">
        <div className="page-header-info"><h1>Dashboard kinh doanh</h1><p>Tổng quan vận hành, doanh thu vé, phim và combo</p></div>
        <button className="btn btn-secondary" onClick={handleRefresh} disabled={loading || revenueLoading}><HiOutlineRefresh /> Làm mới</button>
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

      <section className="dashboard-revenue-workspace">
        <div className="dashboard-revenue-toolbar">
          <div><h2>Phân tích doanh thu</h2><p>Xem doanh thu theo ngày, tuần, tháng, năm hoặc khoảng ngày tùy chọn</p></div>
          <div className="dashboard-revenue-controls">
            <div className="dashboard-date-shortcuts" aria-label="Chọn ngày nhanh">
              <button className={selectedDate === currentDate && revenuePeriod === "day" ? "active" : ""} onClick={() => chooseDate(currentDate)} type="button">Hôm nay</button>
            </div>
            <label className="dashboard-date-filter"><span>Kiểu xem</span><select className="form-input dashboard-period-select" value={revenuePeriod} onChange={(event) => setRevenuePeriod(event.target.value)}><option value="day">Theo ngày</option><option value="week">Theo tuần</option><option value="month">Theo tháng</option><option value="year">Theo năm</option><option value="range">Khoảng ngày</option></select></label>
            {(revenuePeriod === "day" || revenuePeriod === "week") && <label className="dashboard-date-filter"><span>{revenuePeriod === "day" ? "Chọn ngày" : "Ngày thuộc tuần"}</span><input className="form-input dashboard-date-input" type="date" max={currentDate} value={selectedDate} onChange={(event) => event.target.value && setSelectedDate(event.target.value)} /></label>}
            {revenuePeriod === "month" && <label className="dashboard-date-filter"><span>Chọn tháng</span><input className="form-input dashboard-date-input" type="month" max={currentDate.slice(0, 7)} value={selectedDate.slice(0, 7)} onChange={(event) => event.target.value && setSelectedDate(`${event.target.value}-01`)} /></label>}
            {revenuePeriod === "year" && <label className="dashboard-date-filter"><span>Chọn năm</span><input className="form-input dashboard-year-input" type="number" min="2000" max={currentYear} value={selectedDate.slice(0, 4)} onChange={(event) => { const year = Number(event.target.value); if (year >= 2000 && year <= currentYear) setSelectedDate(`${year}-01-01`); }} /></label>}
            {revenuePeriod === "range" && <div className="dashboard-range-filter">
              <label className="dashboard-date-filter"><span>Từ ngày</span><input className="form-input dashboard-date-input" type="date" max={rangeTo || currentDate} value={rangeFrom} onChange={(event) => { const value = event.target.value; if (!value) return; setRangeFrom(value); if (value > rangeTo) setRangeTo(value); }} /></label>
              <label className="dashboard-date-filter"><span>Đến ngày</span><input className="form-input dashboard-date-input" type="date" min={rangeFrom} max={currentDate} value={rangeTo} onChange={(event) => event.target.value && setRangeTo(event.target.value)} /></label>
            </div>}
          </div>
        </div>
        {revenueError ? <div className="dashboard-daily-error">{revenueError}</div> : <>
          <div className="dashboard-revenue-summary">
            <div className="dashboard-revenue-primary"><span>Doanh thu · {selectedPeriodLabel}</span><strong>{revenueLoading ? "..." : currencyFormatter.format(periodTotal)}</strong>{(revenuePeriod === "day" || revenuePeriod === "range") && <small>{revenueLoading ? "..." : numberFormatter.format(dailyStats.bookingCount)} đơn · {revenueLoading ? "..." : numberFormatter.format(dailyStats.ticketsSold)} vé</small>}</div>
            <div className="dashboard-comparison-inline"><div><span>Kỳ trước</span><strong>{revenueLoading ? "..." : currencyFormatter.format(comparison.previous.revenue || 0)}</strong><small>{comparison.previous.label}</small></div><div className={`dashboard-trend ${comparisonTrend.tone}`}><span>Biến động</span><strong>{revenueLoading ? "..." : comparisonTrend.label}</strong><small>So với kỳ trước</small></div></div>
          </div>
          {revenuePeriod !== "day" && <RevenueChart data={chartData} loading={revenueLoading} xAxisLabel={revenuePeriod === "year" ? "Tháng" : "Ngày"} />}
        </>}
      </section>

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
        <section className="dashboard-panel">
          <div className="dashboard-panel-header"><div><h2>Đơn đặt vé gần đây</h2><p>5 giao dịch mới nhất trong hệ thống</p></div><HiOutlineTicket /></div>
          {loading ? <div className="dashboard-mini-loading">Đang tải...</div> : dashboard.recentBookings.length ? <div className="dashboard-recent-bookings">{dashboard.recentBookings.map((booking) => <div className="dashboard-recent-booking" key={booking.id}><div><strong>{booking.code}</strong><span>{booking.movieTitle} · {booking.customerName}</span></div><div><strong>{currencyFormatter.format(booking.totalAmount || 0)}</strong><span>{booking.status}</span></div></div>)}</div> : <div className="dashboard-empty-state">Chưa có đơn đặt vé.</div>}
        </section>
      </div>
    </div>
  );
};

const RankingPanel = ({ title, subtitle, items, loading, maxRevenue, type, onSelect }) => (
  <section className="dashboard-top-movies-panel">
    <div className="dashboard-panel-header dashboard-top-movies-header"><div><h2>{title}</h2><p>{subtitle}</p></div>{type === "movie" ? <HiOutlineFilm /> : <HiOutlineCash />}</div>
    {loading ? <div className="dashboard-chart-state">Đang tải dữ liệu...</div> : items.length ? <div className="dashboard-top-movies-list">{items.map((item, index) => {
      const name = type === "movie" ? item.title : item.name;
      return <button className="dashboard-top-movie dashboard-ranking-button" key={item.id || name} type="button" onClick={() => onSelect?.(item)} disabled={!onSelect}><span className={`dashboard-movie-rank rank-${index + 1}`}>{index + 1}</span><span className="dashboard-top-movie-info"><span className="dashboard-top-movie-title-row"><strong>{name || "Chưa xác định"}</strong><span>{currencyFormatter.format(item.revenue || 0)}</span></span><span className="dashboard-top-movie-track"><span className={`dashboard-top-movie-bar ${type === "combo" ? "dashboard-top-combo-bar" : ""}`} style={{ width: `${maxRevenue ? Math.max((Number(item.revenue || 0) / maxRevenue) * 100, 3) : 0}%` }} /></span><small>{type === "movie" ? `${numberFormatter.format(item.ticketsSold || 0)} vé · ${numberFormatter.format(item.bookingCount || 0)} đơn` : `${numberFormatter.format(item.quantitySold || 0)} sản phẩm`}</small></span></button>;
    })}</div> : <div className="dashboard-empty-state">Chưa có dữ liệu trong kỳ này.</div>}
  </section>
);

const MovieRevenueReport = ({ report, loading, error, periodLabel }) => {
  if (loading) return <section className="dashboard-movie-revenue-panel"><div className="dashboard-chart-state">Đang tải báo cáo phim...</div></section>;
  if (error) return <section className="dashboard-movie-revenue-panel"><div className="dashboard-daily-error">{error}</div></section>;
  if (!report) return null;
  const metrics = [
    ["Doanh thu", currencyFormatter.format(report.revenue || 0), <HiOutlineCash />],
    ["Vé đã bán", numberFormatter.format(report.ticketsSold || 0), <HiOutlineTicket />],
    ["Đơn thành công", numberFormatter.format(report.bookingCount || 0), <HiOutlineCheckCircle />],
    ["Suất chiếu", numberFormatter.format(report.showtimeCount || 0), <HiOutlineCalendar />],
    ["Lấp đầy trung bình", `${numberFormatter.format(report.averageOccupancyRate || 0)}%`, <HiOutlineChartBar />],
  ];
  return <section className="dashboard-movie-revenue-panel">
    <div className="dashboard-panel-header"><div><h2>{report.movie?.title}</h2><p>Báo cáo chi tiết · {periodLabel}</p></div><HiOutlineFilm /></div>
    <div className="dashboard-movie-revenue-grid">{metrics.map(([label, value, icon], index) => <div className={`dashboard-movie-revenue-metric ${index === 0 ? "primary" : ""}`} key={label}>{icon}<span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="dashboard-movie-daily-chart"><div className="dashboard-movie-chart-heading"><h3>Doanh thu phim theo ngày</h3><p>Chi tiết doanh thu phát sinh trong kỳ</p></div><RevenueChart data={report.dailyRevenue || []} /></div>
    <div className="dashboard-movie-detail-grid">
      <div><div className="dashboard-movie-chart-heading"><h3>Vé theo loại ghế</h3><p>Cơ cấu vé đã bán</p></div><div className="dashboard-seat-type-grid">{[["normal", "Ghế thường"], ["vip", "Ghế VIP"], ["couple", "Ghế đôi"]].map(([key, label]) => <div className={`dashboard-seat-type-item ${key}`} key={key}><HiOutlineTicket /><span>{label}</span><strong>{numberFormatter.format(report.ticketsBySeatType?.[key] || 0)}</strong></div>)}</div></div>
      <div><div className="dashboard-movie-chart-heading"><h3>Lấp đầy theo suất chiếu</h3><p>Số ghế bán trên tổng sức chứa</p></div><div className="dashboard-occupancy-list">{(report.occupancyByShowtime || []).length ? report.occupancyByShowtime.map((item) => <div className="dashboard-occupancy-row" key={item.id}><div className="dashboard-occupancy-showtime"><strong>{dateTimeFormatter.format(new Date(item.startTime))}</strong><span>{item.roomName || "Phòng chiếu"}</span></div><span className="dashboard-occupancy-seats">{numberFormatter.format(item.soldSeats || 0)}/{numberFormatter.format(item.totalSeats || 0)} ghế</span><div className="dashboard-occupancy-progress"><div style={{ width: `${Math.min(Number(item.occupancyRate || 0), 100)}%` }} /></div><strong className="dashboard-occupancy-rate">{numberFormatter.format(item.occupancyRate || 0)}%</strong></div>) : <div className="dashboard-empty-state">Chưa có dữ liệu suất chiếu.</div>}</div></div>
    </div>
  </section>;
};

export default DashboardPage;
