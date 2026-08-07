import Cinema from "../models/Cinema.js";
import Genre from "../models/Genre.js";
import Movie from "../models/Movie.js";
import Showtime from "../models/Showtime.js";
import Booking from "../models/Booking.js";

const DASHBOARD_TIME_ZONE = "Asia/Ho_Chi_Minh";
const REVENUE_BOOKING_STATUSES = ["confirmed", "checked_in"];
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const dashboardTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: DASHBOARD_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const getDateRange = (date) => {
  const match = DATE_PATTERN.exec(String(date || ""));
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));

  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    return null;
  }

  const start = new Date(Date.UTC(year, month - 1, day, -7));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { start, end, localDay: date };
};

export const getTodayRange = (now = new Date()) => {
  const localDay = now.toLocaleDateString("en-CA", {
    timeZone: DASHBOARD_TIME_ZONE,
  });

  return getDateRange(localDay);
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
        },
      },
      {
        $facet: {
          revenue: [
            {
              $match: {
                status: { $in: REVENUE_BOOKING_STATUSES },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$total_price" },
              },
            },
          ],
          tickets: [
            {
              $group: {
                _id: null,
                total: {
                  $sum: {
                    $size: { $ifNull: ["$showtime_seat_ids", []] },
                  },
                },
              },
            },
          ],
          successfulBookings: [
            {
              $match: {
                status: { $in: REVENUE_BOOKING_STATUSES },
              },
            },
            {
              $count: "total",
            },
          ],
        },
      },
    ]);

    const summary = overview?.[0] ?? {};

    res.status(200).json({
      success: true,
      data: {
        revenue: summary.revenue?.[0]?.total ?? 0,
        ticketsSold: summary.tickets?.[0]?.total ?? 0,
        successfulBookings: summary.successfulBookings?.[0]?.total ?? 0,
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

export const getDailyRevenue = async (req, res) => {
  const dateRange = getDateRange(req.query?.date);
  if (!dateRange) {
    return res.status(400).json({
      success: false,
      message: "Ngày không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD.",
    });
  }

  try {
    const result = await Booking.aggregate([
      {
        $match: {
          payment_status: "paid",
          status: { $in: REVENUE_BOOKING_STATUSES },
          created_at: {
            $gte: dateRange.start,
            $lt: dateRange.end,
          },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$total_price" },
          ticketsSold: {
            $sum: {
              $size: { $ifNull: ["$showtime_seat_ids", []] },
            },
          },
          bookingCount: { $sum: 1 },
        },
      },
    ]);

    const summary = result?.[0] ?? {};
    return res.status(200).json({
      success: true,
      data: {
        revenue: summary.revenue ?? 0,
        ticketsSold: summary.ticketsSold ?? 0,
        bookingCount: summary.bookingCount ?? 0,
        date: dateRange.localDay,
        timezone: DASHBOARD_TIME_ZONE,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
