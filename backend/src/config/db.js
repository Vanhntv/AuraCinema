import mongoose from "mongoose";

const DEFAULT_MONGODB_URI =
  "mongodb+srv://taovohoang2k6_db_user:sb0euxYwl8c6jbEY@cluster0.hdnuiwm.mongodb.net/?appName=Cluster0";

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;

    await mongoose.connect(mongoUri);

    // mongoose.connect("mongodb://localhost:27017/nodejs");
    console.log("Liên kết csdl thành công");
  } catch (error) {
    console.error("lỗi kết lỗi csdl", error);
    process.exit(1);
  }
};
