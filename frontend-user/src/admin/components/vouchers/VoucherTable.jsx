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

const VoucherTable = ({ vouchers, onView, onEdit, onToggleStatus, onDelete }) => (
  <div className="table-wrapper vouchers-table-wrapper">
    <table className="data-table vouchers-table voucher-management-table">
      <thead>
        <tr>
          <th>Chương trình</th>
          <th>Ưu đãi</th>
          <th>Điều kiện</th>
          <th>Hiệu lực</th>
          <th>Lượt dùng</th>
          <th>Trạng thái</th>
          <th className="voucher-actions-heading">Thao tác</th>
        </tr>
      </thead>
      <tbody>
        {vouchers.length === 0 ? (
          <tr>
            <td colSpan="7">
              <div className="table-empty">
                <div className="table-empty-icon">%</div>
                <div className="table-empty-text">Chưa có mã giảm giá phù hợp</div>
                <div className="table-empty-sub">Thử thay đổi từ khóa, bộ lọc hoặc cách sắp xếp.</div>
              </div>
            </td>
          </tr>
        ) : (
          vouchers.map((voucher) => {
            const status = resolveVoucherStatus(voucher);
            const usageLimit = Number(voucher.usage_limit ?? voucher.quantity ?? 0);
            const usageCount = Number(
              voucher.usage_count ?? Math.max(usageLimit - Number(voucher.quantity || 0), 0),
            );
            const isCancelled = voucher.computed_status === "cancelled" || Boolean(voucher.deleted_at);

            return (
              <tr key={voucher._id}>
                <td data-label="Chương trình">
                  <span className="voucher-code">{voucher.code}</span>
                  <div className="table-cell-name">{voucher.name || voucher.code}</div>
                </td>
                <td data-label="Ưu đãi">
                  <strong className="voucher-discount-value">{formatDiscountValue(voucher)}</strong>
                  <span className="voucher-cell-sub">{discountTypeLabels[voucher.discount_type] || voucher.discount_type}</span>
                  {voucher.discount_type === "percent" && Number(voucher.max_discount_amount || 0) > 0 && (
                    <span className="voucher-cell-sub">Tối đa {formatCurrency(voucher.max_discount_amount)}</span>
                  )}
                </td>
                <td data-label="Điều kiện">
                  <strong className="voucher-cell-main">{scopeLabels[voucher.apply_scope] || "Toàn đơn"}</strong>
                  <span className="voucher-cell-sub">
                    {Number(voucher.min_order || 0) > 0
                      ? `Đơn từ ${formatCurrency(voucher.min_order)}`
                      : "Không yêu cầu đơn tối thiểu"}
                  </span>
                </td>
                <td className="table-cell-date" data-label="Hiệu lực">
                  <span>{formatDate(voucher.start_date)}</span>
                  <span className="voucher-date-separator">→</span>
                  <span>{formatDate(voucher.end_date)}</span>
                </td>
                <td data-label="Lượt dùng">
                  <strong className="text-usage">{usageCount}</strong>
                  <span className="text-muted-inline"> / {usageLimit || "∞"}</span>
                </td>
                <td data-label="Trạng thái">
                  <span className={`status-badge ${status.className}`}>{status.label}</span>
                </td>
                <td className="voucher-actions-cell" data-label="Thao tác">
                  <div className="table-actions voucher-table-actions">
                    <button
                      className="btn btn-icon btn-ghost"
                      aria-label={`Xem chi tiết ${voucher.code}`}
                      title="Xem chi tiết"
                      onClick={() => onView(voucher)}
                      disabled={isCancelled}
                      type="button"
                    >
                      <HiOutlineEye />
                    </button>
                    <button
                      className="btn btn-icon btn-ghost"
                      aria-label={`Chỉnh sửa ${voucher.code}`}
                      title="Chỉnh sửa"
                      onClick={() => onEdit(voucher)}
                      disabled={isCancelled}
                      type="button"
                    >
                      <HiOutlinePencil />
                    </button>
                    <button
                      className="btn btn-icon btn-ghost"
                      aria-label={`${voucher.status ? "Tạm dừng" : "Kích hoạt"} ${voucher.code}`}
                      title={voucher.status ? "Tạm dừng mã" : "Kích hoạt mã"}
                      onClick={() => onToggleStatus(voucher)}
                      disabled={isCancelled}
                      type="button"
                    >
                      {voucher.status ? <HiOutlinePause /> : <HiOutlinePlay />}
                    </button>
                    <button
                      className="btn btn-icon btn-ghost btn-danger-text"
                      aria-label={`${usageCount > 0 ? "Hủy" : "Xóa"} ${voucher.code}`}
                      title={usageCount > 0 ? "Hủy mã và giữ lịch sử" : "Xóa mã"}
                      onClick={() => onDelete(voucher)}
                      disabled={isCancelled}
                      type="button"
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
