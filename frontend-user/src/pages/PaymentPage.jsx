import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  cancelBooking,
  createSepayPgCheckout,
  createVnpayPaymentUrl,
  getBookingPaymentStatus,
} from "../services/bookingService";
import { getApiErrorMessage, showToast } from "../utils/toast";

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
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

  const amount = useMemo(
    () => Number(summary?.finalTotal || summary?.total_price || 0),
    [summary?.finalTotal, summary?.total_price],
  );
  const bookingIsPaid = paymentStatus === "paid";

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
    navigate("/tai-khoan?tab=tickets");
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
            <DetailRow label="Rạp & Phòng" value={summary?.roomName || "Đang cập nhật"} />
            <DetailRow label="Thời gian" value={`${summary?.showtimeLabel || "Đang cập nhật"} - ${summary?.dateLabel || ""}`} />
            <DetailRow label={`Ghế đã chọn (${summary?.seatLabels?.length || 0})`} value={summary?.seatLabels?.join(", ") || "Đang cập nhật"} />
          </div>

          <div className="mt-7 grid gap-3 border-t border-white/5 pt-5">
            <DetailRow label="Mã đơn" value={summary?.bookingCode || bookingId} strong />
            <DetailRow label="Trạng thái" value="Đang thanh toán" strong />
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
        </div>

        {paymentError && <p className="mx-auto mt-4 max-w-[560px] rounded-md border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">{paymentError}</p>}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <button className="h-11 rounded-[var(--aura-radius-sm)] border border-red-400/30 bg-red-500/10 px-4 text-sm font-bold text-red-100 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={cancelPendingBooking} disabled={isCancellingBooking || isPaying}>
              {isCancellingBooking ? "Đang hủy..." : "Hủy đặt vé"}
            </button>
            <button className="h-11 rounded-[var(--aura-radius-sm)] border border-white/15 bg-white/[0.04] px-4 text-sm font-bold text-white hover:border-white/30" type="button" onClick={closePayment}>
              Đóng
            </button>
          </div>
          <button
            className="h-11 rounded-[var(--aura-radius-sm)] bg-[var(--aura-coral)] px-5 text-sm font-extrabold text-[var(--aura-coral-ink)] hover:bg-[var(--aura-coral-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={completeSelectedPayment}
            disabled={isPaying || isCancellingBooking || !amount}
          >
            {isPaying ? selectedPaymentLoadingText : selectedPaymentButtonText}
          </button>
        </div>
      </section>
    </main>
  );
}

export default PaymentPage;
