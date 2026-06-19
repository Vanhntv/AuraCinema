import mongoose from "mongoose";
import Genre from "../models/Genre.js";
import Movie from "../models/Movie.js";

const buildGenreFilter = ({ q, status } = {}) => {
  const filter = { deleted_at: null };

  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  }

  if (status === "active") filter.status = true;
  if (status === "inactive") filter.status = false;

  return filter;
};

const attachMovieCounts = async (genres) => {
  const genreIds = genres.map((genre) => genre._id);
  if (genreIds.length === 0) return genres;

  const counts = await Movie.aggregate([
    {
      $match: {
        deleted_at: null,
        genres: { $in: genreIds },
      },
    },
    { $unwind: "$genres" },
    { $match: { genres: { $in: genreIds } } },
    { $group: { _id: "$genres", count: { $sum: 1 } } },
  ]);

  const countMap = counts.reduce((acc, item) => {
    acc[item._id.toString()] = item.count;
    return acc;
  }, {});

  return genres.map((genre) => {
    const data = genre.toObject();
    data.movieCount = countMap[genre._id.toString()] || 0;
    return data;
  });
};

export const getAllGenres = async (req, res) => {
  try {
    const { q = "", status, page, limit } = req.query;
    const filter = buildGenreFilter({ q: q.trim(), status });
    const shouldPaginate = page !== undefined || limit !== undefined;

    if (!shouldPaginate) {
      const genres = await Genre.find(filter).sort({ createdAt: -1 });
      const data = await attachMovieCounts(genres);

      return res.status(200).json({
        success: true,
        data,
      });
    }

    const currentPage = Math.max(Number(page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (currentPage - 1) * pageSize;

    const [genres, totalItems] = await Promise.all([
      Genre.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
      Genre.countDocuments(filter),
    ]);
    const data = await attachMovieCounts(genres);

    res.status(200).json({
      success: true,
      data,
      pagination: {
        page: currentPage,
        limit: pageSize,
        totalItems,
        totalPages: Math.max(Math.ceil(totalItems / pageSize), 1),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createGenres = async (req, res) => {
  try {
    const genre = await Genre.create({
      name: req.body.name,
      description: req.body.description,
      status: req.body.status ?? true,
    });

    res.status(201).json({
      success: true,
      message: "Thêm mới thành công",
      data: { ...genre.toObject(), movieCount: 0 },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateGenres = async (req, res) => {
  try {
    const { id } = req.params;

    const genre = await Genre.findOneAndUpdate(
      { _id: id, deleted_at: null },
      req.body,
      { new: true, runValidators: true }
    );

    if (!genre) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thể loại",
      });
    }

    const [data] = await attachMovieCounts([genre]);

    res.status(200).json({
      success: true,
      message: "Chỉnh sửa thành công",
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteGenres = async (req, res) => {
  try {
    const { id } = req.params;

    const genre = await Genre.findOneAndUpdate(
      { _id: id, deleted_at: null },
      { deleted_at: new Date() },
      { new: true }
    );

    if (!genre) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thể loại",
      });
    }

    res.status(200).json({
      success: true,
      message: "Xóa thành công",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteManyGenres = async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Danh sách thể loại không hợp lệ",
      });
    }

    const result = await Genre.updateMany(
      { _id: { $in: validIds }, deleted_at: null },
      { deleted_at: new Date() }
    );

    res.status(200).json({
      success: true,
      message: "Xóa nhiều thể loại thành công",
      deletedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const toggleGenreStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const current = await Genre.findOne({ _id: id, deleted_at: null });

    if (!current) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thể loại",
      });
    }

    current.status = !current.status;
    await current.save();
    const [data] = await attachMovieCounts([current]);

    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái thành công",
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
