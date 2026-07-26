import mongoose from "mongoose";
import Gift from "../models/Gift.js";

const isMissing = (value) => value === undefined || value === null || value === "";

const GIFT_TYPES = ["ticket", "combo", "voucher", "point", "physical"];
const GIFT_STATUSES = ["draft", "active", "paused", "cancelled"];
const IMAGE_URL_PATTERN = /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i;
const ISSUED_GIFT_EDITABLE_FIELDS = new Set([
  "name",
  "description",
  "image_url",
  "status",
  "start_date",
  "end_date",
]);

const giftTypeLabels = {
  ticket: "Vé miễn phí",
  combo: "Combo bắp nước",
  voucher: "Voucher",
  point: "Điểm thưởng",
  physical: "Quà vật phẩm",
};

export const deriveGiftStatus = (gift) => {
  const now = new Date();
  const data = typeof gift.toObject === "function" ? gift.toObject() : { ...gift };

  if (data.deleted_at || data.status === "cancelled") {
    return { value: "cancelled", label: "Đã hủy" };
  }

  if (data.status === "draft") {
    return { value: "draft", label: "Nháp" };
  }

  if (data.status === "paused") {
    return { value: "paused", label: "Tạm dừng" };
  }

  if (data.start_date && now < data.start_date) {
    return { value: "upcoming", label: "Sắp diễn ra" };
  }

  if (Number(data.remaining_quantity || 0) <= 0) {
    return { value: "out_of_stock", label: "Hết quà" };
  }

  if (data.end_date && now > data.end_date) {
    return { value: "expired", label: "Hết hạn" };
  }

  return { value: "active", label: "Đang hoạt động" };
};

export const normalizeGiftForResponse = (gift) => {
  const data = typeof gift.toObject === "function" ? gift.toObject() : { ...gift };
  const quantity = Number(data.quantity || 0);
  const issuedQuantity = Number(data.issued_quantity || 0);
  const remainingQuantity = Math.max(Number(data.remaining_quantity ?? quantity - issuedQuantity), 0);
  const computedStatus = deriveGiftStatus({
    ...data,
    remaining_quantity: remainingQuantity,
  });

  return {
    ...data,
    quantity,
    issued_quantity: issuedQuantity,
    remaining_quantity: remainingQuantity,
    value_label: data.value_label || "",
    type_label: giftTypeLabels[data.type] || data.type,
    computed_status: computedStatus.value,
    computed_status_label: computedStatus.label,
  };
};

const normalizeGiftCode = (value) => String(value || "").trim().toUpperCase();

const parseGiftType = (value) => {
  if (isMissing(value)) return null;
  const normalized = String(value).trim().toLowerCase();
  return GIFT_TYPES.includes(normalized) ? normalized : null;
};

const parseGiftStatus = (value) => {
  if (isMissing(value)) return "draft";
  const normalized = String(value).trim().toLowerCase();
  return GIFT_STATUSES.includes(normalized) ? normalized : "draft";
};

const normalizeGiftCondition = (condition = {}) => {
  if (typeof condition === "string") {
    return { note: condition.trim() };
  }

  const source = condition && typeof condition === "object" ? condition : {};
  return {
    min_order: isMissing(source.min_order) ? null : Number(source.min_order),
    member_tier: String(source.member_tier || "").trim(),
    birthday: Boolean(source.birthday),
    campaign: String(source.campaign || "").trim(),
    note: String(source.note || "").trim(),
  };
};

