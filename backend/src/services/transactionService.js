import mongoose from "mongoose";

const isTransactionUnsupportedError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("transaction numbers are only allowed")
    || message.includes("replica set member or mongos")
    || (message.includes("only servers in a sharded cluster") && !message.includes("active transaction number"));
};

const transactionUnavailableError = (cause) => Object.assign(
  new Error("MongoDB không hỗ trợ transaction. Hãy cấu hình replica set hoặc kết nối MongoDB Atlas rồi thử lại.", { cause }),
  { statusCode: 503, code: "MONGODB_TRANSACTION_UNAVAILABLE" },
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
    if (isTransactionUnsupportedError(error)) {
      console.error("MongoDB transaction unavailable:", error);
      throw transactionUnavailableError(error);
    }
    throw error;
  } finally {
    await session.endSession();
  }
};
