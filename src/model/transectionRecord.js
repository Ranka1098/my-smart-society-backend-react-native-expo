// model/transaction.model.js

import mongoose from "mongoose";

const transactionRecord = new mongoose.Schema(
  {
    building: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Building",
      required: true,
    },
    buildingCode: { type: String, required: true },

    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },

    method: {
      type: String,
      enum: ["upi", "card", "netbanking", "cash", "manual", "free"],
      required: true,
    },
    gateway: { type: String, default: null }, // "Cashfree" | null (manual)
    gatewayOrderId: { type: String, default: null },
    gatewayTxnId: { type: String, default: null },
    payerAccount: { type: String, default: null },

    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },

    initiatedBy: {
      role: {
        type: String,
        enum: ["admin", "superadmin", "system"],
        required: true,
      },
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
    },

    idempotencyKey: { type: String, unique: true, sparse: true },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionRecord);
