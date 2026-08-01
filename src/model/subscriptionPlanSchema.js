import mongoose from "mongoose";

/**
 * Rate-based plan. Fixed price NAHI — amount building ke active flat+shop
 * count se calculate hota hai (calculateSubscriptionAmount.js me).
 * Isliye price field yahan nahi, sirf rates.
 */
const subscriptionPlanSchema = new mongoose.Schema(
  {
    planCode: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      uppercase: true, // TRIAL, MONTHLY_STANDARD
    },

    planName: { type: String, required: true, trim: true },

    type: {
      type: String,
      enum: ["trial", "monthly"],
      required: true,
    },

    // ✅ core — amount yahi se calculate hoga
    perFlatRate: {
      type: Number,
      required: true,
      min: [0, "Rate cannot be negative"],
      default: 0, // trial plan ke liye 0
    },
    perShopRate: {
      type: Number,
      required: true,
      min: [0, "Rate cannot be negative"],
      default: 0,
    },

    durationDays: {
      type: Number,
      required: true, // trial=30, monthly=30 (billing cycle length)
    },

    graceDays: {
      type: Number,
      default: 2, // expiry ke baad sirf 2 din (aaj + kal) read-only, phir full lock
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("SubscriptionPlan", subscriptionPlanSchema);