import mongoose from "mongoose";
import Ticket from "../models/Ticket.js";

const LOCAL_MONGODB_URI = "mongodb://localhost:27017/nodejs";

const DEFAULT_MONGODB_TARGET = "local";

const getMongoUri = () => {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  const target = process.env.MONGODB_TARGET || DEFAULT_MONGODB_TARGET;

  if (target === "atlas") {
    if (!process.env.MONGODB_ATLAS_URI) {
      throw new Error("Missing MONGODB_ATLAS_URI for MongoDB Atlas connection");
    }

    return process.env.MONGODB_ATLAS_URI;
  }

  return LOCAL_MONGODB_URI;
};

const ticketAllocationIndexKeys = { showtimeId: 1, seatId: 1 };

const hasSameKeys = (index = {}, keys = {}) =>
  JSON.stringify(index.key || {}) === JSON.stringify(keys);

const reconcileTicketAllocationIndex = async () => {
  let indexes = [];
  try {
    indexes = await Ticket.collection.listIndexes().toArray();
  } catch (error) {
    if (error?.codeName !== "NamespaceNotFound") {
      throw error;
    }
  }

  const staleAllocationIndex = indexes.find((index) =>
    hasSameKeys(index, ticketAllocationIndexKeys) &&
    index.unique === true &&
    !index.partialFilterExpression
  );

  if (staleAllocationIndex?.name) {
    await Ticket.collection.dropIndex(staleAllocationIndex.name);
  }

  await Ticket.createIndexes();
};

export const connectDB = async () => {
  try {
    const mongoUri = getMongoUri();

    await mongoose.connect(mongoUri);
    await reconcileTicketAllocationIndex();

    // mongoose.connect("mongodb://localhost:27017/nodejs");
    console.log("Liên kết csdl thành công");
  } catch (error) {
    console.error("lỗi kết lỗi csdl", error);
    process.exit(1);
  }
};
