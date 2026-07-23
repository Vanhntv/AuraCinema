import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BookingModal from "../components/BookingModal";
import MovieDetailModal from "../components/MovieDetailModal";
import { getShowtimes } from "../services/showtimeService";

const FALLBACK_POSTER =
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80";

function buildDateOptions() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);

    return {
      value: date.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }),
      day: date.toLocaleDateString("vi-VN", { weekday: "short" }),
      date: date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      }),
      label: index === 0 ? "Hôm nay" : index === 1 ? "Ngày mai" : "",
    };
  });
}

function formatPrice(value) {
  const price = Number(value);
  return Number.isFinite(price)
    ? `${price.toLocaleString("vi-VN")}đ`
    : "Đang cập nhật";
}

function formatRoomType(value) {
  return String(value || "2D").toUpperCase() === "3D" ? "3D" : "2D";
}

function getShowtimeDateValue(showtime) {
  const date = new Date(showtime?.start_time);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
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
        banner: showtime.moviePoster || FALLBACK_POSTER,
        duration: showtime.movieDuration,
        status: showtime.movieStatus || "now_showing",
        cinemas: new Map(),
      });
    }

    const movie = movies.get(movieId);
    const cinemaId = String(showtime.cinema_id || showtime.cinemaName || "unknown");
    const roomType = formatRoomType(showtime.roomType);
    const scheduleGroupId = `${cinemaId}-${roomType}`;
    if (!movie.cinemas.has(scheduleGroupId)) {
      movie.cinemas.set(scheduleGroupId, {
        id: showtime.cinema_id,
        groupId: scheduleGroupId,
        name: showtime.cinemaName || "Rạp đang cập nhật",
        city: showtime.cinemaCity || "",
        roomType,
        showtimes: [],
      });
    }
    movie.cinemas.get(scheduleGroupId).showtimes.push(showtime);
  });

  return Array.from(movies.values()).map((movie) => ({
    ...movie,
    cinemas: Array.from(movie.cinemas.values()),
  }));
}

