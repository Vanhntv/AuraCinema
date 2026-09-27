import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import test from "node:test";
import mongoose from "mongoose";
import AccountChangeRequest from "../src/models/AccountChangeRequest.js";
import AuditLog from "../src/models/AuditLog.js";
import RewardPointLog from "../src/models/RewardPointLog.js";
import User from "../src/models/User.js";
import { approveAccountChange, rejectAccountChange, requestAccountChange } from "../src/services/accountApprovalService.js";
import { authMiddleware } from "../src/middleware/authMiddleware.js";
import { signJwt } from "../src/utils/jwt.js";
import { changePassword, verifyPassword } from "../src/controllers/authControllers.js";

const ids = Array.from({ length: 4 }, () => new mongoose.Types.ObjectId());
const [adminA, adminB, , targetId] = ids;
const sessionQuery = (value) => ({ session: async () => value });
const serialSessionQuery = () => {
  let active = 0;
  return (value) => ({ session: async () => {
    active += 1;
    try {
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(active, 1, "transaction queries must run sequentially");
      return value;
    } finally {
      active -= 1;
    }
  } });
};
const patch = async (patches, work) => {
  const old = patches.map(([object, key, value]) => { const previous = object[key]; object[key] = value; return [object, key, previous]; });
  try { return await work(); } finally { old.reverse().forEach(([object, key, value]) => { object[key] = value; }); }
};

test("self-change starts as a proposal and needs one other active admin", async () => {
  const target = { _id: adminA, role: "admin", account_status: "active", full_name: "Admin A" };
  await patch([
    [User, "findOne", async ({ _id }) => String(_id) === String(adminA) ? target : null],
    [User, "countDocuments", async () => 1],
    [AccountChangeRequest, "updateMany", async () => ({ modifiedCount: 0 })],
    [AccountChangeRequest, "findOne", async () => null],
    [AccountChangeRequest, "create", async (data) => data],
  ], async () => {
    const request = await requestAccountChange({ targetId: adminA, requesterId: adminA, kind: "profile", changes: { full_name: "Admin A mới" }, reason: "Cập nhật" });
    assert.equal(request.approvals.length, 0);
    assert.equal(request.changes.full_name, "Admin A mới");
  });
});

test("self-change fails closed when no other admin exists", async () => {
  const target = { _id: adminA, role: "admin", account_status: "active" };
  await patch([
    [User, "findOne", async () => target],
    [User, "countDocuments", async () => 0],
  ], async () => {
    await assert.rejects(
      requestAccountChange({ targetId: adminA, requesterId: adminA, kind: "profile", changes: { full_name: "Tên mới" }, reason: "Đổi tên" }),
      (error) => error.statusCode === 409 && /một admin khác/.test(error.message),
    );
  });
});

test("admin changes their own password immediately after confirming the current password", async () => {
  const oldPassword = "OldPassword123";
  const newPassword = "NewPassword456";
  const salt = "admin-password-test-salt";
  const user = {
    _id: adminA, role: "admin", password: `${salt}:${scryptSync(oldPassword, salt, 64).toString("hex")}`,
    async save() { this.saved = true; },
  };
  const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return body; } });
  await patch([
    [User, "findOne", async () => user],
    [AccountChangeRequest, "create", async () => { throw new Error("Password change must not create an approval request"); }],
  ], async () => {
    const invalid = response();
    await changePassword({ user: { id: String(adminA) }, body: { current_password: "wrong", password: newPassword, confirm_password: newPassword } }, invalid);
    assert.equal(invalid.statusCode, 401);
    assert.equal(user.saved, undefined);

    const valid = response();
    await changePassword({ user: { id: String(adminA) }, body: { current_password: oldPassword, password: newPassword, confirm_password: newPassword } }, valid);
    assert.equal(valid.statusCode, 200);
    assert.equal(user.saved, true);
    assert.equal(await verifyPassword(newPassword, user.password), true);
    assert.ok(user.password_changed_at instanceof Date);
  });
});

test("one admin other than the proposer applies a pending user profile change once", async () => {
  const target = { _id: targetId, role: "user", account_status: "active", full_name: "Tên cũ" };
  const request = {
    _id: new mongoose.Types.ObjectId(), target_user_id: targetId, requested_by: adminA,
    kind: "profile", status: "pending", expires_at: new Date(Date.now() + 60_000),
    before: { full_name: "Tên cũ", role: "user", account_status: "active" },
    changes: { full_name: "Tên mới" }, approvals: [], reason: "Sửa tên",
    async save() {},
  };
  let applied = 0;
  let audited = 0;
  const query = serialSessionQuery();
  await patch([
    [mongoose, "startSession", async () => ({ async withTransaction(work) { return work(); }, async endSession() {} })],
    [AccountChangeRequest, "findById", () => query(request)],
    [User, "findOne", ({ _id }) => query(String(_id) === String(targetId) ? target : { _id, role: "admin" })],
    [User, "updateOne", async (_filter, update) => { applied += 1; assert.equal(update.$set.full_name, "Tên mới"); return { matchedCount: 1 }; }],
    [AuditLog, "create", async () => { audited += 1; }],
  ], async () => {
    const result = await approveAccountChange({ requestId: request._id, reviewerId: adminB, passwordValid: true });
    assert.equal(result.status, "applied");
    assert.equal(result.approvals.length, 1);
    assert.equal(applied, 1);
    assert.equal(audited, 1);
  });
});

