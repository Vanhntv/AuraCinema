import mongoose from "mongoose";
import AccountChangeRequest from "../models/AccountChangeRequest.js";
import AuditLog from "../models/AuditLog.js";
import RewardPointLog from "../models/RewardPointLog.js";
import User from "../models/User.js";
import { withTransaction } from "./transactionService.js";

export const APPROVAL_TTL_MS = 24 * 60 * 60 * 1000;
const error = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const activeAdmin = { role: "admin", deleted_at: null, account_status: "active", status: true, email_verification_required: { $ne: true } };
const same = (first, second) => JSON.stringify(first ?? null) === JSON.stringify(second ?? null);
const snapshot = (user, keys) => Object.fromEntries(keys.map((key) => [key, user[key] ?? null]));
const id = (value) => String(value?._id || value || "");

export const requestAccountChange = async ({ targetId, requesterId, kind, changes = {}, reason }) => {
  if (!mongoose.Types.ObjectId.isValid(targetId)) throw error("Tài khoản không hợp lệ");
  const requestReason = String(reason || "").trim();
  if (!requestReason) throw error("Vui lòng nhập lý do thay đổi");
  if (!["profile", "status", "password_reset", "password_change", "reward_adjustment"].includes(kind)) throw error("Loại yêu cầu không hợp lệ");
  if (["profile", "status"].includes(kind) && !Object.keys(changes).length) throw error("Không có thay đổi nào để phê duyệt");
  if (kind === "reward_adjustment" && (!["add", "subtract"].includes(changes.type) || !Number.isSafeInteger(changes.points) || changes.points <= 0)) throw error("Điểm điều chỉnh không hợp lệ");

  const [target, requester] = await Promise.all([
    User.findOne({ _id: targetId, deleted_at: null }),
    User.findOne({ _id: requesterId, ...activeAdmin }),
  ]);
  if (!target) throw error("Không tìm thấy tài khoản", 404);
  if (!requester) throw error("Tài khoản yêu cầu không còn quyền admin", 403);
  if (kind === "reward_adjustment" && target.role === "admin") throw error("Không được điều chỉnh điểm của tài khoản admin", 403);

  const targetIsAdmin = target.role === "admin";
  const eligibleCount = await User.countDocuments({
    ...activeAdmin,
    ...(targetIsAdmin ? { _id: { $ne: target._id } } : {}),
  });
  if (eligibleCount < 2) throw error(targetIsAdmin
    ? "Cần ít nhất hai admin khác tài khoản này đang hoạt động để phê duyệt"
    : "Cần ít nhất hai admin đang hoạt động để phê duyệt", 409);

  await AccountChangeRequest.updateMany(
    { target_user_id: target._id, kind, status: { $in: ["pending", "approved"] }, expires_at: { $lte: new Date() } },
    { $set: { status: "expired" } },
  );
  const existing = await AccountChangeRequest.findOne({
    target_user_id: target._id,
    kind,
    status: { $in: ["pending", "approved"] },
    expires_at: { $gt: new Date() },
  });
  if (existing) throw error("Tài khoản đã có yêu cầu cùng loại đang chờ xử lý", 409);

  const before = kind === "reward_adjustment"
    ? snapshot(target, ["reward_points", "role", "account_status"])
    : kind === "password_change" || kind === "password_reset"
    ? snapshot(target, ["password_changed_at", "role", "account_status"])
    : snapshot(target, [...Object.keys(changes), "role", "account_status"]);
  const initialApprovals = id(requester) === id(target)
    ? []
    : [{ admin_id: requester._id, approved_at: new Date() }];
  try {
    return await AccountChangeRequest.create({
      target_user_id: target._id,
      requested_by: requester._id,
      kind,
      changes,
      before,
      approvals: initialApprovals,
      reason: requestReason,
      expires_at: new Date(Date.now() + APPROVAL_TTL_MS),
    });
  } catch (requestError) {
    if (requestError.code === 11000) throw error("Tài khoản đã có yêu cầu cùng loại đang chờ xử lý", 409);
    throw requestError;
  }
};

