import mongoose from "mongoose";
const {
  Schema,
  Types: { ObjectId },
} = mongoose;

const visitorSchema = new mongoose.Schema(
  {
    buildingCode: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, trim: true },
    purpose: {
      type: String,
      enum: ["Guest", "Maid", "Delivery", "Worker", "Cab", "Other"],
      required: true,
    },
    photoUrl: { type: String },
    flatNo: { type: String, required: true, trim: true },
    notifiedMembers: [{ type: ObjectId, ref: "Member" }],
    respondedBy: { type: ObjectId, ref: "Member" },
    guardId: { type: ObjectId, ref: "Staff"},
    status: {
      type: String,
      enum: [
        "Pending",
        "Approved",
        "Denied",
        "Rejected",
        "ForcedEntry",
        "Exited",
      ],
      default: "Pending",
    },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
    verificationMethod: {
      type: String,
      enum: ["FCM", "ManualCall", "ForcedEntry", "Denied"],
    },
    forcedEntryReason: { type: String },
    notificationSentAt: { type: Date },
    notificationExpiresAt: { type: Date },
    entryTime: { type: Date, default: Date.now },
    exitTime: { type: Date },
    exitPhotoUrl: { type: String },
    isEmergencyExit: { type: Boolean, default: false },
  },
  { timestamps: true }
);

visitorSchema.index({ buildingCode: 1, entryTime: -1 });
visitorSchema.index({ buildingCode: 1, flatNo: 1 });
visitorSchema.index({ buildingCode: 1, status: 1 });

export default mongoose.models.Visitor ||
  mongoose.model("Visitor", visitorSchema);
