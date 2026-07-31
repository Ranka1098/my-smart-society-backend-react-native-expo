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
       SUBSCRIPTION SYSTEM
    ========================= */
    subscriptionType: {
      type: String,
      enum: {
        values: ["trial", "monthly"],
        message: "Subscription type must be either 'trial' or 'monthly'",
      },
      default: "trial",
    },

    subscriptionStartDate: {
      type: Date,
      default: Date.now, // ✅ ADD — controller bhool bhi jaye to bhi set ho jayega
      validate: {
        validator: (v) => !v || v <= new Date(),
        message: "Subscription start date cannot be in the future",
      },
    },

    subscriptionExpiry: {
      type: Date,
      default: function () {
        const d = new Date(this.subscriptionStartDate || Date.now());
        d.setMonth(d.getMonth() + 1); // ✅ 1 month trial default
        return d;
      },
      validate: {
        validator: function (v) {
          return (
            !v || (this.subscriptionStartDate && v > this.subscriptionStartDate)
          );
        },
        message: "Subscription expiry must be after start date",
      },
    },
    subscriptionHistory: [
      {
        subscriptionType: { type: String, enum: ["trial", "monthly"] },
        subscriptionStartDate: Date,
        subscriptionExpiry: Date,
        subscriptionStatus: {
          type: String,
          enum: ["active", "expired", "blocked"],
        },
        paymentStatus: { type: String, enum: ["pending", "paid"] },
        changedAt: { type: Date, default: Date.now },
      },
    ],

    subscriptionStatus: {
      type: String,
      enum: {
        values: ["active", "expired", "blocked"],
        message: "Subscription status must be active, expired, or blocked",
      },
      default: "active",
    },

    paymentStatus: {
      type: String,
      enum: {
        values: ["pending", "paid"],
        message: "Payment status must be 'pending' or 'paid'",
      },
      default: "pending",
    },

    //subscription check
    expiringNotified: {
      type: Boolean,
      default: false,
    },
    expiredNotified: {
      type: Boolean,
      default: false,
    },
    /* =========================
       BUILDING STATUS
    ========================= */
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
