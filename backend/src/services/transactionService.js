import mongoose from "mongoose";

export const requireTransaction = (session) => {
  if (!session?.inTransaction()) {
    throw Object.assign(new Error("MongoDB cần replica set để xử lý điểm và voucher an toàn."), { statusCode: 503 });
  }
};

export const withTransaction = async (work) => {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => work(session));
  } finally {
    await session.endSession();
  }
};
