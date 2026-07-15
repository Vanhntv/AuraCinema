import mongoose from "mongoose";
export const connectDB = async () => {
    try {
        // await mongoose.connect(
        //   "mongodb+srv://taovohoang2k6_db_user:9LC0km6R29C50pW9@cluster0.hdnuiwm.mongodb.net/?appName=Cluster0"
        // );
        mongoose.connect("mongodb://localhost:27017/nodejs")
        console.log("Liên kết csdl thành công")
    } catch (error) {
        console.error("lỗi kết nối csdl", error)
        process.exit(1)
    }
}