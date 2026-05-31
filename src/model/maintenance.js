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
    paidDate: { type: Date, default: null },
    receiptNo: { type: Number, default: null },
    bulkPaymentRef: { type: String, default: null },

    // ── Add these ──
    memberName: { type: String, default: "—" },
    memberType: { type: String, enum: ["Flat", "Shop"], default: null },
    No: { type: String, default: null },
    phone: { type: String, default: null },
  },
  { timestamps: true }
);

maintenanceSchema.index(
  { buildingCode: 1, memberId: 1, month: 1 },
  { unique: true }
);

export default mongoose.model("Maintenance", maintenanceSchema);
