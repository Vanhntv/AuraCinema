import assert from "node:assert/strict";
import test from "node:test";
import User from "../src/models/User.js";
import {
  forceResetPassword,
  getForbiddenAdminProfileFields,
  updateUserBasicInfo,
  updateUserStatus,
} from "../src/controllers/usersControllers.js";

const ADMIN_ID = "507f1f77bcf86cd799439011";
const ACTOR_ID = "507f1f77bcf86cd799439012";
const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return body; },
});

test("admin profile policy only permits the four basic fields", () => {
  assert.deepEqual(getForbiddenAdminProfileFields({
    full_name: "Admin mới",
    phone: "0900000000",
    birth_date: "1990-01-01",
    gender: "other",
  }), []);
  assert.deepEqual(getForbiddenAdminProfileFields({ email: "new@example.com", role: "user", account_status: "banned" }), [
    "email",
    "role",
    "account_status",
  ]);
});

test("admin management endpoints reject forbidden admin account operations", async () => {
  const originalFindOne = User.findOne;
  User.findOne = async () => ({ _id: ADMIN_ID, role: "admin" });
  try {
    const editResponse = makeResponse();
    await updateUserBasicInfo({
      params: { id: ADMIN_ID },
      body: { email: "changed@example.com" },
      user: { id: ACTOR_ID },
    }, editResponse);
    assert.equal(editResponse.statusCode, 403);

    const statusResponse = makeResponse();
    await updateUserStatus({
      params: { id: ADMIN_ID },
      body: { account_status: "banned" },
      user: { id: ACTOR_ID },
    }, statusResponse);
    assert.equal(statusResponse.statusCode, 403);

    const resetResponse = makeResponse();
    await forceResetPassword({
      params: { id: ADMIN_ID },
      body: {},
      user: { id: ACTOR_ID },
    }, resetResponse);
    assert.equal(resetResponse.statusCode, 403);
  } finally {
    User.findOne = originalFindOne;
  }
});
