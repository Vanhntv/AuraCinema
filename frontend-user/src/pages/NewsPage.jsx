import { Link } from 'react-router-dom';
import { newsArticles } from '../data/newsContent';

function NewsPage() {
  return (
    <div className="w-full pb-24 pt-6 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-white">
      <div className="mx-auto w-[min(1760px,calc(100%_-_96px))] max-xl:w-[min(1120px,calc(100%_-_56px))] max-sm:w-[calc(100%_-_28px)]">
        <div className="mb-10 flex items-center justify-between border-b border-white/5 pb-6">
          <h1 className="text-2xl font-extrabold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 md:text-3xl">
            Bảng Tin Điện Ảnh
          </h1>
          <span className="text-sm text-slate-400 max-sm:hidden">Cập nhật xu hướng mới nhất</span>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {newsArticles.map((article) => (
            <Link
              key={article.slug}
              to={`/tin-tuc/${article.slug}`}
              className="group flex flex-col overflow-hidden rounded-[20px] border border-white/5 bg-white/[0.02] backdrop-blur-sm transition-all duration-500 hover:border-[#ff6070]/30 hover:shadow-[0_20px_50px_rgba(255,96,112,0.08)]"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                <img
                  src={article.thumbnail}
                  alt={article.title}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              </div>

              <div className="flex min-h-[180px] flex-1 flex-col justify-between p-5">
                <div>
                  <div className="mb-2.5 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#ff6070]">
                    <span>{article.category}</span>
                    <span className="text-slate-500">•</span>
                    <span>{article.date}</span>
                  </div>

                  <h3 className="line-clamp-3 text-[15px] font-bold leading-snug text-slate-100 transition-colors duration-300 group-hover:text-[#ff6070]">
                    {article.title}
                  </h3>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
                    {article.excerpt}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 text-xs font-bold text-slate-400 transition-colors duration-300 group-hover:text-[#ff6070]">
                  <span>Xem chi tiết</span>
                  <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 flex justify-end gap-3">
          <button className="h-[46px] rounded-full border border-white/10 bg-white/[0.02] px-6 text-sm font-bold text-slate-400 transition-all duration-300 hover:bg-white/[0.08] hover:text-white">
            Quay lại
          </button>
          <button className="h-[46px] rounded-full border border-transparent bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] px-6 text-sm font-bold text-white shadow-[0_10px_25px_rgba(255,83,100,0.2)] transition-all duration-300 hover:opacity-90">
            Tiếp theo
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewsPage;
