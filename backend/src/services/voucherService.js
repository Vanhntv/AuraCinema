import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Voucher from "../models/Voucher.js";
import User from "../models/User.js";
import {
  normalizeVoucherPayload,
  parseVoucherApplyScope,
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

const USED_VOUCHER_EDITABLE_FIELDS = new Set([
  "name",
  "description",
  "end_date",
  "usage_limit",
  "status",
]);

const parseVoucherAmount = (value) => {
  if (isMissing(value)) {
    return null;
  }

  const amount = Number(value);
  if (Number.isNaN(amount) || amount < 0) {
    const error = new Error("order_amount khong hop le");
    error.statusCode = 400;
    throw error;
  }

  return amount;
};

const calculateVoucherDiscount = ({ voucher, orderAmount }) => {
  if (orderAmount === null) {
    return {
      eligible_amount: null,
      raw_discount_amount: null,
      discount_amount: null,
      final_amount: null,
    };
  }

  const eligibleAmount = Math.max(Number(orderAmount || 0), 0);
  const discountType = voucher.discount_type;
  const discountValue = Math.max(Number(voucher.discount_value ?? 0), 0);
  const maxDiscountAmount = Math.max(Number(voucher.max_discount_amount ?? 0), 0);

  let rawDiscountAmount = 0;
  let discountAmount = 0;

  if (discountType === "percent") {
    rawDiscountAmount = (eligibleAmount * discountValue) / 100;
    discountAmount = maxDiscountAmount > 0
      ? Math.min(rawDiscountAmount, maxDiscountAmount)
      : rawDiscountAmount;
  } else {
    rawDiscountAmount = discountValue;
    discountAmount = discountValue;
  }

  discountAmount = Math.min(Math.max(discountAmount, 0), eligibleAmount);

  return {
    eligible_amount: eligibleAmount,
    raw_discount_amount: rawDiscountAmount,
    discount_amount: discountAmount,
    final_amount: Math.max(eligibleAmount - discountAmount, 0),
  };
};

const normalizeVoucherContext = (payload = {}) => ({
  orderAmount: parseVoucherAmount(
    payload.order_amount ?? payload.amount ?? payload.subtotal ?? payload.total_amount
  ),
  ticketAmount: parseVoucherAmount(payload.ticket_amount ?? payload.seat_total ?? payload.ticket_total),
  concessionAmount: parseVoucherAmount(payload.concession_amount ?? payload.combo_total ?? payload.concession_total),
  movieId: String(payload.movie_id ?? "").trim(),
  userId: payload.user_id ? String(payload.user_id).trim() : "",
});

const getEligibleAmount = (voucher, context) => {
  if (voucher.apply_scope === "ticket" || voucher.apply_scope === "movie") {
    return context.ticketAmount ?? 0;
  }

  if (voucher.apply_scope === "concession") {
    return context.concessionAmount ?? 0;
  }

  return context.orderAmount;
};

const checkVoucherScope = (voucher, context, user) => {
  if (voucher.apply_scope === "ticket" && Number(context.ticketAmount || 0) <= 0) {
    return "Ma chi ap dung cho ve xem phim";
  }

  if (voucher.apply_scope === "concession" && Number(context.concessionAmount || 0) <= 0) {
    return "Ma chi ap dung cho bap nuoc";
  }

  if (voucher.apply_scope === "movie") {
    if (Number(context.ticketAmount || 0) <= 0) return "Ma chi ap dung cho ve xem phim";
    const movieIds = (voucher.applicable_movie_ids || []).map((id) => String(id));
    if (movieIds.length > 0 && !movieIds.includes(String(context.movieId))) {
      return "Ma khong ap dung cho phim nay";
    }
  }

  if (voucher.apply_scope === "member") {
    const tiers = (voucher.applicable_member_tiers || []).map((tier) => String(tier).toLowerCase());
    const memberTier = String(user?.member_tier || "").toLowerCase();
    if (tiers.length > 0 && !tiers.includes(memberTier)) {
      return "Hang thanh vien khong du dieu kien ap dung ma";
    }
  }

  return null;
};

const countVoucherUsageByUser = async ({ voucherId, userId, session = null }) => {
  if (!voucherId || !userId) return 0;

  return Booking.countDocuments({
    user_id: userId,
    "voucher.voucher_id": voucherId,
    status: { $ne: "cancelled" },
  }).session(session);
};

const deriveVoucherStatus = (data) => {
  const now = new Date();
  const usageLimit = data.usage_limit ?? (Number(data.quantity || 0) + Number(data.usage_count || 0));
  const usageCount = data.usage_count ?? Math.max(Number(usageLimit || 0) - Number(data.quantity || 0), 0);

  if (data.deleted_at) {
    return { value: "cancelled", label: "Da huy" };
  }

  if (!data.status) {
    return { value: "paused", label: "Tam dung" };
  }

  if (data.start_date && now < data.start_date) {
    return { value: "upcoming", label: "Sap dien ra" };
  }

  if (Number(usageLimit || 0) > 0 && Number(usageCount || 0) >= Number(usageLimit || 0)) {
    return { value: "out_of_usage", label: "Da het luot" };
  }

  if (data.end_date && now > data.end_date) {
    return { value: "expired", label: "Het han" };
  }

  return { value: "active", label: "Dang hoat dong" };
};

const toVoucherListItem = (voucher) => {
  const data = typeof voucher.toObject === "function" ? voucher.toObject() : { ...voucher };
  const usageLimit = data.usage_limit ?? (Number(data.quantity || 0) + Number(data.usage_count || 0));
  const usageCount = data.usage_count ?? Math.max(Number(usageLimit || 0) - Number(data.quantity || 0), 0);
  const computedStatus = deriveVoucherStatus(data);

  return {
    ...data,
    name: data.name || data.code,
    apply_scope: data.apply_scope || "order",
    usage_limit: usageLimit,
    usage_count: usageCount,
    computed_status: computedStatus.value,
    computed_status_label: computedStatus.label,
  };
};

export const normalizeVoucherForResponse = toVoucherListItem;

const buildVoucherFilter = (query = {}) => {
  const { q, search, status, discount_type, apply_scope } = query;
  const normalizedStatus = isMissing(status) ? "" : String(status).trim().toLowerCase();
  const filter = {
    deleted_at: normalizedStatus === "cancelled" ? { $ne: null } : null,
  };

  if (!isMissing(status)) {
    if (["active"].includes(normalizedStatus)) {
      filter.status = true;
      filter.start_date = { $lte: new Date() };
      filter.end_date = { $gte: new Date() };
      filter.quantity = { $gt: 0 };
    } else if (["true", "1", "enabled"].includes(normalizedStatus)) {
      filter.status = true;
    } else if (["false", "0", "inactive", "disabled", "paused"].includes(normalizedStatus)) {
      filter.status = false;
    } else if (normalizedStatus === "upcoming") {
      filter.status = true;
      filter.start_date = { $gt: new Date() };
    } else if (normalizedStatus === "expired") {
      filter.status = true;
      filter.end_date = { $lt: new Date() };
      filter.quantity = { $gt: 0 };
    } else if (normalizedStatus === "out_of_usage") {
      filter.status = true;
      filter.quantity = { $lte: 0 };
    }
  }

  if (!isMissing(discount_type)) {
    const normalizedDiscountType = parseVoucherDiscountType(discount_type, null);
    if (normalizedDiscountType) {
      filter.discount_type = normalizedDiscountType;
    }
  }

  if (!isMissing(apply_scope)) {
    const normalizedApplyScope = parseVoucherApplyScope(apply_scope, null);
    if (normalizedApplyScope) {
      filter.apply_scope = normalizedApplyScope;
    }
  }

  const keyword = (q ?? search ?? "").trim();

  if (!isMissing(keyword)) {
    filter.$or = [
      { code: { $regex: keyword, $options: "i" } },
      { name: { $regex: keyword, $options: "i" } },
    ];
  }

  return {
    filter,
  };
};

const buildVoucherSort = (query = {}) => {
  const sortBy = String(query.sort_by ?? query.sort ?? "created_at").trim().toLowerCase();
  const direction = String(query.sort_order ?? query.order ?? "desc").trim().toLowerCase() === "asc" ? 1 : -1;

  if (["end_date", "usage_count", "created_at"].includes(sortBy)) {
    return { [sortBy]: direction };
  }

  return { created_at: -1 };
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

const normalizeArrayValue = (value) => {
  if (Array.isArray(value)) return value.filter((item) => !isMissing(item));
  if (isMissing(value)) return [];
  return [value];
};

const prepareCreatePayload = (payload) => {
  const normalizedPayload = normalizeVoucherPayload(payload, {
    name: "",
    description: "",
    image_url: "",
    min_order: 0,
    max_discount_amount: null,
    usage_count: 0,
    usage_limit_per_user: 1,
    apply_scope: "order",
    applicable_movie_ids: [],
    applicable_member_tiers: [],
    terms_and_conditions: "",
    status: true,
  });
  const quantity = Number(normalizedPayload.quantity);

  return {
    ...normalizedPayload,
    code: normalizeVoucherCode(normalizedPayload.code),
    name: isMissing(normalizedPayload.name) ? "" : String(normalizedPayload.name).trim(),
    description: isMissing(normalizedPayload.description) ? "" : String(normalizedPayload.description).trim(),
    image_url: isMissing(normalizedPayload.image_url) ? "" : String(normalizedPayload.image_url).trim(),
    discount_type: parseVoucherDiscountType(normalizedPayload.discount_type, "percent"),
    discount_value: Number(normalizedPayload.discount_value),
    max_discount_amount: isMissing(normalizedPayload.max_discount_amount)
      ? null
      : Number(normalizedPayload.max_discount_amount),
    min_order: Number(normalizedPayload.min_order ?? 0),
    quantity,
    usage_limit: Number(normalizedPayload.usage_limit ?? quantity),
    usage_count: Number(normalizedPayload.usage_count ?? 0),
    usage_limit_per_user: Number(normalizedPayload.usage_limit_per_user ?? 1),
    apply_scope: parseVoucherApplyScope(normalizedPayload.apply_scope, "order"),
    applicable_movie_ids: normalizeArrayValue(normalizedPayload.applicable_movie_ids),
    applicable_member_tiers: normalizeArrayValue(normalizedPayload.applicable_member_tiers).map((item) => String(item).trim()).filter(Boolean),
    terms_and_conditions: isMissing(normalizedPayload.terms_and_conditions)
      ? ""
      : String(normalizedPayload.terms_and_conditions).trim(),
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

  if (Object.prototype.hasOwnProperty.call(payload, "name")) {
    updatePayload.name = isMissing(payload.name) ? "" : String(payload.name).trim();
  }

  if (Object.prototype.hasOwnProperty.call(payload, "description")) {
    updatePayload.description = isMissing(payload.description) ? "" : String(payload.description).trim();
  }

  if (Object.prototype.hasOwnProperty.call(payload, "image_url")) {
    updatePayload.image_url = isMissing(payload.image_url) ? "" : String(payload.image_url).trim();
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

  if (Object.prototype.hasOwnProperty.call(payload, "max_discount_amount")) {
    updatePayload.max_discount_amount = isMissing(payload.max_discount_amount)
      ? null
      : Number(payload.max_discount_amount);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "usage_limit")) {
    updatePayload.usage_limit = Number(payload.usage_limit);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "usage_count")) {
    updatePayload.usage_count = Number(payload.usage_count);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "usage_limit_per_user")) {
    updatePayload.usage_limit_per_user = Number(payload.usage_limit_per_user);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "apply_scope")) {
    updatePayload.apply_scope = parseVoucherApplyScope(payload.apply_scope, "order");
  }

  if (Object.prototype.hasOwnProperty.call(payload, "applicable_movie_ids")) {
    updatePayload.applicable_movie_ids = normalizeArrayValue(payload.applicable_movie_ids);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "applicable_member_tiers")) {
    updatePayload.applicable_member_tiers = normalizeArrayValue(payload.applicable_member_tiers).map((item) => String(item).trim()).filter(Boolean);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "terms_and_conditions")) {
    updatePayload.terms_and_conditions = isMissing(payload.terms_and_conditions)
      ? ""
      : String(payload.terms_and_conditions).trim();
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

const buildVoucherVerificationResponse = (voucher, context = {}) => {
  const eligibleAmount = getEligibleAmount(voucher, context);
  const discountResult = calculateVoucherDiscount({
    voucher,
    orderAmount: eligibleAmount,
  });
  const orderAmount = context.orderAmount ?? null;
  const discountAmount = Number(discountResult.discount_amount || 0);

  return {
    valid: true,
    message: "Voucher hop le",
    voucher: {
      id: voucher._id,
      code: voucher.code,
      discount_type: voucher.discount_type,
      discount_value: voucher.discount_value,
      max_discount_amount: voucher.max_discount_amount,
      min_order: voucher.min_order,
      quantity: voucher.quantity,
      apply_scope: voucher.apply_scope,
      start_date: voucher.start_date,
      end_date: voucher.end_date,
      status: voucher.status,
    },
    order_amount: orderAmount,
    eligible_amount: discountResult.eligible_amount,
    raw_discount_amount: discountResult.raw_discount_amount,
    discount_amount: discountAmount,
    final_amount: orderAmount === null
      ? discountResult.final_amount
      : Math.max(orderAmount - discountAmount, 0),
  };
};

export const listVouchers = async (query = {}) => {
  const { filter } = buildVoucherFilter(query);
  const sort = buildVoucherSort(query);
  const shouldPaginate = query.page !== undefined || query.limit !== undefined;

  if (!shouldPaginate) {
    const vouchers = await Voucher.find(filter).sort(sort);
    return vouchers.map(toVoucherListItem);
  }

  const { currentPage, pageSize, skip } = buildPagination(query);
  const [vouchers, totalItems] = await Promise.all([
    Voucher.find(filter).sort(sort).skip(skip).limit(pageSize),
    Voucher.countDocuments(filter),
  ]);

  return {
    data: vouchers.map(toVoucherListItem),
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

  const voucher = await Voucher.findOne({ _id: id, deleted_at: null });
  return voucher ? normalizeVoucherForResponse(voucher) : null;
};

export const createVoucherService = async (payload, user = null) => {
  const normalizedPayload = prepareCreatePayload(payload);
  const validationError = validateVoucherPayload(normalizedPayload);

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  await ensureVoucherCodeIsUnique(normalizedPayload.code);

  if (user?.id) {
    normalizedPayload.created_by = user.id;
    normalizedPayload.updated_by = user.id;
  }

  const createdVoucher = await Voucher.create(normalizedPayload);
  return Voucher.findOne({ _id: createdVoucher._id, deleted_at: null });
};

export const updateVoucherService = async (id, payload, user = null) => {
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

  const existingUsageCount = Number(existingVoucher.usage_count || 0);
  if (existingUsageCount > 0) {
    const blockedFields = Object.keys(payload).filter(
      (field) => !USED_VOUCHER_EDITABLE_FIELDS.has(field)
    );

    if (blockedFields.length > 0) {
      const error = new Error(
        `Voucher da duoc su dung, khong the cap nhat cac truong: ${blockedFields.join(", ")}`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const normalizedPayload = prepareUpdatePayload(payload);
  if (user?.id) {
    normalizedPayload.updated_by = user.id;
  }
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

  if (Object.prototype.hasOwnProperty.call(normalizedPayload, "usage_limit")) {
    const nextUsageLimit = Number(normalizedPayload.usage_limit);
    const nextUsageCount = Number(nextVoucherState.usage_count || 0);

    if (nextUsageLimit < nextUsageCount) {
      const error = new Error("usage_limit khong duoc nho hon so luot da su dung");
      error.statusCode = 400;
      throw error;
    }

    normalizedPayload.quantity = Math.max(nextUsageLimit - nextUsageCount, 0);
    nextVoucherState.quantity = normalizedPayload.quantity;
  }

  if (
    nextVoucherState.start_date &&
    nextVoucherState.end_date &&
    nextVoucherState.end_date <= nextVoucherState.start_date
  ) {
    const error = new Error("end_date phai sau start_date");
    error.statusCode = 400;
    throw error;
  }

  const effectiveUsageLimit = Number(
    nextVoucherState.usage_limit ?? nextVoucherState.quantity
  );
  const effectiveUsagePerUser = Number(nextVoucherState.usage_limit_per_user);
  if (
    Number.isFinite(effectiveUsageLimit) &&
    Number.isFinite(effectiveUsagePerUser) &&
    effectiveUsagePerUser > effectiveUsageLimit
  ) {
    const error = new Error("usage_limit_per_user khong duoc lon hon usage_limit");
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

  const voucher = await Voucher.findOne({ _id: id, deleted_at: null });
  if (!voucher) {
    const error = new Error("Khong tim thay voucher");
    error.statusCode = 404;
    throw error;
  }

  if (Number(voucher.usage_count || 0) > 0) {
    voucher.deleted_at = new Date();
    voucher.status = false;
    await voucher.save();

    return {
      voucher,
      deletion_type: "soft",
      message: "Voucher da phat sinh giao dich nen da duoc chuyen sang Da huy",
    };
  }

  await Voucher.deleteOne({ _id: id });

  return {
    voucher,
    deletion_type: "hard",
    message: "Voucher chua phat sinh giao dich nen da duoc xoa",
  };
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

export const consumeVoucherQuantityService = async ({
  voucherId,
  voucherCode,
  quantity = 1,
} = {}) => {
  const consumeQuantity = Number(quantity);

  if (!Number.isInteger(consumeQuantity) || consumeQuantity <= 0) {
    const error = new Error("quantity khong hop le");
    error.statusCode = 400;
    throw error;
  }

  const filter = {
    deleted_at: null,
    status: true,
    quantity: { $gte: consumeQuantity },
  };

  if (voucherId) {
    if (!mongoose.Types.ObjectId.isValid(voucherId)) {
      const error = new Error("voucherId khong hop le");
      error.statusCode = 400;
      throw error;
    }

    filter._id = voucherId;
  } else if (!isMissing(voucherCode)) {
    filter.code = normalizeVoucherCode(voucherCode);
  } else {
    const error = new Error("voucherId hoac voucherCode la bat buoc");
    error.statusCode = 400;
    throw error;
  }

  const updatedVoucher = await Voucher.findOneAndUpdate(
    filter,
    {
      $inc: {
        quantity: -consumeQuantity,
        usage_count: consumeQuantity,
      },
    },
    { new: true, runValidators: true }
  );

  if (!updatedVoucher) {
    const existingVoucher = voucherId
      ? await Voucher.findOne({ _id: voucherId, deleted_at: null })
      : await Voucher.findOne({
          code: normalizeVoucherCode(voucherCode),
          deleted_at: null,
        });

    if (!existingVoucher) {
      const error = new Error("Khong tim thay voucher");
      error.statusCode = 404;
      throw error;
    }

    if (!existingVoucher.status) {
      const error = new Error("Voucher dang bi vo hieu hoa");
      error.statusCode = 409;
      throw error;
    }

    const error = new Error("Voucher khong con du so luong");
    error.statusCode = 409;
    throw error;
  }

  return {
    voucher: updatedVoucher,
    remaining_quantity: updatedVoucher.quantity,
  };
};

export const verifyVoucherService = async (payload = {}) => {
  const code = normalizeVoucherCode(payload.code ?? payload.voucher_code);
  const context = normalizeVoucherContext(payload);
  const session = payload.session ?? null;

  if (isMissing(code)) {
    const error = new Error("code la bat buoc");
    error.statusCode = 400;
    throw error;
  }

  const voucher = await Voucher.findOne({ code, deleted_at: null }).session(session);

  if (!voucher) {
    return {
      valid: false,
      message: "Khong tim thay voucher",
    };
  }

  if (!voucher.status) {
    return {
      valid: false,
      message: "Voucher dang bi vo hieu hoa",
    };
  }

  if (voucher.quantity <= 0) {
    return {
      valid: false,
      message: "Voucher da het luot su dung",
    };
  }

  const now = new Date();
  if (voucher.start_date && now < voucher.start_date) {
    return {
      valid: false,
      message: "Voucher chua den thoi gian ap dung",
    };
  }

  if (voucher.end_date && now > voucher.end_date) {
    return {
      valid: false,
      message: "Voucher da het han",
    };
  }

  const user = context.userId
    ? await User.findOne({ _id: context.userId, deleted_at: null, status: true }).session(session)
    : null;

  const scopeError = checkVoucherScope(voucher, context, user);
  if (scopeError) {
    return {
      valid: false,
      message: scopeError,
    };
  }

  if (context.userId) {
    const usedByCustomer = await countVoucherUsageByUser({
      voucherId: voucher._id,
      userId: context.userId,
      session,
    });

    if (usedByCustomer >= Number(voucher.usage_limit_per_user || 1)) {
      return {
        valid: false,
        message: "Khach hang da dung het so lan cho ma nay",
        used_by_customer: usedByCustomer,
      };
    }
  }

  if (context.orderAmount !== null && context.orderAmount < Number(voucher.min_order ?? 0)) {
    return {
      valid: false,
      message: `Don hang toi thieu phai dat ${voucher.min_order}`,
      min_order: voucher.min_order,
    };
  }

  return buildVoucherVerificationResponse(voucher, context);
};
