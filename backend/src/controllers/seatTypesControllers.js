import SeatType from "../models/SeatType.js";

export const getAllSeatTypes = async (req, res) => {
  try {
    const seatTypes = await SeatType.find().sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      data: seatTypes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createSeatType = async (req, res) => {
  try {
    const { name, description, price_multiplier } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "name la bat buoc",
      });
    }

    const seatType = await SeatType.create({
      name,
      description: description ?? "",
      price_multiplier:
        price_multiplier !== undefined && price_multiplier !== null && price_multiplier !== ""
          ? Number(price_multiplier)
          : 1,
    });

    res.status(201).json({
      success: true,
      message: "Them seat type thanh cong",
      data: seatType,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSeatTypeById = async (req, res) => {
  try {
    const { id } = req.params;

    const seatType = await SeatType.findById(id);

    if (!seatType) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay seat type",
      });
    }

    res.status(200).json({
      success: true,
      data: seatType,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
