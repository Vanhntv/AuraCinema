import { randomBytes, randomInt, scrypt as scryptCallback } from "crypto";
import mongoose from "mongoose";
import { promisify } from "util";
import AuditLog from "../models/AuditLog.js";
import Booking from "../models/Booking.js";
import RewardPointLog from "../models/RewardPointLog.js";
import User from "../models/User.js";
import UserVoucher from "../models/UserVoucher.js";

const scrypt = promisify(scryptCallback);

const ALLOWED_GENDERS = ["male", "female", "other", null, ""];
const ALLOWED_TIERS = ["member", "vip", "vvip"];
const ALLOWED_ROLES = ["user", "admin"];
const ALLOWED_ACCOUNT_STATUSES = ["active", "banned", "unverified"];
const RESET_OTP_TTL_MS = 10 * 60 * 1000;

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const hashPassword = async (password) => {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
};

const resolveAccountStatus = (user) => {
  if (user.account_status) return user.account_status;
  return user.status === false ? "banned" : "active";
};

const statusToLegacyBoolean = (accountStatus) => accountStatus === "active";

const sanitizeUser = (user) => {
  const data = user.toObject ? user.toObject() : { ...user };
  delete data.password;
  delete data.password_reset_otp;
  delete data.password_reset_expires_at;
  delete data.password_reset_attempts;
  data.account_status = resolveAccountStatus(data);
  data.status = statusToLegacyBoolean(data.account_status);
  return data;
};

const pickAuditFields = (user) => ({
  full_name: user.full_name,
  email: user.email,
  phone: user.phone,
  birth_date: user.birth_date,
  gender: user.gender,
  role: user.role,
  role_id: user.role_id,
  member_tier: user.member_tier,
  reward_points: user.reward_points,
  account_status: resolveAccountStatus(user),
  status: statusToLegacyBoolean(resolveAccountStatus(user)),
});

const writeAuditLog = async ({ req, targetUserId, action, before = null, after = null, reason = null }) => {
  await AuditLog.create({
    admin_id: req.user.id,
    target_user_id: targetUserId,
    action,
    before,
    after,
    reason: String(reason || "").trim() || null,
  });
};

const buildUserQuery = ({ q, role, status, account_status, member_tier }) => {
  const query = { deleted_at: null };

  if (q?.trim()) {
    const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ full_name: regex }, { email: regex }, { phone: regex }];
  }

  if (ALLOWED_ROLES.includes(role)) {
    query.role = role;
  }

  const normalizedStatus = account_status || status;
  if (ALLOWED_ACCOUNT_STATUSES.includes(normalizedStatus)) {
    query.account_status = normalizedStatus;
  } else if (normalizedStatus === "true" || normalizedStatus === "false") {
    query.status = normalizedStatus === "true";
  }

  if (ALLOWED_TIERS.includes(member_tier)) {
    query.member_tier = member_tier;
  }

  return query;
};

