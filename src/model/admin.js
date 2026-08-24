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
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [100, "Email cannot exceed 100 characters"],
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      minlength: 10,
      maxlength: 10,
    },

    buildingName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, "Building name cannot exceed 100 characters"],
    },

    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Address cannot exceed 200 characters"],
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
      max: [1000, "Total flats seems unrealistic"],
    },

    pendingTotalShops: {
      type: Number,
      default: 0,
      max: [1000, "Total shops seems unrealistic"],
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
