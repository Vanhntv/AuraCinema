import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPublicVouchers } from "../services/voucherService";
import {
  DEFAULT_PROMOTION_IMAGE,
  mapVoucherToPromotion,
} from "../utils/voucherPromotion";

function PromotionPage() {
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadPromotions = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await getPublicVouchers();
        const items = (response.data || []).map(mapVoucherToPromotion);
        if (active) setPromotions(items);
      } catch (requestError) {
        if (active) {
          setPromotions([]);
          setError(
            requestError.response?.data?.message ||
              "Không thể tải danh sách khuyến mãi. Vui lòng thử lại sau.",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadPromotions();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="w-full pb-24 pt-6 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-white">
      <div className="mx-auto w-[min(1760px,calc(100%_-_96px))] max-xl:w-[min(1120px,calc(100%_-_56px))] max-sm:w-[calc(100%_-_28px)]">
        <div className="mb-10 border-b border-white/10 pb-6">
          <h1 className="text-2xl font-extrabold uppercase tracking-wider text-[var(--aura-projector-white)] md:text-3xl">
            Khuyến mãi
          </h1>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-[20px] border border-white/5 bg-white/[0.02]"
              >
                <div className="aspect-video animate-pulse bg-white/10" />
                <div className="p-5">
                  <div className="h-3 w-32 animate-pulse rounded-full bg-white/10" />
                  <div className="mt-4 h-5 w-full animate-pulse rounded-full bg-white/10" />
                  <div className="mt-2 h-5 w-3/4 animate-pulse rounded-full bg-white/10" />
                  <div className="mt-5 h-4 w-24 animate-pulse rounded-full bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-[24px] border border-red-500/20 bg-red-500/10 px-6 py-8 text-center text-sm font-semibold text-red-100">
            {error}
          </div>
        )}

        {!isLoading && !error && promotions.length === 0 && (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-6 py-12 text-center text-slate-300">
            Hiện chưa có chương trình khuyến mãi.
          </div>
        )}

        {!isLoading && !error && promotions.length > 0 && (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {promotions.map((promo) => (
              <Link
                key={promo.id}
                to={`/khuyen-mai/${promo.id}`}
                className="group flex flex-col overflow-hidden rounded-[var(--aura-radius-lg)] border border-white/10 bg-[var(--aura-surface)] transition duration-200 hover:-translate-y-0.5 hover:border-[#ff6070]/40 hover:bg-[var(--aura-surface-raised)]"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                  <img
                    src={promo.thumbnail}
                    alt={promo.title}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.src = DEFAULT_PROMOTION_IMAGE;
                    }}
                  />
                </div>

                <div className="flex min-h-[220px] flex-1 flex-col justify-between p-5">
                  <div>
                    <div className="mb-2.5 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#ff6070]">
                      <span>{promo.category}</span>
                      <span className="text-slate-500">•</span>
                      <span>{promo.startDate} - {promo.endDate}</span>
                    </div>

                    <h3 className="line-clamp-3 text-[15px] font-bold leading-snug text-slate-100 transition-colors duration-300 group-hover:text-[#ff6070]">
                      {promo.title}
                    </h3>

                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
                      {promo.summary}
                    </p>

                    <div className="mt-4 grid gap-2 text-xs font-bold text-slate-300">
                      <span className="inline-flex w-fit rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-white">
                        Mã: {promo.code}
                      </span>
                      <span>
                        {promo.discountTypeLabel}:{" "}
                        <strong className="text-[#ff9aa5]">{promo.discountValueLabel}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 text-xs font-bold text-slate-400 transition-colors duration-300 group-hover:text-[#ff6070]">
                    <span>Xem chi tiết</span>
                    <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PromotionPage;
