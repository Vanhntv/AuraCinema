import { HiOutlineX } from "react-icons/hi";

const discountTypeLabels = {
  percent: "Phần trăm",
  fixed: "Số tiền cố định",
};

const scopeLabels = {
  order: "Toàn bộ đơn hàng",
  ticket: "Vé xem phim",
  concession: "Bắp nước",
  movie: "Phim cụ thể",
  member: "Thành viên",
};

const paymentStatusLabels = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  failed: "Thanh toán lỗi",
  refunded: "Đã hoàn tiền",
};

const bookingStatusLabels = {
  confirmed: "Đã đặt",
  cancelled: "Đã hủy",
  unknown: "Không rõ",
};

const usageStatusLabels = {
  reserved: "Đã giữ lượt",
  used: "Đã sử dụng",
  refunded: "Đã hoàn lượt",
  cancelled: "Đã hủy lượt",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return "Chưa cấu hình";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cấu hình";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDiscountValue = (voucher) => {
  if (voucher?.discount_type === "percent") {
    return `${Number(voucher.discount_value || 0)}%`;
  }

  return formatCurrency(voucher?.discount_value);
};

const resolveVoucherStatus = (voucher) => {
  const statusMap = {
    active: { label: "Đang hoạt động", className: "status-now-showing" },
    upcoming: { label: "Sắp diễn ra", className: "status-coming-soon" },
    paused: { label: "Tạm dừng", className: "status-ended" },
    out_of_usage: { label: "Đã hết lượt", className: "status-ended" },
    expired: { label: "Hết hạn", className: "status-ended" },
    cancelled: { label: "Đã hủy", className: "status-ended" },
  };

  if (voucher?.computed_status && statusMap[voucher.computed_status]) {
    return statusMap[voucher.computed_status];
  }

  if (voucher?.deleted_at) return statusMap.cancelled;
  if (!voucher?.status) return { label: "Tạm dừng", className: "status-ended" };

  const now = Date.now();
  const startTime = voucher.start_date ? new Date(voucher.start_date).getTime() : null;
  const endTime = voucher.end_date ? new Date(voucher.end_date).getTime() : null;
  const usageLimit = Number(voucher.usage_limit ?? voucher.quantity ?? 0);
  const usageCount = Number(voucher.usage_count ?? Math.max(usageLimit - Number(voucher.quantity || 0), 0));

  if (startTime && now < startTime) return { label: "Sắp diễn ra", className: "status-coming-soon" };
  if (usageLimit > 0 && usageCount >= usageLimit) return { label: "Đã hết lượt", className: "status-ended" };
  if (endTime && now > endTime) return { label: "Hết hạn", className: "status-ended" };
  return { label: "Đang hoạt động", className: "status-now-showing" };
};

const DetailField = ({ label, value }) => (
  <div className="voucher-detail-field">
    <span>{label}</span>
    <strong>{value || "Chưa cấu hình"}</strong>
  </div>
);

const shortId = (value) => {
  if (!value) return "-";
  const id = String(value);
  return id.length > 8 ? `#${id.slice(-8).toUpperCase()}` : `#${id.toUpperCase()}`;
};