export const listAccountChangeRequests = async ({ status, targetId } = {}) => {
  await AccountChangeRequest.updateMany(
    { status: { $in: ["pending", "approved"] }, expires_at: { $lte: new Date() } },
    { $set: { status: "expired" } },
  );
  const filter = {};
  if (status && ["pending", "approved", "applied", "rejected", "expired"].includes(status)) filter.status = status;
  if (targetId && mongoose.Types.ObjectId.isValid(targetId)) filter.target_user_id = targetId;
  return AccountChangeRequest.find(filter)
    .populate("target_user_id", "full_name email role account_status")
    .populate("requested_by", "full_name email")
    .populate("approvals.admin_id", "full_name email")
    .sort({ created_at: -1 }).limit(100);
};

export const approveAccountChange = async ({ requestId, reviewerId, passwordValid }) => {
  if (!passwordValid) throw error("Mật khẩu xác nhận không đúng", 401);
  return withTransaction(async (session) => {
    const request = await AccountChangeRequest.findById(requestId).session(session);
    if (!request) throw error("Không tìm thấy yêu cầu", 404);
    if (request.status !== "pending") throw error("Yêu cầu không còn chờ phê duyệt", 409);
    if (request.expires_at <= new Date()) throw error("Yêu cầu đã hết hạn", 410);

    const [reviewer, target] = await Promise.all([
      User.findOne({ _id: reviewerId, ...activeAdmin }).session(session),
      User.findOne({ _id: request.target_user_id, deleted_at: null }).session(session),
    ]);
    if (!reviewer) throw error("Bạn không còn quyền admin", 403);
    if (!target) throw error("Tài khoản đích không còn tồn tại", 409);
    if (target.role === "admin" && id(target) === id(reviewer)) throw error("Không thể tự phê duyệt thay đổi tài khoản admin", 403);
    if (request.approvals.some((item) => id(item.admin_id) === id(reviewer))) throw error("Admin này đã phê duyệt yêu cầu", 409);
    if (Object.entries(request.before || {}).some(([key, value]) => !same(target[key], value))) {
      throw error("Thông tin tài khoản đã thay đổi; vui lòng tạo yêu cầu mới", 409);
    }

    request.approvals.push({ admin_id: reviewer._id, approved_at: new Date() });
    if (request.approvals.length >= 2) {
      const approvers = await User.find({
        _id: { $in: request.approvals.map((item) => item.admin_id) },
        ...activeAdmin,
      }).session(session);
      if (approvers.length !== 2) throw error("Một trong hai admin không còn quyền phê duyệt", 409);
      if (target.role === "admin" && approvers.some((admin) => id(admin) === id(target))) throw error("Không thể tự phê duyệt", 403);

      if (request.kind === "reward_adjustment") {
        if (target.role === "admin") throw error("Không được điều chỉnh điểm của tài khoản admin", 403);
        const { type, points } = request.changes;
        const currentPoints = Number(target.reward_points || 0);
        const nextPoints = type === "add" ? currentPoints + points : currentPoints - points;
        if (!Number.isSafeInteger(nextPoints) || nextPoints < 0) throw error("Số dư điểm không hợp lệ hoặc không đủ điểm để trừ", 409);
        const result = await User.updateOne({ _id: target._id, deleted_at: null, reward_points: target.reward_points }, { $set: { reward_points: nextPoints } }, { session, runValidators: true });
        if (result.matchedCount !== 1) throw error("Số dư điểm đã thay đổi; vui lòng tạo yêu cầu mới", 409);
        await RewardPointLog.create([{
          user_id: target._id, admin_id: reviewer._id, event_key: `account-approval:${request._id}`,
          type, points, balance_after: nextPoints, reason: request.reason,
        }], { session });
        request.status = "applied";
        request.applied_at = new Date();
      } else if (["profile", "status"].includes(request.kind)) {
        const changes = { ...request.changes };
        if (changes.role === "admin" && target.role !== "admin" && (target.account_status !== "active" || target.status === false || !target.email_verified_at || (changes.email && changes.email !== target.email))) {
          throw error("Chỉ có thể cấp quyền admin cho tài khoản đang hoạt động và đã xác minh email", 409);
        }
        if (changes.account_status === "active" && target.email_verification_required) {
          throw error("Tài khoản phải xác minh email trước khi được kích hoạt", 409);
        }
        if (target.role === "admin" && (changes.role && changes.role !== "admin" || changes.account_status && changes.account_status !== "active")) {
          const activeCount = await User.countDocuments(activeAdmin).session(session);
          if (activeCount < 3) throw error("Cần giữ ít nhất hai admin hoạt động sau thay đổi này", 409);
        }
        if (changes.role && changes.role !== target.role) changes.password_changed_at = new Date(Date.now() + 1000);
        if (changes.email && changes.email !== target.email) {
          Object.assign(changes, {
            email_verified_at: null,
            email_verification_required: true,
            email_verification: null,
            password_recovery: null,
            password_changed_at: new Date(Date.now() + 1000),
          });
          if (changes.account_status !== "banned") Object.assign(changes, { account_status: "unverified", status: false });
        }
        const result = await User.updateOne({ _id: target._id, deleted_at: null }, { $set: changes }, { session, runValidators: true });
        if (result.matchedCount !== 1) throw error("Không thể cập nhật tài khoản", 409);
        request.status = "applied";
        request.applied_at = new Date();
      } else {
        request.status = "approved";
      }
      await AuditLog.create([{
        admin_id: reviewer._id,
        target_user_id: target._id,
        action: `APPROVE_${request.kind.toUpperCase()}`,
        before: request.before,
        after: request.kind === "password_change" || request.kind === "password_reset" ? null : request.changes,
        changes: { request_id: request._id, approver_ids: request.approvals.map((item) => item.admin_id) },
        reason: request.reason,
      }], { session });
    }
    await request.save({ session });
    return request;
  });
};

