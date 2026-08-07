import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineClipboardList,
  HiOutlineEye,
  HiOutlineRefresh,
  HiOutlineSearch,
} from "react-icons/hi";
import { getTicketScanLogs } from "../services/ticketAdminService";
import { getApiErrorMessage, showToast } from "../../utils/toast";

const PAGE_SIZE = 10;

const actionLabels = {
  VERIFY: "Xác minh",
  CHECK_IN: "Check-in",
};

const resultLabels = {
  SUCCESS: "Thành công",
  INVALID_TOKEN: "QR không hợp lệ",
  ALREADY_CHECKED_IN: "Đã check-in",
  CANCELLED: "Vé đã hủy",
  EXPIRED: "Vé hết hạn",
  WRONG_SHOWTIME: "Sai thời gian",
  PAYMENT_NOT_COMPLETED: "Chưa thanh toán",
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
  if (["WRONG_SHOWTIME", "ALREADY_CHECKED_IN"].includes(result)) {
    return "status-badge status-coming-soon";
  }
  return "status-badge status-ended";
};

const initialFilters = {
  q: "",
  result: "",
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
  const [selectedLog, setSelectedLog] = useState(null);

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
      const message = getApiErrorMessage(fetchError, "Không thể tải lịch sử quét vé.");
      setError(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, requestParams]);

  useEffect(() => {
    const timer = window.setTimeout(fetchLogs, 0);
    return () => window.clearTimeout(timer);
  }, [fetchLogs]);

  const handleSubmit = (event) => {
    event.preventDefault();
  };

  const handleReset = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setCurrentPage(1);
  };

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrentPage(1);
      setAppliedFilters(filters);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [filters]);

  return (
    <div className="ticket-scan-history-page">
      <div className="page-header">
        <div className="page-header-info">
          <h1>Lịch sử quét QR</h1>
          <p>Theo dõi toàn bộ lượt xác minh và check-in vé điện tử.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchLogs} disabled={loading} type="button">
          <HiOutlineRefresh />
          Làm mới
        </button>
      </div>

      {error && <div className="booking-admin-alert error">{error}</div>}

      <div className="ticket-scan-stats-grid">
        <StatCard label="Tổng lượt quét" value={stats?.totalScans ?? totalItems} />
        <StatCard label="Lượt xác minh" value={stats?.verifyScans ?? "-"} />
        <StatCard label="Check-in thành công" value={stats?.successfulCheckIns ?? "-"} />
        <StatCard label="Lượt quét lỗi" value={stats?.errorScans ?? 0} />
        <StatCard label="Vé đã check-in" value={stats?.checkedInTickets ?? "-"} />
      </div>

      <form className="ticket-scan-filters compact" onSubmit={handleSubmit}>
        <div className="filter-search">
          <HiOutlineSearch />
          <input
            className="form-input"
            onChange={(event) => updateFilter("q", event.target.value)}
            placeholder="Tìm mã vé, ghế..."
            value={filters.q}
          />
        </div>
        <select className="form-input" value={filters.result} onChange={(event) => updateFilter("result", event.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(resultLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
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
                <th>Ghế</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="ticket-scan-empty-cell">Đang tải lịch sử quét...</td></tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="ticket-scan-empty-cell">
                    <HiOutlineClipboardList />
                    <span>Không có dữ liệu quét phù hợp.</span>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="ticket-scan-time">{formatDateTime(log.scannedAt)}</td>
                    <td>
                      <strong className="ticket-scan-code" title={log.ticketCode || "-"}>
                        {log.ticketCode || "-"}
                      </strong>
                    </td>
                    <td>
                      <span className="ticket-scan-title" title={log.movie?.title || "-"}>
                        {log.movie?.title || "-"}
                      </span>
                    </td>
                    <td className="ticket-scan-showtime">{formatDateTime(log.showtime?.startTime)}</td>
                    <td><strong className="ticket-scan-seat">{log.seatLabel || "-"}</strong></td>
                    <td>
                      <div className="ticket-scan-status-cell">
                        <span>{actionLabels[log.action] || log.action}</span>
                        <span className={resultBadgeClass(log.result)}>{resultLabels[log.result] || log.result}</span>
                      </div>
                    </td>
                    <td>
                      <div className="ticket-scan-row-actions">
                        <button
                          className="btn btn-secondary btn-sm ticket-scan-detail-btn"
                          onClick={() => setSelectedLog(log)}
                          type="button"
                        >
                          <HiOutlineEye />
                          Chi tiết
                        </button>
                      </div>
                    </td>
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

      {selectedLog && (
        <ScanLogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
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

const ScanLogDetailModal = ({ log, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal modal-large ticket-scan-detail-modal" onClick={(event) => event.stopPropagation()}>
      <div className="modal-header">
        <div>
          <h2 className="modal-title">Chi tiết lượt quét</h2>
          <p className="modal-subtitle">{log.ticketCode || "Không có mã vé"}</p>
        </div>
        <button className="modal-close" onClick={onClose} type="button">×</button>
      </div>

      <div className="modal-body">
        <div className="ticket-scan-detail-grid">
          <DetailField label="Thời gian quét" value={formatDateTime(log.scannedAt)} />
          <DetailField label="Mã vé" value={log.ticketCode || "-"} />
          <DetailField label="Trạng thái vé" value={log.ticketStatus || "-"} />
          <DetailField label="Phim" value={log.movie?.title || "-"} />
          <DetailField label="Suất chiếu" value={formatDateTime(log.showtime?.startTime)} />
          <DetailField label="Phòng" value={log.room?.name || "-"} />
          <DetailField label="Ghế" value={log.seatLabel || "-"} />
          <DetailField label="Admin" value={log.admin?.name || "-"} />
          <DetailField label="Email admin" value={log.admin?.email || "-"} />
          <DetailField label="Hành động" value={actionLabels[log.action] || log.action || "-"} />
          <DetailField label="Kết quả" value={resultLabels[log.result] || log.result || "-"} />
          <DetailField label="IP" value={log.ipAddress || "-"} />
          <DetailField label="User-agent" value={log.userAgent || "-"} wide />
          <DetailField label="Ghi chú" value={log.errorNote || "-"} wide />
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose} type="button">Đóng</button>
      </div>
    </div>
  </div>
);

const DetailField = ({ label, value, wide = false }) => (
  <div className={`ticket-scan-detail-field ${wide ? "wide" : ""}`}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

export default TicketScanHistoryPage;
