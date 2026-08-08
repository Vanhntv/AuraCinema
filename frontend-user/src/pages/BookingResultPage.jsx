import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { HiOutlineCheckCircle } from "react-icons/hi";
import { getBookingDetail } from "../services/bookingService";
import { getMyTicketQr, getTicketsByBooking } from "../services/ticketService";
import { getApiErrorMessage, showToast } from "../utils/toast";

const RETRY_DELAYS = [0, 1000, 2000, 3000];

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const formatDate = (value) => {
  if (!value) return "Đang cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Đang cập nhật";
  return date.toLocaleDateString("vi-VN");
};

const formatTime = (value) => {
  if (!value) return "Đang cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Đang cập nhật";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

const resolveImageUrl = (image) => {
  if (!image) return "";
  if (/^https?:\/\//i.test(image)) return image;
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${image.startsWith("/") ? image : `/${image}`}`;
};

const getProviderLabel = (provider) => {
  const value = String(provider || "").toLowerCase();
  if (value.includes("sepay")) return "SePay";
  if (value.includes("vnpay")) return "VNPay";
  return provider || "Thanh toán trực tuyến";
};

const wait = (delay, timers) => new Promise((resolve) => {
  const timerId = window.setTimeout(resolve, delay);
  timers.push(timerId);
});

function BookingResultPage({ result = "success" }) {
  const { bookingId } = useParams();
  const location = useLocation();
  const isSuccess = result === "success";
  const [booking, setBooking] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(isSuccess && Boolean(bookingId));
  const [error, setError] = useState("");
  const [ticketIssueMessage, setTicketIssueMessage] = useState("");

  useEffect(() => {
    if (!isSuccess || !bookingId) return undefined;

    let active = true;
    const timers = [];

    const loadIssuedTickets = async () => {
      setIsLoading(true);
      setError("");
      setTicketIssueMessage("Đang phát hành vé điện tử...");

      for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt += 1) {
        if (RETRY_DELAYS[attempt]) await wait(RETRY_DELAYS[attempt], timers);
        if (!active) return;

        try {
          const bookingResponse = await getBookingDetail(bookingId);
          const nextBooking = bookingResponse.data;
          if (!active) return;
          setBooking(nextBooking);

          if (nextBooking?.status !== "confirmed" || nextBooking?.payment_status !== "paid") {
            throw new Error("Thanh toán đang được backend xác nhận.");
          }

          const ticketResponse = await getTicketsByBooking(bookingId);
          const issuedTickets = ticketResponse.data || [];
          if (!issuedTickets.length) throw new Error("Vé điện tử chưa sẵn sàng.");

          const ticketsWithQr = await Promise.all(issuedTickets.map(async (ticket) => {
            const qrResponse = await getMyTicketQr(ticket.id);
            const qrPayload = qrResponse.data?.qrPayload;
            if (!qrPayload?.startsWith("AURA_TICKET:")) {
              throw new Error(`QR của vé ${ticket.ticketCode} chưa sẵn sàng.`);
            }
            const qrDataUrl = await QRCode.toDataURL(qrPayload, {
              errorCorrectionLevel: "M",
              margin: 2,
              width: 280,
              color: { dark: "#101010", light: "#ffffff" },
            });
            return { ...ticket, qrPayload, qrDataUrl };
          }));

          if (!active) return;
          setTickets(ticketsWithQr);
          setTicketIssueMessage("");
          setIsLoading(false);
          return;
        } catch (requestError) {
          if (attempt === RETRY_DELAYS.length - 1 && active) {
            setTicketIssueMessage("Vé đang được xử lý. Bạn có thể kiểm tra lại tại Vé của tôi.");
            setError(getApiErrorMessage(requestError, "Không thể tải vé điện tử lúc này."));
            setIsLoading(false);
          }
        }
      }
    };

    void loadIssuedTickets();
    return () => {
      active = false;
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [bookingId, isSuccess]);

  const bookingSummary = useMemo(() => {
    const showtime = booking?.showtime_id || {};
    const movie = showtime.movie_id || {};
    const room = showtime.room_id || {};
    const cinema = room.cinema_id || {};
    const combos = booking?.combos || [];
    return {
      bookingCode: booking?.booking_code || bookingId,
      movieTitle: movie.title || tickets[0]?.movie?.title || "Phim đang cập nhật",
      poster: resolveImageUrl(movie.poster || tickets[0]?.movie?.poster),
      ageClassification: Number(movie.age_limit) > 0 ? `T${movie.age_limit}` : "P",
      date: formatDate(showtime.start_time || tickets[0]?.showtime?.startTime),
      time: formatTime(showtime.start_time || tickets[0]?.showtime?.startTime),
      cinema: cinema.name || tickets[0]?.cinema?.name || "Rạp đang cập nhật",
      room: room.name || tickets[0]?.room?.name || "Phòng đang cập nhật",
      provider: getProviderLabel(booking?.payment_provider),
      combos,
      voucherCode: booking?.voucher?.code || "",
      total: Number(booking?.total_price || 0),
    };
  }, [booking, bookingId, tickets]);

  const handlePdf = async (ticket) => {
    try {
      const { downloadTicketPdf } = await import("../utils/ticketPdf");
      await downloadTicketPdf(ticket, ticket.qrPayload);
    } catch (pdfError) {
      showToast("error", getApiErrorMessage(pdfError, "Không thể tạo PDF vé."));
    }
  };

  const downloadQr = (ticket) => {
    if (!ticket.qrDataUrl) return;
    const link = document.createElement("a");
    link.href = ticket.qrDataUrl;
    link.download = `${ticket.ticketCode}-qr.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (!isSuccess) {
    return (
      <main className="mx-auto grid min-h-[60vh] w-[min(760px,calc(100%_-_32px))] place-items-center py-16">
        <section className="w-full rounded-[var(--aura-radius-lg)] border border-red-400/20 bg-red-500/10 p-8">
          <h1 className="text-3xl font-black text-white">Chưa thể xác nhận thanh toán</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">{location.state?.message || "Giao dịch không thành công hoặc chưa được backend xác minh."}</p>
          <Link className="mt-6 inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/[0.06] px-6 text-sm font-extrabold text-white no-underline" to="/">
            Về trang chủ
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[70vh] w-[min(980px,calc(100%_-_32px))] py-14 text-white">
      <header className="text-center">
        <HiOutlineCheckCircle className="mx-auto text-6xl text-emerald-300" aria-hidden="true" />
        <h1 className="mt-3 text-3xl font-black">Đặt vé thành công</h1>
        <p className="mt-2 text-sm text-slate-400">Thanh toán thành công. Mỗi ghế được phát hành thành một vé QR riêng.</p>
      </header>

      <section className="mt-8 rounded-[var(--aura-radius-lg)] border border-white/10 bg-[var(--aura-surface)] p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-[92px_minmax(0,1fr)]">
          <div className="aspect-[2/3] overflow-hidden rounded-xl bg-white/5">
            {bookingSummary.poster ? <img src={bookingSummary.poster} alt={bookingSummary.movieTitle} className="h-full w-full object-cover" /> : null}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-2xl font-black">{bookingSummary.movieTitle}</h2>
              <span className="rounded-full bg-[var(--aura-coral)] px-3 py-1 text-xs font-black text-[var(--aura-coral-ink)]">{bookingSummary.ageClassification}</span>
            </div>
            <dl className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
              <div><dt className="text-slate-500">Mã đơn</dt><dd className="break-words font-bold text-white">{bookingSummary.bookingCode}</dd></div>
              <div><dt className="text-slate-500">Thanh toán</dt><dd className="font-bold text-white">{bookingSummary.provider}</dd></div>
              <div><dt className="text-slate-500">Suất chiếu</dt><dd className="font-bold text-white">{bookingSummary.time} · {bookingSummary.date}</dd></div>
              <div><dt className="text-slate-500">Rạp / Phòng</dt><dd className="font-bold text-white">{bookingSummary.cinema} · {bookingSummary.room}</dd></div>
            </dl>
          </div>
        </div>

        <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 text-sm">
          <div className="flex justify-between gap-4 text-slate-400"><span>Combo</span><strong className="text-right text-slate-200">{bookingSummary.combos.length ? bookingSummary.combos.map((item) => `${item.name} ×${item.quantity}`).join(", ") : "Không có"}</strong></div>
          <div className="flex justify-between gap-4 text-slate-400"><span>Voucher</span><strong className="text-slate-200">{bookingSummary.voucherCode || "Không áp dụng"}</strong></div>
          <div className="flex justify-between gap-4 text-base"><span>Tổng đã thanh toán</span><strong className="text-xl text-[var(--aura-coral)]">{currencyFormatter.format(bookingSummary.total)}</strong></div>
        </div>
      </section>

      {isLoading && (
        <section className="mt-6 rounded-[var(--aura-radius-lg)] border border-amber-300/20 bg-amber-300/10 p-6 text-center" aria-live="polite">
          <h2 className="font-black text-amber-100">Đang phát hành vé điện tử...</h2>
          <p className="mt-2 text-sm text-amber-100/75">Hệ thống đang tạo QR riêng cho từng ghế. Vui lòng chờ trong giây lát.</p>
        </section>
      )}

      {!isLoading && ticketIssueMessage && !tickets.length && (
        <section className="mt-6 rounded-[var(--aura-radius-lg)] border border-amber-300/20 bg-amber-300/10 p-6 text-center" aria-live="polite">
          <h2 className="font-black text-amber-100">{ticketIssueMessage}</h2>
          {error && <p className="mt-2 text-sm text-amber-100/75">{error}</p>}
          <Link to="/tai-khoan?tab=tickets" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[var(--aura-coral)] px-5 text-sm font-black text-[var(--aura-coral-ink)] no-underline">Mở Vé của tôi</Link>
        </section>
      )}

      {tickets.length > 0 && (
        <section className="mt-8" aria-labelledby="issued-tickets-title">
          <h2 id="issued-tickets-title" className="text-2xl font-black">Vé điện tử ({tickets.length})</h2>
          <p className="mt-2 text-sm text-slate-400">Mỗi QR chỉ dùng cho đúng một ghế và chỉ check-in một lần.</p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {tickets.map((ticket) => (
              <article key={ticket.id} className="overflow-hidden rounded-[var(--aura-radius-lg)] border border-white/10 bg-[var(--aura-surface)]">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0"><p className="text-sm text-slate-400">Vé ghế</p><h3 className="text-3xl font-black">{ticket.seat?.label}</h3></div>
                    <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-200">Chưa sử dụng</span>
                  </div>
                  <dl className="mt-4 grid gap-2 text-sm text-slate-300">
                    <div><dt className="text-slate-500">Mã Ticket</dt><dd className="break-words font-bold text-white">{ticket.ticketCode}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-slate-500">Loại ghế</dt><dd className="font-bold text-white">{ticket.seat?.type || "Đang cập nhật"}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-slate-500">Giá vé</dt><dd className="font-bold text-white">{currencyFormatter.format(Number(ticket.price || 0))}</dd></div>
                  </dl>
                </div>
                <div className="bg-white p-5 text-center text-black">
                  <img src={ticket.qrDataUrl} alt={`QR vé ${ticket.ticketCode}, ghế ${ticket.seat?.label}`} className="mx-auto h-48 w-48 object-contain" />
                  <p className="mt-2 text-xs font-black">Xuất trình QR tại cửa phòng chiếu</p>
                </div>
                <div className="grid grid-cols-2 gap-2 p-4 text-sm">
                  <button type="button" className="min-h-11 rounded-xl border border-white/10 bg-white/[0.05] px-3 font-bold" onClick={() => downloadQr(ticket)}>Tải QR</button>
                  <button type="button" className="min-h-11 rounded-xl border border-white/10 bg-white/[0.05] px-3 font-bold" onClick={() => handlePdf(ticket)}>Tải PDF</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <nav aria-label="Tiếp tục sau khi đặt vé" className="mt-8 flex flex-wrap justify-center gap-3">
        <Link className="inline-flex min-h-11 items-center rounded-full bg-[var(--aura-coral)] px-5 text-sm font-bold text-[var(--aura-coral-ink)] no-underline" to="/tai-khoan?tab=tickets">Vé của tôi</Link>
        <Link className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm font-bold text-white no-underline" to="/lich-chieu">Đặt vé tiếp</Link>
        <Link className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm font-bold text-white no-underline" to="/">Về trang chủ</Link>
      </nav>
    </main>
  );
}

export default BookingResultPage;
