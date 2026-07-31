import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getShowtimeSeats, holdShowtimeSeats, releaseShowtimeSeats } from "../services/showtimeSeatService";
import { getShowtimesByMovie } from "../services/showtimeService";
import { cancelBooking, createBooking, payBooking } from "../services/bookingService";
import { getAvailableConcessions } from "../services/concessionService";
import { verifyVoucher } from "../services/voucherService";
import { useAuth } from "../hooks/useAuth";
import { buildRelativeDateOptions, getShowtimeDateValue } from "../utils/dateTime";

const SEAT_TYPES = {
  normal: { label: "Ghế thường", color: "bg-slate-600", selected: "bg-sky-500" },
  vip: { label: "Ghế VIP", color: "bg-amber-500/70", selected: "bg-amber-500" },
  couple: { label: "Ghế đôi", color: "bg-fuchsia-500/70", selected: "bg-fuchsia-500" },
};

function normalizeText(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function getSeatType(seat) {
  const name = normalizeText(seat?.seat_id?.seat_type_id?.name);
  if (name.includes("vip")) return "vip";
  if (name.includes("doi") || name.includes("couple") || name.includes("double")) return "couple";
  return "normal";
}

function getCoupleSeatClass({ type, seats, seatIndex }) {
  if (type !== "couple") return "";

  let previousCoupleCount = 0;
  for (let index = seatIndex - 1; index >= 0; index -= 1) {
    if (getSeatType(seats[index]) !== "couple") break;
    previousCoupleCount += 1;
  }

  const hasNextCouple = getSeatType(seats[seatIndex + 1]) === "couple";
  const isPairStart = previousCoupleCount % 2 === 0 && hasNextCouple;
  const isPairEnd = previousCoupleCount % 2 === 1;

  if (isPairStart) return "rounded-r-none border-r-0";
  if (isPairEnd) return "-ml-2 rounded-l-none border-l border-fuchsia-300/30";
  return "";
}

function getCoupleSeatPair(targetSeat, allSeats) {
  if (getSeatType(targetSeat) !== "couple") return [targetSeat];

  const targetRow = targetSeat?.seat_id?.seat_row;
  const rowSeats = allSeats
    .filter((seat) => seat?.seat_id?.seat_row === targetRow)
    .sort((first, second) => Number(first.seat_id?.seat_number) - Number(second.seat_id?.seat_number));
  const seatIndex = rowSeats.findIndex((seat) => seat._id === targetSeat._id);

  if (seatIndex < 0) return null;

  let previousCoupleCount = 0;
  for (let index = seatIndex - 1; index >= 0; index -= 1) {
    if (getSeatType(rowSeats[index]) !== "couple") break;
    previousCoupleCount += 1;
  }

  const pairIndex = previousCoupleCount % 2 === 1 ? seatIndex - 1 : seatIndex + 1;
  const pairSeat = rowSeats[pairIndex];

  if (!pairSeat || getSeatType(pairSeat) !== "couple") return null;

  return [targetSeat, pairSeat].sort(
    (first, second) => Number(first.seat_id?.seat_number) - Number(second.seat_id?.seat_number),
  );
}

function calculateSelectedSeatTotal(selectedSeats, allSeats) {
  const selectedIds = new Set(selectedSeats.map((seat) => seat._id));
  const countedIds = new Set();

  return selectedSeats.reduce((total, seat) => {
    if (countedIds.has(seat._id)) return total;

    if (getSeatType(seat) !== "couple") {
      countedIds.add(seat._id);
      return total + Number(seat.price || 0);
    }

    const pair = getCoupleSeatPair(seat, allSeats);
    const selectedPair =
      pair?.length === 2 && pair.every((pairSeat) => selectedIds.has(pairSeat._id));

    if (selectedPair) {
      pair.forEach((pairSeat) => countedIds.add(pairSeat._id));
      return total + Number(pair[0].price || 0);
    }

    countedIds.add(seat._id);
    return total + Number(seat.price || 0);
  }, 0);
}

function getShowtimeId(showtime) {
  return showtime?.id || showtime?._id || "";
}

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function getUserId(user) {
  return user?._id || user?.id || "";
}

function getSeatHolderId(seat) {
  const holder = seat?.held_by;
  if (!holder) return "";
  return String(
    typeof holder === "object"
      ? holder._id || holder.id || holder.$oid || ""
      : holder,
  );
}

function getSeatStatus(seat) {
  return String(seat?.status || "available").trim().toLowerCase();
}

function resolveImageUrl(image) {
  if (!image) return "";
  if (/^https?:\/\//i.test(image)) return image;

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${image.startsWith("/") ? image : `/${image}`}`;
}

function isHeldSeat(seat) {
  const status = getSeatStatus(seat);
  return (
    ["held", "hold", "holding", "reserved", "selected"].includes(status) ||
    Boolean(seat?.held_by) ||
    Boolean(seat?.hold_expires_at)
  );
}

function isBookedSeat(seat) {
  return getSeatStatus(seat) === "booked";
}

function BookingModal({ movie, initialShowtime = null, onClose, variant = "modal" }) {
  const navigate = useNavigate();
  const { user, isAuthenticated, login, logout } = useAuth();
  const [dateOptions] = useState(() => buildRelativeDateOptions(4));
  const [selectedDate, setSelectedDate] = useState(dateOptions[0]);
  const [showtimes, setShowtimes] = useState([]);
  const [selectedShowtime, setSelectedShowtime] = useState(null);
  const [showtimeSeats, setShowtimeSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [step, setStep] = useState("select-showtime");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSeats, setIsLoadingSeats] = useState(false);
  const [error, setError] = useState("");
  const [seatError, setSeatError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [bookingResult, setBookingResult] = useState(null);
  const [confirmedBookingSummary, setConfirmedBookingSummary] = useState(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [concessions, setConcessions] = useState([]);
  const [selectedConcessions, setSelectedConcessions] = useState({});
  const [isLoadingConcessions, setIsLoadingConcessions] = useState(false);
  const [concessionError, setConcessionError] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState("");
  const [voucherMessage, setVoucherMessage] = useState("");
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const initialShowtimeId = getShowtimeId(initialShowtime);
  const currentUserId = getUserId(user);
  const selectedSeatsRef = useRef([]);
  const bookingResultRef = useRef(null);

  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
  }, [selectedSeats]);

  useEffect(() => {
    bookingResultRef.current = bookingResult;
  }, [bookingResult]);

  const releaseHeldSeats = useCallback(async ({ resetState = true } = {}) => {
    const seatIds = selectedSeatsRef.current.map((seat) => seat._id);

    if (!seatIds.length || bookingResultRef.current) return true;

    try {
      await releaseShowtimeSeats(seatIds);
      if (resetState) {
        setSelectedSeats([]);
        setHoldExpiresAt(null);
        setRemainingSeconds(0);
      }
      return true;
    } catch {
      if (resetState) setSeatError("Không thể hủy giữ ghế lúc này.");
      return false;
    }
  }, []);

  useEffect(() => () => {
    void releaseHeldSeats({ resetState: false });
  }, [releaseHeldSeats]);

  useEffect(() => {
    if (!movie?._id) return;

    const initialDateValue = getShowtimeDateValue(initialShowtime);
    const nextDate =
      dateOptions.find((option) => option.value === initialDateValue) ||
      dateOptions[0];

    setSelectedDate(nextDate);
    setShowtimes([]);
    setSelectedShowtime(null);
    setShowtimeSeats([]);
    setSelectedSeats([]);
    setStep(initialShowtimeId ? "select-seat" : "select-showtime");
    setIsLoadingSeats(false);
    setError("");
    setSeatError("");
    setBookingResult(null);
    setConfirmedBookingSummary(null);
    setHoldExpiresAt(null);
    setRemainingSeconds(0);
    setSelectedConcessions({});
    setVoucherCode("");
    setAppliedVoucher(null);
    setVoucherError("");
    setVoucherMessage("");
    setShowAuthPrompt(false);
    setAuthForm({ email: "", password: "" });
    setAuthError("");
  }, [movie?._id, initialShowtimeId]);

  useEffect(() => {
    if (!movie?._id) return undefined;
    if (initialShowtimeId) return undefined;
    let isActive = true;
    async function loadShowtimes() {
      try {
        setIsLoading(true);
        setError("");
        const response = await getShowtimesByMovie(movie._id, { date: selectedDate.value });
        if (isActive) setShowtimes(response?.data || []);
      } catch (requestError) {
        if (isActive) {
          setShowtimes([]);
          setError(requestError.response?.data?.message || "Không thể tải suất chiếu.");
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }
    loadShowtimes();
    return () => { isActive = false; };
  }, [initialShowtimeId, movie?._id, selectedDate.value]);

  useEffect(() => {
    if (!movie?._id) return undefined;

    let isActive = true;

    async function loadConcessions() {
      try {
        setIsLoadingConcessions(true);
        setConcessionError("");
        const response = await getAvailableConcessions();
        const payload = response?.data || {};
        const list = Array.isArray(payload) ? payload : payload.data || [];
        if (isActive) setConcessions(list.filter((item) => item.status));
      } catch (requestError) {
        if (isActive) {
          setConcessions([]);
          setConcessionError(requestError.response?.data?.message || "Không thể tải dịch vụ bắp nước.");
        }
      } finally {
        if (isActive) setIsLoadingConcessions(false);
      }
    }

    loadConcessions();
    return () => {
      isActive = false;
    };
  }, [movie?._id]);

  useEffect(() => {
    if (!movie?._id || !initialShowtimeId || !initialShowtime) {
      return undefined;
    }

    let isActive = true;

    async function loadInitialShowtimeSeats() {
      setSelectedShowtime(initialShowtime);
      setSelectedSeats([]);
      setSeatError("");
      setStep("select-seat");

      try {
        setIsLoadingSeats(true);
        const response = await getShowtimeSeats(initialShowtimeId);
        if (isActive) setShowtimeSeats(response?.data || []);
      } catch (requestError) {
        if (isActive) {
          setShowtimeSeats([]);
          setSeatError(requestError.response?.data?.message || "Không thể tải sơ đồ ghế.");
        }
      } finally {
        if (isActive) setIsLoadingSeats(false);
      }
    }

    loadInitialShowtimeSeats();

    return () => {
      isActive = false;
    };
  }, [initialShowtime, initialShowtimeId, movie?._id]);

  useEffect(() => {
    if (!holdExpiresAt) return undefined;
    const updateCountdown = () => {
      const seconds = Math.max(0, Math.ceil((new Date(holdExpiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds === 0) {
        setSelectedSeats([]);
        setHoldExpiresAt(null);
        setSeatError("Thời gian giữ ghế đã hết. Vui lòng chọn lại ghế.");
      }
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [holdExpiresAt]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setShowAuthPrompt(false);
    setAuthError("");
  }, [isAuthenticated]);

  useEffect(() => {
    const showtimeId = getShowtimeId(selectedShowtime);
    if (!showtimeId || step !== "select-seat") return undefined;

    let isActive = true;
    const syncSeats = async () => {
      try {
        const response = await getShowtimeSeats(showtimeId);
        if (isActive) setShowtimeSeats(response?.data || []);
      } catch {
        if (isActive) setSeatError("Không thể đồng bộ trạng thái ghế mới nhất.");
      }
    };

    const timer = window.setInterval(syncSeats, 3000);
    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, [selectedShowtime, step]);

  const selectedTypeSummary = useMemo(() => {
    const selectedTypes = Array.from(
      new Set(selectedSeats.map((seat) => getSeatType(seat))),
    );

    if (!selectedTypes.length) return "Chưa chọn";

    return selectedTypes.map((type) => SEAT_TYPES[type]?.label || "Ghế").join(", ");
  }, [selectedSeats]);
  const seatTotal = useMemo(
    () => calculateSelectedSeatTotal(selectedSeats, showtimeSeats),
    [selectedSeats, showtimeSeats],
  );

  const selectedConcessionItems = useMemo(
    () =>
      concessions
        .map((item) => ({
          ...item,
          quantity: Number(selectedConcessions[item._id] || 0),
        }))
        .filter((item) => item.quantity > 0),
    [concessions, selectedConcessions],
  );

  const concessionTotal = useMemo(
    () =>
      selectedConcessionItems.reduce(
        (total, item) => total + Number(item.price || 0) * item.quantity,
        0,
      ),
    [selectedConcessionItems],
  );

  const totalPrice = seatTotal + concessionTotal;
  const discountAmount = Number(appliedVoucher?.discount_amount || 0);
  const finalTotal = appliedVoucher
    ? Number(appliedVoucher.final_amount ?? Math.max(totalPrice - discountAmount, 0))
    : totalPrice;

  useEffect(() => {
    if (!appliedVoucher) return;
    setAppliedVoucher(null);
    setVoucherMessage("");
    setVoucherError("Tổng đơn đã thay đổi. Vui lòng áp dụng lại mã giảm giá.");
  }, [seatTotal, concessionTotal]);

  const seatPriceNotes = useMemo(() => {
    const priceByType = new Map();

    showtimeSeats.forEach((seat) => {
      const type = getSeatType(seat);
      const price = Number(seat.price);

      if (!Number.isFinite(price) || priceByType.has(type)) return;
      priceByType.set(type, price);
    });

    return ["normal", "vip", "couple"]
      .filter((type) => priceByType.has(type))
      .map((type) => ({
        type,
        label: `${SEAT_TYPES[type]?.label || "Ghế"}${type === "couple" ? " / cặp" : ""}`,
        price: priceByType.get(type),
      }));
  }, [showtimeSeats]);

  const seatsByRow = useMemo(() => {
    const rows = new Map();
    showtimeSeats.forEach((seat) => {
      const row = seat.seat_id?.seat_row || "?";
      if (!rows.has(row)) rows.set(row, []);
      rows.get(row).push(seat);
    });
    return Array.from(rows.entries())
      .sort(([firstRow], [secondRow]) => firstRow.localeCompare(secondRow))
      .map(([row, seats]) => [
        row,
        seats.sort((first, second) => Number(first.seat_id?.seat_number) - Number(second.seat_id?.seat_number)),
      ]);
  }, [showtimeSeats]);

  const seatColumnCount = useMemo(
    () =>
      Math.max(
        1,
        ...showtimeSeats.map((seat) => Number(seat.seat_id?.seat_number || 0)),
      ),
    [showtimeSeats],
  );

  if (!movie) return null;

  const handleDateChange = async (dateOption) => {
    await releaseHeldSeats();
    setSelectedDate(dateOption);
    setSelectedShowtime(null);
    setShowtimeSeats([]);
    setSelectedSeats([]);
    setStep("select-showtime");
  };

  const handleShowtimeSelect = async (showtime) => {
    await releaseHeldSeats();
    const showtimeId = getShowtimeId(showtime);
    setSelectedShowtime(showtime);
    setSelectedSeats([]);
    setSeatError("");
    setStep("select-seat");
    try {
      setIsLoadingSeats(true);
      const response = await getShowtimeSeats(showtimeId);
      setShowtimeSeats(response?.data || []);
    } catch (requestError) {
      setShowtimeSeats([]);
      setSeatError(requestError.response?.data?.message || "Không thể tải sơ đồ ghế.");
    } finally {
      setIsLoadingSeats(false);
    }
  };

  const updateConcessionQuantity = (item, nextQuantity) => {
    const stock = Number(item.stock ?? 0);
    const quantity = Math.min(Math.max(Number(nextQuantity) || 0, 0), stock);

    setSelectedConcessions((current) => {
      const next = { ...current };
      if (quantity <= 0) {
        delete next[item._id];
      } else {
        next[item._id] = quantity;
      }
      return next;
    });
  };

  const toggleSeat = async (seat) => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      setAuthError("");
      setSeatError("Vui lòng đăng nhập trước khi chọn ghế.");
      return;
    }

    const couplePair = getCoupleSeatPair(seat, showtimeSeats);
    const seatsToToggle = couplePair || [seat];
    const isCoupleSeat = getSeatType(seat) === "couple";
    const selectedSeatIds = new Set(selectedSeats.map((item) => item._id));
    const selectedSeatsInGroup = seatsToToggle.filter((item) => selectedSeatIds.has(item._id));
    const exists = selectedSeatsInGroup.length > 0;

    if (getSeatStatus(seat) !== "available" && !exists) return;

    if (isCoupleSeat && !couplePair) {
      setSeatError("Ghế đôi này chưa có đủ cặp liền kề để đặt vé.");
      return;
    }

    if (exists) {
      const releaseIds = selectedSeatsInGroup.map((item) => item._id);
      try {
        await releaseShowtimeSeats(releaseIds);
      } catch (requestError) {
        if (requestError.response?.status === 401) {
          logout();
          setShowAuthPrompt(true);
          setAuthError("");
          setSeatError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        } else {
          setSeatError("Không thể bỏ giữ ghế lúc này.");
        }
        return;
      }
      setSelectedSeats((current) =>
        current.filter((item) => !releaseIds.includes(item._id)),
      );
      if (selectedSeats.length === releaseIds.length) setHoldExpiresAt(null);
      setSeatError("");
      return;
    }

    const unavailablePairSeat = seatsToToggle.find((item) => {
      const itemSelected = selectedSeatIds.has(item._id);
      return getSeatStatus(item) !== "available" && !itemSelected;
    });
    if (unavailablePairSeat) {
      setSeatError("Cặp ghế đôi này đã có ghế không còn trống.");
      return;
    }

    const newSeats = seatsToToggle.filter((item) => !selectedSeatIds.has(item._id));

    try {
      const response = await holdShowtimeSeats(getShowtimeId(selectedShowtime), [
        ...selectedSeats.map((item) => item._id),
        ...newSeats.map((item) => item._id),
      ]);
      setSelectedSeats((current) => {
        const currentIds = new Set(current.map((item) => item._id));
        return [
          ...current,
          ...newSeats.filter((item) => !currentIds.has(item._id)),
        ];
      });
      setHoldExpiresAt(response.data.expires_at);
      setSeatError("");
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        logout();
        setShowAuthPrompt(true);
        setAuthError("");
        setSeatError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại trước khi chọn ghế.");
        return;
      }

      setSeatError(requestError.response?.data?.message || "Không thể giữ ghế này.");
      try {
        const latestSeats = await getShowtimeSeats(getShowtimeId(selectedShowtime));
        setShowtimeSeats(latestSeats?.data || []);
      } catch {
        setSeatError(requestError.response?.data?.message || "Không thể giữ ghế này.");
      }
    }
  };

  const applyVoucher = async () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      setAuthError("");
      setVoucherError("Vui lòng đăng nhập để áp dụng mã giảm giá.");
      return;
    }

    const code = voucherCode.trim().toUpperCase();
    if (!code) {
      setVoucherError("Vui lòng nhập mã giảm giá.");
      return;
    }

    if (totalPrice <= 0) {
      setVoucherError("Vui lòng chọn vé hoặc bắp nước trước khi áp dụng mã.");
      return;
    }

    try {
      setIsApplyingVoucher(true);
      setVoucherError("");
      setVoucherMessage("");
      const response = await verifyVoucher({
        code,
        order_amount: totalPrice,
        ticket_amount: seatTotal,
        concession_amount: concessionTotal,
        movie_id: movie._id,
      });
      const result = response.data;

      if (!result?.valid) {
        setAppliedVoucher(null);
        setVoucherError(result?.message || "Mã giảm giá không hợp lệ.");
        return;
      }

      setAppliedVoucher(result);
      setVoucherCode(result.voucher?.code || code);
      setVoucherMessage(`Đã áp dụng mã ${result.voucher?.code || code}`);
    } catch (requestError) {
      setAppliedVoucher(null);
      setVoucherError(requestError.response?.data?.message || "Không thể áp dụng mã giảm giá.");
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherError("");
    setVoucherMessage("");
  };

  const syncSelectedSeatsBeforeSubmit = async () => {
    const showtimeId = getShowtimeId(selectedShowtime);
    const seatIds = selectedSeats.map((seat) => seat._id);

    if (!showtimeId || !seatIds.length) return false;

    try {
      const latestSeatsResponse = await getShowtimeSeats(showtimeId);
      const latestSeats = latestSeatsResponse?.data || [];
      const latestSeatMap = new Map(latestSeats.map((seat) => [seat._id, seat]));
      const unavailableSeat = seatIds.some((seatId) => {
        const latestSeat = latestSeatMap.get(seatId);
        return !latestSeat || isBookedSeat(latestSeat);
      });

      setShowtimeSeats(latestSeats);

      if (unavailableSeat) {
        setSeatError("Một số ghế vừa được đặt bởi người khác. Vui lòng chọn lại ghế.");
        setSelectedSeats((current) =>
          current.filter((seat) => {
            const latestSeat = latestSeatMap.get(seat._id);
            return latestSeat && !isBookedSeat(latestSeat);
          }),
        );
        return false;
      }

      const holdResponse = await holdShowtimeSeats(showtimeId, seatIds);
      setHoldExpiresAt(holdResponse.data.expires_at);
      setSeatError("");
      return true;
    } catch (requestError) {
      setSeatError(requestError.response?.data?.message || "Không thể kiểm tra trạng thái ghế mới nhất.");
      try {
        const latestSeats = await getShowtimeSeats(showtimeId);
        setShowtimeSeats(latestSeats?.data || []);
      } catch {
        // Keep the validation message from the first request.
      }
      return false;
    }
  };

  const finalizeBooking = async () => {
    try {
      setIsSubmitting(true);
      setSeatError("");

      const canContinue = await syncSelectedSeatsBeforeSubmit();
      if (!canContinue) return;

      const bookingSummary = {
        movieTitle: movie.title,
        dateLabel: `${selectedDate.fullLabel || selectedDate.label} · ${selectedDate.displayDate}`,
        showtimeLabel: selectedShowtime?.startTime || "Chưa chọn",
        roomName: selectedShowtime?.roomName || "Chưa chọn",
        seatType: selectedTypeSummary,
        seatLabels: selectedSeats.map((seat) => `${seat.seat_id?.seat_row}${seat.seat_id?.seat_number}`),
        seatTotal,
        concessionTotal,
        concessionItems: selectedConcessionItems.map((item) => ({
          id: item._id,
          name: item.name,
          quantity: item.quantity,
          subtotal: Number(item.price || 0) * item.quantity,
        })),
        voucherCode: appliedVoucher?.voucher?.code || "",
        discountAmount,
        totalPrice,
        finalTotal,
      };
      const response = await createBooking({
        showtime_id: getShowtimeId(selectedShowtime),
        showtime_seat_ids: selectedSeats.map((seat) => seat._id),
        combos: selectedConcessionItems.map((item) => ({
          combo_id: item._id,
          quantity: item.quantity,
        })),
        voucher_code: appliedVoucher?.voucher?.code || undefined,
      });
      setBookingResult(response.data);
      setConfirmedBookingSummary({
        ...bookingSummary,
        bookingCode: response.data?.booking_code || response.data?._id,
        bookingId: response.data?._id,
        paymentStatus: response.data?.payment_status || "pending",
      });
      setShowtimeSeats((current) => current.map((seat) =>
        selectedSeats.some((selected) => selected._id === seat._id)
          ? { ...seat, status: "reserved", held_by: currentUserId }
          : seat,
      ));
      setSelectedSeats([]);
      setSelectedConcessions({});
      setAppliedVoucher(null);
      setVoucherCode("");
      setVoucherError("");
      setVoucherMessage("");
      setPaymentError("");
    } catch (requestError) {
      setSeatError(requestError.response?.data?.message || "Đặt vé không thành công.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const completePayment = async () => {
    const bookingId = bookingResult?._id || confirmedBookingSummary?.bookingId;
    if (!bookingId) return;

    try {
      setIsPaying(true);
      setPaymentError("");
      const response = await payBooking(bookingId, { payment_provider: "internal" });
      setBookingResult(response.data);
      setConfirmedBookingSummary((current) => ({
        ...current,
        bookingCode: response.data?.booking_code || current?.bookingCode,
        bookingId: response.data?._id || current?.bookingId,
        discountAmount: Number(response.data?.discount_amount ?? current?.discountAmount ?? 0),
        finalTotal: Number(response.data?.total_price ?? current?.finalTotal ?? 0),
        paymentStatus: response.data?.payment_status || "paid",
      }));
    } catch (requestError) {
      setPaymentError(requestError.response?.data?.message || "Thanh toán không thành công.");
    } finally {
      setIsPaying(false);
    }
  };

  const cancelPendingBooking = async () => {
    const bookingId = bookingResult?._id || confirmedBookingSummary?.bookingId;
    if (!bookingId || bookingIsPaid) return;

    try {
      setIsCancellingBooking(true);
      setPaymentError("");
      await cancelBooking(bookingId, { reason: "Khách hủy trước khi thanh toán" });
      setBookingResult(null);
      setConfirmedBookingSummary(null);
      setSelectedSeats([]);
      setHoldExpiresAt(null);
      setRemainingSeconds(0);
      setStep("select-seat");
      const showtimeId = getShowtimeId(selectedShowtime);
      if (showtimeId) {
        const latestSeats = await getShowtimeSeats(showtimeId);
        setShowtimeSeats(latestSeats?.data || []);
      }
      setSeatError("Đã hủy đơn chờ thanh toán. Bạn có thể chọn lại ghế.");
    } catch (requestError) {
      setPaymentError(requestError.response?.data?.message || "Không thể hủy đơn đặt vé.");
    } finally {
      setIsCancellingBooking(false);
    }
  };

  const submitBooking = async () => {
    if (!selectedSeats.length || !selectedShowtime) return;

    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      setAuthError("");
      setSeatError("");
      return;
    }

    await finalizeBooking();
  };

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((current) => ({ ...current, [name]: value }));
    setAuthError("");
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");
    setIsAuthenticating(true);

    try {
      await login(authForm);
      setShowAuthPrompt(false);
      setAuthForm({ email: "", password: "" });
      if (selectedSeats.length && selectedShowtime) {
        await finalizeBooking();
      }
    } catch (requestError) {
      setAuthError(requestError.response?.data?.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const isPageVariant = variant === "page";
  const isInlineVariant = variant === "inline";
  const isEmbeddedVariant = isPageVariant || isInlineVariant;
  const shellClassName = isPageVariant
    ? "mx-auto w-[min(1320px,calc(100%_-_40px))] py-10 max-sm:w-[calc(100%_-_28px)]"
    : isInlineVariant
      ? "w-full pt-8"
    : "fixed inset-0 z-[60] grid place-items-center bg-black/75 px-5 py-8 backdrop-blur-sm";
  const panelClassName = isPageVariant
    ? "min-h-[calc(100vh_-_180px)] rounded-3xl border border-white/10 bg-[#101722] p-7 shadow-[0_30px_90px_rgba(0,0,0,0.35)] md:p-8"
    : isInlineVariant
      ? "rounded-3xl border border-white/10 bg-[#101722] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] md:p-7"
    : "max-h-[90vh] w-[min(1000px,100%)] overflow-y-auto rounded-3xl border border-white/10 bg-[#101722] p-7 shadow-[0_30px_90px_rgba(0,0,0,0.55)] md:p-8";
  const handleClose = async () => {
    await releaseHeldSeats();
    onClose?.();
  };
  const viewMyTickets = () => {
    navigate("/tai-khoan?tab=tickets");
  };
  const bookingIsPaid = bookingResult?.payment_status === "paid" || confirmedBookingSummary?.paymentStatus === "paid";

  return (
    <div className={shellClassName} onClick={isEmbeddedVariant ? undefined : handleClose} role={isEmbeddedVariant ? undefined : "dialog"} aria-modal={isEmbeddedVariant ? undefined : "true"} aria-label={`Đặt vé phim ${movie.title}`}>
      <div className={panelClassName} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-5">
          <div><p className="text-sm font-bold uppercase tracking-[0.2em] text-[#ff6070]">Đặt vé</p><h2 className="mt-2 text-3xl font-black text-white max-sm:text-2xl">{movie.title}</h2></div>
          <button className="grid h-10 shrink-0 place-items-center rounded-full bg-white/10 px-4 text-sm font-black text-white hover:bg-[#ff6070]" type="button" aria-label={isPageVariant ? "Quay lại lịch chiếu" : "Đóng đặt vé"} onClick={handleClose}>{isPageVariant ? "← Lịch chiếu" : "×"}</button>
        </div>

        {bookingResult && confirmedBookingSummary ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className={`rounded-3xl border p-7 ${bookingIsPaid ? "border-emerald-400/20 bg-emerald-400/10" : "border-amber-400/20 bg-amber-400/10"}`}>
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className={`text-sm font-black uppercase tracking-[0.22em] ${bookingIsPaid ? "text-emerald-200" : "text-amber-200"}`}>{bookingIsPaid ? "Đặt vé thành công" : "Chờ thanh toán"}</p>
                  <h3 className="mt-3 text-3xl font-black text-white max-sm:text-2xl">{confirmedBookingSummary.movieTitle}</h3>
                  {!bookingIsPaid && <p className="mt-3 max-w-2xl text-sm leading-6 text-amber-100/90">Đơn đã được tạo và ghế đang được giữ cho bạn. Hoàn tất thanh toán để nhận vé trong tài khoản.</p>}
                </div>
                <div className={`rounded-2xl border bg-black/20 px-5 py-4 text-right ${bookingIsPaid ? "border-emerald-300/20" : "border-amber-300/20"}`}>
                  <p className={`text-xs font-bold uppercase tracking-[0.18em] ${bookingIsPaid ? "text-emerald-200" : "text-amber-200"}`}>{bookingIsPaid ? "Mã vé" : "Mã đơn"}</p>
                  <strong className="mt-1 block text-lg text-white">{confirmedBookingSummary.bookingCode}</strong>
                </div>
              </div>

              <div className="mt-7 grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-slate-300 md:grid-cols-2">
                <p><span className="text-slate-500">Ngày:</span> {confirmedBookingSummary.dateLabel}</p>
                <p><span className="text-slate-500">Suất:</span> {confirmedBookingSummary.showtimeLabel}</p>
                <p><span className="text-slate-500">Phòng:</span> {confirmedBookingSummary.roomName}</p>
                <p><span className="text-slate-500">Loại:</span> {confirmedBookingSummary.seatType}</p>
                <p className="md:col-span-2"><span className="text-slate-500">Ghế:</span> <strong className="text-white">{confirmedBookingSummary.seatLabels.join(", ")}</strong></p>
              </div>

              {confirmedBookingSummary.concessionItems.length > 0 && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-5">
                  <p className="text-sm font-black text-white">Bắp nước</p>
                  <div className="mt-3 grid gap-2 text-sm text-slate-300">
                    {confirmedBookingSummary.concessionItems.map((item) => (
                      <p className="flex justify-between gap-4" key={item.id}>
                        <span>{item.name} x{item.quantity}</span>
                        <strong className="text-white">{formatCurrency(item.subtotal)}</strong>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {paymentError && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">{paymentError}</p>}

              <div className="mt-6 flex flex-wrap gap-3">
                {bookingIsPaid ? (
                  <button className="h-12 rounded-full bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] px-7 text-sm font-extrabold text-white" type="button" onClick={viewMyTickets}>
                    Xem vé của tôi
                  </button>
                ) : (
                  <button className="h-12 rounded-full bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] px-7 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={completePayment} disabled={isPaying}>
                    {isPaying ? "Đang thanh toán..." : "Thanh toán"}
                  </button>
                )}
                {!bookingIsPaid && (
                  <button className="h-12 rounded-full border border-red-300/20 bg-red-500/10 px-7 text-sm font-extrabold text-red-100 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={cancelPendingBooking} disabled={isCancellingBooking || isPaying}>
                    {isCancellingBooking ? "Đang hủy..." : "Hủy đặt vé"}
                  </button>
                )}
                <button className="h-12 rounded-full border border-white/10 bg-white/[0.06] px-7 text-sm font-extrabold text-white hover:border-[#ff6070]" type="button" onClick={handleClose}>
                  Đóng
                </button>
              </div>
            </section>

            <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h3 className="text-lg font-black text-white">Thanh toán</h3>
              <div className="mt-5 grid gap-4 text-sm text-slate-300">
                <p className="flex justify-between gap-4"><span className="text-slate-500">Trạng thái</span><strong className={bookingIsPaid ? "text-emerald-200" : "text-amber-200"}>{bookingIsPaid ? "Đã thanh toán" : "Chờ thanh toán"}</strong></p>
                <p className="flex justify-between gap-4"><span className="text-slate-500">Tiền vé</span><strong className="text-white">{formatCurrency(confirmedBookingSummary.seatTotal)}</strong></p>
                <p className="flex justify-between gap-4"><span className="text-slate-500">Bắp nước</span><strong className="text-white">{formatCurrency(confirmedBookingSummary.concessionTotal)}</strong></p>
                {confirmedBookingSummary.voucherCode && <p className="flex justify-between gap-4"><span className="text-slate-500">Voucher</span><strong className="text-emerald-200">{confirmedBookingSummary.voucherCode}</strong></p>}
                <p className="flex justify-between gap-4"><span className="text-slate-500">Tạm tính</span><strong className="text-white">{formatCurrency(confirmedBookingSummary.totalPrice)}</strong></p>
                <p className="flex justify-between gap-4"><span className="text-slate-500">Giảm giá</span><strong className="text-emerald-200">-{formatCurrency(confirmedBookingSummary.discountAmount)}</strong></p>
                <div className="border-t border-white/10 pt-4">
                  <p className="flex justify-between gap-4 text-base"><span className="text-slate-300">Tổng thanh toán</span><strong className="text-[#ff9aa5]">{formatCurrency(confirmedBookingSummary.finalTotal)}</strong></p>
                </div>
              </div>
            </aside>
          </div>
        ) : (
        <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid content-start gap-7">
            {!isInlineVariant && <div><h3 className="text-lg font-black text-white">Chọn ngày</h3><div className="mt-4 flex flex-wrap gap-3">{dateOptions.map((option) => <button key={option.value} type="button" onClick={() => handleDateChange(option)} className={`rounded-full px-5 py-3 text-sm font-extrabold ${selectedDate.value === option.value ? "bg-[#ff6070] text-white" : "bg-white/10 text-slate-200 hover:bg-white/15"}`}>{option.fullLabel} · {option.displayDate}</button>)}</div></div>}

            <div><h3 className="text-lg font-black text-white">{step === "select-seat" ? "Chọn ghế" : "Chọn suất chiếu"}</h3>
              {step === "select-showtime" ? <div className="mt-4 space-y-3">
                {isLoading && <p className="rounded-2xl bg-white/[0.03] px-4 py-3 text-sm text-slate-300">Đang tải suất chiếu...</p>}
                {!isLoading && error && <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
                {!isLoading && !error && !showtimes.length && <p className="rounded-2xl bg-white/[0.03] px-4 py-3 text-sm text-slate-300">Không có suất chiếu cho ngày này.</p>}
                <div className="flex flex-wrap gap-3">{showtimes.map((showtime) => <button key={showtime.id} type="button" onClick={() => handleShowtimeSelect(showtime)} className="rounded-full bg-white/10 px-5 py-3 text-sm font-extrabold text-slate-200 hover:bg-[#ff6070] hover:text-white">{showtime.startTime} · {showtime.roomName}</button>)}</div>
              </div> : <div className="mt-4 space-y-4">
                {!isEmbeddedVariant && (
                  <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-[#ff6070]" type="button" onClick={async () => { await releaseHeldSeats(); setStep("select-showtime"); setSelectedSeats([]); setSeatError(""); }}>← Chọn suất khác</button>
                )}
                <div className="flex flex-wrap gap-4 text-xs text-slate-300">{Object.entries(SEAT_TYPES).map(([type, config]) => <span key={type} className="flex items-center gap-2"><i className={`h-4 w-5 rounded ${config.color}`} />{config.label}</span>)}<span className="flex items-center gap-2"><i className="h-4 w-5 rounded bg-[#ff5364]" />Ghế đang chọn</span><span className="flex items-center gap-2"><i className="h-4 w-5 rounded bg-[#ff8a96]/60" />Đang được giữ</span><span className="flex items-center gap-2"><i className="h-4 w-5 rounded bg-slate-800 opacity-50" />Đã đặt</span></div>
                {seatPriceNotes.length > 0 && (
                  <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-300">
                    {seatPriceNotes.map((item) => (
                      <span key={item.type} className="rounded-full bg-black/20 px-3 py-1.5">
                        {item.label}: <strong className="text-white">{item.price.toLocaleString("vi-VN")}đ</strong>
                      </span>
                    ))}
                  </div>
                )}
                {seatError && <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">{seatError}</p>}
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/15 p-5">
                  <div className="mx-auto mb-7 h-2 w-2/3 rounded-full bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                  <p className="-mt-5 mb-6 text-center text-[10px] uppercase tracking-[0.25em] text-slate-500">Màn hình</p>
                  {isLoadingSeats && <p className="py-8 text-center text-sm text-slate-400">Đang tải sơ đồ ghế...</p>}
                  {!isLoadingSeats && !showtimeSeats.length && <p className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu ghế cho suất chiếu.</p>}
                  <div className="grid min-w-[520px] gap-3">{seatsByRow.map(([row, seats]) => <div key={row} className="flex items-center justify-center gap-3"><span className="w-5 text-center text-xs font-bold text-slate-500">{row}</span><div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${seatColumnCount}, 40px)` }}>{seats.map((seat, seatIndex) => {
                    const type = getSeatType(seat); const config = SEAT_TYPES[type]; const status = getSeatStatus(seat); const selected = selectedSeats.some((item) => item._id === seat._id); const seatHolderId = getSeatHolderId(seat); const heldByOther = isHeldSeat(seat) && (!currentUserId || !seatHolderId || seatHolderId !== currentUserId); const booked = isBookedSeat(seat); const unavailable = status !== "available" && !selected;
                    return <button key={seat._id} type="button" disabled={unavailable} onClick={() => toggleSeat(seat)} title={`${config.label} - ${Number(seat.price).toLocaleString("vi-VN")}đ`} className={`h-9 w-10 rounded-lg text-[11px] font-black text-white transition ${getCoupleSeatClass({ type, seats, seatIndex })} ${selected ? "bg-[#ff5364] shadow-[0_0_0_1px_rgba(255,255,255,0.16),0_10px_22px_rgba(255,83,100,0.25)]" : heldByOther ? "cursor-not-allowed bg-[#ff8a96]/60 text-white/80 shadow-[0_0_0_1px_rgba(255,138,150,0.28)]" : booked ? "cursor-not-allowed bg-slate-800 opacity-40" : unavailable ? "cursor-not-allowed bg-slate-700/70 opacity-60" : `${config.color} hover:brightness-125`}`}>{row}{seat.seat_id?.seat_number}</button>;
                  })}</div><span className="w-5 text-center text-xs font-bold text-slate-500">{row}</span></div>)}</div>
                </div>
              </div>}
            </div>

            {step === "select-seat" && (
              <div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-white">Chọn bắp nước</h3>
                    <p className="mt-1 text-sm text-slate-400">Có thể bỏ qua nếu bạn chỉ muốn đặt vé.</p>
                  </div>
                  {concessionTotal > 0 && (
                    <span className="rounded-full bg-[#ff6070]/15 px-4 py-2 text-sm font-extrabold text-[#ff9aa5]">
                      {concessionTotal.toLocaleString("vi-VN")}đ
                    </span>
                  )}
                </div>

                {isLoadingConcessions && (
                  <p className="mt-4 rounded-2xl bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                    Đang tải dịch vụ bắp nước...
                  </p>
                )}

                {!isLoadingConcessions && concessionError && (
                  <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {concessionError}
                  </p>
                )}

                {!isLoadingConcessions && !concessionError && concessions.length === 0 && (
                  <p className="mt-4 rounded-2xl bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                    Hiện chưa có dịch vụ bắp nước đang bán.
                  </p>
                )}

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {concessions.map((item) => {
                    const quantity = Number(selectedConcessions[item._id] || 0);
                    const stock = Number(item.stock ?? 0);
                    const isSoldOut = stock <= 0;

                    return (
                      <div
                        key={item._id}
                        className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3"
                      >
                        <div className="grid aspect-square place-items-center overflow-hidden rounded-xl bg-black/20 text-slate-500">
                          {item.image ? (
                            <img className="h-full w-full object-cover" src={resolveImageUrl(item.image)} alt={item.name} />
                          ) : (
                            "BN"
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <strong className="block truncate text-sm text-white">{item.name}</strong>
                              <span className="mt-1 block text-xs text-slate-400">
                                {Number(item.price || 0).toLocaleString("vi-VN")}đ
                              </span>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${isSoldOut ? "bg-red-500/10 text-red-200" : "bg-emerald-400/10 text-emerald-200"}`}>
                              {isSoldOut ? "Hết" : `Còn ${stock}`}
                            </span>
                          </div>
                          {item.description && (
                            <p className="mt-2 line-clamp-2 text-xs text-slate-500">{item.description}</p>
                          )}
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={quantity <= 0}
                              onClick={() => updateConcessionQuantity(item, quantity - 1)}
                            >
                              -
                            </button>
                            <span className="min-w-8 text-center text-sm font-black text-white">{quantity}</span>
                            <button
                              type="button"
                              className="grid h-8 w-8 place-items-center rounded-full bg-[#ff6070] text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={isSoldOut || quantity >= stock}
                              onClick={() => updateConcessionQuantity(item, quantity + 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <h3 className="text-lg font-black text-white">Thông tin vé</h3>
            {remainingSeconds > 0 && <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">Thời gian giữ ghế: <strong>{String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:{String(remainingSeconds % 60).padStart(2, "0")}</strong></div>}
            {bookingResult && <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"><strong>Đặt vé thành công!</strong><br />Mã đơn: {bookingResult._id}</div>}

            <div className="mt-5 grid gap-4 text-sm text-slate-300">
              <p><span className="text-slate-500">Ngày:</span> {selectedDate.fullLabel || selectedDate.label} · {selectedDate.displayDate}</p>
              <p><span className="text-slate-500">Suất:</span> {selectedShowtime?.startTime || "Chưa chọn"}</p>
              <p><span className="text-slate-500">Phòng:</span> {selectedShowtime?.roomName || "Chưa chọn"}</p>
              <p><span className="text-slate-500">Loại:</span> {selectedTypeSummary}</p>
              <p><span className="text-slate-500">Ghế:</span> {selectedSeats.length ? selectedSeats.map((seat) => `${seat.seat_id?.seat_row}${seat.seat_id?.seat_number}`).join(", ") : "Chưa chọn"}</p>
	              <p><span className="text-slate-500">Tiền vé:</span> <strong className="text-white">{formatCurrency(seatTotal)}</strong></p>
	              <p><span className="text-slate-500">Bắp nước:</span> <strong className="text-white">{formatCurrency(concessionTotal)}</strong></p>
	              {selectedConcessionItems.length > 0 && <div className="grid gap-1 rounded-xl bg-black/15 p-3 text-xs text-slate-400">{selectedConcessionItems.map((item) => <p key={item._id}>{item.name} x{item.quantity}: {formatCurrency(Number(item.price || 0) * item.quantity)}</p>)}</div>}

              <div className="rounded-xl border border-white/10 bg-black/15 p-3">
                <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Mã giảm giá</label>
                <div className="mt-2 flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold uppercase text-white outline-none placeholder:text-slate-600 focus:border-[#ff6070]"
                    value={voucherCode}
                    placeholder="AURA20"
                    onChange={(event) => {
                      setVoucherCode(event.target.value.toUpperCase());
                      setVoucherError("");
                      setVoucherMessage("");
                    }}
                    disabled={Boolean(appliedVoucher) || isApplyingVoucher}
                  />
                  {appliedVoucher ? (
                    <button type="button" className="rounded-full bg-white/10 px-4 text-sm font-extrabold text-white hover:bg-white/15" onClick={removeVoucher}>Bỏ</button>
                  ) : (
                    <button type="button" className="rounded-full bg-[#ff6070] px-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={applyVoucher} disabled={isApplyingVoucher}>{isApplyingVoucher ? "..." : "Áp dụng"}</button>
                  )}
                </div>
                {voucherError && <p className="mt-2 text-xs font-semibold text-amber-200">{voucherError}</p>}
                {voucherMessage && <p className="mt-2 text-xs font-semibold text-emerald-200">{voucherMessage}</p>}
              </div>

	              <p><span className="text-slate-500">Tạm tính:</span> <strong className="text-white">{formatCurrency(totalPrice)}</strong></p>
	              <p><span className="text-slate-500">Giảm giá:</span> <strong className="text-emerald-200">-{formatCurrency(discountAmount)}</strong></p>
	              <p><span className="text-slate-500">Tổng sau giảm:</span> <strong className="text-[#ff9aa5]">{formatCurrency(finalTotal)}</strong></p>
            </div>

            <div className="mt-6 grid gap-3 rounded-xl border border-white/10 bg-black/15 p-4 text-sm">
              <p className="font-bold text-white">Thông tin người đặt</p>
              {isAuthenticated ? <><p className="text-slate-300">{user?.full_name}</p><p className="text-slate-400">{user?.email}</p><p className="text-slate-400">{user?.phone || "Chưa cập nhật số điện thoại"}</p></> : <p className="text-amber-200">Bạn cần đăng nhập trước khi đặt vé.</p>}
            </div>
            {!isAuthenticated && showAuthPrompt && (
              <form className="mt-4 grid gap-3 rounded-xl border border-[#ff6070]/20 bg-[#ff6070]/10 p-4" onSubmit={handleAuthSubmit}>
                <div>
                  <p className="text-sm font-black text-white">Đăng nhập để tiếp tục</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">Ghế đã chọn vẫn được giữ trong khi bạn đăng nhập.</p>
                </div>
                {authError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">{authError}</p>}
                <input
                  autoComplete="email"
                  className="h-10 rounded-full border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-[#ff6070]"
                  name="email"
                  onChange={handleAuthChange}
                  placeholder="Email"
                  required
                  type="email"
                  value={authForm.email}
                />
                <input
                  autoComplete="current-password"
                  className="h-10 rounded-full border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-[#ff6070]"
                  minLength={6}
                  name="password"
                  onChange={handleAuthChange}
                  placeholder="Mật khẩu"
                  required
                  type="password"
                  value={authForm.password}
                />
                <button className="h-10 rounded-full bg-white text-sm font-black text-[#111827] disabled:cursor-not-allowed disabled:opacity-60" disabled={isAuthenticating || isSubmitting} type="submit">
                  {isAuthenticating ? "Đang đăng nhập..." : "Đăng nhập và tiếp tục"}
                </button>
              </form>
            )}
            <button className="mt-6 h-12 w-full rounded-full bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={submitBooking} disabled={!selectedSeats.length || !selectedShowtime || isSubmitting || isAuthenticating}>{isSubmitting ? "Đang đặt vé..." : "Xác nhận đặt vé"}</button>
          </aside>
	        </div>
        )}
      </div>
    </div>
  );
}

export default BookingModal;
