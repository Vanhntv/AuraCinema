import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMarketingContent } from "../services/marketingContentService";
import { mapCmsContentItem } from "../utils/marketingContent";

function NewsPage() {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadArticles = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await getMarketingContent({ type: "news", limit: 100 });
        const items = (response.data || []).map(mapCmsContentItem);
        if (active) setArticles(items);
      } catch (requestError) {
        if (active) {
          setArticles([]);
          setError(
            requestError.response?.data?.message ||
              "Không thể tải danh sách tin tức. Vui lòng thử lại sau.",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadArticles();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="w-full pb-24 pt-6 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-white">
      <div className="mx-auto w-[min(1760px,calc(100%_-_96px))] max-xl:w-[min(1120px,calc(100%_-_56px))] max-sm:w-[calc(100%_-_28px)]">
        <div className="mb-10 flex items-center justify-between border-b border-white/5 pb-6">
          <h1 className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-2xl font-extrabold uppercase tracking-wider text-transparent md:text-3xl">
            Tin tức
          </h1>
          <span className="text-sm text-slate-400 max-sm:hidden">Cập nhật theo thời gian thực</span>
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

        {!isLoading && !error && articles.length === 0 && (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-6 py-12 text-center text-slate-300">
            Hiện chưa có bài tin tức nào.
          </div>
        )}

        {!isLoading && !error && articles.length > 0 && (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {articles.map((article) => (
              <Link
                key={article.id || article.slug}
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
                </div>

                <div className="flex min-h-[220px] flex-1 flex-col justify-between p-5">
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
                      {article.summary}
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
        )}
      </div>
    </div>
  );
}

export default NewsPage;
