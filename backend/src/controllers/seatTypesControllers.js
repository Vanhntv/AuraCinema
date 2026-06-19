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
