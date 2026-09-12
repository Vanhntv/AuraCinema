import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
import mongoose from "mongoose";
import { getMongoUri } from "../config/db.js";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Voucher from "../models/Voucher.js";
import UserVoucher from "../models/UserVoucher.js";
import RewardOffer from "../models/RewardOffer.js";
import RewardPointLog from "../models/RewardPointLog.js";
import VoucherUsage from "../models/VoucherUsage.js";
import { tierForSpend } from "../services/loyaltyPolicy.js";
import { getWallet } from "../services/loyaltyService.js";

const prefix = "TESTLOYALTYV1";
const cases = [
  { key: "new", spent: 0, orders: 0 },
  { key: "near-vip", spent: 2999999, orders: 1 },
  { key: "vip", spent: 3000000, orders: 12 },
  { key: "near-vvip", spent: 9999999, orders: 1 },
  { key: "vvip", spent: 10000000, orders: 1 },
  { key: "debt", spent: 1000000, orders: 1 },
  { key: "review", spent: 1000000, orders: 1 },
].map(item => ({ ...item, email: `loyalty.${item.key}@example.test` }));
const now = new Date();
const day = offset => new Date(now.getTime() + offset * 86400000);
const apply = process.argv.includes("--apply");
const password = process.env.LOYALTY_TEST_PASSWORD || `AuraTest9!${randomBytes(6).toString("hex")}`;

