import Cinema from "../models/Cinema.js";
import Genre from "../models/Genre.js";
import Movie from "../models/Movie.js";
import Showtime from "../models/Showtime.js";
import Booking from "../models/Booking.js";
import mongoose from "mongoose";

const DASHBOARD_TIME_ZONE = "Asia/Ho_Chi_Minh";
const REVENUE_BOOKING_STATUSES = ["confirmed", "checked_in"];
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

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

export const getWeekRange = (date) => {
  const dateRange = getDateRange(date);
  if (!dateRange) return null;

  const [, yearText, monthText, dayText] = DATE_PATTERN.exec(date);
  const dayOfWeek = new Date(
    Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)),
  ).getUTCDay();
  const daysFromMonday = (dayOfWeek + 6) % 7;
  const start = new Date(
    dateRange.start.getTime() - daysFromMonday * 24 * 60 * 60 * 1000,
  );
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  const days = WEEKDAY_LABELS.map((label, index) => {
    const instant = new Date(start.getTime() + index * 24 * 60 * 60 * 1000);
    return {
      label,
      date: instant.toLocaleDateString("en-CA", {
        timeZone: DASHBOARD_TIME_ZONE,
      }),
    };
  });

  return { start, end, days };
};

export const getMonthRange = (monthValue, yearValue) => {
  const monthText = String(monthValue || "");
  const yearText = String(yearValue || "");
  if (!/^\d{1,2}$/.test(monthText) || !/^\d{4}$/.test(yearText)) {
    return null;
  }

  const month = Number(monthText);
  const year = Number(yearText);
  if (month < 1 || month > 12 || year < 1000 || year > 9999) {
    return null;
  }

  const start = new Date(Date.UTC(year, month - 1, 1, -7));
  const end = new Date(Date.UTC(year, month, 1, -7));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const paddedMonth = String(month).padStart(2, "0");
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return {
      label: day,
      date: `${year}-${paddedMonth}-${day}`,
    };
  });

  return { start, end, days, month, year };
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
          comboRevenue: [
            {
              $group: {
                _id: null,
                total: {
                  $sum: {
                    $reduce: {
                      input: { $ifNull: ["$combos", []] },
                      initialValue: 0,
                      in: {
                        $add: [
                          "$$value",
                          {
                            $ifNull: [
                              "$$this.subtotal",
                              {
                                $multiply: [
                                  { $ifNull: ["$$this.price", 0] },
                                  { $ifNull: ["$$this.quantity", 0] },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          ],
          voucherStats: [
            {
              $match: {
                "voucher.voucher_id": { $exists: true, $ne: null },
              },
            },
            {
              $group: {
                _id: null,
                usageCount: { $sum: 1 },
                totalDiscount: {
                  $sum: { $ifNull: ["$discount_amount", 0] },
                },
              },
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
        comboRevenue: summary.comboRevenue?.[0]?.total ?? 0,
        voucherUsageCount: summary.voucherStats?.[0]?.usageCount ?? 0,
        voucherDiscountAmount: summary.voucherStats?.[0]?.totalDiscount ?? 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getBookingStatusStats = async (_req, res) => {
  try {
    const groupedStatuses = await Booking.aggregate([
      {
        $project: {
          effectiveStatus: {
            $switch: {
              branches: [
                {
                  case: {
                    $or: [
                      { $eq: ["$payment_status", "refunded"] },
                      { $eq: ["$status", "refunded"] },
                    ],
                  },
                  then: "refunded",
                },
                { case: { $eq: ["$status", "cancelled"] }, then: "cancelled" },
                { case: { $eq: ["$status", "expired"] }, then: "expired" },
                { case: { $eq: ["$status", "checked_in"] }, then: "checked_in" },
                {
                  case: {
                    $or: [
                      { $eq: ["$payment_status", "pending"] },
                      { $eq: ["$status", "pending"] },
                    ],
                  },
                  then: "pending",
                },
                { case: { $eq: ["$status", "confirmed"] }, then: "confirmed" },
              ],
              default: null,
            },
          },
        },
      },
      { $match: { effectiveStatus: { $ne: null } } },
      { $group: { _id: "$effectiveStatus", count: { $sum: 1 } } },
    ]);

    const statusCounts = {
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      expired: 0,
      refunded: 0,
      checked_in: 0,
    };

    groupedStatuses.forEach((item) => {
      if (Object.prototype.hasOwnProperty.call(statusCounts, item._id)) {
        statusCounts[item._id] = item.count;
      }
    });

    return res.status(200).json({
      success: true,
      data: statusCounts,
    });
  } catch (error) {
    return res.status(500).json({
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

export const getWeeklyRevenue = async (req, res) => {
  const requestedDate = req.query?.date;
  const weekRange = getWeekRange(requestedDate);
  if (!weekRange) {
    return res.status(400).json({
      success: false,
      message: "Ngày không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD.",
    });
  }

  try {
    const groupedRevenue = await Booking.aggregate([
      {
        $match: {
          payment_status: "paid",
          status: { $in: REVENUE_BOOKING_STATUSES },
          created_at: {
            $gte: weekRange.start,
            $lt: weekRange.end,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$created_at",
              timezone: DASHBOARD_TIME_ZONE,
            },
          },
          revenue: { $sum: "$total_price" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const revenueByDate = new Map(
      groupedRevenue.map((item) => [item._id, item.revenue]),
    );
    const data = weekRange.days.map((day) => ({
      ...day,
      revenue: revenueByDate.get(day.date) ?? 0,
    }));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMonthlyRevenue = async (req, res) => {
  const monthRange = getMonthRange(req.query?.month, req.query?.year);
  if (!monthRange) {
    return res.status(400).json({
      success: false,
      message: "Tháng hoặc năm không hợp lệ.",
    });
  }

  try {
    const groupedRevenue = await Booking.aggregate([
      {
        $match: {
          payment_status: "paid",
          status: { $in: REVENUE_BOOKING_STATUSES },
          created_at: {
            $gte: monthRange.start,
            $lt: monthRange.end,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$created_at",
              timezone: DASHBOARD_TIME_ZONE,
            },
          },
          revenue: { $sum: "$total_price" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const revenueByDate = new Map(
      groupedRevenue.map((item) => [item._id, item.revenue]),
    );
    const days = monthRange.days.map((day) => ({
      ...day,
      revenue: revenueByDate.get(day.date) ?? 0,
    }));
    const totalRevenue = days.reduce((sum, day) => sum + day.revenue, 0);

    return res.status(200).json({
      success: true,
      data: {
        month: monthRange.month,
        year: monthRange.year,
        totalRevenue,
        days,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTopMoviesRevenue = async (_req, res) => {
  try {
    const movies = await Booking.aggregate([
      {
        $match: {
          payment_status: "paid",
          status: { $in: REVENUE_BOOKING_STATUSES },
        },
      },
      {
        $lookup: {
          from: "showtimes",
          localField: "showtime_id",
          foreignField: "_id",
          as: "showtime",
        },
      },
      { $unwind: "$showtime" },
      {
        $lookup: {
          from: "movies",
          localField: "showtime.movie_id",
          foreignField: "_id",
          as: "movie",
        },
      },
      { $unwind: "$movie" },
      {
        $group: {
          _id: "$movie._id",
          title: { $first: "$movie.title" },
          revenue: { $sum: "$total_price" },
          ticketsSold: {
            $sum: {
              $size: { $ifNull: ["$showtime_seat_ids", []] },
            },
          },
          bookingCount: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1, title: 1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          id: "$_id",
          title: 1,
          revenue: 1,
          ticketsSold: 1,
          bookingCount: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: movies,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTopSellingCombos = async (_req, res) => {
  try {
    const combos = await Booking.aggregate([
      {
        $match: {
          payment_status: "paid",
        },
      },
      { $unwind: "$combos" },
      {
        $match: {
          "combos.combo_id": { $ne: null },
          "combos.quantity": { $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$combos.combo_id",
          name: { $first: "$combos.name" },
          quantitySold: { $sum: "$combos.quantity" },
          revenue: {
            $sum: {
              $ifNull: [
                "$combos.subtotal",
                { $multiply: ["$combos.price", "$combos.quantity"] },
              ],
            },
          },
        },
      },
      { $sort: { quantitySold: -1, name: 1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          id: "$_id",
          name: 1,
          quantitySold: 1,
          revenue: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: combos,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMovieRevenue = async (req, res) => {
  const { movieId } = req.params;
  if (!mongoose.isValidObjectId(movieId)) {
    return res.status(400).json({
      success: false,
      message: "ID phim không hợp lệ.",
    });
  }

  const from = req.query?.from;
  const to = req.query?.to;
  if ((from && !to) || (!from && to)) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng cung cấp đầy đủ ngày bắt đầu và ngày kết thúc.",
    });
  }

  let selectedRange = null;
  if (from && to) {
    const fromRange = getDateRange(from);
    const toRange = getDateRange(to);
    if (!fromRange || !toRange || fromRange.start > toRange.start) {
      return res.status(400).json({
        success: false,
        message: "Khoảng ngày không hợp lệ.",
      });
    }
    selectedRange = { start: fromRange.start, end: toRange.end };
  }

  try {
    const movieObjectId = new mongoose.Types.ObjectId(movieId);
    const movie = await Movie.findOne({
      _id: movieObjectId,
      deleted_at: null,
    }).select("title");

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phim.",
      });
    }

    const bookingMatch = {
      payment_status: "paid",
      status: { $in: REVENUE_BOOKING_STATUSES },
    };
    if (selectedRange) {
      bookingMatch.created_at = {
        $gte: selectedRange.start,
        $lt: selectedRange.end,
      };
    }

    const showtimeFilter = {
      movie_id: movieObjectId,
      deleted_at: null,
    };
    if (selectedRange) {
      showtimeFilter.start_time = {
        $gte: selectedRange.start,
        $lt: selectedRange.end,
      };
    }
    showtimeFilter.status = { $ne: "cancelled" };

    const [bookingSummary, showtimeCount, showtimeOccupancy] = await Promise.all([
      Booking.aggregate([
        { $match: bookingMatch },
        {
          $lookup: {
            from: "showtimes",
            localField: "showtime_id",
            foreignField: "_id",
            as: "showtime",
          },
        },
        { $unwind: "$showtime" },
        {
          $match: {
            "showtime.movie_id": movieObjectId,
            "showtime.deleted_at": null,
          },
        },
        {
          $facet: {
            summary: [
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
            ],
            dailyRevenue: [
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      date: "$created_at",
                      timezone: DASHBOARD_TIME_ZONE,
                    },
                  },
                  revenue: { $sum: "$total_price" },
                },
              },
              { $sort: { _id: 1 } },
            ],
            seatTypes: [
              { $unwind: "$showtime_seat_ids" },
              {
                $lookup: {
                  from: "showtime_seats",
                  localField: "showtime_seat_ids",
                  foreignField: "_id",
                  as: "showtimeSeat",
                },
              },
              { $unwind: "$showtimeSeat" },
              {
                $lookup: {
                  from: "seats",
                  localField: "showtimeSeat.seat_id",
                  foreignField: "_id",
                  as: "seat",
                },
              },
              { $unwind: "$seat" },
              {
                $lookup: {
                  from: "seat_types",
                  localField: "seat.seat_type_id",
                  foreignField: "_id",
                  as: "seatType",
                },
              },
              { $unwind: "$seatType" },
              {
                $group: {
                  _id: {
                    $switch: {
                      branches: [
                        {
                          case: {
                            $regexMatch: {
                              input: "$seatType.name",
                              regex: "vip",
                              options: "i",
                            },
                          },
                          then: "vip",
                        },
                        {
                          case: {
                            $regexMatch: {
                              input: "$seatType.name",
                              regex: "đôi|doi|couple|double",
                              options: "i",
                            },
                          },
                          then: "couple",
                        },
                      ],
                      default: "normal",
                    },
                  },
                  count: { $sum: 1 },
                },
              },
            ],
          },
        },
      ]),
      Showtime.countDocuments(showtimeFilter),
      Showtime.aggregate([
        { $match: showtimeFilter },
        {
          $lookup: {
            from: "rooms",
            localField: "room_id",
            foreignField: "_id",
            as: "room",
          },
        },
        { $unwind: "$room" },
        {
          $lookup: {
            from: "seats",
            let: { roomId: "$room_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$room_id", "$$roomId"] },
                  deleted_at: null,
                  status: true,
                },
              },
              { $count: "total" },
            ],
            as: "seatCapacity",
          },
        },
        {
          $lookup: {
            from: "bookings",
            let: { showtimeId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$showtime_id", "$$showtimeId"] },
                  payment_status: "paid",
                  status: { $in: REVENUE_BOOKING_STATUSES },
                },
              },
              {
                $project: {
                  seatCount: {
                    $size: { $ifNull: ["$showtime_seat_ids", []] },
                  },
                },
              },
            ],
            as: "paidBookings",
          },
        },
        {
          $set: {
            countedCapacity: {
              $ifNull: [{ $arrayElemAt: ["$seatCapacity.total", 0] }, 0],
            },
            soldSeats: { $sum: "$paidBookings.seatCount" },
          },
        },
        {
          $set: {
            totalSeats: {
              $cond: [
                { $gt: ["$countedCapacity", 0] },
                "$countedCapacity",
                { $ifNull: ["$room.capacity", 0] },
              ],
            },
          },
        },
        {
          $set: {
            occupancyRate: {
              $cond: [
                { $gt: ["$totalSeats", 0] },
                {
                  $round: [
                    {
                      $multiply: [
                        { $divide: ["$soldSeats", "$totalSeats"] },
                        100,
                      ],
                    },
                    2,
                  ],
                },
                0,
              ],
            },
          },
        },
        { $sort: { start_time: -1 } },
        {
          $project: {
            _id: 0,
            id: "$_id",
            startTime: "$start_time",
            roomName: "$room.name",
            soldSeats: 1,
            totalSeats: 1,
            occupancyRate: 1,
          },
        },
      ]),
    ]);

    const movieRevenueResult = bookingSummary?.[0] ?? {};
    const summary = movieRevenueResult.summary?.[0] ?? {};
    const dailyRevenue = (movieRevenueResult.dailyRevenue || []).map((item) => ({
      date: item._id,
      label: `${item._id.slice(8, 10)}/${item._id.slice(5, 7)}`,
      revenue: item.revenue,
    }));
    const ticketsBySeatType = {
      normal: 0,
      vip: 0,
      couple: 0,
    };
    for (const item of movieRevenueResult.seatTypes || []) {
      if (Object.hasOwn(ticketsBySeatType, item._id)) {
        ticketsBySeatType[item._id] = item.count;
      }
    }
    const occupancyRates = showtimeOccupancy
      .filter((item) => item.totalSeats > 0)
      .map((item) => Number(item.occupancyRate || 0));
    const averageOccupancyRate = occupancyRates.length
      ? Math.round(
          (occupancyRates.reduce((sum, rate) => sum + rate, 0) /
            occupancyRates.length) *
            100,
        ) / 100
      : 0;
    return res.status(200).json({
      success: true,
      data: {
        movie: {
          id: movie._id,
          title: movie.title,
        },
        revenue: summary.revenue ?? 0,
        ticketsSold: summary.ticketsSold ?? 0,
        bookingCount: summary.bookingCount ?? 0,
        showtimeCount,
        dailyRevenue,
        ticketsBySeatType,
        averageOccupancyRate,
        occupancyByShowtime: showtimeOccupancy,
        from: from || null,
        to: to || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
