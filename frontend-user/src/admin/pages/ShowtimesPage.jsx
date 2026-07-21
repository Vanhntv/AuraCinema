import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineCalendar,
  HiOutlineCash,
  HiOutlineClock,
  HiOutlineLocationMarker,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineSparkles,
  HiOutlineTrash,
  HiOutlineX,
} from "react-icons/hi";
import axiosClient from "../../api/axiosClient";

const emptyForm = {
  movie_id: "",
  room_id: "",
  start_time: "",
  end_time: "",
  base_price: "",
  normal_price: "",
  vip_price: "",
  couple_price: "",
};

const text = {
  addShowtime: "Th\u00eam su\u1ea5t chi\u1ebfu",
  addShowtimeNew: "Th\u00eam su\u1ea5t chi\u1ebfu m\u1edbi",
  basePrice: "Gi\u00e1 v\u00e9 c\u01a1 b\u1ea3n",
  cancelEdit: "H\u1ee7y s\u1eeda",
  chooseMovie: "Ch\u1ecdn phim",
  chooseRoom: "Ch\u1ecdn ph\u00f2ng chi\u1ebfu",
  close: "\u0110\u00f3ng",
  closeForm: "\u0110\u00f3ng form",
  createDescription:
    "Ho\u00e0n thi\u1ec7n th\u00f4ng tin l\u1ecbch chi\u1ebfu tr\u01b0\u1edbc khi m\u1edf b\u00e1n v\u00e9.",
  endTime: "K\u1ebft th\u00fac",
  endTimeAfterStart:
    "Th\u1eddi gian k\u1ebft th\u00fac ph\u1ea3i sau th\u1eddi gian b\u1eaft \u0111\u1ea7u.",
  endTimeHint:
    "C\u00f3 th\u1ec3 b\u1ecf tr\u1ed1ng n\u1ebfu h\u1ec7 th\u1ed1ng t\u1ef1 t\u00ednh theo th\u1eddi l\u01b0\u1ee3ng phim.",
  formInvalid:
    "Vui l\u00f2ng ki\u1ec3m tra l\u1ea1i th\u00f4ng tin su\u1ea5t chi\u1ebfu.",
  loading: "\u0110ang t\u1ea3i d\u1eef li\u1ec7u...",
  movie: "Phim",
  noPrice: "Ch\u01b0a \u0111\u1eb7t",
  noRoom: "Ch\u01b0a ch\u1ecdn ph\u00f2ng",
  noShowtimes: "Ch\u01b0a c\u00f3 su\u1ea5t chi\u1ebfu n\u00e0o.",
  notSelected: "Ch\u01b0a ch\u1ecdn",
  preview: "Xem tr\u01b0\u1edbc",
  priceHint:
    "Nh\u1eadp gi\u00e1 m\u1eb7c \u0111\u1ecbnh tr\u01b0\u1edbc khi \u00e1p d\u1ee5ng ph\u1ee5 thu ho\u1eb7c khuy\u1ebfn m\u00e3i.",
  refresh: "L\u00e0m m\u1edbi",
  requiredMovie: "Vui l\u00f2ng ch\u1ecdn phim.",
  requiredRoom: "Vui l\u00f2ng ch\u1ecdn ph\u00f2ng chi\u1ebfu.",
  requiredStart:
    "Vui l\u00f2ng ch\u1ecdn th\u1eddi gian b\u1eaft \u0111\u1ea7u.",
  room: "Ph\u00f2ng",
  roomLabel: "Ph\u00f2ng chi\u1ebfu",
  saveShowtime: "L\u01b0u su\u1ea5t chi\u1ebfu",
  saving: "\u0110ang l\u01b0u...",
  searchPlaceholder: "T\u00ecm theo phim, ph\u00f2ng ho\u1eb7c r\u1ea1p...",
  startTime: "B\u1eaft \u0111\u1ea7u",
  successCreate:
    "\u0110\u00e3 th\u00eam su\u1ea5t chi\u1ebfu th\u00e0nh c\u00f4ng.",
  successUpdate:
    "\u0110\u00e3 c\u1eadp nh\u1eadt su\u1ea5t chi\u1ebfu th\u00e0nh c\u00f4ng.",
  tableActions: "Thao t\u00e1c",
  tableCinema: "R\u1ea1p",
  tableEnd: "Gi\u1edd k\u1ebft th\u00fac",
  tableStart: "Gi\u1edd b\u1eaft \u0111\u1ea7u",
  title: "Qu\u1ea3n l\u00fd Su\u1ea5t chi\u1ebfu",
  updateDescription:
    "\u0110i\u1ec1u ch\u1ec9nh phim, ph\u00f2ng, th\u1eddi gian ho\u1eb7c gi\u00e1 v\u00e9 cho su\u1ea5t \u0111ang ch\u1ecdn.",
  updateShowtime: "C\u1eadp nh\u1eadt su\u1ea5t chi\u1ebfu",
  updateFailed: "Kh\u00f4ng th\u1ec3 c\u1eadp nh\u1eadt su\u1ea5t chi\u1ebfu.",
  createFailed: "Kh\u00f4ng th\u1ec3 th\u00eam su\u1ea5t chi\u1ebfu.",
  priceInvalid:
    "Gi\u00e1 v\u00e9 kh\u00f4ng \u0111\u01b0\u1ee3c nh\u1ecf h\u01a1n 0.",
  resetInfo: "X\u00f3a th\u00f4ng tin",
  subtitle:
    "T\u1ea1o l\u1ecbch chi\u1ebfu, ch\u1ecdn ph\u00f2ng v\u00e0 ki\u1ec3m so\u00e1t gi\u00e1 v\u00e9 theo t\u1eebng su\u1ea5t",
  edit: "Ch\u1ec9nh s\u1eeda",
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
  if (!value) return text.notSelected;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return text.notSelected;

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!value || Number.isNaN(amount)) return text.noPrice;

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