try {
  await mongoose.connect(getMongoUri(), { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 5000 });
  console.log(JSON.stringify({ database: mongoose.connection.name, mode: apply ? "apply" : "preview", accounts: cases.map(c => c.email) }));
  if (apply) {
    const existing = await User.countDocuments({ email: { $in: cases.map(c => c.email) } });
    if (existing) throw new Error("Test accounts already exist. Nothing changed; seed never overwrites existing users.");
    // Demo orders reference a showtime but never allocate seats or change real stock.
    const showtime = await mongoose.connection.db.collection("showtimes").findOne({});
    if (!showtime) throw new Error("A showtime is required for demo order references.");
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const create = async (Model, data) => (await Model.create([data], { session }))[0];
        const templates = {};
        const definitions = [
          { key: "fixed", name: "Giảm 20.000 đồng", cost: 50 },
          { key: "percent", name: "Giảm 10% tối đa 50.000 đồng", cost: 100, discount_type: "percent", discount_value: 10, max_discount_amount: 50000 },
          { key: "food", name: "Ưu đãi bắp nước", cost: 150, apply_scope: "concession" },
          { key: "vip", name: "Chỉ dành cho VIP / VVIP", cost: 300, apply_scope: "member", applicable_member_tiers: ["vip", "vvip"] },
          { key: "empty", name: "Phần thưởng hết số lượng", cost: 50, quantity: 0 },
          { key: "paused", name: "Chương trình tạm ngừng", status: false },
          { key: "future", name: "Ưu đãi chưa bắt đầu", start_date: day(7) },
          { key: "expired", name: "Ưu đãi đã hết hạn", end_date: day(-1) },
          { key: "deleted", name: "Chương trình đã ngừng - giữ lịch sử", deleted_at: now },
        ];
        for (const def of definitions) {
          const { key, cost, ...fields } = def;
          templates[key] = await create(Voucher, {
            code: `${prefix}_${key.toUpperCase()}`, discount_type: "fixed", discount_value: 20000,
            min_order: 100000, quantity: 30, usage_limit: 100, usage_limit_per_user: 10,
            start_date: day(-30), end_date: day(30), personal_only: true,
            ...fields, name: `[TEST LOYALTY] ${def.name}`,
            description: "Dữ liệu thử nghiệm, không phải ưu đãi thương mại.",
            terms_and_conditions: "Chỉ dùng kiểm thử. Một voucher mỗi đơn; kiểm tra giá trị tối thiểu và phạm vi áp dụng.",
          });
          if (cost) await create(RewardOffer, { voucher_id: templates[key]._id, points_cost: cost, active: true });
        }
        for (const scenario of cases) {
          const salt = randomBytes(16).toString("hex");
          const user = await create(User, {
            email: scenario.email, full_name: `[TEST LOYALTY] ${scenario.key}`,
            password: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
            role: "user", status: true, account_status: "active",
          });
          let balance = 0;
          const orders = [];
          const log = async (type, points, extras = {}) => {
            balance += ["subtract", "redeem"].includes(type) ? -points : points;
            await create(RewardPointLog, {
              user_id: user._id, type, points, balance_after: balance,
              event_key: `${prefix}:${scenario.key}:${type}:${orders.length}:${balance}`,
              reason: "[TEST LOYALTY] Giao dịch mô phỏng", occurred_at: now, ...extras,
            });
          };
          for (let i = 0; i < scenario.orders; i++) {
            const amount = Math.floor(scenario.spent / scenario.orders) + (i === 0 ? scenario.spent % scenario.orders : 0);
            const paidAt = day(-20 + i);
            const points = Math.floor(amount / 10000);
            const booking = await create(Booking, {
              booking_code: `${prefix}_${scenario.key}_${i}`, user_id: user._id, showtime_id: showtime._id,
              customer_name: user.full_name, customer_email: user.email,
              movie_snapshot: { title: "[TEST LOYALTY] Đơn mô phỏng - không giữ ghế" },
              subtotal_price: amount, total_price: amount, pricing: { subtotal: amount, total: amount, ticket_subtotal: amount },
              status: "confirmed", payment_status: "paid", payment_provider: "test-fixture",
              paid_at: paidAt, created_at: paidAt,
              reward_points_earned: points, reward_points_credited_at: paidAt,
            });
            orders.push(booking);
            await log("earn", points, { booking_id: booking._id, occurred_at: paidAt });
          }
          const issue = async (key, extras = {}) => {
            const template = templates[key];
            const item = await create(UserVoucher, {
              user_id: user._id, voucher_id: template._id, source: "admin",
              issue_key: `${prefix}:${scenario.key}:${key}:${extras.status || "available"}`,
              snapshot: template.toObject(), expires_at: template.end_date, ...extras,
            });
            await Voucher.updateOne({ _id: template._id }, { $inc: { allocated_count: 1, quantity: -1 } }, { session });
            return item;
          };
          if (scenario.key === "vip") {
            for (const key of ["percent", "food", "vip", "paused", "future", "expired", "deleted"]) await issue(key);
            const redeemed = await issue("fixed", { source: "redeem" });
            await log("redeem", 50, { user_voucher_id: redeemed._id });
            const booking = orders.at(-1);
            const used = await issue("fixed", { status: "used", booking_id: booking._id, used_at: booking.paid_at });
            await VoucherUsage.create([{
              user_voucher_id: used._id, voucher_id: templates.fixed._id, booking_id: booking._id,
              user_id: user._id, code: used.code, discount_type: "fixed", discount_value: 20000,
              apply_scope: "order", subtotal_price: 270000, eligible_amount: 270000,
              discount_amount: 20000, final_price: 250000, status: "used", payment_status: "paid", used_at: booking.paid_at,
            }], { session });
            booking.subtotal_price = 270000; booking.discount_amount = 20000;
            booking.pricing.subtotal = 270000; booking.pricing.discount = 20000; booking.pricing.ticket_subtotal = 270000;
            booking.voucher = { voucher_id: templates.fixed._id, code: used.code, discount_type: "fixed", discount_value: 20000, discount_amount: 20000, apply_scope: "order" };
            await booking.save({ session });
            await Voucher.updateOne({ _id: templates.fixed._id }, { $inc: { usage_count: 1 } }, { session });
            await log("add", 10);
            await log("subtract", 10);
          }
          if (scenario.key === "debt") {
            await log("subtract", 150, { reason: "[TEST LOYALTY] Điều chỉnh điểm thủ công" });
          }
          const spent = scenario.spent;
          user.reward_points = balance; user.total_spent = spent; user.member_tier = tierForSpend(spent);
          user.loyalty_reconciled_at = scenario.key === "review" ? null : now;
          await user.save({ session });
          const logs = await RewardPointLog.find({ user_id: user._id }).session(session).lean();
          assert.equal(logs.reduce((sum, l) => sum + (["subtract", "redeem"].includes(l.type) ? -l.points : l.points), 0), balance);
        }
      });
    } finally { await session.endSession(); }
    console.log(`Test password (all 7 accounts): ${password}`);
    const vip = await User.findOne({ email: "loyalty.vip@example.test" });
    console.log(JSON.stringify({ walletStates: (await getWallet(vip._id)).map(v => v.status), pointRows: await RewardPointLog.countDocuments({ user_id: vip._id }), redemptionEnabled: process.env.LOYALTY_REDEMPTION_ENABLED === "true" }));
  }
} catch (error) {
  console.error(error.message); process.exitCode = 1;
} finally { await mongoose.disconnect(); }
