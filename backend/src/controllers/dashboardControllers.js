import Cinema from "../models/Cinema.js";
import Genre from "../models/Genre.js";
import Movie from "../models/Movie.js";
import Showtime from "../models/Showtime.js";
import Booking from "../models/Booking.js";

const DASHBOARD_TIME_ZONE = "Asia/Ho_Chi_Minh";
const REVENUE_BOOKING_STATUSES = ["confirmed", "checked_in"];

const dashboardTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: DASHBOARD_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const getTodayRange = (now = new Date()) => {
  const localDay = now.toLocaleDateString("en-CA", {
    timeZone: DASHBOARD_TIME_ZONE,
  });

  const start = new Date(`${localDay}T00:00:00.000+07:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { start, end, localDay };
};

const formatTime = (value) => {
  if (!value) {
    return null;
  }

  return dashboardTimeFormatter.format(new Date(value));
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
          $lt: todayRange.end,
        },
      }),
      Showtime.find({
        deleted_at: null,
        start_time: {
          $gte: todayRange.start,
          $lt: todayRange.end,
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

export const getDashboardOverview = async (_req, res) => {
  try {
    const overview = await Booking.aggregate([
      {
        $match: {
          payment_status: "paid",
          status: "confirmed",
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$total_price" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        revenue: overview?.[0]?.revenue ?? 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTodayRevenue = async (_req, res) => {
  try {
    const { start, end, localDay } = getTodayRange();
    const result = await Booking.aggregate([
      {
        $match: {
          payment_status: "paid",
          status: { $in: REVENUE_BOOKING_STATUSES },
          created_at: {
            $gte: start,
            $lt: end,
          },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$total_price" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        revenue: result?.[0]?.revenue ?? 0,
        date: localDay,
        timezone: DASHBOARD_TIME_ZONE,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
