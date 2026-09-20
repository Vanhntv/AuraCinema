import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  LEGACY_LOGIN_PATH,
  LOGIN_PATH,
  getLegacyLoginRedirect,
} from "./authRoutes.js";

test("legacy login URL redirects to the canonical Vietnamese URL", () => {
  const state = {
    from: { pathname: "/admin/dashboard", search: "?tab=movies" },
    message: "Vui lòng đăng nhập bằng tài khoản quản trị để vào trang admin.",
  };

  assert.equal(LEGACY_LOGIN_PATH, "/login");
  assert.deepEqual(
    getLegacyLoginRedirect({
      search: "?source=legacy",
      hash: "#login-form",
      state,
    }),
    {
      state,
      to: {
        pathname: LOGIN_PATH,
        search: "?source=legacy",
        hash: "#login-form",
      },
    },
  );
});

test("admin authentication styles cannot override public auth components", async () => {
  const adminCss = await readFile(
    new URL("../admin/admin.css", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(
    adminCss,
    /(^|\n)\s*\.auth-(?:page|card|form|submit|alert|switch|loading)\b/m,
  );
  assert.match(adminCss, /\.admin-auth-submit\b/);
});
