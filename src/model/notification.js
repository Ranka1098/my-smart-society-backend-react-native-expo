import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    buildingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Building",
      required: false, // ✅ FIX: pehle required: true tha, ab optional — kyunki member/staff ke paas sirf buildingCode hai, buildingId nahi bhejte
      default: null,
    },

    buildingCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "NEW_BUILDING_REGISTERED",
        "MAINTENANCE_PAID",
        "MAINTENANCE_GENERATED",
        "MAINTENANCE_PENDING",
        "VENDOR_EXPENSE",
        "SOCIETY_EXPENSE",
        "SOCIETY_NOTICE_POSTED",
        "SOCIETY_MEETING_CREATED",
        "COMPLAINT_RAISED",
        "COMPLAINT_RESOLVED",
        "NEW_MEMBER_REQUEST",
        "NEW_STAFF_MEMBER_ADDED",
        "SUBSCRIPTION_EXPIRED",
        "SUBSCRIPTION_EXPIRING",
        "VISITOR_ARRIVED",
        "GUEST_PRE_APPROVED",
        "GUEST_APPROVED",
        "GUEST_REJECTED",
        "GUEST_DENIED",
        "STAFF_APPROVAL_PENDING",
      ],
      required: true,
    },

    audience: {
      type: String,
      enum: ["SUPERADMIN", "MEMBERS", "STAFF", "ADMIN", "SPECIFIC_MEMBER"],
      required: true,
    },

    // only when audience = SPECIFIC
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    receiverModel: {
      type: String,
      enum: ["ADMIN", "MEMBER", "STAFF", "SUPERADMIN"],
      default: null,
    },

    title: { type: String, required: true, trim: true, maxlength: 100 },
    message: { type: String, required: true, trim: true, maxlength: 500 },

    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    referenceModel: { type: String, default: null },

    data: { type: Object, default: {} },
    clickUrl: { type: String, default: null },

    readBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, required: true },
        userModel: {
          type: String,
          enum: ["ADMIN", "MEMBER", "STAFF", "SUPERADMIN"],
        },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

notificationSchema.index({ buildingCode: 1, createdAt: -1 });
notificationSchema.index({ "readBy.userId": 1 });

export default mongoose.model("Notification", notificationSchema);
