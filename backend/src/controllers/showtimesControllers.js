import Movie from "../models/Movie.js";
import Room from "../models/Room.js";
import Showtime from "../models/Showtime.js";
import {
  cancelShowtimeSeatsForShowtimeService,
  countReservedShowtimeSeatsForShowtimeService,
  deleteShowtimeSeatsForShowtimeService,
  generateShowtimeSeatsForShowtimeService,
} from "../services/showtimeSeatService.js";

const CLEANUP_BUFFER_MINUTES = 15;
const SELLABLE_STATUSES = ["open"];
const SHOWTIME_STATUSES = [
  "upcoming",
  "open",
  "closed",
  "finished",
  "cancelled",
];

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

const isMissing = (value) =>
  value === undefined || value === null || value === "";

const parseStatus = (value, fallback = "open") => {
  if (isMissing(value)) {
    return fallback;
  }

  const status = String(value).trim();
  return SHOWTIME_STATUSES.includes(status) ? status : fallback;
};

const getEffectiveStatus = (showtime, now = new Date()) => {
  if (showtime.status === "cancelled") {
    return "cancelled";
  }

  if (showtime.end_time && new Date(showtime.end_time) <= now) {
    return "finished";
  }

  if (
    showtime.start_time &&
    new Date(showtime.start_time) <= now &&
    showtime.end_time &&
    new Date(showtime.end_time) > now
  ) {
    return "closed";
  }

  return showtime.status || "open";
};

const addMinutes = (date, minutes) =>
  new Date(date.getTime() + minutes * 60 * 1000);

const buildBufferedRange = (startTime, endTime) => ({
  bufferedStart: addMinutes(startTime, -CLEANUP_BUFFER_MINUTES),
  bufferedEnd: addMinutes(endTime, CLEANUP_BUFFER_MINUTES),
});

const isActiveMovie = (movie) => movie.status !== "ended";

const validateBasePrice = (basePrice) => {
  if (isMissing(basePrice)) {
    return null;
  }

  const price = Number(basePrice);

  if (Number.isNaN(price) || price < 0) {
    return null;
  }

  return price;
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
  show_type: showtime.show_type || "2D",
  status: getEffectiveStatus(showtime),
  stored_status: showtime.status || "open",
  created_at: showtime.created_at,
  updated_at: showtime.updated_at,
});

