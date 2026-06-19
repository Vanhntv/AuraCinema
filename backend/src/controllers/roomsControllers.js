import Room from "../models/Room.js";

export const getAllRooms = async (req, res) => {
  try {
    const { q, cinema_id } = req.query;
    const filter = {
      deleted_at: null,
    };

    if (cinema_id) {
      filter.cinema_id = cinema_id;
    }

    if (q) {
      filter.name = { $regex: q, $options: "i" };
    }

    const rooms = await Room.find(filter)
      .populate("cinema_id", "name city address")
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      data: rooms,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await Room.findOne({
      _id: id,
      deleted_at: null,
    }).populate("cinema_id", "name city address");

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy room",
      });
    }

    res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
