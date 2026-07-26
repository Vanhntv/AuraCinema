import { useCallback, useEffect, useState } from "react";
import {
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineTag,
  HiOutlineTicket,
  HiOutlineTrendingUp,
} from "react-icons/hi";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Toast from "../components/common/Toast";
import VoucherDetailModal from "../components/vouchers/VoucherDetailModal";
import VoucherModal from "../components/vouchers/VoucherModal";
import VoucherTable from "../components/vouchers/VoucherTable";
import { createVoucher, deleteVoucher, getVoucherById, getVouchers, getVoucherStats, getVoucherUsageHistory, toggleVoucherStatus, updateVoucher } from "../services/voucherService";

const PAGE_SIZE = 10;

const emptyStats = {
  active_voucher_count: 0,
  total_usage: 0,
  total_discount_amount: 0,
  revenue_from_voucher_orders: 0,
  usage_rate: 0,
  most_used_voucher: null,
  expiring_soon: [],
  low_remaining: [],
  revenue_by_voucher: [],
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatPercent = (value) => `${Math.round(Number(value || 0) * 100)}%`;

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

const VouchersPage = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [discountTypeFilter, setDiscountTypeFilter] = useState("");
  const [scopeFilter, setScopeFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [detailVoucher, setDetailVoucher] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailUsageHistory, setDetailUsageHistory] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editVoucher, setEditVoucher] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [stats, setStats] = useState(emptyStats);
  const [statsLoading, setStatsLoading] = useState(true);

  const addToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const fetchVouchers = useCallback(
    async (page = 1, overrides = {}) => {
      try {
        setLoading(true);
        const response = await getVouchers({
          q: overrides.q ?? searchQuery.trim(),
          status: overrides.status ?? statusFilter,
          discount_type: overrides.discount_type ?? discountTypeFilter,
          apply_scope: overrides.apply_scope ?? scopeFilter,
          sort_by: overrides.sort_by ?? sortBy,
          sort_order: overrides.sort_order ?? sortOrder,
          page,
          limit: PAGE_SIZE,
        });

        setVouchers(response.data || []);
        setCurrentPage(response.pagination?.page || page);
        setTotalPages(response.pagination?.totalPages || 1);
        setTotalItems(response.pagination?.totalItems || 0);
      } catch (error) {
        addToast("error", error.response?.data?.message || "Không thể tải danh sách mã giảm giá");
      } finally {
        setLoading(false);
      }
    },
    [addToast, discountTypeFilter, scopeFilter, searchQuery, sortBy, sortOrder, statusFilter],
  );

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await getVoucherStats();
      setStats(response.data || emptyStats);
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể tải thống kê mã giảm giá");
    } finally {
      setStatsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchVouchers(1);
    fetchStats();
  }, [fetchStats, fetchVouchers]);

  const handleSearch = (event) => {
    const value = event.target.value;
    setSearchQuery(value);
    fetchVouchers(1, { q: value.trim() });
  };

  const handleFilterChange = (setter, key) => (event) => {
    const value = event.target.value;
    setter(value);
    fetchVouchers(1, { [key]: value });
  };

  const handleSortChange = (event) => {
    const [nextSortBy, nextSortOrder] = event.target.value.split(":");
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
    fetchVouchers(1, { sort_by: nextSortBy, sort_order: nextSortOrder });
  };

  const handleViewDetail = async (voucher) => {
    try {
      setDetailVoucher(voucher);
      setDetailLoading(true);
      setDetailUsageHistory([]);
      const [detailResponse, usageResponse] = await Promise.all([
        getVoucherById(voucher._id),
        getVoucherUsageHistory(voucher._id, { limit: 20 }),
      ]);
      setDetailVoucher(detailResponse.data);
      setDetailUsageHistory(usageResponse.data || []);
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể tải chi tiết mã giảm giá");
      setDetailVoucher(null);
      setDetailUsageHistory([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEditVoucher = async (voucher) => {
    try {
      setDetailLoading(true);
      const response = await getVoucherById(voucher._id);
      setEditVoucher(response.data);
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể tải mã giảm giá để chỉnh sửa");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateVoucher = async (payload) => {
    try {
      setSubmitting(true);
      await createVoucher(payload);
      addToast("success", `Đã tạo mã giảm giá "${payload.code}"`);
      setIsCreateModalOpen(false);
      fetchVouchers(1);
      fetchStats();
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể tạo mã giảm giá");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateVoucher = async (payload) => {
    if (!editVoucher?._id) return;

    try {
      setSubmitting(true);
      await updateVoucher(editVoucher._id, payload);
      addToast("success", `Đã cập nhật mã giảm giá "${editVoucher.code}"`);
      setEditVoucher(null);
      fetchVouchers(currentPage);
      fetchStats();
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể cập nhật mã giảm giá");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!statusTarget?._id) return;

    try {
      setSubmitting(true);
      await toggleVoucherStatus(statusTarget._id);
      addToast(
        "success",
        `Đã ${statusTarget.status ? "tạm dừng" : "kích hoạt"} mã "${statusTarget.code}"`
      );
      setStatusTarget(null);
      fetchVouchers(currentPage);
      fetchStats();
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể cập nhật trạng thái mã giảm giá");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?._id) return;

    try {
      setSubmitting(true);
      const response = await deleteVoucher(deleteTarget._id);
      addToast("success", response.message || `Đã xóa mã "${deleteTarget.code}"`);
      setDeleteTarget(null);
      fetchVouchers(currentPage);
      fetchStats();
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể xóa mã giảm giá");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-info">
          <h1>Quản lý Mã giảm giá</h1>
          <p>Theo dõi danh sách chương trình ưu đãi, trạng thái và lượt sử dụng.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            <HiOutlinePlus />
            Thêm mã
          </button>
          <button className="btn btn-secondary" onClick={() => {
            fetchVouchers(currentPage);
            fetchStats();
          }}>
            <HiOutlineRefresh />
            Làm mới
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon purple">
            <HiOutlineTag />
          </div>
          <div>
            <div className="stat-card-value">{totalItems}</div>
            <div className="stat-card-label">Tổng mã giảm giá</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green">
            <HiOutlineTicket />
          </div>
          <div>
            <div className="stat-card-value">{statsLoading ? "..." : stats.active_voucher_count}</div>
            <div className="stat-card-label">Mã đang hoạt động</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon orange">
            <HiOutlineTrendingUp />
          </div>
          <div>
            <div className="stat-card-value">{statsLoading ? "..." : Number(stats.total_usage || 0).toLocaleString("vi-VN")}</div>
            <div className="stat-card-label">Tổng lượt sử dụng</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon blue">
            <HiOutlineTag />
          </div>
          <div>
            <div className="stat-card-value">{statsLoading ? "..." : formatCurrency(stats.total_discount_amount)}</div>
            <div className="stat-card-label">Tổng tiền đã giảm</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green">
            <HiOutlineTrendingUp />
          </div>
          <div>
            <div className="stat-card-value">{statsLoading ? "..." : formatCurrency(stats.revenue_from_voucher_orders)}</div>
            <div className="stat-card-label">Doanh thu đơn có mã</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon purple">
            <HiOutlineTicket />
          </div>
          <div>
            <div className="stat-card-value">{statsLoading ? "..." : stats.most_used_voucher?.code || "-"}</div>
            <div className="stat-card-label">Mã dùng nhiều nhất</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon orange">
            <HiOutlineRefresh />
          </div>
          <div>
            <div className="stat-card-value">{statsLoading ? "..." : Number(stats.low_remaining?.length || 0)}</div>
            <div className="stat-card-label">Mã sắp hết lượt</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon blue">
            <HiOutlineTrendingUp />
          </div>
          <div>
            <div className="stat-card-value">{statsLoading ? "..." : formatPercent(stats.usage_rate)}</div>
            <div className="stat-card-label">Tỷ lệ sử dụng mã</div>
          </div>
        </div>
      </div>

      <div className="voucher-analytics-grid">
        <div className="table-container">
          <div className="table-toolbar">
            <div className="table-toolbar-left">
              <span className="table-toolbar-title">Mã sắp hết hạn</span>
              <span className="table-toolbar-count">7 ngày tới</span>
            </div>
          </div>
          <div className="voucher-mini-list">
            {(stats.expiring_soon || []).length === 0 ? (
              <div className="voucher-mini-empty">Không có mã sắp hết hạn</div>
            ) : (
              stats.expiring_soon.map((item) => (
                <div className="voucher-mini-row" key={item.id}>
                  <span className="voucher-code">{item.code}</span>
                  <strong>{formatDate(item.end_date)}</strong>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="table-container">
          <div className="table-toolbar">
            <div className="table-toolbar-left">
              <span className="table-toolbar-title">Mã sắp hết lượt</span>
              <span className="table-toolbar-count">Còn ít lượt</span>
            </div>
          </div>
          <div className="voucher-mini-list">
            {(stats.low_remaining || []).length === 0 ? (
              <div className="voucher-mini-empty">Không có mã sắp hết lượt</div>
            ) : (
              stats.low_remaining.map((item) => (
                <div className="voucher-mini-row" key={item.id}>
                  <span className="voucher-code">{item.code}</span>
                  <strong>{Number(item.remaining_quantity || 0)} lượt</strong>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <span className="table-toolbar-title">Doanh thu theo từng mã</span>
            <span className="table-toolbar-count">{Number(stats.revenue_by_voucher?.length || 0)} mã có sử dụng</span>
          </div>
        </div>
        <div className="table-wrapper vouchers-table-wrapper">
          <table className="data-table vouchers-table">
            <thead>
              <tr>
                <th>Mã giảm giá</th>
                <th>Tên chương trình</th>
                <th>Lượt dùng</th>
                <th>Tổng tiền đã giảm</th>
                <th>Doanh thu sau giảm</th>
              </tr>
            </thead>
            <tbody>
              {(stats.revenue_by_voucher || []).length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="table-empty">
                      <div className="table-empty-text">Chưa có doanh thu từ mã giảm giá</div>
                    </div>
                  </td>
                </tr>
              ) : (
                stats.revenue_by_voucher.map((item) => (
                  <tr key={item.voucher_id || item.code}>
                    <td><span className="voucher-code">{item.code}</span></td>
                    <td>{item.name || item.code}</td>
                    <td>{Number(item.usage_count || 0).toLocaleString("vi-VN")}</td>
                    <td className="voucher-discount-value">-{formatCurrency(item.total_discount_amount)}</td>
                    <td>{formatCurrency(item.total_revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <span className="table-toolbar-title">Danh sách mã giảm giá</span>
            <span className="table-toolbar-count">{totalItems} kết quả</span>
          </div>
          <div className="table-search">
            <HiOutlineSearch className="table-search-icon" />
            <input
              type="text"
              className="table-search-input"
              placeholder="Tìm mã hoặc tên chương trình..."
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
        </div>

        <div className="table-toolbar" style={{ borderTop: "1px solid var(--color-border)" }}>
          <div className="table-toolbar-left voucher-filter-row">
            <select className="user-filter-select" value={statusFilter} onChange={handleFilterChange(setStatusFilter, "status")}>
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="paused">Tạm dừng</option>
              <option value="upcoming">Sắp diễn ra</option>
              <option value="expired">Hết hạn</option>
              <option value="out_of_usage">Đã hết lượt</option>
              <option value="cancelled">Đã hủy</option>
            </select>
            <select className="user-filter-select" value={discountTypeFilter} onChange={handleFilterChange(setDiscountTypeFilter, "discount_type")}>
              <option value="">Tất cả loại giảm</option>
              <option value="percent">Phần trăm</option>
              <option value="fixed">Số tiền cố định</option>
            </select>
            <select className="user-filter-select" value={scopeFilter} onChange={handleFilterChange(setScopeFilter, "apply_scope")}>
              <option value="">Tất cả phạm vi</option>
              <option value="order">Toàn đơn</option>
              <option value="ticket">Vé xem phim</option>
              <option value="concession">Bắp nước</option>
              <option value="movie">Phim</option>
              <option value="member">Thành viên</option>
            </select>
            <select className="user-filter-select voucher-sort-select" value={`${sortBy}:${sortOrder}`} onChange={handleSortChange}>
              <option value="created_at:desc">Ngày tạo mới nhất</option>
              <option value="created_at:asc">Ngày tạo cũ nhất</option>
              <option value="end_date:asc">Sắp hết hạn</option>
              <option value="end_date:desc">Hết hạn xa nhất</option>
              <option value="usage_count:desc">Lượt dùng cao nhất</option>
              <option value="usage_count:asc">Lượt dùng thấp nhất</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            <VoucherTable
              vouchers={vouchers}
              rowStart={(currentPage - 1) * PAGE_SIZE}
              onView={handleViewDetail}
              onEdit={handleEditVoucher}
              onToggleStatus={setStatusTarget}
              onDelete={setDeleteTarget}
            />
            <div className="pagination">
              <button className="btn btn-secondary" onClick={() => fetchVouchers(currentPage - 1)} disabled={currentPage === 1}>
                Trang trước
              </button>
              <span className="pagination-info">
                Trang {currentPage} / {totalPages}
              </span>
              <button className="btn btn-secondary" onClick={() => fetchVouchers(currentPage + 1)} disabled={currentPage === totalPages}>
                Trang sau
              </button>
            </div>
          </>
        )}
      </div>

      <VoucherDetailModal
        voucher={detailVoucher}
        loading={detailLoading}
        usageHistory={detailUsageHistory}
        onClose={() => {
          setDetailVoucher(null);
          setDetailUsageHistory([]);
        }}
      />

      <VoucherModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateVoucher}
        isLoading={submitting}
      />

      <VoucherModal
        isOpen={Boolean(editVoucher)}
        onClose={() => setEditVoucher(null)}
        onSubmit={handleUpdateVoucher}
        isLoading={submitting}
        initialData={editVoucher}
      />

      <ConfirmDialog
        isOpen={Boolean(statusTarget)}
        title={statusTarget?.status ? "Tạm dừng mã giảm giá" : "Kích hoạt mã giảm giá"}
        message={
          statusTarget?.status
            ? `Bạn có chắc chắn muốn tạm dừng mã "${statusTarget?.code}"? Khách hàng sẽ không thể dùng mã này cho đơn mới, các đơn đã áp dụng mã không bị ảnh hưởng.`
            : `Bạn có chắc chắn muốn kích hoạt lại mã "${statusTarget?.code}"? Khách hàng có thể dùng mã nếu mã còn hạn và còn lượt.`
        }
        confirmLabel={statusTarget?.status ? "Tạm dừng mã" : "Kích hoạt mã"}
        confirmClassName={statusTarget?.status ? "btn-danger" : "btn-primary"}
        onConfirm={handleConfirmToggleStatus}
        onCancel={() => setStatusTarget(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title={
          Number(deleteTarget?.usage_count || 0) > 0
            ? "Hủy mã giảm giá"
            : "Xóa mã giảm giá"
        }
        message={
          Number(deleteTarget?.usage_count || 0) > 0
            ? `Mã "${deleteTarget?.code}" đã phát sinh giao dịch nên hệ thống sẽ chuyển sang trạng thái Đã hủy để giữ lịch sử đơn hàng và báo cáo. Bạn có chắc chắn muốn tiếp tục?`
            : `Mã "${deleteTarget?.code}" chưa phát sinh giao dịch. Bạn có chắc chắn muốn xóa mã này khỏi hệ thống?`
        }
        confirmLabel={
          Number(deleteTarget?.usage_count || 0) > 0 ? "Chuyển Đã hủy" : "Xóa mã"
        }
        confirmClassName="btn-danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Toast toasts={toasts} onRemove={removeToast} />
    </>
  );
};

export default VouchersPage;
