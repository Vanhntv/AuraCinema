import Gift from "../models/Gift.js";

const isMissing = (value) => value === undefined || value === null || value === "";

const GIFT_TYPES = ["ticket", "combo", "voucher", "point", "physical"];
const GIFT_STATUSES = ["draft", "active", "paused", "cancelled"];

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
    type_label: giftTypeLabels[data.type] || data.type,
    computed_status: computedStatus.value,
    computed_status_label: computedStatus.label,
  };
};

const parseGiftType = (value) => {
  if (isMissing(value)) return null;
  const normalized = String(value).trim().toLowerCase();
  return GIFT_TYPES.includes(normalized) ? normalized : null;
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
