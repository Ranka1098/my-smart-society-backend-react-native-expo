// model/maintenance.js
import mongoose from "mongoose";

const maintenanceSchema = new mongoose.Schema(
  {
    buildingCode: { type: String, required: true, trim: true, index: true },
    buildingId: { type: mongoose.Schema.Types.ObjectId, ref: "Building" },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    month: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["Pending", "Paid"], default: "Pending" },
    paymentMode: {
      type: String,
      enum: ["Cash", "UPI", "Cheque"],
      default: null,
    },
    memberDeleted: { type: Boolean, default: false },
    paidDate: { type: Date, default: null },
    receiptNo: { type: Number, default: null },
    bulkPaymentRef: { type: String, default: null },

    memberName: { type: String, default: "—" },
    memberType: { type: String, enum: ["Flat", "Shop"], default: null },
    No: { type: String, default: null },
    phone: { type: String, default: null },
  },
  { timestamps: true }
);

// ✅ FIX — galat tha { buildingCode, month } unique (ek month me sirf 1 doc allow karta tha, sab members ke liye nahi)
// sahi index: ek member ka ek month me sirf ek hi maintenance record hona chahiye
maintenanceSchema.index(
  { buildingCode: 1, month: 1, memberId: 1 },
  { unique: true }
);

export default mongoose.models.Maintenance ||
  mongoose.model("Maintenance", maintenanceSchema);
