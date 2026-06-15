// =========================
// Code Name: adminModel.js
// =========================

import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    adminName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
    },

    buildingName: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    pincode: {
      type: String,
      required: true,
    },

    password: {
      type: String,
      required: true,
    },

    // =========================
    // ✅ BUILDING DETAILS
    // =========================
    buildingCode: {
      type: String,
      default: null,
    },

    buildingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Building",
      default: null,
    },

    // =========================
    // ✅ TEMP DATA BEFORE OTP VERIFY
    // =========================
    pendingTotalFlats: {
      type: Number,
      default: 0,
    },

    pendingTotalShops: {
      type: Number,
      default: 0,
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },

    // OTP verification
    otp: {
      type: String,
      default: null,
    },

    otpExpireAt: {
      type: Date,
      default: null,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    fcmToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const adminModel = mongoose.model("Admin", adminSchema);

export default adminModel;
