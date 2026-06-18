import { useState, useEffect } from "react";
import { HiOutlineX } from "react-icons/hi";
import { getGenres } from "../../services/genreService";
import GenreMultiSelect from "./GenreMultiSelect";

const MovieModal = ({ isOpen, onClose, onSubmit, initialData, isLoading }) => {
  const [formData, setFormData] = useState({
    title: "",
    poster: "",
    banner: "",
    description: "",
    duration: "",
    releaseDate: "",
    director: "",
    actors: "",
    language: "",
    country: "",
    ageLimit: "",
    status: "coming_soon",
    genreIds: [],
  });
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [genreOptions, setGenreOptions] = useState([]);
  const [genresLoading, setGenresLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const isEditing = !!initialData;

  // Fetch genres
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        setGenresLoading(true);
        const data = await getGenres();
        setGenreOptions(data.data || []);
      } catch (error) {
        console.error("Error fetching genres:", error);
      } finally {
        setGenresLoading(false);
      }
    };

    if (isOpen) {
      fetchGenres();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          title: initialData.title || "",
          poster: initialData.poster || "",
          banner: initialData.banner || "",
          description: initialData.description || "",
          duration: initialData.duration || "",
          releaseDate: initialData.releaseDate
            ? new Date(initialData.releaseDate).toISOString().split("T")[0]
            : "",
          director: initialData.director || "",
          actors: initialData.actors || "",
          language: initialData.language || "",
          country: initialData.country || "",
          ageLimit: initialData.ageLimit || "",
          status: initialData.status || "coming_soon",
          genreIds: [],
        });
        // Set selected genres
        if (initialData.genres && Array.isArray(initialData.genres)) {
          setSelectedGenres(initialData.genres);
        } else {
          setSelectedGenres([]);
        }
      } else {
        setFormData({
          title: "",
          poster: "",
          banner: "",
          description: "",
          duration: "",
          releaseDate: "",
          director: "",
          actors: "",
          language: "",
          country: "",
          ageLimit: "",
          status: "coming_soon",
          genreIds: [],
        });
        setSelectedGenres([]);
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = "Tên phim không được để trống";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Mô tả không được để trống";
    }
    if (!formData.duration || formData.duration <= 0) {
      newErrors.duration = "Thời lượng phải là số dương";
    }
    if (!formData.releaseDate) {
      newErrors.releaseDate = "Ngày phát hành không được để trống";
    }
    if (selectedGenres.length === 0) {
      newErrors.genres = "Phải chọn ít nhất một thể loại";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const submitData = {
        ...formData,
        genreIds: selectedGenres.map((g) => g._id),
      };
      onSubmit(submitData);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleGenreChange = (genres) => {
    setSelectedGenres(genres);
    if (errors.genres) {
      setErrors((prev) => ({ ...prev, genres: "" }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEditing ? "Chỉnh sửa phim" : "Thêm phim mới"}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <HiOutlineX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Hàng 1: Tên phim, Thời lượng, Độ tuổi */}
            <div className="form-row">
              <div className="form-group form-group-2">
                <label className="form-label">
                  Tên phim <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${errors.title ? "error" : ""}`}
                  placeholder="Nhập tên phim..."
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  autoFocus
                  id="input-movie-title"
                />
                {errors.title && <p className="form-error">{errors.title}</p>}
              </div>

              <div className="form-group form-group-1">
                <label className="form-label">
                  Thời lượng (phút) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  className={`form-input ${errors.duration ? "error" : ""}`}
                  placeholder="120"
                  value={formData.duration}
                  onChange={(e) => handleChange("duration", e.target.value)}
                  min="1"
                  id="input-movie-duration"
                />
                {errors.duration && (
                  <p className="form-error">{errors.duration}</p>
                )}
              </div>

              <div className="form-group form-group-1">
                <label className="form-label">Độ tuổi</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="13"
                  value={formData.ageLimit}
                  onChange={(e) => handleChange("ageLimit", e.target.value)}
                  min="0"
                  id="input-movie-age-limit"
                />
              </div>
            </div>

            {/* Hàng 2: Ngày phát hành, Trạng thái */}
            <div className="form-row">
              <div className="form-group form-group-1">
                <label className="form-label">
                  Ngày phát hành <span className="required">*</span>
                </label>
                <input
                  type="date"
                  className={`form-input ${errors.releaseDate ? "error" : ""}`}
                  value={formData.releaseDate}
                  onChange={(e) => handleChange("releaseDate", e.target.value)}
                  id="input-movie-release-date"
                />
                {errors.releaseDate && (
                  <p className="form-error">{errors.releaseDate}</p>
                )}
              </div>

              <div className="form-group form-group-1">
                <label className="form-label">Trạng thái</label>
                <select
                  className="form-input"
                  value={formData.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  id="input-movie-status"
                >
                  <option value="coming_soon">Sắp chiếu</option>
                  <option value="now_showing">Đang chiếu</option>
                  <option value="ended">Đã kết thúc</option>
                </select>
              </div>

              <div className="form-group form-group-1">
                <label className="form-label">Ngôn ngữ</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Tiếng Việt"
                  value={formData.language}
                  onChange={(e) => handleChange("language", e.target.value)}
                  id="input-movie-language"
                />
              </div>
            </div>

            {/* Hàng 3: Đạo diễn, Nước */}
            <div className="form-row">
              <div className="form-group form-group-2">
                <label className="form-label">Đạo diễn</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Tên đạo diễn..."
                  value={formData.director}
                  onChange={(e) => handleChange("director", e.target.value)}
                  id="input-movie-director"
                />
              </div>

              <div className="form-group form-group-1">
                <label className="form-label">Nước</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Việt Nam"
                  value={formData.country}
                  onChange={(e) => handleChange("country", e.target.value)}
                  id="input-movie-country"
                />
              </div>
            </div>

            {/* Thể loại */}
            <div className="form-group">
              <label className="form-label">
                Thể loại <span className="required">*</span>
              </label>
              <GenreMultiSelect
                options={genreOptions}
                selected={selectedGenres}
                onChange={handleGenreChange}
                isLoading={genresLoading}
              />
              {errors.genres && (
                <p className="form-error">{errors.genres}</p>
              )}
            </div>

            {/* Diễn viên */}
            <div className="form-group">
              <label className="form-label">Diễn viên</label>
              <input
                type="text"
                className="form-input"
                placeholder="Tên diễn viên (cách nhau bằng dấu phẩy)..."
                value={formData.actors}
                onChange={(e) => handleChange("actors", e.target.value)}
                id="input-movie-actors"
              />
            </div>

            {/* Mô tả */}
            <div className="form-group">
              <label className="form-label">
                Mô tả <span className="required">*</span>
              </label>
              <textarea
                className={`form-input form-textarea ${
                  errors.description ? "error" : ""
                }`}
                placeholder="Nhập mô tả phim..."
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows="5"
                id="input-movie-description"
              />
              {errors.description && (
                <p className="form-error">{errors.description}</p>
              )}
            </div>

            {/* Poster URL */}
            <div className="form-group">
              <label className="form-label">Đường dẫn Poster</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://example.com/poster.jpg"
                value={formData.poster}
                onChange={(e) => handleChange("poster", e.target.value)}
                id="input-movie-poster"
              />
              {formData.poster && (
                <div className="form-preview">
                  <img
                    src={formData.poster}
                    alt="Preview"
                    onError={(e) => {
                      e.target.src =
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='80'%3E%3Crect fill='%23333' width='60' height='80'/%3E%3Ctext fill='%23fff' font-size='10' x='5' y='45'%3EError%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>
              )}
            </div>

            {/* Banner URL */}
            <div className="form-group">
              <label className="form-label">Đường dẫn Banner</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://example.com/banner.jpg"
                value={formData.banner}
                onChange={(e) => handleChange("banner", e.target.value)}
                id="input-movie-banner"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading
                ? "Đang xử lý..."
                : isEditing
                ? "Cập nhật"
                : "Thêm mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MovieModal;
