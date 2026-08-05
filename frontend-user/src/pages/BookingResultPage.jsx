import { Link, useLocation, useParams } from "react-router-dom";

function BookingResultPage({ result = "success" }) {
  const { bookingId } = useParams();
  const location = useLocation();
  const isSuccess = result === "success";
  const message = location.state?.message;

  return (
    <section className="mx-auto grid min-h-[60vh] w-[min(760px,calc(100%_-_32px))] place-items-center py-16">
      <div className={`w-full rounded-3xl border p-8 ${isSuccess ? "border-emerald-400/20 bg-emerald-400/10" : "border-red-400/20 bg-red-500/10"}`}>
        <p className={`text-sm font-black uppercase tracking-[0.22em] ${isSuccess ? "text-emerald-200" : "text-red-100"}`}>
          {isSuccess ? "Thanh toán thành công" : "Thanh toán thất bại"}
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">
          {isSuccess ? "Đơn vé đã được xác nhận" : "Chưa thể xác nhận đơn vé"}
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-300">
          {isSuccess
            ? "Vé đã được lưu trong tài khoản của bạn."
            : message || "Giao dịch VNPay không thành công hoặc không thể xác minh."}
        </p>
        {bookingId && (
          <p className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
            Mã đơn: <strong className="text-white">{bookingId}</strong>
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="rounded-full bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] px-6 py-3 text-sm font-extrabold text-white no-underline" to="/tai-khoan?tab=tickets">
            Xem vé của tôi
          </Link>
          <Link className="rounded-full border border-white/10 bg-white/[0.06] px-6 py-3 text-sm font-extrabold text-white no-underline hover:border-[#ff6070]" to="/">
            Về trang chủ
          </Link>
        </div>
      </div>
    </section>
  );
}

export default BookingResultPage;
