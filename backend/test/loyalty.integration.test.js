import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import net from "node:net";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import Booking from "../src/models/Booking.js";
import Voucher from "../src/models/Voucher.js";
import UserVoucher from "../src/models/UserVoucher.js";
import RewardPointLog from "../src/models/RewardPointLog.js";
import RewardOffer from "../src/models/RewardOffer.js";
import VoucherGrant from "../src/models/VoucherGrant.js";
import VoucherUsage from "../src/models/VoucherUsage.js";
import { creditRewardPointsForBooking, reverseRewardPointsForBooking, calculateEarnedRewardPoints } from "../src/services/rewardPointService.js";
import { tierForSpend, membershipView } from "../src/services/loyaltyPolicy.js";
import { redeemReward, getWallet, getPointHistory, previewGrant, confirmGrant, walletState, saveRewardOffer } from "../src/services/loyaltyService.js";
import { verifyVoucherService, reserveVoucherForBooking, consumeReservedVoucherForBooking, refundVoucherUsageForBooking } from "../src/services/voucherService.js";
import { withTransaction } from "../src/services/transactionService.js";

test("loyalty thresholds, rounding and debt are explicit", () => {
  assert.equal(tierForSpend(2999999), "member");
  assert.equal(tierForSpend(3000000), "vip");
  assert.equal(tierForSpend(9999999), "vip");
  assert.equal(tierForSpend(10000000), "vvip");
  assert.equal(calculateEarnedRewardPoints(9999), 0);
  assert.equal(calculateEarnedRewardPoints(0), 0);
  const member = membershipView({ total_spent: 0, reward_points: -40 });
  assert.equal(member.available_points, 0);
  assert.equal(member.points_debt, 40);
});

