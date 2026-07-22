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
import ticketPriceData from "../../data/ticketPriceData.json";

const emptyForm = {
  movie_id: "",
  room_id: "",
  start_date: "",
  show_time: "",
  base_price: "",
  normal_price: "",
  vip_price: "",
  couple_price: "",
};

const text = {
  addShowtime: "Th\u00eam su\u1ea5t chi\u1ebfu",
  addShowtimeNew: "Th\u00eam su\u1ea5t chi\u1ebfu m\u1edbi",
  autoSchedule: "T\u1ef1 \u0111\u1ed9ng x\u1ebfp l\u1ecbch",
  autoScheduling: "\u0110ang x\u1ebfp...",
  basePrice: "Gi\u00e1 v\u00e9 c\u01a1 b\u1ea3n",
  cancelEdit: "H\u1ee7y s\u1eeda",
  chooseMovie: "Ch\u1ecdn phim",
  chooseRoom: "Ch\u1ecdn ph\u00f2ng chi\u1ebfu",
  close: "\u0110\u00f3ng",
  closeForm: "\u0110\u00f3ng form",
  createDescription:
    "Ho\u00e0n thi\u1ec7n th\u00f4ng tin l\u1ecbch chi\u1ebfu tr\u01b0\u1edbc khi m\u1edf b\u00e1n v\u00e9.",
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
    "Vui l\u00f2ng ch\u1ecdn ng\u00e0y chi\u1ebfu.",
  requiredShowTime: "Vui l\u00f2ng ch\u1ecdn khung gi\u1edd chi\u1ebfu.",
  room: "Ph\u00f2ng",
  roomLabel: "Ph\u00f2ng chi\u1ebfu",
  saveShowtime: "L\u01b0u su\u1ea5t chi\u1ebfu",
  saving: "\u0110ang l\u01b0u...",
  searchPlaceholder: "T\u00ecm theo phim, ph\u00f2ng ho\u1eb7c r\u1ea1p...",
  startDate: "Ng\u00e0y chi\u1ebfu",
  showTime: "Khung gi\u1edd chi\u1ebfu",
  successCreate:
    "\u0110\u00e3 th\u00eam su\u1ea5t chi\u1ebfu th\u00e0nh c\u00f4ng.",
  successUpdate:
    "\u0110\u00e3 c\u1eadp nh\u1eadt su\u1ea5t chi\u1ebfu th\u00e0nh c\u00f4ng.",
  tableActions: "Thao t\u00e1c",
  tableCinema: "R\u1ea1p",
  tableEnd: "Gi\u1edd k\u1ebft th\u00fac",
  tableStart: "Gi\u1edd b\u1eaft \u0111\u1ea7u",
  tableStatus: "Tr\u1ea1ng th\u00e1i",
  title: "Qu\u1ea3n l\u00fd Su\u1ea5t chi\u1ebfu",
  updateDescription:
    "\u0110i\u1ec1u ch\u1ec9nh phim, ph\u00f2ng, th\u1eddi gian ho\u1eb7c gi\u00e1 v\u00e9 cho su\u1ea5t \u0111ang ch\u1ecdn.",
  updateShowtime: "C\u1eadp nh\u1eadt su\u1ea5t chi\u1ebfu",
  updateFailed: "Kh\u00f4ng th\u1ec3 c\u1eadp nh\u1eadt su\u1ea5t chi\u1ebfu.",
  createFailed: "Kh\u00f4ng th\u1ec3 th\u00eam su\u1ea5t chi\u1ebfu.",
  deleteShowtime: "H\u1ee7y su\u1ea5t chi\u1ebfu",
  deleting: "\u0110ang h\u1ee7y...",
  priceInvalid:
    "Gi\u00e1 v\u00e9 kh\u00f4ng \u0111\u01b0\u1ee3c nh\u1ecf h\u01a1n 0.",
  resetInfo: "X\u00f3a th\u00f4ng tin",
  subtitle:
    "T\u1ea1o l\u1ecbch chi\u1ebfu, ch\u1ecdn ph\u00f2ng v\u00e0 ki\u1ec3m so\u00e1t gi\u00e1 v\u00e9 theo t\u1eebng su\u1ea5t",
  edit: "Ch\u1ec9nh s\u1eeda",
};

const statusLabels = {
  scheduled: "Sắp chiếu",
  now_showing: "Đang chiếu",
  completed: "Đã kết thúc",
  cancelled: "Đã hủy",
};

