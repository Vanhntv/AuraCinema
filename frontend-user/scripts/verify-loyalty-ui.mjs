import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const baseURL = process.env.UI_BASE_URL || "http://localhost:5173";
const screenshots = process.env.UI_SCREENSHOTS || join(tmpdir(), "aura-loyalty-ui");
await mkdir(screenshots, { recursive: true });
const future = "2027-12-31T16:59:59.000Z";
const user = { _id: "507f1f77bcf86cd799439011", full_name: "Nguyễn Minh Anh", email: "member@example.test", role: "user", account_status: "active", status: true };
const voucher = { _id: "507f1f77bcf86cd799439012", id: "507f1f77bcf86cd799439012", name: "Ưu đãi vé và bắp nước dành cho thành viên", code: "AW12345678901234567890", discount_type: "fixed", discount_value: 50000, min_order: 150000, apply_scope: "order", quantity: 5, end_date: future, terms_and_conditions: "Mỗi đơn sử dụng một voucher. Không quy đổi thành tiền mặt." };
const walletItem = { id: "owned-1", status: "available", expires_at: future, voucher };
let role = "user";
let redeemed = false;
let errorMode = false;
let grants = [];
const context = await browser.newContext();
await context.addInitScript(() => localStorage.setItem("accessToken", "ui-fixture-token"));
await context.route("**/api/**", async route => {
  const url = new URL(route.request().url());
  if (!url.pathname.startsWith("/api/")) return route.continue();
  let body = { success: true, data: [], pagination: { page: 1, totalPages: 1 } };
  if (url.pathname === "/api/auth/profile") body.data = { ...user, role };
  if (url.pathname === "/api/loyalty/membership") body.data = { code: "AMC1234567890123456", label: "VIP", tier: "vip", active: true, available_points: redeemed ? 441 : 541, points_debt: 0, spent: 5439002, progress: 54, next: "VVIP", remaining: 4560998, activated_at: "2026-07-22", redemption_enabled: true };
  if (url.pathname === "/api/loyalty/points") {
    if (errorMode) return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Không thể tải lịch sử điểm." }) });
    body = { success: true, data: [{ _id: "log-1", type: url.searchParams.get("type") || "earn", points: 123, balance_after: 541, occurred_at: "2026-09-11T12:00:00Z", booking_id: { booking_code: "AURA12345678901234567890" } }], pagination: { page: Number(url.searchParams.get("page") || 1), totalPages: 2 } };
  }
  if (url.pathname === "/api/loyalty/rewards" || url.pathname === "/api/loyalty/admin/rewards") body.data = [{ _id: "offer-1", voucher_id: voucher, points_cost: 100, available: true, active: true, remaining: 5 }];
  if (url.pathname.endsWith("/redeem")) { redeemed = true; body.data = { _id: "owned-2", code: voucher.code, snapshot: voucher, expires_at: future }; }
  if (url.pathname === "/api/vouchers/my-wallet") body.data = [walletItem, { ...walletItem, id: "owned-used", status: "used" }, { ...walletItem, id: "owned-expired", status: "expired" }];
  if (url.pathname === "/api/vouchers") body = { success: true, data: [voucher], pagination: { page: 1, totalPages: 1, totalItems: 1 } };
  if (url.pathname.endsWith("/stats")) body.data = {};
  if (url.pathname === "/api/loyalty/admin/grants") body.data = grants;
  if (url.pathname.endsWith("/grants/preview")) body.data = { id: "grant-1", count: 1 };
  if (url.pathname.endsWith("/grant-1/confirm")) { grants = [{ _id: "grant-1", voucher_id: voucher, count: 1, admin_id: { full_name: "Admin" }, completed_at: new Date().toISOString() }]; body.data = grants[0]; }
  await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "no page overflow");
try {
  for (const [name, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]]) {
    await page.setViewportSize(viewport);
    for (const tab of ["member", "points", "vouchers"]) {
      await page.goto(`${baseURL}/tai-khoan?tab=${tab}`);
      await page.locator(".loyalty-surface[aria-busy=false]").waitFor();
      await noOverflow();
      await page.screenshot({ path: join(screenshots, `${name}-${tab}.png`), fullPage: true });
      if (tab === "member") assert.match(await page.locator(".loyalty-member-card").innerText(), /AMC123/);
      if (tab === "points") {
        await page.getByRole("button", { name: "Trang sau", exact: true }).click();
        await page.locator(".loyalty-surface[aria-busy=false]").waitFor();
        assert.match(await page.locator(".loyalty-pagination").innerText(), /2 \/ 2/);
        await page.getByLabel("Loại giao dịch").selectOption("redeem");
        await page.locator(".loyalty-surface[aria-busy=false]").waitFor();
        assert.match(await page.locator(".loyalty-pagination").innerText(), /1 \/ 2/);
        await page.getByRole("button", { name: "Đổi voucher", exact: true }).click();
        await page.getByRole("dialog").waitFor();
        await page.screenshot({ path: join(screenshots, `${name}-redeem.png`) });
        await page.getByRole("button", { name: "Xác nhận đổi", exact: true }).click();
        await page.getByText("Đổi voucher thành công.", { exact: true }).waitFor();
        assert.match(page.url(), /tab=vouchers/);
        await page.keyboard.press("Escape");
        assert.equal(await page.locator("dialog[open]").count(), 0);
      }
      if (tab === "vouchers") {
        await page.locator("button.loyalty-item").first().click();
        await page.getByRole("dialog").waitFor();
        await noOverflow();
        const bounds = await page.getByRole("dialog").boundingBox();
        assert.ok(bounds.width <= viewport.width && bounds.height <= viewport.height);
        await page.screenshot({ path: join(screenshots, `${name}-voucher-detail.png`) });
        await page.keyboard.press("Escape");
        await page.getByRole("button", { name: "Đã sử dụng (1)", exact: true }).click();
        assert.equal(await page.locator("button.loyalty-item").count(), 1);
      }
    }
  }
  errorMode = true;
  await page.goto(`${baseURL}/tai-khoan?tab=points`);
  await page.getByRole("button", { name: "Thử lại", exact: true }).waitFor();
  errorMode = false;
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await page.locator(".loyalty-surface[aria-busy=false]").waitFor();
  role = "admin";
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseURL}/admin/vouchers`);
  await page.locator(".loyalty-admin summary").click();
  await page.locator(".loyalty-admin").getByRole("button", { name: "Xem trước" }).waitFor();
  const form = page.locator(".loyalty-admin form").nth(1);
  await form.getByLabel("Chương trình voucher").selectOption(voucher._id);
  await form.getByLabel("Email").fill("member@example.test");
  await form.getByRole("button", { name: "Xem trước" }).click();
  await page.getByRole("button", { name: "Xác nhận cấp voucher", exact: true }).click();
  await page.getByText("Đã cấp voucher cho 1 thành viên.", { exact: true }).waitFor();
  await page.screenshot({ path: join(screenshots, "desktop-admin.png"), fullPage: true });
  assert.deepEqual(errors, []);
  console.log(`Loyalty UI passed; screenshots: ${screenshots}`);
} catch (error) {
  console.error(JSON.stringify({ url: page.url(), errors, body: (await page.locator("body").innerText()).slice(0, 3000) }));
  await page.screenshot({ path: join(screenshots, "failure.png"), fullPage: true });
  throw error;
} finally { await browser.close(); }
