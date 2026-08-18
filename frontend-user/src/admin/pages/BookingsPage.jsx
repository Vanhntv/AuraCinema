import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineEye,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineTicket,
  HiOutlineXCircle,
} from "react-icons/hi";
import {
  cancelAdminBooking,
  getAdminBookingById,
  getAdminBookings,
  updateAdminBookingPayment,
} from "../services/bookingAdminService";

const PAGE_SIZE = 10;

const paymentStatusLabels = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  failed: "Thanh toán lỗi",
  cancelled: "Đã hủy",
  expired: "Hết hạn thanh toán",
  refund_pending: "Chờ đối soát hoàn tiền",
  refunded: "Đã hoàn tiền",
};

const editablePaymentStatuses = new Set(["pending", "paid", "failed", "cancelled", "refunded"]);

const bookingStatusLabels = {
  pending: "Chờ thanh toán",
  confirmed: "Đã xác nhận",
  cancelled: "Đã hủy",
};

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

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

const statusBadgeClass = (status) => {
  if (status === "paid" || status === "confirmed") return "status-badge status-now-showing";
  if (["pending", "failed", "refund_pending"].includes(status)) return "status-badge status-coming-soon";
  return "status-badge status-ended";
};

const getBookingCode = (booking) => booking?.booking_code || booking?._id || "-";
const getMovieTitle = (booking) => booking?.showtime_id?.movie_id?.title || "-";
const getCinemaName = (booking) => booking?.showtime_id?.room_id?.cinema_id?.name || "-";
const getRoomName = (booking) => booking?.showtime_id?.room_id?.name || "-";
const getCustomerName = (booking) => booking?.user_id?.full_name || booking?.customer_name || "-";

const getSeatNames = (booking) =>
  (booking?.showtime_seat_ids || [])
    .map((seat) => {
      const data = seat.seat_id;
      if (!data) return "";
      return `${data.seat_row || ""}${data.seat_number || ""}`;
    })
    .filter(Boolean)
    .join(", ") || "-";

const getComboText = (booking) => {
  const combos = (booking?.combos || [])
    .map((item) => {
      const name = item.name || item.combo_id?.name;
      if (!name) return "";
      return `${name} x${item.quantity}`;
    })
    .filter(Boolean);

  return combos.length ? combos.join(", ") : "Không có";
};

const getVoucherText = (booking) => {
  const code = booking?.voucher?.code || booking?.voucher?.voucher_id?.code;
  const discount = Number(booking?.discount_amount || booking?.voucher?.discount_amount || 0);
  if (!code) return "Không có";
  return `${code}${discount > 0 ? ` (-${currencyFormatter.format(discount)})` : ""}`;
};

const BookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLookup, setPageLookup] = useState("1");
  const [pageLookupError, setPageLookupError] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [paymentForm, setPaymentForm] = useState({ payment_status: "pending", payment_transaction_id: "" });
  const [cancelReason, setCancelReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchBookings = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setFeedback({ type: "", message: "" });
      const response = await getAdminBookings({
        page,
        limit: PAGE_SIZE,
        q: searchQuery.trim(),
        payment_status: paymentFilter || undefined,
        status: statusFilter || undefined,
      });
      const resolvedPage = Number(response.pagination?.page || page);
      setBookings(response.data || []);
      setCurrentPage(resolvedPage);
      setPageLookup(String(resolvedPage));
      setPageLookupError("");
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalItems(response.pagination?.totalItems || 0);
    } catch (error) {
      setFeedback({ type: "error", message: error.response?.data?.message || "Không thể tải danh sách đơn vé." });
    } finally {
      setLoading(false);
    }
  }, [paymentFilter, searchQuery, statusFilter]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void fetchBookings(1);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [fetchBookings]);

  const stats = useMemo(() => ({
    total: totalItems,
    pending: bookings.filter((booking) => booking.payment_status === "pending").length,
    paid: bookings.filter((booking) => booking.payment_status === "paid").length,
    cancelled: bookings.filter((booking) => booking.status === "cancelled").length,
  }), [bookings, totalItems]);

  const openDetail = async (booking) => {
    try {
      setDetailLoading(true);
      setFeedback({ type: "", message: "" });
      const response = await getAdminBookingById(booking._id);
      setSelectedBooking(response.data);
      setPaymentForm({
        payment_status: response.data?.payment_status || "pending",
        payment_transaction_id: response.data?.payment_transaction_id || "",
      });
      setCancelReason("");
    } catch (error) {
      setFeedback({ type: "error", message: error.response?.data?.message || "Không thể tải chi tiết đơn vé." });
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedBooking(null);
    setCancelReason("");
  };

  const handleSubmitFilters = (event) => {
    event.preventDefault();
    fetchBookings(1);
  };

  const handlePageLookup = (event) => {
    event.preventDefault();
    const requestedPage = Number(pageLookup);

    if (!Number.isInteger(requestedPage) || requestedPage < 1 || requestedPage > totalPages) {
      setPageLookupError(`Nhập số trang từ 1 đến ${totalPages}.`);
      return;
    }

    if (requestedPage === currentPage) {
      setPageLookupError("");
      return;
    }

    void fetchBookings(requestedPage);
  };

  const handleUpdatePayment = async () => {
    if (!selectedBooking) return;

    try {
      setSubmitting(true);
      const response = await updateAdminBookingPayment(selectedBooking._id, {
        payment_status: paymentForm.payment_status,
        payment_transaction_id: paymentForm.payment_transaction_id,
        payment_provider: "manual",
      });
      setSelectedBooking(response.data);
      setFeedback({ type: "success", message: "Đã cập nhật trạng thái thanh toán." });
      await fetchBookings(currentPage);
    } catch (error) {
      setFeedback({ type: "error", message: error.response?.data?.message || "Không thể cập nhật thanh toán." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    try {
      setSubmitting(true);
      const response = await cancelAdminBooking(selectedBooking._id, {
        reason: cancelReason,
      });
      setSelectedBooking(response.data);
      setFeedback({ type: "success", message: response.message || "Đã hủy đơn vé." });
      await fetchBookings(currentPage);
    } catch (error) {
      setFeedback({ type: "error", message: error.response?.data?.message || "Không thể hủy đơn vé." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bookings-page">
      <div className="page-header">
        <div className="page-header-info">
          <h1>Đơn vé</h1>
          <p>Tra cứu mã đơn, theo dõi thanh toán và xử lý hủy do rạp</p>
        </div>
        <button className="btn btn-secondary" onClick={() => fetchBookings(currentPage)} disabled={loading} type="button">
          <HiOutlineRefresh />
          Làm mới
        </button>
      </div>

      <div className="bookings-stats-grid">
        <StatCard label="Tổng đơn" value={stats.total} />
        <StatCard label="Trang này chờ thanh toán" value={stats.pending} />
        <StatCard label="Trang này đã thanh toán" value={stats.paid} />
        <StatCard label="Trang này đã hủy" value={stats.cancelled} />
      </div>

      {feedback.message && (
        <div className={`booking-admin-alert ${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      <form className="booking-admin-filters" onSubmit={handleSubmitFilters}>
        <div className="filter-search">
          <HiOutlineSearch />
          <input
            className="form-input"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm mã đơn, khách hàng, email, SĐT"
            value={searchQuery}
          />
        </div>
        <select className="form-input" onChange={(event) => setPaymentFilter(event.target.value)} value={paymentFilter}>
          <option value="">Tất cả thanh toán</option>
          {Object.entries(paymentStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select className="form-input" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
          <option value="">Tất cả trạng thái vé</option>
          {Object.entries(bookingStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button className="btn btn-primary" disabled={loading} type="submit">
          Lọc
        </button>
      </form>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <span className="table-toolbar-title">Danh sách đơn vé</span>
            <span className="table-toolbar-count">{totalItems} đơn</span>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table bookings-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Rạp / Phòng</th>
                <th>Suất</th>
                <th>Ghế</th>
                <th>Tổng tiền</th>
                <th>Thanh toán</th>
                <th>Vé</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: "center" }}>Đang tải đơn vé...</td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: "center" }}>Không có đơn vé phù hợp</td></tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking._id}>
                    <td>
                      <strong className="booking-code-text">{getBookingCode(booking)}</strong>
                      <span className="table-muted booking-movie-text">{getMovieTitle(booking)}</span>
                    </td>
                    <td>
                      <span className="booking-cell-main">{getCustomerName(booking)}</span>
                      <span className="table-muted booking-cell-sub">{booking.customer_email || booking.user_id?.email || "-"}</span>
                    </td>
                    <td>
                      <span className="booking-cell-main">{getCinemaName(booking)}</span>
                      <span className="table-muted booking-cell-sub">{getRoomName(booking)}</span>
                    </td>
                    <td>{formatDateTime(booking.showtime_id?.start_time)}</td>
                    <td>{getSeatNames(booking)}</td>
                    <td>{currencyFormatter.format(Number(booking.total_price || 0))}</td>
                    <td><span className={statusBadgeClass(booking.payment_status)}>{paymentStatusLabels[booking.payment_status] || booking.payment_status}</span></td>
                    <td><span className={statusBadgeClass(booking.status)}>{bookingStatusLabels[booking.status] || booking.status}</span></td>
                    <td>
                      <button className="action-btn view" onClick={() => openDetail(booking)} title="Xem chi tiết" type="button">
                        <HiOutlineEye />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pagination">
        <button className="pagination-btn" disabled={currentPage <= 1 || loading} onClick={() => fetchBookings(currentPage - 1)} type="button">
          Trước
        </button>
        <span className="pagination-info">Trang {currentPage} / {totalPages}</span>
        <button className="pagination-btn" disabled={currentPage >= totalPages || loading} onClick={() => fetchBookings(currentPage + 1)} type="button">
          Sau
        </button>
        <form className="pagination-lookup" onSubmit={handlePageLookup}>
          <label htmlFor="booking-page-lookup">Đến trang</label>
          <input
            id="booking-page-lookup"
            aria-describedby={pageLookupError ? "booking-page-lookup-error" : undefined}
            aria-invalid={Boolean(pageLookupError)}
            inputMode="numeric"
            maxLength={String(totalPages).length}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "" || /^\d+$/.test(value)) {
                setPageLookup(value);
                setPageLookupError("");
              }
            }}
            pattern="[0-9]*"
            value={pageLookup}
          />
          <button className="pagination-go-btn" disabled={loading || pageLookup === ""} type="submit">
            Đi
          </button>
        </form>
        {pageLookupError && (
          <span className="pagination-lookup-error" id="booking-page-lookup-error" role="alert">
            {pageLookupError}
          </span>
        )}
      </div>

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          cancelReason={cancelReason}
          detailLoading={detailLoading}
          onCancel={handleCancelBooking}
          onClose={closeDetail}
          onPaymentChange={setPaymentForm}
          onReasonChange={setCancelReason}
          onUpdatePayment={handleUpdatePayment}
          paymentForm={paymentForm}
          submitting={submitting}
        />
      )}
    </div>
  );
};

const StatCard = ({ label, value }) => (
  <div className="stat-card booking-stat-card">
    <div className="stat-card-icon purple">
      <HiOutlineTicket />
    </div>
    <div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  </div>
);

const BookingDetailModal = ({
  booking,
  cancelReason,
  detailLoading,
  onCancel,
  onClose,
  onPaymentChange,
  onReasonChange,
  onUpdatePayment,
  paymentForm,
  submitting,
}) => (
  <div className="modal-overlay active">
    <div className="booking-detail-modal">
      <div className="modal-header">
        <div>
          <h2>Chi tiết đơn vé</h2>
          <p>{getBookingCode(booking)}</p>
        </div>
        <button className="modal-close" onClick={onClose} type="button">×</button>
      </div>

      {detailLoading ? (
        <p className="modal-loading">Đang tải chi tiết...</p>
      ) : (
        <>
          <div className="booking-detail-grid">
            <InfoItem label="Khách hàng" value={getCustomerName(booking)} />
            <InfoItem label="Email" value={booking.customer_email || booking.user_id?.email || "-"} />
            <InfoItem label="Điện thoại" value={booking.customer_phone || booking.user_id?.phone || "-"} />
            <InfoItem label="Phim" value={getMovieTitle(booking)} />
            <InfoItem label="Rạp" value={getCinemaName(booking)} />
            <InfoItem label="Phòng" value={getRoomName(booking)} />
            <InfoItem label="Suất chiếu" value={formatDateTime(booking.showtime_id?.start_time)} />
            <InfoItem label="Ghế" value={getSeatNames(booking)} />
            <InfoItem label="Combo" value={getComboText(booking)} />
            <InfoItem label="Voucher" value={getVoucherText(booking)} />
            <InfoItem label="Tạm tính" value={currencyFormatter.format(Number(booking.subtotal_price || 0))} />
            <InfoItem label="Tổng tiền" value={currencyFormatter.format(Number(booking.total_price || 0))} />
          </div>

          <div className="booking-admin-actions-panel">
            <div>
              <h3>Cập nhật thanh toán</h3>
              <div className="booking-action-row">
                <select
                  className="form-input"
                  onChange={(event) => onPaymentChange((current) => ({ ...current, payment_status: event.target.value }))}
                  value={paymentForm.payment_status}
                >
                  {Object.entries(paymentStatusLabels)
                    .filter(([value]) =>
                      (editablePaymentStatuses.has(value) || value === booking.payment_status) &&
                      (booking.payment_status !== "paid" || ["paid", "cancelled", "refunded"].includes(value)),
                    )
                    .map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                    ))}
                </select>
                <input
                  className="form-input"
                  onChange={(event) => onPaymentChange((current) => ({ ...current, payment_transaction_id: event.target.value }))}
                  placeholder="Mã giao dịch"
                  value={paymentForm.payment_transaction_id}
                />
                <button className="btn btn-primary" disabled={submitting} onClick={onUpdatePayment} type="button">
                  Lưu thanh toán
                </button>
              </div>
            </div>

            <div>
              <h3>Hủy đơn do rạp</h3>
              {booking.payment_status === "paid" && (
                <p className="booking-admin-note">Hủy đơn sẽ vô hiệu hóa toàn bộ Ticket. Hoàn tiền cần được xử lý và đối soát trong workflow thanh toán riêng.</p>
              )}
              {booking.payment_status === "refund_pending" && (
                <p className="booking-admin-note" role="status">Khách đã thanh toán sau khi đơn hết hạn. Không xác nhận lại ghế; hãy đối soát giao dịch và chuyển sang “Đã hoàn tiền” sau khi xử lý.</p>
              )}
              <div className="booking-action-row">
                <input
                  className="form-input"
                  onChange={(event) => onReasonChange(event.target.value)}
                  placeholder="Lý do hủy"
                  value={cancelReason}
                />
                <button
                  className="btn btn-danger"
                  disabled={submitting || booking.status === "cancelled"}
                  onClick={onCancel}
                  type="button"
                >
                  <HiOutlineXCircle />
                  Hủy đơn
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  </div>
);

const InfoItem = ({ label, value }) => (
  <div className="booking-info-item">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

export default BookingsPage;
