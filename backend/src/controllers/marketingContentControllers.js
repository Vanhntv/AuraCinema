import mongoose from "mongoose";
import MarketingContent from "../models/MarketingContent.js";

const CONTENT_TYPES = ["news", "promotion"];
const CONTENT_STATUSES = ["draft", "published", "archived"];

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const slugify = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseDate = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error("Ngày không hợp lệ");
    error.statusCode = 400;
    throw error;
  }
  return date;
};

const normalizePayload = (payload = {}, current = null) => {
  const type = String(payload.type ?? current?.type ?? "").trim();
  if (!CONTENT_TYPES.includes(type)) {
    const error = new Error("Loại nội dung không hợp lệ");
    error.statusCode = 400;
    throw error;
  }

  const title = String(payload.title ?? current?.title ?? "").trim();
  const summary = String(payload.summary ?? current?.summary ?? "").trim();
  const thumbnail = String(payload.thumbnail ?? current?.thumbnail ?? "").trim();
  const contentHtml = String(payload.content_html ?? payload.contentHtml ?? current?.content_html ?? "").trim();
  const status = String(payload.status ?? current?.status ?? "draft").trim();

  if (!title || !summary || !thumbnail || !contentHtml) {
    const error = new Error("Vui lòng nhập đủ tiêu đề, tóm tắt, ảnh và nội dung");
    error.statusCode = 400;
    throw error;
  }

  if (!CONTENT_STATUSES.includes(status)) {
    const error = new Error("Trạng thái nội dung không hợp lệ");
    error.statusCode = 400;
    throw error;
  }

  const slug = slugify(payload.slug || title);
  if (!slug) {
    const error = new Error("Slug không hợp lệ");
    error.statusCode = 400;
    throw error;
  }

  return {
    type,
    slug,
    title,
    summary,
    thumbnail,
    category: String(payload.category ?? current?.category ?? "").trim(),
    content_html: contentHtml,
    author: String(payload.author ?? current?.author ?? "AuraCinema").trim() || "AuraCinema",
    status,
    published_at: status === "published"
      ? parseDate(payload.published_at ?? current?.published_at ?? new Date())
      : parseDate(payload.published_at ?? current?.published_at),
    start_date: type === "promotion" ? parseDate(payload.start_date ?? current?.start_date) : null,
    end_date: type === "promotion" ? parseDate(payload.end_date ?? current?.end_date) : null,
    linked_voucher_id: payload.linked_voucher_id && mongoose.Types.ObjectId.isValid(payload.linked_voucher_id)
      ? payload.linked_voucher_id
      : null,
  };
};

const buildFilter = (query = {}, publicOnly = false) => {
  const filter = { deleted_at: null };
  const type = String(query.type || "").trim();
  const status = String(query.status || "").trim();
  const search = String(query.q || query.search || "").trim();

  if (CONTENT_TYPES.includes(type)) filter.type = type;
  if (publicOnly) filter.status = "published";
  else if (CONTENT_STATUSES.includes(status)) filter.status = status;

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ title: regex }, { summary: regex }, { category: regex }, { slug: regex }];
  }

  return filter;
};

export const listPublicMarketingContent = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const items = await MarketingContent.find(buildFilter(req.query, true))
      .sort({ published_at: -1, created_at: -1 })
      .limit(limit)
      .populate("linked_voucher_id", "code discount_type discount_value min_order end_date");

    return res.json({ success: true, data: items });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getPublicMarketingContentBySlug = async (req, res) => {
  try {
    const item = await MarketingContent.findOneAndUpdate(
      {
        type: req.params.type,
        slug: req.params.slug,
        status: "published",
        deleted_at: null,
      },
      { $inc: { view_count: 1 } },
      { new: true },
    ).populate("linked_voucher_id", "code discount_type discount_value min_order end_date");

    if (!item) return res.status(404).json({ success: false, message: "Không tìm thấy nội dung" });
    return res.json({ success: true, data: item });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const listAdminMarketingContent = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const filter = buildFilter(req.query, false);

    const [items, totalItems] = await Promise.all([
      MarketingContent.find(filter)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("linked_voucher_id", "code discount_type discount_value min_order end_date"),
      MarketingContent.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(Math.ceil(totalItems / limit), 1),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createAdminMarketingContent = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const item = await MarketingContent.create(payload);
    return res.status(201).json({ success: true, message: "Đã tạo nội dung", data: item });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: "Slug đã tồn tại" });
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const updateAdminMarketingContent = async (req, res) => {
  try {
    const current = await MarketingContent.findOne({ _id: req.params.id, deleted_at: null });
    if (!current) return res.status(404).json({ success: false, message: "Không tìm thấy nội dung" });

    const payload = normalizePayload(req.body, current);
    Object.assign(current, payload);
    await current.save();
    return res.json({ success: true, message: "Đã cập nhật nội dung", data: current });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: "Slug đã tồn tại" });
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const deleteAdminMarketingContent = async (req, res) => {
  try {
    const item = await MarketingContent.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { $set: { deleted_at: new Date(), status: "archived" } },
      { new: true },
    );
    if (!item) return res.status(404).json({ success: false, message: "Không tìm thấy nội dung" });
    return res.json({ success: true, message: "Đã xóa nội dung", data: item });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
