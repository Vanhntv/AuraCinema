import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import mongoose from "mongoose";
import { getMongoUri } from "../config/db.js";
import Booking from "../models/Booking.js";
import Combo from "../models/Combo.js";
import Gift from "../models/Gift.js";
import GiftGrant from "../models/GiftGrant.js";
import RewardPointLog from "../models/RewardPointLog.js";
import User from "../models/User.js";
import UserGift from "../models/UserGift.js";
import UserVoucher from "../models/UserVoucher.js";
import Voucher from "../models/Voucher.js";
import { encryptQrToken, hashQrToken } from "../services/ticketService.js";

const PREFIX = "TESTGIFT1";
const PASSWORD = process.env.GIFT_TEST_PASSWORD || "AuraGift9!";
const apply = process.argv.includes("--apply");
const now = new Date();
const day = (offset) => new Date(now.getTime() + offset * 86400000);
const accounts = [
  { key: "ready", email: "gift.ready@example.test", name: "[TEST GIFT] Sẵn sàng đổi quà", points: 2000, spent: 5000000, tier: "vip" },
  { key: "member", email: "gift.member@example.test", name: "[TEST GIFT] Thành viên thường", points: 250, spent: 500000, tier: "member" },
  { key: "maxed", email: "gift.maxed@example.test", name: "[TEST GIFT] Đã nhận đủ lượt", points: 1000, spent: 12000000, tier: "vvip" },
  { key: "empty", email: "gift.empty@example.test", name: "[TEST GIFT] Không đủ điểm", points: 0, spent: 0, tier: "member" },
];

