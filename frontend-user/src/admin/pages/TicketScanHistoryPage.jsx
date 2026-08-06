import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineClipboardList,
  HiOutlineRefresh,
  HiOutlineSearch,
} from "react-icons/hi";
import { getTicketScanLogs } from "../services/ticketAdminService";

const PAGE_SIZE = 10;

const actionLabels = {
  VERIFY: "Xác minh",
  CHECK_IN: "Check-in",
  CHECK_OUT: "Check-out",
};

const resultLabels = {
  SUCCESS: "Thành công",
  INVALID_TOKEN: "QR không hợp lệ",
  ALREADY_CHECKED_IN: "Đã check-in",
  ALREADY_CHECKED_OUT: "Đã check-out",
  CANCELLED: "Vé đã hủy",
  EXPIRED: "Vé hết hạn",
  WRONG_SHOWTIME: "Sai thời gian",
  PAYMENT_NOT_COMPLETED: "Chưa thanh toán",
  NOT_CHECKED_IN: "Chưa check-in",
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const resultBadgeClass = (result) => {
  if (result === "SUCCESS") return "status-badge status-now-showing";
  if (["WRONG_SHOWTIME", "ALREADY_CHECKED_IN", "ALREADY_CHECKED_OUT", "NOT_CHECKED_IN"].includes(result)) {
    return "status-badge status-coming-soon";
  }
  return "status-badge status-ended";
};

const initialFilters = {
  q: "",
  dateFrom: "",
  dateTo: "",
  action: "",
  result: "",
  movie: "",
  showtimeId: "",
  room: "",
};

const TicketScanHistoryPage = () => {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const requestParams = useMemo(() => {
    const params = {
      page: currentPage,
      limit: PAGE_SIZE,
    };

    Object.entries(appliedFilters).forEach(([key, value]) => {
      const normalized = String(value || "").trim();
      if (normalized) params[key] = normalized;
    });

    return params;
  }, [appliedFilters, currentPage]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getTicketScanLogs(requestParams);
      setLogs(response.data || []);
      setStats(response.stats || null);
      setCurrentPage(response.pagination?.page || currentPage);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalItems(response.pagination?.totalItems || 0);
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || "Không thể tải lịch sử quét vé.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, requestParams]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setCurrentPage(1);
    setAppliedFilters(filters);
  };

  const handleReset = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setCurrentPage(1);
  };

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="ticket-scan-history-page">
      <div className="page-header">
        <div className="page-header-info">
          <h1>Lịch sử quét QR</h1>
          <p>Theo dõi toàn bộ lượt xác minh, check-in và check-out vé điện tử.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchLogs} disabled={loading} type="button">
          <HiOutlineRefresh />
          Làm mới
        </button>
      </div>

      {error && <div className="booking-admin-alert error">{error}</div>}

      <div className="ticket-scan-stats-grid">
        <StatCard label="Tổng lượt quét" value={stats?.totalScans ?? totalItems} />
        <StatCard label="Lượt quét lỗi" value={stats?.errorScans ?? 0} />
        <StatCard label="Vé đã check-in" value={stats?.checkedInTickets ?? "-"} />
        <StatCard label="Vé đã check-out" value={stats?.checkedOutTickets ?? "-"} />
      </div>

      <form className="ticket-scan-filters" onSubmit={handleSubmit}>
        <div className="filter-search">
          <HiOutlineSearch />
          <input
            className="form-input"
            onChange={(event) => updateFilter("q", event.target.value)}
            placeholder="Tìm mã vé hoặc ghế"
            value={filters.q}
          />
        </div>
        <input className="form-input" type="date" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
        <input className="form-input" type="date" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} />
        <select className="form-input" value={filters.action} onChange={(event) => updateFilter("action", event.target.value)}>
          <option value="">Tất cả hành động</option>
          {Object.entries(actionLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select className="form-input" value={filters.result} onChange={(event) => updateFilter("result", event.target.value)}>
          <option value="">Tất cả kết quả</option>
          {Object.entries(resultLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <input className="form-input" placeholder="Tên phim" value={filters.movie} onChange={(event) => updateFilter("movie", event.target.value)} />
        <input className="form-input" placeholder="ID suất chiếu" value={filters.showtimeId} onChange={(event) => updateFilter("showtimeId", event.target.value)} />
        <input className="form-input" placeholder="Phòng chiếu" value={filters.room} onChange={(event) => updateFilter("room", event.target.value)} />
        <button className="btn btn-primary" disabled={loading} type="submit">Lọc</button>
        <button className="btn btn-secondary" disabled={loading} onClick={handleReset} type="button">Xóa lọc</button>
      </form>

      <div className="table-container ticket-scan-table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <span className="table-toolbar-title">Danh sách lượt quét</span>
            <span className="table-toolbar-count">{totalItems} log</span>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table ticket-scan-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Mã vé</th>
                <th>Phim</th>
                <th>Suất chiếu</th>
                <th>Phòng</th>
                <th>Ghế</th>
                <th>Admin</th>
                <th>Hành động</th>
                <th>Kết quả</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="10" className="ticket-scan-empty-cell">Đang tải lịch sử quét...</td></tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="10" className="ticket-scan-empty-cell">
                    <HiOutlineClipboardList />
                    <span>Không có dữ liệu quét phù hợp.</span>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.scannedAt)}</td>
                    <td><strong className="booking-code-text">{log.ticketCode || "-"}</strong></td>
                    <td>{log.movie?.title || "-"}</td>
                    <td>{formatDateTime(log.showtime?.startTime)}</td>
                    <td>{log.room?.name || "-"}</td>
                    <td>{log.seatLabel || "-"}</td>
                    <td>
                      <span className="booking-cell-main">{log.admin?.name || "-"}</span>
                      <span className="table-muted booking-cell-sub">{log.admin?.email || ""}</span>
                    </td>
                    <td>{actionLabels[log.action] || log.action}</td>
                    <td><span className={resultBadgeClass(log.result)}>{resultLabels[log.result] || log.result}</span></td>
                    <td>{log.errorNote || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pagination">
        <button className="pagination-btn" disabled={currentPage <= 1 || loading} onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))} type="button">
          Trước
        </button>
        <span className="pagination-info">Trang {currentPage} / {totalPages}</span>
        <button className="pagination-btn" disabled={currentPage >= totalPages || loading} onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))} type="button">
          Sau
        </button>
      </div>
    </div>
  );
};

const StatCard = ({ label, value }) => (
  <div className="stat-card booking-stat-card">
    <div className="stat-card-icon purple">
      <HiOutlineClipboardList />
    </div>
    <div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  </div>
);

export default TicketScanHistoryPage;