function MovieSchedule() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dateOptions] = useState(buildDateOptions);
  const dateQuery = searchParams.get("date");
  const [selectedDate, setSelectedDate] = useState(
    dateOptions.some((option) => option.value === dateQuery)
      ? dateQuery
      : dateOptions[0].value,
  );
  const [showtimes, setShowtimes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [bookingMovie, setBookingMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadShowtimes() {
      try {
        setIsLoading(true);
        setError("");
        const response = await getShowtimes({ date: selectedDate });
        if (isActive) setShowtimes(response?.data || []);
      } catch (requestError) {
        if (isActive) {
          setShowtimes([]);
          setError(
            requestError.response?.data?.message ||
              "Không thể tải lịch chiếu. Vui lòng thử lại.",
          );
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadShowtimes();
    return () => {
      isActive = false;
    };
  }, [selectedDate]);

  useEffect(() => {
    if (
      dateQuery &&
      dateQuery !== selectedDate &&
      dateOptions.some((option) => option.value === dateQuery)
    ) {
      setSelectedDate(dateQuery);
    }
  }, [dateOptions, dateQuery, selectedDate]);

  const movies = useMemo(() => {
    const keyword = searchTerm.trim().toLocaleLowerCase("vi");
    const filtered = showtimes.filter((showtime) => {
      const matchesSearch =
        !keyword || showtime.movieTitle?.toLocaleLowerCase("vi").includes(keyword);
      return matchesSearch;
    });
    return groupShowtimes(filtered);
  }, [searchTerm, showtimes]);

  const [bookingShowtime, setBookingShowtime] = useState(null);

  const openBooking = (movie, showtime = null) => {
    if (showtime?.id || showtime?._id) {
      const showtimeDate = getShowtimeDateValue(showtime) || selectedDate;
      navigate(`/dat-ve/${showtime.id || showtime._id}?date=${showtimeDate}`);
      return;
    }

    setSelectedMovie(null);
    setBookingMovie(movie);
    setBookingShowtime(showtime);
  };

  const closeBooking = () => {
    setBookingMovie(null);
    setBookingShowtime(null);
  };

  return (
    <main className="min-h-[70vh] pb-24 pt-10 text-white">
      <div className="mx-auto w-[min(1280px,calc(100%_-_40px))] max-sm:w-[calc(100%_-_28px)]">
        <section className="relative mb-8 overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(255,83,100,0.2),transparent_38%),linear-gradient(135deg,#191e28,#10151d)] px-8 py-9 max-sm:px-5 max-sm:py-7">
          <div className="relative z-10 max-w-2xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#ff6070]">Aura Cinema</p>
            <h1 className="text-4xl font-black max-sm:text-3xl">Lịch chiếu phim</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Chọn ngày, rạp và suất chiếu phù hợp để bắt đầu trải nghiệm điện ảnh của bạn.</p>
          </div>
        </section>

        <div className="mb-7 flex gap-3 overflow-x-auto pb-3">
          {dateOptions.map((option) => {
            const active = option.value === selectedDate;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSelectedDate(option.value);
                  setSearchParams({ date: option.value });
                }}
                className={`min-w-[108px] rounded-2xl border px-4 py-3 text-center transition ${active ? "border-[#ff6070] bg-[#ff5364] text-white shadow-[0_10px_30px_rgba(255,83,100,0.25)]" : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"}`}
              >
                <span className="block text-[11px] font-bold uppercase">{option.label || option.day}</span>
                <span className="mt-1 block text-lg font-black">{option.date}</span>
              </button>
            );
          })}
        </div>

        <div className="mb-8">
          <label className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#161b24] px-4 focus-within:border-[#ff6070]">
            <span className="text-slate-500">⌕</span>
            <input className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Tìm tên phim..." />
          </label>
        </div>

        {isLoading && (
          <div className="grid gap-5">
            {[1, 2, 3].map((item) => <div key={item} className="h-64 animate-pulse rounded-3xl border border-white/5 bg-white/[0.03]" />)}
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-3xl border border-red-400/20 bg-red-400/10 px-6 py-14 text-center"><p className="font-bold text-red-200">{error}</p></div>
        )}

        {!isLoading && !error && movies.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
            <p className="text-xl font-bold text-white">Chưa có suất chiếu</p>
            <p className="mt-2 text-sm text-slate-500">Hãy chọn ngày hoặc rạp khác để xem lịch chiếu.</p>
          </div>
        )}

        {!isLoading && !error && (
          <div className="grid gap-5">
            {movies.map((movie) => (
              <article key={movie._id} className="flex gap-6 rounded-3xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-white/15 max-sm:flex-col">
                <button type="button" className="h-[240px] w-[160px] shrink-0 overflow-hidden rounded-2xl bg-slate-800 max-sm:h-auto max-sm:w-full max-sm:aspect-[16/9]" onClick={() => setSelectedMovie(movie)}>
                  <img src={movie.poster} alt={movie.title} className="h-full w-full object-cover transition duration-500 hover:scale-105" onError={(event) => { event.currentTarget.src = FALLBACK_POSTER; }} />
                </button>
                <div className="min-w-0 flex-1">
                  <button type="button" className="text-left" onClick={() => setSelectedMovie(movie)}><h2 className="mb-1 text-xl font-black uppercase hover:text-[#ff6070]">{movie.title}</h2></button>
                  <p className="mb-5 text-xs text-slate-500">{movie.duration ? `${movie.duration} phút` : "Thời lượng đang cập nhật"}</p>
                  <div className="grid gap-4">
                    {movie.cinemas.map((cinema) => (
                      <div key={cinema.groupId || cinema.id || cinema.name} className="rounded-2xl bg-[#111720] p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-bold text-slate-100">{cinema.name}</h3>{cinema.city && <p className="mt-0.5 text-[11px] text-slate-500">{cinema.city}</p>}</div><span className="text-[11px] text-slate-500">{cinema.roomType} Phụ đề</span></div>
                        <div className="flex flex-wrap gap-2">
                          {cinema.showtimes.map((showtime) => (
                            <button key={showtime.id} type="button" onClick={() => openBooking(movie, showtime)} className="group rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-left transition hover:border-[#ff6070] hover:bg-[#ff5364]/10">
                              <span className="block text-sm font-black text-white group-hover:text-[#ff6070]">{showtime.startTime}</span>
                              <span className="text-[10px] text-slate-500">{showtime.roomName} · {formatPrice(showtime.base_price)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <MovieDetailModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} onBook={openBooking} />
      <BookingModal movie={bookingMovie} initialShowtime={bookingShowtime} onClose={closeBooking} />
    </main>
  );
}

export default MovieSchedule;
