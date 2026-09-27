import "dotenv/config";
import mongoose from "mongoose";
import { getMongoUri } from "../config/db.js";
import User from "../models/User.js";

const apply = process.argv.includes("--apply");
const roleIdFor = (role) => role === "admin" ? 1 : role === "staff" ? 2 : null;

try {
  await mongoose.connect(getMongoUri());
  const users = await User.find({ deleted_at: null }).select("_id role role_id").lean();
  const mismatched = users.filter((user) => user.role_id !== roleIdFor(user.role));
  if (apply) {
    for (const user of mismatched) {
      await User.updateOne({ _id: user._id, role: user.role }, { $set: { role_id: roleIdFor(user.role) } });
    }
  }
  console.log(JSON.stringify({ scanned: users.length, mismatched: mismatched.length, applied: apply, canonicalField: "role" }));
} finally {
  await mongoose.disconnect();
}