export const validateGiftPayload = async (
  payload,
  { isCodeTaken = async (code) => Boolean(await Gift.findOne({ code, deleted_at: null })) } = {},
) => {
  if (!payload.name) return "Tên quà là bắt buộc.";
  if (!payload.code) return "Mã quà là bắt buộc.";
  if (!/^[A-Za-z0-9-]{2,}$/.test(payload.code)) {
    return "Mã quà chỉ gồm chữ không dấu, số và dấu -, tối thiểu 2 ký tự.";
  }
  if (!payload.type || !GIFT_TYPES.includes(payload.type)) return "Loại quà không hợp lệ.";

  if (await isCodeTaken(payload.code)) return "Mã quà đã tồn tại.";

  if (!Number.isInteger(payload.quantity) || payload.quantity <= 0) {
    return "Tổng số lượng phải là số nguyên lớn hơn 0.";
  }

  if (!Number.isFinite(payload.value) || payload.value < 0) {
    return "Giá trị quà không hợp lệ.";
  }

  if (["voucher", "point"].includes(payload.type) && payload.value <= 0) {
    return payload.type === "point"
      ? "Quà điểm thưởng phải có số điểm lớn hơn 0."
      : "Quà voucher phải có giá trị lớn hơn 0.";
  }

  if (!payload.value_label && payload.value <= 0) {
    return "Vui lòng nhập giá trị quà.";
  }

  if (payload.condition.min_order !== null) {
    if (!Number.isFinite(payload.condition.min_order) || payload.condition.min_order < 0) {
      return "Điều kiện đơn tối thiểu không hợp lệ.";
    }
  }

  if (!payload.start_date || Number.isNaN(payload.start_date.getTime())) {
    return "Ngày bắt đầu không hợp lệ.";
  }

  if (!payload.end_date || Number.isNaN(payload.end_date.getTime())) {
    return "Ngày kết thúc không hợp lệ.";
  }

  if (payload.end_date <= payload.start_date) {
    return "Ngày kết thúc phải sau ngày bắt đầu.";
  }

  if (payload.image_url && !IMAGE_URL_PATTERN.test(payload.image_url)) {
    return "Ảnh quà tặng phải là URL ảnh jpg, jpeg, png, webp hoặc gif.";
  }

  return null;
};

export const prepareGiftCreatePayload = (payload = {}, user = null) => {
  const quantity = Number(payload.quantity);
  const value = isMissing(payload.value) ? 0 : Number(payload.value);

  return {
    code: normalizeGiftCode(payload.code),
    name: String(payload.name || "").trim(),
    description: String(payload.description || "").trim(),
    image_url: String(payload.image_url || "").trim(),
    type: parseGiftType(payload.type) || "",
    value,
    value_label: String(payload.value_label || "").trim(),
    quantity,
    issued_quantity: 0,
    remaining_quantity: quantity,
    condition: normalizeGiftCondition(payload.condition),
    start_date: new Date(payload.start_date),
    end_date: new Date(payload.end_date),
    status: parseGiftStatus(payload.status),
    created_by: user?.id || user?._id || null,
    updated_by: user?.id || user?._id || null,
  };
};

const prepareGiftUpdatePayload = (payload = {}, user = null) => {
  const updatePayload = {};

  if (Object.prototype.hasOwnProperty.call(payload, "code")) {
    updatePayload.code = normalizeGiftCode(payload.code);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "name")) {
    updatePayload.name = String(payload.name || "").trim();
  }
  if (Object.prototype.hasOwnProperty.call(payload, "description")) {
    updatePayload.description = String(payload.description || "").trim();
  }
  if (Object.prototype.hasOwnProperty.call(payload, "image_url")) {
    updatePayload.image_url = String(payload.image_url || "").trim();
  }
  if (Object.prototype.hasOwnProperty.call(payload, "type")) {
    updatePayload.type = parseGiftType(payload.type) || "";
  }
  if (Object.prototype.hasOwnProperty.call(payload, "value")) {
    updatePayload.value = isMissing(payload.value) ? 0 : Number(payload.value);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "value_label")) {
    updatePayload.value_label = String(payload.value_label || "").trim();
  }
  if (Object.prototype.hasOwnProperty.call(payload, "quantity")) {
    updatePayload.quantity = Number(payload.quantity);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "condition")) {
    updatePayload.condition = normalizeGiftCondition(payload.condition);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "start_date")) {
    updatePayload.start_date = new Date(payload.start_date);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "end_date")) {
    updatePayload.end_date = new Date(payload.end_date);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "status")) {
    updatePayload.status = parseGiftStatus(payload.status);
  }
  if (user?.id || user?._id) {
    updatePayload.updated_by = user.id || user._id;
  }

  return updatePayload;
};

