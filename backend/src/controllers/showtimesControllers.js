import Movie from "../models/Movie.js";
import Room from "../models/Room.js";
import Showtime from "../models/Showtime.js";
import { generateShowtimeSeatsForShowtimeService } from "../services/showtimeSeatService.js";

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

const mapShowtime = (showtime) => ({
  id: showtime._id,
  movie_id: showtime.movie_id?._id ?? showtime.movie_id ?? null,
  movieTitle: showtime.movie_id?.title ?? null,
  moviePoster: showtime.movie_id?.poster ?? null,
  room_id: showtime.room_id?._id ?? showtime.room_id ?? null,
  roomName: showtime.room_id?.name ?? null,
  cinema_id: showtime.room_id?.cinema_id?._id ?? showtime.room_id?.cinema_id ?? null,
  cinemaName: showtime.room_id?.cinema_id?.name ?? null,
  cinemaCity: showtime.room_id?.cinema_id?.city ?? null,
  start_time: showtime.start_time,
  startTime: formatTime(showtime.start_time),
  end_time: showtime.end_time,
  endTime: formatTime(showtime.end_time),
  base_price: showtime.base_price,
  created_at: showtime.created_at,
  updated_at: showtime.updated_at,
});

const hasShowtimeConflict = async ({ room_id, startTime, endTime, excludeId }) => {
  const filter = {
    deleted_at: null,
    room_id,
    start_time: { $lt: endTime },
    end_time: { $gt: startTime },
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const conflict = await Showtime.findOne(filter);

  return Boolean(conflict);
};

export const getAllShowtimes = async (req, res) => {
  try {
    const { q, movie_id, room_id, cinema_id, date } = req.query;
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
        select: "name capacity cinema_id",
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
        const cinemaName = showtime.room_id?.cinema_id?.name?.toLowerCase() ?? "";

        return (
          movieTitle.includes(keyword) ||
          roomName.includes(keyword) ||
          cinemaName.includes(keyword)
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
    const { movie_id, room_id, start_time, end_time, base_price } = req.body;

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

    const startDate = new Date(start_time);

    if (Number.isNaN(startDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "start_time khong hop le",
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
      base_price: base_price !== undefined && base_price !== null ? Number(base_price) : null,
    });

    const generatedShowtimeSeats = await generateShowtimeSeatsForShowtimeService(showtime._id);

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
      showtime_seats_created: generatedShowtimeSeats.length,
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
    const { movie_id, room_id, start_time, end_time, base_price } = req.body;

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

    let nextMovieId = showtime.movie_id;
    let nextRoomId = showtime.room_id;
    let nextStartTime = showtime.start_time;
    let nextEndTime = showtime.end_time;

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

      nextEndTime = new Date(nextStartTime.getTime() + movieForDuration.duration * 60 * 1000);
    }

    if (nextEndTime <= nextStartTime) {
      return res.status(400).json({
        success: false,
        message: "end_time phai lon hon start_time",
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
      showtime.base_price = base_price !== null && base_price !== "" ? Number(base_price) : null;
    }

    await showtime.save();

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

    showtime.deleted_at = new Date();
    await showtime.save();

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
    const { q, room_id, cinema_id, date } = req.query;

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
        select: "name capacity cinema_id",
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
        const cinemaName = showtime.room_id?.cinema_id?.name?.toLowerCase() ?? "";

        return (
          movieTitle.includes(keyword) ||
          roomName.includes(keyword) ||
          cinemaName.includes(keyword)
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

export const getShowtimesByRoom = async (req, res) => {
  try {
    const { room_id } = req.params;
    const { q, movie_id, cinema_id, date } = req.query;

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
        select: "name capacity cinema_id",
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
        const cinemaName = showtime.room_id?.cinema_id?.name?.toLowerCase() ?? "";

        return (
          movieTitle.includes(keyword) ||
          roomName.includes(keyword) ||
          cinemaName.includes(keyword)
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
