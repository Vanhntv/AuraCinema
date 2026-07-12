import Cinema from "../models/Cinema.js";
import mongoose from "mongoose";

export const getAllCinemas = async (req, res) => {
  try {
    const { q, city } = req.query;
    const filter = {
      deleted_at: null,
    };

    if (city) {
      filter.city = { $regex: city, $options: "i" };
    }

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { address: { $regex: q, $options: "i" } },
      ];
    }

    const cinemas = await Cinema.find(filter).sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      data: cinemas,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCinemaById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID cinema không hợp lệ",
      });
    }

    const cinema = await Cinema.findOne({
      _id: id,
      deleted_at: null,
    });

    if (!cinema) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cinema",
      });
    }

    res.status(200).json({
      success: true,
      data: cinema,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createCinema = async (req, res) => {
  try {
    const { name, address, city, phone, image } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "name là bắt buộc",
      });
    }

    const cinema = await Cinema.create({
      name,
      address: address ?? null,
      city: city ?? null,
      phone: phone ?? null,
      image: image ?? null,
    });

    res.status(201).json({
      success: true,
      message: "Thêm cinema thành công",
      data: cinema,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateCinema = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, city, phone, image } = req.body;

    const cinema = await Cinema.findOne({
      _id: id,
      deleted_at: null,
    });

    if (!cinema) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cinema",
      });
    }

    if (name !== undefined) {
      cinema.name = name;
    }

    if (address !== undefined) {
      cinema.address = address;
    }

    if (city !== undefined) {
      cinema.city = city;
    }

    if (phone !== undefined) {
      cinema.phone = phone;
    }

    if (image !== undefined) {
      cinema.image = image;
    }

    await cinema.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật cinema thành công",
      data: cinema,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteCinema = async (req, res) => {
  try {
    const { id } = req.params;

    const cinema = await Cinema.findOne({
      _id: id,
      deleted_at: null,
    });

    if (!cinema) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cinema",
      });
    }

    cinema.deleted_at = new Date();
    await cinema.save();

    res.status(200).json({
      success: true,
      message: "Xóa cinema thành công",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
