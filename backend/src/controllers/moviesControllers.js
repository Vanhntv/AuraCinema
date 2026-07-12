import Movie from "../models/Movie.js";
import Trailer from "../models/Trailer.js";

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

  if (payload.youtube_url !== undefined && payload.trailer_url === undefined) {
    payload.trailer_url = payload.youtube_url;
    delete payload.youtube_url;
  }

  if (payload.trailer_url !== undefined) {
    payload.trailer_url =
      typeof payload.trailer_url === "string" && payload.trailer_url.trim()
        ? payload.trailer_url.trim()
        : null;
  }

  return payload;
};

const getTrailerUrlFromPayload = (body) => {
  if (body.trailer_url !== undefined) return body.trailer_url;
  if (body.youtube_url !== undefined) return body.youtube_url;
  return undefined;
};

const syncMovieTrailer = async (movie, trailerUrl) => {
  if (trailerUrl === undefined) return;

  const youtubeUrl = typeof trailerUrl === "string" ? trailerUrl.trim() : "";

  if (!youtubeUrl) {
    await Trailer.deleteMany({ movie_id: movie._id });
    return;
  }

  await Trailer.findOneAndUpdate(
    { movie_id: movie._id },
    {
      movie_id: movie._id,
      title: `${movie.title} - Trailer`,
      youtube_url: youtubeUrl,
      status: true,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

const attachTrailerUrl = async (movies) => {
  const list = Array.isArray(movies) ? movies : [movies];
  const movieIds = list.map((movie) => movie._id);
  const trailers = await Trailer.find({
    movie_id: { $in: movieIds },
    status: true,
  }).sort({ created_at: -1 });

  const trailerMap = trailers.reduce((acc, trailer) => {
    const movieId = trailer.movie_id.toString();
    if (!acc[movieId]) acc[movieId] = trailer.youtube_url;
    return acc;
  }, {});

  const data = list.map((movie) => {
    const plain = movie.toObject ? movie.toObject() : movie;
    plain.trailer_url = plain.trailer_url || trailerMap[plain._id.toString()] || "";
    return plain;
  });

  return Array.isArray(movies) ? data : data[0];
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

    const data = await attachTrailerUrl(movie);

    res.status(200).json({
      success: true,
      data,
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
    await syncMovieTrailer(movie, getTrailerUrlFromPayload(req.body));
    const data = await attachTrailerUrl(movie);

    return res.status(201).json({
      success: true,
      message: "Thêm phim thành công",
      data,
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

    await syncMovieTrailer(movie, getTrailerUrlFromPayload(req.body));
    const data = await attachTrailerUrl(movie);

    res.status(200).json({
      success: true,
      message: "Cập nhật phim thành công",
      data,
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
