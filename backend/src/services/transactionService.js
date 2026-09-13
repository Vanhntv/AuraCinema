import mongoose from "mongoose";

const isTransactionUnsupportedError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("transaction numbers are only allowed")
    || message.includes("replica set member or mongos")
    || message.includes("only servers in a sharded cluster");
};

const transactionUnavailableError = () => Object.assign(
  new Error("MongoDB cần replica set để xử lý điểm, voucher và quà tặng an toàn."),
  { statusCode: 503 },
);

export const requireTransaction = (session) => {
  if (!session?.inTransaction()) {
    throw transactionUnavailableError();
  }
};

export const withTransaction = async (work) => {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => work(session));
  } catch (error) {
    if (isTransactionUnsupportedError(error)) throw transactionUnavailableError();
    throw error;
  } finally {
    await session.endSession();
  }
};
