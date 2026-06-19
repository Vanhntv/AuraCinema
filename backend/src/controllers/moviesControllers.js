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
    const { status, q, search, page = 1, limit = 10 } = req.query;
    const filter = {
      deleted_at: null,
    };

    if (status) {
      filter.status = status;
    }

    const searchQuery = q || search;
    if (searchQuery) {
      filter.title = { $regex: searchQuery, $options: "i" };
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const movies = await Movie.find(filter)
      .populate("genres", "name")
      .populate("genreIds", "name")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Movie.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: movies,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
      totalPages,
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
    })
      .populate("genres", "name")
      .populate("genreIds", "name")

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

    return res.status(201).json({
      success: true,
      message: "Thêm phim thành công",
      data: movie,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const updateMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const { genreIds, ...movieData } = req.body;

    // Normalize field names
    if (!movieData.releaseDate && movieData.release_date) {
      movieData.releaseDate = movieData.release_date;
    }
    if (!movieData.ageLimit && movieData.age_limit) {
      movieData.ageLimit = movieData.age_limit;
    }

    const updateData = {
      ...movieData,
      ...(genreIds && { genres: genreIds, genreIds: genreIds }),
    };

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
