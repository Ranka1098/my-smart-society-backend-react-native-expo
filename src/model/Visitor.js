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
      enum: [
        "Guest",
        "Maid",
        "Cook",
        "Worker",
        "Driver",
        "Cleaner",
        "Gardener",
        "Security",
        "Delivery",
        "Cab",
        "Service", // ← Service add
        "Other",
      ],
      required: true,
    },
    exitDeadline: { type: Date },
    overstayAlertedAt: { type: Date },
    vehicleType: { type: String, enum: ["None", "2W", "3W", "4W"] },
    guardName: { type: String, trim: true }, // ← naya: guard ka snapshot
    photoUrl: { type: String },
    flatNo: { type: String, required: true, trim: true },
    memberType: { type: String, enum: ["Flat", "Shop"], trim: true }, // ✅ NAYA
    visitDate: { type: String, default: null },
    timeSlot: { type: String, default: null },
    notifiedMembers: [{ type: ObjectId, ref: "Member" }],
    respondedBy: { type: ObjectId, ref: "Member" },
    guardId: { type: ObjectId, ref: "Staff" },
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
      enum: [
        "FCM",
        "ManualCall",
        "ForcedEntry",
        "Denied",
        "OTP",
        "PreApprovedWorker",
      ],
    },
    forcedEntryReason: { type: String },
    notificationSentAt: { type: Date },
    notificationExpiresAt: { type: Date },
    entryTime: { type: Date, default: Date.now },
    exitTime: { type: Date },
    exitPhotoUrl: { type: String },
    isEmergencyExit: { type: Boolean, default: false },
    nextOverstayAlertAt: { type: Date },
    otp: { type: String, select: false },
    otpVerifiedAt: { type: Date },
    subType: { type: String, trim: true },
    vehicleNo: { type: String, trim: true },
    vehicleType: { type: String, trim: true }, // "None" | "2W" | "4W"
    otpAttempts: { type: Number, default: 0 },
    overstayAlertCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

visitorSchema.index({ buildingCode: 1, createdAt: -1 });
visitorSchema.index({ buildingCode: 1, flatNo: 1 });
visitorSchema.index({ buildingCode: 1, status: 1 });
visitorSchema.index({
  purpose: 1,
  status: 1,
  exitTime: 1,
  nextOverstayAlertAt: 1,
});
export default mongoose.models.Visitor ||
  mongoose.model("Visitor", visitorSchema);
