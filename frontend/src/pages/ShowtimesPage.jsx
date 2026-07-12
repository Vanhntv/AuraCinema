import { useEffect, useMemo, useState } from "react";
import {
  HiOutlineCalendar,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSearch,
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

const ShowtimesPage = () => {
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const fetchShowtimes = async () => {
    try {
      const response = await axiosClient.get("/showtimes");
      setShowtimes(response.data?.data || []);
    } catch (error) {
      console.error(error);
      setShowtimes([]);
    }
  };

  const fetchMovies = async () => {
    try {
      const response = await axiosClient.get("/movies", {
        params: { page: 1, limit: 100 },
      });
      setMovies(response.data?.data || []);
    } catch (error) {
      console.error(error);
      setMovies([]);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await axiosClient.get("/rooms");
      setRooms(response.data?.data || []);
    } catch (error) {
      console.error(error);
      setRooms([]);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchShowtimes(), fetchMovies(), fetchRooms()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

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

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.movie_id || !formData.room_id || !formData.start_time) {
      setFeedback({
        type: "error",
        message: "Vui lòng chọn phim, phòng và thời gian bắt đầu.",
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
      setFeedback({ type: "success", message: "Thêm suất chiếu thành công." });
      setFormData(emptyForm);
      setIsFormOpen(false);
      await fetchShowtimes();
    } catch (error) {
      const message =
        error.response?.data?.message || "Không thể thêm suất chiếu";
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
            Danh sách các suất chiếu đã được tạo trong hệ thống
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn btn-secondary" onClick={loadInitialData}>
            <HiOutlineRefresh />
            Làm mới
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setIsFormOpen((prev) => !prev)}
          >
            <HiOutlinePlus />
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
            placeholder="Tìm kiếm suất chiếu..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </div>

      {feedback.message ? (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 14px",
            borderRadius: "10px",
            background: feedback.type === "error" ? "#fff1f2" : "#ecfdf3",
            color: feedback.type === "error" ? "#b91c1c" : "#166534",
            border: `1px solid ${feedback.type === "error" ? "#fecdd3" : "#a7f3d0"}`,
          }}
        >
          {feedback.message}
        </div>
      ) : null}

      {isFormOpen ? (
        <div className="card" style={{ marginBottom: "16px" }}>
          <h3 style={{ marginBottom: "12px" }}>Thêm suất chiếu mới</h3>
          <form
            onSubmit={handleSubmit}
            style={{ display: "grid", gap: "12px" }}
          >
            <div
              style={{
                display: "grid",
                gap: "12px",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
              <label style={{ display: "grid", gap: "6px" }}>
                <span>Phim</span>
                <select
                  value={formData.movie_id}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      movie_id: event.target.value,
                    }))
                  }
                  required
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                  }}
                >
                  <option value="">-- Chọn phim --</option>
                  {movies.map((movie) => (
                    <option key={movie._id} value={movie._id}>
                      {movie.title}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: "6px" }}>
                <span>Phòng</span>
                <select
                  value={formData.room_id}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      room_id: event.target.value,
                    }))
                  }
                  required
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                  }}
                >
                  <option value="">-- Chọn phòng --</option>
                  {rooms.map((room) => (
                    <option key={room._id} value={room._id}>
                      {room.name}{" "}
                      {room.cinema_id ? `- ${room.cinema_id.name}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: "6px" }}>
                <span>Thời gian bắt đầu</span>
                <input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      start_time: event.target.value,
                    }))
                  }
                  required
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px" }}>
                <span>Thời gian kết thúc</span>
                <input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      end_time: event.target.value,
                    }))
                  }
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px" }}>
                <span>Giá vé cơ bản</span>
                <input
                  type="number"
                  min="0"
                  value={formData.base_price}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      base_price: event.target.value,
                    }))
                  }
                  placeholder="Ví dụ: 70000"
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                  }}
                />
              </label>
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsFormOpen(false);
                  setFeedback({ type: "", message: "" });
                }}
              >
                Hủy
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
        </div>
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