const getShowtimeId = (showtime) => showtime.id || showtime._id;

const toDateTimeLocalInput = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offsetDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  );
  return offsetDate.toISOString().slice(0, 16);
};

const ShowtimesPage = () => {
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingShowtimeId, setDeletingShowtimeId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [editingShowtime, setEditingShowtime] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const isEditing = Boolean(editingShowtime);

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

  const loadInitialData = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true);
      try {
        await Promise.all([fetchShowtimes(), fetchMovies(), fetchRooms()]);
      } finally {
        setLoading(false);
      }
    },
    [fetchMovies, fetchRooms, fetchShowtimes],
  );

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

  const closeForm = () => {
    resetForm();
    setEditingShowtime(null);
    setIsFormOpen(false);
  };

  const openCreateForm = () => {
    if (isFormOpen && !isEditing) {
      closeForm();
      return;
    }

    resetForm();
    setEditingShowtime(null);
    setIsFormOpen(true);
  };

  const openEditForm = (showtime) => {
    setEditingShowtime(showtime);
    setFormData({
      movie_id: showtime.movie_id ? String(showtime.movie_id) : "",
      room_id: showtime.room_id ? String(showtime.room_id) : "",
      start_time: toDateTimeLocalInput(showtime.start_time),
      end_time: toDateTimeLocalInput(showtime.end_time),
      base_price:
        showtime.base_price !== undefined && showtime.base_price !== null
          ? String(showtime.base_price)
          : "",
      normal_price: showtime.seat_prices?.normal != null ? String(showtime.seat_prices.normal) : "",
      vip_price: showtime.seat_prices?.vip != null ? String(showtime.seat_prices.vip) : "",
      couple_price: showtime.seat_prices?.couple != null ? String(showtime.seat_prices.couple) : "",
    });
    setFormErrors({});
    setFeedback({ type: "", message: "" });
    setIsFormOpen(true);
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.movie_id) errors.movie_id = text.requiredMovie;
    if (!formData.room_id) errors.room_id = text.requiredRoom;
    if (!formData.start_time) errors.start_time = text.requiredStart;

    if (formData.end_time && formData.start_time) {
      const startTime = new Date(formData.start_time).getTime();
      const endTime = new Date(formData.end_time).getTime();

      if (endTime <= startTime) {
        errors.end_time = text.endTimeAfterStart;
      }
    }

    if (formData.base_price && Number(formData.base_price) < 0) {
      errors.base_price = text.priceInvalid;
    }
    ["normal_price", "vip_price", "couple_price"].forEach((field) => {
      if (formData[field] && Number(formData[field]) < 0) errors[field] = text.priceInvalid;
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      setFeedback({ type: "error", message: text.formInvalid });
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
        seat_prices: {
          normal: formData.normal_price === "" ? null : Number(formData.normal_price),
          vip: formData.vip_price === "" ? null : Number(formData.vip_price),
          couple: formData.couple_price === "" ? null : Number(formData.couple_price),
        },
      };

      if (isEditing) {
        await axiosClient.put(
          `/showtimes/${getShowtimeId(editingShowtime)}`,
          payload,
        );
      } else {
        await axiosClient.post("/showtimes", payload);
      }

      resetForm();
      setEditingShowtime(null);
      setFeedback({
        type: "success",
        message: isEditing ? text.successUpdate : text.successCreate,
      });
      setIsFormOpen(false);
      await fetchShowtimes();
    } catch (error) {
      const message =
        error.response?.data?.message ||
        (isEditing ? text.updateFailed : text.createFailed);
      setFeedback({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (showtime) => {
    setDeleteTarget(showtime);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  const handleDeleteShowtime = async () => {
    if (!deleteTarget) return;

    const showtimeId = getShowtimeId(deleteTarget);

    try {
      setDeletingShowtimeId(showtimeId);
      setFeedback({ type: "", message: "" });
      await axiosClient.delete(`/showtimes/${showtimeId}`);
      setFeedback({
        type: "success",
        message: "Đã xóa suất chiếu thành công.",
      });
      closeDeleteModal();
      await fetchShowtimes();
    } catch (error) {
      const message =
        error.response?.data?.message || "Không thể xóa suất chiếu.";
      setFeedback({ type: "error", message });
      closeDeleteModal();
    } finally {
      setDeletingShowtimeId(null);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <HiOutlineCalendar style={{ marginRight: "12px" }} />
            {text.title}
          </h1>
          <p className="page-subtitle">{text.subtitle}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={loadInitialData}>
            <HiOutlineRefresh />
            {text.refresh}
          </button>
          <button className="btn btn-primary" onClick={openCreateForm}>
            {isFormOpen && !isEditing ? <HiOutlineX /> : <HiOutlinePlus />}
            {isFormOpen && !isEditing ? text.closeForm : text.addShowtime}
          </button>
        </div>
      </div>

      <div className="search-bar">
        <div className="search-input-wrapper">
          <HiOutlineSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder={text.searchPlaceholder}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </div>

      {feedback.message ? (
        <div className={`showtime-alert ${feedback.type}`} role="alert">
          <span className="showtime-alert-icon">
            {feedback.type === "success" ? "✓" : "!"}
          </span>
          <div>
            <strong>
              {feedback.type === "success" ? "Thành công" : "Thông báo"}
            </strong>
            <div>{feedback.message}</div>
          </div>
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
                <h2>{isEditing ? text.updateShowtime : text.addShowtimeNew}</h2>
                <p>
                  {isEditing ? text.updateDescription : text.createDescription}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={closeForm}
              title={text.close}
            >
              <HiOutlineX />
            </button>
          </div>

          <form className="showtime-form" onSubmit={handleSubmit}>
            <div className="showtime-form-grid">
              <label className="form-group">
                <span className="form-label">
                  {text.movie} <span className="required">*</span>
                </span>
                <select
                  className={`form-input ${formErrors.movie_id ? "error" : ""}`}
                  value={formData.movie_id}
                  onChange={(event) =>
                    updateField("movie_id", event.target.value)
                  }
                  required
                >
                  <option value="">{text.chooseMovie}</option>
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

              {[
                ["normal_price", "Giá ghế thường"],
                ["vip_price", "Giá ghế VIP"],
                ["couple_price", "Giá ghế đôi"],
              ].map(([field, label]) => (
                <label className="form-group" key={field}>
                  <span className="form-label">{label}</span>
                  <input className={`form-input ${formErrors[field] ? "error" : ""}`} type="number" min="0" step="1000" value={formData[field]} onChange={(event) => updateField(field, event.target.value)} placeholder="Ví dụ: 80000" />
                  {formErrors[field] ? <span className="form-error">{formErrors[field]}</span> : <span className="form-hint">Để trống để tính theo giá cơ bản.</span>}
                </label>
              ))}

              <label className="form-group">
                <span className="form-label">
                  {text.roomLabel} <span className="required">*</span>
                </span>
                <select
                  className={`form-input ${formErrors.room_id ? "error" : ""}`}
                  value={formData.room_id}
                  onChange={(event) =>
                    updateField("room_id", event.target.value)
                  }
                  required
                >
                  <option value="">{text.chooseRoom}</option>
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
                  {text.startTime} <span className="required">*</span>
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
                <span className="form-label">{text.endTime}</span>
                <input
                  className={`form-input ${formErrors.end_time ? "error" : ""}`}
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(event) =>
                    updateField("end_time", event.target.value)
                  }
                />
                {formErrors.end_time ? (
                  <span className="form-error">{formErrors.end_time}</span>
                ) : (
                  <span className="form-hint">{text.endTimeHint}</span>
                )}
              </label>

              <label className="form-group">
                <span className="form-label">{text.basePrice}</span>
                <input
                  className={`form-input ${formErrors.base_price ? "error" : ""}`}
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.base_price}
                  onChange={(event) =>
                    updateField("base_price", event.target.value)
                  }
                  placeholder="Vi du: 70000"
                />
                {formErrors.base_price ? (
                  <span className="form-error">{formErrors.base_price}</span>
                ) : (
                  <span className="form-hint">{text.priceHint}</span>
                )}
              </label>
            </div>

            <aside className="showtime-preview">
              <div className="showtime-preview-eyebrow">{text.preview}</div>
              <h3>{selectedMovie?.title || text.notSelected}</h3>
              <div className="showtime-preview-list">
                <span>
                  <HiOutlineLocationMarker />
                  {selectedRoom ? getRoomLabel(selectedRoom) : text.noRoom}
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
                onClick={isEditing ? closeForm : resetForm}
                disabled={submitting}
              >
                {isEditing ? text.cancelEdit : text.resetInfo}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting
                  ? text.saving
                  : isEditing
                    ? text.updateShowtime
                    : text.saveShowtime}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {deleteModalOpen ? (
        <div className="showtime-delete-overlay" onClick={closeDeleteModal}>
          <div
            className="showtime-delete-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="showtime-delete-icon">🗑️</div>
            <h3>Xác nhận xóa suất chiếu</h3>
            <p>
              Bạn có chắc chắn muốn xóa suất chiếu này?
              <br />
              Hành động này sẽ ẩn suất chiếu khỏi danh sách và không thể hoàn
              tác.
            </p>
            <div className="showtime-delete-meta">
              <strong>{deleteTarget?.movieTitle || "Suất chiếu"}</strong>
              <span>{deleteTarget?.roomName || ""}</span>
            </div>
            <div className="showtime-delete-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeDeleteModal}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteShowtime}
              >
                {deletingShowtimeId === getShowtimeId(deleteTarget)
                  ? "Đang xóa..."
                  : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>{text.loading}</p>
          </div>
        ) : filteredShowtimes.length === 0 ? (
          <div className="empty-state">{text.noShowtimes}</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{text.movie}</th>
                  <th>{text.room}</th>
                  <th>{text.tableCinema}</th>
                  <th>{text.tableStart}</th>
                  <th>{text.tableEnd}</th>
                  <th style={{ width: "110px", textAlign: "center" }}>
                    {text.tableActions}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredShowtimes.map((showtime) => (
                  <tr key={getShowtimeId(showtime)}>
                    <td>{showtime.movieTitle || "-"}</td>
                    <td>{showtime.roomName || "-"}</td>
                    <td>{showtime.cinemaName || "-"}</td>
                    <td>{showtime.startTime || "-"}</td>
                    <td>{showtime.endTime || "-"}</td>
                    <td>
                      <div
                        className="table-actions"
                        style={{ justifyContent: "center" }}
                      >
                        <button
                          type="button"
                          className="btn btn-icon btn-ghost"
                          style={{ color: "var(--color-info)" }}
                          onClick={() => openEditForm(showtime)}
                          title={text.edit}
                          id={`btn-edit-showtime-${getShowtimeId(showtime)}`}
                        >
                          <HiOutlinePencil />
                        </button>
                        <button
                          type="button"
                          className="btn btn-icon btn-ghost"
                          style={{ color: "var(--color-danger)" }}
                          onClick={() => openDeleteModal(showtime)}
                          disabled={
                            deletingShowtimeId === getShowtimeId(showtime)
                          }
                          title={text.deleteShowtime}
                          id={`btn-delete-showtime-${getShowtimeId(showtime)}`}
                        >
                          {deletingShowtimeId === getShowtimeId(showtime) ? (
                            text.deleting
                          ) : (
                            <HiOutlineTrash />
                          )}
                        </button>
                      </div>
                    </td>
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
