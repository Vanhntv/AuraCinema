import Movie from "../models/Movie.js";

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
      .populate("genres")
      .populate("genreIds")
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
      .populate("genres")
      .populate("genreIds");

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
    const { genreIds, ...movieData } = req.body;

    // Normalize field names
    if (!movieData.releaseDate && movieData.release_date) {
      movieData.releaseDate = movieData.release_date;
    }
    if (!movieData.ageLimit && movieData.age_limit) {
      movieData.ageLimit = movieData.age_limit;
    }

    const movie = await Movie.create({
      ...movieData,
      genres: genreIds || [],
      genreIds: genreIds || [],
    });

    const populatedMovie = await movie.populate("genres");

    res.status(201).json({
      success: true,
      message: "Thêm phim thành công",
      data: populatedMovie,
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
      updateData,
      { new: true }
    ).populate("genres");

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
