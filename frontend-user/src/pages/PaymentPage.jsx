import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  cancelBooking,
  createSepayPgCheckout,
  createVnpayPaymentUrl,
  getBookingPaymentStatus,
} from "../services/bookingService";

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
      className={`min-h-[78px] rounded-lg border p-3 text-center transition ${active ? "border-[#f2374a] bg-[#351215] shadow-[0_0_0_1px_rgba(242,55,74,0.35)]" : "border-white/10 bg-[#151515] hover:border-white/25"}`}
      type="button"
      onClick={onClick}
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
      } catch {
        if (isActive) setPaymentError("Không thể tải trạng thái thanh toán.");
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
      const response = await createSepayPgCheckout({ booking_id: bookingId, amount });
      const checkoutUrl = response.data?.checkoutUrl;
      const fields = response.data?.fields;

      if (!checkoutUrl || !fields) {
        setPaymentError("Backend chưa trả về form thanh toán SePay.");
        setIsPaying(false);
        return;
      }

      submitPaymentForm({ checkoutUrl, fields });
    } catch (requestError) {
      setPaymentError(requestError.response?.data?.message || "Không thể mở thanh toán SePay.");
      setIsPaying(false);
    }
  };

  const completeVnpayPayment = async () => {
    if (!bookingId) return;

    try {
      setIsPaying(true);
      setPaymentError("");
      const response = await createVnpayPaymentUrl({ booking_id: bookingId, amount });
      const paymentUrl = response.data?.paymentUrl;

      if (!paymentUrl) {
        setPaymentError("Backend chưa trả về URL thanh toán VNPay.");
        setIsPaying(false);
        return;
      }

      window.location.href = paymentUrl;
    } catch (requestError) {
      setPaymentError(requestError.response?.data?.message || "Không thể mở thanh toán VNPay.");
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
        state: { message: "Đã hủy đơn chờ thanh toán. Bạn có thể chọn lại ghế." },
      });
    } catch (requestError) {
      setPaymentError(requestError.response?.data?.message || "Không thể hủy đơn đặt vé.");
    } finally {
      setIsCancellingBooking(false);
    }
  };

  const selectedPaymentButtonText = selectedPaymentMethod === "sepay" ? "Thanh toán qua SePay" : "Thanh toán qua VNPay";
  const selectedPaymentLoadingText = selectedPaymentMethod === "sepay" ? "Đang mở SePay..." : "Đang mở VNPay...";

  return (
    <main className="mx-auto min-h-[70vh] w-[min(960px,calc(100%_-_32px))] py-10 text-white">
      <section className="rounded-lg border border-white/10 bg-[#0b0b0b] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.5)]">
        <h1 className="text-center text-xl font-black text-white">Xác nhận đơn hàng</h1>

        <div className="mx-auto mt-6 w-full max-w-[560px] rounded-lg bg-[#171717] p-5">
          <div className="grid gap-4">
            <DetailRow label="Phim" value={summary?.movieTitle || "Thanh toán đơn vé"} strong />
            <DetailRow label="Rạp & Phòng" value={summary?.roomName || "Đang cập nhật"} />
            <DetailRow label="Thời gian" value={`${summary?.showtimeLabel || "Đang cập nhật"} - ${summary?.dateLabel || ""}`} />
            <DetailRow label={`Ghế đã chọn (${summary?.seatLabels?.length || 0})`} value={summary?.seatLabels?.join(", ") || "Đang cập nhật"} />
          </div>

          <div className="mt-7 grid gap-3 border-t border-white/5 pt-5">
            <DetailRow label="Mã đơn" value={summary?.bookingCode || bookingId} strong />
            <DetailRow label="Trạng thái" value="Chờ thanh toán" strong />
            <DetailRow label="Tiền vé" value={formatCurrency(summary?.seatTotal || amount)} />
            <DetailRow label="Tiền bắp nước" value={formatCurrency(summary?.concessionTotal)} />
            <DetailRow label="Giảm giá" value={`- ${formatCurrency(summary?.discountAmount)}`} />
          </div>

          <div className="mt-5 rounded-md bg-black/35 p-3">
            <div className="rounded bg-[#050505] px-3 py-2 text-xs text-slate-500">Mã giảm giá</div>
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
            <strong className="text-3xl font-black text-[#ff5364]">{formatCurrency(amount)}</strong>
          </div>
        </div>

        {paymentError && <p className="mx-auto mt-4 max-w-[560px] rounded-md border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">{paymentError}</p>}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <button className="h-10 rounded-md border border-white/15 bg-white/[0.04] px-4 text-xs font-bold text-white hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={cancelPendingBooking} disabled={isCancellingBooking || isPaying}>
              {isCancellingBooking ? "Đang hủy..." : "Hủy đặt vé"}
            </button>
            <button className="h-10 rounded-md border border-white/15 bg-white/[0.04] px-4 text-xs font-bold text-white hover:border-white/30" type="button" onClick={() => navigate("/")}>
              Đóng
            </button>
          </div>
          <button
            className="h-10 rounded-md bg-[#e72f42] px-5 text-xs font-bold text-white shadow-[0_12px_30px_rgba(231,47,66,0.28)] hover:bg-[#ff4054] disabled:cursor-not-allowed disabled:opacity-60"
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
