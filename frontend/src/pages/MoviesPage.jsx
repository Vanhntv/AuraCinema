import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineFilm,
  HiOutlineRefresh,
} from "react-icons/hi";
import {
  getMovies,
  createMovie,
  updateMovie,
  deleteMovie,
} from "../services/movieService";
import MovieTable from "../components/movies/MovieTable";
import MovieModal from "../components/movies/MovieModal";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Toast from "../components/common/Toast";

const MoviesPage = () => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  const [toasts, setToasts] = useState([]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingMovie, setDeletingMovie] = useState(null);

  // Toast helpers
  const addToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch movies
  const fetchMovies = useCallback(
    async (page = 1, query = "") => {
      try {
        setLoading(true);
        const data = await getMovies(query, page, pageSize);
        setMovies(data.data || []);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(page);
      } catch (error) {
        addToast("error", "Không thể tải danh sách phim");
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [pageSize, addToast]
  );

  useEffect(() => {
    fetchMovies(1, "");
  }, [fetchMovies]);

  // Handle search
  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setCurrentPage(1);
    fetchMovies(1, query);
  };

  // Handle pagination
  const handlePrevPage = () => {
    if (currentPage > 1) {
      fetchMovies(currentPage - 1, searchQuery);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      fetchMovies(currentPage + 1, searchQuery);
    }
  };

  // Create / Update
  const handleSubmit = async (formData) => {
    try {
      setSubmitting(true);
      if (editingMovie) {
        await updateMovie(editingMovie._id, formData);
        addToast("success", `Đã cập nhật phim "${formData.title}"`);
      } else {
        await createMovie(formData);
        addToast("success", `Đã thêm phim "${formData.title}"`);
      }
      setIsModalOpen(false);
      setEditingMovie(null);
      fetchMovies(1, searchQuery);
      setTimeout(() => navigate("/movies"), 500);
    } catch (error) {
      const msg =
        error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại";
      addToast("error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Open edit modal
  const handleEdit = (movie) => {
    setEditingMovie(movie);
    setIsModalOpen(true);
  };

  // Open confirm delete
  const handleDeleteClick = (movie) => {
    setDeletingMovie(movie);
    setConfirmOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingMovie) return;
    try {
      await deleteMovie(deletingMovie._id);
      addToast("success", `Đã xóa phim "${deletingMovie.title}"`);
      setConfirmOpen(false);
      setDeletingMovie(null);
      fetchMovies(1, searchQuery);
      setTimeout(() => navigate("/movies"), 500);
    } catch (error) {
      const msg =
        error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại";
      addToast("error", msg);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <HiOutlineFilm style={{ marginRight: "12px" }} />
            Quản lý Phim
          </h1>
          <p className="page-subtitle">Quản lý danh sách phim trong hệ thống</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingMovie(null);
            setIsModalOpen(true);
          }}
        >
          <HiOutlinePlus />
          Thêm phim mới
        </button>
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <div className="search-input-wrapper">
          <HiOutlineSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Tìm kiếm phim theo tên..."
            value={searchQuery}
            onChange={handleSearch}
            id="input-search-movies"
          />
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => fetchMovies(currentPage, searchQuery)}
          title="Làm mới"
          id="btn-refresh-movies"
        >
          <HiOutlineRefresh />
        </button>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : (
          <>
            <MovieTable
              movies={movies}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-secondary"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  id="btn-prev-page"
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
                  id="btn-next-page"
                >
                  Trang sau
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      <MovieModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMovie(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingMovie}
        isLoading={submitting}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Xóa phim"
        message={`Bạn có chắc chắn muốn xóa phim "${deletingMovie?.title}" không? Hành động này không thể hoàn tác.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setDeletingMovie(null);
        }}
      />

      {/* Toasts */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default MoviesPage;
