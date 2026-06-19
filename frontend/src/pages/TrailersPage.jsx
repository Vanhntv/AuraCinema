import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlinePencil,
  HiOutlinePlay,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineVideoCamera,
  HiOutlineX,
} from "react-icons/hi";
import { getMovies } from "../services/movieService";
import {
  createTrailer,
  deleteTrailer,
  getTrailers,
  updateTrailer,
} from "../services/trailerService";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Toast from "../components/common/Toast";
import TrailerModal from "../components/common/TrailerModal";
import { isValidYoutubeUrl } from "../utils/youtube";

const emptyForm = {
  movie_id: "",
  title: "",
  youtube_url: "",
  thumbnail: "",
  status: true,
};

const getMovieTitle = (trailer) =>
  typeof trailer.movie_id === "object" ? trailer.movie_id?.title : "-";

const TrailerFormModal = ({
  isOpen,
  movies,
  initialData,
  isLoading,
  onSubmit,
  onClose,
}) => {
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const isEditing = !!initialData;

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setFormData({
        movie_id:
          typeof initialData.movie_id === "object"
            ? initialData.movie_id?._id || ""
            : initialData.movie_id || "",
        title: initialData.title || "",
        youtube_url: initialData.youtube_url || "",
        thumbnail: initialData.thumbnail || "",
        status: initialData.status ?? true,
      });
    } else {
      setFormData(emptyForm);
    }

    setErrors({});
  }, [isOpen, initialData]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.movie_id) nextErrors.movie_id = "Vui lòng chọn phim";
    if (!formData.title.trim()) nextErrors.title = "Tên trailer không được để trống";
    if (!formData.youtube_url.trim()) {
      nextErrors.youtube_url = "Link trailer không được để trống";
    } else if (!isValidYoutubeUrl(formData.youtube_url)) {
      nextErrors.youtube_url = "Trailer không hợp lệ";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    onSubmit({
      movie_id: formData.movie_id,
      title: formData.title.trim(),
      youtube_url: formData.youtube_url.trim(),
      thumbnail: formData.thumbnail.trim() || null,
      status: formData.status,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEditing ? "Chỉnh sửa trailer" : "Thêm trailer mới"}
          </h2>
          <button className="modal-close" type="button" onClick={onClose}>
            <HiOutlineX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group form-group-2">
                <label className="form-label">
                  Phim <span className="required">*</span>
                </label>
                <select
                  className={`form-input ${errors.movie_id ? "error" : ""}`}
                  value={formData.movie_id}
                  onChange={(event) => handleChange("movie_id", event.target.value)}
                >
                  <option value="">Chọn phim</option>
                  {movies.map((movie) => (
                    <option key={movie._id} value={movie._id}>
                      {movie.title}
                    </option>
                  ))}
                </select>
                {errors.movie_id && <p className="form-error">{errors.movie_id}</p>}
              </div>

              <div className="form-group form-group-1">
                <label className="form-label">Trạng thái</label>
                <label className="form-check trailer-status-check">
                  <input
                    type="checkbox"
                    checked={formData.status}
                    onChange={(event) => handleChange("status", event.target.checked)}
                  />
                  <span>Đang hiển thị</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Tên trailer <span className="required">*</span>
              </label>
              <input
                className={`form-input ${errors.title ? "error" : ""}`}
                value={formData.title}
                onChange={(event) => handleChange("title", event.target.value)}
                placeholder="Ví dụ: Trailer chính thức"
              />
              {errors.title && <p className="form-error">{errors.title}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Link YouTube <span className="required">*</span>
              </label>
              <input
                type="url"
                className={`form-input ${errors.youtube_url ? "error" : ""}`}
                value={formData.youtube_url}
                onChange={(event) => handleChange("youtube_url", event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {errors.youtube_url && (
                <p className="form-error">{errors.youtube_url}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Thumbnail</label>
              <input
                type="url"
                className="form-input"
                value={formData.thumbnail}
                onChange={(event) => handleChange("thumbnail", event.target.value)}
                placeholder="https://example.com/trailer-thumbnail.jpg"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" type="button" onClick={onClose}>
              Hủy bỏ
            </button>
            <button className="btn btn-primary" type="submit" disabled={isLoading}>
              {isLoading ? "Đang xử lý..." : isEditing ? "Cập nhật" : "Thêm mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TrailersPage = () => {
  const [trailers, setTrailers] = useState([]);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toasts, setToasts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrailer, setEditingTrailer] = useState(null);
  const [deletingTrailer, setDeletingTrailer] = useState(null);
  const [viewingTrailer, setViewingTrailer] = useState(null);

  const addToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const fetchTrailers = useCallback(
    async (query = "") => {
      try {
        setLoading(true);
        const response = await getTrailers({ q: query.trim() });
        setTrailers(response.data || []);
      } catch (error) {
        addToast("error", "Không thể tải danh sách trailer");
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [addToast]
  );

  const fetchMovies = useCallback(async () => {
    try {
      const response = await getMovies("", 1, 1000);
      setMovies(response.data || []);
    } catch (error) {
      addToast("error", "Không thể tải danh sách phim");
      console.error(error);
    }
  }, [addToast]);

  useEffect(() => {
    fetchTrailers("");
    fetchMovies();
  }, [fetchMovies, fetchTrailers]);

  const activeCount = useMemo(
    () => trailers.filter((trailer) => trailer.status).length,
    [trailers]
  );

  const handleSearch = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
    fetchTrailers(query);
  };

  const handleSubmit = async (formData) => {
    try {
      setSubmitting(true);

      if (editingTrailer) {
        await updateTrailer(editingTrailer._id, formData);
        addToast("success", `Đã cập nhật trailer "${formData.title}"`);
      } else {
        await createTrailer(formData);
        addToast("success", `Đã thêm trailer "${formData.title}"`);
      }

      setIsModalOpen(false);
      setEditingTrailer(null);
      fetchTrailers(searchQuery);
    } catch (error) {
      const message =
        error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại";
      addToast("error", message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTrailer) return;

    try {
      await deleteTrailer(deletingTrailer._id);
      addToast("success", `Đã xóa trailer "${deletingTrailer.title}"`);
      setDeletingTrailer(null);
      fetchTrailers(searchQuery);
    } catch (error) {
      addToast("error", "Không thể xóa trailer");
      console.error(error);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-info">
          <h1>Quản lý Trailer</h1>
          <p>Quản lý trailer YouTube cho từng phim trong hệ thống</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => fetchTrailers(searchQuery)}>
            <HiOutlineRefresh />
            Làm mới
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingTrailer(null);
              setIsModalOpen(true);
            }}
          >
            <HiOutlinePlus />
            Thêm trailer
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon blue">
            <HiOutlineVideoCamera />
          </div>
          <div>
            <div className="stat-card-value">{trailers.length}</div>
            <div className="stat-card-label">Tổng trailer</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green">
            <HiOutlinePlay />
          </div>
          <div>
            <div className="stat-card-value">{activeCount}</div>
            <div className="stat-card-label">Đang hiển thị</div>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <span className="table-toolbar-title">Danh sách trailer</span>
            <span className="table-toolbar-count">{trailers.length} kết quả</span>
          </div>
          <div className="table-search">
            <HiOutlineSearch className="table-search-icon" />
            <input
              className="table-search-input"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Tìm trailer..."
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "54px" }}>#</th>
                <th>Trailer</th>
                <th>Phim</th>
                <th>Link YouTube</th>
                <th style={{ width: "130px" }}>Trạng thái</th>
                <th style={{ width: "140px", textAlign: "center" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {trailers.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="table-empty">
                      <div className="table-empty-icon">▶</div>
                      <div className="table-empty-text">Chưa có trailer nào</div>
                      <div className="table-empty-sub">
                        Thêm trailer YouTube để người dùng xem trong popup
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                trailers.map((trailer, index) => (
                  <tr key={trailer._id}>
                    <td style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>
                      {index + 1}
                    </td>
                    <td className="table-cell-name">{trailer.title}</td>
                    <td>{getMovieTitle(trailer)}</td>
                    <td className="table-cell-desc">{trailer.youtube_url}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          trailer.status ? "status-now-showing" : "status-ended"
                        }`}
                      >
                        {trailer.status ? "Hiển thị" : "Tạm tắt"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions" style={{ justifyContent: "center" }}>
                        <button
                          className="btn btn-icon btn-ghost"
                          style={{ color: "var(--color-success)" }}
                          title="Xem trailer"
                          onClick={() => setViewingTrailer(trailer)}
                        >
                          <HiOutlinePlay />
                        </button>
                        <button
                          className="btn btn-icon btn-ghost"
                          style={{ color: "var(--color-info)" }}
                          title="Chỉnh sửa"
                          onClick={() => {
                            setEditingTrailer(trailer);
                            setIsModalOpen(true);
                          }}
                        >
                          <HiOutlinePencil />
                        </button>
                        <button
                          className="btn btn-icon btn-ghost"
                          style={{ color: "var(--color-danger)" }}
                          title="Xóa"
                          onClick={() => setDeletingTrailer(trailer)}
                        >
                          <HiOutlineTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <TrailerFormModal
        isOpen={isModalOpen}
        movies={movies}
        initialData={editingTrailer}
        isLoading={submitting}
        onSubmit={handleSubmit}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTrailer(null);
        }}
      />

      <ConfirmDialog
        isOpen={!!deletingTrailer}
        title="Xóa trailer"
        message={`Bạn có chắc chắn muốn xóa trailer "${deletingTrailer?.title}"?`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTrailer(null)}
      />

      <TrailerModal
        isOpen={!!viewingTrailer}
        title={viewingTrailer?.title}
        trailerUrl={viewingTrailer?.youtube_url}
        onClose={() => setViewingTrailer(null)}
      />

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default TrailersPage;
