import mongoose from "mongoose";
import Voucher from "../models/Voucher.js";
import {
  normalizeVoucherPayload,
  parseVoucherDiscountType,
  parseVoucherStatus,
  validateVoucherPayload,
  validateVoucherUpdatePayload,
} from "../modules/vouchers/voucher.validation.js";

const isMissing = (value) => value === undefined || value === null || value === "";

const normalizeVoucherCode = (value) => {
  if (isMissing(value)) {
    return value;
  }

  return String(value).trim().toUpperCase();
};

const buildVoucherFilter = (query = {}) => {
  const { q, search, status, discount_type } = query;
  const filter = {
    deleted_at: null,
  };

  if (!isMissing(status)) {
    const normalizedStatus = String(status).trim().toLowerCase();
    if (["true", "1", "active", "enabled"].includes(normalizedStatus)) {
      filter.status = true;
    } else if (["false", "0", "inactive", "disabled"].includes(normalizedStatus)) {
      filter.status = false;
    }
  }

  if (!isMissing(discount_type)) {
    const normalizedDiscountType = parseVoucherDiscountType(discount_type, null);
    if (normalizedDiscountType) {
      filter.discount_type = normalizedDiscountType;
    }
  }

  const keyword = (q ?? search ?? "").trim();

  if (!isMissing(keyword)) {
    filter.$or = [
      { code: { $regex: keyword, $options: "i" } },
      { discount_type: { $regex: keyword, $options: "i" } },
    ];
  }

  return {
    filter,
  };
};

const ensureVoucherCodeIsUnique = async (code, excludeId = null) => {
  const filter = {
    code: normalizeVoucherCode(code),
    deleted_at: null,
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const existingVoucher = await Voucher.findOne(filter);
  if (existingVoucher) {
    const error = new Error("Voucher da ton tai");
    error.statusCode = 409;
    throw error;
  }
};

const buildPagination = ({ page, limit }) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (currentPage - 1) * pageSize;

  return { currentPage, pageSize, skip };
};

const prepareCreatePayload = (payload) => {
  const normalizedPayload = normalizeVoucherPayload(payload, {
    min_order: 0,
    status: true,
  });

  return {
    ...normalizedPayload,
    code: normalizeVoucherCode(normalizedPayload.code),
    discount_type: parseVoucherDiscountType(normalizedPayload.discount_type, "percent"),
    discount_value: Number(normalizedPayload.discount_value),
    min_order: Number(normalizedPayload.min_order ?? 0),
    quantity: Number(normalizedPayload.quantity),
    start_date: new Date(normalizedPayload.start_date),
    end_date: new Date(normalizedPayload.end_date),
    status: parseVoucherStatus(normalizedPayload.status, true),
  };
};

const prepareUpdatePayload = (payload) => {
  const updatePayload = {};

  if (Object.prototype.hasOwnProperty.call(payload, "code")) {
    updatePayload.code = normalizeVoucherCode(payload.code);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "discount_type")) {
    updatePayload.discount_type = parseVoucherDiscountType(
      payload.discount_type,
      "percent"
    );
  }

  if (Object.prototype.hasOwnProperty.call(payload, "discount_value")) {
    updatePayload.discount_value = Number(payload.discount_value);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "min_order")) {
    updatePayload.min_order = Number(payload.min_order);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "quantity")) {
    updatePayload.quantity = Number(payload.quantity);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "start_date")) {
    updatePayload.start_date = new Date(payload.start_date);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "end_date")) {
    updatePayload.end_date = new Date(payload.end_date);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "status")) {
    updatePayload.status = parseVoucherStatus(payload.status, true);
  }

  return updatePayload;
};

export const listVouchers = async (query = {}) => {
  const { filter } = buildVoucherFilter(query);
  const shouldPaginate = query.page !== undefined || query.limit !== undefined;

  if (!shouldPaginate) {
    return Voucher.find(filter).sort({ created_at: -1 });
  }

  const { currentPage, pageSize, skip } = buildPagination(query);
  const [vouchers, totalItems] = await Promise.all([
    Voucher.find(filter).sort({ created_at: -1 }).skip(skip).limit(pageSize),
    Voucher.countDocuments(filter),
  ]);

  return {
    data: vouchers,
    pagination: {
      page: currentPage,
      limit: pageSize,
      totalItems,
      totalPages: Math.max(Math.ceil(totalItems / pageSize), 1),
      hasNextPage: currentPage * pageSize < totalItems,
      hasPrevPage: currentPage > 1,
    },
  };
};

export const getVoucherByIdService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Voucher khong hop le");
    error.statusCode = 400;
    throw error;
  }

  return Voucher.findOne({ _id: id, deleted_at: null });
};

export const createVoucherService = async (payload) => {
  const normalizedPayload = prepareCreatePayload(payload);
  const validationError = validateVoucherPayload(normalizedPayload);

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  await ensureVoucherCodeIsUnique(normalizedPayload.code);

  const createdVoucher = await Voucher.create(normalizedPayload);
  return Voucher.findOne({ _id: createdVoucher._id, deleted_at: null });
};

export const updateVoucherService = async (id, payload) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Voucher khong hop le");
    error.statusCode = 400;
    throw error;
  }

  const existingVoucher = await Voucher.findOne({ _id: id, deleted_at: null });
  if (!existingVoucher) {
    const error = new Error("Khong tim thay voucher");
    error.statusCode = 404;
    throw error;
  }

  const normalizedPayload = prepareUpdatePayload(payload);
  const validationError = validateVoucherUpdatePayload(normalizedPayload);
  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  if (normalizedPayload.code) {
    await ensureVoucherCodeIsUnique(normalizedPayload.code, id);
  }

  const nextVoucherState = {
    ...existingVoucher.toObject(),
    ...normalizedPayload,
  };

  if (
    nextVoucherState.start_date &&
    nextVoucherState.end_date &&
    nextVoucherState.end_date < nextVoucherState.start_date
  ) {
    const error = new Error("end_date phai lon hon hoac bang start_date");
    error.statusCode = 400;
    throw error;
  }

  const effectiveDiscountType = nextVoucherState.discount_type;
  const effectiveDiscountValue = Number(nextVoucherState.discount_value);
  if (effectiveDiscountType === "percent" && effectiveDiscountValue > 100) {
    const error = new Error(
      "discount_value khong duoc lon hon 100 khi discount_type la percent"
    );
    error.statusCode = 400;
    throw error;
  }

  const updatedVoucher = await Voucher.findOneAndUpdate(
    { _id: id, deleted_at: null },
    normalizedPayload,
    { new: true, runValidators: true }
  );

  return updatedVoucher;
};

export const deleteVoucherService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Voucher khong hop le");
    error.statusCode = 400;
    throw error;
  }

  const deletedVoucher = await Voucher.findOneAndUpdate(
    { _id: id, deleted_at: null },
    { deleted_at: new Date() },
    { new: true }
  );

  if (!deletedVoucher) {
    const error = new Error("Khong tim thay voucher");
    error.statusCode = 404;
    throw error;
  }

  return deletedVoucher;
};

export const toggleVoucherStatusService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Voucher khong hop le");
    error.statusCode = 400;
    throw error;
  }

  const voucher = await Voucher.findOne({ _id: id, deleted_at: null });
  if (!voucher) {
    const error = new Error("Khong tim thay voucher");
    error.statusCode = 404;
    throw error;
  }

  voucher.status = !voucher.status;
  await voucher.save();

  return voucher;
};