const validateIssuedGiftUpdatePayload = (payload) => {
  if (Object.prototype.hasOwnProperty.call(payload, "name") && !payload.name) {
    return "Tên quà là bắt buộc.";
  }

  if (payload.image_url && !IMAGE_URL_PATTERN.test(payload.image_url)) {
    return "Ảnh quà tặng phải là URL ảnh jpg, jpeg, png, webp hoặc gif.";
  }

  if (
    payload.start_date &&
    (!payload.end_date || Number.isNaN(payload.end_date.getTime()))
  ) {
    return "Ngày kết thúc không hợp lệ.";
  }

  if (
    payload.end_date &&
    (!payload.start_date || Number.isNaN(payload.start_date.getTime()))
  ) {
    return "Ngày bắt đầu không hợp lệ.";
  }

  if (payload.start_date && Number.isNaN(payload.start_date.getTime())) {
    return "Ngày bắt đầu không hợp lệ.";
  }

  if (payload.end_date && Number.isNaN(payload.end_date.getTime())) {
    return "Ngày kết thúc không hợp lệ.";
  }

  if (payload.start_date && payload.end_date && payload.end_date <= payload.start_date) {
    return "Ngày kết thúc phải sau ngày bắt đầu.";
  }

  return null;
};

const buildGiftFilter = (query = {}) => {
  const { q, search, type, status, stock } = query;
  const normalizedStatus = isMissing(status) ? "" : String(status).trim().toLowerCase();
  const now = new Date();
  const filter = {
    deleted_at: normalizedStatus === "cancelled" ? { $ne: null } : null,
  };

  const giftType = parseGiftType(type);
  if (giftType) {
    filter.type = giftType;
  }

  const keyword = String(q ?? search ?? "").trim();
  if (keyword) {
    filter.$or = [
      { code: { $regex: keyword, $options: "i" } },
      { name: { $regex: keyword, $options: "i" } },
    ];
  }

  if (normalizedStatus) {
    if (GIFT_STATUSES.includes(normalizedStatus)) {
      filter.status = normalizedStatus;
    } else if (normalizedStatus === "upcoming") {
      filter.status = "active";
      filter.start_date = { $gt: now };
    } else if (normalizedStatus === "active") {
      filter.status = "active";
      filter.start_date = { $lte: now };
      filter.end_date = { $gte: now };
      filter.remaining_quantity = { $gt: 0 };
    } else if (normalizedStatus === "out_of_stock") {
      filter.remaining_quantity = { $lte: 0 };
    } else if (normalizedStatus === "expired") {
      filter.end_date = { $lt: now };
    }
  }

  const normalizedStock = isMissing(stock) ? "" : String(stock).trim().toLowerCase();
  if (["available", "in_stock"].includes(normalizedStock)) {
    filter.remaining_quantity = { $gt: 0 };
  } else if (["empty", "out_of_stock"].includes(normalizedStock)) {
    filter.remaining_quantity = { $lte: 0 };
  }

  return filter;
};

const buildGiftSort = (query = {}) => {
  const sortBy = String(query.sort_by ?? query.sort ?? "created_at").trim().toLowerCase();
  const direction = String(query.sort_order ?? query.order ?? "desc").trim().toLowerCase() === "asc" ? 1 : -1;
  const allowedSorts = new Set([
    "created_at",
    "start_date",
    "end_date",
    "quantity",
    "issued_quantity",
    "remaining_quantity",
    "value",
    "name",
  ]);

  if (allowedSorts.has(sortBy)) {
    return { [sortBy]: direction };
  }

  return { created_at: -1 };
};

