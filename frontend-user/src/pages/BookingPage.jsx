import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import BookingModal from "../components/BookingModal";
import { getShowtimeById } from "../services/showtimeService";

const FALLBACK_POSTER =
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80";

function buildMovieFromShowtime(showtime) {
  if (!showtime) return null;

  return {
    _id: showtime.movie_id,
    title: showtime.movieTitle || "Phim đang cập nhật",
    poster: showtime.moviePoster || FALLBACK_POSTER,
    banner: showtime.moviePoster || FALLBACK_POSTER,
    duration: showtime.movieDuration,
    status: showtime.movieStatus || "now_showing",
  };
}

function getShowtimeDateValue(showtime) {
  const date = new Date(showtime?.start_time);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

function BookingPage() {
  const { showtimeId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showtime, setShowtime] = useState(null);
  const [movie, setMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const dateFromQuery = searchParams.get("date") || "";
  const returnDate = dateFromQuery || getShowtimeDateValue(showtime);
  const backToSchedule = () => {
    navigate(returnDate ? `/lich-chieu?date=${returnDate}` : "/lich-chieu");
  };

  useEffect(() => {
    let isActive = true;

    async function loadShowtime() {
      try {
        setIsLoading(true);
        setError("");
        const response = await getShowtimeById(showtimeId);
        const data = response?.data;

        if (isActive) {
          setShowtime(data);
          setMovie(buildMovieFromShowtime(data));
        }
      } catch (requestError) {
        if (isActive) {
          setShowtime(null);
          setMovie(null);
          setError(
            requestError.response?.data?.message ||
              "Không thể tải thông tin suất chiếu.",
          );
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadShowtime();

    return () => {
      isActive = false;
    };
  }, [showtimeId]);

  if (isLoading) {
    return (
      <main className="mx-auto min-h-[70vh] w-[min(1320px,calc(100%_-_40px))] py-16 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-8 py-14 text-center text-slate-300">
          Đang tải trang đặt vé...
        </div>
      </main>
    );
  }

  if (error || !movie || !showtime) {
    return (
      <main className="mx-auto min-h-[70vh] w-[min(1320px,calc(100%_-_40px))] py-16 text-white">
        <div className="rounded-3xl border border-red-400/20 bg-red-500/10 px-8 py-14 text-center">
          <p className="font-bold text-red-100">{error || "Không tìm thấy suất chiếu."}</p>
          <button
            className="mt-6 rounded-full bg-white/10 px-5 py-3 text-sm font-extrabold text-white hover:bg-[#ff6070]"
            type="button"
            onClick={backToSchedule}
          >
            Quay lại lịch chiếu
          </button>
        </div>
      </main>
    );
  }

  return (
    <BookingModal
      movie={movie}
      initialShowtime={showtime}
      onClose={backToSchedule}
      variant="page"
    />
  );
}

export default BookingPage;
