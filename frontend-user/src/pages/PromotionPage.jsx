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
    <div className="w-full pb-20 pt-5 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-white">
      <div className="mx-auto w-[min(1240px,calc(100%_-_56px))] max-sm:w-[calc(100%_-_28px)]">
        <div className="mb-7 flex items-end justify-between gap-4 border-b border-white/8 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-[28px]">
            Khuyến mãi
          </h1>
          <span className="text-sm text-slate-400 max-sm:hidden">Ưu đãi đang áp dụng</span>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.025]"
              >
                <div className="aspect-video animate-pulse bg-white/10" />
                <div className="p-4">
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
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-7 text-center text-sm font-semibold text-red-100">
            {error}
          </div>
        )}

        {!isLoading && !error && promotions.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-10 text-center text-slate-300">
            Hiện chưa có chương trình khuyến mãi.
          </div>
        )}

        {!isLoading && !error && promotions.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {promotions.map((promo) => (
              <Link
                key={promo.id}
                to={`/khuyen-mai/${promo.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#151a25] no-underline transition duration-200 hover:-translate-y-0.5 hover:border-white/18 hover:bg-[#171d29]"
              >
                <div className="relative aspect-[16/8.5] w-full overflow-hidden bg-slate-900">
                  <img
                    src={promo.thumbnail}
                    alt={promo.title}
                    className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.src = DEFAULT_PROMOTION_IMAGE;
                    }}
                  />
                </div>

                <div className="flex min-h-[190px] flex-1 flex-col justify-between p-4">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-[#ff7a86]">
                      <span>{promo.category}</span>
                      <span className="text-slate-500">•</span>
                      <span>{promo.startDate} - {promo.endDate}</span>
                    </div>

                    <h3 className="line-clamp-2 text-[16px] font-bold leading-snug text-slate-100 transition-colors duration-200 group-hover:text-[#ff7a86]">
                      {promo.title}
                    </h3>

                    <p className="mt-2.5 line-clamp-2 text-sm leading-6 text-slate-400">
                      {promo.summary}
                    </p>

                    <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-300">
                      <span className="inline-flex w-fit rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-white">
                        Mã: {promo.code}
                      </span>
                      <span>
                        {promo.discountTypeLabel}:{" "}
                        <strong className="text-[#ff9aa5]">{promo.discountValueLabel}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/8 pt-3 text-sm font-semibold text-slate-400 transition-colors duration-200 group-hover:text-[#ff7a86]">
                    <span>Xem chi tiết</span>
                    <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
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
