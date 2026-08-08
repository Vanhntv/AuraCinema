import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { slides } from "../data/homeData";
import { getMovies } from "../services/movieService";
import { getHomeBannerSettings } from "../services/settingsService";

const DEFAULT_SLIDE_INTERVAL_MS = 5000;

const normalizeMovieBanners = (movie) => {
  const banners = Array.isArray(movie?.banners) ? movie.banners : [];
  const urls = banners
    .concat(movie?.banner ? [movie.banner] : [])
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  return Array.from(new Set(urls));
};

const buildMovieSlides = (movies) =>
  movies.flatMap((movie) =>
    normalizeMovieBanners(movie).map((imageUrl, index) => ({
      id: `${movie._id || movie.id}-${index}-${imageUrl}`,
      title: movie.title || "Aura Cinema",
      imageUrl,
    })),
  );

const buildSelectedSlides = (movies, selectedBannerUrls) => {
  if (!Array.isArray(selectedBannerUrls) || !selectedBannerUrls.length) {
    return [];
  }

  const slidesByUrl = new Map(
    buildMovieSlides(movies).map((slide) => [slide.imageUrl, slide]),
  );

  return selectedBannerUrls
    .map((url, index) => {
      const slide = slidesByUrl.get(url);
      return slide ? { ...slide, id: `${slide.id}-${index}` } : null;
    })
    .filter(Boolean);
};

function HeroSlider() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [bannerSlides, setBannerSlides] = useState([]);
  const [slideIntervalMs, setSlideIntervalMs] = useState(DEFAULT_SLIDE_INTERVAL_MS);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);
  const activeSlides = bannerSlides.length ? bannerSlides : slides;
  const slide = activeSlides[activeSlide] || activeSlides[0];
  const canNavigate = activeSlides.length > 1;

  useEffect(() => {
    let isMounted = true;

    async function loadHomeBanners() {
      try {
        const [movies, settings] = await Promise.all([
          getMovies({ limit: 1000 }),
          getHomeBannerSettings(),
        ]);
        const nextSlideIntervalMs =
          Number(settings.slide_interval_ms) || DEFAULT_SLIDE_INTERVAL_MS;
        const selectedBannerUrls = Array.isArray(settings.selected_banner_urls)
          ? settings.selected_banner_urls
          : [];
        const nextSlides = selectedBannerUrls.length
          ? buildSelectedSlides(movies, selectedBannerUrls)
          : [];

        if (isMounted) {
          setSlideIntervalMs(nextSlideIntervalMs);
          setBannerSlides(nextSlides);
          setActiveSlide(0);
        }
      } catch {
        if (isMounted) {
          setBannerSlides([]);
        }
      }
    }

    loadHomeBanners();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeSlides.length || isPaused) return undefined;

    timerRef.current = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % activeSlides.length);
    }, slideIntervalMs);

    return () => {
      window.clearInterval(timerRef.current);
    };
  }, [activeSlides.length, isPaused, slideIntervalMs]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => setIsPaused(mediaQuery.matches);

    syncMotionPreference();
    mediaQuery.addEventListener?.("change", syncMotionPreference);
    return () => mediaQuery.removeEventListener?.("change", syncMotionPreference);
  }, []);

  const goToPrevious = () => {
    if (!canNavigate) return;
    setActiveSlide((current) =>
      current === 0 ? activeSlides.length - 1 : current - 1,
    );
  };

  const goToNext = () => {
    if (!canNavigate) return;
    setActiveSlide((current) => (current + 1) % activeSlides.length);
  };

  return (
    <section className="relative mx-auto mt-3 aspect-[16/6] h-[480px] max-h-[56vh] min-h-[420px] w-[min(1280px,calc(100%_-_40px))] overflow-hidden rounded-[var(--aura-radius-lg)] bg-[#121923] max-md:h-[420px] max-md:min-h-[380px] max-sm:h-[360px] max-sm:min-h-[340px] max-sm:w-[calc(100%_-_28px)]" aria-roledescription="carousel" aria-label="Phim nổi bật">
      <img
        className="absolute inset-0 h-full w-full object-cover"
        src={slide.imageUrl}
        alt={slide.title}
        fetchPriority="high"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,12,18,0.96)_0%,rgba(8,12,18,0.72)_42%,rgba(8,12,18,0.1)_75%),linear-gradient(0deg,rgba(8,12,18,0.75),transparent_50%)]" />
      {canNavigate ? (
        <>
          <button
            type="button"
            aria-label="Banner trước"
            onClick={goToPrevious}
            className="absolute left-5 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/50 text-3xl leading-none text-white shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition hover:border-[#ff5364]/60 hover:bg-[#ff5364]/80 max-sm:left-3 max-sm:text-2xl"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Banner tiếp theo"
            onClick={goToNext}
            className="absolute right-5 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/50 text-3xl leading-none text-white shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition hover:border-[#ff5364]/60 hover:bg-[#ff5364]/80 max-sm:right-3 max-sm:text-2xl"
          >
            ›
          </button>
        </>
      ) : null}
      <div className="relative z-10 flex h-full max-w-xl flex-col justify-center px-12 py-12 max-md:px-7 max-sm:px-6">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#ff6070]">
          Phim nổi bật tuần này
        </p>
        <h1 className="mt-4 text-5xl font-black uppercase leading-tight text-white max-md:text-4xl">
          {slide.title}
        </h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
          Đặt vé nhanh, chọn ghế trực quan và tận hưởng những bộ phim mới nhất tại Aura Cinema.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to="/lich-chieu"
            className="rounded-full bg-[var(--aura-coral)] px-6 py-3 text-sm font-extrabold text-[var(--aura-coral-ink)] no-underline"
          >
            Xem lịch chiếu
          </Link>
          <Link
            to="/gia-ve"
            className="rounded-full border border-white/15 bg-black/45 px-6 py-3 text-sm font-bold text-white no-underline"
          >
            Bảng giá vé
          </Link>
        </div>
      </div>
      <button type="button" className="absolute bottom-5 left-6 z-20 h-11 rounded-full border border-white/15 bg-black/55 px-4 text-xs font-bold text-white hover:border-white/30 max-sm:left-4" onClick={() => setIsPaused((current) => !current)} aria-pressed={isPaused}>
        {isPaused ? "Phát banner" : "Tạm dừng"}
      </button>
      <div className="absolute bottom-5 right-6 z-20 flex gap-1 max-sm:right-4">
        {activeSlides.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-label={`Chuyển đến slide ${index + 1}`}
            onClick={() => setActiveSlide(index)}
            className="grid h-11 w-11 place-items-center rounded-full"
            aria-current={index === activeSlide ? "true" : undefined}
          >
            <span className={`h-2 rounded-full transition-all ${index === activeSlide ? "w-7 bg-[var(--aura-coral)]" : "w-2 bg-white/50"}`} />
          </button>
        ))}
      </div>
    </section>
  );
}

export default HeroSlider;