const VoucherDetailModal = ({ voucher, loading, usageHistory = [], onClose }) => {
  if (!voucher && !loading) return null;

  const status = resolveVoucherStatus(voucher);
  const usageLimit = Number(voucher?.usage_limit ?? voucher?.quantity ?? 0);
  const usageCount = Number(
    voucher?.usage_count ?? Math.max(usageLimit - Number(voucher?.quantity || 0), 0),
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Chi tiết mã giảm giá</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <HiOutlineX />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              <section className="voucher-detail-section">
                <div className="voucher-detail-heading">
                  <span>Thông tin cơ bản</span>
                  <span className={`status-badge ${status.className}`}>{status.label}</span>
                </div>
                <div className="voucher-detail-grid">
                  <DetailField label="Mã giảm giá" value={voucher.code} />
                  <DetailField label="Tên chương trình" value={voucher.name || voucher.code} />
                  <DetailField label="Loại giảm" value={discountTypeLabels[voucher.discount_type]} />
                  <DetailField label="Giá trị giảm" value={formatDiscountValue(voucher)} />
                  <DetailField label="Mô tả" value={voucher.description} />
                  <DetailField label="Trạng thái hiện tại" value={status.label} />
                </div>
              </section>

              <section className="voucher-detail-section">
                <div className="voucher-detail-heading">
                  <span>Điều kiện áp dụng</span>
                </div>
                <div className="voucher-detail-grid">
                  <DetailField label="Đơn hàng tối thiểu" value={formatCurrency(voucher.min_order)} />
                  <DetailField label="Giảm tối đa" value={voucher.max_discount_amount ? formatCurrency(voucher.max_discount_amount) : "Chưa cấu hình"} />
                  <DetailField label="Phạm vi áp dụng" value={scopeLabels[voucher.apply_scope] || "Toàn bộ đơn hàng"} />
                  <DetailField label="Điều kiện chi tiết" value={voucher.terms_and_conditions} />
                </div>
              </section>

              <section className="voucher-detail-section">
                <div className="voucher-detail-heading">
                  <span>Thời gian hiệu lực</span>
                </div>
                <div className="voucher-detail-grid">
                  <DetailField label="Bắt đầu" value={formatDateTime(voucher.start_date)} />
                  <DetailField label="Kết thúc" value={formatDateTime(voucher.end_date)} />
                </div>
              </section>

              <section className="voucher-detail-section">
                <div className="voucher-detail-heading">
                  <span>Giới hạn sử dụng</span>
                </div>
                <div className="voucher-detail-grid">
                  <DetailField label="Số lượt đã sử dụng" value={String(usageCount)} />
                  <DetailField label="Tổng lượt" value={usageLimit ? String(usageLimit) : "Không giới hạn"} />
                  <DetailField label="Lượt còn lại" value={String(Number(voucher.quantity || 0))} />
                  <DetailField label="Lượt mỗi khách" value={voucher.usage_limit_per_user ? String(voucher.usage_limit_per_user) : "Chưa cấu hình"} />
                </div>
              </section>

              <section className="voucher-detail-section">
                <div className="voucher-detail-heading">
                  <span>Đối tượng áp dụng</span>
                </div>
                <div className="voucher-detail-grid">
                  <DetailField label="Phim áp dụng" value={voucher.applicable_movie_ids?.length ? `${voucher.applicable_movie_ids.length} phim` : "Chưa cấu hình"} />
                  <DetailField label="Sản phẩm áp dụng" value={voucher.applicable_product_ids?.length ? `${voucher.applicable_product_ids.length} sản phẩm` : "Chưa cấu hình"} />
                  <DetailField label="Hạng thành viên" value={voucher.applicable_member_tiers?.length ? voucher.applicable_member_tiers.join(", ") : "Chưa cấu hình"} />
                </div>
              </section>

              <section className="voucher-detail-section">
                <div className="voucher-detail-heading">
                  <span>Thông tin hệ thống</span>
                </div>
                <div className="voucher-detail-grid">
                  <DetailField label="Người tạo" value={voucher.created_by?.full_name || voucher.created_by?.email || voucher.created_by} />
                  <DetailField label="Ngày tạo" value={formatDateTime(voucher.created_at)} />
                  <DetailField label="Ngày cập nhật" value={formatDateTime(voucher.updated_at)} />
                </div>
              </section>

              <section className="voucher-detail-section">
                <div className="voucher-detail-heading">
                  <span>Lịch sử sử dụng mã</span>
                </div>
                <div className="table-wrapper vouchers-table-wrapper">
                  <table className="data-table vouchers-table">
                    <thead>
                      <tr>
                        <th>Mã đơn hàng</th>
                        <th>Khách hàng</th>
                        <th>Mã giảm giá</th>
                        <th>Tổng trước giảm</th>
                        <th>Số tiền giảm</th>
                        <th>Tổng sau giảm</th>
                        <th>Thời gian dùng</th>
                        <th>Thanh toán</th>
                        <th>Đơn hàng</th>
                        <th>Lượt dùng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageHistory.length === 0 ? (
                        <tr>
                          <td colSpan="10">
                            <div className="table-empty">
                              <div className="table-empty-text">Mã này chưa có lịch sử sử dụng</div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        usageHistory.map((item) => (
                          <tr key={item.id}>
                            <td>{shortId(item.order_id)}</td>
                            <td>
                              <div className="table-cell-name">{item.customer?.full_name || "Khách hàng"}</div>
                              <div className="table-cell-desc">{item.customer?.email || "Chưa có email"}</div>
                            </td>
                            <td><span className="voucher-code">{item.code}</span></td>
                            <td>{formatCurrency(item.subtotal_price)}</td>
                            <td className="voucher-discount-value">-{formatCurrency(item.discount_amount)}</td>
                            <td>{formatCurrency(item.final_price)}</td>
                            <td>{formatDateTime(item.used_at)}</td>
                            <td>{paymentStatusLabels[item.payment_status] || item.payment_status || "-"}</td>
                            <td>{bookingStatusLabels[item.booking_status] || item.booking_status || "-"}</td>
                            <td>{usageStatusLabels[item.usage_status] || item.usage_status || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoucherDetailModal;
