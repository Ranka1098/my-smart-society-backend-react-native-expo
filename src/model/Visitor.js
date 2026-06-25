// models/VisitorModel.js
const mongoose = require("mongoose");

const visitorSchema = new mongoose.Schema(
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
    photoUrl: {
      type: String, // Cloudinary URL
    },

    // ── DESTINATION ──
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

    // ── GUARD WHO LOGGED ──
    guardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },

    // ── APPROVAL ──
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Exited"],
      default: "Pending",
    },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },

    // ── ENTRY / EXIT ──
    entryTime: {
      type: Date,
      default: Date.now,
    },
    exitTime: {
      type: Date,
    },
  },
  { timestamps: true }
);

// indexes for frequent queries
visitorSchema.index({ buildingCode: 1, entryTime: -1 });
visitorSchema.index({ buildingCode: 1, flatNo: 1 });
visitorSchema.index({ buildingCode: 1, status: 1 });

module.exports =
  mongoose.models.Visitor || mongoose.model("Visitor", visitorSchema);
