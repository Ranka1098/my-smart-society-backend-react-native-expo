// models/PreApprovedModel.js
const mongoose = require("mongoose");

const preApprovedSchema = new mongoose.Schema(
  {
    // ── WHICH BUILDING ──
    buildingCode: {
      type: String,
      required: true,
    },

    // ── VISITOR INFO ──
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      trim: true,
    },
    purpose: {
      type: String,
      enum: ["Guest", "Maid", "Delivery", "Worker", "Cab", "Other"],
      required: true,
    },

    // ── APPROVED BY WHICH MEMBER ──
    flatNo: {
      type: String,
      required: true,
      trim: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },

    // ── VALIDITY ──
    validFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    validTill: {
      type: Date,
      required: true, // member sets 1 day / 1 week / custom
    },

    // ── GUARD ENTRY ──
    isUsed: {
      type: Boolean,
      default: false,
    },
    usedAt: {
      type: Date,
    },
    entryAllowedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff", // guard who allowed
    },
  },
  { timestamps: true }
);

preApprovedSchema.index({ buildingCode: 1, validTill: 1 });
preApprovedSchema.index({ buildingCode: 1, flatNo: 1 });
preApprovedSchema.index({ buildingCode: 1, isUsed: 1 });

module.exports =
  mongoose.models.PreApproved ||
  mongoose.model("PreApproved", preApprovedSchema);
