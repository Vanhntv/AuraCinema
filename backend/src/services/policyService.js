import { createRequire } from "module";
import path from "path";
import Policy from "../models/Policy.js";
import { PDFParse } from "pdf-parse";

const require = createRequire(import.meta.url);
const WordExtractor = require("word-extractor");

export const POLICY_SURFACES = ["payment", "terms", "privacy", "booking", "general"];
export const POLICY_STATUSES = ["draft", "published", "archived"];

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const normalizePolicyContent = (value = "") =>
  String(value)
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const normalizePolicyPayload = (payload = {}, existing = {}) => {
  const status = String(payload.status ?? existing.status ?? "draft").trim().toLowerCase();
  const surface = String(payload.surface ?? existing.surface ?? "general").trim().toLowerCase();
  const content = normalizePolicyContent(payload.content ?? existing.content ?? "");
  const confirmationValue = Object.prototype.hasOwnProperty.call(payload, "requires_confirmation")
    ? payload.requires_confirmation
    : existing.requires_confirmation;
  const next = {
    title: String(payload.title ?? existing.title ?? "").trim(),
    summary: String(payload.summary ?? existing.summary ?? "").trim(),
    content,
    surface,
    status,
    requires_confirmation:
      confirmationValue === true ||
      String(confirmationValue).trim().toLowerCase() === "true",
    display_order: Math.max(Number.parseInt(payload.display_order ?? existing.display_order ?? 0, 10) || 0, 0),
    source_type: String(payload.source_type ?? existing.source_type ?? "manual").trim().toLowerCase(),
    source_file_name: String(payload.source_file_name ?? existing.source_file_name ?? "").trim(),
  };

  if (!next.title || next.title.length < 3) {
    const error = new Error("Tiêu đề chính sách phải có ít nhất 3 ký tự.");
    error.statusCode = 400;
    throw error;
  }
  if (next.title.length > 160) {
    const error = new Error("Tiêu đề chính sách không được vượt quá 160 ký tự.");
    error.statusCode = 400;
    throw error;
  }
  if (!content || content.length < 10) {
    const error = new Error("Nội dung chính sách phải có ít nhất 10 ký tự.");
    error.statusCode = 400;
    throw error;
  }
  if (content.length > 100000) {
    const error = new Error("Nội dung chính sách không được vượt quá 100.000 ký tự.");
    error.statusCode = 400;
    throw error;
  }
  if (!POLICY_SURFACES.includes(surface)) {
    const error = new Error("Vị trí áp dụng chính sách không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }
  if (!POLICY_STATUSES.includes(status)) {
    const error = new Error("Trạng thái chính sách không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }
  if (!["manual", "file", "word"].includes(next.source_type)) {
    next.source_type = "manual";
  }

  return next;
};

export const extractPolicyFromWord = async (file) => {
  if (!file?.buffer?.length) {
    const error = new Error("Không tìm thấy dữ liệu file Word.");
    error.statusCode = 400;
    throw error;
  }

  try {
    const extension = path.extname(file.originalname || "").toLowerCase();
    let rawContent = "";
    if (extension === ".pdf") {
      const parser = new PDFParse({ data: file.buffer });
      try {
        const result = await parser.getText();
        rawContent = result.text;
      } finally {
        await parser.destroy();
      }
    } else {
      const extractor = new WordExtractor();
      const document = await extractor.extract(file.buffer);
      rawContent = document.getBody();
    }
    const content = normalizePolicyContent(rawContent);

    if (content.length < 10) {
      const error = new Error("File không có đủ nội dung văn bản để tạo chính sách.");
      error.statusCode = 400;
      throw error;
    }

    return {
      title: path.basename(file.originalname, path.extname(file.originalname)).trim(),
      content,
      source_file_name: path.basename(file.originalname),
    };
  } catch (error) {
    if (error.statusCode) throw error;
    const parseError = new Error("Không thể đọc file. Vui lòng kiểm tra file .docx hoặc .pdf và thử lại.");
    parseError.statusCode = 400;
    throw parseError;
  }
};

export const listPolicies = async (query = {}) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
  const filter = { deleted_at: null };

  if (query.surface && POLICY_SURFACES.includes(String(query.surface))) {
    filter.surface = String(query.surface);
  }
  if (query.status && POLICY_STATUSES.includes(String(query.status))) {
    filter.status = String(query.status);
  }
  if (query.q) {
    const pattern = new RegExp(escapeRegex(String(query.q).trim()), "i");
    filter.$or = [{ title: pattern }, { summary: pattern }, { content: pattern }];
  }

  const [items, totalItems] = await Promise.all([
    Policy.find(filter)
      .sort({ display_order: 1, updated_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("updated_by", "full_name email"),
    Policy.countDocuments(filter),
  ]);

  return {
    data: items,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.max(Math.ceil(totalItems / limit), 1),
    },
  };
};

export const listPublishedPolicies = async (query = {}) => {
  const filter = { deleted_at: null, status: "published" };
  if (query.surface && POLICY_SURFACES.includes(String(query.surface))) {
    filter.surface = String(query.surface);
  }

  return Policy.find(filter)
    .sort({ display_order: 1, published_at: -1, created_at: -1 })
    .select("title summary content surface requires_confirmation display_order published_at updated_at");
};

export const createPolicy = async (payload, userId = null) => {
  const data = normalizePolicyPayload(payload);
  const now = new Date();

  return Policy.create({
    ...data,
    published_at: data.status === "published" ? now : null,
    created_by: userId,
    updated_by: userId,
  });
};

export const updatePolicy = async (id, payload, userId = null) => {
  const policy = await Policy.findOne({ _id: id, deleted_at: null });
  if (!policy) {
    const error = new Error("Không tìm thấy chính sách.");
    error.statusCode = 404;
    throw error;
  }

  const data = normalizePolicyPayload(payload, policy.toObject());
  Object.assign(policy, data, { updated_by: userId });

  if (data.status === "published" && !policy.published_at) {
    policy.published_at = new Date();
  } else if (data.status !== "published") {
    policy.published_at = null;
  }

  await policy.save();
  return policy;
};

export const deletePolicy = async (id, userId = null) => {
  const policy = await Policy.findOneAndUpdate(
    { _id: id, deleted_at: null },
    { deleted_at: new Date(), status: "archived", updated_by: userId },
    { new: true },
  );

  if (!policy) {
    const error = new Error("Không tìm thấy chính sách.");
    error.statusCode = 404;
    throw error;
  }

  return policy;
};
