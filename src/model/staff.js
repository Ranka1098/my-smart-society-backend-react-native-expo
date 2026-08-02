// =========================
// Code Name: StaffModel.js
// =========================

import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    buildingCode: {
      type: String,
      required: [true, "Building code is required"],
      trim: true,
      minlength: [2, "Building code must be at least 2 characters"],
      maxlength: [20, "Building code cannot exceed 20 characters"],
    },

    role: {
      type: String,
      required: [true, "Role is required"],
      enum: [
        "security",
        "cleaner",
        "plumber",
        "electrician",
        "gardener",
        "other",
      ],
      trim: true,
    },

    workerName: {
      type: String,
      required: [true, "Worker name is required"],
      trim: true,
      minlength: [3, "Worker name must be at least 3 characters"],
      maxlength: [50, "Worker name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [
        /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
        "Invalid email format",
      ],
    },

    workerPhoneNumber: {
      type: String,
      required: [true, "Worker phone number is required"],
      trim: true,
      match: [/^[0-9]{10}$/, "Worker phone number must be 10 digits"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },

    workerAddress: {
      type: String,
      required: [true, "Worker address is required"],
      trim: true,
      minlength: [3, "Address must be at least 3 characters"],
      maxlength: [200, "Address cannot exceed 200 characters"],
    },

    workerPhoto: {
      type: String,
      default: null,
    },

    workerIdProof: {
      type: String,
      default: null,
    },

    joiningDate: {
      type: Date,
      default: null,
    },
    fcmToken: { type: String, default: null },
    // ── OTP ──────────────────────────────────────────────
    otp: {
      type: String,
      default: null,
    },

    otpExpiry: {
      type: Date,
      default: null,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // ── Status ───────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    rejectionReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

staffSchema.index({ buildingCode: 1, status: 1 });
staffSchema.index({ email: 1, buildingCode: 1 }, { unique: true });

// StaffModel.js ka last line change karo
const StaffModel =
  mongoose.models.Staff || mongoose.model("Staff", staffSchema);

export default StaffModel;