const validateProfilePayload = async (payload, userId) => {
  const errors = [];
  const data = {};

  if (Object.prototype.hasOwnProperty.call(payload, "full_name")) {
    const fullName = String(payload.full_name || "").trim();
    if (fullName.length < 2) {
      errors.push("Họ tên phải có ít nhất 2 ký tự");
    } else {
      data.full_name = fullName;
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "email")) {
    const email = normalizeEmail(payload.email);
    if (!isValidEmail(email)) {
      errors.push("Email không hợp lệ");
    } else {
      const existing = await User.findOne({ email, _id: { $ne: userId }, deleted_at: null });
      if (existing) {
        errors.push("Email đã được sử dụng bởi tài khoản khác");
      } else {
        data.email = email;
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "phone")) {
    const phone = String(payload.phone || "").trim();
    if (phone && !/^[0-9+\-\s()]{8,20}$/.test(phone)) {
      errors.push("Số điện thoại không hợp lệ");
    } else {
      if (phone) {
        const existing = await User.findOne({ phone, _id: { $ne: userId }, deleted_at: null });
        if (existing) errors.push("Số điện thoại đã được sử dụng bởi tài khoản khác");
      }
      data.phone = phone || null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "birth_date")) {
    if (!payload.birth_date) {
      data.birth_date = null;
    } else {
      const birthDate = new Date(payload.birth_date);
      if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) {
        errors.push("Ngày sinh không hợp lệ");
      } else {
        data.birth_date = birthDate;
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "gender")) {
    if (!ALLOWED_GENDERS.includes(payload.gender)) {
      errors.push("Giới tính không hợp lệ");
    } else {
      data.gender = payload.gender || null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "role")) {
    if (!ALLOWED_ROLES.includes(payload.role)) {
      errors.push("Vai trò không hợp lệ");
    } else {
      data.role = payload.role;
      data.role_id = payload.role === "admin" ? 1 : null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "member_tier")) {
    if (!ALLOWED_TIERS.includes(payload.member_tier)) {
      errors.push("Hạng thành viên không hợp lệ");
    } else {
      data.member_tier = payload.member_tier;
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "account_status")) {
    if (!ALLOWED_ACCOUNT_STATUSES.includes(payload.account_status)) {
      errors.push("Trạng thái tài khoản không hợp lệ");
    } else {
      data.account_status = payload.account_status;
      data.status = statusToLegacyBoolean(payload.account_status);
    }
  }

  return { data, errors };
};

export const getUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const skip = (page - 1) * limit;
    const query = buildUserQuery(req.query);

    const [users, totalItems] = await Promise.all([
      User.find(query)
        .select("-password -password_reset_otp -password_reset_expires_at -password_reset_attempts")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: users.map(sanitizeUser),
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

export const getUserDetail = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "ID người dùng không hợp lệ" });
    }

    const user = await User.findOne({ _id: req.params.id, deleted_at: null })
      .select("-password -password_reset_otp -password_reset_expires_at -password_reset_attempts");

    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    }

    const [bookings, rewardPointLogs, auditLogs, vouchers] = await Promise.all([
      Booking.find({ user_id: user._id })
        .populate({
          path: "showtime_id",
          select: "movie_id room_id start_time end_time",
          populate: [
            { path: "movie_id", select: "title poster duration age_limit" },
            {
              path: "room_id",
              select: "name cinema_id",
              populate: { path: "cinema_id", select: "name address city" },
            },
          ],
        })
        .populate({
          path: "showtime_seat_ids",
          populate: {
            path: "seat_id",
            select: "seat_row seat_number seat_type_id",
            populate: { path: "seat_type_id", select: "name" },
          },
        })
        .sort({ created_at: -1 })
        .limit(100),
      RewardPointLog.find({ user_id: user._id })
        .populate("admin_id", "full_name email")
        .sort({ created_at: -1 })
        .limit(50),
      AuditLog.find({ target_user_id: user._id })
        .populate("admin_id", "full_name email")
        .sort({ created_at: -1 })
        .limit(50),
      UserVoucher.find({ user_id: user._id })
        .populate("voucher_id", "code discount_type discount_value min_order start_date end_date status")
        .sort({ created_at: -1 })
        .limit(50),
    ]);

    return res.json({
      success: true,
      data: {
        user: sanitizeUser(user),
        bookings,
        reward_point_logs: rewardPointLogs,
        audit_logs: auditLogs,
        vouchers,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserBasicInfo = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "ID người dùng không hợp lệ" });
    }

    const currentUser = await User.findOne({ _id: req.params.id, deleted_at: null });
    if (!currentUser) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    }

    const { data, errors } = await validateProfilePayload(req.body, req.params.id);
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    if (req.user.id === req.params.id && data.account_status && data.account_status !== "active") {
      return res.status(400).json({ success: false, message: "Không thể tự khóa tài khoản đang đăng nhập" });
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: "Không có thông tin hợp lệ để cập nhật" });
    }

    const before = pickAuditFields(currentUser);
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { $set: data },
      { returnDocument: "after", runValidators: true },
    ).select("-password -password_reset_otp -password_reset_expires_at -password_reset_attempts");

    await writeAuditLog({
      req,
      targetUserId: req.params.id,
      action: "UPDATE_USER_PROFILE",
      before,
      after: pickAuditFields(user),
      reason: req.body.reason,
    });

    return res.json({ success: true, message: "Đã cập nhật thông tin người dùng", data: sanitizeUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Email hoặc số điện thoại đã được sử dụng" });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "ID người dùng không hợp lệ" });
    }

    const nextStatus =
      req.body.account_status ||
      (typeof req.body.status === "boolean" ? (req.body.status ? "active" : "banned") : null);

    if (!ALLOWED_ACCOUNT_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ success: false, message: "Trạng thái người dùng không hợp lệ" });
    }

    if (req.user.id === req.params.id && nextStatus !== "active") {
      return res.status(400).json({ success: false, message: "Không thể tự khóa tài khoản đang đăng nhập" });
    }

    const currentUser = await User.findOne({ _id: req.params.id, deleted_at: null });
    if (!currentUser) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    }

    const before = pickAuditFields(currentUser);
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { $set: { account_status: nextStatus, status: statusToLegacyBoolean(nextStatus) } },
      { returnDocument: "after", runValidators: true },
    ).select("-password -password_reset_otp -password_reset_expires_at -password_reset_attempts");

    await writeAuditLog({
      req,
      targetUserId: req.params.id,
      action: "UPDATE_USER_STATUS",
      before,
      after: pickAuditFields(user),
      reason: req.body.reason,
    });

    return res.json({
      success: true,
      message: nextStatus === "active" ? "Đã mở khóa người dùng" : "Đã cập nhật trạng thái người dùng",
      data: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const adjustRewardPoints = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "ID người dùng không hợp lệ" });
    }

    const type = req.body.type;
    const points = Number(req.body.points);
    const reason = String(req.body.reason || "").trim();

    if (!["add", "subtract"].includes(type)) {
      return res.status(400).json({ success: false, message: "Loại điều chỉnh điểm không hợp lệ" });
    }

    if (!Number.isInteger(points) || points <= 0) {
      return res.status(400).json({ success: false, message: "Số điểm phải là số nguyên dương" });
    }

    if (!reason) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập lý do điều chỉnh điểm" });
    }

    const user = await User.findOne({ _id: req.params.id, deleted_at: null });
    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    }

    const before = pickAuditFields(user);
    const currentPoints = Number(user.reward_points || 0);
    const nextPoints = type === "add" ? currentPoints + points : currentPoints - points;
    if (nextPoints < 0) {
      return res.status(400).json({ success: false, message: "Điểm thưởng không được nhỏ hơn 0" });
    }

    user.reward_points = nextPoints;
    await user.save();

    const rewardLog = await RewardPointLog.create({
      user_id: user._id,
      admin_id: req.user.id,
      type,
      points,
      balance_after: nextPoints,
      reason,
    });

    await writeAuditLog({
      req,
      targetUserId: req.params.id,
      action: "ADJUST_REWARD_POINTS",
      before,
      after: pickAuditFields(user),
      reason,
    });

    return res.json({
      success: true,
      message: type === "add" ? "Đã cộng điểm thưởng" : "Đã trừ điểm thưởng",
      data: sanitizeUser(user),
      reward_log: rewardLog,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const forceResetPassword = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "ID người dùng không hợp lệ" });
    }

    const user = await User.findOne({ _id: req.params.id, deleted_at: null });
    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    }

    const otp = String(randomInt(100000, 1000000));
    user.password_reset_otp = await hashPassword(otp);
    user.password_reset_expires_at = new Date(Date.now() + RESET_OTP_TTL_MS);
    user.password_reset_attempts = 0;
    await user.save();

    await writeAuditLog({
      req,
      targetUserId: req.params.id,
      action: "FORCE_RESET_PASSWORD",
      before: null,
      after: { password_reset_expires_at: user.password_reset_expires_at },
      reason: req.body.reason,
    });

    const payload = {
      success: true,
      message: "Đã tạo yêu cầu đặt lại mật khẩu cho người dùng",
    };

    if (process.env.NODE_ENV !== "production") {
      payload.dev_otp = otp;
    }

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
