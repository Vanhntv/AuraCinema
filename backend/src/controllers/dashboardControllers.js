import Cinema from "../models/Cinema.js";
import Genre from "../models/Genre.js";
import Movie from "../models/Movie.js";

export const getDashboardStats = async (_req, res) => {
  try {
    const [genres, movies, cinemas, nowShowingMovies] = await Promise.all([
      Genre.countDocuments({ deleted_at: null }),
      Movie.countDocuments({ deleted_at: null }),
      Cinema.countDocuments({ deleted_at: null }),
      Movie.countDocuments({ deleted_at: null, status: "now_showing" }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          genres,
          movies,
          cinemas,
          bookings: 0,
          todayShowtimes: 0,
          nowShowingMovies,
        },
        recentBookings: [],
        todayShowtimes: [],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
