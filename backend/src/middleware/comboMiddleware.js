import mongoose from "mongoose";
import {
  validateComboPayload,
  validateComboUpdatePayload,
} from "../modules/combos/combo.validation.js";

const isEmptyValue = (value) => value === undefined || value === null || value === "";

export const asyncHandler = (handler) => {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
};

export const validateComboObjectId = (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Combo khong hop le");
    error.statusCode = 400;
    return next(error);
  }

  next();
};

export const validateCreateCombo = (req, res, next) => {
  const validationError = validateComboPayload(req.body);

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    return next(error);
  }

  next();
};

export const validateUpdateCombo = (req, res, next) => {
  const validationError = validateComboUpdatePayload(req.body);

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    return next(error);
  }

  if (Object.keys(req.body || {}).length === 0 && isEmptyValue(req.file)) {
    const error = new Error("Du lieu cap nhat khong duoc rong");
    error.statusCode = 400;
    return next(error);
  }

  next();
};
