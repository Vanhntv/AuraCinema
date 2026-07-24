import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineFilm,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSave,
  HiOutlineSearch,
} from "react-icons/hi";
import {
  createMovie,
  deleteMovie,
  getMovies,
  updateMovie,
} from "../services/movieService";
import ConfirmDialog from "../components/common/ConfirmDialog";
import MovieModal from "../components/movies/MovieModal";
import MovieTable from "../components/movies/MovieTable";
import Toast from "../components/common/Toast";
import TrailerModal from "../components/common/TrailerModal";
import {
  getHomeBannerSettings,
  updateHomeBannerSettings,
} from "../services/settingsService";

const defaultBannerSettings = {
  selected_banner_urls: [],
  slide_interval_seconds: 5,
};

const normalizeMovieBanners = (movie) => {
  const banners = Array.isArray(movie?.banners) ? movie.banners : [];
  const urls = banners
    .concat(movie?.banner ? [movie.banner] : [])
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  return Array.from(new Set(urls));
};

const MoviesPage = () => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [bannerCatalogMovies, setBannerCatalogMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [apiErrors, setApiErrors] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  const [toasts, setToasts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingMovie, setDeletingMovie] = useState(null);
  const [trailerMovie, setTrailerMovie] = useState(null);
  const [bannerSettings, setBannerSettings] = useState(defaultBannerSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);

  const bannerOptions = useMemo(
    () =>
      bannerCatalogMovies.flatMap((movie) =>
        normalizeMovieBanners(movie).map((url, index) => ({
          key: `${movie._id || movie.id}-${index}-${url}`,
          movieTitle: movie.title || "Phim",
          url,
        })),
      ),
    [bannerCatalogMovies],
  );
  const selectedBannerCount = bannerSettings.selected_banner_urls.length;

  const addToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

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
    [addToast, pageSize],
  );

  const fetchBannerSettings = useCallback(async () => {
    try {
      setSettingsLoading(true);
      const [response, movieResponse] = await Promise.all([
        getHomeBannerSettings(),
        getMovies("", 1, 1000),
      ]);
      const settings = response.data || {};
      const bannerMovies = movieResponse.data || [];
      const availableBannerUrls = new Set(
        bannerMovies.flatMap((movie) => normalizeMovieBanners(movie)),
      );
      const selectedBannerUrls = (
        settings.selected_banner_urls || defaultBannerSettings.selected_banner_urls
      ).filter((url) => availableBannerUrls.has(url));

      setBannerCatalogMovies(bannerMovies);
      setBannerSettings({
        selected_banner_urls: selectedBannerUrls,
        slide_interval_seconds: Math.round(
          (settings.slide_interval_ms ||
            defaultBannerSettings.slide_interval_seconds * 1000) / 1000,
        ),
      });
    } catch (error) {
      addToast(
        "error",
        error.response?.data?.message ||
          "Không thể tải cấu hình banner trang chủ",
      );
    } finally {
      setSettingsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchMovies(1, "");
  }, [fetchMovies]);

  useEffect(() => {
    fetchBannerSettings();
  }, [fetchBannerSettings]);

  const handleSearch = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
    setCurrentPage(1);
    fetchMovies(1, query);
  };

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
      setApiErrors({});
      fetchMovies(1, searchQuery);
      fetchBannerSettings();
      setTimeout(() => navigate("/admin/movies"), 500);
    } catch (error) {
      const msg =
        error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại";
      if (msg === "url không đúng định dạng") {
        setApiErrors({ trailer_url: msg });
      } else {
        addToast("error", msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (movie) => {
    setEditingMovie(movie);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (movie) => {
    setDeletingMovie(movie);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingMovie) return;
    try {
      await deleteMovie(deletingMovie._id);
      addToast("success", `Đã xóa phim "${deletingMovie.title}"`);
      setConfirmOpen(false);
      setDeletingMovie(null);
      fetchMovies(1, searchQuery);
      fetchBannerSettings();
      setTimeout(() => navigate("/admin/movies"), 500);
    } catch (error) {
      const msg =
        error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại";
      addToast("error", msg);
    }
  };


  const handleBannerSettingsChange = (field, value) => {
    setBannerSettings((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleToggleHomeBanner = (url) => {
    setBannerSettings((current) => {
      const selected = current.selected_banner_urls.includes(url)
        ? current.selected_banner_urls.filter((item) => item !== url)
        : [...current.selected_banner_urls, url];

      return {
        ...current,
        selected_banner_urls: selected,
      };
    });
  };

  const handleSubmitBannerSettings = async (event) => {
    event.preventDefault();

    try {
      setSettingsSubmitting(true);
      const intervalSeconds = Math.min(
        Math.max(Number(bannerSettings.slide_interval_seconds) || 5, 1),
        30,
      );

      const response = await updateHomeBannerSettings({
        selected_banner_urls: bannerSettings.selected_banner_urls,
        slide_interval_ms: intervalSeconds * 1000,
      });
      const settings = response.data || {};

      setBannerSettings({
        selected_banner_urls:
          settings.selected_banner_urls || bannerSettings.selected_banner_urls,
        slide_interval_seconds: Math.round(
          (settings.slide_interval_ms || intervalSeconds * 1000) / 1000,
        ),
      });
      addToast("success", response.message || "Đã cập nhật cấu hình banner");
    } catch (error) {
      addToast(
        "error",
        error.response?.data?.message || "Không thể cập nhật cấu hình banner",
      );
    } finally {
      setSettingsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
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

      <form className="settings-panel movie-banner-settings" onSubmit={handleSubmitBannerSettings}>
        <div className="settings-panel-header">
          <h2>Banner trang chủ</h2>
          <p>Tick đúng những banner bạn muốn in ra slider trang chủ user.</p>
        </div>

        <div className="settings-grid">
          <div className="form-group">
            <label className="form-label">Số lượng banner hiển thị</label>
            <div className="home-banner-count">{selectedBannerCount}</div>
            <p className="form-hint">Đây là số banner đã chọn, không phải số thứ tự.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Thời gian chuyển banner</label>
            <input
              type="number"
              className="form-input"
              min="1"
              max="30"
              value={bannerSettings.slide_interval_seconds}
              onChange={(event) =>
                handleBannerSettingsChange(
                  "slide_interval_seconds",
                  event.target.value,
                )
              }
              disabled={settingsLoading}
            />
            <p className="form-hint">Đơn vị giây. Tối thiểu 1, tối đa 30 giây.</p>
          </div>
        </div>

        <div className="home-banner-picker">
          <div className="home-banner-picker-header">
            <strong>Chọn banner in ra trang chủ</strong>
            <span>
              {selectedBannerCount} / {bannerOptions.length} banner
            </span>
          </div>

          {bannerOptions.length ? (
            <div className="home-banner-grid">
              {bannerOptions.map((banner) => {
                const checked = bannerSettings.selected_banner_urls.includes(banner.url);

                return (
                  <label
                    className={`home-banner-option ${checked ? "selected" : ""}`}
                    key={banner.key}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleHomeBanner(banner.url)}
                      disabled={settingsLoading}
                    />
                    <span className="home-banner-option-image">
                      <img
                        src={banner.url}
                        alt={banner.movieTitle}
                        onError={(event) => {
                          event.currentTarget.src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='120'%3E%3Crect fill='%23242d4a' width='320' height='120'/%3E%3Ctext fill='%23fff' font-size='14' x='112' y='66'%3EInvalid banner%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    </span>
                    <span className="home-banner-option-title">{banner.movieTitle}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="home-banner-empty">
              Chưa có banner nào. Hãy thêm banner ở từng phim trước.
            </div>
          )}
        </div>

        <div className="settings-actions">
          <button
            className="btn btn-primary"
            type="submit"
            disabled={settingsLoading || settingsSubmitting}
          >
            <HiOutlineSave />
            {settingsSubmitting ? "Đang lưu..." : "Lưu cấu hình"}
          </button>
        </div>
      </form>

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
              onViewTrailer={setTrailerMovie}
            />

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

      <MovieModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMovie(null);
          setApiErrors({});
        }}
        onSubmit={handleSubmit}
        initialData={editingMovie}
        isLoading={submitting}
        apiErrors={apiErrors}
      />

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

      <Toast toasts={toasts} onRemove={removeToast} />

      <TrailerModal
        isOpen={!!trailerMovie}
        title={trailerMovie ? `${trailerMovie.title} - Trailer` : "Trailer"}
        trailerUrl={trailerMovie?.trailer_url}
        onClose={() => setTrailerMovie(null)}
      />
    </div>
  );
};

export default MoviesPage;
