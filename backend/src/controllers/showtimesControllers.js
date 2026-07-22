import Movie from "../models/Movie.js";
import Room from "../models/Room.js";
import Showtime from "../models/Showtime.js";
import Booking from "../models/Booking.js";
import AuditLog from "../models/AuditLog.js";
import {
  generateShowtimeSeatsForShowtimeService,
} from "../services/showtimeSeatService.js";

const SHOWTIME_STATUSES = ["scheduled", "now_showing", "completed", "cancelled"];
const SHOWTIME_CLEANUP_BUFFER_MINUTES = 30;

const jakartaTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const getDayRange = (dateValue) => {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const jakartaDay = date.toLocaleDateString("en-CA", {
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

const sendError = (res, error) => {
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message,
  });
};

const resolveBufferMinutes = () => SHOWTIME_CLEANUP_BUFFER_MINUTES;

const resolveShowtimeStatus = (showtime, now = new Date()) => {
  if (showtime.status === "cancelled") return "cancelled";
  if (showtime.start_time > now) return "scheduled";
  if (showtime.end_time > now) return "now_showing";
  return "completed";
};

const parseShowtimeStatus = (value, fallback = "scheduled") => {
  if (value === undefined || value === null || value === "") return fallback;
  const status = String(value).trim().toLowerCase();

  if (!SHOWTIME_STATUSES.includes(status)) {
    const error = new Error("status khong hop le");
    error.statusCode = 400;
    throw error;
  }

  return status;
};

const parsePrice = (value, fieldName) => {
  if (value === undefined || value === null || value === "") return null;

  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) {
    const error = new Error(`${fieldName} khong hop le`);
    error.statusCode = 400;
    throw error;
  }

  return price;
};

const normalizeSeatPrices = (seatPrices) => {
  if (seatPrices === undefined) return undefined;
  if (!seatPrices || typeof seatPrices !== "object") {
    return {
      normal: null,
      vip: null,
      couple: null,
    };
  }

  return {
    normal: parsePrice(seatPrices.normal, "seat_prices.normal"),
    vip: parsePrice(seatPrices.vip, "seat_prices.vip"),
    couple: parsePrice(seatPrices.couple, "seat_prices.couple"),
  };
};

const assertShowtimeHasNotStarted = (showtime) => {
  if (showtime.start_time <= new Date()) {
    const error = new Error("Khong the chinh sua hoac huy suat chieu da bat dau");
    error.statusCode = 409;
    throw error;
  }
};

const assertShowtimeStartIsFuture = (startTime) => {
  if (startTime <= new Date()) {
    const error = new Error("Khong the tao hoac doi suat chieu ve thoi diem da qua");
    error.statusCode = 400;
    throw error;
  }
};

const assertMovieCanBeScheduled = (movie, startTime) => {
  if (movie.status !== "now_showing") {
    const error = new Error("Chi phim dang cong chieu moi duoc tao suat chieu");
    error.statusCode = 409;
    throw error;
  }

  const releaseDate = movie.release_date || movie.releaseDate;
  if (releaseDate && startTime < new Date(releaseDate)) {
    const error = new Error("Khong the tao suat chieu truoc ngay khoi chieu phim");
    error.statusCode = 409;
    throw error;
  }
};

const countActiveBookings = async (showtimeId) =>
  Booking.countDocuments({
    showtime_id: showtimeId,
    status: { $ne: "cancelled" },
  });

const assertNoBookingsForImportantChanges = async (showtimeId) => {
  const bookingCount = await countActiveBookings(showtimeId);
  if (bookingCount > 0) {
    const error = new Error("Khong the doi phim, phong hoac gio chieu khi da co booking");
    error.statusCode = 409;
    throw error;
  }
};

const toAuditSnapshot = (showtime) => {
  if (!showtime) return null;
  const raw = typeof showtime.toObject === "function" ? showtime.toObject() : showtime;
  return {
    _id: raw._id,
    movie_id: raw.movie_id,
    room_id: raw.room_id,
    start_time: raw.start_time,
    end_time: raw.end_time,
    base_price: raw.base_price,
    seat_prices: raw.seat_prices,
    status: raw.status,
    cancelled_at: raw.cancelled_at,
    deleted_at: raw.deleted_at,
  };
};

