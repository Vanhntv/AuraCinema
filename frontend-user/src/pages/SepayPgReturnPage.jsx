import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifySepayPgReturn } from "../services/bookingService";
import { SEPAY_CHECKOUT_MESSAGE_TYPE } from "../utils/sepayCheckoutWindow";
import { clearPaymentReturnState } from "../utils/paymentNavigation";

function SepayPgReturnPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Đang xác minh thanh toán SePay...");

  useEffect(() => {
    let isActive = true;
    const query = new URLSearchParams(location.search || "");
    const requestedBookingId = query.get("booking_id") || "";

    const notifyCheckoutWindow = ({ success, bookingId, paymentStatus, resultMessage }) => {
      if (!window.opener || window.opener.closed) return false;

      window.opener.postMessage({
        type: SEPAY_CHECKOUT_MESSAGE_TYPE,
        success,
        bookingId: bookingId || requestedBookingId,
        paymentStatus,
        message: resultMessage,
      }, window.location.origin);
      window.setTimeout(() => window.close(), 150);
      return true;
    };

    const navigateAfterFailure = ({ paymentStatus, resultMessage }) => {
      if (["expired", "cancelled"].includes(paymentStatus)) {
        navigate("/lich-chieu", {
          replace: true,
          state: { message: resultMessage },
        });
        return;
      }

      navigate("/booking/failed", {
        replace: true,
        state: { message: resultMessage },
      });
    };

    const verifyPayment = async () => {
      try {
        const response = await verifySepayPgReturn(location.search || "");
        const bookingId = response.data?.booking_id || requestedBookingId;
        const paymentStatus = response.data?.payment_status || "";

        if (!isActive) return;

        if (response.success && bookingId) {
          clearPaymentReturnState(bookingId);
          if (notifyCheckoutWindow({
            success: true,
            bookingId,
            paymentStatus,
            resultMessage: response.message,
          })) {
            setMessage("Thanh toán thành công. Đang quay lại AuraCinema...");
            return;
          }
          navigate(`/booking/success/${bookingId}`, { replace: true });
          return;
        }

        if (notifyCheckoutWindow({
          success: false,
          bookingId,
          paymentStatus,
          resultMessage: response.message || "Thanh toán SePay chưa hoàn tất.",
        })) {
          if (["expired", "cancelled"].includes(paymentStatus)) {
            clearPaymentReturnState(bookingId);
          }
          setMessage(response.message || "Thanh toán chưa hoàn tất. Đang quay lại AuraCinema...");
          return;
        }

        navigateAfterFailure({
          paymentStatus,
          resultMessage: response.message || "Thanh toán SePay chưa hoàn tất.",
        });
        if (["expired", "cancelled"].includes(paymentStatus)) {
          clearPaymentReturnState(bookingId);
        }
      } catch (error) {
        if (!isActive) return;

        const errorMessage = error.response?.data?.message || "Không thể xác minh thanh toán SePay.";
        setMessage(errorMessage);
        const responseData = error.response?.data?.data || {};
        if (notifyCheckoutWindow({
          success: false,
          bookingId: responseData.booking_id || requestedBookingId,
          paymentStatus: responseData.payment_status || "",
          resultMessage: errorMessage,
        })) return;

        navigateAfterFailure({
          paymentStatus: responseData.payment_status || "",
          resultMessage: errorMessage,
        });
      }
    };

    void verifyPayment();

    return () => {
      isActive = false;
    };
  }, [location.search, navigate]);

  return (
    <section className="mx-auto grid min-h-[60vh] w-[min(760px,calc(100%_-_32px))] place-items-center py-16">
      <div className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ff6070]">SePay</p>
        <h1 className="mt-3 text-3xl font-black text-white">Xác minh thanh toán</h1>
        <p className="mt-4 text-sm text-slate-300">{message}</p>
      </div>
    </section>
  );
}

export default SepayPgReturnPage;
