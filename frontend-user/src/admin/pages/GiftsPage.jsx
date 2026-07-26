import { useCallback, useEffect, useState } from "react";
import {
  HiOutlineEye,
  HiOutlineGift,
  HiOutlinePause,
  HiOutlinePencil,
  HiOutlinePlay,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineTrash,
} from "react-icons/hi";
import Toast from "../components/common/Toast";
import { getGifts } from "../services/giftService";

const PAGE_SIZE = 10;

const typeLabels = {
  ticket: "Vé miễn phí",
  combo: "Combo bắp nước",
  voucher: "Voucher",
  point: "Điểm thưởng",
  physical: "Quà vật phẩm",
};

const statusClasses = {
  draft: "status-coming-soon",
  upcoming: "status-coming-soon",
  active: "status-now-showing",
  paused: "status-ended",
  out_of_stock: "status-ended",
  expired: "status-ended",
  cancelled: "status-ended",
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

const formatGiftValue = (gift) => {
  if (gift.type === "point") {
    return `${Number(gift.value || 0).toLocaleString("vi-VN")} điểm`;
  }

  if (gift.type === "ticket") {
    return Number(gift.value || 0) > 0 ? formatCurrency(gift.value) : "1 vé";
  }

  return formatCurrency(gift.value);
};

const getGiftImage = (gift) => {
  if (gift.image_url) return gift.image_url;
  return "";
};

const GiftsPage = () => {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const fetchGifts = useCallback(
    async (page = 1, overrides = {}) => {
      try {
        setLoading(true);
        const response = await getGifts({
          q: overrides.q ?? searchQuery.trim(),
          type: overrides.type ?? typeFilter,
          status: overrides.status ?? statusFilter,
          stock: overrides.stock ?? stockFilter,
          sort_by: overrides.sort_by ?? sortBy,
          sort_order: overrides.sort_order ?? sortOrder,
          page,
          limit: PAGE_SIZE,
        });

        setGifts(response.data || []);
        setCurrentPage(response.pagination?.page || page);
        setTotalPages(response.pagination?.totalPages || 1);
        setTotalItems(response.pagination?.totalItems || 0);
      } catch (error) {
        addToast("error", error.response?.data?.message || "Không thể tải danh sách quà tặng");
      } finally {
        setLoading(false);
      }
    },
    [addToast, searchQuery, sortBy, sortOrder, statusFilter, stockFilter, typeFilter],
  );

  useEffect(() => {
    fetchGifts(1);
  }, [fetchGifts]);

  const handleSearch = (event) => {
    const value = event.target.value;
    setSearchQuery(value);
    fetchGifts(1, { q: value.trim() });
  };

  const handleFilterChange = (setter, key) => (event) => {
    const value = event.target.value;
    setter(value);
    fetchGifts(1, { [key]: value });
  };

  const handleSortChange = (event) => {
    const [nextSortBy, nextSortOrder] = event.target.value.split(":");
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
    fetchGifts(1, { sort_by: nextSortBy, sort_order: nextSortOrder });
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-info">
          <h1>Quản lý Quà tặng</h1>
          <p>Theo dõi mã quà, số lượng, thời gian áp dụng và trạng thái phát quà.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => fetchGifts(currentPage)} disabled={loading}>
            <HiOutlineRefresh />
            Làm mới
          </button>
        </div>
      </div>

      <div className="content-card">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <span className="table-toolbar-title">Danh sách quà tặng</span>
            <span className="table-toolbar-count">{totalItems} kết quả</span>
          </div>
          <div className="search-box">
            <HiOutlineSearch className="search-icon" />
            <input
              type="text"
              placeholder="Tìm theo mã hoặc tên quà..."
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
        </div>

        <div className="table-toolbar" style={{ borderTop: "1px solid var(--color-border)" }}>
          <div className="table-toolbar-left voucher-filter-row">
            <select className="user-filter-select" value={typeFilter} onChange={handleFilterChange(setTypeFilter, "type")}>
              <option value="">Tất cả loại quà</option>
              <option value="ticket">Vé miễn phí</option>
              <option value="combo">Combo bắp nước</option>
              <option value="voucher">Voucher</option>
              <option value="point">Điểm thưởng</option>
              <option value="physical">Quà vật phẩm</option>
            </select>
            <select className="user-filter-select" value={statusFilter} onChange={handleFilterChange(setStatusFilter, "status")}>
              <option value="">Tất cả trạng thái</option>
              <option value="draft">Nháp</option>
              <option value="upcoming">Sắp diễn ra</option>
              <option value="active">Đang hoạt động</option>
              <option value="paused">Tạm dừng</option>
              <option value="out_of_stock">Hết quà</option>
              <option value="expired">Hết hạn</option>
              <option value="cancelled">Đã hủy</option>
            </select>
            <select className="user-filter-select" value={stockFilter} onChange={handleFilterChange(setStockFilter, "stock")}>
              <option value="">Tất cả tồn quà</option>
              <option value="available">Còn quà</option>
              <option value="out_of_stock">Hết quà</option>
            </select>
            <select className="user-filter-select voucher-sort-select" value={`${sortBy}:${sortOrder}`} onChange={handleSortChange}>
              <option value="created_at:desc">Mới tạo gần nhất</option>
              <option value="created_at:asc">Mới tạo cũ nhất</option>
              <option value="start_date:asc">Ngày bắt đầu gần nhất</option>
              <option value="end_date:asc">Ngày kết thúc gần nhất</option>
              <option value="issued_quantity:desc">Đã phát nhiều nhất</option>
              <option value="remaining_quantity:asc">Còn lại ít nhất</option>
              <option value="quantity:desc">Số lượng cao nhất</option>
              <option value="value:desc">Giá trị cao nhất</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            <div className="table-wrapper vouchers-table-wrapper">
              <table className="data-table vouchers-table gifts-table">
                <thead>
                  <tr>
                    <th style={{ width: "74px" }}>Hình ảnh</th>
                    <th style={{ width: "120px" }}>Mã quà</th>
                    <th>Tên quà</th>
                    <th style={{ width: "140px" }}>Loại quà</th>
                    <th style={{ width: "120px" }}>Giá trị</th>
                    <th style={{ width: "100px" }}>Số lượng</th>
                    <th style={{ width: "100px" }}>Đã phát</th>
                    <th style={{ width: "100px" }}>Còn lại</th>
                    <th style={{ width: "180px" }}>Thời gian áp dụng</th>
                    <th style={{ width: "140px" }}>Trạng thái</th>
                    <th style={{ width: "170px", textAlign: "center" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {gifts.length === 0 ? (
                    <tr>
                      <td colSpan="11">
                        <div className="table-empty">
                          <div className="table-empty-icon">%</div>
                          <div className="table-empty-text">Chưa có quà tặng phù hợp</div>
                          <div className="table-empty-sub">Thử thay đổi từ khóa, bộ lọc hoặc cách sắp xếp.</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    gifts.map((gift) => {
                      const imageUrl = getGiftImage(gift);
                      const statusClass = statusClasses[gift.computed_status] || "status-coming-soon";

                      return (
                        <tr key={gift._id}>
                          <td>
                            <div className="gift-thumb">
                              {imageUrl ? <img src={imageUrl} alt={gift.name} /> : <HiOutlineGift />}
                            </div>
                          </td>
                          <td><span className="voucher-code">{gift.code}</span></td>
                          <td>
                            <div className="table-cell-name">{gift.name}</div>
                            {gift.description && <div className="table-cell-desc">{gift.description}</div>}
                          </td>
                          <td>{gift.type_label || typeLabels[gift.type] || gift.type}</td>
                          <td className="voucher-discount-value">{formatGiftValue(gift)}</td>
                          <td>{Number(gift.quantity || 0).toLocaleString("vi-VN")}</td>
                          <td>{Number(gift.issued_quantity || 0).toLocaleString("vi-VN")}</td>
                          <td>
                            <strong className="text-usage">{Number(gift.remaining_quantity || 0).toLocaleString("vi-VN")}</strong>
                          </td>
                          <td className="table-cell-date">
                            {formatDate(gift.start_date)} - {formatDate(gift.end_date)}
                          </td>
                          <td>
                            <span className={`status-badge ${statusClass}`}>{gift.computed_status_label}</span>
                          </td>
                          <td>
                            <div className="table-actions" style={{ justifyContent: "center" }}>
                              <button className="btn btn-icon btn-ghost" title="Xem chi tiết" disabled>
                                <HiOutlineEye />
                              </button>
                              <button className="btn btn-icon btn-ghost" title="Chỉnh sửa" disabled>
                                <HiOutlinePencil />
                              </button>
                              <button className="btn btn-icon btn-ghost" title={gift.status === "active" ? "Tạm dừng" : "Kích hoạt"} disabled>
                                {gift.status === "active" ? <HiOutlinePause /> : <HiOutlinePlay />}
                              </button>
                              <button className="btn btn-icon btn-ghost btn-danger-text" title="Xóa" disabled>
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

            <div className="pagination">
              <button className="btn btn-secondary" onClick={() => fetchGifts(currentPage - 1)} disabled={currentPage === 1}>
                Trước
              </button>
              <span className="pagination-info">
                Trang {currentPage} / {totalPages}
              </span>
              <button className="btn btn-secondary" onClick={() => fetchGifts(currentPage + 1)} disabled={currentPage === totalPages}>
                Sau
              </button>
            </div>
          </>
        )}
      </div>

      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
};

export default GiftsPage;