const makePassword = () => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(PASSWORD, salt, 64).toString("hex")}`;
};

const benefitSnapshot = (gift) => ({
  gift_id: gift._id,
  code: gift.code,
  name: gift.name,
  description: gift.description,
  image_url: gift.image_url,
  type: gift.type,
  value: gift.value,
  value_label: gift.value_label,
  benefit: gift.benefit,
  condition: gift.condition,
  redemption_channel: gift.redemption_channel,
  start_date: gift.start_date,
  end_date: gift.end_date,
});

try {
  await mongoose.connect(getMongoUri(), { serverSelectionTimeoutMS: 10000 });
  console.log(JSON.stringify({
    database: mongoose.connection.name,
    mode: apply ? "apply" : "preview",
    prefix: PREFIX,
    accounts: accounts.map((item) => item.email),
  }));
  if (!apply) {
    console.log("Chạy `npm run seed:gifts -- --apply` để tạo lại toàn bộ dữ liệu test có tiền tố TESTGIFT1.");
  } else {
    const showtime = await mongoose.connection.db.collection("showtimes").findOne({});
    if (!showtime) throw new Error("Cần ít nhất một suất chiếu để tạo đơn test giữ và sử dụng quà.");
    const admin = await User.findOne({ role: "admin", deleted_at: null }).lean();
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const oldUsers = await User.find({ email: { $in: accounts.map((item) => item.email) } }).select("_id").session(session).lean();
        const oldGifts = await Gift.find({ code: { $regex: `^${PREFIX}_` } }).select("_id").session(session).lean();
        const oldVouchers = await Voucher.find({ code: { $regex: `^${PREFIX}_` } }).select("_id").session(session).lean();
        const oldCombos = await Combo.find({ name: { $regex: `^\\[${PREFIX}\\]` } }).select("_id").session(session).lean();
        const userIds = oldUsers.map((item) => item._id);
        const giftIds = oldGifts.map((item) => item._id);
        const voucherIds = oldVouchers.map((item) => item._id);
        await Promise.all([
          UserGift.deleteMany({ $or: [{ user_id: { $in: userIds } }, { gift_id: { $in: giftIds } }] }, { session }),
          UserVoucher.deleteMany({ $or: [{ user_id: { $in: userIds } }, { voucher_id: { $in: voucherIds } }] }, { session }),
          RewardPointLog.deleteMany({ user_id: { $in: userIds } }, { session }),
          Booking.deleteMany({ $or: [{ user_id: { $in: userIds } }, { booking_code: { $regex: `^${PREFIX}_` } }] }, { session }),
          GiftGrant.deleteMany({ gift_id: { $in: giftIds } }, { session }),
        ]);
        await Gift.deleteMany({ _id: { $in: giftIds } }, { session });
        await Voucher.deleteMany({ _id: { $in: voucherIds } }, { session });
        await Combo.deleteMany({ _id: { $in: oldCombos.map((item) => item._id) } }, { session });
        await User.deleteMany({ _id: { $in: userIds } }, { session });

        const create = async (Model, value) => (await Model.create([value], { session }))[0];
        const users = {};
        for (const account of accounts) {
          users[account.key] = await create(User, {
            full_name: account.name,
            email: account.email,
            password: makePassword(),
            role: "user",
            status: true,
            account_status: "active",
            reward_points: account.points,
            total_spent: account.spent,
            member_tier: account.tier,
            birth_date: account.key === "ready" ? new Date(1998, now.getMonth(), now.getDate()) : null,
            loyalty_reconciled_at: now,
            member_activated_at: day(-10),
          });
          if (account.points > 0) {
            await create(RewardPointLog, {
              user_id: users[account.key]._id,
              event_key: `${PREFIX}:opening:${account.key}`,
              type: "add",
              points: account.points,
              balance_after: account.points,
              reason: "[TEST GIFT] Số dư mở đầu để kiểm thử đổi quà",
              occurred_at: day(-8),
            });
          }
        }

        const combo = await create(Combo, {
          name: `[${PREFIX}] Combo bắp nước thử nghiệm`,
          description: "Dữ liệu kiểm thử quà combo, không phải sản phẩm thương mại.",
          type: "combo",
          price: 85000,
          stock: 200,
          status: true,
        });
        const voucher = await create(Voucher, {
          code: `${PREFIX}_VOUCHER20K`,
          name: "[TEST GIFT] Voucher giảm 20.000 đồng",
          description: "Voucher được chuyển vào ví sau khi đổi quà.",
          discount_type: "fixed",
          discount_value: 20000,
          min_order: 100000,
          personal_only: true,
          quantity: 100,
          usage_limit: 100,
          usage_limit_per_user: 1,
          start_date: day(-30),
          end_date: day(60),
          status: true,
        });

        const base = {
          description: "Dữ liệu kiểm thử chức năng quà tặng, không phải ưu đãi thương mại.",
          acquisition_modes: ["points"],
          trigger: "none",
          redemption_channel: "online",
          max_per_user: 1,
          validity_days: 30,
          value: 70000,
          value_label: "Quyền lợi kiểm thử",
          quantity: 30,
          issued_quantity: 0,
          remaining_quantity: 30,
          condition: { min_order: 100000, point_required: 100 },
          start_date: day(-30),
          end_date: day(60),
          status: "active",
          created_by: admin?._id || null,
          updated_by: admin?._id || null,
        };
        const definitions = [
          { key: "ticket", name: "[TEST GIFT] Vé 2D miễn phí", type: "ticket", image_url: "/promotions/u22-ticket.jpg", max_per_user: 3, benefit: { quantity: 1, max_unit_price: 70000, seat_types: ["normal"] }, value_label: "01 vé ghế thường, tối đa 70.000 đồng", condition: { min_order: 70000, point_required: 100 } },
          { key: "vip-ticket", name: "[TEST GIFT] Vé dành cho VIP/VVIP", type: "ticket", image_url: "/promotions/member-wednesday.jpg", benefit: { quantity: 1, max_unit_price: 90000, seat_types: ["normal", "vip"] }, value: 90000, value_label: "01 vé tối đa 90.000 đồng", condition: { min_order: 90000, point_required: 300, member_tiers: ["vip", "vvip"] } },
          { key: "combo", name: "[TEST GIFT] Combo bắp nước miễn phí", type: "combo", image_url: "/promotions/couple-combo.jpg", redemption_channel: "both", benefit: { combo_id: combo._id, quantity: 1 }, value: 85000, value_label: "01 combo bắp nước", condition: { min_order: 100000, point_required: 150 } },
          { key: "physical", name: "[TEST GIFT] Bình nước AuraCinema", type: "physical", image_url: "/promotions/family-film-week.jpg", redemption_channel: "counter", benefit: { label: "01 bình nước lưu niệm" }, value: 150000, value_label: "Nhận bình nước tại quầy", condition: { min_order: 0, point_required: 500 } },
          { key: "points", name: "[TEST GIFT] Nhận ngay 50 điểm", type: "point", image_url: "/promotions/member-wednesday.jpg", redemption_channel: "instant", benefit: { points: 50 }, value: 50, value_label: "+50 điểm", condition: { min_order: 0, point_required: 80 } },
          { key: "voucher", name: "[TEST GIFT] Voucher giảm 20.000 đồng", type: "voucher", image_url: "/promotions/morning-show.jpg", redemption_channel: "instant", benefit: { voucher_id: voucher._id }, value: 20000, value_label: "Giảm 20.000 đồng", condition: { min_order: 100000, point_required: 50 } },
          { key: "manual", name: "[TEST GIFT] Quà admin cấp", type: "physical", image_url: "/promotions/horror-night.jpg", acquisition_modes: ["manual"], redemption_channel: "counter", benefit: { label: "01 poster phim" }, value_label: "Poster phim tại quầy", condition: { min_order: 0, point_required: null } },
          { key: "maxed", name: "[TEST GIFT] Giới hạn một lượt", type: "physical", image_url: "/promotions/friends-movie-night.jpg", redemption_channel: "counter", benefit: { label: "Quà giới hạn mỗi người" }, value_label: "Đã nhận đủ lượt trên tài khoản ready", condition: { min_order: 0, point_required: 50 } },
          { key: "out", name: "[TEST GIFT] Đã hết số lượng", type: "physical", image_url: "/promotions/horror-night.jpg", redemption_channel: "counter", benefit: { label: "Quà đã hết" }, quantity: 1, remaining_quantity: 1, value_label: "Không thể đổi vì hết quà", condition: { min_order: 0, point_required: 50 } },
          { key: "paused", name: "[TEST GIFT] Chương trình tạm dừng", type: "ticket", benefit: { quantity: 1, max_unit_price: 70000, seat_types: [] }, status: "paused", condition: { min_order: 0, point_required: 50 } },
          { key: "future", name: "[TEST GIFT] Chưa bắt đầu", type: "ticket", benefit: { quantity: 1, max_unit_price: 70000, seat_types: [] }, start_date: day(7), end_date: day(60), condition: { min_order: 0, point_required: 50 } },
          { key: "expired", name: "[TEST GIFT] Đã hết hạn", type: "ticket", benefit: { quantity: 1, max_unit_price: 70000, seat_types: [] }, start_date: day(-60), end_date: day(-1), condition: { min_order: 0, point_required: 50 } },
          { key: "new-member", name: "[TEST GIFT] Tự động cho thành viên mới", type: "ticket", acquisition_modes: ["automatic"], trigger: "new_member", benefit: { quantity: 1, max_unit_price: 70000, seat_types: [] }, status: "paused", condition: { min_order: 0, point_required: null } },
          { key: "birthday", name: "[TEST GIFT] Tự động dịp sinh nhật", type: "physical", acquisition_modes: ["automatic"], trigger: "birthday", redemption_channel: "counter", benefit: { label: "Bánh sinh nhật tại quầy" }, status: "paused", condition: { birthday: true, min_order: 0, point_required: null } },
          { key: "tier", name: "[TEST GIFT] Tự động khi đạt VIP", type: "physical", acquisition_modes: ["automatic"], trigger: "tier_reached", redemption_channel: "counter", benefit: { label: "Bộ quà VIP" }, status: "paused", condition: { member_tiers: ["vip", "vvip"], min_order: 0, point_required: null } },
          { key: "paid", name: "[TEST GIFT] Tự động sau đơn lớn", type: "point", acquisition_modes: ["automatic"], trigger: "paid_booking", redemption_channel: "instant", benefit: { points: 100 }, value: 100, value_label: "+100 điểm", condition: { min_order: 999999999, point_required: null } },
        ];
        const gifts = {};
        for (const definition of definitions) {
          const { key, ...overrides } = definition;
          gifts[key] = await create(Gift, { ...base, ...overrides, code: `${PREFIX}_${key.toUpperCase()}` });
        }

        const pendingBooking = await create(Booking, {
          booking_code: `${PREFIX}_PENDING`,
          user_id: users.ready._id,
          showtime_id: showtime._id,
          customer_name: users.ready.full_name,
          customer_email: users.ready.email,
          movie_snapshot: { title: "[TEST GIFT] Đơn đang giữ quà" },
          subtotal_price: 140000,
          discount_amount: 70000,
          total_price: 70000,
          status: "pending",
          payment_status: "pending",
          payment_expires_at: day(1),
        });
        const paidBooking = await create(Booking, {
          booking_code: `${PREFIX}_PAID`,
          user_id: users.ready._id,
          showtime_id: showtime._id,
          customer_name: users.ready.full_name,
          customer_email: users.ready.email,
          movie_snapshot: { title: "[TEST GIFT] Đơn đã dùng quà" },
          subtotal_price: 140000,
          discount_amount: 70000,
          total_price: 70000,
          status: "confirmed",
          payment_status: "paid",
          paid_at: day(-2),
        });

        const owned = async (giftKey, status, extras = {}, owner = users.ready) => {
          const gift = gifts[giftKey];
          const issueSlot = await UserGift.countDocuments({ gift_id: gift._id, user_id: owner._id }).session(session) + 1;
          const counterGift = ["counter", "both"].includes(gift.redemption_channel) && !["used", "fulfilled", "expired"].includes(status);
          const token = counterGift ? randomBytes(32).toString("base64url") : "";
          const item = await create(UserGift, {
            user_id: owner._id,
            gift_id: gift._id,
            source: extras.source || "manual",
            issue_key: `${PREFIX}:${owner.email}:${giftKey}:${status}`,
            issue_slot: issueSlot,
            snapshot: benefitSnapshot(gift),
            status,
            issued_by: admin?._id || null,
            expires_at: extras.expires_at || (status === "expired" ? day(-1) : day(30)),
            booking_id: extras.booking_id || null,
            reserved_at: status === "reserved" ? day(-1) : null,
            used_at: status === "used" ? day(-2) : null,
            qr_token_hash: token ? hashQrToken(token) : "",
            qr_token_encrypted: token ? encryptQrToken(token) : "",
          });
          await Gift.updateOne({ _id: gift._id }, { $inc: { issued_quantity: 1, remaining_quantity: -1 } }, { session });
          return item;
        };

        await owned("ticket", "available");
        await owned("combo", "available");
        await owned("physical", "available");
        await owned("ticket", "reserved", { booking_id: pendingBooking._id, source: "points" });
        await owned("ticket", "used", { booking_id: paidBooking._id, source: "points" });
        await owned("manual", "available");
        await owned("birthday", "available", { source: "automatic" });
        await owned("expired", "expired", { expires_at: day(-1), source: "automatic" });
        await owned("maxed", "available", { source: "points" }, users.maxed);
        await owned("out", "used", { source: "manual" }, users.maxed);

        const pointGift = await owned("points", "fulfilled", { source: "points" });
        const pointLog = await create(RewardPointLog, {
          user_id: users.ready._id,
          user_gift_id: pointGift._id,
          event_key: `${PREFIX}:fulfilled-points`,
          type: "add",
          points: 50,
          balance_after: users.ready.reward_points,
          reason: "[TEST GIFT] Quà điểm đã chuyển vào tài khoản",
          occurred_at: day(-3),
        });
        pointGift.reward_point_log_id = pointLog._id;
        await pointGift.save({ session });

        const voucherGift = await owned("voucher", "fulfilled", { source: "points" });
        const userVoucher = await create(UserVoucher, {
          user_id: users.ready._id,
          voucher_id: voucher._id,
          source: "gift",
          issue_key: `${PREFIX}:fulfilled-voucher`,
          snapshot: voucher.toObject(),
          status: "available",
          expires_at: day(30),
        });
        voucherGift.linked_user_voucher_id = userVoucher._id;
        await voucherGift.save({ session });
        await Voucher.updateOne({ _id: voucher._id }, { $inc: { allocated_count: 1, quantity: -1 } }, { session });

        pendingBooking.gift = { user_gift_id: (await UserGift.findOne({ booking_id: pendingBooking._id }).session(session))._id, gift_id: gifts.ticket._id, type: "ticket", label: gifts.ticket.name, discount_amount: 70000 };
        paidBooking.gift = { user_gift_id: (await UserGift.findOne({ booking_id: paidBooking._id }).session(session))._id, gift_id: gifts.ticket._id, type: "ticket", label: gifts.ticket.name, discount_amount: 70000 };
        await pendingBooking.save({ session });
        await paidBooking.save({ session });

        if (admin) {
          await create(GiftGrant, {
            key: `${PREFIX}:grant-history`,
            gift_id: gifts.manual._id,
            admin_id: admin._id,
            user_ids: [users.ready._id],
            request: JSON.stringify({ email: users.ready.email, fixture: true }),
            completed_at: day(-1),
          });
        }
      });
    } finally {
      await session.endSession();
    }

    const summary = {
      users: await User.countDocuments({ email: { $in: accounts.map((item) => item.email) } }),
      gifts: await Gift.countDocuments({ code: { $regex: `^${PREFIX}_` } }),
      walletItems: await UserGift.countDocuments({ issue_key: { $regex: `^${PREFIX}:` } }),
      vouchers: await UserVoucher.countDocuments({ issue_key: { $regex: `^${PREFIX}:` } }),
    };
    console.log(JSON.stringify({ success: true, ...summary }));
    console.log(`Mật khẩu chung: ${PASSWORD}`);
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
