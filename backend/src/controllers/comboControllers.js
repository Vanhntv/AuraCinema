import {
  createComboService,
  deleteComboService,
  getAllCombosService,
  getComboByIdService,
  restoreComboService,
  updateComboService,
} from "../services/comboService.js";

const sendError = (res, error) => {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: error.message,
  });
};

export const getAllCombos = async (req, res) => {
  try {
    const result = await getAllCombosService(req.query);

    return res.status(200).json({
      success: true,
      message: "Lay danh sach combo thanh cong",
      data: result,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const getComboById = async (req, res) => {
  try {
    const { id } = req.params;
    const combo = await getComboByIdService(id);

    return res.status(200).json({
      success: true,
      message: "Lay combo thanh cong",
      data: combo,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const createCombo = async (req, res) => {
  try {
    const combo = await createComboService(req.body);

    return res.status(201).json({
      success: true,
      message: "Them combo thanh cong",
      data: combo,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const updateCombo = async (req, res) => {
  try {
    const { id } = req.params;
    const combo = await updateComboService(id, req.body);

    return res.status(200).json({
      success: true,
      message: "Cap nhat combo thanh cong",
      data: combo,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteCombo = async (req, res) => {
  try {
    const { id } = req.params;
    const combo = await deleteComboService(id);

    return res.status(200).json({
      success: true,
      message: "Xoa combo thanh cong",
      data: combo,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const restoreCombo = async (req, res) => {
  try {
    const { id } = req.params;
    const combo = await restoreComboService(id);

    return res.status(200).json({
      success: true,
      message: "Khoi phuc combo thanh cong",
      data: combo,
    });
  } catch (error) {
    sendError(res, error);
  }
};
