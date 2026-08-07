import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getPublicVoucherById, getPublicVouchers } from "../services/voucherService";
import {
  DEFAULT_PROMOTION_IMAGE,
  mapVoucherToPromotion,
} from "../utils/voucherPromotion";

function PromotionSkeleton() {
  return (
    <div className="mx-auto w-[min(1120px,calc(100%_-_56px))] max-sm:w-[calc(100%_-_28px)] py-8 text-white">
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        <div className="h-4 w-36 animate-pulse rounded-full bg-white/10" />
        <div className="mt-4 h-12 w-[86%] animate-pulse rounded-2xl bg-white/10" />
        <div className="mt-4 h-6 w-[60%] animate-pulse rounded-full bg-white/10" />
        <div className="mt-8 grid gap-4">
          <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-[95%] animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-[88%] animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-[74%] animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-[92%] animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function InfoChip({ label, value }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300">
      <span className="font-bold text-white">{label}:</span> {value}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-wrap justify-between gap-3 border-b border-white/10 py-4 text-sm">
      <span className="text-slate-400">{label}</span>
      <strong className="text-right text-white">{value || "-"}</strong>
    </div>
  );
}

function PromotionDetailPage() {
  const { slug } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [promotion, setPromotion] = useState(null);
  const [relatedPromotions, setRelatedPromotions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadPromotion = async () => {
      try {
        setIsLoading(true);
        setError("");
        const [detailResponse, listResponse] = await Promise.all([
          getPublicVoucherById(slug),
          getPublicVouchers(),
        ]);
        const detail = mapVoucherToPromotion(detailResponse.data);
        const related = (listResponse.data || [])
          .map(mapVoucherToPromotion)
          .filter((item) => item.id !== detail.id)
          .slice(0, 3);

        if (!active) return;

        setPromotion(detail);
        setRelatedPromotions(related);
        document.title = `${detail.title} | AuraCinema`;
      } catch (requestError) {
        if (!active) return;
        setPromotion(null);
        setRelatedPromotions([]);
        setError(
          requestError.response?.data?.message ||
            "Không thể tải chi tiết khuyến mãi.",
        );
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadPromotion();

    return () => {
      active = false;
    };
  }, [slug]);

  if (isLoading) {
    return <PromotionSkeleton />;
  }

  if (!promotion && !error) {
    return <Navigate to="/khuyen-mai" replace />;
  }

  return (
    <main className="bg-[#0f141c] pb-24 pt-8 text-white">
      <div className="mx-auto w-[min(1120px,calc(100%_-_56px))] max-sm:w-[calc(100%_-_28px)]">
        <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <Link to="/khuyen-mai" className="font-semibold text-[#ff6070] no-underline">
            ← Quay về khuyến mãi
          </Link>
          <span className="hidden sm:inline">/</span>
          <span>{promotion?.category || "Khuyến mãi"}</span>
        </div>

        {error && !promotion ? (
          <div className="rounded-[28px] border border-red-500/20 bg-red-500/10 px-6 py-10 text-center text-sm font-semibold text-red-100">
            {error}
          </div>
        ) : (
          <article className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.03] shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
            <div className="grid gap-0 lg:grid-cols-[420px_minmax(0,1fr)]">
              <div className="relative min-h-[260px] bg-slate-900">
                <img
                  src={promotion.thumbnail}
                  alt={promotion.title}
                  className="h-full min-h-[260px] w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = DEFAULT_PROMOTION_IMAGE;
                  }}
                />
              </div>

              <div className="p-6 sm:p-8 lg:p-10">
                <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-[#ff6070]">
                  <span>{promotion.category}</span>
                  <span className="text-slate-500">•</span>
                  <span>Đang áp dụng</span>
                </div>

                <h1 className="mt-4 text-3xl font-black uppercase leading-tight text-white sm:text-4xl">
                  {promotion.title}
                </h1>

                <div className="mt-5 flex flex-wrap gap-3">
                  <InfoChip label="Mã" value={promotion.code} />
                  <InfoChip label="Từ ngày" value={promotion.startDate} />
                  <InfoChip label="Đến ngày" value={promotion.endDate} />
                </div>

                <div className="mt-8 rounded-[24px] border border-white/10 bg-[#0f141c] p-5">
                  <div className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
                    Tóm tắt
                  </div>
                  <p className="mt-3 text-[15px] leading-8 text-slate-200">
                    {promotion.summary}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-8 border-t border-white/10 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-10">
              <div className="news-content space-y-5 text-[15px] leading-8 text-slate-200">
                <h2>Điều kiện sử dụng</h2>
                <p>{promotion.terms}</p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[#0f141c] p-5">
                <DetailRow label="Loại giảm" value={promotion.discountTypeLabel} />
                <DetailRow label="Giá trị giảm" value={promotion.discountValueLabel} />
                <DetailRow label="Giảm tối đa" value={promotion.maxDiscountLabel} />
                <DetailRow label="Đơn tối thiểu" value={promotion.minOrderLabel} />
                <DetailRow label="Phạm vi áp dụng" value={promotion.scopeLabel} />
                <DetailRow label="Lượt còn lại" value={String(promotion.quantity ?? 0)} />
              </div>
            </div>
          </article>
        )}

        {relatedPromotions.length > 0 && (
          <section className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <h2 className="text-2xl font-black uppercase text-white">Khuyến mãi khác</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {relatedPromotions.map((item) => (
                <Link
                  key={item.id}
                  to={`/khuyen-mai/${item.id}`}
                  className="group overflow-hidden rounded-[22px] border border-white/10 bg-[#111823] no-underline transition-all hover:border-[#ff6070]/30"
                >
                  <div className="p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#ff6070]">
                      {item.startDate} - {item.endDate}
                    </div>
                    <h3 className="mt-2 line-clamp-3 text-sm font-bold leading-6 text-white group-hover:text-[#ff6070]">
                      {item.title}
                    </h3>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
                      {item.summary}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Link
                to="/khuyen-mai"
                className="inline-flex h-[46px] items-center rounded-full bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] px-6 text-sm font-bold text-white shadow-[0_10px_25px_rgba(255,83,100,0.2)] no-underline transition-all duration-300 hover:opacity-90"
              >
                Xem khuyến mãi khác
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default PromotionDetailPage;
