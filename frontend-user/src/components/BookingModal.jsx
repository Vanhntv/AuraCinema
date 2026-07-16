import { useEffect, useMemo, useState } from "react";
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

function BookingModal({ movie, onClose }) {
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

  useEffect(() => {
    if (!movie?._id) return undefined;
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
  }, [movie?._id, selectedDate.value]);

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

  const selectedType = selectedSeats.length ? getSeatType(selectedSeats[0]) : null;
  const totalPrice = useMemo(
    () => selectedSeats.reduce((total, seat) => total + Number(seat.price || 0), 0),
    [selectedSeats],
  );

  const seatsByRow = useMemo(() => {
    const rows = new Map();
    showtimeSeats.forEach((seat) => {
      const row = seat.seat_id?.seat_row || "?";
      if (!rows.has(row)) rows.set(row, []);
      rows.get(row).push(seat);
    });
    return Array.from(rows.entries())
      .sort(([firstRow], [secondRow]) => secondRow.localeCompare(firstRow))
      .map(([row, seats]) => [
        row,
        seats.sort((first, second) => Number(first.seat_id?.seat_number) - Number(second.seat_id?.seat_number)),
      ]);
  }, [showtimeSeats]);

  if (!movie) return null;

  const handleDateChange = (dateOption) => {
    setSelectedDate(dateOption);
    setSelectedShowtime(null);
    setShowtimeSeats([]);
    setSelectedSeats([]);
    setStep("select-showtime");
  };

  const handleShowtimeSelect = async (showtime) => {
    setSelectedShowtime(showtime);
    setSelectedSeats([]);
    setSeatError("");
    setStep("select-seat");
    try {
      setIsLoadingSeats(true);
      const response = await getShowtimeSeats(showtime.id);
      setShowtimeSeats(response?.data || []);
    } catch (requestError) {
      setShowtimeSeats([]);
      setSeatError(requestError.response?.data?.message || "Không thể tải sơ đồ ghế.");
    } finally {
      setIsLoadingSeats(false);
    }
  };

  const toggleSeat = async (seat) => {
    if (seat.status !== "available") return;
    const exists = selectedSeats.some((item) => item._id === seat._id);
    if (exists) {
      try {
        await releaseShowtimeSeats([seat._id]);
      } catch {
        setSeatError("Không thể bỏ giữ ghế lúc này.");
        return;
      }
      setSelectedSeats((current) => current.filter((item) => item._id !== seat._id));
      if (selectedSeats.length === 1) setHoldExpiresAt(null);
      setSeatError("");
      return;
    }
    const nextType = getSeatType(seat);
    if (selectedType && selectedType !== nextType) {
      setSeatError(`Bạn chỉ được chọn cùng một loại ghế. Hãy bỏ ${SEAT_TYPES[selectedType].label.toLowerCase()} trước.`);
      return;
    }
    try {
      const response = await holdShowtimeSeats(selectedShowtime.id, [
        ...selectedSeats.map((item) => item._id),
        seat._id,
      ]);
      setSelectedSeats((current) => [...current, seat]);
      setHoldExpiresAt(response.data.expires_at);
      setSeatError("");
    } catch (requestError) {
      setSeatError(requestError.response?.data?.message || "Không thể giữ ghế này.");
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
        showtime_id: selectedShowtime.id,
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

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 px-5 py-8 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Đặt vé phim ${movie.title}`}>
      <div className="max-h-[90vh] w-[min(1000px,100%)] overflow-y-auto rounded-3xl border border-white/10 bg-[#101722] p-7 shadow-[0_30px_90px_rgba(0,0,0,0.55)] md:p-8" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-5">
          <div><p className="text-sm font-bold uppercase tracking-[0.2em] text-[#ff6070]">Đặt vé</p><h2 className="mt-2 text-3xl font-black text-white max-sm:text-2xl">{movie.title}</h2></div>
          <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-xl font-black text-white hover:bg-[#ff6070]" type="button" aria-label="Đóng đặt vé" onClick={onClose}>×</button>
        </div>

        <div className="mt-8 grid gap-7 lg:grid-cols-[1fr_320px]">
          <div className="grid content-start gap-7">
            <div><h3 className="text-lg font-black text-white">Chọn ngày</h3><div className="mt-4 flex flex-wrap gap-3">{dateOptions.map((option) => <button key={option.value} type="button" onClick={() => handleDateChange(option)} className={`rounded-full px-5 py-3 text-sm font-extrabold ${selectedDate.value === option.value ? "bg-[#ff6070] text-white" : "bg-white/10 text-slate-200 hover:bg-white/15"}`}>{option.label} · {option.displayDate}</button>)}</div></div>

            <div><h3 className="text-lg font-black text-white">{step === "select-seat" ? "Chọn ghế" : "Chọn suất chiếu"}</h3>
              {step === "select-showtime" ? <div className="mt-4 space-y-3">
                {isLoading && <p className="rounded-2xl bg-white/[0.03] px-4 py-3 text-sm text-slate-300">Đang tải suất chiếu...</p>}
                {!isLoading && error && <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
                {!isLoading && !error && !showtimes.length && <p className="rounded-2xl bg-white/[0.03] px-4 py-3 text-sm text-slate-300">Không có suất chiếu cho ngày này.</p>}
                <div className="flex flex-wrap gap-3">{showtimes.map((showtime) => <button key={showtime.id} type="button" onClick={() => handleShowtimeSelect(showtime)} className="rounded-full bg-white/10 px-5 py-3 text-sm font-extrabold text-slate-200 hover:bg-[#ff6070] hover:text-white">{showtime.startTime} · {showtime.roomName}</button>)}</div>
              </div> : <div className="mt-4 space-y-4">
                <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-[#ff6070]" type="button" onClick={() => { setStep("select-showtime"); setSelectedSeats([]); setSeatError(""); }}>← Chọn suất khác</button>
                <div className="flex flex-wrap gap-4 text-xs text-slate-300">{Object.entries(SEAT_TYPES).map(([type, config]) => <span key={type} className="flex items-center gap-2"><i className={`h-4 w-5 rounded ${config.color}`} />{config.label}</span>)}<span className="flex items-center gap-2"><i className="h-4 w-5 rounded bg-slate-800 opacity-50" />Đã đặt</span></div>
                {seatError && <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">{seatError}</p>}
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/15 p-5">
                  <div className="mx-auto mb-7 h-2 w-2/3 rounded-full bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                  <p className="-mt-5 mb-6 text-center text-[10px] uppercase tracking-[0.25em] text-slate-500">Màn hình</p>
                  {isLoadingSeats && <p className="py-8 text-center text-sm text-slate-400">Đang tải sơ đồ ghế...</p>}
                  {!isLoadingSeats && !showtimeSeats.length && <p className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu ghế cho suất chiếu.</p>}
                  <div className="grid min-w-[520px] gap-3">{seatsByRow.map(([row, seats]) => <div key={row} className="flex items-center gap-3"><span className="w-5 text-center text-xs font-bold text-slate-500">{row}</span><div className="flex flex-1 justify-center gap-2">{seats.map((seat) => {
                    const type = getSeatType(seat); const config = SEAT_TYPES[type]; const selected = selectedSeats.some((item) => item._id === seat._id); const unavailable = seat.status !== "available";
                    return <button key={seat._id} type="button" disabled={unavailable} onClick={() => toggleSeat(seat)} title={`${config.label} - ${Number(seat.price).toLocaleString("vi-VN")}đ`} className={`${type === "couple" ? "w-16" : "w-10"} h-9 rounded-lg text-[11px] font-black text-white transition ${unavailable ? "cursor-not-allowed bg-slate-800 opacity-40" : selected ? config.selected : `${config.color} hover:brightness-125`}`}>{row}{seat.seat_id?.seat_number}</button>;
                  })}</div><span className="w-5 text-center text-xs font-bold text-slate-500">{row}</span></div>)}</div>
                </div>
              </div>}
            </div>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><h3 className="text-lg font-black text-white">Thông tin vé</h3>{remainingSeconds > 0 && <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">Thời gian giữ ghế: <strong>{String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:{String(remainingSeconds % 60).padStart(2, "0")}</strong></div>}{bookingResult && <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"><strong>Đặt vé thành công!</strong><br />Mã đơn: {bookingResult._id}</div>}<div className="mt-5 grid gap-4 text-sm text-slate-300">
            <p><span className="text-slate-500">Ngày:</span> {selectedDate.label} · {selectedDate.displayDate}</p><p><span className="text-slate-500">Suất:</span> {selectedShowtime?.startTime || "Chưa chọn"}</p><p><span className="text-slate-500">Phòng:</span> {selectedShowtime?.roomName || "Chưa chọn"}</p><p><span className="text-slate-500">Loại:</span> {selectedType ? SEAT_TYPES[selectedType].label : "Chưa chọn"}</p><p><span className="text-slate-500">Ghế:</span> {selectedSeats.length ? selectedSeats.map((seat) => `${seat.seat_id?.seat_row}${seat.seat_id?.seat_number}`).join(", ") : "Chưa chọn"}</p><p><span className="text-slate-500">Tổng:</span> <strong className="text-[#ff9aa5]">{totalPrice.toLocaleString("vi-VN")}đ</strong></p>
          </div><div className="mt-6 grid gap-3 rounded-xl border border-white/10 bg-black/15 p-4 text-sm"><p className="font-bold text-white">Thông tin người đặt</p>{isAuthenticated ? <><p className="text-slate-300">{user?.full_name}</p><p className="text-slate-400">{user?.email}</p><p className="text-slate-400">{user?.phone || "Chưa cập nhật số điện thoại"}</p></> : <p className="text-amber-200">Bạn cần đăng nhập trước khi đặt vé.</p>}</div><button className="mt-6 h-12 w-full rounded-full bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={submitBooking} disabled={!selectedSeats.length || !selectedShowtime || !isAuthenticated || isSubmitting}>{isSubmitting ? "Đang đặt vé..." : "Xác nhận đặt vé"}</button></aside>
        </div>
      </div>
    </div>
  );
}

export default BookingModal;