export const rejectAccountChange = async ({ requestId, reviewerId, reason }) => {
  const rejectionReason = String(reason || "").trim();
  if (!rejectionReason) throw error("Vui lòng nhập lý do từ chối");
  return withTransaction(async (session) => {
    const [request, reviewer] = await Promise.all([
      AccountChangeRequest.findById(requestId).session(session),
      User.findOne({ _id: reviewerId, ...activeAdmin }).session(session),
    ]);
    if (!request) throw error("Không tìm thấy yêu cầu", 404);
    if (!reviewer) throw error("Bạn không còn quyền admin", 403);
    if (request.status !== "pending") throw error("Yêu cầu không còn chờ phê duyệt", 409);
    if (id(request.target_user_id) === id(reviewer)) throw error("Không thể tự xử lý yêu cầu của mình", 403);
    request.status = "rejected";
    request.rejected_by = reviewer._id;
    request.rejected_at = new Date();
    request.rejection_reason = rejectionReason;
    await request.save({ session });
    await AuditLog.create([{ admin_id: reviewer._id, target_user_id: request.target_user_id, action: "REJECT_ACCOUNT_CHANGE", changes: { request_id: request._id }, reason: rejectionReason }], { session });
    return request;
  });
};

export const getApprovedPasswordRequest = async ({ requestId, targetId, kind }) => {
  if (!mongoose.Types.ObjectId.isValid(targetId)) throw error("Tài khoản không hợp lệ", 400);
  const request = await AccountChangeRequest.findOne({
    ...(requestId ? { _id: requestId } : {}),
    target_user_id: targetId,
    kind,
    status: "approved",
    expires_at: { $gt: new Date() },
  });
  if (!request) throw error("Chưa có yêu cầu đổi mật khẩu được hai admin phê duyệt hoặc yêu cầu đã hết hạn", 403);
  return request;
};

export const applyApprovedPasswordChange = async ({ requestId, targetId, passwordHash }) =>
  withTransaction(async (session) => {
    const request = await AccountChangeRequest.findOne({
      _id: requestId, target_user_id: targetId, kind: "password_change", status: "approved", expires_at: { $gt: new Date() },
    }).session(session);
    if (!request) throw error("Yêu cầu đổi mật khẩu chưa được hai admin phê duyệt hoặc đã hết hạn", 403);
    const user = await User.findOne({ _id: targetId, role: "admin", deleted_at: null }).session(session);
    if (!user || !same(user.password_changed_at, request.before?.password_changed_at)) throw error("Mật khẩu đã thay đổi; vui lòng tạo yêu cầu mới", 409);
    user.password = passwordHash;
    user.password_changed_at = new Date(Date.now() + 1000);
    await user.save({ session });
    request.status = "applied";
    request.applied_at = new Date();
    await request.save({ session });
    await AuditLog.create([{
      admin_id: user._id, target_user_id: user._id, action: "APPLY_ADMIN_PASSWORD_CHANGE",
      changes: { request_id: request._id, approver_ids: request.approvals.map((item) => item.admin_id) },
      reason: request.reason,
    }], { session });
    return request;
  });
