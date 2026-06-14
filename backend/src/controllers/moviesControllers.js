import Movie from "../models/Movie.js";

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

    const movies = await Movie.find(filter).sort({ created_at: -1 });

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
    });

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
    const movie = await Movie.create(req.body);

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