const normalizeShowtimeErrorMessage = (message, fallback) => {
  if (!message) return fallback;
  if (message.includes("Chi phim dang cong chieu")) {
    return "Chỉ phim đang công chiếu mới được tạo suất chiếu.";
  }
  if (
    message.includes("chua cach suat lien ke toi thieu 30 phut") ||
    message.includes("toi thieu 30 phut")
  ) {
    return "Khung giờ này bị trùng hoặc chưa cách suất liền kề tối thiểu 30 phút để dọn phòng.";
  }

  return message;
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

const formatDateOnly = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const formatDuration = (duration) => {
  const minutes = Number(duration);
  if (!Number.isFinite(minutes) || minutes <= 0) return "Chưa có thời lượng";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!hours) return `${minutes} phút`;
  if (!remainingMinutes) return `${hours} giờ`;
  return `${hours} giờ ${remainingMinutes} phút`;
};

const getRoomLabel = (room) => {
  const cinemaName = room.cinema_id?.name || room.cinemaName;
  return cinemaName ? `${room.name} - ${cinemaName}` : room.name;
};

const getShowtimeId = (showtime) => showtime.id || showtime._id;
const isFutureShowtime = (showtime) => {
  const startTime = new Date(showtime?.start_time);
  return !Number.isNaN(startTime.getTime()) && startTime > new Date();
};
const canEditShowtime = (showtime) =>
  showtime.status === "scheduled" ||
  (showtime.status === "cancelled" && isFutureShowtime(showtime));
const canCancelShowtime = (showtime) => showtime.status === "scheduled";

const getShowtimeGroupKey = (showtime) =>
  [
    showtime.movie_id || "movie",
    showtime.cinema_id || showtime.cinemaName || "cinema",
    showtime.room_id || showtime.roomName || "room",
    toDateInputValue(showtime.start_time) || "date",
    showtime.base_price ?? "base",
  ].join("|");

const toDateInputValue = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offsetDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  );
  return offsetDate.toISOString().slice(0, 10);
};

const toTimeInputValue = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offsetDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  );
  return offsetDate.toISOString().slice(11, 16);
};

