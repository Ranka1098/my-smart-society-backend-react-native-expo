import mongoose from "mongoose";

const buildingSchema = new mongoose.Schema(
  {
    buildingCode: {
      type: String,
      unique: true,
      required: [true, "Building code is required"],
      trim: true,
      minlength: [1, "Building code must be at least 2 characters"],
      maxlength: [20, "Building code cannot exceed 20 characters"],
    },

    buildingName: {
      type: String,
      required: [true, "Building name is required"],
      trim: true,
      minlength: [1, "Building name must be at least 2 characters"],
      maxlength: [50, "Building name cannot exceed 50 characters"],
    },

    chairmanName: {
      type: String,
      required: [true, "Chairman name is required"],
      trim: true,
      minlength: [1, "Chairman name must be at least 2 characters"],
      maxlength: [50, "Chairman name cannot exceed 50 characters"],
      validate: {
        validator: (v) => /^[A-Za-z\s]+$/.test(v),
        message: "Chairman name must contain only letters and spaces",
      },
    },

    chairmanPhone: {
      type: String,
      required: [true, "Chairman phone is required"],
      trim: true,
      match: [/^[0-9]{10}$/, "Chairman phone must be 10 digits"],
    },

    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: [true, "Admin reference is required"],
    },

    totalFlats: {
      type: Number,
      required: [true, "Total flats are required"],
      min: [0, "Total flats cannot be negative"],
    },

    totalShops: {
      type: Number,
      required: [true, "Total shops are required"],
      min: [0, "Total shops cannot be negative"],
    },

    /* =========================
       SUBSCRIPTION SYSTEM (rate-based)
    ========================= */

    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      default: null,
    },

    subscriptionType: {
      type: String,
      enum: ["trial", "monthly"],
      default: "trial",
    },

    lastBilledFlats: { type: Number, default: 0 },
    lastBilledShops: { type: Number, default: 0 },
    lastBilledAmount: { type: Number, default: 0 },

    subscriptionStartDate: {
      type: Date,
      default: Date.now,
    },

    subscriptionExpiry: {
      type: Date,
      default: function () {
        const d = new Date(this.subscriptionStartDate || Date.now());
        d.setMonth(d.getMonth() + 1); // 1 month free trial default
        return d;
      },
    },

    // ✅ grace tracking
    graceEndsAt: {
      type: Date,
      default: null, // cron sets this jab active->grace ho
    },

    subscriptionHistory: [
      {
        planCode: { type: String, default: null },
        subscriptionType: { type: String, enum: ["trial", "monthly"] },
        billedFlats: { type: Number, default: 0 },
        billedShops: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
        subscriptionStartDate: Date,
        subscriptionExpiry: Date,
        subscriptionStatus: {
          type: String,
          enum: ["active", "grace", "expired", "blocked"],
        },
        paymentStatus: { type: String, enum: ["pending", "paid"] },
        billingMonth: { type: String, default: null },
        method: {
          type: String,
          enum: ["upi", "card", "netbanking", "cash", "free", "manual"],
          default: null,
        },
        gateway: { type: String, default: null },
        gatewayTxnId: { type: String, default: null },
        payerAccount: { type: String, default: null },
        action: { type: String, default: null },
        transactionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Transaction",
          default: null,
        },
        changedBy: {
          role: {
            type: String,
            enum: ["admin", "superadmin", "system"],
            default: "system",
          },
          id: { type: mongoose.Schema.Types.ObjectId, default: null },
        },
        changedAt: { type: Date, default: Date.now },
      },
    ],

    subscriptionStatus: {
      type: String,
      enum: {
        values: ["active", "grace", "expired", "blocked"],
        message: "Invalid subscription status",
      },
      default: "active",
    },

    blockedAt: {
      type: Date,
      default: null,
    },
    blockedReason: {
      type: String,
      default: null,
    },

    // lockLevel middleware isi ko check karega
    lockLevel: {
      type: String,
      enum: ["none", "read_only", "full_lock"],
      default: "none",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "paid", // trial = paid (kuch owe nahi karta)
    },

    remindersSent: {
      type: [Number], // [7, 1, 0] — kaunse din reminder bheja
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Building", buildingSchema);
