import Cinema from "../models/Cinema.js";
import Genre from "../models/Genre.js";
import Movie from "../models/Movie.js";
import Showtime from "../models/Showtime.js";

const jakartaTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const getTodayRange = () => {
  const now = new Date();
  const jakartaDay = now.toLocaleDateString("en-CA", {
    timeZone: "Asia/Jakarta",
  });

  const start = new Date(`${jakartaDay}T00:00:00.000+07:00`);
  const end = new Date(`${jakartaDay}T23:59:59.999+07:00`);

  return { start, end };
};

const formatTime = (value) => {
  if (!value) {
    return null;
  }

  return jakartaTimeFormatter.format(new Date(value));
};

export const getDashboardStats = async (_req, res) => {
  try {
    const todayRange = getTodayRange();

    const [genres, movies, cinemas, nowShowingMovies, todayShowtimesCount, todayShowtimes] = await Promise.all([
      Genre.countDocuments({ deleted_at: null }),
      Movie.countDocuments({ deleted_at: null }),
      Cinema.countDocuments({ deleted_at: null }),
      Movie.countDocuments({ deleted_at: null, status: "now_showing" }),
      Showtime.countDocuments({
        deleted_at: null,
        start_time: {
          $gte: todayRange.start,
          $lte: todayRange.end,
        },
      }),
      Showtime.find({
        deleted_at: null,
        start_time: {
          $gte: todayRange.start,
          $lte: todayRange.end,
        },
      })
        .populate("movie_id", "title")
        .populate({
          path: "room_id",
          select: "name cinema_id",
          populate: {
            path: "cinema_id",
            select: "name",
          },
        })
        .sort({ start_time: 1 })
        .limit(5),
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          genres,
          movies,
          cinemas,
          bookings: 0,
          todayShowtimes: todayShowtimesCount,
          nowShowingMovies,
        },
        recentBookings: [],
        todayShowtimes: todayShowtimes.map((showtime) => ({
          id: showtime._id,
          movieTitle: showtime.movie_id?.title ?? null,
          cinemaName: showtime.room_id?.cinema_id?.name ?? null,
          roomName: showtime.room_id?.name ?? null,
          startTime: formatTime(showtime.start_time),
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
