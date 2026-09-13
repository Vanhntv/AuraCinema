import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Gift from "../models/Gift.js";
import GiftGrant from "../models/GiftGrant.js";
import UserGift from "../models/UserGift.js";
import { reconcileGiftInventory } from "../services/giftEntitlementService.js";

await connectDB();
await Promise.all([Gift.createIndexes(), UserGift.createIndexes(), GiftGrant.createIndexes()]);
await reconcileGiftInventory();
await mongoose.disconnect();
console.log("Đã đối soát tồn kho quà tặng.");
