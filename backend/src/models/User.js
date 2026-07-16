import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    role_id: {
      type: Number,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    full_name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    status: {
      type: Boolean,
      default: true,
    },
    password_reset_otp: {
      type: String,
      default: null,
    },
    password_reset_expires_at: {
      type: Date,
      default: null,
    },
    password_reset_attempts: {
      type: Number,
      default: 0,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

const User = mongoose.model("User", userSchema);

export default User;
