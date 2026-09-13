import { Link } from "react-router-dom";
import { promotionItems } from "../data/promotionContent";

function PromotionPage() {
  return (
    <main className="w-full pb-24 pt-6 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-white">
      <div className="mx-auto w-[min(1760px,calc(100%_-_96px))] max-xl:w-[min(1120px,calc(100%_-_56px))] max-sm:w-[calc(100%_-_28px)]">
        <header className="mb-10 border-b border-white/10 pb-6">
          <h1 className="text-2xl font-extrabold uppercase tracking-wider text-[var(--aura-projector-white)] md:text-3xl">
            Khuyến mãi
          </h1>
        </header>

        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {promotionItems.map((promotion) => (
            <Link
              key={promotion.slug}
              to={`/khuyen-mai/${promotion.slug}`}
              className="group flex min-w-0 flex-col overflow-hidden rounded-[var(--aura-radius-lg)] border border-white/10 bg-[var(--aura-surface)] no-underline transition duration-200 hover:-translate-y-0.5 hover:border-[#ff6070]/40 hover:bg-[var(--aura-surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6070] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0f141c]"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                <img
                  src={promotion.thumbnail}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="eager"
                  decoding="async"
                />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute bottom-3 left-3 rounded-full bg-[#f24f65] px-3 py-1 text-[11px] font-extrabold text-white">
                  {promotion.category}
                </span>
              </div>

              <div className="flex min-h-[214px] flex-1 flex-col justify-between p-5">
                <div>
                  <p className="mb-3 text-xs font-semibold text-[#ff8996]">
                    {promotion.startDate} - {promotion.endDate}
                  </p>
                  <h2 className="line-clamp-3 text-[16px] font-extrabold leading-6 text-slate-100 transition-colors duration-200 group-hover:text-[#ff7180]">
                    {promotion.title}
                  </h2>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
                    {promotion.summary}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 text-xs font-bold text-slate-300 transition-colors duration-200 group-hover:text-[#ff7180]">
                  <span>Xem chương trình</span>
                  <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

export default PromotionPage;
