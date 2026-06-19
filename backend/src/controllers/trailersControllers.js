import Trailer from "../models/Trailer.js";
import Movie from "../models/Movie.js";

export const getAllTrailers = async (req, res) => {
  try {
    const { status, movie_id, q } = req.query;
    const filter = {};

    if (status !== undefined) {
      filter.status = status === "true";
    }

    if (movie_id) {
      filter.movie_id = movie_id;
    }

    if (q) {
      filter.title = { $regex: q, $options: "i" };
    }

    const trailers = await Trailer.find(filter)
      .populate("movie_id", "title poster banner status release_date")
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      data: trailers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createTrailer = async (req, res) => {
  try {
    const { movie_id, title, youtube_url, thumbnail, status } = req.body;

    if (!movie_id || !title || !youtube_url) {
      return res.status(400).json({
        success: false,
        message: "movie_id, title và youtube_url là bắt buộc",
      });
    }

    const movie = await Movie.findOne({
      _id: movie_id,
      deleted_at: null,
    });

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phim",
      });
    }

    const trailer = await Trailer.create({
      movie_id,
      title,
      youtube_url,
      thumbnail: thumbnail ?? null,
      status: status ?? true,
    });

    const populatedTrailer = await Trailer.findById(trailer._id).populate(
      "movie_id",
      "title poster banner status release_date"
    );

    res.status(201).json({
      success: true,
      message: "Thêm trailer thành công",
      data: populatedTrailer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateTrailer = async (req, res) => {
  try {
    const { id } = req.params;
    const { movie_id, title, youtube_url, thumbnail, status } = req.body;

    const trailer = await Trailer.findById(id);

    if (!trailer) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy trailer",
      });
    }

    if (movie_id) {
      const movie = await Movie.findOne({
        _id: movie_id,
        deleted_at: null,
      });

      if (!movie) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy phim",
        });
      }

      trailer.movie_id = movie_id;
    }

    if (title !== undefined) {
      trailer.title = title;
    }

    if (youtube_url !== undefined) {
      trailer.youtube_url = youtube_url;
    }

    if (thumbnail !== undefined) {
      trailer.thumbnail = thumbnail;
    }

    if (status !== undefined) {
      trailer.status = status;
    }

    await trailer.save();

    const populatedTrailer = await Trailer.findById(trailer._id).populate(
      "movie_id",
      "title poster banner status release_date"
    );

    res.status(200).json({
      success: true,
      message: "Cập nhật trailer thành công",
      data: populatedTrailer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteTrailer = async (req, res) => {
  try {
    const { id } = req.params;

    const trailer = await Trailer.findByIdAndDelete(id);

    if (!trailer) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy trailer",
      });
    }

    res.status(200).json({
      success: true,
      message: "Xóa trailer thành công",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
