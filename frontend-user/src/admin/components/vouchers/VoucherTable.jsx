import { HiOutlineEye, HiOutlinePause, HiOutlinePencil, HiOutlinePlay, HiOutlineTrash } from "react-icons/hi";

const discountTypeLabels = {
  percent: "Phần trăm",
  fixed: "Số tiền",
};

const scopeLabels = {
  order: "Toàn đơn",
  ticket: "Vé xem phim",
  concession: "Bắp nước",
  movie: "Phim",
  member: "Thành viên",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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
  if (!voucher.status) return { label: "Tạm dừng", className: "status-ended" };

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

const formatDiscountValue = (voucher) => {
  if (voucher.discount_type === "percent") {
    return `${Number(voucher.discount_value || 0)}%`;
  }

  return formatCurrency(voucher.discount_value);
};

const VoucherTable = ({ vouchers, rowStart = 0, onView, onEdit, onToggleStatus, onDelete }) => (
  <div className="table-wrapper vouchers-table-wrapper">
    <table className="data-table vouchers-table">
      <thead>
        <tr>
          <th style={{ width: "58px" }}>#</th>
          <th style={{ width: "130px" }}>Mã giảm giá</th>
          <th>Tên chương trình</th>
          <th style={{ width: "120px" }}>Loại giảm</th>
          <th style={{ width: "130px" }}>Giá trị giảm</th>
          <th style={{ width: "190px" }}>Thời gian áp dụng</th>
          <th style={{ width: "140px" }}>Lượt dùng</th>
          <th style={{ width: "130px" }}>Phạm vi</th>
          <th style={{ width: "150px" }}>Trạng thái</th>
          <th style={{ width: "190px", textAlign: "center" }}>Thao tác</th>
        </tr>
      </thead>
      <tbody>
        {vouchers.length === 0 ? (
          <tr>
            <td colSpan="10">
              <div className="table-empty">
                <div className="table-empty-icon">%</div>
                <div className="table-empty-text">Chưa có mã giảm giá phù hợp</div>
                <div className="table-empty-sub">Thử thay đổi từ khóa, bộ lọc hoặc cách sắp xếp.</div>
              </div>
            </td>
          </tr>
        ) : (
          vouchers.map((voucher, index) => {
            const status = resolveVoucherStatus(voucher);
            const usageLimit = Number(voucher.usage_limit ?? voucher.quantity ?? 0);
            const usageCount = Number(
              voucher.usage_count ?? Math.max(usageLimit - Number(voucher.quantity || 0), 0),
            );
            const isCancelled = voucher.computed_status === "cancelled" || Boolean(voucher.deleted_at);

            return (
              <tr key={voucher._id}>
                <td style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>
                  {rowStart + index + 1}
                </td>
                <td>
                  <span className="voucher-code">{voucher.code}</span>
                </td>
                <td>
                  <div className="table-cell-name">{voucher.name || voucher.code}</div>
                  {Number(voucher.min_order || 0) > 0 && (
                    <div className="table-cell-desc">Đơn tối thiểu {formatCurrency(voucher.min_order)}</div>
                  )}
                </td>
                <td>{discountTypeLabels[voucher.discount_type] || voucher.discount_type}</td>
                <td className="voucher-discount-value">{formatDiscountValue(voucher)}</td>
                <td className="table-cell-date">
                  {formatDate(voucher.start_date)} - {formatDate(voucher.end_date)}
                </td>
                <td>
                  <strong className="text-usage">{usageCount}</strong>
                  <span className="text-muted-inline"> / {usageLimit || "∞"}</span>
                </td>
                <td>{scopeLabels[voucher.apply_scope] || "Toàn đơn"}</td>
                <td>
                  <span className={`status-badge ${status.className}`}>{status.label}</span>
                </td>
                <td>
                  <div className="table-actions" style={{ justifyContent: "center" }}>
                    <button
                      className="btn btn-icon btn-ghost"
                      title="Xem chi tiết"
                      onClick={() => onView(voucher)}
                      disabled={isCancelled}
                    >
                      <HiOutlineEye />
                    </button>
                    <button
                      className="btn btn-icon btn-ghost"
                      title="Chỉnh sửa"
                      onClick={() => onEdit(voucher)}
                      disabled={isCancelled}
                    >
                      <HiOutlinePencil />
                    </button>
                    <button
                      className="btn btn-icon btn-ghost"
                      title={voucher.status ? "Tạm dừng mã" : "Kích hoạt mã"}
                      onClick={() => onToggleStatus(voucher)}
                      disabled={isCancelled}
                    >
                      {voucher.status ? <HiOutlinePause /> : <HiOutlinePlay />}
                    </button>
                    <button
                      className="btn btn-icon btn-ghost btn-danger-text"
                      title={usageCount > 0 ? "Hủy mã và giữ lịch sử" : "Xóa mã"}
                      onClick={() => onDelete(voucher)}
                      disabled={isCancelled}
                    >
                      <HiOutlineTrash />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>
);

export default VoucherTable;