const hasShowtimeConflict = async ({
  room_id,
  startTime,
  endTime,
  excludeId,
}) => {
  const { bufferedStart, bufferedEnd } = buildBufferedRange(startTime, endTime);
  const filter = {
    deleted_at: null,
    status: { $ne: "cancelled" },
    room_id,
    start_time: { $lt: bufferedEnd },
    end_time: { $gt: bufferedStart },
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const conflict = await Showtime.findOne(filter);

  return Boolean(conflict);
};

export const getAllShowtimes = async (req, res) => {
  try {
    const {
      q,
      movie_id,
      room_id,
      cinema_id,
      date,
      status,
      show_type,
      from,
      to,
      sellable,
    } = req.query;
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

    if (from || to) {
      filter.start_time = {
        ...(filter.start_time || {}),
      };

      if (from) {
        const fromDate = new Date(from);
        if (Number.isNaN(fromDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "from khong hop le",
          });
        }
        filter.start_time.$gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to);
        if (Number.isNaN(toDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "to khong hop le",
          });
        }
        filter.start_time.$lte = toDate;
      }
    }

    if (show_type) {
      filter.show_type = String(show_type).trim();
    }

    let showtimes = await Showtime.find(filter)
      .populate("movie_id", "title poster duration release_date status")
      .populate({
        path: "room_id",
        select: "name capacity cinema_id",
        populate: {
          path: "cinema_id",
          select: "name city address",
        },
      })
      .sort({ start_time: 1, created_at: -1 });

    const now = new Date();

    if (status && status !== "all") {
      showtimes = showtimes.filter(
        (showtime) => getEffectiveStatus(showtime, now) === status,
      );
    }

    if (sellable === "true") {
      showtimes = showtimes.filter((showtime) => {
        const effectiveStatus = getEffectiveStatus(showtime, now);
        return (
          SELLABLE_STATUSES.includes(effectiveStatus) &&
          new Date(showtime.start_time) > now
        );
      });
    }

    if (q) {
      const searchTerms = normalizeSearchText(q).split(/\s+/).filter(Boolean);

      showtimes = showtimes.filter((showtime) => {
        const movieTitle = showtime.movie_id?.title ?? "";
        const roomName = showtime.room_id?.name ?? "";
        const cinemaName = showtime.room_id?.cinema_id?.name ?? "";
        const showType = showtime.show_type ?? "";

        return searchTerms.every((term) =>
          [movieTitle, roomName, cinemaName, showType].some((value) =>
            matchesSearchQuery(value, term),
          ),
        );
      });
    }

    res.status(200).json({
      success: true,
      data: showtimes.map(mapShowtime),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createShowtime = async (req, res) => {
  try {
    const {
      movie_id,
      room_id,
      start_time,
      end_time,
      base_price,
      show_type,
      status,
    } = req.body;

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

    if (!isActiveMovie(movie)) {
      return res.status(409).json({
        success: false,
        message: "Khong the tao suat chieu cho phim da ngung chieu",
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

    const startDate = new Date(start_time);

    if (Number.isNaN(startDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "start_time khong hop le",
      });
    }

    if (startDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Khong the tao suat chieu trong qua khu",
      });
    }

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

    const parsedBasePrice = validateBasePrice(base_price);

    if (!isMissing(base_price) && parsedBasePrice === null) {
      return res.status(400).json({
        success: false,
        message: "Gia ve khong hop le",
      });
    }

    const conflictExists = await hasShowtimeConflict({
      room_id,
      startTime: startDate,
      endTime: finalEndTime,
    });

    if (conflictExists) {
      return res.status(409).json({
        success: false,
        message: "Khung gio nay da trung voi showtime khac",
      });
    }

    const showtime = await Showtime.create({
      movie_id,
      room_id,
      start_time: startDate,
      end_time: finalEndTime,
      base_price: parsedBasePrice,
      show_type: !isMissing(show_type) ? String(show_type).trim() : "2D",
      status: parseStatus(status, "open"),
    });

    const generatedShowtimeSeats =
      await generateShowtimeSeatsForShowtimeService(showtime._id);

    const populatedShowtime = await Showtime.findById(showtime._id)
      .populate("movie_id", "title poster duration release_date status")
      .populate({
        path: "room_id",
        select: "name capacity cinema_id",
        populate: {
          path: "cinema_id",
          select: "name city address",
        },
      });

    res.status(201).json({
      success: true,
      message: "Them showtime thanh cong",
      data: mapShowtime(populatedShowtime),
      showtime_seats_created: generatedShowtimeSeats.upsertedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateShowtime = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      movie_id,
      room_id,
      start_time,
      end_time,
      base_price,
      show_type,
      status,
    } = req.body;

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

    const effectiveStatus = getEffectiveStatus(showtime);

    if (["finished", "cancelled"].includes(effectiveStatus)) {
      return res.status(409).json({
        success: false,
        message: "Khong the chinh sua suat chieu da chieu hoac da huy",
      });
    }

    let nextMovieId = showtime.movie_id;
    let nextRoomId = showtime.room_id;
    let nextStartTime = showtime.start_time;
    let nextEndTime = showtime.end_time;
    let hasReservedSeats = false;

    const touchesCriticalFields =
      movie_id !== undefined ||
      room_id !== undefined ||
      start_time !== undefined ||
      end_time !== undefined;

    if (touchesCriticalFields) {
      const reservedSeatCount =
        await countReservedShowtimeSeatsForShowtimeService(showtime._id);
      hasReservedSeats = reservedSeatCount > 0;

      if (hasReservedSeats) {
        return res.status(409).json({
          success: false,
          message:
            "Suat chieu da co ghe duoc dat, khong the doi phim, phong hoac gio chieu",
        });
      }
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

      if (!isActiveMovie(movie)) {
        return res.status(409).json({
          success: false,
          message: "Khong the tao suat chieu cho phim da ngung chieu",
        });
      }

      nextMovieId = movie._id;
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

      nextRoomId = room._id;
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

    if (nextStartTime < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Khong the dat gio bat dau trong qua khu",
      });
    }

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
    }

    if (nextEndTime <= nextStartTime) {
      return res.status(400).json({
        success: false,
        message: "end_time phai lon hon start_time",
      });
    }

    const parsedBasePrice = validateBasePrice(base_price);

    if (!isMissing(base_price) && parsedBasePrice === null) {
      return res.status(400).json({
        success: false,
        message: "Gia ve khong hop le",
      });
    }

    const conflictExists = await hasShowtimeConflict({
      room_id: nextRoomId,
      startTime: nextStartTime,
      endTime: nextEndTime,
      excludeId: showtime._id,
    });

    if (conflictExists) {
      return res.status(409).json({
        success: false,
        message: "Khung gio nay da trung voi showtime khac",
      });
    }

    showtime.movie_id = nextMovieId;
    showtime.room_id = nextRoomId;
    showtime.start_time = nextStartTime;
    showtime.end_time = nextEndTime;

    if (base_price !== undefined) {
      showtime.base_price = parsedBasePrice;
    }

    if (show_type !== undefined) {
      showtime.show_type = !isMissing(show_type)
        ? String(show_type).trim()
        : "2D";
    }

    if (status !== undefined) {
      showtime.status = parseStatus(status, showtime.status || "open");
    }

    await showtime.save();

    if (base_price !== undefined || room_id !== undefined) {
      await generateShowtimeSeatsForShowtimeService(showtime._id);
    }

    if (showtime.status === "cancelled") {
      await cancelShowtimeSeatsForShowtimeService(showtime._id);
    }

    const populatedShowtime = await Showtime.findById(showtime._id)
      .populate("movie_id", "title poster duration release_date status")
      .populate({
        path: "room_id",
        select: "name capacity cinema_id",
        populate: {
          path: "cinema_id",
          select: "name city address",
        },
      });

    res.status(200).json({
      success: true,
      message: "Cap nhat showtime thanh cong",
      data: mapShowtime(populatedShowtime),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
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

    const reservedSeatCount =
      await countReservedShowtimeSeatsForShowtimeService(showtime._id);

    if (reservedSeatCount > 0) {
      showtime.status = "cancelled";
      await showtime.save();
      await cancelShowtimeSeatsForShowtimeService(showtime._id);

      return res.status(200).json({
        success: true,
        message:
          "Suat chieu da co du lieu dat ghe nen da duoc chuyen sang trang thai da huy",
      });
    }

    showtime.deleted_at = new Date();
    await showtime.save();
    await deleteShowtimeSeatsForShowtimeService(showtime._id);

    res.status(200).json({
      success: true,
      message: "Xoa showtime thanh cong",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getShowtimesByMovie = async (req, res) => {
  try {
    const { movie_id } = req.params;
    const { q, room_id, cinema_id, date, status, show_type } = req.query;

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

    if (show_type) {
      filter.show_type = String(show_type).trim();
    }

    let showtimes = await Showtime.find(filter)
      .populate("movie_id", "title poster duration release_date status")
      .populate({
        path: "room_id",
        select: "name capacity cinema_id",
        populate: {
          path: "cinema_id",
          select: "name city address",
        },
      })
      .sort({ start_time: 1, created_at: -1 });

    const now = new Date();
    showtimes = showtimes.filter((showtime) => {
      const effectiveStatus = getEffectiveStatus(showtime, now);

      if (status && status !== "all") {
        return effectiveStatus === status;
      }

      return (
        SELLABLE_STATUSES.includes(effectiveStatus) &&
        new Date(showtime.start_time) > now
      );
    });

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

    res.status(200).json({
      success: true,
      data: showtimes.map(mapShowtime),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getShowtimesByRoom = async (req, res) => {
  try {
    const { room_id } = req.params;
    const { q, movie_id, cinema_id, date, status, show_type } = req.query;

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

    if (show_type) {
      filter.show_type = String(show_type).trim();
    }

    let showtimes = await Showtime.find(filter)
      .populate("movie_id", "title poster duration release_date status")
      .populate({
        path: "room_id",
        select: "name capacity cinema_id",
        populate: {
          path: "cinema_id",
          select: "name city address",
        },
      })
      .sort({ start_time: 1, created_at: -1 });

    const now = new Date();
    showtimes = showtimes.filter((showtime) => {
      const effectiveStatus = getEffectiveStatus(showtime, now);

      if (status && status !== "all") {
        return effectiveStatus === status;
      }

      return (
        SELLABLE_STATUSES.includes(effectiveStatus) &&
        new Date(showtime.start_time) > now
      );
    });

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

    res.status(200).json({
      success: true,
      data: showtimes.map(mapShowtime),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
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
        select: "name capacity cinema_id",
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