const writeShowtimeAuditLog = async ({ req, action, before = null, after = null, showtimeId }) => {
  const adminId = req.user?._id || req.user?.id;
  if (!adminId) return;

  await AuditLog.create({
    admin_id: adminId,
    target_type: "Showtime",
    target_id: showtimeId || after?._id || before?._id || null,
    action,
    before,
    after,
  });
};

const normalizeSearchText = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const matchesSearchQuery = (value, query) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return true;
  }

  return normalizeSearchText(value).includes(normalizedQuery);
};

const mapShowtime = (showtime) => ({
  id: showtime._id,
  movie_id: showtime.movie_id?._id ?? showtime.movie_id ?? null,
  movieTitle: showtime.movie_id?.title ?? null,
  moviePoster: showtime.movie_id?.poster ?? null,
  movieDuration: showtime.movie_id?.duration ?? null,
  movieStatus: showtime.movie_id?.status ?? null,
  room_id: showtime.room_id?._id ?? showtime.room_id ?? null,
  roomName: showtime.room_id?.name ?? null,
  cinema_id:
    showtime.room_id?.cinema_id?._id ?? showtime.room_id?.cinema_id ?? null,
  cinemaName: showtime.room_id?.cinema_id?.name ?? null,
  cinemaCity: showtime.room_id?.cinema_id?.city ?? null,
  start_time: showtime.start_time,
  startTime: formatTime(showtime.start_time),
  end_time: showtime.end_time,
  endTime: formatTime(showtime.end_time),
  base_price: showtime.base_price,
  seat_prices: showtime.seat_prices ?? null,
  status: resolveShowtimeStatus(showtime),
  stored_status: showtime.status || "scheduled",
  buffer_minutes: resolveBufferMinutes(showtime.room_id),
  created_at: showtime.created_at,
  updated_at: showtime.updated_at,
});

const getEffectiveShowtimeEndTime = (showtime) => {
  const startTime = new Date(showtime.start_time);
  const storedEndTime = new Date(showtime.end_time);
  const movieDuration = Number(showtime.movie_id?.duration);

  if (Number.isNaN(startTime.getTime())) {
    return storedEndTime;
  }

  if (Number.isFinite(movieDuration) && movieDuration > 0) {
    const durationEndTime = new Date(
      startTime.getTime() + movieDuration * 60 * 1000,
    );
    const storedDurationMinutes =
      (storedEndTime.getTime() - startTime.getTime()) / 60000;

    if (
      Number.isNaN(storedEndTime.getTime()) ||
      storedEndTime <= startTime ||
      storedDurationMinutes > movieDuration + 60
    ) {
      return durationEndTime;
    }
  }

  return storedEndTime;
};

