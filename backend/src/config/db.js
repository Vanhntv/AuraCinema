import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("Thiếu biến môi trường MONGODB_URI");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Liên kết csdl thành công");
  } catch (error) {
    console.error("Lỗi kết nối CSDL", error);
    process.exit(1);
  }
};