const buildStartDateTime = ({ start_date, show_time }) => {
  if (!start_date || !show_time) return null;

  const date = new Date(`${start_date}T${show_time}`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTimeInputValue = (date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

const SHOWTIME_CLEANUP_BUFFER_MINUTES = 30;
const VIP_SEAT_SURCHARGE = 20000;

const parseTicketPrice = (value) => {
  const price = Number(String(value || "").replace(/[^\d]/g, ""));
  return Number.isFinite(price) ? price : null;
};

const isWeekendDate = (dateValue) => {
  if (!dateValue) return false;
  const date = new Date(`${dateValue}T00:00`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getDay() === 0 || date.getDay() === 6;
};

const getStandardBasePrice = ({ roomType, startDate }) => {
  const normalizedRoomType = String(roomType || "2D").toUpperCase();
  const tableName = normalizedRoomType === "3D" ? "3D" : "2D";
  const table = ticketPriceData.pricingTables.find(
    (item) => item.name === tableName,
  );
  const adultRow = table?.rows.find((row) =>
    normalizeText(row.label).includes("nguoi lon"),
  );

  if (!adultRow) return null;

  return parseTicketPrice(isWeekendDate(startDate) ? adultRow.weekend : adultRow.weekday);
};

const buildStandardSeatPrices = (basePrice) => {
  const numericBasePrice = Number(basePrice);
  if (!Number.isFinite(numericBasePrice) || numericBasePrice <= 0) {
    return null;
  }

  return {
    base_price: numericBasePrice,
    normal_price: numericBasePrice,
    vip_price: numericBasePrice + VIP_SEAT_SURCHARGE,
    couple_price: numericBasePrice * 2,
  };
};

const addMinutes = (date, minutes) =>
  new Date(date.getTime() + minutes * 60 * 1000);

const ShowtimesPage = () => {
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [deletingShowtimeId, setDeletingShowtimeId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [movieFilter, setMovieFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [editingShowtime, setEditingShowtime] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [conflictShowtimes, setConflictShowtimes] = useState([]);
  const [autoScheduleSlots, setAutoScheduleSlots] = useState([]);
  const [priceMode, setPriceMode] = useState("auto");

  const isEditing = Boolean(editingShowtime);

  const fetchShowtimes = useCallback(async () => {
    try {
      const response = await axiosClient.get("/showtimes", {
        params: {
          q: searchQuery.trim() || undefined,
          movie_id: movieFilter || undefined,
          room_id: roomFilter || undefined,
          date: dateFilter || undefined,
          status: statusFilter || undefined,
        },
      });
      setShowtimes(response.data?.data || []);
    } catch (error) {
      console.error(error);
      setShowtimes([]);
    }
  }, [dateFilter, movieFilter, roomFilter, searchQuery, statusFilter]);

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
      const response = await axiosClient.get("/rooms", {
        params: { active_only: true },
      });
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

  const standardPricing = useMemo(() => {
    if (!selectedRoom || !formData.start_date) return null;
    const basePrice = getStandardBasePrice({
      roomType: selectedRoom.room_type,
      startDate: formData.start_date,
    });

    if (!basePrice) return null;

    return {
      ...buildStandardSeatPrices(basePrice),
      roomType: String(selectedRoom.room_type || "2D").toUpperCase(),
      dayType: isWeekendDate(formData.start_date) ? "Cuối tuần / lễ" : "Ngày thường",
    };
  }, [formData.start_date, selectedRoom]);

  const applyStandardPricing = useCallback(() => {
    if (!standardPricing) return;

    setFormData((current) => ({
      ...current,
      base_price: String(standardPricing.base_price),
      normal_price: String(standardPricing.normal_price),
      vip_price: String(standardPricing.vip_price),
      couple_price: String(standardPricing.couple_price),
    }));
    setPriceMode("auto");
    setFormErrors((current) => ({
      ...current,
      base_price: "",
      normal_price: "",
      vip_price: "",
      couple_price: "",
    }));
  }, [standardPricing]);

  useEffect(() => {
    if (!standardPricing || priceMode !== "auto") return;
    applyStandardPricing();
  }, [applyStandardPricing, priceMode, standardPricing]);

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

  const groupedShowtimes = useMemo(() => {
    const groups = new Map();

    filteredShowtimes.forEach((showtime) => {
      const groupKey = getShowtimeGroupKey(showtime);

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          movieTitle: showtime.movieTitle || "-",
          moviePoster: showtime.moviePoster || "",
          cinemaName: showtime.cinemaName || "-",
          roomName: showtime.roomName || "-",
          startDate: showtime.start_time,
          basePrice: showtime.base_price,
          showtimes: [],
        });
      }

      groups.get(groupKey).showtimes.push(showtime);
    });

    return Array.from(groups.values()).map((group) => {
      const showtimesByStartTime = group.showtimes.reduce((timeMap, showtime) => {
        const key = new Date(showtime.start_time).getTime();
        const existingShowtime = timeMap.get(key);

        if (
          !existingShowtime ||
          (existingShowtime.status === "cancelled" &&
            showtime.status !== "cancelled")
        ) {
          timeMap.set(key, showtime);
        }

        return timeMap;
      }, new Map());

      return {
        ...group,
        showtimes: Array.from(showtimesByStartTime.values()).sort(
        (first, second) =>
          new Date(first.start_time).getTime() -
          new Date(second.start_time).getTime(),
        ),
      };
    });
  }, [filteredShowtimes]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: "" }));
    if (["base_price", "normal_price", "vip_price", "couple_price"].includes(field)) {
      setPriceMode("custom");
    }
    if (["movie_id", "room_id", "start_date"].includes(field)) {
      setAutoScheduleSlots([]);
      setConflictShowtimes([]);
    }
    if (field === "show_time") {
      setAutoScheduleSlots([]);
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setFormErrors({});
    setFeedback({ type: "", message: "" });
    setConflictShowtimes([]);
    setAutoScheduleSlots([]);
    setPriceMode("auto");
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

  const openEditForm = (showtime, relatedShowtimes = [showtime]) => {
    if (!canEditShowtime(showtime)) {
      setFeedback({
        type: "error",
        message: "Chỉ được chỉnh sửa suất chiếu sắp chiếu hoặc suất đã hủy chưa bắt đầu.",
      });
      return;
    }

    const currentStartTime = new Date(showtime.start_time);
    setEditingShowtime(showtime);
    setPriceMode("custom");
    setFormData({
      movie_id: showtime.movie_id ? String(showtime.movie_id) : "",
      room_id: showtime.room_id ? String(showtime.room_id) : "",
      start_date: toDateInputValue(showtime.start_time),
      show_time: toTimeInputValue(showtime.start_time),
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
    setConflictShowtimes([]);
    const relatedStartTimes = Array.from(
      relatedShowtimes.reduce((timeMap, item) => {
        const date = new Date(item.start_time);
        if (!Number.isNaN(date.getTime())) {
          timeMap.set(date.getTime(), date);
        }
        return timeMap;
      }, new Map()).values(),
    ).sort((first, second) => first.getTime() - second.getTime());

    setAutoScheduleSlots(
      relatedStartTimes.length
        ? relatedStartTimes
        : Number.isNaN(currentStartTime.getTime())
          ? []
          : [currentStartTime],
    );
    setIsFormOpen(true);
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.movie_id) errors.movie_id = text.requiredMovie;
    if (!formData.room_id) errors.room_id = text.requiredRoom;
    if (!formData.start_date) errors.start_date = text.requiredStart;
    if (!formData.show_time) errors.show_time = text.requiredShowTime;

    const startDateTime = buildStartDateTime(formData);
    if (!errors.start_date && !errors.show_time && !startDateTime) {
      errors.start_date = "Ngày chiếu hoặc khung giờ chiếu không hợp lệ.";
    }
    if (startDateTime && startDateTime.getTime() <= Date.now()) {
      errors.start_date = "Không thể tạo hoặc đổi suất chiếu về thời điểm đã qua.";
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

  const buildShowtimePayload = (startDateTime) => ({
    movie_id: formData.movie_id,
    room_id: formData.room_id,
    start_time: startDateTime.toISOString(),
    ...(formData.base_price
      ? { base_price: Number(formData.base_price) }
      : {}),
    seat_prices: {
      normal: formData.normal_price === "" ? null : Number(formData.normal_price),
      vip: formData.vip_price === "" ? null : Number(formData.vip_price),
      couple: formData.couple_price === "" ? null : Number(formData.couple_price),
    },
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      setFeedback({ type: "error", message: text.formInvalid });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback({ type: "", message: "" });
      setConflictShowtimes([]);

      const startTimes =
        !isEditing && autoScheduleSlots.length > 0
          ? autoScheduleSlots
          : [buildStartDateTime(formData)];

      if (isEditing) {
        const payload = buildShowtimePayload(startTimes[0]);
        if (editingShowtime.status === "cancelled") {
          payload.status = "scheduled";
        }

        await axiosClient.put(
          `/showtimes/${getShowtimeId(editingShowtime)}`,
          payload,
        );
      } else {
        const createdSlots = [];
        const skippedSlots = [];

        for (const startTime of startTimes) {
          try {
            await axiosClient.post("/showtimes", buildShowtimePayload(startTime));
            createdSlots.push(startTime);
          } catch (error) {
            skippedSlots.push({
              slot: startTime,
              message: normalizeShowtimeErrorMessage(
                error.response?.data?.message,
                "Không thể tạo suất chiếu",
              ),
              conflict: error.response?.data?.conflict || null,
            });
          }
        }

        if (!createdSlots.length) {
          setFeedback({
            type: "error",
            message: "Không tạo được suất chiếu nào do các khung giờ bị trùng hoặc không hợp lệ.",
          });
          setConflictShowtimes(
            skippedSlots.map((item) => ({
              ...(item.conflict || {}),
              attempted_start_time: item.slot.toISOString(),
              message: item.message,
            })),
          );
          return;
        }

        const conflictItems = skippedSlots.map((item) => ({
          ...(item.conflict || {}),
          attempted_start_time: item.slot.toISOString(),
          message: item.message,
        }));

        resetForm();
        setConflictShowtimes(conflictItems);
        setFeedback({
          type: skippedSlots.length ? "error" : "success",
          message: skippedSlots.length
            ? `Đã tạo ${createdSlots.length} suất chiếu, bỏ qua ${skippedSlots.length} khung giờ bị trùng hoặc không hợp lệ.`
            : autoScheduleSlots.length
              ? `Đã tạo ${createdSlots.length} suất chiếu theo danh sách đã chọn.`
              : text.successCreate,
        });
      }

      setEditingShowtime(null);
      if (isEditing) {
        resetForm();
        setFeedback({
          type: "success",
          message: text.successUpdate,
        });
      }
      setIsFormOpen(false);
      await fetchShowtimes();
    } catch (error) {
      const message =
        normalizeShowtimeErrorMessage(
          error.response?.data?.message,
          isEditing ? text.updateFailed : text.createFailed,
        );
      setFeedback({ type: "error", message });
      setConflictShowtimes(error.response?.data?.conflict ? [error.response.data.conflict] : []);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSchedule = async () => {
    const errors = {};

    if (!formData.movie_id) errors.movie_id = text.requiredMovie;
    if (!formData.room_id) errors.room_id = text.requiredRoom;
    if (!formData.start_date) errors.start_date = text.requiredStart;
    ["base_price", "normal_price", "vip_price", "couple_price"].forEach((field) => {
      if (formData[field] && Number(formData[field]) < 0) errors[field] = text.priceInvalid;
    });

    if (!selectedMovie?.duration || Number(selectedMovie.duration) <= 0) {
      errors.movie_id = "Phim chưa có thời lượng để tự động xếp lịch.";
    }
    if (!isEditing && selectedMovie?.status && selectedMovie.status !== "now_showing") {
      errors.movie_id = "Chỉ phim đang công chiếu mới được tạo suất chiếu.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors((current) => ({ ...current, ...errors }));
      setFeedback({ type: "error", message: text.formInvalid });
      return;
    }

    const durationMinutes = Number(selectedMovie.duration);
    const openingTime = new Date(`${formData.start_date}T08:00`);
    const closingTime = new Date(`${formData.start_date}T00:00`);
    closingTime.setDate(closingTime.getDate() + 1);
    const now = new Date();
    const slots = [];

    for (
      let slotStart = new Date(openingTime);
      slotStart.getTime() + durationMinutes * 60 * 1000 <= closingTime.getTime();
      slotStart = addMinutes(
        slotStart,
        durationMinutes + SHOWTIME_CLEANUP_BUFFER_MINUTES,
      )
    ) {
      if (slotStart > now) {
        slots.push(new Date(slotStart));
      }
    }

    if (!slots.length) {
      setFeedback({
        type: "error",
        message: "Không có khung giờ hợp lệ trong khoảng 08:00 - 24:00.",
      });
      return;
    }

    try {
      setAutoScheduling(true);
      setFeedback({ type: "", message: "" });
      setConflictShowtimes([]);

      const slotChecks = await Promise.all(
        slots.map(async (slot) => {
          try {
            const response = await axiosClient.get("/showtimes/check-conflict", {
              params: {
                movie_id: formData.movie_id,
                room_id: formData.room_id,
                start_time: slot.toISOString(),
                exclude_id: isEditing ? getShowtimeId(editingShowtime) : undefined,
              },
            });

            return {
              slot,
              hasConflict: Boolean(response.data?.has_conflict),
              issueType: response.data?.has_conflict ? "conflict" : "",
              conflict: response.data?.conflict || null,
              message: response.data?.has_conflict
                ? normalizeShowtimeErrorMessage(
                    response.data?.message,
                    "Khung giờ này bị trùng hoặc chưa cách suất liền kề tối thiểu 30 phút để dọn phòng.",
                  )
                : "",
            };
          } catch (error) {
            return {
              slot,
              hasConflict: Boolean(error.response?.data?.conflict),
              issueType: error.response?.data?.conflict ? "conflict" : "invalid",
              conflict: error.response?.data?.conflict || null,
              message: normalizeShowtimeErrorMessage(
                error.response?.data?.message ||
                  "",
                "Khung giờ này không hợp lệ hoặc chưa đủ 30 phút dọn phòng.",
              ),
            };
          }
        }),
      );
      const availableSlots = slotChecks
        .filter((item) => !item.hasConflict && item.issueType !== "invalid")
        .map((item) => item.slot);
      const skippedSlots = slotChecks.filter(
        (item) => item.hasConflict || item.issueType === "invalid",
      );

      if (!availableSlots.length) {
        setAutoScheduleSlots([]);
        setFormData((current) => ({ ...current, show_time: "" }));
        setConflictShowtimes(
          skippedSlots.map((item) => ({
            ...(item.conflict || {}),
            attempted_start_time: item.slot.toISOString(),
            issueType: item.issueType,
            message: item.message,
          })),
        );
        setFeedback({
          type: "error",
          message: "Tất cả khung giờ đề xuất đã trùng lịch hoặc không hợp lệ, không có khung giờ trống để hiển thị.",
        });
        return;
      }

      setAutoScheduleSlots(availableSlots);
      setFormData((current) => ({
        ...current,
        show_time: formatTimeInputValue(availableSlots[0]),
      }));
      setConflictShowtimes(
        skippedSlots.map((item) => ({
          ...(item.conflict || {}),
          attempted_start_time: item.slot.toISOString(),
          issueType: item.issueType,
          message: item.message,
        })),
      );
      setFeedback({
        type: skippedSlots.length ? "error" : "success",
        message: skippedSlots.length
          ? `Đã tìm thấy ${availableSlots.length} khung giờ trống, bỏ qua ${skippedSlots.length} khung giờ bị trùng hoặc chưa đủ 30 phút dọn phòng.`
          : `Đã tạo danh sách ${availableSlots.length} khung giờ đề xuất. Admin có thể xóa khung không dùng rồi bấm Lưu suất chiếu để tạo lịch.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error.response?.data?.message ||
          "Không thể kiểm tra lịch chiếu hiện có.",
      });
    } finally {
      setAutoScheduling(false);
    }
  };

  const removeAutoScheduleSlot = (slotToRemove) => {
    setAutoScheduleSlots((currentSlots) => {
      const nextSlots = currentSlots.filter(
        (slot) => slot.getTime() !== slotToRemove.getTime(),
      );

      setFormData((current) => ({
        ...current,
        show_time: nextSlots[0]
          ? formatTimeInputValue(nextSlots[0])
          : "",
      }));

      return nextSlots;
    });
    setConflictShowtimes([]);
  };

  const openDeleteModal = (showtime) => {
    if (!canCancelShowtime(showtime)) {
      setFeedback({
        type: "error",
        message: "Chỉ được hủy suất chiếu chưa bắt đầu.",
      });
      return;
    }

    setDeleteTarget({
      mode: "single",
      showtimes: [showtime],
      title: showtime.movieTitle || "Suất chiếu",
      subtitle: `${showtime.roomName || ""} · ${showtime.startTime || ""}`,
    });
    setDeleteModalOpen(true);
  };

  const openDeleteGroupModal = (group) => {
    const deletableShowtimes = group.showtimes.filter(canCancelShowtime);

    if (!deletableShowtimes.length) {
      setFeedback({
        type: "error",
        message: "Nhóm này không còn suất chiếu nào có thể hủy.",
      });
      return;
    }

    setDeleteTarget({
      mode: "group",
      showtimes: deletableShowtimes,
      title: group.movieTitle || "Suất chiếu",
      subtitle: `${group.roomName || ""} · ${formatDateOnly(group.startDate)}`,
    });
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  const handleDeleteShowtime = async () => {
    const targetShowtimes = deleteTarget?.showtimes || [];
    if (!targetShowtimes.length) return;

    const deleteId =
      deleteTarget.mode === "group"
        ? `group-${targetShowtimes.map(getShowtimeId).join("-")}`
        : getShowtimeId(targetShowtimes[0]);

    try {
      setDeletingShowtimeId(deleteId);
      setFeedback({ type: "", message: "" });
      await Promise.all(
        targetShowtimes.map((showtime) =>
          axiosClient.delete(`/showtimes/${getShowtimeId(showtime)}`),
        ),
      );
      setFeedback({
        type: "success",
        message:
          deleteTarget.mode === "group"
            ? `Đã hủy ${targetShowtimes.length} suất chiếu trong nhóm.`
            : "Đã hủy suất chiếu thành công.",
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

  const hasRealScheduleConflicts = conflictShowtimes.some(
    (item) =>
      item.issueType !== "invalid" &&
      (item.id || item.movieTitle || item.start_time),
  );
  const conflictPanelTitle = hasRealScheduleConflicts
    ? "Suất chiếu bị trùng lịch"
    : "Khung giờ không hợp lệ";

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
        <select
          className="form-input showtime-filter-select"
          value={movieFilter}
          onChange={(event) => setMovieFilter(event.target.value)}
        >
          <option value="">Tất cả phim</option>
          {movies.map((movie) => (
            <option key={movie._id} value={movie._id}>
              {movie.title}
            </option>
          ))}
        </select>
        <select
          className="form-input showtime-filter-select"
          value={roomFilter}
          onChange={(event) => setRoomFilter(event.target.value)}
        >
          <option value="">Tất cả phòng</option>
          {rooms.map((room) => (
            <option key={room._id} value={room._id}>
              {getRoomLabel(room)}
            </option>
          ))}
        </select>
        <input
          className="form-input showtime-filter-date"
          type="date"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
        />
        <select
          className="form-input showtime-filter-select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
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

      {conflictShowtimes.length > 0 ? (
        <section className="showtime-conflict-panel">
          <div className="showtime-conflict-header">
            <strong>{conflictPanelTitle}</strong>
            <span>{conflictShowtimes.length} khung giờ cần kiểm tra</span>
          </div>
          <div className="showtime-conflict-list">
            {conflictShowtimes.map((item, index) => {
              const isInvalidIssue =
                item.issueType === "invalid" ||
                (!item.id && !item.movieTitle && !item.start_time);

              return (
                <div
                  className="showtime-conflict-item"
                  key={`${item.id || item.attempted_start_time || index}-${index}`}
                >
                  <div>
                    <span className="showtime-conflict-label">Khung giờ thử tạo</span>
                    <strong>{formatDateTime(item.attempted_start_time)}</strong>
                  </div>
                  <div>
                    <span className="showtime-conflict-label">
                      {isInvalidIssue ? "Lý do không hợp lệ" : "Suất đang chiếm lịch"}
                    </span>
                    <strong>
                      {isInvalidIssue
                        ? item.message || "Khung giờ này không hợp lệ."
                        : item.movieTitle || "Không xác định phim"}
                    </strong>
                    {!isInvalidIssue ? (
                      <small>
                        {item.roomName || selectedRoom?.name || "-"} · {formatDateTime(item.start_time)} - {item.endTime || formatDateTime(item.end_time)}
                      </small>
                    ) : null}
                  </div>
                  <div className="showtime-conflict-message">
                    {item.message || "Khung giờ này đã trùng với suất chiếu khác."}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
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
                ) : selectedMovie ? (
                  <span className="form-hint">Thời lượng: {formatDuration(selectedMovie.duration)}</span>
                ) : null}
              </label>

              <div className="showtime-pricing-panel">
                <div>
                  <span className="showtime-pricing-eyebrow">Giá vé mặc định</span>
                  <strong>
                    {standardPricing
                      ? `${standardPricing.roomType} · ${standardPricing.dayType}`
                      : "Chọn phòng và ngày chiếu để tính giá"}
                  </strong>
                  <small>
                    {standardPricing
                      ? `Snapshot sẽ lưu: thường ${formatCurrency(standardPricing.normal_price)}, VIP ${formatCurrency(standardPricing.vip_price)}, đôi ${formatCurrency(standardPricing.couple_price)}.`
                      : "Bảng giá chuẩn quyết định giá mặc định, suất chiếu lưu giá tại thời điểm tạo."}
                  </small>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary showtime-pricing-apply"
                  disabled={!standardPricing}
                  onClick={applyStandardPricing}
                >
                  Áp dụng giá chuẩn
                </button>
                <span className={`showtime-pricing-mode ${priceMode}`}>
                  {priceMode === "auto" ? "Giá chuẩn" : "Giá ngoại lệ"}
                </span>
              </div>

              {[
                ["normal_price", "Giá ghế thường"],
                ["vip_price", "Giá ghế VIP"],
                ["couple_price", "Giá ghế đôi"],
              ].map(([field, label]) => (
                <label className="form-group" key={field}>
                  <span className="form-label">{label}</span>
                  <input
                    className={`form-input ${formErrors[field] ? "error" : ""}`}
                    type="number"
                    min="0"
                    step="1000"
                    value={formData[field]}
                    onChange={(event) => updateField(field, event.target.value)}
                    placeholder="Ví dụ: 80000"
                  />
                  {formErrors[field] ? (
                    <span className="form-error">{formErrors[field]}</span>
                  ) : (
                    <span className="form-hint">
                      Giá snapshot của suất chiếu; chỉnh tay khi có ngoại lệ.
                    </span>
                  )}
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
                  {text.startDate} <span className="required">*</span>
                </span>
                <input
                  className={`form-input ${formErrors.start_date ? "error" : ""}`}
                  type="date"
                  value={formData.start_date}
                  onChange={(event) =>
                    updateField("start_date", event.target.value)
                  }
                  required
                />
                {formErrors.start_date ? (
                  <span className="form-error">{formErrors.start_date}</span>
                ) : null}
              </label>

              <label className="form-group">
                <span className="form-label">
                  {text.showTime} <span className="required">*</span>
                </span>
                <div className="showtime-time-row">
                  <input
                    className={`form-input ${formErrors.show_time ? "error" : ""}`}
                    type="time"
                    value={formData.show_time}
                    onChange={(event) =>
                      updateField("show_time", event.target.value)
                    }
                    required
                  />
                  <button
                    className="btn btn-secondary showtime-auto-btn"
                    disabled={autoScheduling || submitting}
                    type="button"
                    onClick={handleAutoSchedule}
                  >
                    {autoScheduling ? text.autoScheduling : text.autoSchedule}
                  </button>
                </div>
                {formErrors.show_time ? (
                  <span className="form-error">{formErrors.show_time}</span>
                ) : null}
                <div className="showtime-auto-slots">
                  <div className="showtime-auto-slots-header">
                    <span>
                      {autoScheduleSlots.length
                        ? `${autoScheduleSlots.length} khung giờ đề xuất`
                        : "Khung giờ đề xuất"}
                    </span>
                    {autoScheduleSlots.length > 0 ? (
                      <button
                        type="button"
                        className="showtime-auto-clear"
                        onClick={() => {
                          setAutoScheduleSlots([]);
                          setFormData((current) => ({
                            ...current,
                            show_time: "",
                          }));
                        }}
                      >
                        Xóa tất cả
                      </button>
                    ) : null}
                  </div>
                  {autoScheduleSlots.length > 0 ? (
                    <div className="showtime-auto-slot-list">
                      {autoScheduleSlots.map((slot) => (
                        <span
                          className={`showtime-auto-slot ${
                            formData.show_time === formatTimeInputValue(slot)
                              ? "selected"
                              : ""
                          }`}
                          key={slot.toISOString()}
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            setFormData((current) => ({
                              ...current,
                              show_time: formatTimeInputValue(slot),
                            }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setFormData((current) => ({
                                ...current,
                                show_time: formatTimeInputValue(slot),
                              }));
                            }
                          }}
                          title={`Chọn khung ${formatTimeInputValue(slot)}`}
                        >
                          {formatTimeInputValue(slot)}
                          <button
                            type="button"
                            className="showtime-auto-slot-remove"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeAutoScheduleSlot(slot);
                            }}
                            aria-label={`Xóa khung ${formatTimeInputValue(slot)}`}
                            title={`Xóa khung ${formatTimeInputValue(slot)}`}
                          >
                            <HiOutlineX />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="showtime-auto-empty">
                      Bấm Tự động xếp lịch để hệ thống đề xuất khung giờ trống, đã chừa tối thiểu 30 phút dọn phòng.
                    </p>
                  )}
                </div>
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
                  <span className="form-hint">
                    Tự tính từ bảng giá chuẩn khi chọn phòng và ngày chiếu.
                  </span>
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
                  {formatDateTime(buildStartDateTime(formData))}
                </span>
                <span>
                  <HiOutlineCash />
                  {formatCurrency(formData.base_price)}
                </span>
                <span>
                  <HiOutlineCash />
                  Thường {formatCurrency(formData.normal_price)} · VIP {formatCurrency(formData.vip_price)} · Đôi {formatCurrency(formData.couple_price)}
                </span>
                <span>
                  <HiOutlineCash />
                  {priceMode === "auto" ? "Đang áp dụng giá chuẩn" : "Đang dùng giá ngoại lệ"}
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
            <h3>
              {deleteTarget?.mode === "group"
                ? "Xác nhận hủy nhóm suất chiếu"
                : "Xác nhận hủy khung giờ chiếu"}
            </h3>
            <p>
              {deleteTarget?.mode === "group"
                ? `Bạn có chắc chắn muốn hủy ${deleteTarget?.showtimes?.length || 0} khung giờ trong nhóm này?`
                : "Bạn có chắc chắn muốn hủy khung giờ chiếu này?"}
              <br />
              Suất chiếu sẽ chuyển sang trạng thái đã hủy và không bị xóa cứng.
            </p>
            <div className="showtime-delete-meta">
              <strong>{deleteTarget?.title || "Suất chiếu"}</strong>
              <span>{deleteTarget?.subtitle || ""}</span>
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
                {deletingShowtimeId
                  ? "Đang hủy..."
                  : "Xác nhận hủy"}
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
        ) : groupedShowtimes.length === 0 ? (
          <div className="empty-state">{text.noShowtimes}</div>
        ) : (
          <div className="table-container">
            <table className="data-table showtime-group-table">
              <thead>
                <tr>
                  <th>{text.movie}</th>
                  <th>Phòng chiếu</th>
                  <th>Ngày chiếu</th>
                  <th>Các khung giờ</th>
                  <th>Giá vé</th>
                  <th style={{ width: "110px", textAlign: "center" }}>
                    {text.tableActions}
                  </th>
                </tr>
              </thead>
              <tbody>
                {groupedShowtimes.map((group) => (
                  <tr key={group.key}>
                    <td>
                      <div className="showtime-movie-cell">
                        <div className="showtime-movie-poster">
                          {group.moviePoster ? (
                            <img src={group.moviePoster} alt={group.movieTitle} />
                          ) : (
                            <span>Poster</span>
                          )}
                        </div>
                        <strong title={group.movieTitle}>
                          {group.movieTitle}
                        </strong>
                      </div>
                    </td>
                    <td>
                      <div className="showtime-room-cell">
                        <strong>{group.roomName}</strong>
                      </div>
                    </td>
                    <td>{formatDateOnly(group.startDate)}</td>
                    <td>
                      <div className="showtime-slot-list">
                        {group.showtimes.map((showtime) => (
                          <button
                            key={getShowtimeId(showtime)}
                            type="button"
                            className={`showtime-slot-chip ${showtime.status || "scheduled"}`}
                            onClick={() => openDeleteModal(showtime)}
                            disabled={!canCancelShowtime(showtime)}
                            title={`Hủy suất ${showtime.startTime || "-"} - ${statusLabels[showtime.status] || showtime.status || "-"}`}
                          >
                            <span>{showtime.startTime || "-"}</span>
                            <small>
                              {statusLabels[showtime.status] ||
                                showtime.status ||
                                "-"}
                            </small>
                          </button>
                        ))}
                      </div>
                    </td>
                    <td>
                      <strong className="showtime-price-cell">
                        {formatCurrency(group.basePrice)}
                      </strong>
                    </td>
                    <td>
                      <div className="showtime-row-actions">
                        <button
                          type="button"
                          className="btn btn-icon btn-ghost"
                          style={{ color: "var(--color-info)" }}
                          onClick={() => {
                            const editableShowtime =
                              group.showtimes.find(canEditShowtime);
                            if (editableShowtime) {
                              openEditForm(editableShowtime, group.showtimes);
                            }
                          }}
                          disabled={!group.showtimes.some(canEditShowtime)}
                          title="Sửa suất chiếu có thể chỉnh sửa đầu tiên trong nhóm"
                          id={`btn-edit-showtime-group-${group.key}`}
                        >
                          <HiOutlinePencil />
                        </button>
                        <button
                          type="button"
                          className="btn btn-icon btn-ghost"
                          style={{ color: "var(--color-danger)" }}
                          onClick={() => openDeleteGroupModal(group)}
                          disabled={
                            Boolean(deletingShowtimeId) ||
                            !group.showtimes.some(canCancelShowtime)
                          }
                          title="Hủy tất cả khung giờ có thể hủy trong nhóm"
                          id={`btn-delete-showtime-group-${group.key}`}
                        >
                          <HiOutlineTrash />
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
