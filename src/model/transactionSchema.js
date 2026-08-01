import mongoose from "mongoose";

/**
 * Har renewal/free-trial/block ek row. Admin + superadmin dono ke
 * "payment history" screen isi collection se query karenge.
 */
const transactionSchema = new mongoose.Schema(
  {
    buildingCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    building: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Building",
      required: true,
    },

    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true,
    },
    planCodeSnapshot: { type: String, required: true },

    type: {
      type: String,
      enum: ["free_trial", "renew", "override"],
      required: true,
    },

    // ✅ audit — us waqt kitne flat/shop the, kis rate se amount bana
    billedFlats: { type: Number, default: 0 },
    billedShops: { type: Number, default: 0 },
    perFlatRate: { type: Number, default: 0 },
    perShopRate: { type: Number, default: 0 },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },

    method: {
      type: String,
      enum: ["upi", "card", "netbanking", "cash", "free", "manual"],
      required: true,
    },
    gatewayTxnId: { type: String, default: null },

    // ✅ CRITICAL — same key dobara aaye to dobara process nahi hoga
    idempotencyKey: { type: String, required: true, unique: true, index: true },

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

    notes: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);
