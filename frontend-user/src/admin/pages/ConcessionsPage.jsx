import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineShoppingBag,
  HiOutlineTrendingDown,
  HiOutlineTrendingUp,
} from "react-icons/hi";
import Toast from "../components/common/Toast";
import ConcessionTable from "../components/concessions/ConcessionTable";
import {
  getConcessions,
  updateConcessionStatus,
} from "../services/concessionService";

const PAGE_SIZE = 10;

const ConcessionsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [toasts, setToasts] = useState([]);

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
    [addToast, searchQuery, statusFilter],
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

  const handleToggleStatus = async (item) => {
    try {
      await updateConcessionStatus(item._id, !item.status);
      addToast(
        "success",
        `Đã chuyển "${item.name}" sang ${item.status ? "ngừng bán" : "đang bán"}`,
      );
      fetchConcessions(currentPage);
    } catch (error) {
      addToast(
        "error",
        error.response?.data?.message || "Không thể cập nhật trạng thái dịch vụ",
      );
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
              onToggleStatus={handleToggleStatus}
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

      <Toast toasts={toasts} onRemove={removeToast} />
    </>
  );
};

export default ConcessionsPage;
