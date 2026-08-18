import mongoose from "mongoose";
import Ticket from "../models/Ticket.js";

const DEFAULT_MONGODB_URI =
  "mongodb+srv://taovohoang2k6_db_user:sb0euxYwl8c6jbEY@cluster0.hdnuiwm.mongodb.net/?appName=Cluster0";

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
    const mongoUri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;

    await mongoose.connect(mongoUri);
    await reconcileTicketAllocationIndex();

    // mongoose.connect("mongodb://localhost:27017/nodejs");
    console.log("Liên kết csdl thành công");
  } catch (error) {
    console.error("lỗi kết lỗi csdl", error);
    process.exit(1);
  }
};