test("loyalty transactions on an isolated MongoDB replica set", { timeout: 90000 }, async t => {
  const path = await mkdtemp(join(tmpdir(), "aura-loyalty-test-"));
  const probe = net.createServer();
  await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.env.MONGOD_BINARY || "mongod", ["--dbpath", path, "--port", String(port), "--bind_ip", "127.0.0.1", "--replSet", "loyaltyTest", "--oplogSize", "32"], { stdio: ["ignore", "pipe", "pipe"] });
  let spawnError;
  child.on("error", error => { spawnError = error; });
  let serverOutput = "";
  const capture = chunk => { serverOutput = (serverOutput + chunk.toString()).slice(-12000); };
  child.stdout.on("data", capture); child.stderr.on("data", capture);
  let client;
  const oldFlag = process.env.LOYALTY_REDEMPTION_ENABLED;
  t.after(async () => {
    if (oldFlag === undefined) delete process.env.LOYALTY_REDEMPTION_ENABLED; else process.env.LOYALTY_REDEMPTION_ENABLED = oldFlag;
    await mongoose.disconnect();
    await client?.close();
    if (child.exitCode === null && !spawnError) {
      const stopped = new Promise(resolve => child.once("exit", resolve));
      child.kill("SIGTERM"); await stopped;
    }
    await rm(path, { recursive: true, force: true });
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (spawnError) { t.skip("mongod is unavailable; install it or set MONGOD_BINARY"); return; }
    try {
      client = new mongoose.mongo.MongoClient(`mongodb://127.0.0.1:${port}/?directConnection=true`, { serverSelectionTimeoutMS: 200 });
      await client.connect(); break;
    } catch { await client?.close(); client = null; await new Promise(r => setTimeout(r, 100)); }
  }
  assert.ok(client, `isolated MongoDB started: ${serverOutput}`);
  await client.db("admin").command({ replSetInitiate: { _id: "loyaltyTest", members: [{ _id: 0, host: `127.0.0.1:${port}` }] } });
  await mongoose.connect(`mongodb://127.0.0.1:${port}/loyalty_test?replicaSet=loyaltyTest`, { serverSelectionTimeoutMS: 15000 });
  for (const model of [User, Booking, Voucher, UserVoucher, RewardPointLog, RewardOffer, VoucherGrant, VoucherUsage]) await model.init();
  process.env.LOYALTY_REDEMPTION_ENABLED = "true";
  const user = await User.create({ full_name: "Test Member", email: "member@example.test", password: "not-a-real-login", loyalty_reconciled_at: new Date() });
  const stranger = await User.create({ full_name: "Other", email: "other@example.test", password: "not-a-real-login" });
  const booking = await Booking.create({ booking_code: "AURA_TEST_POINTS", user_id: user._id, showtime_id: new mongoose.Types.ObjectId(), customer_name: user.full_name, customer_email: user.email, total_price: 3000000, payment_status: "paid", status: "confirmed", paid_at: new Date() });
  const credit = () => withTransaction(async session => {
    const fresh = await Booking.findById(booking._id).session(session);
    await creditRewardPointsForBooking({ booking: fresh, session }); await fresh.save({ session });
  });
  await Promise.all([credit(), credit(), credit()]);
  assert.equal((await User.findById(user._id)).reward_points, 300);
  assert.equal((await User.findById(user._id)).member_tier, "vip");
  assert.equal(await RewardPointLog.countDocuments({ booking_id: booking._id, type: "earn" }), 1);

  const voucher = await Voucher.create({ code: "TESTREWARD", name: "Test reward", discount_type: "fixed", discount_value: 20000, quantity: 10, usage_limit: 10, start_date: new Date(Date.now() - 60000), end_date: new Date(Date.now() + 86400000) });
  const offer = await saveRewardOffer({ voucher_id: voucher._id, points_cost: 250, active: true });
  assert.equal((await verifyVoucherService({ code: voucher.code, user_id: user._id, order_amount: 100000 })).valid, false, "template code cannot bypass point redemption");
  const results = await Promise.allSettled([
    redeemReward(user._id, offer._id, "redemption-request-0001"),
    redeemReward(user._id, offer._id, "redemption-request-0002"),
  ]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal((await User.findById(user._id)).reward_points, 50);
  const item = results.find(r => r.status === "fulfilled").value;
  const replay = await redeemReward(user._id, offer._id, item.issue_key.split(":").at(-1));
  assert.equal(String(replay._id), String(item._id));
  assert.equal(await UserVoucher.countDocuments({ user_id: user._id }), 1);
  assert.equal((await Voucher.findById(voucher._id)).quantity, 9);
  const foreign = await verifyVoucherService({ user_voucher_id: item._id, user_id: stranger._id, order_amount: 100000 });
  assert.equal(foreign.valid, false);
  const verified = await verifyVoucherService({ user_voucher_id: item._id, user_id: user._id, order_amount: 100000 });
  assert.equal(verified.valid, true);
  assert.equal(verified.discount_amount, 20000);
  const reservationId = new mongoose.Types.ObjectId();
  await withTransaction(session => reserveVoucherForBooking({ bookingId: reservationId, userId: user._id, voucherResult: verified, subtotalPrice: 100000, session }));
  await assert.rejects(withTransaction(session => reserveVoucherForBooking({ bookingId: new mongoose.Types.ObjectId(), userId: user._id, voucherResult: verified, subtotalPrice: 100000, session })), /giữ/);
  await withTransaction(session => consumeReservedVoucherForBooking({ bookingId: reservationId, session }));
  assert.equal((await getWallet(user._id))[0].status, "used");
  await withTransaction(session => refundVoucherUsageForBooking({ bookingId: reservationId, session }));
  assert.equal((await getWallet(user._id))[0].status, "available");
  assert.equal((await Voucher.findById(voucher._id)).quantity, 9, "refund returns entitlement, not allocated stock");
  const reverse = () => withTransaction(async session => {
    const fresh = await Booking.findById(booking._id).session(session);
    await reverseRewardPointsForBooking({ booking: fresh, session });
    fresh.payment_status = "refunded"; await fresh.save({ session });
  });
  await Promise.all([reverse(), reverse()]);
  const afterRefund = await User.findById(user._id);
  assert.equal(afterRefund.reward_points, -250);
  assert.equal(afterRefund.total_spent, 0);
  assert.equal(afterRefund.member_tier, "member");
  await assert.rejects(redeemReward(user._id, offer._id, "redemption-request-0003"), /điểm/);
  assert.equal(await RewardPointLog.countDocuments({ event_key: `refund:${booking._id}` }), 1);
  const history = await getPointHistory(user._id, { type: "redeem" });
  assert.equal(history.data.length, 1);
  assert.equal(history.data[0].user_voucher_id.code, item.code);

  const admin = new mongoose.Types.ObjectId();
  const preview = await previewGrant(admin, { voucher_id: String(voucher._id), key: "grant-request-00001", email: stranger.email });
  assert.equal(preview.count, 1);
  await Promise.all([confirmGrant(admin, preview.id), confirmGrant(admin, preview.id)]);
  assert.equal(await UserVoucher.countDocuments({ user_id: stranger._id }), 1);
  const beforeRollback = (await Voucher.findById(voucher._id)).quantity;
  await assert.rejects(withTransaction(async session => {
    await Voucher.updateOne({ _id: voucher._id }, { $inc: { quantity: -1 } }, { session });
    await User.updateOne({ _id: user._id }, { $inc: { reward_points: 100 } }, { session });
    throw new Error("injected failure");
  }), /injected failure/);
  assert.equal((await Voucher.findById(voucher._id)).quantity, beforeRollback);
  assert.equal((await User.findById(user._id)).reward_points, -250);
  await Voucher.updateOne({ _id: voucher._id }, { $set: { deleted_at: new Date() } });
  const pausedWallet = await getWallet(user._id);
  assert.equal(pausedWallet.length, 1);
  assert.equal(pausedWallet[0].status, "paused");
  assert.equal(pausedWallet[0].voucher.name, "Test reward");
  assert.equal(walletState({ status: "available", expires_at: new Date(0) }, voucher), "expired");
  assert.equal(walletState({ status: "used", expires_at: new Date(0) }, null), "used");
});
