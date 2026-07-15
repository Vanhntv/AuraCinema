import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineCalendar,
  HiOutlineCash,
  HiOutlineClock,
  HiOutlineLocationMarker,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineSparkles,
  HiOutlineX,
} from "react-icons/hi";
import axiosClient from "../api/axiosClient";

const emptyForm = {
  movie_id: "",
  room_id: "",
  start_time: "",
  end_time: "",
  base_price: "",
};

const normalizeText = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const matchesSearchQuery = (value, query) => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return true;

  const normalizedValue = normalizeText(value);
  return normalizedValue.includes(normalizedQuery);
};

const formatDateTime = (value) => {
  if (!value) return "Chưa chọn";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa chọn";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!value || Number.isNaN(amount)) return "Chưa đặt";

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
};

const getRoomLabel = (room) => {
  const cinemaName = room.cinema_id?.name || room.cinemaName;
  return cinemaName ? `${room.name} - ${cinemaName}` : room.name;
};

const ShowtimesPage = () => {
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const fetchShowtimes = useCallback(async () => {
    try {
      const response = await axiosClient.get("/showtimes");
      setShowtimes(response.data?.data || []);
    } catch (error) {
      console.error(error);
      setShowtimes([]);
    }
  }, []);

  const fetchMovies = useCallback(async () => {
    try {
      const response = await axiosClient.get("/movies", {
        params: { page: 1, limit: 100 },
      });
      setMovies(response.data?.data || []);
    } catch (error) {
      console.error(error);
      setMovies([]);
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const response = await axiosClient.get("/rooms");
      setRooms(response.data?.data || []);
    } catch (error) {
      console.error(error);
      setRooms([]);
    }
  }, []);

  const loadInitialData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      await Promise.all([fetchShowtimes(), fetchMovies(), fetchRooms()]);
    } finally {
      setLoading(false);
    }
  }, [fetchMovies, fetchRooms, fetchShowtimes]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadInitialData(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadInitialData]);

  const selectedMovie = useMemo(
    () => movies.find((movie) => movie._id === formData.movie_id),
    [formData.movie_id, movies],
  );

  const selectedRoom = useMemo(
    () => rooms.find((room) => room._id === formData.room_id),
    [formData.room_id, rooms],
  );

  const filteredShowtimes = useMemo(() => {
    const query = searchQuery.trim();

    if (!query) return showtimes;

    const searchTerms = normalizeText(query).split(/\s+/).filter(Boolean);

    return showtimes.filter((showtime) => {
      const movieTitle = showtime.movieTitle || "";
      const roomName = showtime.roomName || "";
      const cinemaName = showtime.cinemaName || "";

      return searchTerms.every((term) => {
        return [movieTitle, roomName, cinemaName].some((value) =>
          matchesSearchQuery(value, term),
        );
      });
    });
  }, [searchQuery, showtimes]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setFormErrors({});
    setFeedback({ type: "", message: "" });
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.movie_id) errors.movie_id = "Vui lòng chọn phim.";
    if (!formData.room_id) errors.room_id = "Vui lòng chọn phòng chiếu.";
    if (!formData.start_time)
      errors.start_time = "Vui lòng chọn thời gian bắt đầu.";

    if (formData.end_time && formData.start_time) {
      const startTime = new Date(formData.start_time).getTime();
      const endTime = new Date(formData.end_time).getTime();

      if (endTime <= startTime) {
        errors.end_time = "Thời gian kết thúc phải sau thời gian bắt đầu.";
      }
    }

    if (formData.base_price && Number(formData.base_price) < 0) {
      errors.base_price = "Giá vé không được nhỏ hơn 0.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      setFeedback({
        type: "error",
        message: "Vui lòng kiểm tra lại thông tin suất chiếu.",
      });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback({ type: "", message: "" });

      const payload = {
        movie_id: formData.movie_id,
        room_id: formData.room_id,
        start_time: new Date(formData.start_time).toISOString(),
        ...(formData.end_time
          ? { end_time: new Date(formData.end_time).toISOString() }
          : {}),
        ...(formData.base_price
          ? { base_price: Number(formData.base_price) }
          : {}),
      };

      await axiosClient.post("/showtimes", payload);
      setFeedback({ type: "success", message: "Đã thêm suất chiếu thành công." });
      resetForm();
      setIsFormOpen(false);
      await fetchShowtimes();
    } catch (error) {
      const message =
        error.response?.data?.message || "Không thể thêm suất chiếu.";
      setFeedback({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <HiOutlineCalendar style={{ marginRight: "12px" }} />
            Quản lý Suất chiếu
          </h1>
          <p className="page-subtitle">
            Tạo lịch chiếu, chọn phòng và kiểm soát giá vé theo từng suất
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={loadInitialData}>
            <HiOutlineRefresh />
            Làm mới
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setIsFormOpen((prev) => !prev);
              setFeedback({ type: "", message: "" });
            }}
          >
            {isFormOpen ? <HiOutlineX /> : <HiOutlinePlus />}
            {isFormOpen ? "Đóng form" : "Thêm suất chiếu"}
          </button>
        </div>
      </div>

      <div className="search-bar">
        <div className="search-input-wrapper">
          <HiOutlineSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Tìm theo phim, phòng hoặc rạp..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </div>

      {feedback.message ? (
        <div className={`showtime-alert ${feedback.type}`}>
          {feedback.message}
        </div>
      ) : null}

      {isFormOpen ? (
        <section className="showtime-form-panel">
          <div className="showtime-form-header">
            <div className="showtime-form-title">
              <span className="showtime-form-icon">
                <HiOutlineSparkles />
              </span>
              <div>
                <h2>Thêm suất chiếu mới</h2>
                <p>Hoàn thiện thông tin lịch chiếu trước khi mở bán vé.</p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={() => {
                setIsFormOpen(false);
                resetForm();
              }}
              title="Đóng"
            >
              <HiOutlineX />
            </button>
          </div>

          <form className="showtime-form" onSubmit={handleSubmit}>
            <div className="showtime-form-grid">
              <label className="form-group">
                <span className="form-label">
                  Phim <span className="required">*</span>
                </span>
                <select
                  className={`form-input ${formErrors.movie_id ? "error" : ""}`}
                  value={formData.movie_id}
                  onChange={(event) => updateField("movie_id", event.target.value)}
                  required
                >
                  <option value="">Chọn phim</option>
                  {movies.map((movie) => (
                    <option key={movie._id} value={movie._id}>
                      {movie.title}
                    </option>
                  ))}
                </select>
                {formErrors.movie_id ? (
                  <span className="form-error">{formErrors.movie_id}</span>
                ) : null}
              </label>

              <label className="form-group">
                <span className="form-label">
                  Phòng chiếu <span className="required">*</span>
                </span>
                <select
                  className={`form-input ${formErrors.room_id ? "error" : ""}`}
                  value={formData.room_id}
                  onChange={(event) => updateField("room_id", event.target.value)}
                  required
                >
                  <option value="">Chọn phòng chiếu</option>
                  {rooms.map((room) => (
                    <option key={room._id} value={room._id}>
                      {getRoomLabel(room)}
                    </option>
                  ))}
                </select>
                {formErrors.room_id ? (
                  <span className="form-error">{formErrors.room_id}</span>
                ) : null}
              </label>

              <label className="form-group">
                <span className="form-label">
                  Bắt đầu <span className="required">*</span>
                </span>
                <input
                  className={`form-input ${formErrors.start_time ? "error" : ""}`}
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(event) =>
                    updateField("start_time", event.target.value)
                  }
                  required
                />
                {formErrors.start_time ? (
                  <span className="form-error">{formErrors.start_time}</span>
                ) : null}
              </label>

              <label className="form-group">
                <span className="form-label">Kết thúc</span>
                <input
                  className={`form-input ${formErrors.end_time ? "error" : ""}`}
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(event) => updateField("end_time", event.target.value)}
                />
                {formErrors.end_time ? (
                  <span className="form-error">{formErrors.end_time}</span>
                ) : (
                  <span className="form-hint">
                    Có thể bỏ trống nếu hệ thống tự tính theo thời lượng phim.
                  </span>
                )}
              </label>

              <label className="form-group">
                <span className="form-label">Giá vé cơ bản</span>
                <input
                  className={`form-input ${formErrors.base_price ? "error" : ""}`}
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.base_price}
                  onChange={(event) =>
                    updateField("base_price", event.target.value)
                  }
                  placeholder="Ví dụ: 70000"
                />
                {formErrors.base_price ? (
                  <span className="form-error">{formErrors.base_price}</span>
                ) : (
                  <span className="form-hint">
                    Nhập giá mặc định trước khi áp dụng phụ thu hoặc khuyến mãi.
                  </span>
                )}
              </label>
            </div>

            <aside className="showtime-preview">
              <div className="showtime-preview-eyebrow">Xem trước</div>
              <h3>{selectedMovie?.title || "Chưa chọn phim"}</h3>
              <div className="showtime-preview-list">
                <span>
                  <HiOutlineLocationMarker />
                  {selectedRoom ? getRoomLabel(selectedRoom) : "Chưa chọn phòng"}
                </span>
                <span>
                  <HiOutlineClock />
                  {formatDateTime(formData.start_time)}
                </span>
                <span>
                  <HiOutlineCash />
                  {formatCurrency(formData.base_price)}
                </span>
              </div>
            </aside>

            <div className="showtime-form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetForm}
                disabled={submitting}
              >
                Xóa thông tin
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? "Đang lưu..." : "Lưu suất chiếu"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="card">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : filteredShowtimes.length === 0 ? (
          <div className="empty-state">Chưa có suất chiếu nào.</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Phim</th>
                  <th>Phòng</th>
                  <th>Rạp</th>
                  <th>Giờ bắt đầu</th>
                  <th>Giờ kết thúc</th>
                </tr>
              </thead>
              <tbody>
                {filteredShowtimes.map((showtime) => (
                  <tr key={showtime.id || showtime._id}>
                    <td>{showtime.movieTitle || "—"}</td>
                    <td>{showtime.roomName || "—"}</td>
                    <td>{showtime.cinemaName || "—"}</td>
                    <td>{showtime.startTime || "—"}</td>
                    <td>{showtime.endTime || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowtimesPage;
