import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    buildingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Building",
      required: true,
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
        "VENDOR_EXPENSE",
        "SOCIETY_EXPENSE",
        "NOTICE_POSTED",
        "MEETING_CREATED",
        "COMPLAINT_ADD",
        "COMPLAINT_RAISED",
        "COMPLAINT_RESOLVED",
        "NEW_MEMBER_REQUEST",
        "NEW_STAFF_MEMBER_ADDED",
        "SUBSCRIPTION_EXPIRED",
        "SUBSCRIPTION_EXPIRING",
        "VISITOR_ARRIVED",
      ],
      required: true,
    },

    audience: {
      type: String,
      enum: ["SUPERADMIN", "MEMBERS", "STAFF", "ADMIN"],
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

    // ✅ read tracking same doc mein
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
