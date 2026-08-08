import mongoose from "mongoose";
import {
  createPolicy,
  deletePolicy,
  extractPolicyFromWord,
  listPolicies,
  listPublishedPolicies,
  updatePolicy,
} from "../services/policyService.js";

const sendError = (res, error) => res.status(error.statusCode || 500).json({
  success: false,
  message: error.message || "Không thể xử lý chính sách.",
});

const ensureValidId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("ID chính sách không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }
};

export const getAdminPolicies = async (req, res) => {
  try {
    const result = await listPolicies(req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getPublishedPolicies = async (req, res) => {
  try {
    const policies = await listPublishedPolicies(req.query);
    return res.status(200).json({ success: true, data: policies });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createAdminPolicy = async (req, res) => {
  try {
    const policy = await createPolicy(req.body, req.user?.id);
    return res.status(201).json({
      success: true,
      message: "Tạo chính sách thành công.",
      data: policy,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const importAdminPolicyFromWord = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Vui lòng chọn file .docx hoặc .pdf để nhập." });
    }

    const extracted = await extractPolicyFromWord(req.file);
    const policy = await createPolicy({
      ...req.body,
      title: String(req.body?.title || extracted.title).trim(),
      content: extracted.content,
      status: req.body?.status || "draft",
      source_type: "file",
      source_file_name: extracted.source_file_name,
    }, req.user?.id);

    return res.status(201).json({
      success: true,
      message: "Đã nhập nội dung chính sách từ file.",
      data: policy,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const updateAdminPolicy = async (req, res) => {
  try {
    ensureValidId(req.params.id);
    const policy = await updatePolicy(req.params.id, req.body, req.user?.id);
    return res.status(200).json({
      success: true,
      message: "Cập nhật chính sách thành công.",
      data: policy,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const deleteAdminPolicy = async (req, res) => {
  try {
    ensureValidId(req.params.id);
    await deletePolicy(req.params.id, req.user?.id);
    return res.status(200).json({ success: true, message: "Đã lưu trữ chính sách." });
  } catch (error) {
    return sendError(res, error);
  }
};
