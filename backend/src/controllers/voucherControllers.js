import {
  createVoucherService,
  deleteVoucherService,
  getVoucherByIdService,
  listVouchers,
  toggleVoucherStatusService,
  verifyVoucherService,
  updateVoucherService,
} from "../services/voucherService.js";

const sendError = (res, error) => {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: error.message,
  });
};

export const getAllVouchers = async (req, res) => {
  try {
    const result = await listVouchers(req.query);

    if (Array.isArray(result)) {
      return res.status(200).json({
        success: true,
        data: result,
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const getVoucherById = async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await getVoucherByIdService(id);

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay voucher",
      });
    }

    res.status(200).json({
      success: true,
      data: voucher,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const createVoucher = async (req, res) => {
  try {
    const voucher = await createVoucherService(req.body);

    res.status(201).json({
      success: true,
      message: "Them voucher thanh cong",
      data: voucher,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const updateVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await updateVoucherService(id, req.body);

    res.status(200).json({
      success: true,
      message: "Cap nhat voucher thanh cong",
      data: voucher,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteVoucherService(id);

    res.status(200).json({
      success: true,
      message: "Xoa voucher thanh cong",
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const toggleVoucherStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await toggleVoucherStatusService(id);

    res.status(200).json({
      success: true,
      message: "Cap nhat trang thai voucher thanh cong",
      data: voucher,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const verifyVoucher = async (req, res) => {
  try {
    const payload = {
      ...req.query,
      ...req.body,
    };

    const result = await verifyVoucherService(payload);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    sendError(res, error);
  }
};
