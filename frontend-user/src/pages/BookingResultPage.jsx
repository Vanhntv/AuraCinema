import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { HiOutlineCheckCircle } from "react-icons/hi";
import { getBookingDetail, getBookingOrderQr } from "../services/bookingService";
import { getApiErrorMessage } from "../utils/toast";
import { getBookingResultPurchaseDetails } from "../utils/voucherBooking";

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

const normalizeText = (value = "") => String(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/đ/g, "d");

const getSeatTone = (seatType = "") => {
  const normalizedType = normalizeText(seatType);
  if (normalizedType.includes("vip")) return "vip";
  if (
    normalizedType.includes("doi") ||
    normalizedType.includes("couple") ||
    normalizedType.includes("double")
  ) return "couple";
  if (normalizedType.includes("thuong") || normalizedType.includes("normal")) return "normal";
  return "unknown";
};

const SEAT_TONE_CLASSES = {
  normal: "border-sky-400/35 bg-sky-400/15 text-sky-100",
  vip: "border-amber-300/45 bg-amber-400/20 text-amber-100",
  couple: "border-fuchsia-300/45 bg-fuchsia-400/20 text-fuchsia-100",
  unknown: "border-white/10 bg-white/[0.06] text-white",
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
  const [orderQrDataUrl, setOrderQrDataUrl] = useState("");

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

          const issuedTickets = nextBooking?.tickets || [];
          if (!issuedTickets.length) throw new Error("Vé điện tử chưa sẵn sàng.");

          if (!active) return;
          setTickets(issuedTickets);
          if (Number(nextBooking.ticketing_version) === 2) {
            const orderQrResponse = await getBookingOrderQr(bookingId);
            const orderQrPayload = orderQrResponse.data?.qrPayload;
            if (!orderQrPayload?.startsWith("AURA_BOOKING_V2:")) {
              throw new Error("QR đơn vé chưa sẵn sàng.");
            }
            const nextOrderQrDataUrl = await QRCode.toDataURL(orderQrPayload, {
              errorCorrectionLevel: "M",
              margin: 2,
              width: 280,
              color: { dark: "#101010", light: "#ffffff" },
            });
            if (!active) return;
            setOrderQrDataUrl(nextOrderQrDataUrl);
          }
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
    const purchaseDetails = getBookingResultPurchaseDetails(booking);
    const seats = tickets
      .map((ticket) => {
        const label = ticket?.seat?.label;
        const type = ticket?.seat?.type || "";
        return label ? { label, type, tone: getSeatTone(type) } : null;
      })
      .filter(Boolean);
    const seatTypes = [...new Set(tickets
      .map((ticket) => ticket?.seat?.type)
      .filter(Boolean))];

    return {
      bookingCode: booking?.booking_code || bookingId,
      movieTitle: movie.title || tickets[0]?.movie?.title || "Phim đang cập nhật",
      poster: resolveImageUrl(movie.poster || tickets[0]?.movie?.poster),
      ageClassification: Number(movie.age_limit) > 0 ? `${movie.age_limit}+` : "P",
      date: formatDate(showtime.start_time || tickets[0]?.showtime?.startTime),
      time: formatTime(showtime.start_time || tickets[0]?.showtime?.startTime),
      room: room.name || tickets[0]?.room?.name || "Phòng đang cập nhật",
      provider: getProviderLabel(booking?.payment_provider),
      services: purchaseDetails.services,
      voucher: purchaseDetails.voucher,
      total: Number(booking?.total_price || 0),
      rewardPointsEarned: Number(booking?.reward_points_earned || 0),
      seats,
      seatTypes,
    };
  }, [booking, bookingId, tickets]);

  const downloadOrderQr = () => {
    if (!orderQrDataUrl) return;
    const link = document.createElement("a");
    link.href = orderQrDataUrl;
    link.download = `${bookingSummary.bookingCode}-qr-don.png`;
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
        <p className="mt-2 text-sm text-slate-400">Thanh toán thành công. Sử dụng QR đơn để tra cứu và in vé.</p>
      </header>

      <section className="mt-8 rounded-[var(--aura-radius-lg)] border border-white/10 bg-[var(--aura-surface)] p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-[132px_minmax(0,1fr)] lg:grid-cols-[156px_minmax(0,1fr)]">
          <div className="aspect-[2/3] w-32 overflow-hidden rounded-xl bg-white/5 sm:w-full">
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
              <div><dt className="text-slate-500">Phòng</dt><dd className="font-bold text-white">{bookingSummary.room}</dd></div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Ghế đã đặt</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {bookingSummary.seats.length ? bookingSummary.seats.map((seat) => (
                    <span
                      key={seat.label}
                      className={`inline-flex min-h-8 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-black ${SEAT_TONE_CLASSES[seat.tone]}`}
                      title={seat.type ? `${seat.label} - ${seat.type}` : seat.label}
                      aria-label={seat.type ? `${seat.label} - ${seat.type}` : seat.label}
                    >
                      {seat.label}
                    </span>
                  )) : <span className="font-bold text-white">Đang cập nhật</span>}
                </dd>
                {bookingSummary.seatTypes.length > 0 && (
                  <p className="mt-2 text-xs font-semibold text-slate-500">{bookingSummary.seatTypes.join(", ")}</p>
                )}
              </div>
            </dl>
          </div>
        </div>

        <dl className="mt-5 grid gap-4 border-t border-white/10 pt-5 text-sm">
          <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-4">
            <dt className="text-slate-400">Dịch vụ</dt>
            <dd className="grid gap-2 sm:justify-self-stretch">
              {bookingSummary.services.length ? bookingSummary.services.map((service) => (
                <div key={service.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 text-slate-200">
                  <span className="min-w-0">
                    <strong className="block break-words font-bold text-white">{service.name} ×{service.quantity}</strong>
                    {service.quantity > 1 && <span className="mt-0.5 block text-xs text-slate-500">{currencyFormatter.format(service.unitPrice)} / phần</span>}
                  </span>
                  <strong className="whitespace-nowrap text-right">{currencyFormatter.format(service.subtotal)}</strong>
                </div>
              )) : <strong className="text-slate-200 sm:text-right">Không có</strong>}
            </dd>
          </div>
          <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-4">
            <dt className="text-slate-400">Mã giảm giá</dt>
            <dd className="flex items-center justify-between gap-4 sm:justify-end">
              {bookingSummary.voucher ? (
                <>
                  <strong className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs text-emerald-200">{bookingSummary.voucher.code}</strong>
                  <strong className="whitespace-nowrap text-emerald-300">−{currencyFormatter.format(bookingSummary.voucher.discountAmount)}</strong>
                </>
              ) : <strong className="text-slate-200">Không áp dụng</strong>}
            </dd>
          </div>
          <div className="flex justify-between gap-4 text-base"><dt>Tổng đã thanh toán</dt><dd className="text-xl font-bold text-[var(--aura-coral)]">{currencyFormatter.format(bookingSummary.total)}</dd></div>
          {bookingSummary.rewardPointsEarned > 0 && <div className="flex justify-between gap-4 text-sm"><dt className="text-slate-400">Điểm thưởng nhận được</dt><dd className="font-bold text-emerald-300">+{bookingSummary.rewardPointsEarned.toLocaleString("vi-VN")} điểm</dd></div>}
        </dl>
        {orderQrDataUrl && (
          <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center">
            <div>
              <h3 className="text-lg font-black">QR đơn vé</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">Xuất trình mã này tại quầy để nhân viên tra cứu và in toàn bộ vé hợp lệ chưa in trong đơn.</p>
            </div>
            <div className="rounded-2xl bg-white p-3 text-center text-black">
              <img className="mx-auto h-36 w-36 object-contain" src={orderQrDataUrl} alt={`QR đơn ${bookingSummary.bookingCode}`} />
              <p className="mt-1 text-[11px] font-black">{bookingSummary.bookingCode}</p>
            </div>
            <button
              type="button"
              className="min-h-11 rounded-full bg-[var(--aura-coral)] px-5 text-sm font-black text-[var(--aura-coral-ink)] sm:col-start-2"
              onClick={downloadOrderQr}
            >
              Tải QR đơn
            </button>
          </div>
        )}
      </section>

      {isLoading && (
        <section className="mt-6 rounded-[var(--aura-radius-lg)] border border-amber-300/20 bg-amber-300/10 p-6 text-center" aria-live="polite">
          <h2 className="font-black text-amber-100">Đang phát hành vé điện tử...</h2>
          <p className="mt-2 text-sm text-amber-100/75">Hệ thống đang tạo QR đơn vé. Vui lòng chờ trong giây lát.</p>
        </section>
      )}

      {!isLoading && ticketIssueMessage && !tickets.length && (
        <section className="mt-6 rounded-[var(--aura-radius-lg)] border border-amber-300/20 bg-amber-300/10 p-6 text-center" aria-live="polite">
          <h2 className="font-black text-amber-100">{ticketIssueMessage}</h2>
          {error && <p className="mt-2 text-sm text-amber-100/75">{error}</p>}
          <Link to="/tai-khoan?tab=tickets" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[var(--aura-coral)] px-5 text-sm font-black text-[var(--aura-coral-ink)] no-underline">Mở Vé của tôi</Link>
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
