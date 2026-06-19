import Cinema from "../models/Cinema.js";

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
