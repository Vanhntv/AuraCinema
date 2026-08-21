import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getShowtimes } from "../services/showtimeService";
import useCurrentTime from "../hooks/useCurrentTime";
import { buildRelativeDateOptions, deduplicateShowtimes, formatDate, isShowtimeUpcoming } from "../utils/dateTime";

const FALLBACK_POSTER =
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80";

function formatRoomType(value) {
  return String(value || "2D").toUpperCase() === "3D" ? "3D" : "2D";
}

function groupShowtimes(showtimes) {
  const movies = new Map();

  showtimes.forEach((showtime) => {
    const movieId = String(showtime.movie_id || "unknown");
    if (!movies.has(movieId)) {
      movies.set(movieId, {
        _id: showtime.movie_id,
        title: showtime.movieTitle || "Phim đang cập nhật",
        poster: showtime.moviePoster || FALLBACK_POSTER,
        duration: showtime.movieDuration,
        country: showtime.movieCountry,
        language: showtime.movieLanguage,
        releaseDate: showtime.movieReleaseDate,
        ageLimit: showtime.movieAgeLimit,
        description: showtime.movieDescription,
        roomTypes: new Set(),
        showtimes: [],
      });
    }

    const movie = movies.get(movieId);
    movie.roomTypes.add(formatRoomType(showtime.roomType));
    movie.showtimes.push(showtime);
  });

  return Array.from(movies.values()).map((movie) => ({
    ...movie,
    roomTypes: Array.from(movie.roomTypes),
    showtimes: movie.showtimes.sort((a, b) =>
      String(a.startTime).localeCompare(String(b.startTime)),
    ),
  }));
}

