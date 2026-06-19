import Movie from "../models/Movie.js";

const normalizeMoviePayload = (body) => {
  const payload = { ...body };

  if (Array.isArray(payload.genreIds)) {
    payload.genres = payload.genreIds;
    delete payload.genreIds;
  }

  if (payload.releaseDate && !payload.release_date) {
    payload.release_date = payload.releaseDate;
    delete payload.releaseDate;
  }

  if (payload.ageLimit !== undefined && payload.age_limit === undefined) {
    payload.age_limit = payload.ageLimit;
    delete payload.ageLimit;
  }

  return payload;
};

export const getAllMovies = async (req, res) => {
  try {
    const { status, q } = req.query;
    const filter = {
      deleted_at: null,
    };

    if (status) {
      filter.status = status;
    }

    if (q) {
      filter.title = { $regex: q, $options: "i" };
    }

    const movies = await Movie.find(filter)
      .populate("genres", "name")
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      data: movies,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMovieById = async (req, res) => {
  try {
    const { id } = req.params;

    const movie = await Movie.findOne({
      _id: id,
      deleted_at: null,
    }).populate("genres", "name");

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phim",
      });
    }

    res.status(200).json({
      success: true,
      data: movie,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createMovie = async (req, res) => {
  try {
    const movie = await Movie.create(normalizeMoviePayload(req.body));
    await movie.populate("genres", "name");

    res.status(201).json({
      success: true,
      message: "Thêm phim thành công",
      data: movie,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateMovie = async (req, res) => {
  try {
    const { id } = req.params;

    const movie = await Movie.findOneAndUpdate(
      { _id: id, deleted_at: null },
      normalizeMoviePayload(req.body),
      { new: true }
    ).populate("genres", "name");

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phim",
      });
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật phim thành công",
      data: movie,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteMovie = async (req, res) => {
  try {
    const { id } = req.params;

    const movie = await Movie.findOneAndUpdate(
      { _id: id, deleted_at: null },
      { deleted_at: new Date() },
      { new: true }
    );

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phim",
      });
    }

    res.status(200).json({
      success: true,
      message: "Xóa phim thành công",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
