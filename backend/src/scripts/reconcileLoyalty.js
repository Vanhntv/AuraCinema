import "dotenv/config";
import mongoose from "mongoose";
import { getMongoUri } from "../config/db.js";
import User from "../models/User.js";
import UserVoucher from "../models/UserVoucher.js";
import RewardPointLog from "../models/RewardPointLog.js";
import RewardOffer from "../models/RewardOffer.js";
import VoucherGrant from "../models/VoucherGrant.js";
import { reconcileLoyaltyUser } from "../services/loyaltyReconciliationService.js";

const apply = process.argv.includes("--apply");
try {
  await mongoose.connect(getMongoUri(), { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 5000 });
  if (apply) {
    // Add indexes only; never drop existing booking or reward indexes.
    for (const model of [User, UserVoucher, RewardPointLog, RewardOffer, VoucherGrant]) await model.createIndexes();
  }
  let mismatches = 0;
  for await (const user of User.find({ role: "user" }).select("_id").lean().cursor()) {
    const report = await reconcileLoyaltyUser(user._id, { apply });
    if (report.issues.length) mismatches++;
    console.log(JSON.stringify(report));
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", mismatches }));
  if (mismatches) process.exitCode = 2;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
