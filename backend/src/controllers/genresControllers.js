import Genre from "../models/Genre.js";


export const getAllGenres = async (req, res) => {
  try {
    const genres = await Genre.find();

    res.status(200).json({
      success: true,
      data: genres,
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
    const genre = await Genre.create(req.body);

    res.status(201).json({
      success: true,
      message: "Thêm mới thành công",
      data: genre,
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

    const genre = await Genre.findByIdAndUpdate(
      id,
      req.body,
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
      message: "Chỉnh sửa thành công",
      data: genre,
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

    const genre = await Genre.findByIdAndDelete(id);

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