import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { getNewsArticleBySlug, newsArticles } from '../data/newsContent';

function DetailSkeleton() {
  return (
    <div className="mx-auto w-[min(1120px,calc(100%_-_56px))] max-sm:w-[calc(100%_-_28px)] py-8 text-white">
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03]">
        <div className="aspect-[16/9] w-full animate-pulse bg-white/10" />
        <div className="p-6 sm:p-8">
          <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
          <div className="mt-4 h-12 w-[85%] animate-pulse rounded-2xl bg-white/10" />
          <div className="mt-3 h-6 w-[60%] animate-pulse rounded-full bg-white/10" />
          <div className="mt-8 grid gap-4">
            <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
            <div className="h-4 w-[95%] animate-pulse rounded-full bg-white/10" />
            <div className="h-4 w-[90%] animate-pulse rounded-full bg-white/10" />
            <div className="h-4 w-[75%] animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaChip({ label, value }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300">
      <span className="font-bold text-white">{label}:</span> {value}
    </div>
  );
}

function NewsDetailPage() {
  const { slug } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [article, setArticle] = useState(null);

  const relatedArticles = useMemo(
    () => newsArticles.filter((item) => item.slug !== slug).slice(0, 3),
    [slug]
  );

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    const timer = window.setTimeout(() => {
      const found = getNewsArticleBySlug(slug);

      if (!active) return;

      if (found) {
        setArticle({
          ...found,
          viewCount: found.viewCount + 1,
        });
        document.title = `${found.title} | AuraCinema`;
      } else {
        setArticle(null);
      }

      setIsLoading(false);
    }, 450);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [slug]);

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (!article) {
    return <Navigate to="/tin-tuc" replace />;
  }

  return (
    <main className="bg-[#0f141c] pb-24 pt-8 text-white">
      <div className="mx-auto w-[min(1120px,calc(100%_-_56px))] max-sm:w-[calc(100%_-_28px)]">
        <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <Link to="/tin-tuc" className="font-semibold text-[#ff6070] no-underline">
            ← Quay về tin tức
          </Link>
          <span className="hidden sm:inline">/</span>
          <span>{article.category}</span>
        </div>

        <article className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.03] shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
          <div className="relative aspect-[16/9] overflow-hidden bg-slate-900">
            <img
              src={article.thumbnail}
              alt={article.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f141c] via-black/20 to-transparent" />
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-[#ff6070]">
              <span>{article.category}</span>
              <span className="text-slate-500">•</span>
              <span>{article.date}</span>
            </div>

            <h1 className="mt-4 text-3xl font-black uppercase leading-tight text-white sm:text-4xl">
              {article.title}
            </h1>

            <div className="mt-5 flex flex-wrap gap-3">
              <MetaChip label="Tác giả" value={article.author} />
              <MetaChip label="Lượt xem" value={article.viewCount.toLocaleString('vi-VN')} />
              <MetaChip label="Ngày xuất bản" value={article.date} />
            </div>

            <div
              className="news-content mt-8 space-y-5 text-[15px] leading-8 text-slate-200"
              dangerouslySetInnerHTML={{ __html: article.contentHtml }}
            />
          </div>
        </article>

        <section className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <h2 className="text-2xl font-black uppercase text-white">Bài viết liên quan</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {relatedArticles.map((item) => (
              <Link
                key={item.slug}
                to={`/tin-tuc/${item.slug}`}
                className="group overflow-hidden rounded-[22px] border border-white/10 bg-[#111823] no-underline transition-all hover:border-[#ff6070]/30"
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#ff6070]">
                    {item.date}
                  </div>
                  <h3 className="mt-2 line-clamp-3 text-sm font-bold leading-6 text-white group-hover:text-[#ff6070]">
                    {item.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default NewsDetailPage;
