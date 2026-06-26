const mongoose = require("mongoose");

const visitorSchema = new mongoose.Schema(
  {
    // ── BUILDING ──
    buildingCode: { type: String, required: true },

    // ── VISITOR ──
    name: { type: String, required: true, trim: true },
    mobile: { type: String, trim: true },
    purpose: {
      type: String,
      enum: ["Guest", "Maid", "Delivery", "Worker", "Cab", "Other"],
      required: true,
    },
    photoUrl: { type: String }, // Cloudinary URL

    // ── DESTINATION ──
    flatNo: { type: String, required: true, trim: true },
    notifiedMembers: [{ type: ObjectId, ref: "Member" }],
    respondedBy: { type: ObjectId, ref: "Member" },

    // ── GUARD ──
    guardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },

    // ── APPROVAL ──
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "ForcedEntry", "Exited"],
      default: "Pending",
    },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },

    // ── VERIFICATION METHOD ──
    verificationMethod: {
      type: String,
      enum: ["FCM", "ManualCall", "ForcedEntry"],
    },
    forcedEntryReason: { type: String },

    // ── NOTIFICATION TIMER ──
    notificationSentAt: { type: Date }, // when guard sent notif
    notificationExpiresAt: { type: Date }, // notificationSentAt + 60s

    // ── ENTRY / EXIT ──
    entryTime: { type: Date, default: Date.now },
    exitTime: { type: Date },
  },
  { timestamps: true }
);

visitorSchema.index({ buildingCode: 1, entryTime: -1 });
visitorSchema.index({ buildingCode: 1, flatNo: 1 });
visitorSchema.index({ buildingCode: 1, status: 1 });

module.exports =
  mongoose.models.Visitor || mongoose.model("Visitor", visitorSchema);
