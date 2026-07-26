import AuditLog from "../models/AuditLog.js";
import {
  createVoucherService,
  consumeVoucherQuantityService,
  deleteVoucherService,
  getVoucherByIdService,
  getVoucherStatsService,
  listVoucherUsageHistoryService,
  listVouchers,
  toggleVoucherStatusService,
  verifyVoucherService,
  updateVoucherService,
} from "../services/voucherService.js";

const toAuditSnapshot = (voucher) => {
  if (!voucher) return null;
  const data = typeof voucher.toObject === "function" ? voucher.toObject() : { ...voucher };

  return {
    _id: data._id,
    code: data.code,
    name: data.name,
    description: data.description,
    image_url: data.image_url,
    discount_type: data.discount_type,
    discount_value: data.discount_value,
    max_discount_amount: data.max_discount_amount,
    min_order: data.min_order,
    quantity: data.quantity,
    usage_limit: data.usage_limit,
    usage_count: data.usage_count,
    usage_limit_per_user: data.usage_limit_per_user,
    apply_scope: data.apply_scope,
    applicable_movie_ids: data.applicable_movie_ids,
    applicable_member_tiers: data.applicable_member_tiers,
    start_date: data.start_date,
    end_date: data.end_date,
    status: data.status,
    deleted_at: data.deleted_at,
  };
};

const writeVoucherAuditLog = async ({ req, action, before = null, after = null, voucherId = null, reason = null }) => {
  const adminId = req.user?._id || req.user?.id;
  if (!adminId) return;

  await AuditLog.create({
    admin_id: adminId,
    target_type: "Voucher",
    target_id: voucherId || after?._id || before?._id || null,
    action,
    before,
    after,
    reason: String(reason || "").trim() || null,
  });
};

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

export const getVoucherStats = async (req, res) => {
  try {
    const stats = await getVoucherStatsService();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const getVoucherUsageHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await listVoucherUsageHistoryService(id, req.query);

    res.status(200).json({
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
    const voucher = await createVoucherService(req.body, req.user);
    const afterSnapshot = toAuditSnapshot(voucher);

    await writeVoucherAuditLog({
      req,
      action: "voucher.create",
      before: null,
      after: afterSnapshot,
      voucherId: voucher?._id,
      reason: req.body?.reason,
    });

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
    const before = await getVoucherByIdService(id);
    const voucher = await updateVoucherService(id, req.body, req.user);
    const after = toAuditSnapshot(voucher);

    await writeVoucherAuditLog({
      req,
      action: "voucher.update",
      before: toAuditSnapshot(before),
      after,
      voucherId: id,
      reason: req.body?.reason,
    });

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
    const before = await getVoucherByIdService(id);
    const result = await deleteVoucherService(id);
    const after = result.deletion_type === "soft"
      ? toAuditSnapshot(result.voucher)
      : null;

    await writeVoucherAuditLog({
      req,
      action: result.deletion_type === "soft" ? "voucher.cancel" : "voucher.delete",
      before: toAuditSnapshot(before),
      after,
      voucherId: id,
      reason: req.body?.reason,
    });

    res.status(200).json({
      success: true,
      message: result.message || "Xoa voucher thanh cong",
      data: result,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const toggleVoucherStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const before = await getVoucherByIdService(id);
    const voucher = await toggleVoucherStatusService(id);
    const after = toAuditSnapshot(voucher);

    await writeVoucherAuditLog({
      req,
      action: voucher.status ? "voucher.activate" : "voucher.pause",
      before: toAuditSnapshot(before),
      after,
      voucherId: id,
      reason: req.body?.reason,
    });

    res.status(200).json({
      success: true,
      message: "Cap nhat trang thai voucher thanh cong",
      data: voucher,
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const consumeVoucherQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await consumeVoucherQuantityService({
      voucherId: id,
      voucherCode: req.body?.voucher_code ?? req.body?.code,
      quantity: req.body?.quantity ?? 1,
    });

    res.status(200).json({
      success: true,
      message: "Cap nhat voucher quantity thanh cong",
      data: result,
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
      user_id: req.user?.id,
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
