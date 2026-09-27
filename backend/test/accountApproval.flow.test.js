import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import AccountChangeRequest from "../src/models/AccountChangeRequest.js";
import AuditLog from "../src/models/AuditLog.js";
import RewardPointLog from "../src/models/RewardPointLog.js";
import User from "../src/models/User.js";
import { approveAccountChange, requestAccountChange } from "../src/services/accountApprovalService.js";
import { authMiddleware } from "../src/middleware/authMiddleware.js";
import { signJwt } from "../src/utils/jwt.js";
import { forgotPassword, resetPassword } from "../src/controllers/authControllers.js";

const ids = Array.from({ length: 4 }, () => new mongoose.Types.ObjectId());
const [adminA, adminB, , targetId] = ids;
const sessionQuery = (value) => ({ session: async () => value });
const patch = async (patches, work) => {
  const old = patches.map(([object, key, value]) => { const previous = object[key]; object[key] = value; return [object, key, previous]; });
  try { return await work(); } finally { old.reverse().forEach(([object, key, value]) => { object[key] = value; }); }
};

test("self-change starts with zero approvals and needs two other active admins", async () => {
  const target = { _id: adminA, role: "admin", account_status: "active", full_name: "Admin A" };
  await patch([
    [User, "findOne", async ({ _id }) => String(_id) === String(adminA) ? target : null],
    [User, "countDocuments", async () => 2],
    [AccountChangeRequest, "updateMany", async () => ({ modifiedCount: 0 })],
    [AccountChangeRequest, "findOne", async () => null],
    [AccountChangeRequest, "create", async (data) => data],
  ], async () => {
    const request = await requestAccountChange({ targetId: adminA, requesterId: adminA, kind: "profile", changes: { full_name: "Admin A mới" }, reason: "Cập nhật" });
    assert.equal(request.approvals.length, 0);
    assert.equal(request.changes.full_name, "Admin A mới");
  });
});

test("self-change fails closed when fewer than two other admins exist", async () => {
  const target = { _id: adminA, role: "admin", account_status: "active" };
  await patch([
    [User, "findOne", async () => target],
    [User, "countDocuments", async () => 1],
  ], async () => {
    await assert.rejects(
      requestAccountChange({ targetId: adminA, requesterId: adminA, kind: "password_change", reason: "Đổi mật khẩu" }),
      (error) => error.statusCode === 409 && /hai admin khác/.test(error.message),
    );
  });
});

test("a second distinct admin approval applies a pending user profile change once", async () => {
  const target = { _id: targetId, role: "user", account_status: "active", full_name: "Tên cũ" };
  const request = {
    _id: new mongoose.Types.ObjectId(), target_user_id: targetId, requested_by: adminA,
    kind: "profile", status: "pending", expires_at: new Date(Date.now() + 60_000),
    before: { full_name: "Tên cũ", role: "user", account_status: "active" },
    changes: { full_name: "Tên mới" }, approvals: [{ admin_id: adminA, approved_at: new Date() }], reason: "Sửa tên",
    async save() {},
  };
  let applied = 0;
  let audited = 0;
  await patch([
    [mongoose, "startSession", async () => ({ async withTransaction(work) { return work(); }, async endSession() {} })],
    [AccountChangeRequest, "findById", () => sessionQuery(request)],
    [User, "findOne", ({ _id }) => sessionQuery(String(_id) === String(adminB) ? { _id: adminB, role: "admin" } : target)],
    [User, "find", () => sessionQuery([{ _id: adminA }, { _id: adminB }])],
    [User, "updateOne", async (_filter, update) => { applied += 1; assert.equal(update.$set.full_name, "Tên mới"); return { matchedCount: 1 }; }],
    [AuditLog, "create", async () => { audited += 1; }],
  ], async () => {
    const result = await approveAccountChange({ requestId: request._id, reviewerId: adminB, passwordValid: true });
    assert.equal(result.status, "applied");
    assert.equal(result.approvals.length, 2);
    assert.equal(applied, 1);
    assert.equal(audited, 1);
  });
});

test("reward points change only after the second admin approves and writes a log", async () => {
  const target = { _id: targetId, role: "user", account_status: "active", reward_points: 100 };
  const request = {
    _id: new mongoose.Types.ObjectId(), target_user_id: targetId, requested_by: adminA,
    kind: "reward_adjustment", status: "pending", expires_at: new Date(Date.now() + 60_000),
    before: { reward_points: 100, role: "user", account_status: "active" },
    changes: { type: "subtract", points: 40 }, approvals: [{ admin_id: adminA, approved_at: new Date() }], reason: "Sửa điểm",
    async save() {},
  };
  let balance;
  let log;
  await patch([
    [mongoose, "startSession", async () => ({ async withTransaction(work) { return work(); }, async endSession() {} })],
    [AccountChangeRequest, "findById", () => sessionQuery(request)],
    [User, "findOne", ({ _id }) => sessionQuery(String(_id) === String(adminB) ? { _id: adminB, role: "admin" } : target)],
    [User, "find", () => sessionQuery([{ _id: adminA }, { _id: adminB }])],
    [User, "updateOne", async (_filter, update) => { balance = update.$set.reward_points; return { matchedCount: 1 }; }],
    [RewardPointLog, "create", async ([entry]) => { log = entry; }],
    [AuditLog, "create", async () => {}],
  ], async () => {
    const result = await approveAccountChange({ requestId: request._id, reviewerId: adminB, passwordValid: true });
    assert.equal(result.status, "applied");
    assert.equal(balance, 60);
    assert.equal(log.balance_after, 60);
    assert.equal(log.type, "subtract");
  });
});

test("admin cannot approve a change targeting their own admin account", async () => {
  const request = { _id: new mongoose.Types.ObjectId(), target_user_id: adminA, status: "pending", expires_at: new Date(Date.now() + 60_000) };
  await patch([
    [mongoose, "startSession", async () => ({ async withTransaction(work) { return work(); }, async endSession() {} })],
    [AccountChangeRequest, "findById", () => sessionQuery(request)],
    [User, "findOne", ({ _id }) => sessionQuery({ _id, role: "admin" })],
  ], async () => {
    await assert.rejects(
      approveAccountChange({ requestId: request._id, reviewerId: adminA, passwordValid: true }),
      (error) => error.statusCode === 403,
    );
  });
});

test("authorization uses role even when a stale role_id still says admin", async () => {
  const token = signJwt({ id: String(targetId) });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return value; } };
  let called = false;
  await patch([
    [User, "findOne", () => ({ select: async () => ({ _id: targetId, role: "user", role_id: 1, account_status: "active", status: true }) })],
  ], async () => authMiddleware(req, res, () => { called = true; }));
  assert.equal(called, true);
  assert.equal(req.user.role, "user");
});

test("admin recovery does not issue OTP before an approved request exists", async () => {
  const admin = { _id: adminA, role: "admin", email: "admin@example.com", account_status: "active" };
  const makeResponse = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return body; } });
  await patch([
    [User, "findOne", async () => admin],
    [AccountChangeRequest, "findOne", async () => null],
  ], async () => {
    const forgotResponse = makeResponse();
    await forgotPassword({ body: { email: admin.email } }, forgotResponse);
    assert.equal(forgotResponse.statusCode, 200);

    const resetResponse = makeResponse();
    await resetPassword({ body: {
      email: admin.email, otp: "123456", password: "NewPassword123", confirm_password: "NewPassword123",
    } }, resetResponse);
    assert.equal(resetResponse.statusCode, 403);
  });
});
