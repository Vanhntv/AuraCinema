import {
  createGiftService,
  deleteGiftService,
  getGiftByIdService,
  listGifts,
  toggleGiftStatusService,
  updateGiftService,
} from "../services/giftService.js";

const sendError = (res, error) => {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: error.message,
  });
};

export const getAllGifts = async (req, res) => {
  try {
    const result = await listGifts(req.query);

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getGiftById = async (req, res) => {
  try {
    const gift = await getGiftByIdService(req.params.id);

    if (!gift) {
      return res.status(404).json({
        success: false,
        message: "Quà tặng không tồn tại.",
      });
    }

    return res.status(200).json({
      success: true,
      data: gift,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createGift = async (req, res) => {
  try {
    const gift = await createGiftService(req.body, req.user);

    return res.status(201).json({
      success: true,
      message: "Tạo quà tặng thành công.",
      data: gift,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const updateGift = async (req, res) => {
  try {
    const gift = await updateGiftService(req.params.id, req.body, req.user);

    return res.status(200).json({
      success: true,
      message: "Cập nhật quà tặng thành công.",
      data: gift,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const toggleGiftStatus = async (req, res) => {
  try {
    const gift = await toggleGiftStatusService(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      message: gift.status === "active"
        ? "Kích hoạt quà tặng thành công."
        : "Tạm dừng quà tặng thành công.",
      data: gift,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const deleteGift = async (req, res) => {
  try {
    const result = await deleteGiftService(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        deletion_type: result.deletion_type,
        gift: result.gift,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};