test("one other admin can approve an admin's own profile proposal", async () => {
  const target = { _id: adminA, role: "admin", account_status: "active", full_name: "Admin A" };
  const request = {
    _id: new mongoose.Types.ObjectId(), target_user_id: adminA, requested_by: adminA,
    kind: "profile", status: "pending", expires_at: new Date(Date.now() + 60_000),
    before: { full_name: "Admin A", role: "admin", account_status: "active" },
    changes: { full_name: "Admin A mới" }, approvals: [], reason: "Cập nhật tên",
    async save() {},
  };
  let changedName;
  await patch([
    [mongoose, "startSession", async () => ({ async withTransaction(work) { return work(); }, async endSession() {} })],
    [AccountChangeRequest, "findById", () => sessionQuery(request)],
    [User, "findOne", ({ _id }) => sessionQuery(String(_id) === String(adminA) ? target : { _id, role: "admin" })],
    [User, "updateOne", async (_filter, update) => { changedName = update.$set.full_name; return { matchedCount: 1 }; }],
    [AuditLog, "create", async () => {}],
  ], async () => {
    const result = await approveAccountChange({ requestId: request._id, reviewerId: adminB, passwordValid: true });
    assert.equal(result.status, "applied");
    assert.equal(result.approvals.length, 1);
    assert.equal(changedName, "Admin A mới");
  });
});

test("reward points change only after another admin approves and writes a log", async () => {
  const target = { _id: targetId, role: "user", account_status: "active", reward_points: 100 };
  const request = {
    _id: new mongoose.Types.ObjectId(), target_user_id: targetId, requested_by: adminA,
    kind: "reward_adjustment", status: "pending", expires_at: new Date(Date.now() + 60_000),
    before: { reward_points: 100, role: "user", account_status: "active" },
    changes: { type: "subtract", points: 40 }, approvals: [], reason: "Sửa điểm",
    async save() {},
  };
  let balance;
  let log;
  await patch([
    [mongoose, "startSession", async () => ({ async withTransaction(work) { return work(); }, async endSession() {} })],
    [AccountChangeRequest, "findById", () => sessionQuery(request)],
    [User, "findOne", ({ _id }) => sessionQuery(String(_id) === String(targetId) ? target : { _id, role: "admin" })],
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
  const request = { _id: new mongoose.Types.ObjectId(), requested_by: adminB, target_user_id: adminA, status: "pending", expires_at: new Date(Date.now() + 60_000) };
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

test("proposer cannot approve their own proposal for another user", async () => {
  const request = { _id: new mongoose.Types.ObjectId(), requested_by: adminA, target_user_id: targetId, status: "pending", expires_at: new Date(Date.now() + 60_000) };
  await patch([
    [mongoose, "startSession", async () => ({ async withTransaction(work) { return work(); }, async endSession() {} })],
    [AccountChangeRequest, "findById", () => sessionQuery(request)],
    [User, "findOne", ({ _id }) => sessionQuery({ _id, role: String(_id) === String(targetId) ? "user" : "admin" })],
  ], async () => {
    await assert.rejects(
      approveAccountChange({ requestId: request._id, reviewerId: adminA, passwordValid: true }),
      (error) => error.statusCode === 403 && /tạo đề xuất/.test(error.message),
    );
  });
});

test("a different admin rejects a pending request and records an audit in the same transaction", async () => {
  const request = {
    _id: new mongoose.Types.ObjectId(), requested_by: adminA, target_user_id: targetId,
    status: "pending", async save({ session }) { assert.equal(session, activeSession); },
  };
  const activeSession = { async withTransaction(work) { return work(); }, async endSession() {} };
  let audit;
  const query = serialSessionQuery();
  await patch([
    [mongoose, "startSession", async () => activeSession],
    [AccountChangeRequest, "findById", () => query(request)],
    [User, "findOne", () => query({ _id: adminB, role: "admin" })],
    [AuditLog, "create", async ([entry], { session }) => { assert.equal(session, activeSession); audit = entry; }],
  ], async () => {
    const result = await rejectAccountChange({ requestId: request._id, reviewerId: adminB, reason: "Không phù hợp" });
    assert.equal(result.status, "rejected");
    assert.equal(String(result.rejected_by), String(adminB));
    assert.equal(audit.action, "REJECT_ACCOUNT_CHANGE");
    assert.equal(audit.reason, "Không phù hợp");
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

test("password recovery no longer creates approval requests", async () => {
  await assert.rejects(
    requestAccountChange({ targetId: adminA, requesterId: adminA, kind: "password_reset", reason: "Quên mật khẩu" }),
    (error) => error.statusCode === 400 && /Loại yêu cầu/.test(error.message),
  );
});
