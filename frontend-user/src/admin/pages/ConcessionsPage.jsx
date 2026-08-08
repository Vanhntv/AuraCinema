import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineShoppingBag,
  HiOutlineTrendingDown,
  HiOutlineTrendingUp,
} from "react-icons/hi";
import Toast from "../components/common/Toast";
import ConfirmDialog from "../components/common/ConfirmDialog";
import ConcessionContentModal from "../components/concessions/ConcessionContentModal";
import ConcessionModal from "../components/concessions/ConcessionModal";
import ConcessionPriceModal from "../components/concessions/ConcessionPriceModal";
import ConcessionStatusModal from "../components/concessions/ConcessionStatusModal";
import ConcessionTable from "../components/concessions/ConcessionTable";
import {
  createConcession,
  deleteConcession,
  getConcessions,
  updateConcessionContent,
  updateConcessionPrice,
  updateConcessionStatus,
} from "../services/concessionService";

const PAGE_SIZE = 10;

const ConcessionsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [priceTarget, setPriceTarget] = useState(null);
  const [contentTarget, setContentTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const activeCount = useMemo(
    () => items.filter((item) => item.status).length,
    [items],
  );
  const inactiveCount = useMemo(
    () => items.filter((item) => !item.status).length,
    [items],
  );

  const addToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const fetchConcessions = useCallback(
    async (page = 1, overrides = {}) => {
      try {
        setLoading(true);
        const params = {
          q: overrides.q ?? searchQuery.trim(),
          status: overrides.status ?? statusFilter,
          type: overrides.type ?? typeFilter,
          page,
          limit: PAGE_SIZE,
        };

        const response = await getConcessions(params);
        const payload = response.data || {};
        const list = Array.isArray(payload) ? payload : payload.data || [];
        const pagination = Array.isArray(payload)
          ? response.pagination
          : payload.pagination;

        setItems(list);
        setCurrentPage(pagination?.page || page);
        setTotalPages(pagination?.totalPages || 1);
        setTotalItems(pagination?.totalItems || list.length);
      } catch (error) {
        addToast(
          "error",
          error.response?.data?.message || "Không thể tải danh sách dịch vụ",
        );
      } finally {
        setLoading(false);
      }
    },
    [addToast, searchQuery, statusFilter, typeFilter],
  );

  useEffect(() => {
    fetchConcessions(1);
  }, [fetchConcessions]);

  const handleSearch = (event) => {
    const value = event.target.value;
    setSearchQuery(value);
    fetchConcessions(1, { q: value.trim() });
  };

  const handleStatusFilter = (event) => {
    const value = event.target.value;
    setStatusFilter(value);
    fetchConcessions(1, { status: value });
  };

  const handleTypeFilter = (event) => {
    const value = event.target.value;
    setTypeFilter(value);
    fetchConcessions(1, { type: value });
  };

  const handleCreate = async (formData, name) => {
    try {
      setSubmitting(true);
      await createConcession(formData);
      addToast("success", `Đã thêm dịch vụ "${name}"`);
      setIsModalOpen(false);
      fetchConcessions(1);
    } catch (error) {
      addToast(
        "error",
        error.response?.data?.message || "Không thể thêm dịch vụ bắp nước",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (item, nextStatus) => {
    try {
      setSubmitting(true);
      await updateConcessionStatus(item._id, nextStatus);
      addToast(
        "success",
        `Đã chuyển "${item.name}" sang ${nextStatus ? "đang bán" : "ngừng bán"}`,
      );
      setStatusTarget(null);
      fetchConcessions(currentPage);
    } catch (error) {
      addToast(
        "error",
        error.response?.data?.message || "Không thể cập nhật trạng thái dịch vụ",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePrice = async (item, price) => {
    try {
      setSubmitting(true);
      await updateConcessionPrice(item._id, price);
      addToast("success", `Đã cập nhật giá bán cho "${item.name}"`);
      setPriceTarget(null);
      fetchConcessions(currentPage);
    } catch (error) {
      addToast(
        "error",
        error.response?.data?.message || "Không thể cập nhật giá bán",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateContent = async (item, formData) => {
    try {
      setSubmitting(true);
      await updateConcessionContent(item._id, formData);
      addToast("success", `Đã cập nhật hình ảnh và mô tả cho "${item.name}"`);
      setContentTarget(null);
      fetchConcessions(currentPage);
    } catch (error) {
      addToast(
        "error",
        error.response?.data?.message || "Không thể cập nhật hình ảnh và mô tả",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setSubmitting(true);
      await deleteConcession(deleteTarget._id);
      addToast("success", `Đã xóa dịch vụ "${deleteTarget.name}"`);
      setDeleteTarget(null);
      const nextPage = items.length === 1 && currentPage > 1
        ? currentPage - 1
        : currentPage;
      fetchConcessions(nextPage);
    } catch (error) {
      addToast(
        "error",
        error.response?.data?.message || "Không thể xóa dịch vụ bắp nước",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-info">
          <h1>Quản lý Bắp Nước</h1>
          <p>Quản lý danh sách dịch vụ ăn uống đang kinh doanh tại AuraCinema</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <HiOutlinePlus />
            Thêm dịch vụ
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => fetchConcessions(currentPage)}
          >
            <HiOutlineRefresh />
            Làm mới
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon purple">
            <HiOutlineShoppingBag />
          </div>
          <div>
            <div className="stat-card-value">{totalItems}</div>
            <div className="stat-card-label">Tổng dịch vụ</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green">
            <HiOutlineTrendingUp />
          </div>
          <div>
            <div className="stat-card-value">{activeCount}</div>
            <div className="stat-card-label">Đang bán trong trang</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon orange">
            <HiOutlineTrendingDown />
          </div>
          <div>
            <div className="stat-card-value">{inactiveCount}</div>
            <div className="stat-card-label">Ngừng bán trong trang</div>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <span className="table-toolbar-title">Danh sách dịch vụ</span>
            <span className="table-toolbar-count">{totalItems} kết quả</span>
          </div>

          <div className="table-search">
            <HiOutlineSearch className="table-search-icon" />
            <input
              type="text"
              className="table-search-input"
              placeholder="Tìm theo tên dịch vụ..."
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
        </div>

        <div
          className="table-toolbar"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <div className="table-toolbar-left">
            <select
              className="user-filter-select"
              value={typeFilter}
              onChange={handleTypeFilter}
            >
              <option value="">Tất cả loại</option>
              <option value="popcorn">Bắp</option>
              <option value="drink">Nước</option>
              <option value="snack">Snack</option>
              <option value="combo">Combo</option>
            </select>
            <select
              className="user-filter-select"
              value={statusFilter}
              onChange={handleStatusFilter}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang bán</option>
              <option value="inactive">Ngừng bán</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            <ConcessionTable
              items={items}
              rowStart={(currentPage - 1) * PAGE_SIZE}
              onToggleStatus={setStatusTarget}
              onEditPrice={setPriceTarget}
              onEditContent={setContentTarget}
              onDelete={setDeleteTarget}
            />

            <div className="pagination">
              <button
                className="btn btn-secondary"
                onClick={() => fetchConcessions(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Trang trước
              </button>
              <span className="pagination-info">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                className="btn btn-secondary"
                onClick={() => fetchConcessions(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Trang sau
              </button>
            </div>
          </>
        )}
      </div>

      <ConcessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreate}
        isLoading={submitting}
      />

      <ConcessionPriceModal
        item={priceTarget}
        onClose={() => setPriceTarget(null)}
        onSubmit={handleUpdatePrice}
        isLoading={submitting}
      />

      <ConcessionContentModal
        item={contentTarget}
        onClose={() => setContentTarget(null)}
        onSubmit={handleUpdateContent}
        isLoading={submitting}
      />

      <ConcessionStatusModal
        item={statusTarget}
        onClose={() => setStatusTarget(null)}
        onSubmit={handleUpdateStatus}
        isLoading={submitting}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Xóa dịch vụ bắp nước"
        message={`Bạn có chắc chắn muốn xóa "${deleteTarget?.name || ""}"? Dịch vụ sẽ không còn xuất hiện trong danh sách bán, dữ liệu booking trước đây vẫn được giữ lại.`}
        confirmLabel={submitting ? "Đang xóa..." : "Xóa dịch vụ"}
        confirmClassName="btn-danger"
        isLoading={submitting}
        onConfirm={handleDelete}
        onCancel={() => !submitting && setDeleteTarget(null)}
      />

      <Toast toasts={toasts} onRemove={removeToast} />
    </>
  );
};

export default ConcessionsPage;
