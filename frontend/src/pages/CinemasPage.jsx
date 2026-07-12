import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineLocationMarker,
  HiOutlineOfficeBuilding,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSearch,
} from "react-icons/hi";
import {
  createCinema,
  deleteCinema,
  getCinemas,
  updateCinema,
} from "../services/cinemaService";
import CinemaModal from "../components/cinemas/CinemaModal";
import CinemaTable from "../components/cinemas/CinemaTable";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Toast from "../components/common/Toast";

const PAGE_SIZE = 10;

const CinemasPage = () => {
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [toasts, setToasts] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCinema, setEditingCinema] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingCinema, setDeletingCinema] = useState(null);

  const addToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const fetchCinemas = useCallback(
    async (query = "", city = "") => {
      try {
        setLoading(true);
        const response = await getCinemas({
          q: query.trim(),
          city: city.trim(),
        });
        setCinemas(response.data || []);
      } catch (error) {
        addToast("error", "Không thể tải danh sách rạp chiếu");
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [addToast]
  );

  useEffect(() => {
    fetchCinemas("", "");
  }, [fetchCinemas]);

  const cityCount = useMemo(() => {
    const cities = cinemas.map((cinema) => cinema.city).filter(Boolean);
    return new Set(cities).size;
  }, [cinemas]);

  const totalPages = Math.max(Math.ceil(cinemas.length / PAGE_SIZE), 1);
  const pagedCinemas = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return cinemas.slice(start, start + PAGE_SIZE);
  }, [cinemas, currentPage]);

  const handleSearchChange = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
    setCurrentPage(1);
    fetchCinemas(query, cityQuery);
  };

  const handleCityChange = (event) => {
    const city = event.target.value;
    setCityQuery(city);
    setCurrentPage(1);
    fetchCinemas(searchQuery, city);
  };

  const handleSubmit = async (formData) => {
    try {
      setSubmitting(true);

      if (editingCinema) {
        await updateCinema(editingCinema._id, formData);
        addToast("success", `Đã cập nhật rạp "${formData.name}"`);
      } else {
        await createCinema(formData);
        addToast("success", `Đã thêm rạp "${formData.name}"`);
      }

      setIsModalOpen(false);
      setEditingCinema(null);
      fetchCinemas(searchQuery, cityQuery);
    } catch (error) {
      const message =
        error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại";
      addToast("error", message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingCinema(null);
    setIsModalOpen(true);
  };

  const handleEdit = (cinema) => {
    setEditingCinema(cinema);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (cinema) => {
    setDeletingCinema(cinema);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCinema) return;

    try {
      await deleteCinema(deletingCinema._id);
      addToast("success", `Đã xóa rạp "${deletingCinema.name}"`);
      setConfirmOpen(false);
      setDeletingCinema(null);
      fetchCinemas(searchQuery, cityQuery);
    } catch (error) {
      addToast("error", "Không thể xóa rạp chiếu");
      console.error(error);
    }
  };

  const handlePrevPage = () => {
    setCurrentPage((page) => Math.max(page - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((page) => Math.min(page + 1, totalPages));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-info">
          <h1>Quản lý Rạp chiếu</h1>
          <p>Quản lý danh sách rạp, địa chỉ và thông tin liên hệ</p>
        </div>

        <div className="page-actions">
          <button
            className="btn btn-secondary"
            onClick={() => fetchCinemas(searchQuery, cityQuery)}
            id="btn-refresh-cinemas"
          >
            <HiOutlineRefresh />
            Làm mới
          </button>
          <button className="btn btn-primary" onClick={handleOpenCreate} id="btn-add-cinema">
            <HiOutlinePlus />
            Thêm rạp
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon blue">
            <HiOutlineOfficeBuilding />
          </div>
          <div>
            <div className="stat-card-value">{cinemas.length}</div>
            <div className="stat-card-label">Tổng rạp chiếu</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green">
            <HiOutlineLocationMarker />
          </div>
          <div>
            <div className="stat-card-value">{cityCount}</div>
            <div className="stat-card-label">Thành phố</div>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <span className="table-toolbar-title">Danh sách rạp chiếu</span>
            <span className="table-toolbar-count">{cinemas.length} kết quả</span>
          </div>

          <div className="cinema-filters">
            <div className="table-search">
              <HiOutlineSearch className="table-search-icon" />
              <input
                type="text"
                className="table-search-input"
                placeholder="Tìm tên hoặc địa chỉ..."
                value={searchQuery}
                onChange={handleSearchChange}
                id="search-cinemas"
              />
            </div>
            <div className="table-search">
              <HiOutlineLocationMarker className="table-search-icon" />
              <input
                type="text"
                className="table-search-input cinema-city-input"
                placeholder="Lọc thành phố..."
                value={cityQuery}
                onChange={handleCityChange}
                id="filter-cinema-city"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            <CinemaTable
              cinemas={pagedCinemas}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              rowStart={(currentPage - 1) * PAGE_SIZE}
            />

            <div className="pagination">
              <button
                className="btn btn-secondary"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                id="btn-prev-cinema-page"
              >
                Trang trước
              </button>
              <span className="pagination-info">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                className="btn btn-secondary"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                id="btn-next-cinema-page"
              >
                Trang sau
              </button>
            </div>
          </>
        )}
      </div>

      <CinemaModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCinema(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingCinema}
        isLoading={submitting}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Xóa rạp chiếu"
        message={`Bạn có chắc chắn muốn xóa rạp "${deletingCinema?.name}"? Hành động này không thể hoàn tác.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setDeletingCinema(null);
        }}
      />

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default CinemasPage;
