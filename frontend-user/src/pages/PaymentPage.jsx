import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  cancelBooking,
  createSepayPgCheckout,
  createVnpayPaymentUrl,
  getBookingDetail,
  getBookingPaymentStatus,
} from "../services/bookingService";
import { getApiErrorMessage, showToast } from "../utils/toast";
import { getPublishedPolicies } from "../services/policyService";
import { getRemainingSeconds, isBookingExpired } from "../utils/bookingExpiry";
import { buildPaymentClosePath } from "../utils/paymentNavigation";

const DEFAULT_PAYMENT_POLICIES = [
  {
    _id: "default-payment-policy",
    title: "Kiểm tra thông tin trước khi thanh toán",
    summary: "Vui lòng kiểm tra kỹ thông tin phim, suất chiếu, phòng và ghế.",
    content: "Vé đã thanh toán thành công không hỗ trợ khách hàng tự hủy, đổi hoặc hoàn vé, trừ trường hợp được rạp xử lý theo chính sách.",
    requires_confirmation: true,
  },
];

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatBookingDate(value) {
  if (!value) return "Đang cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Đang cập nhật";
  return date.toLocaleDateString("vi-VN");
}

function formatBookingTime(value) {
  if (!value) return "Đang cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Đang cập nhật";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function mapBookingToSummary(booking, current = {}) {
  const existing = current || {};
  const showtime = booking?.showtime_id || {};
  const movie = showtime.movie_id || {};
  const room = showtime.room_id || {};
  const cinema = room.cinema_id || {};
  const seats = booking?.showtime_seat_ids || [];
  const combos = booking?.combos || [];
  const comboTotal = combos.reduce((total, item) => total + Number(item.subtotal || 0), 0);
  const subtotal = Number(booking?.subtotal_price || 0);

  return {
    ...existing,
    bookingId: booking?._id || existing.bookingId,
    bookingCode: booking?.booking_code || existing.bookingCode,
    movieTitle: movie.title || existing.movieTitle,
    movieId: movie._id || existing.movieId,
    ageClassification: Number(movie.age_limit) > 0 ? `T${movie.age_limit}` : "P",
    cinemaName: cinema.name || existing.cinemaName || "Đang cập nhật",
    roomName: room.name || existing.roomName || "Đang cập nhật",
    dateLabel: formatBookingDate(showtime.start_time),
    showtimeLabel: formatBookingTime(showtime.start_time),
    seatLabels: seats.map((item) => {
      const seat = item.seat_id || {};
      return `${seat.seat_row || ""}${seat.seat_number || ""}`;
    }).filter(Boolean),
    seatType: [...new Set(seats.map((item) => item.seat_id?.seat_type_id?.name).filter(Boolean))].join(", ") || existing.seatType || "Đang cập nhật",
    concessionItems: combos,
    concessionTotal: comboTotal,
    seatTotal: Math.max(subtotal - comboTotal, 0),
    voucherCode: booking?.voucher?.code || "",
    discountAmount: Number(booking?.discount_amount || 0),
    finalTotal: Number(booking?.total_price || 0),
    total_price: Number(booking?.total_price || 0),
    paymentStatus: booking?.payment_status || existing.paymentStatus || "pending",
    paymentExpiresAt: booking?.payment_expires_at || existing.paymentExpiresAt || null,
  };
}

function submitPaymentForm({ checkoutUrl, fields }) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkoutUrl;
  form.style.display = "none";

  Object.entries(fields || {}).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = String(value ?? "");
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

function PaymentMethodButton({ active, logo, title, subtitle, onClick }) {
  return (
    <button
      className={`min-h-[78px] rounded-[var(--aura-radius-md)] border p-3 text-center transition ${active ? "border-[var(--aura-coral)] bg-[#ff5364]/15" : "border-white/10 bg-[var(--aura-surface)] hover:border-white/25"}`}
      type="button"
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="grid place-items-center gap-2">
        {logo}
        <span>
          <span className="block text-xs font-black text-white">{title}</span>
          <span className="mt-1 block text-[11px] text-slate-400">{subtitle}</span>
        </span>
      </span>
    </button>
  );
}

function DetailRow({ label, value, strong = false }) {
  return (
    <p className="flex items-start justify-between gap-6 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className={`max-w-[58%] text-right ${strong ? "font-bold text-white" : "text-slate-200"}`}>{value}</span>
    </p>
  );
}

const splitPolicyParagraphs = (content = "") =>
  String(content)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

function PaymentPage() {
  const { bookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(() => location.state?.bookingSummary || null);
  const [paymentStatus, setPaymentStatus] = useState(summary?.paymentStatus || "pending");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("sepay");
  const [isPaying, setIsPaying] = useState(false);
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [hasConfirmedBooking, setHasConfirmedBooking] = useState(false);
  const [paymentPolicies, setPaymentPolicies] = useState([]);
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getRemainingSeconds(summary?.paymentExpiresAt),
  );

  const amount = useMemo(
    () => Number(summary?.finalTotal || summary?.total_price || 0),
    [summary?.finalTotal, summary?.total_price],
  );
  const bookingIsPaid = paymentStatus === "paid";
  const serverBookingIsExpired = ["expired", "refund_pending"].includes(paymentStatus);
  const bookingIsExpired = isBookingExpired(
    paymentStatus,
    summary?.paymentExpiresAt,
  );
  const publishedPaymentPolicies = paymentPolicies.filter((policy) => policy.surface === "payment");
  const visiblePaymentPolicies = publishedPaymentPolicies.length > 0
    ? publishedPaymentPolicies
    : DEFAULT_PAYMENT_POLICIES;
  const cinemaPolicies = paymentPolicies.filter((policy) => policy.surface !== "payment");
  const hasRequiredPolicies = visiblePaymentPolicies.some((policy) => policy.requires_confirmation);

  useEffect(() => {
    let active = true;

    getPublishedPolicies()
      .then((response) => {
        if (active) setPaymentPolicies(response.data || []);
      })
      .catch(() => {
        if (active) setPaymentPolicies([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!bookingId) return undefined;

    let isActive = true;
    const loadStatus = async () => {
      try {
        const response = await getBookingPaymentStatus(bookingId);
        const data = response.data || {};

        if (!isActive) return;

        setPaymentStatus(data.payment_status || "pending");
        setSummary((current) => ({
          ...current,
          bookingId: data.booking_id || bookingId,
          bookingCode: data.booking_code || current?.bookingCode || bookingId,
          finalTotal: current?.finalTotal || data.total_price || 0,
          total_price: data.total_price || current?.total_price || 0,
          paymentStatus: data.payment_status || current?.paymentStatus || "pending",
          paymentExpiresAt: data.payment_expires_at || current?.paymentExpiresAt || null,
        }));
      } catch (error) {
        if (isActive) {
          const message = getApiErrorMessage(error, "Không thể tải trạng thái thanh toán.");
          setPaymentError(message);
        }
      }
    };

    void loadStatus();
    const intervalId = window.setInterval(loadStatus, 3000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [bookingId]);

  useEffect(() => {
    if (!summary?.paymentExpiresAt || bookingIsPaid) {
      return undefined;
    }

    const updateCountdown = () => {
      setRemainingSeconds(getRemainingSeconds(summary.paymentExpiresAt));
    };
    const initialTimerId = window.setTimeout(updateCountdown, 0);
    const intervalId = window.setInterval(updateCountdown, 1000);
    return () => {
      window.clearTimeout(initialTimerId);
      window.clearInterval(intervalId);
    };
  }, [bookingIsPaid, summary?.paymentExpiresAt]);

  useEffect(() => {
    if (!serverBookingIsExpired || bookingIsPaid) return;
    showToast("error", "Đơn vé đã hết thời gian thanh toán. Ghế đã được mở lại để bạn chọn.");
    navigate("/lich-chieu", {
      replace: true,
      state: { message: "Đơn vé đã hết thời gian thanh toán. Ghế đã được mở lại để bạn chọn." },
    });
  }, [serverBookingIsExpired, bookingIsPaid, navigate]);

  useEffect(() => {
    if (!bookingId) return undefined;
    let active = true;

    getBookingDetail(bookingId)
      .then((response) => {
        if (active) setSummary((current) => mapBookingToSummary(response.data, current));
      })
      .catch((requestError) => {
        if (active) setPaymentError(getApiErrorMessage(requestError, "Không thể tải chi tiết đơn vé."));
      });

    return () => {
      active = false;
    };
  }, [bookingId]);

  useEffect(() => {
    if (bookingIsPaid && bookingId) {
      navigate(`/booking/success/${bookingId}`, { replace: true });
    }
  }, [bookingId, bookingIsPaid, navigate]);

  const completeSepayPgPayment = async () => {
    if (!bookingId) return;

    try {
      setIsPaying(true);
      setPaymentError("");
      const response = await createSepayPgCheckout({
        booking_id: bookingId,
        amount,
        frontend_url: window.location.origin,
      });
      const checkoutUrl = response.data?.checkoutUrl;
      const fields = response.data?.fields;

      if (!checkoutUrl || !fields) {
        const message = "Backend chưa trả về form thanh toán SePay.";
        setPaymentError(message);
        showToast("error", message);
        setIsPaying(false);
        return;
      }

      submitPaymentForm({ checkoutUrl, fields });
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Không thể mở thanh toán SePay.");
      setPaymentError(message);
      showToast("error", message);
      setIsPaying(false);
    }
  };

  const completeVnpayPayment = async () => {
    if (!bookingId) return;

    try {
      setIsPaying(true);
      setPaymentError("");
      const response = await createVnpayPaymentUrl({
        booking_id: bookingId,
        amount,
        frontend_url: window.location.origin,
      });
      const paymentUrl = response.data?.paymentUrl;

      if (!paymentUrl) {
        const message = "Backend chưa trả về URL thanh toán VNPay.";
        setPaymentError(message);
        showToast("error", message);
        setIsPaying(false);
        return;
      }

      window.location.href = paymentUrl;
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Không thể mở thanh toán VNPay.");
      setPaymentError(message);
      showToast("error", message);
      setIsPaying(false);
    }
  };

  const completeSelectedPayment = () => {
    if (selectedPaymentMethod === "sepay") {
      void completeSepayPgPayment();
      return;
    }

    void completeVnpayPayment();
  };

  const cancelPendingBooking = async () => {
    if (!bookingId || bookingIsPaid) return;

    try {
      setIsCancellingBooking(true);
      setPaymentError("");
      await cancelBooking(bookingId, { reason: "Khách hủy trước khi thanh toán" });
      navigate("/lich-chieu", {
        replace: true,
        state: { message: "Đã hủy đơn thanh toán. Bạn có thể chọn lại ghế." },
      });
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Không thể hủy đơn đặt vé.");
      setPaymentError(message);
      showToast("error", message);
    } finally {
      setIsCancellingBooking(false);
    }
  };

  const closePayment = () => {
    navigate(buildPaymentClosePath(summary));
  };

  const selectedPaymentButtonText = selectedPaymentMethod === "sepay" ? "Thanh toán qua SePay" : "Thanh toán qua VNPay";
  const selectedPaymentLoadingText = selectedPaymentMethod === "sepay" ? "Đang mở SePay..." : "Đang mở VNPay...";

  return (
    <main className="mx-auto min-h-[70vh] w-[min(960px,calc(100%_-_32px))] py-10 text-white">
      <section className="rounded-[var(--aura-radius-lg)] border border-white/10 bg-[var(--aura-ink)] p-5 shadow-[var(--aura-shadow-floating)]">
        <h1 className="text-center text-xl font-black text-white">Xác nhận đơn hàng</h1>

        <div className="mx-auto mt-6 w-full max-w-[560px] rounded-[var(--aura-radius-md)] bg-[var(--aura-surface)] p-5">
          <div className="grid gap-4">
            <DetailRow label="Phim" value={summary?.movieTitle || "Thanh toán đơn vé"} strong />
            <DetailRow label="Phân loại độ tuổi" value={summary?.ageClassification || "P"} strong />
            <DetailRow label="Rạp" value={summary?.cinemaName || "Đang cập nhật"} />
            <DetailRow label="Phòng" value={summary?.roomName || "Đang cập nhật"} />
            <DetailRow label="Thời gian" value={`${summary?.showtimeLabel || "Đang cập nhật"} - ${summary?.dateLabel || ""}`} />
            <DetailRow label={`Ghế đã chọn (${summary?.seatLabels?.length || 0})`} value={summary?.seatLabels?.join(", ") || "Đang cập nhật"} />
            <DetailRow label="Loại ghế" value={summary?.seatType || "Đang cập nhật"} />
            <DetailRow label="Combo" value={summary?.concessionItems?.length ? summary.concessionItems.map((item) => `${item.name} ×${item.quantity}`).join(", ") : "Không có"} />
          </div>

          <div className="mt-7 grid gap-3 border-t border-white/5 pt-5">
            <DetailRow label="Mã đơn" value={summary?.bookingCode || bookingId} strong />
            <DetailRow label="Trạng thái" value={bookingIsExpired ? "Đã hết hạn" : "Đang thanh toán"} strong />
            {!bookingIsExpired && remainingSeconds > 0 && (
              <DetailRow
                label="Thời gian còn lại"
                value={`${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`}
                strong
              />
            )}
            <DetailRow label="Tiền vé" value={formatCurrency(summary?.seatTotal || amount)} />
            <DetailRow label="Tiền bắp nước" value={formatCurrency(summary?.concessionTotal)} />
            <DetailRow label="Giảm giá" value={`- ${formatCurrency(summary?.discountAmount)}`} />
          </div>

          <div className="mt-5 rounded-md bg-black/35 p-3">
            <div className="rounded bg-[var(--aura-midnight)] px-3 py-2 text-xs text-[var(--aura-text-muted)]">Mã giảm giá</div>
            <div className="mt-2 flex items-center justify-between rounded bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300">
              <span>{summary?.voucherCode ? `Đã áp dụng mã: ${summary.voucherCode}` : "Chưa áp dụng mã giảm giá"}</span>
              <span>- {formatCurrency(summary?.discountAmount)}</span>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-bold text-slate-300">Chọn phương thức thanh toán</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <PaymentMethodButton
                active={selectedPaymentMethod === "sepay"}
                logo={<span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[10px] font-black text-[#2f73df]">SePay</span>}
                title="SePay"
                subtitle="Cổng thanh toán SePay"
                onClick={() => setSelectedPaymentMethod("sepay")}
              />
              <PaymentMethodButton
                active={selectedPaymentMethod === "vnpay"}
                logo={<span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[10px] font-black text-[#075ea8]"><span><span className="text-[#ed1c24]">VN</span>PAY</span></span>}
                title="VNPay"
                subtitle="Thẻ ATM hoặc QR code"
                onClick={() => setSelectedPaymentMethod("vnpay")}
              />
            </div>
          </div>

          <div className="mt-7 flex items-end justify-between border-t border-white/5 pt-5">
            <span className="text-sm text-slate-400">Tổng thanh toán</span>
            <strong className="text-3xl font-black text-[var(--aura-coral)]">{formatCurrency(amount)}</strong>
          </div>

          <section className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100" aria-labelledby="payment-policies-title">
            <h2 className="text-sm font-black text-amber-50" id="payment-policies-title">Chính sách trước khi thanh toán</h2>
            <div className="mt-2 grid gap-2">
              {visiblePaymentPolicies.map((policy, index) => (
                <details className="group rounded-lg bg-black/10 px-3 py-2" key={policy._id} open={index === 0 ? true : undefined}>
                  <summary className="cursor-pointer list-none font-bold text-amber-50 marker:hidden">
                    {policy.title}
                    <span className="ms-2 text-xs font-medium text-amber-100/65 group-open:hidden">Xem nội dung</span>
                  </summary>
                  {policy.summary && <p className="mt-2 font-semibold text-amber-50/90">{policy.summary}</p>}
                  <div className="mt-2 grid max-h-44 gap-2 overflow-y-auto pe-2 text-amber-100/80">
                    {splitPolicyParagraphs(policy.content).map((paragraph, paragraphIndex) => (
                      <p className="whitespace-pre-line" key={`${policy._id}-${paragraphIndex}`}>{paragraph}</p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>

          {cinemaPolicies.length > 0 && (
            <section className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-200" aria-labelledby="cinema-policies-title">
              <h2 className="text-sm font-black text-white" id="cinema-policies-title">Các chính sách của rạp</h2>
              <p className="mt-1 text-xs text-slate-400">Thông tin được rạp công bố và áp dụng cho giao dịch của bạn.</p>
              <div className="mt-3 grid gap-2">
                {cinemaPolicies.map((policy) => (
                  <details className="group rounded-lg bg-white/[0.04] px-3 py-2" key={policy._id}>
                    <summary className="cursor-pointer list-none font-bold text-slate-100 marker:hidden">
                      {policy.title}
                      <span className="ms-2 text-xs font-medium text-slate-400 group-open:hidden">Xem nội dung</span>
                    </summary>
                    {policy.summary && <p className="mt-2 font-semibold text-slate-200">{policy.summary}</p>}
                    <div className="mt-2 grid max-h-44 gap-2 overflow-y-auto pe-2 text-slate-300">
                      {splitPolicyParagraphs(policy.content).map((paragraph, paragraphIndex) => (
                        <p className="whitespace-pre-line" key={`${policy._id}-${paragraphIndex}`}>{paragraph}</p>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
            <input className="mt-1 h-5 w-5 accent-[var(--aura-coral)]" type="checkbox" checked={hasConfirmedBooking} onChange={(event) => setHasConfirmedBooking(event.target.checked)} />
            <span>{hasRequiredPolicies ? "Tôi đã kiểm tra thông tin đặt vé và đọc các chính sách áp dụng." : "Tôi đã kiểm tra và xác nhận thông tin đặt vé."}</span>
          </label>
        </div>

        {paymentError && <p className="mx-auto mt-4 max-w-[560px] rounded-md border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">{paymentError}</p>}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <button className="h-11 rounded-[var(--aura-radius-sm)] border border-red-400/30 bg-red-500/10 px-4 text-sm font-bold text-red-100 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={cancelPendingBooking} disabled={isCancellingBooking || isPaying}>
              {isCancellingBooking ? "Đang hủy..." : "Hủy đặt vé"}
            </button>
            <button className="h-11 rounded-[var(--aura-radius-sm)] border border-white/15 bg-white/[0.04] px-4 text-sm font-bold text-white hover:border-white/30" type="button" onClick={closePayment}>
              Quay lại phim
            </button>
          </div>
          <button
            className="h-11 rounded-[var(--aura-radius-sm)] bg-[var(--aura-coral)] px-5 text-sm font-extrabold text-[var(--aura-coral-ink)] hover:bg-[var(--aura-coral-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={completeSelectedPayment}
            disabled={isPaying || isCancellingBooking || bookingIsExpired || !amount || !hasConfirmedBooking}
          >
            {isPaying ? selectedPaymentLoadingText : selectedPaymentButtonText}
          </button>
        </div>
      </section>
    </main>
  );
}

export default PaymentPage;
