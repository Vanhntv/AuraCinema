import {
  createComboService,
  deleteComboService,
  getAllCombosService,
  getComboByIdService,
  restoreComboService,
  updateComboService,
} from "../services/comboService.js";

export const getAllCombos = async (req, res) => {
  const result = await getAllCombosService(req.query);

  return res.status(200).json({
    success: true,
    message: "Lay danh sach combo thanh cong",
    data: result,
  });
};

export const getComboById = async (req, res) => {
  const { id } = req.params;
  const combo = await getComboByIdService(id);

  return res.status(200).json({
    success: true,
    message: "Lay combo thanh cong",
    data: combo,
  });
};

export const createCombo = async (req, res) => {
  const combo = await createComboService(req.body);

  return res.status(201).json({
    success: true,
    message: "Them combo thanh cong",
    data: combo,
  });
};

export const updateCombo = async (req, res) => {
  const { id } = req.params;
  const combo = await updateComboService(id, req.body);

  return res.status(200).json({
    success: true,
    message: "Cap nhat combo thanh cong",
    data: combo,
  });
};

export const deleteCombo = async (req, res) => {
  const { id } = req.params;
  const combo = await deleteComboService(id);

  return res.status(200).json({
    success: true,
    message: "Xoa combo thanh cong",
    data: combo,
  });
};

export const restoreCombo = async (req, res) => {
  const { id } = req.params;
  const combo = await restoreComboService(id);

  return res.status(200).json({
    success: true,
    message: "Khoi phuc combo thanh cong",
    data: combo,
  });
};