const buildPagination = ({ page, limit }) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (currentPage - 1) * pageSize;

  return { currentPage, pageSize, skip };
};

export const listGifts = async (query = {}) => {
  const filter = buildGiftFilter(query);
  const sort = buildGiftSort(query);
  const { currentPage, pageSize, skip } = buildPagination(query);

  const [gifts, totalItems] = await Promise.all([
    Gift.find(filter).sort(sort).skip(skip).limit(pageSize),
    Gift.countDocuments(filter),
  ]);

  return {
    data: gifts.map(normalizeGiftForResponse),
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

export const createGiftService = async (payload, user = null) => {
  const normalizedPayload = prepareGiftCreatePayload(payload, user);
  const validationError = await validateGiftPayload(normalizedPayload);

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = validationError.includes("đã tồn tại") ? 409 : 400;
    throw error;
  }

  const [createdGift] = await Gift.create([normalizedPayload]);
  return Gift.findOne({ _id: createdGift._id, deleted_at: null })
    .populate("created_by", "full_name email")
    .populate("updated_by", "full_name email");
};

export const updateGiftService = async (id, payload, user = null) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Quà tặng không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }

  const existingGift = await Gift.findOne({ _id: id, deleted_at: null });
  if (!existingGift) {
    const error = new Error("Quà tặng không tồn tại.");
    error.statusCode = 404;
    throw error;
  }

  const issuedQuantity = Number(existingGift.issued_quantity || 0);
  const normalizedPayload = prepareGiftUpdatePayload(payload, user);

  if (issuedQuantity > 0) {
    const blockedFields = Object.keys(payload).filter(
      (field) => !ISSUED_GIFT_EDITABLE_FIELDS.has(field),
    );

    if (blockedFields.length > 0) {
      const error = new Error(
        `Quà tặng đã phát, không thể cập nhật các trường: ${blockedFields.join(", ")}.`
      );
      error.statusCode = 400;
      throw error;
    }

    const nextState = {
      ...existingGift.toObject(),
      ...normalizedPayload,
    };

    const validationError = validateIssuedGiftUpdatePayload({
      ...normalizedPayload,
      start_date: nextState.start_date,
      end_date: nextState.end_date,
    });

    if (validationError) {
      const error = new Error(validationError);
      error.statusCode = 400;
      throw error;
    }

    const updatedGift = await Gift.findOneAndUpdate(
      { _id: id, deleted_at: null },
      normalizedPayload,
      { new: true, runValidators: true },
    )
      .populate("created_by", "full_name email")
      .populate("updated_by", "full_name email");

    return updatedGift;
  }

  const nextGiftState = {
    ...existingGift.toObject(),
    ...normalizedPayload,
  };
  const nextQuantity = Number(nextGiftState.quantity || 0);
  const nextIssuedQuantity = Number(nextGiftState.issued_quantity || 0);
  nextGiftState.remaining_quantity = Math.max(nextQuantity - nextIssuedQuantity, 0);

  const validationError = await validateGiftPayload(nextGiftState, {
    isCodeTaken: async (code) =>
      Boolean(await Gift.findOne({
        code,
        deleted_at: null,
        _id: { $ne: id },
      })),
  });

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = validationError.includes("đã tồn tại") ? 409 : 400;
    throw error;
  }

  normalizedPayload.remaining_quantity = nextGiftState.remaining_quantity;

  const updatedGift = await Gift.findOneAndUpdate(
    { _id: id, deleted_at: null },
    normalizedPayload,
    { new: true, runValidators: true },
  )
    .populate("created_by", "full_name email")
    .populate("updated_by", "full_name email");

  return updatedGift;
};

export const getGiftByIdService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Quà tặng không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }

  const gift = await Gift.findOne({ _id: id, deleted_at: null })
    .populate("created_by", "full_name email")
    .populate("updated_by", "full_name email");

  return gift ? normalizeGiftForResponse(gift) : null;
};
