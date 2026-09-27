import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getPublishedPolicies } from "../services/policyService";

const fallbackPolicies = [
  {
    _id: "payment-fallback",
    surface: "payment",
    title: "Điều khoản thanh toán",
    content: "Vui lòng kiểm tra phim, ngày chiếu, suất chiếu, ghế và tổng tiền trước khi thanh toán. Vé đã thanh toán được xử lý theo chính sách hủy, đổi và hoàn vé hiện hành của AuraCinema.",
  },
  {
    _id: "terms-fallback",
    surface: "terms",
    title: "Điều khoản sử dụng",
    content: "Người đặt vé cần cung cấp thông tin liên hệ chính xác và tuân thủ quy định của rạp, bao gồm mức phân loại độ tuổi của phim. Quyền lợi của khách hàng được bảo đảm theo chính sách hiện hành và pháp luật áp dụng.",
  },
];

function selectBookingPolicies(policies) {
  const published = (policies || []).filter((policy) =>
    ["payment", "terms", "booking"].includes(policy.surface),
  );
  const visible = ["payment", "terms"].flatMap((surface) => {
    const matches = published.filter((policy) => policy.surface === surface);
    return matches.length ? matches : fallbackPolicies.filter((policy) => policy.surface === surface);
  });
  return [...visible, ...published.filter((policy) => policy.surface === "booking")];
}

function BookingPolicyDialog({ movieTitle, ageLimit, remainingSeconds, hasDeadline, isSubmitting, submitError, onClose, onConfirm }) {
  const [policies, setPolicies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const deadlineReached = hasDeadline && remainingSeconds <= 0;
  const countdown = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;

  const loadPolicies = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const response = await getPublishedPolicies();
      setPolicies(selectBookingPolicies(response.data));
    } catch {
      setLoadError("Không thể tải chính sách. Vui lòng thử lại để tiếp tục đặt vé.");
      setAgreed(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getPublishedPolicies()
      .then((response) => {
        if (active) setPolicies(selectBookingPolicies(response.data));
      })
      .catch(() => {
        if (active) setLoadError("Không thể tải chính sách. Vui lòng thử lại để tiếp tục đặt vé.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!isSubmitting) onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = [...dialogRef.current.querySelectorAll(
        "button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])",
      )];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [isSubmitting, onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-3 sm:p-6">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-policy-title"
        aria-describedby="booking-policy-intro"
        className="flex max-h-[min(760px,calc(100dvh_-_24px))] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111a28] text-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff8d9a]">Trước khi xác nhận đơn</p>
            <h2 id="booking-policy-title" className="mt-1 text-xl font-black sm:text-2xl">Điều khoản thanh toán và sử dụng</h2>
            <p id="booking-policy-intro" className="mt-1 text-sm text-slate-400">Vui lòng đọc các điều khoản áp dụng cho vé của bạn.</p>
            {hasDeadline && <p className={`mt-2 text-sm font-bold ${deadlineReached ? "text-rose-300" : "text-amber-200"}`}>Thời gian giữ ghế còn lại: {countdown}</p>}
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} disabled={isSubmitting} aria-label="Đóng điều khoản" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 disabled:opacity-50">×</button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 text-sm leading-6 sm:px-7">
          <section className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-amber-50">
            <h3 className="font-black">Quy định về độ tuổi xem phim</h3>
            <p className="mt-2">
              {ageLimit > 0
                ? `Phim “${movieTitle}” được phân loại T${ageLimit}, dành cho khán giả từ đủ ${ageLimit} tuổi trở lên. Người đặt vé có trách nhiệm chọn vé phù hợp với độ tuổi của từng người xem.`
                : `Người đặt vé có trách nhiệm kiểm tra mức phân loại phim “${movieTitle}” và chọn vé phù hợp với độ tuổi của từng người xem.`}
            </p>
            <p className="mt-2">Rạp có thể yêu cầu giấy tờ xác minh độ tuổi khi vào xem và từ chối phục vụ người không đáp ứng mức phân loại của phim. Trường hợp cung cấp thông tin tuổi không đúng hoặc không tuân thủ quy định, việc xử lý vé thực hiện theo chính sách đã công bố và pháp luật áp dụng.</p>
          </section>

          {isLoading && <p role="status" className="text-slate-300">Đang tải chính sách...</p>}
          {loadError && (
            <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-100">
              <p>{loadError}</p>
              <button type="button" onClick={() => void loadPolicies()} className="mt-3 rounded-full border border-rose-300/40 px-4 py-2 font-bold hover:bg-rose-500/20">Thử lại</button>
            </div>
          )}
          {!isLoading && !loadError && policies.map((policy) => (
            <section key={policy._id} className="border-t border-white/10 pt-5 first:border-0 first:pt-0">
              <h3 className="text-base font-black text-white">{policy.title}</h3>
              {policy.summary && <p className="mt-2 font-semibold text-slate-300">{policy.summary}</p>}
              <div className="mt-3 space-y-3 text-slate-300">
                {String(policy.content || "").split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => (
                  <p key={index} className="whitespace-pre-line">{paragraph.trim()}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="shrink-0 border-t border-white/10 bg-[#172130] px-5 py-4 sm:px-7">
          <label className="flex cursor-pointer items-start gap-3 text-sm font-bold leading-5 text-white">
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} disabled={isLoading || Boolean(loadError) || isSubmitting} className="mt-0.5 h-5 w-5 shrink-0 accent-[#f15a70]" />
            <span>Tôi đồng ý với điều khoản sử dụng và mua vé phù hợp với độ tuổi</span>
          </label>
          {submitError && <p role="alert" className="mt-3 text-sm text-rose-200">{submitError}</p>}
          <button type="button" onClick={onConfirm} disabled={!agreed || isLoading || Boolean(loadError) || isSubmitting || deadlineReached} className="mt-4 h-11 w-full rounded-full bg-[var(--aura-coral)] px-6 text-sm font-black text-[var(--aura-coral-ink)] hover:bg-[var(--aura-coral-hover)] disabled:cursor-not-allowed disabled:opacity-40 sm:mx-auto sm:block sm:w-56">
            {isSubmitting ? "Đang đặt vé..." : "Thanh toán"}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

export default BookingPolicyDialog;
