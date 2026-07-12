import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error(
        "Missing MONGODB_URI. Create backend/.env.local on your machine."
      );
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("Lien ket csdl thanh cong");
  } catch (error) {
    console.error("loi ket noi csdl", error);
    process.exit(1);
  }
};
