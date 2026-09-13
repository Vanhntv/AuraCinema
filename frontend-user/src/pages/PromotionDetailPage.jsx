import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getPromotionBySlug, isPromotionExpired } from "../data/promotionContent";

function MetaChip({ label, value }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300">
      <span className="font-bold text-white">{label}:</span> {value}
    </div>
  );
}

function PromotionDetailPage() {
  const { slug } = useParams();
  const promotion = getPromotionBySlug(slug);
  const expired = isPromotionExpired(promotion);

  useEffect(() => {
    if (!promotion) return undefined;
    const previousTitle = document.title;
    document.title = `${promotion.title} | AuraCinema`;
    return () => {
      document.title = previousTitle;
    };
  }, [promotion]);

  if (!promotion) return <Navigate to="/khuyen-mai" replace />;

  return (
    <main className="bg-[#0f141c] pb-24 pt-8 text-white">
      <div className="mx-auto w-[min(980px,calc(100%_-_56px))] max-sm:w-[calc(100%_-_28px)]">
        <nav className="mb-7 flex flex-wrap items-center gap-3 text-sm text-slate-400" aria-label="Điều hướng khuyến mãi">
          <Link to="/khuyen-mai" className="font-semibold text-[#ff7180] no-underline">← Quay về khuyến mãi</Link>
          <span className="hidden sm:inline">/</span>
          <span>{promotion.category}</span>
        </nav>

        <article className="overflow-hidden rounded-[var(--aura-radius-lg)] border border-white/10 bg-[var(--aura-surface)] shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <div className="relative aspect-[16/8] min-h-[230px] overflow-hidden bg-slate-900 max-sm:aspect-[4/3]">
            <img src={promotion.thumbnail} alt="" className="h-full w-full object-cover" decoding="async" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111722] via-transparent to-transparent" />
            <span className="absolute bottom-5 left-5 rounded-full bg-[#f24f65] px-3 py-1.5 text-xs font-extrabold text-white sm:bottom-7 sm:left-7">
              {promotion.category}
            </span>
          </div>

          <div className="mx-auto max-w-[820px] px-6 pb-8 pt-8 sm:px-10 sm:pb-10">
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-[#ff8996]">
              <span>{promotion.startDate}</span>
              <span aria-hidden="true" className="text-slate-600">-</span>
              <span>{promotion.endDate}</span>
              <span className={`rounded-full px-3 py-1 ${expired ? "bg-slate-700 text-slate-200" : "bg-emerald-400/10 text-emerald-300"}`}>
                {expired ? "Đã kết thúc" : "Đang diễn ra"}
              </span>
            </div>

            <h1 className="mt-5 text-2xl font-black uppercase leading-tight text-white sm:text-3xl lg:text-[34px]">
              {promotion.title}
            </h1>
            <p className="mt-5 max-w-[70ch] text-[15px] leading-8 text-slate-300 sm:text-base">{promotion.summary}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <MetaChip label="Thời gian" value={`${promotion.startDate} - ${promotion.endDate}`} />
              <MetaChip label="Chương trình" value={promotion.category} />
            </div>

            <div
              className="news-content mt-9 space-y-6 border-t border-white/10 pt-8 text-[16px] leading-9 text-slate-200 max-sm:text-[15px] max-sm:leading-8"
              dangerouslySetInnerHTML={{ __html: promotion.contentHtml }}
            />
          </div>
        </article>
      </div>
    </main>
  );
}

export default PromotionDetailPage;
