import Trailer from "../models/Trailer.js";

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
