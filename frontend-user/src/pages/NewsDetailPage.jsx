import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getMarketingContentBySlug } from "../services/marketingContentService";
import { mapCmsContentItem } from "../utils/marketingContent";

function DetailSkeleton() {
  return (
    <div className="mx-auto w-[min(980px,calc(100%_-_56px))] py-8 text-white max-sm:w-[calc(100%_-_28px)]">
      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] p-5 sm:p-8">
        <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
        <div className="mt-8 h-10 w-[85%] animate-pulse rounded-2xl bg-white/10" />
        <div className="mt-4 h-6 w-[60%] animate-pulse rounded-full bg-white/10" />
        <div className="mt-8 h-64 animate-pulse rounded-[22px] bg-white/10 sm:h-80" />
        <div className="mt-10 grid gap-4">
          <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-[95%] animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-[90%] animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-[75%] animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function MetaChip({ label, value }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300">
      <span className="font-bold text-white">{label}:</span> {value || "-"}
    </div>
  );
}

function NewsDetailPage() {
  const { slug } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [article, setArticle] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadArticle = async () => {
      try {
        setIsLoading(true);
        setError("");
        const detailResponse = await getMarketingContentBySlug("news", slug);
        const detail = mapCmsContentItem(detailResponse.data);

        if (!active) return;

        setArticle(detail);
        document.title = `${detail.title} | AuraCinema`;
      } catch (requestError) {
        if (!active) return;
        setArticle(null);
        setError(
          requestError.response?.data?.message ||
            "Không thể tải chi tiết tin tức.",
        );
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadArticle();

    return () => {
      active = false;
    };
  }, [slug]);

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (!article && !error) {
    return <Navigate to="/tin-tuc" replace />;
  }

  return (
    <main className="bg-[#0f141c] pb-24 pt-8 text-white">
      <div className="mx-auto w-[min(980px,calc(100%_-_56px))] max-sm:w-[calc(100%_-_28px)]">
        <div className="mb-7 flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <Link to="/tin-tuc" className="font-semibold text-[#ff6070] no-underline">
            ← Quay về tin tức
          </Link>
          <span className="hidden sm:inline">/</span>
          <span>{article?.category || "Tin tức"}</span>
        </div>

        {error && !article ? (
          <div className="rounded-[28px] border border-red-500/20 bg-red-500/10 px-6 py-10 text-center text-sm font-semibold text-red-100">
            {error}
          </div>
        ) : (
          <article className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.3)] sm:p-5 lg:p-6">
            <div className="mx-auto max-w-[820px] px-2 pb-8 pt-5 sm:px-4 sm:pb-10 sm:pt-7">
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-[#ff6070]">
                <span>{article.category}</span>
                <span className="text-slate-500">•</span>
                <span>{article.date}</span>
              </div>

              <h1 className="mt-6 text-2xl font-black uppercase leading-tight text-white sm:text-3xl lg:text-[34px]">
                {article.title}
              </h1>

              <p className="mt-6 text-[15px] leading-8 text-slate-300 sm:text-base sm:leading-8">
                {article.summary}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <MetaChip label="Tác giả" value={article.author} />
                <MetaChip label="Ngày xuất bản" value={article.date} />
              </div>
            </div>

            <div className="mx-auto max-w-[820px] px-2 pb-8 pt-4 sm:px-4 sm:pb-10 sm:pt-6">
              <div
                className="news-content space-y-6 text-[16px] leading-9 text-slate-200 max-sm:text-[15px] max-sm:leading-8"
                dangerouslySetInnerHTML={{ __html: article.contentHtml }}
              />
            </div>

            {article.thumbnail && (
              <div className="relative h-[350px] w-full overflow-hidden rounded-[22px] bg-slate-900 max-sm:h-[240px] sm:h-[390px] lg:h-[420px]">
                <img
                  src={article.thumbnail}
                  alt={article.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </article>
        )}

      </div>
    </main>
  );
}

export default NewsDetailPage;
