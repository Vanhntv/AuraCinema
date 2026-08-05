import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifySepayPgReturn } from "../services/bookingService";

function SepayPgReturnPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Đang xác minh thanh toán SePay...");

  useEffect(() => {
    let isActive = true;

    const verifyPayment = async () => {
      try {
        const response = await verifySepayPgReturn(location.search || "");
        const bookingId = response.data?.booking_id;

        if (!isActive) return;

        if (response.success && bookingId) {
          navigate(`/booking/success/${bookingId}`, { replace: true });
          return;
        }

        navigate("/booking/failed", {
          replace: true,
          state: { message: response.message || "Thanh toán SePay chưa hoàn tất." },
        });
      } catch (error) {
        if (!isActive) return;

        const errorMessage = error.response?.data?.message || "Không thể xác minh thanh toán SePay.";
        setMessage(errorMessage);
        navigate("/booking/failed", {
          replace: true,
          state: { message: errorMessage },
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
