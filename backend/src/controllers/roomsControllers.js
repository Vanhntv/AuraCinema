import Cinema from "../models/Cinema.js";
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
        message: "Khong tim thay room",
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

export const getRoomsByCinema = async (req, res) => {
  try {
    const { cinema_id } = req.params;
    const { q } = req.query;

    const filter = {
      deleted_at: null,
      cinema_id,
    };

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

export const ensureDefaultRooms = async (req, res) => {
  try {
    const { cinema_id } = req.params;
    const cinema = await Cinema.findOne({ _id: cinema_id, deleted_at: null });

    if (!cinema) {
      return res.status(404).json({ success: false, message: "Không tìm thấy rạp chiếu" });
    }

    const defaultNames = Array.from({ length: 8 }, (_, index) => `Phòng ${index + 1}`);
    const existingRooms = await Room.find({ cinema_id, deleted_at: null });
    const existingNames = new Set(existingRooms.map((room) => room.name.trim().toLowerCase()));
    const missingRooms = defaultNames
      .filter((name) => !existingNames.has(name.toLowerCase()))
      .map((name) => ({ cinema_id, name, capacity: 60 }));

    if (missingRooms.length) {
      await Room.insertMany(missingRooms);
    }

    const rooms = await Room.find({ cinema_id, deleted_at: null })
      .populate("cinema_id", "name city address")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      message: missingRooms.length ? `Đã tạo ${missingRooms.length} phòng mặc định` : "Phòng mặc định đã sẵn sàng",
      data: rooms,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createRoom = async (req, res) => {
  try {
    const { cinema_id, name, capacity } = req.body;

    if (!cinema_id) {
      return res.status(400).json({
        success: false,
        message: "cinema_id la bat buoc",
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "name la bat buoc",
      });
    }

    const cinema = await Cinema.findOne({
      _id: cinema_id,
      deleted_at: null,
    });

    if (!cinema) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay cinema",
      });
    }

    const room = await Room.create({
      cinema_id,
      name,
      capacity: capacity !== undefined && capacity !== null ? Number(capacity) : null,
    });

    await room.populate("cinema_id", "name city address");

    res.status(201).json({
      success: true,
      message: "Them room thanh cong",
      data: room,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { cinema_id, name, capacity } = req.body;

    const room = await Room.findOne({
      _id: id,
      deleted_at: null,
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay room",
      });
    }

    if (cinema_id !== undefined) {
      const cinema = await Cinema.findOne({
        _id: cinema_id,
        deleted_at: null,
      });

      if (!cinema) {
        return res.status(404).json({
          success: false,
          message: "Khong tim thay cinema",
        });
      }

      room.cinema_id = cinema_id;
    }

    if (name !== undefined) {
      room.name = name;
    }

    if (capacity !== undefined) {
      room.capacity = capacity !== null && capacity !== "" ? Number(capacity) : null;
    }

    await room.save();
    await room.populate("cinema_id", "name city address");

    res.status(200).json({
      success: true,
      message: "Cap nhat room thanh cong",
      data: room,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await Room.findOne({
      _id: id,
      deleted_at: null,
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay room",
      });
    }

    room.deleted_at = new Date();
    await room.save();

    res.status(200).json({
      success: true,
      message: "Xoa room thanh cong",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
