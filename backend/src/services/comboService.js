import mongoose from "mongoose";
import Combo from "../models/Combo.js";
import {
  normalizeComboPayload,
  parseComboStatus,
  validateComboPayload,
  validateComboUpdatePayload,
} from "../modules/combos/combo.validation.js";

const isMissing = (value) => value === undefined || value === null || value === "";

const buildComboFilter = (query = {}) => {
  const { q, search, name, status } = query;
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

  const keyword = String(q ?? search ?? name ?? "").trim();
  if (keyword) {
    filter.name = { $regex: keyword, $options: "i" };
  }

  return { filter };
};

const buildComboSort = (query = {}) => {
  const sort = String(query.sort ?? "newest").trim().toLowerCase();

  if (sort === "oldest") {
    return { created_at: 1 };
  }

  return { created_at: -1 };
};

const buildPagination = ({ page, limit }) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (currentPage - 1) * pageSize;

  return { currentPage, pageSize, skip };
};

const prepareCreatePayload = (payload) => {
  const normalizedPayload = normalizeComboPayload(payload, {
    image: null,
    description: "",
    stock: 0,
    status: true,
  });

  return {
    ...normalizedPayload,
    name: isMissing(normalizedPayload.name) ? normalizedPayload.name : String(normalizedPayload.name).trim(),
    image: isMissing(normalizedPayload.image) ? null : String(normalizedPayload.image).trim(),
    description: isMissing(normalizedPayload.description)
      ? ""
      : String(normalizedPayload.description).trim(),
    price: Number(normalizedPayload.price),
    stock: Number(normalizedPayload.stock ?? 0),
    status: parseComboStatus(normalizedPayload.status, true),
  };
};

const prepareUpdatePayload = (payload) => {
  const updatePayload = {};

  if (Object.prototype.hasOwnProperty.call(payload, "name")) {
    updatePayload.name = isMissing(payload.name) ? payload.name : String(payload.name).trim();
  }

  if (Object.prototype.hasOwnProperty.call(payload, "image")) {
    updatePayload.image = isMissing(payload.image) ? null : String(payload.image).trim();
  }

  if (Object.prototype.hasOwnProperty.call(payload, "description")) {
    updatePayload.description = isMissing(payload.description)
      ? ""
      : String(payload.description).trim();
  }

  if (Object.prototype.hasOwnProperty.call(payload, "price")) {
    updatePayload.price = Number(payload.price);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "stock")) {
    updatePayload.stock = Number(payload.stock);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "status")) {
    updatePayload.status = parseComboStatus(payload.status, true);
  }

  return updatePayload;
};

const ensureComboNameIsUnique = async (name, excludeId = null) => {
  const filter = {
    name: String(name).trim(),
    deleted_at: null,
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const existingCombo = await Combo.findOne(filter);
  if (existingCombo) {
    const error = new Error("Combo da ton tai");
    error.statusCode = 409;
    throw error;
  }
};

export const getAllCombosService = async (query = {}) => {
  const { filter } = buildComboFilter(query);
  const sort = buildComboSort(query);
  const shouldPaginate = query.page !== undefined || query.limit !== undefined;

  if (!shouldPaginate) {
    return Combo.find(filter).sort(sort);
  }

  const { currentPage, pageSize, skip } = buildPagination(query);
  const [combos, totalItems] = await Promise.all([
    Combo.find(filter).sort(sort).skip(skip).limit(pageSize),
    Combo.countDocuments(filter),
  ]);

  return {
    data: combos,
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

export const getComboByIdService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Combo khong hop le");
    error.statusCode = 400;
    throw error;
  }

  const combo = await Combo.findOne({ _id: id, deleted_at: null });

  if (!combo) {
    const error = new Error("Khong tim thay combo");
    error.statusCode = 404;
    throw error;
  }

  return combo;
};

export const createComboService = async (payload) => {
  const normalizedPayload = prepareCreatePayload(payload);
  const validationError = validateComboPayload(normalizedPayload);

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  await ensureComboNameIsUnique(normalizedPayload.name);

  const createdCombo = await Combo.create(normalizedPayload);
  return Combo.findOne({ _id: createdCombo._id, deleted_at: null });
};

export const updateComboService = async (id, payload) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Combo khong hop le");
    error.statusCode = 400;
    throw error;
  }

  const existingCombo = await Combo.findOne({ _id: id, deleted_at: null });
  if (!existingCombo) {
    const error = new Error("Khong tim thay combo");
    error.statusCode = 404;
    throw error;
  }

  const normalizedPayload = prepareUpdatePayload(payload);
  const validationError = validateComboUpdatePayload(normalizedPayload);
  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  if (Object.prototype.hasOwnProperty.call(normalizedPayload, "name")) {
    await ensureComboNameIsUnique(normalizedPayload.name, id);
  }

  const nextComboState = {
    ...existingCombo.toObject(),
    ...normalizedPayload,
  };

  if (Number.isNaN(Number(nextComboState.price)) || Number(nextComboState.price) < 0) {
    const error = new Error("price khong hop le");
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(Number(nextComboState.stock)) || Number(nextComboState.stock) < 0) {
    const error = new Error("stock khong hop le");
    error.statusCode = 400;
    throw error;
  }

  const updatedCombo = await Combo.findOneAndUpdate(
    { _id: id, deleted_at: null },
    normalizedPayload,
    { new: true, runValidators: true }
  );

  return updatedCombo;
};

export const deleteComboService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Combo khong hop le");
    error.statusCode = 400;
    throw error;
  }

  const deletedCombo = await Combo.findOneAndUpdate(
    { _id: id, deleted_at: null },
    { deleted_at: new Date() },
    { new: true }
  );

  if (!deletedCombo) {
    const error = new Error("Khong tim thay combo");
    error.statusCode = 404;
    throw error;
  }

  return deletedCombo;
};

export const restoreComboService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Combo khong hop le");
    error.statusCode = 400;
    throw error;
  }

  const existingCombo = await Combo.findOne({ _id: id, deleted_at: { $ne: null } });

  if (!existingCombo) {
    const error = new Error("Khong tim thay combo da xoa");
    error.statusCode = 404;
    throw error;
  }

  const duplicateCombo = await Combo.findOne({
    name: existingCombo.name,
    deleted_at: null,
    _id: { $ne: id },
  });

  if (duplicateCombo) {
    const error = new Error("Combo da ton tai");
    error.statusCode = 409;
    throw error;
  }

  existingCombo.deleted_at = null;
  await existingCombo.save();

  return Combo.findOne({ _id: id, deleted_at: null });
};