const hasShowtimeConflict = async ({
  room_id,
  startTime,
  endTime,
  bufferMinutes = 0,
  excludeId,
}) => {
  const bufferMs = bufferMinutes * 60 * 1000;
  const filter = {
    deleted_at: null,
    room_id,
    status: { $ne: "cancelled" },
    start_time: { $lt: new Date(endTime.getTime() + bufferMs) },
    end_time: { $gt: new Date(startTime.getTime() - bufferMs) },
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const candidates = await Showtime.find(filter)
    .populate("movie_id", "title poster duration release_date status")
    .populate({
      path: "room_id",
      select: "name capacity cinema_id room_type status",
      populate: {
        path: "cinema_id",
        select: "name city address",
      },
    })
    .sort({ start_time: 1 });

  return candidates.find((showtime) => {
    const effectiveEndTime = getEffectiveShowtimeEndTime(showtime);

    return (
      showtime.start_time < new Date(endTime.getTime() + bufferMs) &&
      effectiveEndTime > new Date(startTime.getTime() - bufferMs)
    );
  });
};

const assertRoomCanCreateShowtime = (room) => {
  if (room.status && room.status !== "active") {
    const error = new Error("Chi phong dang hoat dong moi duoc tao suat chieu");
    error.statusCode = 409;
    throw error;
  }
};

export const getAllShowtimes = async (req, res) => {
  try {
    const { q, movie_id, room_id, cinema_id, date, status } = req.query;
    const requestedStatus = status ? parseShowtimeStatus(status) : "";
    const filter = {
      deleted_at: null,
    };

    if (movie_id) {
      filter.movie_id = movie_id;
    }

    if (room_id) {
      filter.room_id = room_id;
    }

    if (cinema_id) {
      const rooms = await Room.find({
        cinema_id,
        deleted_at: null,
      }).select("_id");

      if (!rooms.length) {
        return res.status(200).json({
          success: true,
          data: [],
        });
      }

      filter.room_id = {
        $in: rooms.map((room) => room._id),
      };
    }

    if (date) {
      const dayRange = getDayRange(date);

      if (!dayRange) {
        return res.status(400).json({
          success: false,
          message: "date khong hop le",
        });
      }

      filter.start_time = {
        $gte: dayRange.start,
        $lte: dayRange.end,
      };
    }

    let showtimes = await Showtime.find(filter)
      .populate("movie_id", "title poster duration release_date status")
      .populate({
        path: "room_id",
        select: "name capacity cinema_id room_type status",
        populate: {
          path: "cinema_id",
          select: "name city address",
        },
      })
      .sort({ start_time: 1, created_at: -1 });

    if (q) {
      const keyword = q.trim().toLowerCase();

      showtimes = showtimes.filter((showtime) => {
        const movieTitle = showtime.movie_id?.title?.toLowerCase() ?? "";
        const roomName = showtime.room_id?.name?.toLowerCase() ?? "";
        const cinemaName =
          showtime.room_id?.cinema_id?.name?.toLowerCase() ?? "";

        return (
          movieTitle.includes(keyword) ||
          roomName.includes(keyword) ||
          cinemaName.includes(keyword)
        );
      });
    }

    const mappedShowtimes = showtimes.map(mapShowtime);

    res.status(200).json({
      success: true,
      data: requestedStatus
        ? mappedShowtimes.filter((showtime) => showtime.status === requestedStatus)
        : mappedShowtimes,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const createShowtime = async (req, res) => {
  try {
    const { movie_id, room_id, start_time, end_time, base_price, seat_prices } = req.body;

    if (!movie_id || !room_id || !start_time) {
      return res.status(400).json({
        success: false,
        message: "movie_id, room_id va start_time la bat buoc",
      });
    }

    const movie = await Movie.findOne({
      _id: movie_id,
      deleted_at: null,
    });

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay movie",
      });
    }

    const room = await Room.findOne({
      _id: room_id,
      deleted_at: null,
    }).populate("cinema_id", "name city address");

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay room",
      });
    }

    assertRoomCanCreateShowtime(room);

    const startDate = new Date(start_time);

    if (Number.isNaN(startDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "start_time khong hop le",
      });
    }

    assertShowtimeStartIsFuture(startDate);
    assertMovieCanBeScheduled(movie, startDate);

    let finalEndTime = end_time ? new Date(end_time) : null;

    if (finalEndTime && Number.isNaN(finalEndTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: "end_time khong hop le",
      });
    }

    if (!finalEndTime) {
      if (!movie.duration) {
        return res.status(400).json({
          success: false,
          message: "Phim chua co duration de tinh end_time",
        });
      }

      finalEndTime = new Date(startDate.getTime() + movie.duration * 60 * 1000);
    }

    if (finalEndTime <= startDate) {
      return res.status(400).json({
        success: false,
        message: "end_time phai lon hon start_time",
      });
    }

    const conflictShowtime = await hasShowtimeConflict({
      room_id,
      startTime: startDate,
      endTime: finalEndTime,
      bufferMinutes: resolveBufferMinutes(room),
    });

    if (conflictShowtime) {
      return res.status(409).json({
        success: false,
        message:
          "Khung gio nay bi trung hoac chua cach suat lien ke toi thieu 30 phut",
        conflict: mapShowtime(conflictShowtime),
      });
    }

    const cancelledShowtime = await Showtime.findOne({
      deleted_at: null,
      status: "cancelled",
      movie_id,
      room_id,
      start_time: startDate,
    });

    if (cancelledShowtime) {
      const beforeSnapshot = toAuditSnapshot(cancelledShowtime);
      cancelledShowtime.end_time = finalEndTime;
      cancelledShowtime.base_price = parsePrice(base_price, "base_price");
      cancelledShowtime.seat_prices = normalizeSeatPrices(seat_prices);
      cancelledShowtime.status = "scheduled";
      cancelledShowtime.cancelled_at = null;
      await cancelledShowtime.save();

      const generatedShowtimeSeats =
        await generateShowtimeSeatsForShowtimeService(cancelledShowtime._id);

      const restoredShowtime = await Showtime.findById(cancelledShowtime._id)
        .populate("movie_id", "title poster duration release_date status")
        .populate({
          path: "room_id",
          select: "name capacity cinema_id room_type status",
          populate: {
            path: "cinema_id",
            select: "name city address",
          },
        });

      await writeShowtimeAuditLog({
        req,
        action: "showtime.restore",
        before: beforeSnapshot,
        after: toAuditSnapshot(cancelledShowtime),
        showtimeId: cancelledShowtime._id,
      });

      return res.status(200).json({
        success: true,
        message: "Da khoi phuc suat chieu da huy",
        data: mapShowtime(restoredShowtime),
        showtime_seats_created: generatedShowtimeSeats.upsertedCount,
      });
    }

    const showtime = await Showtime.create({
      movie_id,
      room_id,
      start_time: startDate,
      end_time: finalEndTime,
      base_price: parsePrice(base_price, "base_price"),
      seat_prices: normalizeSeatPrices(seat_prices),
      status: "scheduled",
    });

    const generatedShowtimeSeats =
      await generateShowtimeSeatsForShowtimeService(showtime._id);

    const populatedShowtime = await Showtime.findById(showtime._id)
      .populate("movie_id", "title poster duration release_date status")
      .populate({
        path: "room_id",
        select: "name capacity cinema_id room_type status",
        populate: {
          path: "cinema_id",
          select: "name city address",
        },
      });

    await writeShowtimeAuditLog({
      req,
      action: "showtime.create",
      before: null,
      after: toAuditSnapshot(showtime),
      showtimeId: showtime._id,
    });

    res.status(201).json({
      success: true,
      message: "Them showtime thanh cong",
      data: mapShowtime(populatedShowtime),
      showtime_seats_created: generatedShowtimeSeats.upsertedCount,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const checkShowtimeConflict = async (req, res) => {
  try {
    const { movie_id, room_id, start_time, exclude_id } = req.query;

    if (!movie_id || !room_id || !start_time) {
      return res.status(400).json({
        success: false,
        message: "movie_id, room_id va start_time la bat buoc",
      });
    }

    const movie = await Movie.findOne({
      _id: movie_id,
      deleted_at: null,
    });

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay movie",
      });
    }

    let excludedShowtime = null;
    if (exclude_id) {
      excludedShowtime = await Showtime.findOne({
        _id: exclude_id,
        deleted_at: null,
      });
    }

    const room = await Room.findOne({
      _id: room_id,
      deleted_at: null,
    }).populate("cinema_id", "name city address");

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay room",
      });
    }

    assertRoomCanCreateShowtime(room);

    const startDate = new Date(start_time);

    if (Number.isNaN(startDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "start_time khong hop le",
      });
    }

    assertShowtimeStartIsFuture(startDate);
    if (
      !excludedShowtime ||
      String(excludedShowtime.movie_id) !== String(movie._id)
    ) {
      assertMovieCanBeScheduled(movie, startDate);
    }

    if (!movie.duration) {
      return res.status(400).json({
        success: false,
        message: "Phim chua co duration de tinh end_time",
      });
    }

    const endDate = new Date(startDate.getTime() + movie.duration * 60 * 1000);
    const conflictShowtime = await hasShowtimeConflict({
      room_id,
      startTime: startDate,
      endTime: endDate,
      bufferMinutes: resolveBufferMinutes(room),
      excludeId: exclude_id,
    });

    return res.status(200).json({
      success: true,
      has_conflict: Boolean(conflictShowtime),
      conflict: conflictShowtime ? mapShowtime(conflictShowtime) : null,
      buffer_minutes: resolveBufferMinutes(room),
      message: conflictShowtime
        ? "Khung gio nay bi trung hoac chua cach suat lien ke toi thieu 30 phut"
        : "",
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const updateShowtime = async (req, res) => {
  try {
    const { id } = req.params;
    const { movie_id, room_id, start_time, end_time, base_price, seat_prices, status } = req.body;

    const showtime = await Showtime.findOne({
      _id: id,
      deleted_at: null,
    });

    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay showtime",
      });
    }

    assertShowtimeHasNotStarted(showtime);

    const beforeSnapshot = toAuditSnapshot(showtime);
    let nextMovieId = showtime.movie_id;
    let nextRoomId = showtime.room_id;
    let nextStartTime = showtime.start_time;
    let nextEndTime = showtime.end_time;
    let movieForValidation = null;
    let roomForValidation = null;
    const isChangingMovie =
      movie_id !== undefined && String(movie_id) !== String(showtime.movie_id);
    const hasImportantChanges =
      isChangingMovie ||
      (room_id !== undefined && String(room_id) !== String(showtime.room_id)) ||
      start_time !== undefined ||
      end_time !== undefined;

    if (hasImportantChanges) {
      await assertNoBookingsForImportantChanges(showtime._id);
    }

    if (movie_id !== undefined) {
      const movie = await Movie.findOne({
        _id: movie_id,
        deleted_at: null,
      });

      if (!movie) {
        return res.status(404).json({
          success: false,
          message: "Khong tim thay movie",
        });
      }

      nextMovieId = movie._id;
      movieForValidation = movie;
    }

    if (room_id !== undefined) {
      const room = await Room.findOne({
        _id: room_id,
        deleted_at: null,
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: "Khong tim thay room",
        });
      }

      assertRoomCanCreateShowtime(room);

      nextRoomId = room._id;
      roomForValidation = room;
    }

    if (start_time !== undefined) {
      const parsedStartTime = new Date(start_time);

      if (Number.isNaN(parsedStartTime.getTime())) {
        return res.status(400).json({
          success: false,
          message: "start_time khong hop le",
        });
      }

      nextStartTime = parsedStartTime;
    }

    assertShowtimeStartIsFuture(nextStartTime);

    if (end_time !== undefined) {
      const parsedEndTime = new Date(end_time);

      if (Number.isNaN(parsedEndTime.getTime())) {
        return res.status(400).json({
          success: false,
          message: "end_time khong hop le",
        });
      }

      nextEndTime = parsedEndTime;
    } else if (start_time !== undefined || movie_id !== undefined) {
      const movieForDuration = await Movie.findOne({
        _id: nextMovieId,
        deleted_at: null,
      });

      if (!movieForDuration?.duration) {
        return res.status(400).json({
          success: false,
          message: "Phim chua co duration de tinh end_time",
        });
      }

      nextEndTime = new Date(
        nextStartTime.getTime() + movieForDuration.duration * 60 * 1000,
      );
      movieForValidation = movieForDuration;
    }

    if (nextEndTime <= nextStartTime) {
      return res.status(400).json({
        success: false,
        message: "end_time phai lon hon start_time",
      });
    }

    if (!movieForValidation) {
      movieForValidation = await Movie.findOne({
        _id: nextMovieId,
        deleted_at: null,
      });
    }
    if (isChangingMovie) {
      assertMovieCanBeScheduled(movieForValidation, nextStartTime);
    }

    if (!roomForValidation) {
      roomForValidation = await Room.findOne({
        _id: nextRoomId,
        deleted_at: null,
      });
    }

    const conflictShowtime = await hasShowtimeConflict({
      room_id: nextRoomId,
      startTime: nextStartTime,
      endTime: nextEndTime,
      bufferMinutes: resolveBufferMinutes(roomForValidation),
      excludeId: showtime._id,
    });

    if (conflictShowtime) {
      return res.status(409).json({
        success: false,
        message:
          "Khung gio nay bi trung hoac chua cach suat lien ke toi thieu 30 phut",
        conflict: mapShowtime(conflictShowtime),
      });
    }

    const cancelledShowtime = await Showtime.findOne({
      _id: { $ne: showtime._id },
      deleted_at: null,
      status: "cancelled",
      movie_id: nextMovieId,
      room_id: nextRoomId,
      start_time: nextStartTime,
    });

    if (cancelledShowtime) {
      const restoreBeforeSnapshot = toAuditSnapshot(cancelledShowtime);
      cancelledShowtime.end_time = nextEndTime;
      cancelledShowtime.status = "scheduled";
      cancelledShowtime.cancelled_at = null;

      if (base_price !== undefined) {
        cancelledShowtime.base_price = parsePrice(base_price, "base_price");
      }

      if (seat_prices !== undefined) {
        cancelledShowtime.seat_prices = normalizeSeatPrices(seat_prices);
      }

      await cancelledShowtime.save();

      if (base_price !== undefined || seat_prices !== undefined) {
        await generateShowtimeSeatsForShowtimeService(cancelledShowtime._id);
      }

      const restoredShowtime = await Showtime.findById(cancelledShowtime._id)
        .populate("movie_id", "title poster duration release_date status")
        .populate({
          path: "room_id",
          select: "name capacity cinema_id room_type status",
          populate: {
            path: "cinema_id",
            select: "name city address",
          },
        });

      await writeShowtimeAuditLog({
        req,
        action: "showtime.restore",
        before: restoreBeforeSnapshot,
        after: toAuditSnapshot(cancelledShowtime),
        showtimeId: cancelledShowtime._id,
      });

      return res.status(200).json({
        success: true,
        message: "Da khoi phuc suat chieu da huy",
        data: mapShowtime(restoredShowtime),
      });
    }

    showtime.movie_id = nextMovieId;
    showtime.room_id = nextRoomId;
    showtime.start_time = nextStartTime;
    showtime.end_time = nextEndTime;

    if (base_price !== undefined) {
      showtime.base_price = parsePrice(base_price, "base_price");
    }

    if (seat_prices !== undefined) {
      showtime.seat_prices = normalizeSeatPrices(seat_prices);
    }

    if (status !== undefined) {
      showtime.status = parseShowtimeStatus(status, showtime.status || "scheduled");
    }

    await showtime.save();

    if (base_price !== undefined || seat_prices !== undefined || room_id !== undefined) {
      await generateShowtimeSeatsForShowtimeService(showtime._id);
    }

    const populatedShowtime = await Showtime.findById(showtime._id)
      .populate("movie_id", "title poster duration release_date status")
      .populate({
        path: "room_id",
        select: "name capacity cinema_id room_type status",
        populate: {
          path: "cinema_id",
          select: "name city address",
        },
      });

    await writeShowtimeAuditLog({
      req,
      action: "showtime.update",
      before: beforeSnapshot,
      after: toAuditSnapshot(showtime),
      showtimeId: showtime._id,
    });

    res.status(200).json({
      success: true,
      message: "Cap nhat showtime thanh cong",
      data: mapShowtime(populatedShowtime),
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteShowtime = async (req, res) => {
  try {
    const { id } = req.params;

    const showtime = await Showtime.findOne({
      _id: id,
      deleted_at: null,
    });

    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay showtime",
      });
    }

    assertShowtimeHasNotStarted(showtime);
    const beforeSnapshot = toAuditSnapshot(showtime);

    showtime.status = "cancelled";
    showtime.cancelled_at = new Date();
    await showtime.save();

    await writeShowtimeAuditLog({
      req,
      action: "showtime.cancel",
      before: beforeSnapshot,
      after: toAuditSnapshot(showtime),
      showtimeId: showtime._id,
    });

    res.status(200).json({
      success: true,
      message: "Huy showtime thanh cong",
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const getShowtimesByMovie = async (req, res) => {
  try {
    const { movie_id } = req.params;
    const { q, room_id, cinema_id, date, status } = req.query;
    const requestedStatus = status ? parseShowtimeStatus(status) : "";

    const filter = {
      deleted_at: null,
      movie_id,
    };

    if (room_id) {
      filter.room_id = room_id;
    }

    if (cinema_id) {
      const rooms = await Room.find({
        cinema_id,
        deleted_at: null,
      }).select("_id");

      if (!rooms.length) {
        return res.status(200).json({
          success: true,
          data: [],
        });
      }

      filter.room_id = {
        $in: rooms.map((room) => room._id),
      };
    }

    if (date) {
      const dayRange = getDayRange(date);

      if (!dayRange) {
        return res.status(400).json({
          success: false,
          message: "date khong hop le",
        });
      }

      filter.start_time = {
        $gte: dayRange.start,
        $lte: dayRange.end,
      };
    }

    let showtimes = await Showtime.find(filter)
      .populate("movie_id", "title poster duration release_date status")
      .populate({
        path: "room_id",
        select: "name capacity cinema_id room_type status",
        populate: {
          path: "cinema_id",
          select: "name city address",
        },
      })
      .sort({ start_time: 1, created_at: -1 });

    if (q) {
      const searchTerms = normalizeSearchText(q).split(/\s+/).filter(Boolean);

      showtimes = showtimes.filter((showtime) => {
        const movieTitle = showtime.movie_id?.title ?? "";
        const roomName = showtime.room_id?.name ?? "";
        const cinemaName = showtime.room_id?.cinema_id?.name ?? "";

        return searchTerms.every((term) => {
          return [movieTitle, roomName, cinemaName].some((value) =>
            matchesSearchQuery(value, term),
          );
        });
      });
    }

    const mappedShowtimes = showtimes.map(mapShowtime);

    res.status(200).json({
      success: true,
      data: requestedStatus
        ? mappedShowtimes.filter((showtime) => showtime.status === requestedStatus)
        : mappedShowtimes,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const getShowtimesByRoom = async (req, res) => {
  try {
    const { room_id } = req.params;
    const { q, movie_id, cinema_id, date, status } = req.query;
    const requestedStatus = status ? parseShowtimeStatus(status) : "";

    const filter = {
      deleted_at: null,
      room_id,
    };

    if (movie_id) {
      filter.movie_id = movie_id;
    }

    if (cinema_id) {
      const rooms = await Room.find({
        cinema_id,
        deleted_at: null,
      }).select("_id");

      const roomIds = rooms.map((room) => room._id.toString());

      if (!roomIds.includes(room_id)) {
        return res.status(200).json({
          success: true,
          data: [],
        });
      }
    }

    if (date) {
      const dayRange = getDayRange(date);

      if (!dayRange) {
        return res.status(400).json({
          success: false,
          message: "date khong hop le",
        });
      }

      filter.start_time = {
        $gte: dayRange.start,
        $lte: dayRange.end,
      };
    }

    let showtimes = await Showtime.find(filter)
      .populate("movie_id", "title poster duration release_date status")
      .populate({
        path: "room_id",
        select: "name capacity cinema_id room_type status",
        populate: {
          path: "cinema_id",
          select: "name city address",
        },
      })
      .sort({ start_time: 1, created_at: -1 });

    if (q) {
      const searchTerms = normalizeSearchText(q).split(/\s+/).filter(Boolean);

      showtimes = showtimes.filter((showtime) => {
        const movieTitle = showtime.movie_id?.title ?? "";
        const roomName = showtime.room_id?.name ?? "";
        const cinemaName = showtime.room_id?.cinema_id?.name ?? "";

        return searchTerms.every((term) => {
          return [movieTitle, roomName, cinemaName].some((value) =>
            matchesSearchQuery(value, term),
          );
        });
      });
    }

    const mappedShowtimes = showtimes.map(mapShowtime);

    res.status(200).json({
      success: true,
      data: requestedStatus
        ? mappedShowtimes.filter((showtime) => showtime.status === requestedStatus)
        : mappedShowtimes,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const getShowtimeById = async (req, res) => {
  try {
    const { id } = req.params;

    const showtime = await Showtime.findOne({
      _id: id,
      deleted_at: null,
    })
      .populate("movie_id", "title poster duration release_date status")
      .populate({
        path: "room_id",
        select: "name capacity cinema_id room_type status",
        populate: {
          path: "cinema_id",
          select: "name city address",
        },
      });

    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay showtime",
      });
    }

    res.status(200).json({
      success: true,
      data: mapShowtime(showtime),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
