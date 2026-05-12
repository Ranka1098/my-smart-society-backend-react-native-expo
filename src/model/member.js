// =========================
// Code Name: memberModel.js (MyGate Production Model)
// =========================

import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    // =========================
    // ✅ BASIC DETAILS
    // =========================
    memberName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      default: null,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    // =========================
    // ✅ MEMBER ROLE IN FAMILY
    // =========================
    familyRole: {
      type: String,
      enum: ["Owner", "Tenant", "Wife", "Son", "Daughter", "Father", "Mother", "Other"],
      default: "Other",
    },

    isPrimary: {
      type: Boolean,
      default: false, // ✅ Primary member = head of flat
    },

    // =========================
    // ✅ UNIT DETAILS (MAIN CONCEPT)
    // =========================
    memberType: {
      type: String,
      enum: ["Flat", "Shop"],
      required: true,
    },

    flatOrShopNo: {
      type: String,
      required: true,
      trim: true,
    },

    // =========================
    // ✅ OWNERSHIP STATUS
    // =========================
    status: {
      type: String,
      enum: ["Owner", "Tenant"],
      required: true,
    },

    // =========================
    // ✅ BUILDING DETAILS
    // =========================
    buildingCode: {
      type: String,
      required: true,
      trim: true,
    },

    buildingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Building",
      required: true,
    },

    // =========================
    // ✅ APPROVAL PERMISSIONS (MYGATE STYLE)
    // =========================
    permissions: {
      canApproveDelivery: {
        type: Boolean,
        default: true,
      },
      canApproveGuest: {
        type: Boolean,
        default: true,
      },
      canApproveService: {
        type: Boolean,
        default: true,
      },
    },

    // =========================
    // ✅ PUSH NOTIFICATION TOKEN
    // =========================
    deviceToken: {
      type: String,
      default: null,
    },

    // =========================
    // ✅ OTP VERIFICATION
    // =========================
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

    // =========================
    // ✅ ACCOUNT STATUS
    // =========================
    isActive: {
      type: Boolean,
      default: true,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// =========================
// ✅ INDEX (fast search)
// =========================
memberSchema.index({ buildingId: 1, flatOrShopNo: 1 });

const memberModel = mongoose.model("Member", memberSchema);

export default memberModel;