function MovieSchedule() {
  const navigate = useNavigate();
  const currentTime = useCurrentTime();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dateOptions] = useState(() => buildRelativeDateOptions(7));
  const dateQuery = searchParams.get("date");
  const [selectedDate, setSelectedDate] = useState(
    dateOptions.some((option) => option.value === dateQuery)
      ? dateQuery
      : dateOptions[0].value,
  );
  const [showtimes, setShowtimes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    getShowtimes({ date: selectedDate })
      .then((response) => {
        if (isActive) setShowtimes(response?.data || []);
      })
      .catch((requestError) => {
        if (!isActive) return;
        setShowtimes([]);
        setError(
          requestError.response?.data?.message ||
            "Không thể tải lịch chiếu. Vui lòng thử lại.",
        );
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [selectedDate]);

  const movies = useMemo(
    () => groupShowtimes(deduplicateShowtimes(
      showtimes.filter((showtime) => isShowtimeUpcoming(showtime, currentTime)),
    )),
    [currentTime, showtimes],
  );

  return (
    <main className="min-h-[72vh] pb-24 pt-5 text-white sm:pt-7">
      <div className="mx-auto w-[min(1820px,calc(100%_-_48px))] max-sm:w-[calc(100%_-_28px)]">
        <header className="mb-8 text-center">
          <h1 className="inline-flex items-center gap-3 text-[28px] font-black max-sm:text-2xl">
            <span className="h-5 w-5 rounded-full bg-[#ff5364]" aria-hidden="true" />
            Phim đang chiếu
          </h1>
          <div className="mt-5 flex justify-center gap-5 overflow-x-auto pb-2 max-sm:justify-start max-sm:gap-2.5">
            {dateOptions.map((option) => {
              const active = option.value === selectedDate;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setIsLoading(true);
                    setError("");
                    setSelectedDate(option.value);
                    setSearchParams({ date: option.value });
                  }}
                  className={`h-[46px] min-w-[130px] rounded-lg border px-4 text-[17px] font-bold transition max-sm:min-w-[116px] max-sm:text-sm ${
                    active
                      ? "border-[var(--aura-coral)] bg-[var(--aura-coral)] text-[var(--aura-coral-ink)]"
                      : "border-[#283241] bg-[#151b24] text-white hover:border-[#ff6070]"
                  }`}
                >
                  {option.label || option.displayDate || option.fullLabel}
                </button>
              );
            })}
          </div>
        </header>

        {isLoading && (
          <div className="grid grid-cols-2 gap-7 max-xl:grid-cols-1">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-[365px] animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
              />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-6 py-14 text-center font-bold text-red-200">
            {error}
          </div>
        )}

        {!isLoading && !error && movies.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
            <p className="text-xl font-bold text-white">Chưa có suất chiếu</p>
            <p className="mt-2 text-sm text-slate-500">Hãy chọn một ngày khác để xem lịch chiếu.</p>
          </div>
        )}

        {!isLoading && !error && movies.length > 0 && (
          <section className="grid auto-rows-fr grid-cols-2 items-stretch gap-x-7 gap-y-8 max-xl:grid-cols-1">
            {movies.map((movie) => (
              <article
                key={movie._id}
                className="relative flex h-full min-h-[365px] overflow-hidden rounded-2xl border border-[#344050] bg-[#10151d] max-sm:flex-col"
              >
                <button
                  type="button"
                  className="w-[31%] shrink-0 overflow-hidden bg-slate-800 max-sm:aspect-[16/10] max-sm:w-full"
                  onClick={() => navigate(`/phim/${movie._id}`)}
                  aria-label={`Xem chi tiết ${movie.title}`}
                >
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-500 hover:scale-105"
                    onError={(event) => {
                      event.currentTarget.src = FALLBACK_POSTER;
                    }}
                  />
                </button>

                <div className="min-w-0 flex-1 px-7 py-7 max-sm:px-5 max-sm:py-5">
                  <div className="mb-2 flex items-center gap-5 pr-12 text-[16px] text-slate-500">
                    <span>{movie.language || "Điện ảnh"}</span>
                    <span>{movie.duration ? `${movie.duration} phút` : "Đang cập nhật"}</span>
                  </div>
                  <button type="button" className="text-left" onClick={() => navigate(`/phim/${movie._id}`)}>
                    <h2 className="text-[18px] font-black uppercase leading-[1.38] text-white transition hover:text-[#ff6070]">
                      {movie.title}
                    </h2>
                  </button>
                  <div className="mt-1 space-y-0.5 text-[16px] leading-7 text-slate-100">
                    <p>Xuất xứ: {movie.country || "Đang cập nhật"}</p>
                    <p>Khởi chiếu: {formatDate(movie.releaseDate)}</p>
                    <p className="text-[#f3434d]">
                      {Number(movie.ageLimit) > 0
                        ? `Phim được phổ biến đến người xem từ đủ ${movie.ageLimit} tuổi trở lên (${movie.ageLimit}+)`
                        : "Phim được phép phổ biến đến người xem ở mọi độ tuổi"}
                    </p>
                  </div>

                  <h3 className="mt-3 text-[18px] font-black text-white">Lịch chiếu</h3>
                  <div className="mt-2 flex flex-wrap gap-2.5">
                    {movie.showtimes.map((showtime) => (
                      <button
                        key={showtime.id || showtime._id}
                        type="button"
                        onClick={() => navigate(`/phim/${movie._id}?showtime=${showtime.id || showtime._id}&date=${selectedDate}#lich-chieu`)}
                        className="group min-h-11 min-w-[112px] rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-[16px] font-bold text-white transition hover:border-[var(--aura-coral)] hover:bg-[var(--aura-coral)] hover:text-[var(--aura-coral-ink)]"
                        title={showtime.roomName || "Phòng chiếu"}
                      >
                        <span className="block">{showtime.startTime}</span>
                        <span className="mt-1 block text-[11px] font-semibold text-slate-400 group-hover:text-[var(--aura-coral-ink)]">
                          {showtime.roomName || "Phòng chiếu"} · {formatRoomType(showtime.roomType)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="absolute right-3 top-3 rounded-lg border border-[#445064] px-2.5 py-1 text-lg font-bold text-slate-300">
                  {movie.roomTypes.join("/") || "2D"}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

export default MovieSchedule;
