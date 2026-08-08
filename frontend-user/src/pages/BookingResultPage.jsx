import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getBookingDetail } from "../services/bookingService";

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatDateTime(value) {
  if (!value) return "Đang cập nhật";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function resolveImageUrl(image) {
  if (!image) return "";
  if (/^https?:\/\//i.test(image)) return image;

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${image.startsWith("/") ? image : `/${image}`}`;
}

function getSeatLabel(showtimeSeat) {
  const seat = showtimeSeat?.seat_id || {};
  return `${seat.seat_row || ""}${seat.seat_number || ""}` || "Ghế";
}

function getProviderLabel(provider) {
  const value = String(provider || "").toLowerCase();
  if (value.includes("sepay")) return "SePay";
  if (value.includes("vnpay")) return "VNPay";
  return provider || "Thanh toán";
}

function BookingResultPage({ result = "success" }) {
  const { bookingId } = useParams();
  const location = useLocation();
  const isSuccess = result === "success";
  const message = location.state?.message;
  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(isSuccess && Boolean(bookingId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSuccess || !bookingId) return undefined;

    let isActive = true;

    async function loadBooking() {
      try {
        setIsLoading(true);
        setError("");
        const response = await getBookingDetail(bookingId);
        if (isActive) setBooking(response.data);
      } catch (requestError) {
        if (isActive) setError(requestError.response?.data?.message || "Không thể tải thông tin vé.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadBooking();

    return () => {
      isActive = false;
    };
  }, [bookingId, isSuccess]);

  const ticket = useMemo(() => {
    const showtime = booking?.showtime_id || {};
    const movie = showtime.movie_id || {};
    const room = showtime.room_id || {};
    const cinema = room.cinema_id || {};
    const seats = booking?.showtime_seat_ids || [];
    const combos = booking?.combos || [];
    const comboTotal = combos.reduce((total, item) => total + Number(item.subtotal || 0), 0);
    const seatTotal = Math.max(Number(booking?.subtotal_price || 0) - comboTotal, 0);
    const qrData = encodeURIComponent(booking?.booking_code || bookingId || "");

    return {
      movieTitle: movie.title || "Phim đang cập nhật",
      poster: resolveImageUrl(movie.poster),
      cinemaRoom: [cinema.name, room.name].filter(Boolean).join(" - ") || "Rạp đang cập nhật",
      time: formatDateTime(showtime.start_time),
      seats: seats.map(getSeatLabel).filter(Boolean),
      combos,
      seatTotal,
      comboTotal,
      total: Number(booking?.total_price || 0),
      provider: getProviderLabel(booking?.payment_provider),
      code: booking?.booking_code || bookingId,
      qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${qrData}`,
    };
  }, [booking, bookingId]);

  if (!isSuccess) {
    return (
      <section className="mx-auto grid min-h-[60vh] w-[min(760px,calc(100%_-_32px))] place-items-center py-16">
        <div className="w-full rounded-3xl border border-red-400/20 bg-red-500/10 p-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-red-100">Thanh toán thất bại</p>
          <h1 className="mt-3 text-3xl font-black text-white">Chưa thể xác nhận đơn vé</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">{message || "Giao dịch không thành công hoặc không thể xác minh."}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="rounded-full border border-white/10 bg-white/[0.06] px-6 py-3 text-sm font-extrabold text-white no-underline hover:border-[#ff6070]" to="/">
              Về trang chủ
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto min-h-[70vh] w-[min(760px,calc(100%_-_32px))] py-14 text-white">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-emerald-400/30 bg-emerald-400/15 text-4xl text-emerald-300">✓</div>
        <h1 className="mt-4 text-3xl font-black text-white">Đặt vé thành công!</h1>
        <p className="mt-2 text-sm text-slate-400">Vé đã được lưu trong tài khoản của bạn.</p>
        <p className="mx-auto mt-4 w-fit rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-slate-400">
          Mã đặt vé: <strong className="text-[#ff5364]">{ticket.code}</strong>
        </p>
      </div>

      <div className="mx-auto mt-8 overflow-hidden rounded-xl border border-white/10 bg-[#151515] shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400">Đang tải thông tin vé...</div>
        ) : error ? (
          <div className="p-10 text-center text-red-100">{error}</div>
        ) : (
          <>
            <div className="p-5">
              <div className="flex gap-4">
                <div className="h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-white/5">
                  {ticket.poster ? <img className="h-full w-full object-cover" src={ticket.poster} alt={ticket.movieTitle} loading="lazy" decoding="async" /> : null}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff5364]">Vé xem phim</p>
                  <h2 className="mt-1 text-2xl font-black text-white">{ticket.movieTitle}</h2>
                  <p className="mt-2 text-sm text-slate-400">{ticket.cinemaRoom}</p>
                  <p className="mt-1 text-sm text-slate-400">{ticket.time}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Ghế đã đặt ({ticket.seats.length})</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ticket.seats.map((seat) => (
                  <span className="rounded-md border border-[#ff5364]/30 bg-[#ff5364]/15 px-3 py-1 text-xs font-black text-[#ff8f99]" key={seat}>{seat}</span>
                ))}
              </div>
            </div>

            <div className="grid gap-4 border-t border-white/10 p-5 text-sm text-slate-300">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Dịch vụ đi kèm</p>
                {ticket.combos.length ? (
                  <div className="mt-2 grid gap-2">
                    {ticket.combos.map((item) => (
                      <p className="flex justify-between gap-4" key={item._id || item.name}>
                        <span>{item.name} x {item.quantity}</span>
                        <strong className="text-slate-200">{formatCurrency(item.subtotal)}</strong>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-slate-500">Không có</p>
                )}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Phương thức thanh toán</p>
                <p className="mt-2 font-bold text-white">{ticket.provider}</p>
              </div>
            </div>

            <div className="border-t border-white/10 p-5 text-sm">
              <p className="flex justify-between gap-4 text-slate-400"><span>Tiền vé</span><strong className="text-slate-200">{formatCurrency(ticket.seatTotal)}</strong></p>
              <p className="mt-2 flex justify-between gap-4 text-slate-400"><span>Dịch vụ đi kèm</span><strong className="text-slate-200">{formatCurrency(ticket.comboTotal)}</strong></p>
              <p className="mt-5 flex justify-between gap-4 text-base font-black text-white"><span>Tổng đã thanh toán</span><strong className="text-2xl text-[#ff5364]">{formatCurrency(ticket.total)}</strong></p>
            </div>

            <div className="bg-white p-5 text-center">
              <img className="mx-auto h-40 w-40 object-contain" src={ticket.qrUrl} alt={`QR vé ${ticket.code}`} />
              <p className="mt-2 text-xs font-black text-black">Đưa mã này cho nhân viên soát vé</p>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link className="rounded-md bg-[#e72f42] px-5 py-3 text-sm font-bold text-white no-underline hover:bg-[#ff4054]" to="/tai-khoan?tab=tickets">
          Xem vé của tôi
        </Link>
        <Link className="rounded-md border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white no-underline hover:border-[#ff6070]" to="/">
          Về trang chủ
        </Link>
        <Link className="rounded-md bg-[#e72f42] px-5 py-3 text-sm font-bold text-white no-underline hover:bg-[#ff4054]" to="/lich-chieu">
          Đặt vé tiếp
        </Link>
      </div>
    </section>
  );
}

export default BookingResultPage;
