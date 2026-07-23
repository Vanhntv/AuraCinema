import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getShowtimeSeats, holdShowtimeSeats, releaseShowtimeSeats } from "../services/showtimeSeatService";
import { getShowtimesByMovie } from "../services/showtimeService";
import { createBooking } from "../services/bookingService";
import { useAuth } from "../hooks/useAuth";

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

function buildDateOptions() {
  return Array.from({ length: 4 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      value: date.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }),
      displayDate: date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      label: index === 0 ? "Hôm nay" : index === 1 ? "Ngày mai" : date.toLocaleDateString("vi-VN", { weekday: "long" }),
    };
  });
}

function getShowtimeId(showtime) {
  return showtime?.id || showtime?._id || "";
}

function getShowtimeDateValue(showtime) {
  const date = new Date(showtime?.start_time);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
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
  const { user, isAuthenticated } = useAuth();
  const [dateOptions] = useState(buildDateOptions);
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
  const [bookingResult, setBookingResult] = useState(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
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
    setHoldExpiresAt(null);
    setRemainingSeconds(0);
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

  const totalPrice = useMemo(
    () => calculateSelectedSeatTotal(selectedSeats, showtimeSeats),
    [selectedSeats, showtimeSeats],
  );

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

  const toggleSeat = async (seat) => {
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
      } catch {
        setSeatError("Không thể bỏ giữ ghế lúc này.");
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
      setSeatError(requestError.response?.data?.message || "Không thể giữ ghế này.");
      try {
        const latestSeats = await getShowtimeSeats(getShowtimeId(selectedShowtime));
        setShowtimeSeats(latestSeats?.data || []);
      } catch {
        setSeatError(requestError.response?.data?.message || "Không thể giữ ghế này.");
      }
    }
  };

  const submitBooking = async () => {
    if (!isAuthenticated) {
      setSeatError("Vui lòng đăng nhập để đặt vé.");
      return;
    }
    try {
      setIsSubmitting(true);
      setSeatError("");
      const response = await createBooking({
        showtime_id: getShowtimeId(selectedShowtime),
        showtime_seat_ids: selectedSeats.map((seat) => seat._id),
      });
      setBookingResult(response.data);
      setShowtimeSeats((current) => current.map((seat) =>
        selectedSeats.some((selected) => selected._id === seat._id)
          ? { ...seat, status: "booked" }
          : seat,
      ));
      setSelectedSeats([]);
    } catch (requestError) {
      setSeatError(requestError.response?.data?.message || "Đặt vé không thành công.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPageVariant = variant === "page";
  const shellClassName = isPageVariant
    ? "mx-auto w-[min(1320px,calc(100%_-_40px))] py-10 max-sm:w-[calc(100%_-_28px)]"
    : "fixed inset-0 z-[60] grid place-items-center bg-black/75 px-5 py-8 backdrop-blur-sm";
  const panelClassName = isPageVariant
    ? "min-h-[calc(100vh_-_180px)] rounded-3xl border border-white/10 bg-[#101722] p-7 shadow-[0_30px_90px_rgba(0,0,0,0.35)] md:p-8"
    : "max-h-[90vh] w-[min(1000px,100%)] overflow-y-auto rounded-3xl border border-white/10 bg-[#101722] p-7 shadow-[0_30px_90px_rgba(0,0,0,0.55)] md:p-8";
  const handleClose = async () => {
    await releaseHeldSeats();
    onClose?.();
  };

  return (
    <div className={shellClassName} onClick={isPageVariant ? undefined : handleClose} role={isPageVariant ? undefined : "dialog"} aria-modal={isPageVariant ? undefined : "true"} aria-label={`Đặt vé phim ${movie.title}`}>
      <div className={panelClassName} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-5">
          <div><p className="text-sm font-bold uppercase tracking-[0.2em] text-[#ff6070]">Đặt vé</p><h2 className="mt-2 text-3xl font-black text-white max-sm:text-2xl">{movie.title}</h2></div>
          <button className="grid h-10 shrink-0 place-items-center rounded-full bg-white/10 px-4 text-sm font-black text-white hover:bg-[#ff6070]" type="button" aria-label={isPageVariant ? "Quay lại lịch chiếu" : "Đóng đặt vé"} onClick={handleClose}>{isPageVariant ? "← Lịch chiếu" : "×"}</button>
        </div>

        <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid content-start gap-7">
            <div><h3 className="text-lg font-black text-white">Chọn ngày</h3><div className="mt-4 flex flex-wrap gap-3">{dateOptions.map((option) => <button key={option.value} type="button" onClick={() => handleDateChange(option)} className={`rounded-full px-5 py-3 text-sm font-extrabold ${selectedDate.value === option.value ? "bg-[#ff6070] text-white" : "bg-white/10 text-slate-200 hover:bg-white/15"}`}>{option.label} · {option.displayDate}</button>)}</div></div>

            <div><h3 className="text-lg font-black text-white">{step === "select-seat" ? "Chọn ghế" : "Chọn suất chiếu"}</h3>
              {step === "select-showtime" ? <div className="mt-4 space-y-3">
                {isLoading && <p className="rounded-2xl bg-white/[0.03] px-4 py-3 text-sm text-slate-300">Đang tải suất chiếu...</p>}
                {!isLoading && error && <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
                {!isLoading && !error && !showtimes.length && <p className="rounded-2xl bg-white/[0.03] px-4 py-3 text-sm text-slate-300">Không có suất chiếu cho ngày này.</p>}
                <div className="flex flex-wrap gap-3">{showtimes.map((showtime) => <button key={showtime.id} type="button" onClick={() => handleShowtimeSelect(showtime)} className="rounded-full bg-white/10 px-5 py-3 text-sm font-extrabold text-slate-200 hover:bg-[#ff6070] hover:text-white">{showtime.startTime} · {showtime.roomName}</button>)}</div>
              </div> : <div className="mt-4 space-y-4">
                {!isPageVariant && (
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
          </div>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><h3 className="text-lg font-black text-white">Thông tin vé</h3>{remainingSeconds > 0 && <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">Thời gian giữ ghế: <strong>{String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:{String(remainingSeconds % 60).padStart(2, "0")}</strong></div>}{bookingResult && <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"><strong>Đặt vé thành công!</strong><br />Mã đơn: {bookingResult._id}</div>}<div className="mt-5 grid gap-4 text-sm text-slate-300">
            <p><span className="text-slate-500">Ngày:</span> {selectedDate.label} · {selectedDate.displayDate}</p><p><span className="text-slate-500">Suất:</span> {selectedShowtime?.startTime || "Chưa chọn"}</p><p><span className="text-slate-500">Phòng:</span> {selectedShowtime?.roomName || "Chưa chọn"}</p><p><span className="text-slate-500">Loại:</span> {selectedTypeSummary}</p><p><span className="text-slate-500">Ghế:</span> {selectedSeats.length ? selectedSeats.map((seat) => `${seat.seat_id?.seat_row}${seat.seat_id?.seat_number}`).join(", ") : "Chưa chọn"}</p><p><span className="text-slate-500">Tổng:</span> <strong className="text-[#ff9aa5]">{totalPrice.toLocaleString("vi-VN")}đ</strong></p>
          </div><div className="mt-6 grid gap-3 rounded-xl border border-white/10 bg-black/15 p-4 text-sm"><p className="font-bold text-white">Thông tin người đặt</p>{isAuthenticated ? <><p className="text-slate-300">{user?.full_name}</p><p className="text-slate-400">{user?.email}</p><p className="text-slate-400">{user?.phone || "Chưa cập nhật số điện thoại"}</p></> : <p className="text-amber-200">Bạn cần đăng nhập trước khi đặt vé.</p>}</div><button className="mt-6 h-12 w-full rounded-full bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={submitBooking} disabled={!selectedSeats.length || !selectedShowtime || !isAuthenticated || isSubmitting}>{isSubmitting ? "Đang đặt vé..." : "Xác nhận đặt vé"}</button></aside>
        </div>
      </div>
    </div>
  );
}

export default BookingModal;
