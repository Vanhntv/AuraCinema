import { useEffect, useMemo, useState } from "react";
import { getShowtimesByMovie } from "../services/showtimeService";

const seats = Array.from({ length: 36 }, (_, index) => {
  const row = String.fromCharCode(65 + Math.floor(index / 6));
  const number = (index % 6) + 1;
  return `${row}${number}`;
});

function buildDateOptions() {
  const options = [];
  const baseDate = new Date();

  for (let index = 0; index < 4; index += 1) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + index);

    const displayDate = date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });

    const value = date.toLocaleDateString("en-CA", {
      timeZone: "Asia/Jakarta",
    });

    const label =
      index === 0
        ? "Hôm nay"
        : index === 1
          ? "Ngày mai"
          : `Thứ ${date.getDay() === 0 ? 7 : date.getDay()}`;

    options.push({
      label,
      value,
      displayDate,
    });
  }

  return options;
}

function BookingModal({ movie, onClose }) {
  const [dateOptions] = useState(() => buildDateOptions());
  const [selectedDate, setSelectedDate] = useState(dateOptions[0]);
  const [showtimes, setShowtimes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedShowtime, setSelectedShowtime] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [step, setStep] = useState("select-showtime");

  const totalPrice = useMemo(() => {
    const price = Number(selectedShowtime?.base_price ?? 45000);
    return selectedSeats.length * price;
  }, [selectedSeats, selectedShowtime]);

  useEffect(() => {
    if (!movie?._id) {
      setShowtimes([]);
      setSelectedShowtime(null);
      setStep("select-showtime");
      return undefined;
    }

    let isMounted = true;

    const loadShowtimes = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await getShowtimesByMovie(movie._id, {
          date: selectedDate.value,
        });
        const data = response?.data || [];

        if (!isMounted) return;

        setShowtimes(data);
        setSelectedShowtime((current) => {
          if (current && data.some((item) => item.id === current.id)) {
            return current;
          }

          return null;
        });
      } catch (err) {
        if (isMounted) {
          setShowtimes([]);
          setError(err.message || "Không thể tải suất chiếu");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadShowtimes();

    return () => {
      isMounted = false;
    };
  }, [movie?._id, selectedDate.value]);

  if (!movie) return null;

  const toggleSeat = (seat) => {
    setSelectedSeats((current) =>
      current.includes(seat)
        ? current.filter((item) => item !== seat)
        : [...current, seat],
    );
  };

  const handleDateChange = (dateOption) => {
    setSelectedDate(dateOption);
    setSelectedShowtime(null);
    setSelectedSeats([]);
    setStep("select-showtime");
  };

  const handleShowtimeSelect = (showtime) => {
    setSelectedShowtime(showtime);
    setSelectedSeats([]);
    setStep("select-seat");
  };

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/75 px-5 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Đặt vé phim ${movie.title}`}
    >
      <div
        className="max-h-[90vh] w-[min(920px,100%)] overflow-y-auto rounded-3xl border border-white/10 bg-[#101722] p-7 shadow-[0_30px_90px_rgba(0,0,0,0.55)] md:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm font-bold uppercase tracking-[0.2em] text-[#ff6070]">
              Đặt vé
            </p>
            <h2 className="mt-2 font-[Montserrat,Arial,sans-serif] text-3xl font-black text-white max-sm:text-2xl">
              {movie.title}
            </h2>
          </div>
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-xl font-black text-white transition-colors hover:bg-[#ff6070]"
            type="button"
            aria-label="Đóng đặt vé"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="mt-8 grid gap-7 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-7">
            <div>
              <h3 className="font-[Montserrat,Arial,sans-serif] text-lg font-black text-white">
                Chọn ngày
              </h3>
              <div className="mt-4 flex flex-wrap gap-3">
                {dateOptions.map((dateOption) => (
                  <button
                    className={`rounded-full px-5 py-3 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm font-extrabold transition-colors ${
                      selectedDate.value === dateOption.value
                        ? "bg-[#ff6070] text-white"
                        : "bg-white/10 text-slate-200 hover:bg-white/15"
                    }`}
                    key={dateOption.value}
                    type="button"
                    onClick={() => handleDateChange(dateOption)}
                  >
                    {dateOption.label} · {dateOption.displayDate}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-[Montserrat,Arial,sans-serif] text-lg font-black text-white">
                {step === "select-seat" ? "Chọn ghế" : "Chọn suất chiếu"}
              </h3>

              {step === "select-seat" ? (
                <div className="mt-4 space-y-3">
                  <button
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-[#ff6070] hover:text-white"
                    type="button"
                    onClick={() => {
                      setSelectedShowtime(null);
                      setSelectedSeats([]);
                      setStep("select-showtime");
                    }}
                  >
                    ← Chọn suất khác
                  </button>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="mx-auto mb-5 h-2 w-2/3 rounded-full bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
                    <div className="grid grid-cols-6 gap-3">
                      {seats.map((seat) => (
                        <button
                          className={`h-10 rounded-lg font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-xs font-black transition-colors ${
                            selectedSeats.includes(seat)
                              ? "bg-[#ff6070] text-white"
                              : "bg-white/10 text-slate-300 hover:bg-white/20"
                          }`}
                          key={seat}
                          type="button"
                          onClick={() => toggleSeat(seat)}
                        >
                          {seat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {isLoading && (
                    <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                      Đang tải suất chiếu...
                    </p>
                  )}

                  {!isLoading && error && (
                    <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {error}
                    </p>
                  )}

                  {!isLoading && !error && !showtimes.length && (
                    <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                      Không có suất chiếu cho ngày này.
                    </p>
                  )}

                  {!isLoading && !error && showtimes.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {showtimes.map((showtime) => (
                        <button
                          className={`rounded-full px-5 py-3 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm font-extrabold transition-colors ${
                            selectedShowtime?.id === showtime.id
                              ? "bg-[#ff6070] text-white"
                              : "bg-white/10 text-slate-200 hover:bg-white/15"
                          }`}
                          key={showtime.id}
                          type="button"
                          onClick={() => handleShowtimeSelect(showtime)}
                        >
                          {showtime.startTime}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <h3 className="font-[Montserrat,Arial,sans-serif] text-lg font-black text-white">
              Thông tin vé
            </h3>
            <div className="mt-5 grid gap-4 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm text-slate-300">
              <p>
                <span className="text-slate-500">Ngày:</span>{" "}
                {selectedDate.label} · {selectedDate.displayDate}
              </p>
              <p>
                <span className="text-slate-500">Suất:</span>{" "}
                {selectedShowtime?.startTime || "Chưa chọn"}
              </p>
              <p>
                <span className="text-slate-500">Phòng:</span>{" "}
                {selectedShowtime?.roomName || "Chưa chọn"}
              </p>
              <p>
                <span className="text-slate-500">Ghế:</span>{" "}
                {selectedSeats.length ? selectedSeats.join(", ") : "Chưa chọn"}
              </p>
              <p>
                <span className="text-slate-500">Tổng:</span>{" "}
                <strong className="text-[#ff9aa5]">
                  {totalPrice.toLocaleString("vi-VN")}đ
                </strong>
              </p>
            </div>

            <div className="mt-6 grid gap-3">
              <input
                className="h-11 rounded-xl border border-white/10 bg-black/20 px-4 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#ff6070]"
                placeholder="Họ tên"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
              <input
                className="h-11 rounded-xl border border-white/10 bg-black/20 px-4 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#ff6070]"
                placeholder="Số điện thoại"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
              />
            </div>

            <button
              className="mt-6 h-12 w-full rounded-full bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={
                !selectedSeats.length ||
                !customerName ||
                !customerPhone ||
                !selectedShowtime
              }
            >
              Xác nhận đặt vé
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default BookingModal;
